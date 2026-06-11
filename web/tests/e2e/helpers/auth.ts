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
