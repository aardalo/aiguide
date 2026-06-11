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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40">
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
