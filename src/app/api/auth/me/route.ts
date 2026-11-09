import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, AUTH_COOKIE_NAME, getCookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    const sessionData = await validateSessionToken(token);
    if (!sessionData) {
      const res = NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
      // Clear invalid or expired cookie using environment-aware options
      const cookieOpts = getCookieOptions();
      res.cookies.set(AUTH_COOKIE_NAME, '', {
        ...cookieOpts,
        maxAge: 0,
        expires: new Date(0),
      });
      return res;
    }

    return NextResponse.json({
      authenticated: true,
      user: sessionData.user,
    });
  } catch (err: any) {
    console.error('[API Me Error]:', err);
    if (err.name === 'DatabaseConnectionError' || err.statusCode === 503) {
      return NextResponse.json(
        { authenticated: false, error: 'Database service is currently unavailable.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { authenticated: false, error: err.message },
      { status: 500 }
    );
  }
}
