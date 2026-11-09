import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { startServer, roomManager } from '../index';
import { getPlayerById } from '../../src/shared/player-data';
import { FRANCHISE_PRESETS } from '../../src/shared/constants';
import { PlayingXISubmission } from '../../src/shared/types';

describe('Player Trading Window, Stages Lifecycle & Spectator Mode Verification', () => {
  let serverInstance: http.Server;
  const PORT = 3004;
  const SERVER_URL = `http://localhost:${PORT}`;
  let hostSocket: ClientSocketType;
  let guestSocket: ClientSocketType;
  let spectatorSocket: ClientSocketType;
  const roomCode = 'TRADE9';

  beforeAll(async () => {
    serverInstance = await startServer(PORT);
    roomManager.createRoom(roomCode, 'Trading Arena', 'host-user', 'Host Manager');
  });

  afterAll(async () => {
    if (hostSocket?.connected) hostSocket.disconnect();
    if (guestSocket?.connected) guestSocket.disconnect();
    if (spectatorSocket?.connected) spectatorSocket.disconnect();
    if (serverInstance) {
      await new Promise(resolve => serverInstance.close(resolve));
    }
  });

  it('1. Connects Host, Guest, and Spectator with correct role assignments', async () => {
    hostSocket = ClientSocket(SERVER_URL, {
      auth: { isBotTest: true, botUser: { id: 'host-user', name: 'Host Manager' } },
      transports: ['websocket'],
    });

    guestSocket = ClientSocket(SERVER_URL, {
      auth: { isBotTest: true, botUser: { id: 'guest-user', name: 'Guest Manager' } },
      transports: ['websocket'],
    });

    spectatorSocket = ClientSocket(SERVER_URL, {
      auth: { isBotTest: true, botUser: { id: 'spec-user', name: 'Live Spectator' } },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>(resolve => hostSocket.once('connect', () => resolve())),
      new Promise<void>(resolve => guestSocket.once('connect', () => resolve())),
      new Promise<void>(resolve => spectatorSocket.once('connect', () => resolve())),
    ]);

    hostSocket.emit('room_join', { room_code: roomCode, display_name: 'Host Manager', session_id: 'host-user' });
    guestSocket.emit('room_join', { room_code: roomCode, display_name: 'Guest Manager', session_id: 'guest-user' });
    spectatorSocket.emit('room_join', {
      room_code: roomCode,
      display_name: 'Live Spectator',
      session_id: 'spec-user',
      is_spectator: true,
    });

    await new Promise(r => setTimeout(r, 200));

    const room = roomManager.getRoom(roomCode)!;
    expect(room).toBeDefined();
    expect(room.participants.get('host-user')?.role).toBe('host');
    expect(room.participants.get('guest-user')?.role).toBe('manager');
    expect(room.participants.get('spec-user')?.role).toBe('spectator');
    expect(room.participants.get('spec-user')?.is_spectator).toBe(true);
  });

  it('2. Assigns franchises and gives test players to squads', () => {
    const room = roomManager.getRoom(roomCode)!;
    roomManager.pickFranchise(roomCode, 'host-user', FRANCHISE_PRESETS[0]); // CSK
    roomManager.pickFranchise(roomCode, 'guest-user', FRANCHISE_PRESETS[1]); // MI

    // Spectator cannot pick franchise
    const specFranchiseOk = roomManager.pickFranchise(roomCode, 'spec-user', FRANCHISE_PRESETS[2]);
    expect(specFranchiseOk).toBe(false);

    // Give players
    const host = room.participants.get('host-user')!;
    const guest = room.participants.get('guest-user')!;

    const playerA = getPlayerById('p-001')!; // Dewald Brevis
    const playerB = getPlayerById('p-002')!; // Ruturaj Gaikwad

    host.squad.push({ player_id: playerA.id, player: playerA, bought_for: 5_00_00_000, timestamp: Date.now() });
    guest.squad.push({ player_id: playerB.id, player: playerB, bought_for: 18_00_00_000, timestamp: Date.now() });

    expect(host.squad.length).toBe(1);
    expect(guest.squad.length).toBe(1);
  });

  it('3. Host transitions room to trading_window stage', () => {
    const room = roomManager.getRoom(roomCode)!;
    const ok = roomManager.transitionStage(roomCode, 'host-user', 'trading_window', 120);
    expect(ok).toBe(true);
    expect(room.stage).toBe('trading_window');
    expect(room.auction_state.phase).toBe('trading');
  });

  it('4. Host proposes a player-for-player trade with Guest', async () => {
    let receivedOffer: any = null;
    guestSocket.on('trade_offer_received', (offer) => {
      receivedOffer = offer;
    });

    const res = roomManager.proposeTrade(roomCode, 'host-user', 'guest-user', 'p-001', 'p-002');
    expect(res.success).toBe(true);
    expect(res.offer).toBeDefined();
    expect(res.offer?.status).toBe('pending');
    expect(res.offer?.offered_player.id).toBe('p-001');
    expect(res.offer?.requested_player.id).toBe('p-002');

    await new Promise(r => setTimeout(r, 150));
    expect(receivedOffer).not.toBeNull();
    expect(receivedOffer.id).toBe(res.offer?.id);
  });

  it('5. Prevents duplicate trades on the same player while pending', () => {
    const res = roomManager.proposeTrade(roomCode, 'host-user', 'guest-user', 'p-001', 'p-002');
    expect(res.success).toBe(false);
    expect(res.error).toContain('already involved in a pending trade');
  });

  it('6. Guest accepts trade: executes atomic swap between squads', async () => {
    const room = roomManager.getRoom(roomCode)!;
    const pendingOffer = Array.from(room.pending_trades.values())[0];
    expect(pendingOffer).toBeDefined();

    let executedTradePayload: any = null;
    hostSocket.on('trade_executed', (payload) => {
      executedTradePayload = payload;
    });

    const res = roomManager.respondTrade(roomCode, 'guest-user', pendingOffer.id, 'accept');
    expect(res.success).toBe(true);

    const host = room.participants.get('host-user')!;
    const guest = room.participants.get('guest-user')!;

    // Host should now have p-002 (Ruturaj) and Guest should have p-001 (Dewald Brevis)
    expect(host.squad[0].player_id).toBe('p-002');
    expect(guest.squad[0].player_id).toBe('p-001');
    expect(room.completed_trades.length).toBe(1);

    await new Promise(r => setTimeout(r, 150));
    expect(executedTradePayload).not.toBeNull();
    expect(executedTradePayload.trade.player_a.id).toBe('p-001');
    expect(executedTradePayload.trade.player_b.id).toBe('p-002');
  });

  it('7. Host transitions room to playing_xi_selection and validates Playing XI', () => {
    const room = roomManager.getRoom(roomCode)!;
    roomManager.transitionStage(roomCode, 'host-user', 'playing_xi_selection', 180);
    expect(room.stage).toBe('playing_xi_selection');

    const host = room.participants.get('host-user')!;
    // Give host 11 valid players
    for (let i = 3; i <= 12; i++) {
      const p = getPlayerById(`p-${String(i).padStart(3, '0')}`)!;
      host.squad.push({ player_id: p.id, player: p, bought_for: p.base_price, timestamp: Date.now() });
    }
    expect(host.squad.length).toBe(11);

    const submission: PlayingXISubmission = {
      participant_id: 'host-user',
      display_name: 'Host Manager',
      franchise: host.franchise!,
      players: host.squad.map(s => s.player),
      batting_order: host.squad.map(s => s.player_id),
      wicketkeeper_id: host.squad[0].player_id,
      substitutes: [],
      is_submitted: true,
    };

    const res = roomManager.submitPlayingXI(roomCode, 'host-user', submission);
    expect(res.success).toBe(true);
    expect(res.scoreBreakdown).toBeDefined();
    expect(res.scoreBreakdown?.total_score).toBeGreaterThan(0);
  });

  it('8. Spectator is prohibited from bidding', () => {
    const room = roomManager.getRoom(roomCode)!;
    room.auction_state.phase = 'bidding';
    room.auction_state.current_player = getPlayerById('p-001')!;
    room.auction_state.timer_ends_at = Date.now() + 10000;

    const bidResult = roomManager.placeBid(roomCode, 'spec-user', 25_00_000);
    expect(bidResult).toBe(false);
  });
});

