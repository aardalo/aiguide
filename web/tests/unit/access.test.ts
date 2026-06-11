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
