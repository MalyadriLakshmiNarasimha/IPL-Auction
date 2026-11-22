import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Never match static files, images, or favicons
  if (
    path.startsWith('/_next') ||
    path.startsWith('/images') ||
    path === '/favicon.ico' ||
    path === '/icon.svg'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('ipl_session_token')?.value;

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
    const redirectParam = req.nextUrl.searchParams.get('redirect') || '/';
    return NextResponse.redirect(new URL(redirectParam, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icon.svg (icon file)
     * - images (public images)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|images).*)',
  ],
};

