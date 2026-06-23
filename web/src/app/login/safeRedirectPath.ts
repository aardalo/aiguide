/**
 * Resolve a post-login redirect target to a same-origin path.
 *
 * Auth.js builds the URL it returns from `signIn` against the server's request
 * URL, which Next.js's dev server hard-codes to its bind address
 * (`http://localhost:3000`) regardless of the incoming Host header. Navigating
 * straight to that absolute URL sends remote browsers to *their own* localhost.
 *
 * We therefore keep only the path/query/hash and discard any origin, so the
 * browser stays on whatever host the user actually used. Dropping the origin
 * also doubles as an open-redirect guard: an absolute or protocol-relative URL
 * pointing at another site is reduced to its path on the current origin.
 */
export function safeRedirectPath(target: string | undefined | null, fallback = '/map'): string {
  if (!target) return fallback;
  try {
    // Resolve against a placeholder origin so both relative and absolute inputs
    // parse; we only ever read back path/query/hash, never the origin.
    const url = new URL(target, 'http://placeholder.invalid');
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith('/') ? path : fallback;
  } catch {
    return fallback;
  }
}
