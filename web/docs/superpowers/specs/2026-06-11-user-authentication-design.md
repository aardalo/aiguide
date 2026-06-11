# User Authentication, Private/Shared Trips, and Global Researched Places — Design

- **Date:** 2026-06-11
- **Status:** Approved (design); ready for implementation planning
- **Author:** Brainstormed with Claude Code

## Summary

Introduce real user accounts (email + password) to the Trip Planner. Trips become
**owned and private per user**, but can be **shared with other registered users** at a
**per-share permission level (view or edit)**. **Researched places** (AI-discovered
experiences, cached in Neo4j by geography) remain **globally shared across all users**
by construction — they are never user-scoped.

## Current State (as built today)

- **No real authentication.** Identity is a `Device` — an anonymous browser profile keyed
  by a `sessionId` in `localStorage`, registered via `/api/devices/register`. No password,
  no account, no auth library installed (`next-auth` not present).
- **Trips are not actually owned or scoped.** `GET /api/trips` runs `findMany()` with no
  filter, so every trip is visible to everyone. The `Device` relation on `Trip` exists in
  the schema but trip creation does not set it. `lastModifiedByDeviceId` is used only for
  multi-device sync/conflict tracking, not ownership.
- **Researched places** = `DiscoveredExperience` results cached in **Neo4j**, keyed by
  geography (not by device/user) — already globally shared. The requirement to keep them
  shared is satisfied by *not regressing* this.
- 31 API route handlers under `app/api/`. No `middleware.ts`. Device id currently travels
  in the **request body** (`data.deviceId`).

## Decisions (from brainstorming)

| Topic | Decision |
|-------|----------|
| Auth method | **Email + password** via **Auth.js (NextAuth v5)** Credentials provider |
| Device ↔ User | **User owns Devices** — add `userId` to `Device`; trips owned by `User`; sync/conflict tracking stays per-Device |
| Share access | **Per-share view OR edit** (owner chooses the role for each recipient) |
| Share mechanism | **By email, multiple recipients, existing users only** (no pending invites, no link sharing) |
| Scope | **Full feature** (login/register pages, route guards, share UI) + migration assigning existing ownerless trips to a first **admin** user |
| Authorization | **Approach A** — middleware session gate + shared `assertTripAccess()` helper |
| Session storage | **JWT strategy** (stateless; no Session/Account tables) |
| User deletion | `Trip.owner` uses `onDelete: Cascade` — deleting a user deletes their owned trips |

## Data Model

### New `User`
```prisma
model User {
  id           String      @id @default(cuid())
  email        String      @unique          // stored lowercased
  passwordHash String      @map("password_hash")
  name         String?
  isAdmin      Boolean     @default(false) @map("is_admin")
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  devices      Device[]
  ownedTrips   Trip[]      @relation("TripOwner")
  tripShares   TripShare[]                   // trips shared WITH this user

  @@map("users")
}
```

### `Trip` gains a required owner (nullable during migration, then NOT NULL)
```prisma
ownerId String     @map("owner_id")
owner   User       @relation("TripOwner", fields: [ownerId], references: [id], onDelete: Cascade)
shares  TripShare[]
@@index([ownerId])
```

### `Device` gains an optional owner
```prisma
userId String? @map("user_id")
user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
@@index([userId])
```

### New `TripShare`
```prisma
model TripShare {
  id        String    @id @default(cuid())
  tripId    String    @map("trip_id")
  userId    String    @map("user_id")   // recipient; must be a registered user
  role      ShareRole
  createdAt DateTime  @default(now())

  trip      Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tripId, userId])             // one share row per (trip, user)
  @@index([userId])
  @@map("trip_shares")
}

enum ShareRole { VIEWER  EDITOR }
```

### Access rule (computed by `assertTripAccess`)
- **Owner** → full access (view + edit + share + delete).
- `TripShare` with **EDITOR** → view + edit.
- `TripShare` with **VIEWER** → view only.
- Otherwise → **403**.

### Unchanged
- Neo4j discovered-places cache: no `userId`, stays global. Researched places remain shared.

## Authentication (Auth.js / NextAuth v5)

- Add `next-auth@5` with **Credentials provider** and **JWT** session strategy.
- `auth.ts` (repo root) exports `{ handlers, auth, signIn, signOut }`; session JWT carries `userId`.
- `app/api/auth/[...nextauth]/route.ts` wires the handlers.
- **Registration** route `POST /api/auth/register`: Zod-validated email + password
  (min length 8), reject duplicate email, hash with **argon2id**, create `User`.
- Credentials `authorize()`: look up by lowercased email, verify hash, return
  `{ id, email, name }`; any failure returns `null` → generic "invalid credentials"
  (no user-enumeration leak).
- `AUTH_SECRET` added to `.env` and `.env.example`.

## Authorization Enforcement (Approach A)

- **`middleware.ts`** (repo root): require a valid session for `/map` (redirect → `/login`)
  and `/api/*`, **except** `/api/auth/*` and any genuinely public routes
  (e.g. `map-config`, `geocode` if they must stay public) → unauthenticated `/api/*` returns
  **401 JSON**.
- **`src/lib/auth/access.ts`**:
  - `getSessionUser(req)` → resolves the authenticated user id from the session.
  - `assertTripAccess(userId, tripId, 'view' | 'edit')` → single query resolving owner +
    shares; throws typed `AccessError` (mapped to **403**) when the user is neither owner
    nor an adequately-privileged sharee. `'edit'` requires owner or `EDITOR`.
- Each trip-scoped route calls `getSessionUser` + `assertTripAccess` at the top (optionally
  via a small `withAuth` wrapper).

## API Changes

**Identity source of truth moves to the session.** `data.deviceId` remains *only* for
sync/conflict tracking (`lastModifiedByDeviceId`); ownership/authorization never trusts
client-supplied ids again.

- `GET /api/trips` → trips where user is **owner OR has a share** (no global `findMany()`).
- `POST /api/trips` → set `ownerId` from session.
- Mutating sub-resource routes (daily-destinations, daily-pois, route-segments,
  route-waypoints, branches) → `assertTripAccess(userId, tripId, 'edit')`.
- Read routes for those resources → `assertTripAccess(userId, tripId, 'view')`.
- **New share routes:**
  - `GET /api/trips/[id]/shares` — list sharees + roles (owner-only).
  - `POST /api/trips/[id]/shares` — add by email + role; resolve email to an existing
    user (unknown email → **404** "no such user"); owner-only; idempotent on `@@unique`.
  - `DELETE /api/trips/[id]/shares/[shareId]` — revoke (owner-only).

## Frontend Changes

- `/login` and `/register` pages (email + password forms; validation + error display).
- Auth.js `SessionProvider`; the `/map` app reads the session; sign-out control.
- `useDeviceIdentity` retained for sync; on login it **claims the current device**
  (sets `Device.userId`) so per-device sync keeps working under the account.
- **Share dialog** on a trip: list current sharees with role, add by email + view/edit,
  remove. Shared-with-me trips appear in the trip list, visibly marked; view-only trips
  render non-editable.

## Migration & Rollout

1. Migration A: add `User`, `TripShare`, `ShareRole`, `Trip.ownerId` (**nullable**),
   `Device.userId`.
2. **Data migration script:** create one admin `User` from env (`ADMIN_EMAIL`,
   `ADMIN_PASSWORD`, hashed with argon2id), set every existing trip's `ownerId` to it,
   claim existing devices to it.
3. Migration B: make `Trip.ownerId` **NOT NULL**.
4. Apply via `npx prisma migrate dev`; restart dev server (Prisma client is cached).

## Testing

- **Unit (Vitest):** `assertTripAccess` truth table
  (owner / editor / viewer / stranger × view / edit); password hashing; register
  validation; share email-resolution (known/unknown).
- **Integration:** route-level — stranger → 403; viewer reads but cannot mutate (403);
  editor can mutate; non-owner cannot share.
- **E2E (Playwright):** register → login → create trip → share with a second account →
  second user sees it with the correct permissions → sign out → unauthenticated request
  redirects to `/login`.
- Existing tests updated to authenticate via a helper that seeds a user + session.

## Open Items (call-outs, not blockers)

- `next-auth` v5 (beta) vs. a pinned stable release — decide at implementation time.
- Admin migration credentials sourced from env vars (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Out of Scope (YAGNI)

- Pending invites for not-yet-registered emails; shareable links.
- Social/OAuth or magic-link login.
- Password reset / email verification flows (can follow later).
- Role-based admin UI beyond the single `isAdmin` migration target.
