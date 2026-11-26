import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RoomManager } from '../room';
import { db, prisma } from '../../src/lib/db';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { validateBid } from '../../src/shared/validation';

describe('Auction Freezing Fix and Two-Step Exit Auction System', () => {
  let io: Server;
  let roomManager: RoomManager;
  const httpServer = createServer();
  const testHostId = `host_exit_${Date.now()}`;
  const testGuestId = `guest_exit_${Date.now()}`;
  const roomCode = `EXT${Math.floor(100 + Math.random() * 899)}`;

  beforeAll(async () => {
    io = new Server(httpServer, { cors: { origin: '*' } });
    roomManager = new RoomManager(io);

    // Create room in database so foreign key constraints pass
    await db.room.create({
      data: {
        room_code: roomCode,
        name: 'Exit & Freeze Test Arena',
        host_user_id: 'system-bot-host-id',
        status: 'live',
        sport_type: 'IPL',
      },
    }).catch(() => { });

    // Create room in memory with 2 managers
    const room = roomManager.createRoom(roomCode, 'Exit & Freeze Test Arena', testHostId, 'Host Manager');
    roomManager.joinRoom(roomCode, testGuestId, 'Guest Manager', 'socket-guest-1');

    // Assign franchises
    roomManager.pickFranchise(roomCode, testHostId, {
      id: 'csk',
      name: 'Chennai Super Kings',
      short_code: 'CSK',
      color: '#F9CD05',
    });

    roomManager.pickFranchise(roomCode, testGuestId, {
      id: 'mi',
      name: 'Mumbai Indians',
      short_code: 'MI',
      color: '#004BA0',
    });
  });

  afterAll(async () => {
    if (roomCode) {
      roomManager.removeRoom(roomCode);
      await prisma.room.deleteMany({ where: { room_code: roomCode } }).catch(() => { });
    }
    io.close();
  });

  it('1. Start auction and verify player introduction announcement phase', () => {
    const started = roomManager.startAuction(roomCode, testHostId);
    expect(started).toBe(true);

    const room = roomManager.getRoom(roomCode)!;
    expect(room).toBeDefined();

    // Advance directly to first player announcing
    roomManager.nextPlayer(room);
    expect(room.auction_state.phase).toBe('announcing');
    expect(room.auction_state.current_player).toBeDefined();
  });

  it('2. Transition to bidding phase and verify countdown', () => {
    const room = roomManager.getRoom(roomCode)!;
    roomManager.startBiddingPhase(room);

    expect(room.auction_state.phase).toBe('bidding');
    expect(room.auction_state.timer_ends_at).toBeGreaterThan(Date.now());
  });

  it('3. Reproduce and verify UNSOLD transition: player marks unsold and advances to next player reliably', async () => {
    const room = roomManager.getRoom(roomCode)!;
    const initialPlayerId = room.auction_state.current_player?.id;

    // Both managers pass on current player
    roomManager.passPlayer(roomCode, testHostId);
    roomManager.passPlayer(roomCode, testGuestId);

    // Phase becomes unsold
    expect(room.auction_state.phase).toBe('unsold');
    expect(room.unsold_pool.some(p => p.id === initialPlayerId)).toBe(true);

    // Watchdog and requestNextPlayer guarantee transition out of unsold
    const advanced = roomManager.requestNextPlayer(roomCode, testHostId);
    expect(advanced).toBe(true);

    // Phase transitions to announcing next player without getting stuck
    expect(room.auction_state.phase).toBe('announcing');
    expect(room.auction_state.current_player?.id).not.toBe(initialPlayerId);
  });

  it('4. Verifies resumeAuction on unsold or sold state advances to next player rather than counting down old player', () => {
    const room = roomManager.getRoom(roomCode)!;
    // Simulate room in unsold phase that was paused
    room.auction_state.phase = 'unsold';
    room.auction_state.is_paused = true;

    const resumed = roomManager.resumeAuction(roomCode, testHostId);
    expect(resumed).toBe(true);
    expect(room.auction_state.is_paused).toBe(false);
    // next_player_handle is reliably scheduled
    expect(room.next_player_handle).toBeDefined();
  });

  it('5. Participant leaves room via leaveRoom: verifies participant squads, bids, and room stay intact', () => {
    const room = roomManager.getRoom(roomCode)!;
    const guestParticipant = room.participants.get(testGuestId);
    expect(guestParticipant).toBeDefined();
    expect(guestParticipant?.is_connected).toBe(true);

    // Guest executes exit operation
    const left = roomManager.leaveRoom(roomCode, testGuestId);
    expect(left).toBe(true);

    // Room is NOT ended, NOT deleted, NOT cancelled
    expect(roomManager.getRoom(roomCode)).toBeDefined();
    expect(room.auction_state.phase).not.toBe('completed');
    expect(room.stage).not.toBe('championship_recap');

    // Guest participant state is preserved
    const updatedGuest = room.participants.get(testGuestId);
    expect(updatedGuest?.is_connected).toBe(false);
    expect(updatedGuest?.franchise?.short_code).toBe('MI');
    expect(updatedGuest?.purse_remaining).toBe(room.settings.purse);
  });

  it('6. Other participants continue bidding without interruption after participant exit', () => {
    const room = roomManager.getRoom(roomCode)!;
    roomManager.nextPlayer(room);
    roomManager.startBiddingPhase(room);

    // Host can still bid with valid base price
    const playerBase = room.auction_state.current_player!.base_price;
    const bidResult = roomManager.placeBid(roomCode, testHostId, playerBase, true);
    expect(bidResult).toBe(true);
    expect(room.auction_state.current_bid).toBe(playerBase);
    expect(room.auction_state.current_bidder_id).toBe(testHostId);
  });

  it('7. Participant rejoins room after exiting and state is fully restored', () => {
    const rejoined = roomManager.joinRoom(roomCode, testGuestId, 'Guest Manager', 'socket-guest-2');
    expect(rejoined).toBeDefined();

    const room = roomManager.getRoom(roomCode)!;
    const guest = room.participants.get(testGuestId);
    expect(guest?.is_connected).toBe(true);
    expect(guest?.franchise?.short_code).toBe('MI');
    expect(guest?.socket_id).toBe('socket-guest-2');
  });

  it('8. Host exits room: auction remains active, host disconnect time tracked, room does not terminate', () => {
    const room = roomManager.getRoom(roomCode)!;
    const hostLeft = roomManager.leaveRoom(roomCode, testHostId);
    expect(hostLeft).toBe(true);

    // Room still exists and is alive
    expect(room.auction_state.phase).not.toBe('completed');
    expect(room.host_disconnect_time).toBeGreaterThan(0);

    const host = room.participants.get(testHostId);
    expect(host?.is_connected).toBe(false);

    // Host rejoins seamlessly
    const hostRejoined = roomManager.joinRoom(roomCode, testHostId, 'Host Manager', 'socket-host-2');
    expect(hostRejoined).toBeDefined();
    expect(room.host_disconnect_time).toBeNull();
  });

  it('9. End Auction is strictly separate from Exit: only host can end auction and computes final results', () => {
    const room = roomManager.getRoom(roomCode)!;

    // Normal participant CANNOT end auction
    const guestEndAttempt = roomManager.endAuctionEarly(roomCode, testGuestId);
    expect(guestEndAttempt).toBe(false);
    expect(room.auction_state.phase).not.toBe('completed');

    // Only host can end auction
    const hostEnd = roomManager.endAuctionEarly(roomCode, testHostId);
    expect(hostEnd).toBe(true);
    expect(room.auction_state.phase).toBe('completed');
    expect(room.results).toBeDefined();
  });

  it('10. Restores stranded paused bidding room without losing player or freezing, auto-resumes on host reconnect, and keeps manual pause paused', async () => {
    const restoreCode = `RST${Math.floor(100 + Math.random() * 899)}`;
    await db.room.create({
      data: {
        room_code: restoreCode,
        name: 'Restore Pause Recovery Arena',
        host_user_id: testHostId,
        status: 'live',
        sport_type: 'PKL',
      },
    }).catch(() => { });

    try {
      const tempRoom = roomManager.createRoom(restoreCode, 'Restore Pause Recovery Arena', testHostId, 'Host Manager', 'PKL');
      roomManager.joinRoom(restoreCode, testGuestId, 'Guest Manager', 'socket-rst-g1');
      roomManager.pickFranchise(restoreCode, testHostId, { id: 'pat', name: 'Patna Pirates', short_code: 'PAT', color: '#10B981' });
      roomManager.pickFranchise(restoreCode, testGuestId, { id: 'ben', name: 'Bengal Warriors', short_code: 'BEN', color: '#2563EB' });
      roomManager.startAuction(restoreCode, testHostId);
      roomManager.nextPlayer(tempRoom);
      roomManager.startBiddingPhase(tempRoom);

      const activePlayer = tempRoom.auction_state.current_player!;
      // Reproduce exact DB failure condition: is_paused=true, expired timer_ends_at, undefined pause_remaining_ms
      const strandedSnapshot = {
        schema_version: 2,
        saved_at: Date.now(),
        room_code: restoreCode,
        name: tempRoom.name,
        host_session_id: testHostId,
        host_disconnect_time: null,
        settings: tempRoom.settings,
        participants: Array.from(tempRoom.participants.values()),
        stage: 'main_auction' as const,
        auction_state: {
          ...tempRoom.auction_state,
          phase: 'bidding' as const,
          is_paused: true,
          pause_remaining_ms: undefined,
          timer_ends_at: Date.now() - 120000,
        },
        pool: tempRoom.pool,
        unsold_pool: tempRoom.unsold_pool,
        all_completed_bids: [],
        results: null,
        pending_trades: [],
        completed_trades: [],
        playing_xi_submissions: [],
        commentary_events: [],
      };
      roomManager.removeRoom(restoreCode);

      const restored = await roomManager.restoreRoomFromSnapshot(strandedSnapshot);
      expect(restored).toBeDefined();
      expect(restored!.auction_state.phase).toBe('bidding');
      expect(restored!.auction_state.current_player?.id).toBe(activePlayer.id);
      expect(restored!.auction_state.pause_remaining_ms).toBeGreaterThan(1000);
      expect(restored!.auto_paused_reason).toBe('server_restart');

      // While paused, validateBid must reject explicitly due to pause (not "Time has expired")
      const pausedBidCheck = validateBid(
        restored!.participants.get(testGuestId)!,
        restored!.auction_state,
        restored!.settings,
        activePlayer.base_price,
        true
      );
      expect(pausedBidCheck.valid).toBe(false);
      expect(pausedBidCheck.reason).toMatch(/paused/i);

      // Host reconnect auto-resumes server-restart pause cleanly
      const resumedOnJoin = roomManager.joinRoom(restoreCode, testHostId, 'Host Manager', 'socket-host-rst');
      expect(resumedOnJoin).toBeDefined();
      expect(resumedOnJoin!.auction_state.is_paused).toBe(false);
      expect(resumedOnJoin!.auto_paused_reason).toBeNull();
      expect(resumedOnJoin!.auction_state.timer_ends_at).toBeGreaterThan(Date.now());
      expect(resumedOnJoin!.timer_handle).toBeTruthy();

      // Host manual pause must remain paused when host reconnects
      const manuallyPaused = roomManager.pauseAuction(restoreCode, testHostId, false);
      expect(manuallyPaused).toBe(true);
      expect(resumedOnJoin!.auto_paused_reason).toBeNull();
      roomManager.joinRoom(restoreCode, testHostId, 'Host Manager', 'socket-host-rst-2');
      expect(resumedOnJoin!.auction_state.is_paused).toBe(true);
    } finally {
      roomManager.removeRoom(restoreCode);
      await prisma.room.deleteMany({ where: { room_code: restoreCode } }).catch(() => { });
    }
  });
});
