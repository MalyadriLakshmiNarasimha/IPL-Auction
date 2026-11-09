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
    ? 'https://ipl-auction-jqsd.onrender.com'
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
      const backendRes = await fetch(`${backendUrl}/api/results/${code}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (backendRes.ok) {
        const data = await backendRes.json().catch(() => ({}));
        return NextResponse.json(data, { status: 200 });
      }
    } catch {}

    // Check direct database record
    const dbResult = await db.result.findUnique({
      where: { room_code: code },
    });

    if (dbResult) {
      return NextResponse.json({
        room_code: dbResult.room_code,
        completed_at: Number(dbResult.completed_at),
        awards: dbResult.awards,
        leaderboard: dbResult.leaderboard,
        total_players_auctioned: dbResult.total_players_auctioned,
        total_money_spent: Number(dbResult.total_money_spent),
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'Results not found for room ' + code }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Unable to communicate with auction database' },
      { status: 502 }
    );
  }
}
