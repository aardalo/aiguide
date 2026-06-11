import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      device: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

// Re-export the Prisma error class used by the [id] route for not-found handling
vi.mock('@prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    clientVersion: string;
    constructor(message: string, opts: { code: string; clientVersion?: string }) {
      super(message);
      this.code = opts.code;
      this.clientVersion = opts.clientVersion ?? 'test';
    }
  }
  return { Prisma: { PrismaClientKnownRequestError } };
});

import { POST } from '../../app/api/devices/register/route';
import { GET } from '../../app/api/devices/route';
import { PATCH, DELETE } from '../../app/api/devices/[id]/route';
import { Prisma } from '@prisma/client';

const baseDevice = {
  id: 'cldevice00000000000000001',
  sessionId: 'session-abc',
  name: 'Chrome on Linux',
  lastSeenAt: new Date('2026-06-10T12:00:00.000Z'),
  createdAt: new Date('2026-06-10T10:00:00.000Z'),
};

describe('POST /api/devices/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new device when none exists for the session', async () => {
    mockPrisma.device.findUnique.mockResolvedValue(null);
    mockPrisma.device.create.mockResolvedValue(baseDevice);

    const request = new Request('http://localhost:3000/api/devices/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'session-abc', name: 'Chrome on Linux' }),
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe(baseDevice.id);
    expect(json.name).toBe('Chrome on Linux');
    expect(json.lastSeenAt).toBe('2026-06-10T12:00:00.000Z');
    expect(mockPrisma.device.create).toHaveBeenCalledTimes(1);
  });

  it('updates lastSeenAt for an existing session', async () => {
    mockPrisma.device.findUnique.mockResolvedValue(baseDevice);
    mockPrisma.device.update.mockResolvedValue({
      ...baseDevice,
      lastSeenAt: new Date('2026-06-10T13:00:00.000Z'),
    });

    const request = new Request('http://localhost:3000/api/devices/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'session-abc', name: 'Chrome on Linux' }),
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.device.create).not.toHaveBeenCalled();
    expect(mockPrisma.device.update).toHaveBeenCalledTimes(1);
    expect(json.lastSeenAt).toBe('2026-06-10T13:00:00.000Z');
  });

  it('returns 400 when payload is invalid', async () => {
    const request = new Request('http://localhost:3000/api/devices/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: '' }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
    expect(mockPrisma.device.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/devices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all devices ordered by lastSeenAt desc', async () => {
    mockPrisma.device.findMany.mockResolvedValue([baseDevice]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.devices).toHaveLength(1);
    expect(json.devices[0].id).toBe(baseDevice.id);
    expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
      orderBy: { lastSeenAt: 'desc' },
    });
  });
});

describe('PATCH /api/devices/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renames a device', async () => {
    mockPrisma.device.update.mockResolvedValue({ ...baseDevice, name: 'My Laptop' });

    const request = new Request(`http://localhost:3000/api/devices/${baseDevice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Laptop' }),
    });

    const response = await PATCH(request as any, {
      params: Promise.resolve({ id: baseDevice.id }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.name).toBe('My Laptop');
    expect(mockPrisma.device.update).toHaveBeenCalledWith({
      where: { id: baseDevice.id },
      data: { name: 'My Laptop' },
    });
  });

  it('returns 400 when name is empty', async () => {
    const request = new Request(`http://localhost:3000/api/devices/${baseDevice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    const response = await PATCH(request as any, {
      params: Promise.resolve({ id: baseDevice.id }),
    });

    expect(response.status).toBe(400);
    expect(mockPrisma.device.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the device does not exist', async () => {
    mockPrisma.device.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: 'test',
      })
    );

    const request = new Request('http://localhost:3000/api/devices/missing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Anything' }),
    });

    const response = await PATCH(request as any, {
      params: Promise.resolve({ id: 'missing' }),
    });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/devices/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a device', async () => {
    mockPrisma.device.delete.mockResolvedValue(baseDevice);

    const request = new Request(`http://localhost:3000/api/devices/${baseDevice.id}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request as any, {
      params: Promise.resolve({ id: baseDevice.id }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPrisma.device.delete).toHaveBeenCalledWith({
      where: { id: baseDevice.id },
    });
  });

  it('returns 404 when deleting a missing device', async () => {
    mockPrisma.device.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: 'test',
      })
    );

    const request = new Request('http://localhost:3000/api/devices/missing', {
      method: 'DELETE',
    });

    const response = await DELETE(request as any, {
      params: Promise.resolve({ id: 'missing' }),
    });

    expect(response.status).toBe(404);
  });
});
