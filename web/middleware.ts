import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

// Public API prefixes that must remain reachable without a session.
const PUBLIC_API_PREFIXES = ['/api/auth', '/api/map-config', '/api/geocode'];

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const isApi = pathname.startsWith('/api');

  if (isApi) {
    const isPublic = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
    if (isPublic || isLoggedIn) return NextResponse.next();
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Page routes matched below (/map). Redirect unauthenticated to /login.
  if (!isLoggedIn) {
    const url = new URL('/login', origin);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/map/:path*', '/api/:path*'],
};
