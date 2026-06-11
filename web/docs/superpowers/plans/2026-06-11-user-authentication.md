# User Authentication, Private/Shared Trips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real email+password accounts so trips are owned, private, and shareable (view/edit) per user, while researched places stay globally shared.

**Architecture:** Auth.js (NextAuth v5 beta) with a Credentials provider and JWT sessions. Identity moves from client-supplied `deviceId` to the server session. Authorization uses Approach A: an Edge-safe `middleware.ts` session gate (split-config pattern) plus a shared `assertTripAccess()` helper called at the top of every trip-scoped route. Data model gains `User`, `TripShare`/`ShareRole`, `Trip.ownerId`, and `Device.userId`.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 5 + PostgreSQL, `next-auth@5` (beta), `@node-rs/argon2`, Zod, Vitest (unit/integration), Playwright (e2e).

**Decisions locked in for this plan:**
- Auth library: `next-auth@5` beta (latest).
- Password hashing: `@node-rs/argon2` (prebuilt, no native build; default variant is argon2id).
- Edge-safe middleware via split config (`auth.config.ts` + `auth.ts`).

**Key conventions observed in this codebase (follow them):**
- Path alias `@/*` → `./src/*` (tsconfig + vitest). Root-level `auth.ts` is importable from `src` as `@/../auth`.
- Route handlers return `NextResponse.json(...)`; validation via Zod `safeParse` → 400 with `{ error, issues }`.
- Integration tests mock Prisma with `vi.hoisted` + `vi.mock('@/lib/prisma', ...)` and import the handler directly. `tests/integration/**` run in the `node` environment; `tests/unit/**` in `happy-dom`.
- Route `[id]` handlers receive `{ params: Promise<{ id: string }> }`.

---

## File Structure

**New files**
- `auth.config.ts` (repo root) — Edge-safe base Auth.js config (pages, callbacks, empty providers). Imported by middleware.
- `auth.ts` (repo root) — Full Auth.js config; spreads `auth.config.ts` + Credentials provider. Exports `{ handlers, auth, signIn, signOut }`.
- `middleware.ts` (repo root) — Session gate for `/map` and `/api/*`.
- `types/next-auth.d.ts` — Session/JWT type augmentation (`user.id`, `token.userId`).
- `src/lib/auth/password.ts` — `hashPassword` / `verifyPassword`.
- `src/lib/auth/access.ts` — `AccessError`, `getSessionUser`, `assertTripAccess`, `accessErrorResponse`.
- `src/lib/schemas/auth.ts` — `registerSchema`, `loginSchema`.
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handlers.
- `app/api/auth/register/route.ts` — Registration endpoint.
- `app/api/trips/[id]/shares/route.ts` — list/add shares.
- `app/api/trips/[id]/shares/[shareId]/route.ts` — revoke share.
- `app/api/devices/claim/route.ts` — attach current device to the logged-in user.
- `scripts/assign-admin-owner.ts` — one-off data migration (admin user + backfill ownership).
- `src/app/Providers.tsx` — client `SessionProvider` wrapper.
- `src/app/login/page.tsx`, `src/app/register/page.tsx` — auth pages (+ `app/login/page.tsx`, `app/register/page.tsx` re-export shims matching existing `app/map/page.tsx` pattern).
- `src/app/components/ShareDialog.tsx` — share UI.

**Modified files**
- `prisma/schema.prisma` — new models + relations.
- `app/api/trips/route.ts`, `app/api/trips/[id]/route.ts`, `app/api/trips/import/route.ts`, `app/api/trips/[id]/{changes,export,full-sync,insert-day,remove-day}/route.ts`.
- `app/api/daily-destinations/route.ts` + `[id]/route.ts`; `app/api/daily-pois/route.ts` + `[id]/route.ts`; `app/api/route-segments/route.ts` + `[id]/route.ts`; `app/api/route-waypoints/[id]/route.ts`; `app/api/branches/route.ts` + `[id]/route.ts`.
- `app/api/devices/register/route.ts` — set `userId` when a session exists.
- `app/layout.tsx` — wrap children in `Providers`.
- `src/app/map/page.tsx` — claim device on login; sign-out control; pass session.
- `.env`, `.env.example` — `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- `package.json` — deps + `tsx` devDep.
- `tests/e2e/helpers/` — auth helper; existing integration tests get a session/owner stub.

---

## Phase 0 — Dependencies & Environment

### Task 1: Install dependencies and add env vars

**Files:**
- Modify: `package.json`
- Modify: `.env`, `.env.example`

- [ ] **Step 1: Install runtime + dev deps**

```bash
cd /opt/web
npm install next-auth@5 @node-rs/argon2
npm install -D tsx
```

Expected: `next-auth`, `@node-rs/argon2` under `dependencies`; `tsx` under `devDependencies`.

- [ ] **Step 2: Add env vars**

Append to `.env.example`:

```bash
# Auth.js — generate with: openssl rand -base64 32
AUTH_SECRET=""
# One-off data migration admin account (scripts/assign-admin-owner.ts)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-me-strong-password"
```

Add real values to `.env` (generate the secret):

```bash
echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env
```

Also set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` to real values.

- [ ] **Step 3: Verify install**

Run: `npm ls next-auth @node-rs/argon2 tsx`
Expected: all three resolve without `UNMET DEPENDENCY`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add next-auth, argon2, tsx deps and auth env vars"
```

---

## Phase 1 — Data Model (Migration A: additive, nullable)

### Task 2: Add User, TripShare, ShareRole, Trip.ownerId (nullable), Device.userId

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the `User` model** (after the `datasource`/`generator` blocks, before `Device`):

```prisma
model User {
  id           String      @id @default(cuid())
  email        String      @unique
  passwordHash String      @map("password_hash")
  name         String?
  isAdmin      Boolean     @default(false) @map("is_admin")
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  devices      Device[]
  ownedTrips   Trip[]      @relation("TripOwner")
  tripShares   TripShare[]

  @@map("users")
}
```

- [ ] **Step 2: Add `userId` to `Device`** — inside `model Device`, add fields and index:

```prisma
  userId String? @map("user_id")
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
```

and add `@@index([userId])` next to the existing `@@map("devices")`.

- [ ] **Step 3: Add owner + shares to `Trip`** — inside `model Trip`, add (nullable for now):

```prisma
  ownerId String?    @map("owner_id")
  owner   User?      @relation("TripOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  shares  TripShare[]
```

and add `@@index([ownerId])` near the other `@@index` lines.

- [ ] **Step 4: Add `TripShare` + `ShareRole`** (after the `Trip` model):

```prisma
model TripShare {
  id        String    @id @default(cuid())
  tripId    String    @map("trip_id")
  userId    String    @map("user_id")
  role      ShareRole
  createdAt DateTime  @default(now())

  trip      Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tripId, userId])
  @@index([userId])
  @@map("trip_shares")
}

enum ShareRole {
  VIEWER
  EDITOR
}
```

- [ ] **Step 5: Create Migration A and regenerate client**

Run: `npx prisma migrate dev --name add_users_and_trip_shares`
Expected: migration applies cleanly (ownerId is nullable, so no existing-row conflict); Prisma client regenerates.

- [ ] **Step 6: Restart dev server (Prisma client is cached)**

Run: `scripts/dev-server.sh restart`
Expected: server restarts; `npm run type-check` still passes for unrelated code.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add User, TripShare, nullable Trip.ownerId, Device.userId"
```

---

## Phase 2 — Password Hashing

### Task 3: `hashPassword` / `verifyPassword`

**Files:**
- Create: `src/lib/auth/password.ts`
- Test: `tests/unit/password.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/password.test.ts
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('password hashing', () => {
  it('produces an argon2 hash that is not the plaintext', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).not.toBe('correct horse battery');
    expect(hash.startsWith('$argon2')).toBe(true);
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('s3cret-password');
    expect(await verifyPassword(hash, 's3cret-password')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cret-password');
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('returns false (does not throw) on a malformed hash', async () => {
    expect(await verifyPassword('not-a-hash', 'whatever')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/password.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth/password`.

- [ ] **Step 3: Implement**

```ts
// src/lib/auth/password.ts
/**
 * Password hashing utilities (argon2id via @node-rs/argon2).
 * @node-rs/argon2's default algorithm is Argon2id.
 */
import { hash, verify } from '@node-rs/argon2';

export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/password.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/password.ts tests/unit/password.test.ts
git commit -m "feat(auth): add argon2id password hashing helpers"
```

---

## Phase 3 — Auth.js Configuration & Registration

### Task 4: Type augmentation + auth schemas

**Files:**
- Create: `types/next-auth.d.ts`
- Create: `src/lib/schemas/auth.ts`
- Test: `tests/unit/auth-schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/auth-schemas.test.ts
import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema } from '@/lib/schemas/auth';

describe('registerSchema', () => {
  it('accepts a valid email + 8-char password', () => {
    expect(registerSchema.safeParse({ email: 'a@b.com', password: '12345678' }).success).toBe(true);
  });
  it('rejects passwords shorter than 8', () => {
    expect(registerSchema.safeParse({ email: 'a@b.com', password: '1234567' }).success).toBe(false);
  });
  it('rejects invalid emails', () => {
    expect(registerSchema.safeParse({ email: 'nope', password: '12345678' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires a non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/auth-schemas.test.ts`
Expected: FAIL — cannot resolve `@/lib/schemas/auth`.

- [ ] **Step 3: Implement schemas**

```ts
// src/lib/schemas/auth.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  name: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 4: Implement type augmentation**

```ts
// types/next-auth.d.ts
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
  interface User {
    id?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
  }
}
```

- [ ] **Step 5: Run test + type-check**

Run: `npm run test -- tests/unit/auth-schemas.test.ts`
Expected: PASS (4 tests).
Run: `npm run type-check`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas/auth.ts types/next-auth.d.ts tests/unit/auth-schemas.test.ts
git commit -m "feat(auth): add register/login zod schemas and next-auth type augmentation"
```

### Task 5: Auth.js config (split: `auth.config.ts` + `auth.ts`) and route handler

**Files:**
- Create: `auth.config.ts` (repo root)
- Create: `auth.ts` (repo root)
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Edge-safe base config**

```ts
// auth.config.ts
import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe base config. NO Node-only imports (no prisma, no argon2) so this
 * module can be bundled into middleware. The Credentials provider is added in
 * auth.ts, which runs only in the Node runtime.
 */
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
```

- [ ] **Step 2: Full config with Credentials**

```ts
// auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/schemas/auth';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await verifyPassword(user.passwordHash, parsed.data.password);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
});
```

- [ ] **Step 3: Wire the NextAuth route handler**

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '../../../../auth';

export const { GET, POST } = handlers;
```

> Note: relative import (`../../../../auth`) reaches the repo-root `auth.ts` from `app/api/auth/[...nextauth]/`.

- [ ] **Step 4: Type-check + manual smoke**

Run: `npm run type-check`
Expected: no errors.
Run: `scripts/dev-server.sh restart` then `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/auth/providers`
Expected: `200` and the providers JSON lists `credentials`.

- [ ] **Step 5: Commit**

```bash
git add auth.config.ts auth.ts app/api/auth
git commit -m "feat(auth): add NextAuth v5 split config and route handler"
```

### Task 6: Registration endpoint

**Files:**
- Create: `app/api/auth/register/route.ts`
- Test: `tests/integration/register-route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/register-route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { user: { create: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/password', () => ({ hashPassword: vi.fn(async () => '$argon2id$hash') }));

import { POST } from '../../app/api/auth/register/route';
import { Prisma } from '@prisma/client';

function req(body: unknown) {
  return new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a user with a lowercased email and hashed password', async () => {
    mockPrisma.user.create.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: null });
    const res = await POST(req({ email: 'A@B.com', password: 'longenough' }));
    expect(res.status).toBe(201);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: { email: 'a@b.com', passwordHash: '$argon2id$hash', name: null },
    });
    const json = await res.json();
    expect(json).toMatchObject({ id: 'u1', email: 'a@b.com' });
    expect(json.passwordHash).toBeUndefined();
  });

  it('rejects a short password with 400', async () => {
    const res = await POST(req({ email: 'a@b.com', password: 'short' }));
    expect(res.status).toBe(400);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('returns 409 on duplicate email', async () => {
    mockPrisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }),
    );
    const res = await POST(req({ email: 'a@b.com', password: 'longenough' }));
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/integration/register-route.test.ts`
Expected: FAIL — cannot resolve the route module.

- [ ] **Step 3: Implement**

```ts
// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { registerSchema } from '@/lib/schemas/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: { email, passwordHash, name: parsed.data.name ?? null },
    });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    console.error('[POST /api/auth/register] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/integration/register-route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/register tests/integration/register-route.test.ts
git commit -m "feat(auth): add POST /api/auth/register endpoint"
```

---

## Phase 4 — Authorization (Approach A)

### Task 7: `assertTripAccess` + access helpers

**Files:**
- Create: `src/lib/auth/access.ts`
- Test: `tests/unit/access.test.ts`

- [ ] **Step 1: Write the failing test (truth table)**

```ts
// tests/unit/access.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { trip: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/../auth', () => ({ auth: vi.fn() }));

import { assertTripAccess, AccessError } from '@/lib/auth/access';

function tripWith(ownerId: string, shares: Array<{ role: 'VIEWER' | 'EDITOR' }>) {
  mockPrisma.trip.findUnique.mockResolvedValue({ ownerId, shares });
}

describe('assertTripAccess', () => {
  beforeEach(() => vi.clearAllMocks());

  it('owner can view and edit', async () => {
    tripWith('owner', []);
    await expect(assertTripAccess('owner', 't1', 'view')).resolves.toBeUndefined();
    tripWith('owner', []);
    await expect(assertTripAccess('owner', 't1', 'edit')).resolves.toBeUndefined();
  });

  it('editor can view and edit', async () => {
    tripWith('owner', [{ role: 'EDITOR' }]);
    await expect(assertTripAccess('u2', 't1', 'view')).resolves.toBeUndefined();
    tripWith('owner', [{ role: 'EDITOR' }]);
    await expect(assertTripAccess('u2', 't1', 'edit')).resolves.toBeUndefined();
  });

  it('viewer can view but not edit (403)', async () => {
    tripWith('owner', [{ role: 'VIEWER' }]);
    await expect(assertTripAccess('u2', 't1', 'view')).resolves.toBeUndefined();
    tripWith('owner', [{ role: 'VIEWER' }]);
    await expect(assertTripAccess('u2', 't1', 'edit')).rejects.toMatchObject({ status: 403 });
  });

  it('stranger is forbidden for view and edit (403)', async () => {
    tripWith('owner', []);
    await expect(assertTripAccess('stranger', 't1', 'view')).rejects.toMatchObject({ status: 403 });
    tripWith('owner', []);
    await expect(assertTripAccess('stranger', 't1', 'edit')).rejects.toMatchObject({ status: 403 });
  });

  it('missing trip throws 404', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    await expect(assertTripAccess('u1', 'missing', 'view')).rejects.toMatchObject({ status: 404 });
  });

  it('queries only the requesting user\'s shares', async () => {
    tripWith('owner', []);
    await assertTripAccess('owner', 't1', 'view');
    expect(mockPrisma.trip.findUnique).toHaveBeenCalledWith({
      where: { id: 't1' },
      select: { ownerId: true, shares: { where: { userId: 'owner' }, select: { role: true } } },
    });
  });

  it('AccessError is an Error subclass with a status', () => {
    const e = new AccessError(403, 'nope');
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/access.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth/access`.

- [ ] **Step 3: Implement**

```ts
// src/lib/auth/access.ts
import { NextResponse } from 'next/server';
import { ShareRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/../auth';

export type AccessLevel = 'view' | 'edit';

export class AccessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AccessError';
  }
}

/**
 * Resolve the authenticated user id from the session. Throws 401 if absent.
 * Routes are already gated by middleware, but call this to obtain the id and
 * to defend against direct invocation.
 */
export async function getSessionUser(): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AccessError(401, 'Unauthenticated');
  }
  return { id: session.user.id };
}

/**
 * Resolve owner + the requesting user's share in a single query.
 * Owner → full access. EDITOR → view+edit. VIEWER → view only.
 * Otherwise 403; missing trip 404.
 */
export async function assertTripAccess(
  userId: string,
  tripId: string,
  level: AccessLevel,
): Promise<void> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { ownerId: true, shares: { where: { userId }, select: { role: true } } },
  });

  if (!trip) throw new AccessError(404, 'Trip not found');
  if (trip.ownerId === userId) return;

  const share = trip.shares[0];
  if (!share) throw new AccessError(403, 'Forbidden');
  if (level === 'view') return;
  if (level === 'edit' && share.role === ShareRole.EDITOR) return;

  throw new AccessError(403, 'Forbidden');
}

/**
 * Map an AccessError to a JSON response. Returns null for non-AccessError so
 * callers can fall through to their generic 500 handler.
 */
export function accessErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/access.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/access.ts tests/unit/access.test.ts
git commit -m "feat(auth): add assertTripAccess + session/access helpers"
```

### Task 8: Middleware session gate

**Files:**
- Create: `middleware.ts` (repo root)

- [ ] **Step 1: Implement**

```ts
// middleware.ts
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

// Public API prefixes that must remain reachable without a session.
const PUBLIC_API_PREFIXES = ['/api/auth', '/api/map-config', '/api/geocode'];

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const isApi = pathname.startsWith('/api');

  if (isApi) {
    const isPublic = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
    if (isPublic || isLoggedIn) return NextResponse.next();
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Page routes matched below (/map). Redirect unauthenticated to /login.
  if (!isLoggedIn) {
    const url = new URL('/login', origin);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/map/:path*', '/api/:path*'],
};
```

- [ ] **Step 2: Manual verification — unauthenticated API returns 401**

Run: `scripts/dev-server.sh restart` then
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/trips`
Expected: `401`.

- [ ] **Step 3: Manual verification — public route still 200**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/map-config`
Expected: `200`.

- [ ] **Step 4: Manual verification — unauthenticated page redirects**

Run: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/map`
Expected: `307`/`302` redirecting to `/login?callbackUrl=...`.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): add edge-safe middleware session gate"
```

---

## Phase 5 — API Authorization Wiring

> Pattern applied to every trip-scoped handler: at the top, inside the existing
> `try`, call `const { id: userId } = await getSessionUser();` then
> `await assertTripAccess(userId, tripId, 'view'|'edit');`. In `catch`, add
> `const ae = accessErrorResponse(error); if (ae) return ae;` **before** the
> existing `console.error`/500. The `tripId` source differs per route and is
> stated for each. `data.deviceId` stays ONLY for `lastModifiedByDeviceId`.

### Task 9: Trips collection + detail ownership

**Files:**
- Modify: `app/api/trips/route.ts`
- Modify: `app/api/trips/[id]/route.ts`
- Test: `tests/integration/trips-route.test.ts` (extend), `tests/integration/trip-api.test.ts` (extend)

- [ ] **Step 1: Write failing tests for ownership scoping**

Add to `tests/integration/trips-route.test.ts` a new `describe` that mocks `@/lib/auth/access` and `@/lib/prisma` and imports `GET`, `POST` from `../../app/api/trips/route`:

```ts
vi.mock('@/lib/auth/access', () => ({
  getSessionUser: vi.fn(async () => ({ id: 'me' })),
  assertTripAccess: vi.fn(async () => {}),
  accessErrorResponse: vi.fn(() => null),
}));
```

Tests:
- `GET /api/trips` calls `prisma.trip.findMany` with a `where` of `{ OR: [{ ownerId: 'me' }, { shares: { some: { userId: 'me' } } }] }`.
- `POST /api/trips` sets `data.ownerId` to `'me'`.

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- tests/integration/trips-route.test.ts`
Expected: FAIL (findMany called with no `where`; create has no `ownerId`).

- [ ] **Step 3: Implement `GET` scoping in `app/api/trips/route.ts`**

Add imports:

```ts
import { getSessionUser } from '@/lib/auth/access';
```

Replace the `findMany` in `GET`:

```ts
const { id: userId } = await getSessionUser();
const trips = await prisma.trip.findMany({
  where: { OR: [{ ownerId: userId }, { shares: { some: { userId } } }] },
  orderBy: { createdAt: 'desc' },
});
```

- [ ] **Step 4: Implement `POST` owner assignment**

In `POST`, after validation, get the user and set owner on create:

```ts
const { id: userId } = await getSessionUser();
// ...inside prisma.trip.create data: add
    ownerId: userId,
```

- [ ] **Step 5: Implement access checks in `app/api/trips/[id]/route.ts`**

Add imports `getSessionUser, assertTripAccess, accessErrorResponse`. The `tripId` is `(await params).id` (handlers already resolve `params`). At the top of each handler's `try`:
- `GET` → `assertTripAccess(userId, id, 'view')`
- `PATCH` → `assertTripAccess(userId, id, 'edit')`
- `DELETE` → `assertTripAccess(userId, id, 'edit')` (owner-or-editor; the existing delete safeguard stays). In each `catch`, add the `accessErrorResponse` short-circuit.

- [ ] **Step 6: Run tests + type-check**

Run: `npm run test -- tests/integration/trips-route.test.ts tests/integration/trip-api.test.ts`
Expected: PASS (existing PATCH tests still green after adding the `assertTripAccess` mock to that file's mock block).
Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/trips/route.ts app/api/trips/\[id\]/route.ts tests/integration/trips-route.test.ts tests/integration/trip-api.test.ts
git commit -m "feat(api): scope trips list/create by owner and guard trip detail"
```

### Task 10: Trip action sub-routes + import

**Files:**
- Modify: `app/api/trips/[id]/export/route.ts` (view)
- Modify: `app/api/trips/[id]/changes/route.ts` (view on GET; edit on any mutation it performs)
- Modify: `app/api/trips/[id]/full-sync/route.ts` (edit)
- Modify: `app/api/trips/[id]/insert-day/route.ts` (edit)
- Modify: `app/api/trips/[id]/remove-day/route.ts` (edit)
- Modify: `app/api/trips/import/route.ts` (set `ownerId` from session on the created trip)

- [ ] **Step 1: Add guards** — for each `[id]/*` route, `tripId = (await params).id`; add `getSessionUser` + `assertTripAccess` (level per list above) at the top of the `try`, and `accessErrorResponse` in the `catch`. Read each file first to confirm its handler signature, then insert.

- [ ] **Step 2: Import route owner** — in `app/api/trips/import/route.ts`, call `getSessionUser()` and set `ownerId: userId` on the trip it creates (search for the `prisma.trip.create` / transaction that builds the imported trip).

- [ ] **Step 3: Type-check + targeted tests**

Run: `npm run type-check`
Run: `npm run test -- tests/integration/trip-changes-route.test.ts tests/integration/remove-day-route.test.ts tests/integration/trip-export-import-route.test.ts tests/integration/trip-import.test.ts`
Expected: update each test's mock block to include the `@/lib/auth/access` mock (as in Task 9 Step 1); then PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/trips/\[id\] app/api/trips/import tests/integration
git commit -m "feat(api): guard trip action routes and assign owner on import"
```

### Task 11: Daily destinations + daily POIs

**Files:**
- Modify: `app/api/daily-destinations/route.ts` (GET: tripId from `?tripId`; POST: tripId from body)
- Modify: `app/api/daily-destinations/[id]/route.ts` (tripId from the loaded record)
- Modify: `app/api/daily-pois/route.ts`, `app/api/daily-pois/[id]/route.ts`

- [ ] **Step 1: Write a failing guard test (representative)**

Create `tests/integration/daily-destinations-auth.test.ts` mocking `@/lib/prisma` and `@/lib/auth/access` where `assertTripAccess` is `vi.fn(async () => { throw new AccessError(403, 'Forbidden'); })` and assert `POST` returns 403 and never calls `prisma.dailyDestination.create`.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- tests/integration/daily-destinations-auth.test.ts`
Expected: FAIL (currently returns 201/404, not 403).

- [ ] **Step 3: Implement guards**
- `daily-destinations` GET: after reading `tripId` query param, `assertTripAccess(userId, tripId, 'view')`.
- `daily-destinations` POST: after resolving `tripId` from body, `assertTripAccess(userId, tripId, 'edit')`.
- `daily-destinations/[id]` GET/PATCH/DELETE: load the record (`prisma.dailyDestination.findUnique`) to read `tripId`, then `assertTripAccess(userId, record.tripId, 'view'|'edit')`. Use `'view'` for GET, `'edit'` for PATCH/DELETE.
- Mirror all of the above for `daily-pois` (`prisma.dailyPoi`).
- Add `accessErrorResponse` to every `catch`.

- [ ] **Step 4: Run tests + type-check**

Run: `npm run test -- tests/integration/daily-destinations-auth.test.ts tests/integration/daily-destination-api.test.ts tests/integration/daily-destinations-route.test.ts`
Expected: PASS (add the `@/lib/auth/access` happy-path mock to the existing two suites).
Run: `npm run type-check`

- [ ] **Step 5: Commit**

```bash
git add app/api/daily-destinations app/api/daily-pois tests/integration/daily-destinations-auth.test.ts tests/integration/daily-destination-api.test.ts tests/integration/daily-destinations-route.test.ts
git commit -m "feat(api): guard daily-destinations and daily-pois routes"
```

### Task 12: Route segments, route waypoints, branches

**Files:**
- Modify: `app/api/route-segments/route.ts` + `[id]/route.ts`
- Modify: `app/api/route-waypoints/[id]/route.ts`
- Modify: `app/api/branches/route.ts` + `[id]/route.ts`

- [ ] **Step 1: Implement guards**
- `route-segments` GET (tripId from query) → view; POST (tripId from body) → edit.
- `route-segments/[id]` → load record for `tripId`; GET view, PATCH/DELETE edit.
- `route-waypoints/[id]` → load waypoint → `segment` → `segment.tripId` (use `include: { segment: { select: { tripId: true } } }`); GET view, PATCH/DELETE edit.
- `branches` GET (tripId from query) → view; POST (tripId from body) → edit.
- `branches/[id]` → load record for `tripId`; GET view, PATCH/DELETE edit.
- `accessErrorResponse` in every `catch`.

- [ ] **Step 2: Run existing suites with auth mock added**

Run: `npm run test -- tests/integration/route-segments-route.test.ts tests/integration/branches-route.test.ts`
Expected: PASS (add `@/lib/auth/access` happy-path mock to each).
Run: `npm run type-check`

- [ ] **Step 3: Commit**

```bash
git add app/api/route-segments app/api/route-waypoints app/api/branches tests/integration/route-segments-route.test.ts tests/integration/branches-route.test.ts
git commit -m "feat(api): guard route-segments, route-waypoints, branches routes"
```

### Task 13: Share management routes

**Files:**
- Create: `app/api/trips/[id]/shares/route.ts` (GET list, POST add)
- Create: `app/api/trips/[id]/shares/[shareId]/route.ts` (DELETE revoke)
- Create: `src/lib/schemas/share.ts`
- Test: `tests/integration/shares-route.test.ts`

- [ ] **Step 1: Share schema**

```ts
// src/lib/schemas/share.ts
import { z } from 'zod';

export const shareCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(['VIEWER', 'EDITOR']),
});
export type ShareCreateInput = z.infer<typeof shareCreateSchema>;
```

- [ ] **Step 2: Write failing tests**

```ts
// tests/integration/shares-route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    trip: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    tripShare: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/access', () => ({
  getSessionUser: vi.fn(async () => ({ id: 'owner' })),
  AccessError: class AccessError extends Error { constructor(public status: number, m: string){ super(m);} },
  accessErrorResponse: vi.fn(() => null),
}));

import { GET, POST } from '../../app/api/trips/[id]/shares/route';

function jsonReq(body: unknown) {
  return new Request('http://localhost:3000/api/trips/t1/shares', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ id: 't1' }) };

describe('trip shares', () => {
  beforeEach(() => vi.clearAllMocks());

  it('owner lists shares', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ ownerId: 'owner' });
    mockPrisma.tripShare.findMany.mockResolvedValue([
      { id: 's1', role: 'VIEWER', user: { id: 'u2', email: 'b@b.com', name: null } },
    ]);
    const res = await GET(new Request('http://localhost:3000/api/trips/t1/shares'), ctx);
    expect(res.status).toBe(200);
  });

  it('non-owner cannot list shares (403)', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ ownerId: 'someone-else' });
    const res = await GET(new Request('http://localhost:3000/api/trips/t1/shares'), ctx);
    expect(res.status).toBe(403);
  });

  it('POST resolves email to an existing user and creates a share', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ ownerId: 'owner' });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', email: 'b@b.com' });
    mockPrisma.tripShare.create.mockResolvedValue({ id: 's1', tripId: 't1', userId: 'u2', role: 'EDITOR' });
    const res = await POST(jsonReq({ email: 'B@B.com', role: 'EDITOR' }), ctx);
    expect(res.status).toBe(201);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'b@b.com' } });
  });

  it('POST with unknown email returns 404', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ ownerId: 'owner' });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await POST(jsonReq({ email: 'nobody@b.com', role: 'VIEWER' }), ctx);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm run test -- tests/integration/shares-route.test.ts`
Expected: FAIL — route modules don't exist.

- [ ] **Step 4: Implement list + add**

```ts
// app/api/trips/[id]/shares/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUser, AccessError, accessErrorResponse } from '@/lib/auth/access';
import { shareCreateSchema } from '@/lib/schemas/share';

async function assertOwner(userId: string, tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { ownerId: true } });
  if (!trip) throw new AccessError(404, 'Trip not found');
  if (trip.ownerId !== userId) throw new AccessError(403, 'Only the owner can manage shares');
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tripId } = await params;
    const { id: userId } = await getSessionUser();
    await assertOwner(userId, tripId);
    const shares = await prisma.tripShare.findMany({
      where: { tripId },
      select: { id: true, role: true, createdAt: true, user: { select: { id: true, email: true, name: true } } },
    });
    return NextResponse.json(shares, { status: 200 });
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error('[GET /api/trips/[id]/shares] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tripId } = await params;
    const { id: userId } = await getSessionUser();
    await assertOwner(userId, tripId);

    const body = await request.json().catch(() => null);
    const parsed = shareCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const recipient = await prisma.user.findUnique({ where: { email } });
    if (!recipient) return NextResponse.json({ error: 'No such user' }, { status: 404 });
    if (recipient.id === userId) {
      return NextResponse.json({ error: 'You already own this trip' }, { status: 400 });
    }

    const share = await prisma.tripShare.create({
      data: { tripId, userId: recipient.id, role: parsed.data.role },
    });
    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Already shared with this user' }, { status: 409 });
    }
    console.error('[POST /api/trips/[id]/shares] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Implement revoke**

```ts
// app/api/trips/[id]/shares/[shareId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, AccessError, accessErrorResponse } from '@/lib/auth/access';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> },
) {
  try {
    const { id: tripId, shareId } = await params;
    const { id: userId } = await getSessionUser();

    const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { ownerId: true } });
    if (!trip) throw new AccessError(404, 'Trip not found');
    if (trip.ownerId !== userId) throw new AccessError(403, 'Only the owner can manage shares');

    const share = await prisma.tripShare.findUnique({ where: { id: shareId }, select: { tripId: true } });
    if (!share || share.tripId !== tripId) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    await prisma.tripShare.delete({ where: { id: shareId } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error('[DELETE /api/trips/[id]/shares/[shareId]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Run tests + type-check**

Run: `npm run test -- tests/integration/shares-route.test.ts`
Expected: PASS (4 tests).
Run: `npm run type-check`

- [ ] **Step 7: Commit**

```bash
git add app/api/trips/\[id\]/shares src/lib/schemas/share.ts tests/integration/shares-route.test.ts
git commit -m "feat(api): add trip share management routes"
```

---

## Phase 6 — Data Migration & NOT NULL Lockdown

### Task 14: Admin backfill script

**Files:**
- Create: `scripts/assign-admin-owner.ts`

- [ ] **Step 1: Implement the script**

```ts
// scripts/assign-admin-owner.ts
/**
 * One-off data migration: ensure an admin User exists (from ADMIN_EMAIL /
 * ADMIN_PASSWORD), assign every ownerless trip to it, and claim ownerless
 * devices. Idempotent: safe to run more than once.
 *
 * Run: npx tsx scripts/assign-admin-owner.ts
 */
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set');
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true },
    create: { email, passwordHash: await hash(password), name: 'Admin', isAdmin: true },
  });

  const trips = await prisma.trip.updateMany({
    where: { ownerId: null },
    data: { ownerId: admin.id },
  });

  const devices = await prisma.device.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });

  console.log(`Admin ${admin.email}: backfilled ${trips.count} trips, ${devices.count} devices`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the script**

Run: `npx tsx scripts/assign-admin-owner.ts`
Expected: prints the admin email and non-error counts; no trips remain with `ownerId = NULL`.

- [ ] **Step 3: Verify no ownerless trips remain**

Run: `npx tsx -e "import('@prisma/client').then(async({PrismaClient})=>{const p=new PrismaClient();console.log(await p.trip.count({where:{ownerId:null}}));await p.\$disconnect();})"`
Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add scripts/assign-admin-owner.ts
git commit -m "feat(db): add admin ownership backfill migration script"
```

### Task 15: Migration B — make `Trip.ownerId` NOT NULL

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Tighten the schema** — in `model Trip`, change:

```prisma
  ownerId String     @map("owner_id")
  owner   User       @relation("TripOwner", fields: [ownerId], references: [id], onDelete: Cascade)
```

(remove the `?` from both `ownerId` and the `owner` relation).

- [ ] **Step 2: Create Migration B**

Run: `npx prisma migrate dev --name trip_owner_required`
Expected: applies cleanly because Task 14 already backfilled all rows (no NULLs). If it warns about NULLs, re-run Task 14 first.

- [ ] **Step 3: Restart + type-check**

Run: `scripts/dev-server.sh restart && npm run type-check`
Expected: server up; no type errors (owner is now non-nullable in generated types).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): make Trip.ownerId NOT NULL"
```

---

## Phase 7 — Frontend

### Task 16: SessionProvider + layout wiring

**Files:**
- Create: `src/app/Providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Providers component**

```tsx
// src/app/Providers.tsx
'use client';
import { SessionProvider } from 'next-auth/react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 2: Wrap children in `app/layout.tsx`**

Add `import Providers from '../src/app/Providers';` and wrap the existing `{children}` inside `<body>`:

```tsx
<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
  <Providers>{children}</Providers>
</body>
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/Providers.tsx app/layout.tsx
git commit -m "feat(ui): add SessionProvider to root layout"
```

### Task 17: Login & register pages

**Files:**
- Create: `src/app/login/page.tsx`, `app/login/page.tsx`
- Create: `src/app/register/page.tsx`, `app/register/page.tsx`

- [ ] **Step 1: Login page**

```tsx
// src/app/login/page.tsx
'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/map';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl });
    setSubmitting(false);
    if (res?.error) {
      setError('Invalid email or password');
      return;
    }
    window.location.href = res?.url ?? callbackUrl;
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-4 text-2xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="rounded border p-2" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="rounded border p-2" required />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="rounded bg-blue-600 p-2 text-white disabled:opacity-50">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-sm">No account? <a href="/register" className="text-blue-600">Register</a></p>
    </main>
  );
}
```

- [ ] **Step 2: Register page**

```tsx
// src/app/register/page.tsx
'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Registration failed');
      setSubmitting(false);
      return;
    }
    await signIn('credentials', { email, password, redirect: false });
    window.location.href = '/map';
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-4 text-2xl font-semibold">Create account</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="rounded border p-2" required />
        <input type="password" placeholder="Password (min 8 chars)" value={password}
          onChange={(e) => setPassword(e.target.value)} className="rounded border p-2" minLength={8} required />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="rounded bg-blue-600 p-2 text-white disabled:opacity-50">
          {submitting ? 'Creating…' : 'Register'}
        </button>
      </form>
      <p className="mt-4 text-sm">Have an account? <a href="/login" className="text-blue-600">Sign in</a></p>
    </main>
  );
}
```

- [ ] **Step 3: Re-export shims under `app/`** (matching `app/map/page.tsx`):

```tsx
// app/login/page.tsx
export { default } from '../../src/app/login/page';
```

```tsx
// app/register/page.tsx
export { default } from '../../src/app/register/page';
```

- [ ] **Step 4: Manual verification**

Run: `scripts/dev-server.sh restart`, open `http://localhost:3000/register`, create an account, confirm redirect to `/map`. Then `http://localhost:3000/login` works for the same account.

- [ ] **Step 5: Commit**

```bash
git add src/app/login src/app/register app/login app/register
git commit -m "feat(ui): add login and register pages"
```

### Task 18: Device claim on login + sign-out control

**Files:**
- Create: `app/api/devices/claim/route.ts`
- Modify: `app/api/devices/register/route.ts`
- Modify: `src/app/map/page.tsx`

- [ ] **Step 1: Claim endpoint**

```ts
// app/api/devices/claim/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser, accessErrorResponse } from '@/lib/auth/access';

const claimSchema = z.object({ sessionId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  try {
    const { id: userId } = await getSessionUser();
    const parsed = claimSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
    }
    await prisma.device.updateMany({
      where: { sessionId: parsed.data.sessionId },
      data: { userId },
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error('[POST /api/devices/claim] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Claim on login in `src/app/map/page.tsx`** — add a `useSession`-driven effect that, when authenticated, POSTs the current `sessionId` to `/api/devices/claim`, and render a sign-out button:

```tsx
import { useSession, signOut } from 'next-auth/react';
// ...inside the component:
const { data: session } = useSession();
useEffect(() => {
  if (!session?.user) return;
  const sessionId = sessionStorage.getItem('trip-planner-session-id');
  if (!sessionId) return;
  fetch('/api/devices/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }).catch((err) => console.warn('[map] device claim failed:', err));
}, [session?.user]);
```

Add a sign-out control in the existing header/toolbar:

```tsx
{session?.user && (
  <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-gray-600">
    Sign out ({session.user.email})
  </button>
)}
```

- [ ] **Step 3: (Optional consistency) `register` route** — if a session exists when `/api/devices/register` runs, set `userId` on create/update. Use `const session = await auth(); const userId = session?.user?.id ?? undefined;` and include `...(userId ? { userId } : {})` in the create/update `data`.

- [ ] **Step 4: Manual verification**

Sign in, then check the claimed device:

Run: `npx tsx -e "import('@prisma/client').then(async({PrismaClient})=>{const p=new PrismaClient();console.log(await p.device.findMany({where:{userId:{not:null}},select:{id:true,userId:true}}));await p.\$disconnect();})"`
Expected: the active device row has a non-null `userId`.

- [ ] **Step 5: Commit**

```bash
git add app/api/devices/claim app/api/devices/register/route.ts src/app/map/page.tsx
git commit -m "feat(ui): claim device on login and add sign-out control"
```

### Task 19: Share dialog + shared-with-me markings

**Files:**
- Create: `src/app/components/ShareDialog.tsx`
- Modify: the trip list component (find via `grep -rl "TripList" src/app`) to add a share button + shared/view-only badges.

- [ ] **Step 1: ShareDialog component**

```tsx
// src/app/components/ShareDialog.tsx
'use client';
import { useEffect, useState } from 'react';

interface Share {
  id: string;
  role: 'VIEWER' | 'EDITOR';
  user: { id: string; email: string; name: string | null };
}

export default function ShareDialog({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/trips/${tripId}/shares`);
    if (res.ok) setShares(await res.json());
  }
  useEffect(() => { load(); }, [tripId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to share');
      return;
    }
    setEmail('');
    await load();
  }

  async function revoke(shareId: string) {
    await fetch(`/api/trips/${tripId}/shares/${shareId}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded bg-white p-6 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share trip</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <ul className="mb-4 flex flex-col gap-2">
          {shares.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <span>{s.user.email} — {s.role.toLowerCase()}</span>
              <button onClick={() => revoke(s.id)} className="text-red-600">Remove</button>
            </li>
          ))}
          {shares.length === 0 && <li className="text-sm text-gray-500">Not shared yet.</li>}
        </ul>
        <form onSubmit={add} className="flex flex-col gap-2">
          <input type="email" placeholder="Email of registered user" value={email}
            onChange={(e) => setEmail(e.target.value)} className="rounded border p-2" required />
          <select value={role} onChange={(e) => setRole(e.target.value as 'VIEWER' | 'EDITOR')}
            className="rounded border p-2">
            <option value="VIEWER">Can view</option>
            <option value="EDITOR">Can edit</option>
          </select>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded bg-blue-600 p-2 text-white">Add</button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into trip list** — add a "Share" button that opens `ShareDialog` for owned trips. For trips where the current user is not the owner, render a "Shared with you" badge; for `VIEWER` shares, render trip detail controls as disabled/read-only. (The `GET /api/trips` response already includes owner/shares; extend its `select` to return `ownerId` and the current user's `shares` role so the UI can distinguish owner vs viewer vs editor.)

- [ ] **Step 3: Type-check + manual verification**

Run: `npm run type-check`
Manual: as owner, open the share dialog, add a second registered account as VIEWER, confirm it appears; sign in as that second account and confirm the trip shows "Shared with you" and is read-only.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/ShareDialog.tsx src/app
git commit -m "feat(ui): add share dialog and shared-with-me markings"
```

---

## Phase 8 — End-to-End Test

### Task 20: E2E auth helper + full sharing flow

**Files:**
- Create: `tests/e2e/helpers/auth.ts`
- Create: `tests/e2e/auth-sharing.spec.ts`

- [ ] **Step 1: Auth helper**

```ts
// tests/e2e/helpers/auth.ts
import { Page, request } from '@playwright/test';

export async function registerUser(baseURL: string, email: string, password: string) {
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post('/api/auth/register', { data: { email, password } });
  // 201 created or 409 already exists are both acceptable for idempotent seeding
  if (![201, 409].includes(res.status())) {
    throw new Error(`register failed: ${res.status()} ${await res.text()}`);
  }
  await ctx.dispose();
}

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/map');
}
```

- [ ] **Step 2: Full-flow spec**

```ts
// tests/e2e/auth-sharing.spec.ts
import { test, expect } from '@playwright/test';
import { registerUser, loginViaUI } from './helpers/auth';

const PW = 'e2e-password-123';

test('register → login → create trip → share → second user sees it; signed-out redirects', async ({ page, baseURL, browser }) => {
  const owner = `owner-${Date.now()}@e2e.test`;
  const friend = `friend-${Date.now()}@e2e.test`;
  await registerUser(baseURL!, owner, PW);
  await registerUser(baseURL!, friend, PW);

  // Owner creates and shares a trip via API (UI create is covered elsewhere).
  await loginViaUI(page, owner, PW);
  const create = await page.request.post('/api/trips', {
    data: { title: 'Shared Trip', startDate: '2026-09-01', stopDate: '2026-09-03' },
  });
  expect(create.status()).toBe(201);
  const trip = await create.json();

  const share = await page.request.post(`/api/trips/${trip.id}/shares`, {
    data: { email: friend, role: 'VIEWER' },
  });
  expect(share.status()).toBe(201);

  // Second user, isolated context, sees the trip in their list.
  const ctx = await browser.newContext();
  const friendPage = await ctx.newPage();
  await loginViaUI(friendPage, friend, PW);
  const list = await friendPage.request.get('/api/trips');
  const trips = await list.json();
  expect(trips.some((t: { id: string }) => t.id === trip.id)).toBe(true);

  // Viewer cannot mutate.
  const mutate = await friendPage.request.patch(`/api/trips/${trip.id}`, { data: { title: 'Hijacked' } });
  expect(mutate.status()).toBe(403);
  await ctx.close();

  // Signed out → /api/trips is 401; /map redirects to /login.
  const anon = await page.request.newContext ? null : null; // placeholder removed below
  await page.context().clearCookies();
  const anonReq = await page.request.get('/api/trips');
  expect(anonReq.status()).toBe(401);
  await page.goto('/map');
  await page.waitForURL('**/login**');
});
```

> Note: when implementing, drop the unused `anon` line above; it is illustrative. The real assertions are the `clearCookies()` → 401 → redirect sequence.

- [ ] **Step 3: Run e2e**

Run: `npm run test:e2e -- auth-sharing.spec.ts`
Expected: the spec passes against the running dev server (start it first if the Playwright config doesn't auto-start).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers/auth.ts tests/e2e/auth-sharing.spec.ts
git commit -m "test(e2e): add auth + sharing end-to-end flow"
```

### Task 21: Update existing tests to authenticate

**Files:**
- Modify: existing `tests/integration/*` suites that exercise guarded routes (those not already updated in Phase 5).
- Modify: existing `tests/e2e/*.spec.ts` (`trip-crud`, `cross-device-sync`, `trip-export-import`) to log in via the helper before exercising the app.

- [ ] **Step 1: Integration** — for any guarded-route suite still failing, add the standard happy-path mock:

```ts
vi.mock('@/lib/auth/access', () => ({
  getSessionUser: vi.fn(async () => ({ id: 'test-user' })),
  assertTripAccess: vi.fn(async () => {}),
  accessErrorResponse: vi.fn(() => null),
  AccessError: class AccessError extends Error { constructor(public status: number, m: string){ super(m);} },
}));
```

- [ ] **Step 2: E2E** — add a `registerUser` + `loginViaUI` call in a `beforeEach` (or top of each spec) so the existing flows run authenticated.

- [ ] **Step 3: Run the full suites**

Run: `npm run test`
Expected: all unit + integration tests pass.
Run: `npm run test:e2e`
Expected: all e2e specs pass.
Run: `npm run type-check && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add tests
git commit -m "test: authenticate existing integration and e2e suites"
```

---

## Self-Review (completed against the design)

**Spec coverage:**
- Email+password via Auth.js v5 Credentials + JWT → Tasks 4–6.
- `User` / `Trip.ownerId` / `Device.userId` / `TripShare` / `ShareRole` → Tasks 2, 15.
- `assertTripAccess` truth table + middleware (Approach A) → Tasks 7, 8.
- `GET /api/trips` owner-or-share scoping; `POST` owner from session → Task 9.
- Sub-resource view/edit guards → Tasks 10–12.
- Share routes (list/add-by-email/revoke, owner-only, unknown email 404, idempotent) → Task 13.
- Migration A (nullable) → Task 2; data backfill (admin from env) → Task 14; Migration B (NOT NULL) → Task 15.
- Login/register pages, SessionProvider, device-claim on login, share UI, shared/view-only markings → Tasks 16–19.
- Researched places stay global → unchanged by construction (no Neo4j/`DiscoveredExperience` user-scoping anywhere in this plan).
- Tests: unit (access/password/register/share-resolution), integration (403/viewer/editor/owner), e2e full flow → Tasks 3, 6, 7, 13, 20, 21.

**Open items resolved:** next-auth@5 beta (latest); admin creds from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
**Out of scope (not planned):** pending invites, link sharing, OAuth/magic-link, password reset/email verification, admin UI beyond `isAdmin`.

**Necessary addition beyond the literal design:** split Auth.js config (`auth.config.ts` + `auth.ts`) so middleware stays Edge-safe given the Node-only Credentials `authorize()`.
