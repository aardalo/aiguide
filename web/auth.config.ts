import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe base config. NO Node-only imports (no prisma, no argon2) so this
 * module can be bundled into middleware. The Credentials provider is added in
 * auth.ts, which runs only in the Node runtime.
 */
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (typeof token.userId === 'string') session.user.id = token.userId;
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
