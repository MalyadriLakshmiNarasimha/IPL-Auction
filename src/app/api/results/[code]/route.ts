import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildFullAuctionResults } from '@/shared/auction-results-engine';

export const dynamic = 'force-dynamic';

function getRenderBackendUrl(): string {
  if (process.env.BACKEND_INTERNAL_URL) {
    return process.env.BACKEND_INTERNAL_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return process.env.NODE_ENV === 'production'
    ? 'https://ipl-auction-backend-495n.onrender.com'
    : 'http://localhost:3001';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = (params.code || '').toUpperCase();
    const backendUrl = getRenderBackendUrl();

    // Check Render backend first if remote
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const backendRes = await fetch(`${backendUrl}/api/results/${code}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (backendRes.ok) {
        const data = await backendRes.json().catch(() => ({}));
        if (data && data.team_rankings) {
          return NextResponse.json(data, { status: 200 });
        }
      }
    } catch {}

    // Check direct database records
    const [dbResult, snapshot, room, bidEvents] = await Promise.all([
      db.result.findUnique({ where: { room_code: code } }),
      db.roomSnapshot.findFirst({ where: { room_code: code }, orderBy: { created_at: 'desc' } }),
      db.room.findUnique({ where: { room_code: code }, include: { participants: true, host: true } }),
      db.bidEvent.findMany({ where: { room_code: code } }),
    ]);

    if (dbResult || snapshot?.state_data) {
      const stateData = (snapshot?.state_data as any) || {};
      const sportType: 'IPL' | 'PKL' =
        (room as any)?.sport_type === 'PKL' ||
        code.startsWith('K') ||
        stateData.sport === 'pkl' ||
        stateData.config?.season?.includes('Season')
          ? 'PKL'
          : 'IPL';

      const completedAt = dbResult?.completed_at
        ? Number(dbResult.completed_at)
        : (snapshot?.created_at.getTime() || Date.now());

      const rawLeaderboard = (dbResult?.leaderboard as any[]) || stateData.results?.leaderboard || [];
      const rawAwards = (dbResult?.awards as any[]) || stateData.results?.awards || [];
      const allCompletedBids = stateData.all_completed_bids || [];
      const rawUnsoldPool = stateData.unsold_pool || [];
      const totalPoolCount = stateData.pool?.length || (sportType === 'PKL' ? 235 : 274);

      const fullResults = buildFullAuctionResults(
        code,
        room?.name || stateData.name || `Auction ${code}`,
        sportType,
        completedAt,
        stateData.participants || (room as any)?.participants || [],
        rawLeaderboard,
        rawAwards,
        allCompletedBids,
        rawUnsoldPool,
        bidEvents,
        totalPoolCount
      );

      return NextResponse.json({
        ...fullResults,
        room_code: code,
        completed_at: completedAt,
        awards: rawAwards,
        leaderboard: rawLeaderboard,
        total_players_auctioned: fullResults.overview.total_sold,
        total_money_spent: fullResults.overview.total_spent,
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
