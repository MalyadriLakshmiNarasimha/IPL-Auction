import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyPassword,
  createSession,
  AUTH_COOKIE_NAME,
  getCookieOptions,
  checkAuthRateLimit,
  resetAuthRateLimit,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkAuthRateLimit(`login_${ip}`, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please wait 1 minute.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Find User
    const user = await db.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // 2. Verify Password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // 3. Reset rate limit counter on success
    resetAuthRateLimit(`login_${ip}`);

    // 4. Create Session (prevents session fixation)
    const { sessionToken, expiresAt } = await createSession(user.id);

    // 5. Response with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      sessionToken,
    });

    const cookieOpts = getCookieOptions();
    response.cookies.set(AUTH_COOKIE_NAME, sessionToken, cookieOpts);

    return response;
  } catch (err: any) {
    console.error('[API Login Error]:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during login.' },
      { status: 500 }
    );
  }
}
