/**
 * One-off data migration: ensure an admin User exists (from ADMIN_EMAIL /
 * ADMIN_PASSWORD), assign every ownerless trip to it, and claim ownerless
 * devices. Idempotent: safe to run more than once.
 *
 * Run: npx tsx --env-file=.env scripts/assign-admin-owner.ts
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
