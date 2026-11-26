import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, validateSessionToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface MyRoomItem {
  room_code: string;
  name: string;
  sport_type: 'IPL' | 'PKL';
  host_name: string;
  is_host: boolean;
  user_team_name: string | null;
  user_team_short_code: string | null;
  user_team_color: string | null;
  participant_count: number;
  participating_teams: string[];
  status_group: 'active' | 'waiting' | 'completed' | 'terminated';
  status: string;
  stage: string;
  phase: string;
  termination_reason?: string | null;
  terminated_at?: string | null;
  user_participation_status?: string | null;
  sold_count: number;
  unsold_count: number;
  total_pool_count: number;
  user_purse_remaining: number | null;
  user_squad_count: number | null;
  created_at: string;
  last_activity: string;
}

export async function GET(req: NextRequest) {
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
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionData = await validateSessionToken(token);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const userId = sessionData.user.id;

    // 2. Find participant records for this user
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
        team_color: true,
        is_host: true,
        participation_status: true,
      },
    });

    const participantRoomCodes = Array.from(new Set(userParticipations.map(p => p.room_code)));
    const participationMap = new Map(userParticipations.map(p => [p.room_code, p]));

    // 3. Query all rooms where user is host or participant
    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { host_user_id: userId },
          { room_code: { in: participantRoomCodes } },
        ],
      },
      include: {
        host: {
          select: { id: true, name: true, email: true },
        },
        participants: true,
        snapshots: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    const myRooms: MyRoomItem[] = [];

    for (const r of rooms) {
      // Discard invalid / cancelled / archived / abandoned / test bot rooms
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

      // Compute deduplicated non-spectator participant count
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

      // Extract user participant details
      let userTeamName = userPart?.team_name || null;
      let userTeamShortCode = userPart?.team_short_code || null;
      let userTeamColor = userPart?.team_color || null;
      let userPurse: number | null = null;
      let userSquadCount: number | null = null;

      if (stateData?.participants && Array.isArray(stateData.participants)) {
        const pMatch = stateData.participants.find(
          (p: any) => p.id === userId || p.user_id === userId || (isHost && p.is_host)
        );
        if (pMatch) {
          userPurse = pMatch.purse_remaining ?? (pMatch.purse ?? null);
          userSquadCount = Array.isArray(pMatch.squad) ? pMatch.squad.length : null;
          if (pMatch.team_name) userTeamName = pMatch.team_name;
          if (pMatch.franchise?.short_code) userTeamShortCode = pMatch.franchise.short_code;
          if (pMatch.franchise?.color) userTeamColor = pMatch.franchise.color;
        }
      }

      // Group status into 'active' | 'waiting' | 'completed' | 'terminated'
      let statusGroup: 'active' | 'waiting' | 'completed' | 'terminated' = 'waiting';
      const rawStatus = (r.status || 'lobby').toLowerCase();
      const currentStage = latestSnapshot?.stage || (rawStatus === 'lobby' ? 'lobby' : 'main_auction');
      const currentPhase = latestSnapshot?.phase || auctionState?.phase || rawStatus;

      if (rawStatus === 'terminated' || currentPhase === 'terminated') {
        statusGroup = 'terminated';
      } else if (rawStatus === 'completed') {
        statusGroup = 'completed';
      } else if (rawStatus === 'lobby' || currentStage === 'lobby' || currentPhase === 'lobby') {
        statusGroup = 'waiting';
      } else {
        statusGroup = 'active';
      }

      const userSnapPart = Array.isArray(stateData?.participants)
        ? stateData.participants.find((p: any) => p.id === userId || p.user_id === userId || (isHost && p.is_host))
        : null;
      const userParticipationStatus =
        (userPart as any)?.participation_status ||
        userSnapPart?.participation_status ||
        (statusGroup === 'terminated' ? 'DISQUALIFIED' : 'ACTIVE');

      myRooms.push({
        room_code: r.room_code,
        name: r.name || (sportType === 'PKL' ? 'PKL Auction Room' : 'IPL Auction Room'),
        sport_type: sportType,
        host_name: r.host?.name || 'Host',
        is_host: isHost,
        user_team_name: userTeamName,
        user_team_short_code: userTeamShortCode,
        user_team_color: userTeamColor,
        participant_count: participantCount,
        participating_teams,
        status_group: statusGroup,
        status: rawStatus === 'terminated' || currentPhase === 'terminated' ? 'terminated' : rawStatus,
        stage: currentStage,
        phase: currentPhase,
        termination_reason: (r as any).termination_reason || auctionState?.termination_reason || null,
        terminated_at: (r as any).terminated_at
          ? new Date((r as any).terminated_at).toISOString()
          : (auctionState?.terminated_at ? new Date(auctionState.terminated_at).toISOString() : null),
        user_participation_status: userParticipationStatus,
        sold_count: auctionState?.sold_count ?? 0,
        unsold_count: auctionState?.unsold_count ?? 0,
        total_pool_count: auctionState?.total_pool_count ?? (stateData?.pool?.length || 0),
        user_purse_remaining: userPurse,
        user_squad_count: userSquadCount,
        created_at: r.created_at.toISOString(),
        last_activity: r.updated_at.toISOString(),
      });
    }

    return NextResponse.json({
      rooms: myRooms,
      total_count: myRooms.length,
      counts: {
        all: myRooms.length,
        active: myRooms.filter(r => r.status_group === 'active').length,
        waiting: myRooms.filter(r => r.status_group === 'waiting').length,
        completed: myRooms.filter(r => r.status_group === 'completed').length,
        terminated: myRooms.filter(r => r.status_group === 'terminated').length,
      },
    });
  } catch (err: any) {
    console.error('[API /api/my-rooms Error]:', err);
    return NextResponse.json(
      { error: 'Failed to fetch rooms', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get(AUTH_COOKIE_NAME)?.value || '';
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sessionData = await validateSessionToken(token);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const body = await req.json().catch(() => ({}));
    const roomCode = typeof body.room_code === 'string' ? body.room_code.trim().toUpperCase() : '';
    const action = body.action === 'archive' ? 'archive' : 'leave';

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { room_code: roomCode } });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (action === 'archive') {
      if (room.host_user_id !== userId) {
        return NextResponse.json({ error: 'Only the host can archive this room' }, { status: 403 });
      }
      if (room.status === 'completed' || room.status === 'terminated') {
        return NextResponse.json({ error: 'Completed or terminated auctions cannot be archived from My Rooms' }, { status: 400 });
      }
      await prisma.room.update({
        where: { room_code: roomCode },
        data: { status: 'archived' },
      });
      return NextResponse.json({ success: true, room_code: roomCode, status: 'archived' });
    }

    // Leave room: remove user's participant membership if they are not the host
    if (room.host_user_id === userId) {
      return NextResponse.json(
        { error: 'As host, archive the room instead of leaving' },
        { status: 400 }
      );
    }

    await prisma.roomParticipant.deleteMany({
      where: {
        room_code: roomCode,
        OR: [{ user_id: userId }, { session_id: userId }],
      },
    });

    return NextResponse.json({ success: true, room_code: roomCode, left: true });
  } catch (err: any) {
    console.error('[API /api/my-rooms POST Error]:', err);
    return NextResponse.json(
      { error: 'Failed to update room membership', details: err.message },
      { status: 500 }
    );
  }
}
