import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // Check Render backend first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const backendRes = await fetch(`${backendUrl}/api/rooms/${code}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (backendRes.ok) {
        const data = await backendRes.json().catch(() => ({}));
        return NextResponse.json(data, { status: 200 });
      }
    } catch {}

    // Check direct database record
    const dbRoom = await db.room.findUnique({
      where: { room_code: code },
    });

    if (dbRoom) {
      return NextResponse.json({
        exists: true,
        room_code: dbRoom.room_code,
        name: dbRoom.name,
        phase: 'lobby',
        participants_count: 1,
      }, { status: 200 });
    }

    return NextResponse.json({ exists: false, error: 'Room not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json(
      { exists: false, error: 'Unable to communicate with auction database' },
      { status: 502 }
    );
  }
}
