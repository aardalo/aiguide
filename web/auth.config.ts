import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe base config. NO Node-only imports (no prisma, no argon2) so this
 * module can be bundled into middleware. The Credentials provider is added in
 * auth.ts, which runs only in the Node runtime.
 */
export const authConfig = {
  // Trust the incoming Host/X-Forwarded-Host header so post-login redirects
  // target the host the user actually used (LAN IP, hostname, tunnel domain)
  // rather than a hard-coded localhost base URL.
  trustHost: true,
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      if (user?.isAdmin !== undefined) token.isAdmin = user.isAdmin;
      return token;
    },
    session({ session, token }) {
      if (typeof token.userId === 'string') session.user.id = token.userId;
      session.user.isAdmin = token.isAdmin === true;
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
