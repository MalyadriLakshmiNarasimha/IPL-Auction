import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { prisma, checkMySqlConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface OngoingAuctionItem {
  room_code: string;
  name: string;
  sport_type: 'IPL' | 'PKL';
  host_name: string;
  is_host: boolean;
  participant_count: number;
  participating_teams: string[];
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
  sport_type: 'IPL' | 'PKL';
  host_name: string;
  is_host: boolean;
  participant_count: number;
  participating_teams: string[];
  status: string;
  completed_at: string;
  sold_count: number;
  unsold_count: number;
  total_money_spent: number;
  champion_name: string | null;
  user_team_name: string | null;
  user_manager_name?: string | null;
  user_squad_count: number | null;
  user_squad_rating?: number | null;
  user_purse_spent?: number | null;
  user_purse_remaining?: number | null;
  user_rank: number | null;
  awards: any[];
  leaderboard: any[];
}

export interface TerminatedAuctionItem {
  room_code: string;
  name: string;
  sport_type: 'IPL' | 'PKL';
  host_name: string;
  is_host: boolean;
  participant_count: number;
  participating_teams: string[];
  status: 'terminated';
  termination_reason: string;
  terminated_at: string;
  sold_count: number;
  unsold_count: number;
  total_pool_count: number;
  user_team_name: string | null;
  user_purse_remaining: number | null;
  user_participation_status: string;
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
      return NextResponse.json({ ongoing: [], completed: [], terminated: [] });
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
        participation_status: true,
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
    const terminated: TerminatedAuctionItem[] = [];

    for (const r of rooms) {
      // Discard invalid / cancelled / archived / abandoned / test rooms
      if (
        r.status === 'cancelled' ||
        r.status === 'archived' ||
        r.status === 'abandoned' ||
        r.host_user_id === 'system-bot-host-id' ||
        (r.host_user_id.startsWith('bot-') && r.host_user_id !== userId)
      ) {
        continue;
      }

      const isHost = r.host_user_id === userId;
      const latestSnapshot = r.snapshots[0];
      const stateData = latestSnapshot?.state_data as any;
      const auctionState = stateData?.auction_state;
      const userPart = participationMap.get(r.room_code);

      const uniqueParticipantIds = new Set<string>();
      if (Array.isArray(r.participants)) {
        for (const p of r.participants) {
          if (!p.is_spectator) {
            uniqueParticipantIds.add(p.user_id || p.session_id || p.id);
          }
        }
      }
      if (stateData?.participants && Array.isArray(stateData.participants)) {
        for (const p of stateData.participants) {
          if (!p.is_spectator && p.role !== 'spectator') {
            uniqueParticipantIds.add(p.user_id || p.id || p.session_id);
          }
        }
      }
      const participantCount = Math.max(1, uniqueParticipantIds.size);

      // Determine sport type cleanly
      const sportType: 'IPL' | 'PKL' =
        r.sport_type === 'PKL' ||
        r.room_code.startsWith('K') ||
        stateData?.sport === 'pkl' ||
        stateData?.config?.season?.includes('Season')
          ? 'PKL'
          : 'IPL';

      // Extract unique participating teams
      const teamSet = new Set<string>();
      if (Array.isArray(r.participants)) {
        for (const p of r.participants) {
          if (p.team_name) teamSet.add(p.team_name);
          else if (p.franchise_name) teamSet.add(p.franchise_name);
        }
      }
      if (stateData?.participants && Array.isArray(stateData.participants)) {
        for (const p of stateData.participants) {
          if (p.team_name) teamSet.add(p.team_name);
          else if (p.franchise?.name) teamSet.add(p.franchise.name);
          else if (p.franchise_name) teamSet.add(p.franchise_name);
        }
      }
      const participating_teams = Array.from(teamSet);

      // Extract user participant details from snapshot if available
      let userPurse: number | null = null;
      let userSquadCount: number | null = null;
      let userTeamName = userPart?.team_name || null;

      if (stateData?.participants && Array.isArray(stateData.participants)) {
        const pMatch = stateData.participants.find((p: any) => p.id === userId || p.user_id === userId);
        if (pMatch) {
          userPurse = pMatch.purse_remaining ?? (pMatch.purse ?? null);
          userSquadCount = Array.isArray(pMatch.squad) ? pMatch.squad.length : null;
          if (pMatch.team_name) userTeamName = pMatch.team_name;
        }
      }

      if (r.status === 'terminated' || auctionState?.phase === 'terminated') {
        const terminatedAtMs = (r as any).terminated_at
          ? new Date((r as any).terminated_at).getTime()
          : (auctionState?.terminated_at || r.updated_at.getTime());
        terminated.push({
          room_code: r.room_code,
          name: r.name,
          sport_type: sportType,
          host_name: r.host?.name || 'Host',
          is_host: isHost,
          participant_count: participantCount,
          participating_teams,
          status: 'terminated',
          termination_reason: (r as any).termination_reason || auctionState?.termination_reason || 'ALL_MANAGERS_EXITED',
          terminated_at: new Date(terminatedAtMs).toISOString(),
          sold_count: auctionState?.sold_count ?? 0,
          unsold_count: auctionState?.unsold_count ?? 0,
          total_pool_count: auctionState?.total_pool_count ?? (stateData?.pool?.length || 0),
          user_team_name: userTeamName,
          user_purse_remaining: userPurse,
          user_participation_status: (userPart as any)?.participation_status || 'DISQUALIFIED',
        });
      } else if (r.status === 'completed') {
        const res = resultsMap.get(r.room_code);
        // Only include genuinely completed rooms that have recorded results
        if (!res && !stateData?.results) {
          continue;
        }

        const awards = (res?.awards as any[]) || (stateData?.results?.awards as any[]) || [];
        const leaderboard = (res?.leaderboard as any[]) || (stateData?.results?.leaderboard as any[]) || [];
        const champion = awards[0]?.winner_name || (leaderboard[0] as any)?.team_name || (leaderboard[0] as any)?.franchise?.name || null;

        // Calculate user's final rank and squad stats
        let userRank: number | null = null;
        let userSquadRating: number | null = null;
        let userPurseSpent: number | null = null;
        let userManagerName = sessionData.user.name;

        if (Array.isArray(leaderboard) && leaderboard.length > 0) {
          const idx = leaderboard.findIndex((item: any) =>
            item.participant_id === userId ||
            item.id === userId ||
            (userTeamName && (
              item.team_name === userTeamName ||
              item.franchise?.name === userTeamName ||
              item.franchise?.short_code === userTeamName
            ))
          );
          if (idx !== -1) {
            const userEntry = leaderboard[idx];
            userRank = userEntry.rank || (idx + 1);
            userSquadRating = userEntry.total_score ? Math.round(Number(userEntry.total_score) * 10) / 10 : 88.5;
            userPurseSpent = userEntry.total_spent ?? null;
            if (userEntry.purse_remaining !== undefined) {
              userPurse = Number(userEntry.purse_remaining);
            }
            if (userEntry.players_count) {
              userSquadCount = userEntry.players_count;
            }
            if (userEntry.display_name) {
              userManagerName = userEntry.display_name;
            }
          }
        }

        completed.push({
          room_code: r.room_code,
          name: r.name,
          sport_type: sportType,
          host_name: r.host?.name || 'Host',
          is_host: isHost,
          participant_count: participantCount,
          participating_teams,
          status: 'completed',
          completed_at: r.updated_at.toISOString(),
          sold_count: auctionState?.sold_count ?? (res?.total_players_auctioned || 0),
          unsold_count: auctionState?.unsold_count ?? 0,
          total_money_spent: res?.total_money_spent ? Number(res.total_money_spent) : 0,
          champion_name: champion,
          user_team_name: userTeamName,
          user_manager_name: userManagerName,
          user_squad_count: userSquadCount,
          user_squad_rating: userSquadRating,
          user_purse_spent: userPurseSpent,
          user_purse_remaining: userPurse,
          user_rank: userRank,
          awards,
          leaderboard,
        });
      } else {
        // Must be genuinely live (not lobby/waiting) and resumable:
        const currentStage = latestSnapshot?.stage || auctionState?.stage || 'lobby';
        const currentPhase = latestSnapshot?.phase || auctionState?.phase || r.status || 'lobby';
        if (r.status !== 'live' || currentStage === 'lobby' || currentPhase === 'lobby') {
          continue;
        }

        // Must have valid snapshot or active participants
        const hasValidSnapshot = Boolean(latestSnapshot && latestSnapshot.state_data);
        const hasParticipants = (r.participants.length > 0) || (stateData?.participants?.length > 0);
        const hasValidConfig = Boolean(
          stateData?.settings?.purse ||
          stateData?.settings?.squad_size ||
          stateData?.config?.total_purse ||
          stateData?.config?.min_squad_size
        );

        // Discard uninitialized or corrupted rooms
        if (!hasValidSnapshot || !hasParticipants || !hasValidConfig) {
          continue;
        }

        // For History Ongoing: The user must have verified participation or be the genuine active host
        const hasUserPresence = Boolean(userPart || (stateData?.participants && stateData.participants.some((p: any) => p.id === userId || p.user_id === userId)));
        if (!hasUserPresence && !isHost) {
          continue;
        }

        ongoing.push({
          room_code: r.room_code,
          name: r.name,
          sport_type: sportType,
          host_name: r.host?.name || 'Host',
          is_host: isHost,
          participant_count: participantCount,
          participating_teams,
          status: 'live',
          stage: currentStage,
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
      terminated,
    });
  } catch (err: any) {
    console.error('[API History Error]:', err);
    return NextResponse.json(
      { error: 'Failed to fetch auction history', details: err.message },
      { status: 500 }
    );
  }
}
