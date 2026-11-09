import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  hashPassword,
  createSession,
  AUTH_COOKIE_NAME,
  getCookieOptions,
  checkAuthRateLimit,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkAuthRateLimit(`register_${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, email, password } = body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 2. Uniqueness check
    const existing = await db.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    // 3. Hash Password
    const password_hash = await hashPassword(password);

    // 4. Create User
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password_hash,
      },
    });

    // 5. Create Session
    const { sessionToken, expiresAt } = await createSession(user.id);

    // 6. Response with HTTP-only cookie (token not exposed in JSON payload)
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );

    const cookieOpts = getCookieOptions();
    response.cookies.set(AUTH_COOKIE_NAME, sessionToken, cookieOpts);

    return response;
  } catch (err: any) {
    console.error('[API Register Error]:', err);
    if (err.name === 'DatabaseConnectionError' || err.statusCode === 503) {
      return NextResponse.json(
        { error: 'Database service is currently unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: err.message || 'An error occurred during registration.' },
      { status: 500 }
    );
  }
}

