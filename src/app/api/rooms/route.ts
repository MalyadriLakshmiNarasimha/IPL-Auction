import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, validateSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getRenderBackendUrl(): string {
  if (process.env.BACKEND_INTERNAL_URL) {
    return process.env.BACKEND_INTERNAL_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return process.env.NODE_ENV === 'production'
    ? 'https://ipl-auction-jgsd.onrender.com'
    : 'http://localhost:3001';
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from cookie or Authorization header
    let token = req.cookies.get(AUTH_COOKIE_NAME)?.value || '';
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required to create a room.' },
        { status: 401 }
      );
    }

    const sessionData = await validateSessionToken(token);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json(
        { error: 'Authentication required: Invalid or expired session' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const backendUrl = getRenderBackendUrl();

    // 2. Forward creation request to the authoritative Render backend
    const backendRes = await fetch(`${backendUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...body,
        host_session_id: sessionData.user.id,
        host_display_name: sessionData.user.name,
      }),
    });

    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    console.error('[API Proxy /api/rooms Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Unable to communicate with authoritative auction server.' },
      { status: 502 }
    );
  }
}

