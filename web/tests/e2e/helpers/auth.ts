import { Page, request, type APIRequestContext } from '@playwright/test';

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

/**
 * Log in programmatically using an APIRequestContext (no browser UI required).
 * After this call the request context carries a valid session cookie and all
 * subsequent requests made through it will be authenticated.
 */
export async function loginViaAPIContext(
  ctx: APIRequestContext,
  email: string,
  password: string,
) {
  // Step 1: fetch the CSRF token (next-auth requires it for the credentials flow).
  const csrfRes = await ctx.get('/api/auth/csrf');
  const { csrfToken } = await csrfRes.json() as { csrfToken: string };

  // Step 2: POST credentials — next-auth sets the session cookie on success.
  const loginRes = await ctx.post('/api/auth/callback/credentials', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&csrfToken=${encodeURIComponent(csrfToken)}&redirect=false&json=true`,
  });

  if (!loginRes.ok()) {
    throw new Error(`loginViaAPIContext failed: ${loginRes.status()} ${await loginRes.text()}`);
  }
}
