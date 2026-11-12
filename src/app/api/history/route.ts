import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { prisma, checkMySqlConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface OngoingAuctionItem {
  room_code: string;
  name: string;
  host_name: string;
  is_host: boolean;
  participant_count: number;
  status: string;
  stage: string;
  last_activity: string;
  current_player_name: string | null;
  sold_count: number;
  unsold_count: number;
  total_pool_count: number;
  user_team_name: string | null;
  user_purse_remaining: number | null;
}

export interface CompletedAuctionItem {
  room_code: string;
  name: string;
  host_name: string;
  is_host: boolean;
  participant_count: number;
  status: string;
  completed_at: string;
  sold_count: number;
  unsold_count: number;
  total_money_spent: number;
  champion_name: string | null;
  user_team_name: string | null;
  user_squad_count: number | null;
  awards: any[];
  leaderboard: any[];
}

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
      return NextResponse.json({ error: 'Unauthorized: please log in to view history.' }, { status: 401 });
    }

    const sessionData = await validateSessionToken(token);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ error: 'Unauthorized: session expired or invalid.' }, { status: 401 });
    }

    const userId = sessionData.user.id;

    const isDbUp = await checkMySqlConnection();
    if (!isDbUp) {
      return NextResponse.json({ ongoing: [], completed: [] });
    }

    // Find all room participations for this user
    const userParticipations = await prisma.roomParticipant.findMany({
      where: {
        OR: [
          { user_id: userId },
          { session_id: userId },
        ],
      },
      select: {
        room_code: true,
        team_name: true,
        team_short_code: true,
        is_host: true,
      },
    });

    const participantRoomCodes = Array.from(new Set(userParticipations.map(p => p.room_code)));
    const participationMap = new Map(userParticipations.map(p => [p.room_code, p]));

    // Query all rooms where user is host or participant
    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { host_user_id: userId },
          { room_code: { in: participantRoomCodes } },
        ],
      },
      include: {
        host: {
          select: { id: true, name: true },
        },
        participants: true,
        snapshots: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    // Query official completed results
    const completedRoomCodes = rooms.filter(r => r.status === 'completed').map(r => r.room_code);
    const resultsList = completedRoomCodes.length > 0
      ? await prisma.result.findMany({
          where: { room_code: { in: completedRoomCodes } },
        })
      : [];
    const resultsMap = new Map(resultsList.map(r => [r.room_code, r]));

    const ongoing: OngoingAuctionItem[] = [];
    const completed: CompletedAuctionItem[] = [];

    for (const r of rooms) {
      const isHost = r.host_user_id === userId;
      const latestSnapshot = r.snapshots[0];
      const stateData = latestSnapshot?.state_data as any;
      const auctionState = stateData?.auction_state;
      const userPart = participationMap.get(r.room_code);

      // Extract user participant details from snapshot if available
      let userPurse: number | null = null;
      let userSquadCount: number | null = null;
      let userTeamName = userPart?.team_name || null;

      if (stateData?.participants && Array.isArray(stateData.participants)) {
        const pMatch = stateData.participants.find((p: any) => p.id === userId || p.user_id === userId);
        if (pMatch) {
          userPurse = pMatch.purse_remaining ?? null;
          userSquadCount = Array.isArray(pMatch.squad) ? pMatch.squad.length : null;
          if (pMatch.team_name) userTeamName = pMatch.team_name;
        }
      }

      if (r.status === 'completed') {
        const res = resultsMap.get(r.room_code);
        const awards = (res?.awards as any[]) || [];
        const leaderboard = (res?.leaderboard as any[]) || [];
        const champion = awards[0]?.winner_name || (leaderboard[0] as any)?.team_name || null;

        completed.push({
          room_code: r.room_code,
          name: r.name,
          host_name: r.host?.name || 'Host',
          is_host: isHost,
          participant_count: r.participants.length,
          status: 'completed',
          completed_at: r.updated_at.toISOString(),
          sold_count: auctionState?.sold_count ?? (res?.total_players_auctioned || 0),
          unsold_count: auctionState?.unsold_count ?? 0,
          total_money_spent: res?.total_money_spent ? Number(res.total_money_spent) : 0,
          champion_name: champion,
          user_team_name: userTeamName,
          user_squad_count: userSquadCount,
          awards,
          leaderboard,
        });
      } else if (r.status === 'live' || (latestSnapshot && latestSnapshot.stage !== 'lobby' && latestSnapshot.phase !== 'completed')) {
        // Auction has started and is not officially completed
        ongoing.push({
          room_code: r.room_code,
          name: r.name,
          host_name: r.host?.name || 'Host',
          is_host: isHost,
          participant_count: r.participants.length,
          status: 'live',
          stage: latestSnapshot?.stage || 'main_auction',
          last_activity: r.updated_at.toISOString(),
          current_player_name: auctionState?.current_player?.name || null,
          sold_count: auctionState?.sold_count ?? 0,
          unsold_count: auctionState?.unsold_count ?? 0,
          total_pool_count: auctionState?.total_pool_count ?? (stateData?.pool?.length || 0),
          user_team_name: userTeamName,
          user_purse_remaining: userPurse,
        });
      }
    }

    return NextResponse.json({
      ongoing,
      completed,
    });
  } catch (err: any) {
    console.error('[API History Error]:', err);
    return NextResponse.json(
      { error: 'Failed to fetch auction history', details: err.message },
      { status: 500 }
    );
  }
}
