import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('ipl_session_token')?.value;
  const path = req.nextUrl.pathname;

  const isProtectedPath =
    path.startsWith('/create') ||
    path.startsWith('/join') ||
    path.startsWith('/room');

  const isAuthPath = path === '/login' || path === '/register';

  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/create', '/join/:path*', '/room/:path*', '/login', '/register'],
};
