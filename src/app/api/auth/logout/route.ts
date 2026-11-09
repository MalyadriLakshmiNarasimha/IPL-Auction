import { NextRequest, NextResponse } from 'next/server';
import { destroySession, AUTH_COOKIE_NAME, getCookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (sessionToken) {
      await destroySession(sessionToken);
    }

    const response = NextResponse.json({ success: true });

    // Clear cookie using environment-aware options
    const cookieOpts = getCookieOptions();
    response.cookies.set(AUTH_COOKIE_NAME, '', {
      ...cookieOpts,
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (err: any) {
    console.error('[API Logout Error]:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during logout.' },
      { status: 500 }
    );
  }
}

