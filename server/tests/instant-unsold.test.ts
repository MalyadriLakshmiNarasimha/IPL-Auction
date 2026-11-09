import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { RoomManager, RoomRecord } from '../room';
import { ALL_PLAYERS } from '../../src/shared/player-data';
import { FRANCHISE_PRESETS } from '../../src/shared/constants';

describe('Instant Unsold — Unanimous Pass Mechanism (10 Test Cases)', () => {
  let server: http.Server;
  let io: SocketIOServer;
  let roomManager: RoomManager;
  let roomCodeIndex = 1;

  beforeAll(() => {
    server = http.createServer();
    io = new SocketIOServer(server);
    roomManager = new RoomManager(io);
  });

  afterAll(() => {
    roomManager.stopPeriodicSnapshotLoop();
    io.close();
    server.close();
  });

  function setup10ParticipantRoom(): { room: RoomRecord; roomCode: string; participants: string[] } {
    const roomCode = `UNS${(roomCodeIndex++).toString().padStart(3, '0')}`;
    const hostId = 'user-0';
    const room = roomManager.createRoom(roomCode, `Room ${roomCode}`, hostId, 'Manager 0');

    // Host franchise
    const host = room.participants.get(hostId)!;
    host.franchise = FRANCHISE_PRESETS[0];
    host.team_name = FRANCHISE_PRESETS[0].name;

    const participantIds = [hostId];

    // Add 9 more participants (total 10 managers)
    for (let i = 1; i < 10; i++) {
      const pid = `user-${i}`;
      roomManager.joinRoom(roomCode, pid, `Manager ${i}`, `sock-${pid}`);
      const part = room.participants.get(pid)!;
      const franchise = FRANCHISE_PRESETS[i % FRANCHISE_PRESETS.length];
      part.franchise = franchise;
      part.team_name = franchise.name;
      participantIds.push(pid);
    }

    room.pool = ALL_PLAYERS.slice(1, 30);
    room.unsold_pool = [];
    room.auction_state.total_pool_count = 30;
    room.auction_state.remaining_pool_count = 29;
    room.auction_state.current_player_index = 0;
    room.auction_state.current_player = ALL_PLAYERS[0];
    room.auction_state.current_bid = 0;
    room.auction_state.current_bidder_id = null;
    room.auction_state.bids = [];
    room.auction_state.withdrawn_participant_ids = [];
    room.auction_state.passed_participant_ids = [];
    room.auction_state.pass_count = 0;
    room.auction_state.total_eligible_passers = 10;
    room.auction_state.phase = 'bidding';
    room.auction_state.stage = 'main_auction';
    room.auction_state.timer_seconds = 15;
    room.auction_state.timer_ends_at = Date.now() + 15000;
    room.current_player_passes.clear();
    room.is_processing_unsold = false;

    // Start timer loop so timer_handle is set
    (roomManager as any).startTimerLoop(room);

    return { room, roomCode, participants: participantIds };
  }

  // ---------------------------------------------------------------------------
  // Test Case 1: 10 participants, 10 passes: immediate UNSOLD without waiting for timer
  // ---------------------------------------------------------------------------
  it('1. 10 participants, 10 passes: immediately marks player UNSOLD and clears timer', () => {
    const { room, roomCode, participants } = setup10ParticipantRoom();
    const player = room.auction_state.current_player!;
    expect(player).toBeDefined();
    expect(room.auction_state.phase).toBe('bidding');
    expect(room.timer_handle).not.toBeNull();

    let unsoldEmitted = false;
    io.to = ((target: string) => ({
      emit: (event: string, payload: any) => {
        if (event === 'player_unsold' && payload.player.id === player.id) {
          unsoldEmitted = true;
        }
      },
    })) as any;

    // First 9 pass:
    for (let i = 0; i < 9; i++) {
      const res = roomManager.passPlayer(roomCode, participants[i]);
      expect(res).toBe(true);
      expect(room.auction_state.phase).toBe('bidding');
    }

    expect(room.auction_state.pass_count).toBe(9);
    expect(room.auction_state.total_eligible_passers).toBe(10);
    expect(room.auction_state.phase).toBe('bidding');

    // 10th pass -> UNANIMOUS!
    const res10 = roomManager.passPlayer(roomCode, participants[9]);
    expect(res10).toBe(true);

    // Immediately UNSOLD without waiting for timer
    expect(room.auction_state.phase).toBe('unsold');
    expect(room.timer_handle).toBeNull();
    expect(room.unsold_pool.some(p => p.id === player.id)).toBe(true);
    expect(room.auction_state.unsold_count).toBe(1);
    expect(unsoldEmitted).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test Case 2: 10 participants, 9 passes: timer continues normally
  // ---------------------------------------------------------------------------
  it('2. 10 participants, 9 passes: timer continues normally and player remains in bidding', () => {
    const { room, roomCode, participants } = setup10ParticipantRoom();
    expect(room.auction_state.phase).toBe('bidding');
    const timerHandleBefore = room.timer_handle;
    expect(timerHandleBefore).not.toBeNull();

    for (let i = 0; i < 9; i++) {
      roomManager.passPlayer(roomCode, participants[i]);
    }

    expect(room.auction_state.pass_count).toBe(9);
    expect(room.auction_state.total_eligible_passers).toBe(10);
    expect(room.auction_state.phase).toBe('bidding');
    expect(room.timer_handle).not.toBeNull();
    expect(room.unsold_pool.length).toBe(0);

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
  });

  // ---------------------------------------------------------------------------
  // Test Case 3: 10 participants, 1 valid bid: no unanimous-pass UNSOLD
  // ---------------------------------------------------------------------------
  it('3. 10 participants, 1 valid bid: prevents unanimous-pass UNSOLD', () => {
    const { room, roomCode, participants } = setup10ParticipantRoom();
    const player = room.auction_state.current_player!;

    // Participant 0 places a valid bid at base price
    const bidResult = roomManager.placeBid(roomCode, participants[0], player.base_price, true);
    expect(bidResult).toBe(true);
    expect(room.auction_state.current_bid).toBe(player.base_price);
    expect(room.auction_state.current_bidder_id).toBe(participants[0]);

    // Remaining 9 participants pass
    for (let i = 1; i < 10; i++) {
      roomManager.passPlayer(roomCode, participants[i]);
    }

    // Since a valid bid was active, unanimous unsold CANNOT happen!
    // Instead, player is sold to the highest bidder (participants[0])
    expect(room.auction_state.phase).toBe('sold');
    expect(room.unsold_pool.some(p => p.id === player.id)).toBe(false);
    expect(room.auction_state.sold_count).toBe(1);

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
  });

  // ---------------------------------------------------------------------------
  // Test Case 4: Duplicate pass from one participant: count increases only once
  // ---------------------------------------------------------------------------
  it('4. Duplicate pass from one participant: count increases only once', () => {
    const { room, roomCode, participants } = setup10ParticipantRoom();

    expect(room.auction_state.pass_count).toBe(0);

    // First pass
    roomManager.passPlayer(roomCode, participants[0]);
    expect(room.auction_state.pass_count).toBe(1);

    // Duplicate pass by same participant
    roomManager.passPlayer(roomCode, participants[0]);
    expect(room.auction_state.pass_count).toBe(1);

    // Third attempt
    roomManager.passPlayer(roomCode, participants[0]);
    expect(room.auction_state.pass_count).toBe(1);
    expect(room.auction_state.phase).toBe('bidding');

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
  });

  // ---------------------------------------------------------------------------
  // Test Case 5: Two simultaneous final pass events: exactly one UNSOLD transition
  // ---------------------------------------------------------------------------
  it('5. Two simultaneous final pass events: exactly one UNSOLD transition is processed', () => {
    const { room, roomCode, participants } = setup10ParticipantRoom();
    const player = room.auction_state.current_player!;

    let unsoldEventCount = 0;
    io.to = ((target: string) => ({
      emit: (event: string, payload: any) => {
        if (event === 'player_unsold' && payload.player.id === player.id) {
          unsoldEventCount++;
        }
      },
    })) as any;

    // 9 participants pass
    for (let i = 0; i < 9; i++) {
      roomManager.passPlayer(roomCode, participants[i]);
    }
    expect(room.auction_state.pass_count).toBe(9);

    // Simulate simultaneous final pass events arriving concurrently
    const passA = roomManager.passPlayer(roomCode, participants[9]);
    const passB = roomManager.passPlayer(roomCode, participants[9]);

    expect(passA).toBe(true);
    // Second concurrent call is safely handled without double-transitioning
    expect(typeof passB).toBe('boolean');

    // Exactly one unsold event emitted and exactly 1 player added to unsold_pool
    expect(unsoldEventCount).toBe(1);
    expect(room.unsold_pool.filter(p => p.id === player.id).length).toBe(1);
    expect(room.auction_state.unsold_count).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Test Case 6: Participant disconnects before passing: no automatic pass
  // ---------------------------------------------------------------------------
  it('6. Participant disconnects before passing: no automatic pass', () => {
    const { room, roomCode, participants } = setup10ParticipantRoom();

    // Participant 9 disconnects
    const p9 = room.participants.get(participants[9])!;
    p9.is_connected = false;

    // Participants 0 through 8 pass (9 managers)
    for (let i = 0; i < 9; i++) {
      roomManager.passPlayer(roomCode, participants[i]);
    }

    // Pass count is 9, total eligible passers is 10
    expect(room.auction_state.pass_count).toBe(9);
    expect(room.auction_state.total_eligible_passers).toBe(10);

    // Disconnected manager does NOT automatically pass:
    expect(p9.has_withdrawn_current).toBe(false);
    expect(room.current_player_passes.has(participants[9])).toBe(false);

    // Timer must still be active and phase still bidding
    expect(room.auction_state.phase).toBe('bidding');
    expect(room.timer_handle).not.toBeNull();

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
  });

  // ---------------------------------------------------------------------------
  // Test Case 7: New player starts: previous pass count resets
  // ---------------------------------------------------------------------------
  it('7. New player starts: previous pass count resets to 0', () => {
    const { room, roomCode, participants } = setup10ParticipantRoom();
    const firstPlayer = room.auction_state.current_player!;

    // 10 passes on first player -> immediate unsold
    for (const pid of participants) {
      roomManager.passPlayer(roomCode, pid);
    }
    expect(room.auction_state.phase).toBe('unsold');

    // Trigger next player
    (roomManager as any).nextPlayer(room);

    expect(room.auction_state.current_player?.id).not.toBe(firstPlayer.id);
    expect(room.auction_state.pass_count).toBe(0);
    expect(room.current_player_passes.size).toBe(0);
    expect(room.auction_state.passed_participant_ids).toEqual([]);
    expect(room.auction_state.withdrawn_participant_ids).toEqual([]);
    expect(room.auction_state.total_eligible_passers).toBe(10);

    for (const pid of participants) {
      expect(room.participants.get(pid)?.has_withdrawn_current).toBe(false);
    }

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
  });

  // ---------------------------------------------------------------------------
  // Test Case 8: Spectator passes: reject the event
  // ---------------------------------------------------------------------------
  it('8. Spectator passes: reject the event with error', () => {
    const { room, roomCode } = setup10ParticipantRoom();

    // Join a spectator
    roomManager.joinRoom(roomCode, 'spec-1', 'Spectator 1', 'sock-spec-1', true);
    const spec = room.participants.get('spec-1')!;
    expect(spec.is_spectator).toBe(true);

    let errorEmitted = false;
    io.to = ((target: string) => ({
      emit: (event: string, payload: any) => {
        if (event === 'error_message' && payload.message.includes('Spectators')) {
          errorEmitted = true;
        }
      },
    })) as any;

    const passResult = roomManager.passPlayer(roomCode, 'spec-1');
    expect(passResult).toBe(false);
    expect(errorEmitted).toBe(true);
    expect(room.auction_state.pass_count).toBe(0);
    expect(room.current_player_passes.has('spec-1')).toBe(false);

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
  });

  // ---------------------------------------------------------------------------
  // Test Case 9: Auction paused: follow existing pause policy without unintended transition
  // ---------------------------------------------------------------------------
  it('9. Auction paused: follow existing pause policy without unintended transition', () => {
    const { room, roomCode, participants } = setup10ParticipantRoom();

    // 5 managers pass before pause
    for (let i = 0; i < 5; i++) {
      roomManager.passPlayer(roomCode, participants[i]);
    }
    expect(room.auction_state.pass_count).toBe(5);

    // Host pauses the auction
    const paused = roomManager.pauseAuction(roomCode, participants[0]);
    expect(paused).toBe(true);
    expect(room.auction_state.is_paused).toBe(true);

    // A participant attempts to pass while paused
    const passWhilePaused = roomManager.passPlayer(roomCode, participants[5]);
    expect(passWhilePaused).toBe(false);

    // Pass count is not incremented and no unintended unsold transition
    expect(room.auction_state.pass_count).toBe(5);
    expect(room.auction_state.phase).toBe('bidding');
    expect(room.unsold_pool.length).toBe(0);

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
  });

  // ---------------------------------------------------------------------------
  // Test Case 10: Timer expires normally: existing unsold logic still works
  // ---------------------------------------------------------------------------
  it('10. Timer expires normally: existing unsold logic still works', () => {
    const { room, roomCode, participants } = setup10ParticipantRoom();
    const player = room.auction_state.current_player!;

    // Only 3 of 10 managers pass
    for (let i = 0; i < 3; i++) {
      roomManager.passPlayer(roomCode, participants[i]);
    }
    expect(room.auction_state.pass_count).toBe(3);
    expect(room.auction_state.phase).toBe('bidding');

    // Simulate timer expiring naturally (calling handleTimerExpired)
    (roomManager as any).handleTimerExpired(room);

    expect(room.auction_state.phase).toBe('unsold');
    expect(room.auction_state.unsold_count).toBe(1);
    expect(room.unsold_pool.some(p => p.id === player.id)).toBe(true);

    if (room.timer_handle) {
      clearInterval(room.timer_handle);
      room.timer_handle = null;
    }
  });
});
