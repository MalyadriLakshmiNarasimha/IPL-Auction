import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, validateSessionToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEFAULT_ROOM_SETTINGS } from '@/shared/constants';

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

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
    const rawRoomName = body.room_name;
    const roomName = typeof rawRoomName === 'string' && rawRoomName.trim().length > 0
      ? rawRoomName.trim().slice(0, 50)
      : 'IPL Auction Room';

    // 2. Try creating room on authoritative Render backend first if accessible
    const backendUrl = getRenderBackendUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const backendRes = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_name: roomName,
          host_session_id: sessionData.user.id,
          host_display_name: sessionData.user.name,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (backendRes.ok) {
        const data = await backendRes.json().catch(() => ({}));
        return NextResponse.json(data, { status: 201 });
      }
    } catch {
      // Backend is temporarily offline, sleeping, or unroutable; fall through to direct MySQL persistence
    }

    // 3. Resilient Direct Database Persistence: Generate unique 6-character room code
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.room.findUnique({ where: { room_code: code } });
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    // Persist room record in MySQL via Prisma
    await db.room.create({
      data: {
        room_code: code,
        name: roomName,
        host_user_id: sessionData.user.id,
        status: 'lobby',
      },
    });

    // Create initial room snapshot in database so Socket.IO server can hydrate it on join
    try {
      await db.roomSnapshot.create({
        data: {
          room_code: code,
          schema_version: 1,
          stage: 'lobby',
          phase: 'lobby',
          state_data: {
            room_code: code,
            name: roomName,
            host_session_id: sessionData.user.id,
            host_disconnect_time: null,
            settings: DEFAULT_ROOM_SETTINGS,
            participants: [{
              id: sessionData.user.id,
              room_code: code,
              display_name: sessionData.user.name,
              is_host: true,
              is_connected: false,
              purse_remaining: DEFAULT_ROOM_SETTINGS.purse,
              total_spent: 0,
              squad: [],
              role_counts: { Batsman: 0, Bowler: 0, 'All-Rounder': 0, 'Wicket-Keeper': 0 },
              overseas_count: 0,
              runtm_joined: Date.now(),
              last_active: Date.now(),
            }],
            auction_state: {
              phase: 'lobby',
              current_player: null,
              current_bid: 0,
              current_bidder_id: null,
              timer_remaining: DEFAULT_ROOM_SETTINGS.timer_seconds,
              is_paused: false,
              bid_history: [],
              announcement_text: null,
            },
            pool: [],
            unsold_pool: [],
            all_completed_bids: [],
            results: null,
            stage: 'lobby',
            pending_trades: [],
            completed_trades: [],
            playing_xi_submissions: [],
            commentary_events: [],
            schema_version: 1,
            saved_at: Date.now(),
          },
        },
      });
    } catch (snapshotErr) {
      console.warn('[API /api/rooms] Snapshot creation warning:', snapshotErr);
    }

    return NextResponse.json({ room_code: code, room_name: roomName }, { status: 201 });
  } catch (err: any) {
    console.error('[API /api/rooms Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create auction room in database.' },
      { status: 500 }
    );
  }
}
