import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = (params.code || '').toUpperCase();
    const backendUrl = getRenderBackendUrl();

    const backendRes = await fetch(`${backendUrl}/api/rooms/${code}`);
    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { exists: false, error: 'Unable to communicate with auction server' },
      { status: 502 }
    );
  }
}

