import { test, expect } from '@playwright/test';
import { registerUser, loginViaUI } from './helpers/auth';

const PW = 'e2e-password-123';

test('register, login, create trip, share, second user access, signed-out is blocked', async ({ page, baseURL, browser }) => {
  const owner = `owner-${Date.now()}@e2e.test`;
  const friend = `friend-${Date.now()}@e2e.test`;
  await registerUser(baseURL!, owner, PW);
  await registerUser(baseURL!, friend, PW);

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

  // Second user in an isolated context sees the trip and cannot mutate it.
  const ctx = await browser.newContext();
  const friendPage = await ctx.newPage();
  await loginViaUI(friendPage, friend, PW);
  const list = await friendPage.request.get('/api/trips');
  expect(list.status()).toBe(200);
  const trips = await list.json();
  expect(trips.some((t: { id: string }) => t.id === trip.id)).toBe(true);

  const mutate = await friendPage.request.patch(`/api/trips/${trip.id}`, { data: { title: 'Hijacked' } });
  expect(mutate.status()).toBe(403);
  await ctx.close();

  // Signed out: guarded API is 401; /map redirects to /login.
  await page.context().clearCookies();
  const anonReq = await page.request.get('/api/trips');
  expect(anonReq.status()).toBe(401);
  await page.goto('/map');
  await page.waitForURL('**/login**');
});
