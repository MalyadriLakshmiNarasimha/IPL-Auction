import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { RoomManager } from '../room';
import { ALL_PLAYERS } from '../../src/shared/player-data';
import { ALL_PKL_PLAYERS, PKL_FRANCHISES } from '../../src/shared/pkl-player-data';
import { FRANCHISE_PRESETS } from '../../src/shared/constants';
import { SportType } from '../../src/shared/types';
import { prisma } from '../../src/lib/db';

describe('IPL & PKL Strict Lifecycle: ROUND 1 -> ROUND 2 -> TRADE ROUND -> FINAL EVALUATION', () => {
  let httpServer: http.Server;
  let io: SocketIOServer;
  let roomManager: RoomManager;
  let port: number;
  const createdRoomCodes: string[] = [];

  beforeAll(async () => {
    httpServer = http.createServer();
    io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
    // Bypass DB socket auth for unit-level roomManager socket sync verification (use inline socket auth check)
    io.use((socket, next) => {
      const auth = socket.handshake.auth || {};
      socket.data.userId = auth.userId;
      socket.data.userName = auth.userName;
      next();
    });

    roomManager = new RoomManager(io);

    io.on('connection', socket => {
      const userId = socket.data.userId as string;
      const userName = socket.data.userName as string;

      socket.on('room_join', data => {
        const room = roomManager.joinRoom(data.room_code, userId, userName, socket.id);
        if (room) {
          socket.join(room.room_code);
          socket.emit('state_sync', {
            settings: room.settings,
            participants: Array.from(room.participants.values()),
            auction_state: roomManager.getPublicState(room),
            results: room.results,
            trades: room.completed_trades,
            pending_trade_offers: Array.from(room.pending_trades.values()),
            playing_xi_submissions: Array.from(room.playing_xi_submissions.values()),
            commentary: room.commentary_events,
          });
        }
      });

      socket.on('stage_change', data => {
        const ok = roomManager.transitionStage(data.room_code, userId, data.stage, data.duration_seconds);
        if (!ok) {
          socket.emit('error_message', { message: 'Stage transition rejected' });
        }
      });
    });

    await new Promise<void>(resolve => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    roomManager.stopPeriodicSnapshotLoop();
    for (const code of createdRoomCodes) {
      roomManager.removeRoom(code);
    }
    io.close();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));

    try {
      for (const code of createdRoomCodes) {
        await prisma.roomSnapshot.deleteMany({ where: { room_code: code } });
        await prisma.roomParticipant.deleteMany({ where: { room_code: code } });
        await prisma.bidEvent.deleteMany({ where: { room_code: code } });
        await prisma.result.deleteMany({ where: { room_code: code } });
        await prisma.commentaryLog.deleteMany({ where: { room_code: code } });
        await prisma.room.deleteMany({ where: { room_code: code } });
      }
    } catch {}
  });

  function buyPlayer(roomCode: string, buyerId: string, opponentId: string) {
    const room = roomManager.getRoom(roomCode)!;
    roomManager.nextPlayer(room);
    roomManager.startBiddingPhase(room);
    const p = room.auction_state.current_player!;
    expect(roomManager.placeBid(roomCode, buyerId, p.base_price, true)).toBe(true);
    // Opponent passes -> instant sold
    expect(roomManager.withdrawBid(roomCode, opponentId)).toBe(true);
    expect(room.auction_state.phase).toBe('sold');
    return p;
  }

  function passPlayerAll(roomCode: string, ids: string[]) {
    const room = roomManager.getRoom(roomCode)!;
    roomManager.nextPlayer(room);
    roomManager.startBiddingPhase(room);
    const p = room.auction_state.current_player!;
    for (const id of ids) {
      roomManager.passPlayer(roomCode, id);
    }
    expect(room.auction_state.phase).toBe('unsold');
    return p;
  }

  async function runFullSportLifecycleTest(sport: SportType) {
    const prefix = sport === 'PKL' ? 'KL' : 'IL';
    const roomCode = `${prefix}${Math.floor(1000 + Math.random() * 8999)}`;
    createdRoomCodes.push(roomCode);

    const playersSource = sport === 'PKL' ? ALL_PKL_PLAYERS : ALL_PLAYERS;
    const franchises = sport === 'PKL' ? PKL_FRANCHISES : FRANCHISE_PRESETS;
    const hostId = `host-${roomCode}`;
    const guestId = `guest-${roomCode}`;

    const room = roomManager.createRoom(roomCode, `${sport} Lifecycle Arena`, hostId, `${sport} Host`, sport);
    room.participants.get(hostId)!.franchise = franchises[0];
    room.participants.get(hostId)!.team_name = franchises[0].name;

    // Connect two real Socket.IO clients to verify multi-participant synchronization
    const hostSocket: ClientSocketType = ClientSocket(`http://localhost:${port}`, {
      auth: { userId: hostId, userName: `${sport} Host` },
      transports: ['websocket'],
    });
    const guestSocket: ClientSocketType = ClientSocket(`http://localhost:${port}`, {
      auth: { userId: guestId, userName: `${sport} Guest` },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>(r => hostSocket.once('connect', () => r())),
      new Promise<void>(r => guestSocket.once('connect', () => r())),
    ]);

    try {
      const hostSyncs: any[] = [];
      const guestSyncs: any[] = [];
      hostSocket.on('state_sync', s => hostSyncs.push(s));
      guestSocket.on('state_sync', s => guestSyncs.push(s));

      hostSocket.emit('room_join', { room_code: roomCode });
      guestSocket.emit('room_join', { room_code: roomCode });
      await new Promise(r => setTimeout(r, 120));

      roomManager.pickFranchise(roomCode, guestId, franchises[1]);
      roomManager.updateSettings(roomCode, hostId, {
        squad_size: sport === 'PKL' ? 14 : 15,
        order_type: 'base_price',
      });

      // Premature transition to trading in lobby MUST be rejected
      expect(roomManager.transitionStage(roomCode, hostId, 'trading_window', 180)).toBe(false);
      expect(room.stage).toBe('lobby');

      // 1. Round 1 starts correctly with valid full pool
      expect(roomManager.startAuction(roomCode, hostId)).toBe(true);
      expect(room.stage).toBe('main_auction');
      expect(room.auction_state.round_number).toBe(1);
      expect(room.auction_state.round1_completed).toBe(false);
      expect(room.auction_state.round2_completed).toBe(false);

      // Focus active Round 1 queue to 3 players for deterministic Round 1 -> Round 2 -> Trade progression
      room.pool = room.pool.slice(0, 3);
      room.auction_state.total_pool_count = 3;
      room.auction_state.remaining_pool_count = 3;

      // Trading blocked while Round 1 is active
      expect(roomManager.transitionStage(roomCode, hostId, 'trading_window', 180)).toBe(false);

      // Player 1 bought by Host, Player 2 bought by Guest, Player 3 goes UNSOLD
      const pHostBought = buyPlayer(roomCode, hostId, guestId);
      const pGuestBought = buyPlayer(roomCode, guestId, hostId);
      const pUnsoldR1 = passPlayerAll(roomCode, [hostId, guestId]);
      expect(room.pool.length).toBe(0);
      expect(room.unsold_pool.map(p => p.id)).toContain(pUnsoldR1.id);

      // 2. Round 1 completion unlocks Round 2 (NOT trading!)
      roomManager.nextPlayer(room);
      expect(room.auction_state.round1_completed).toBe(true);
      expect(room.auction_state.round2_completed).toBe(false);
      expect(room.auction_state.round_number).toBe(2);
      expect(room.stage).toBe('unsold_auction');
      expect(room.auction_state.phase).toBe('unsold_round');

      // 3. Trading remains inaccessible after Round 1 while Round 2 hasn't finished
      expect(roomManager.transitionStage(roomCode, hostId, 'trading_window', 180)).toBe(false);
      const blockedTradeR1 = roomManager.proposeTrade(roomCode, hostId, guestId, pHostBought.id, pGuestBought.id);
      expect(blockedTradeR1.success).toBe(false);

      // 4. Round 2 starts correctly
      roomManager.nextPlayer(room);
      roomManager.startBiddingPhase(room);
      expect(room.stage).toBe('unsold_auction');
      expect(room.auction_state.phase).toBe('bidding');
      expect(room.auction_state.current_player?.id).toBe(pUnsoldR1.id);

      // 5. Trading remains inaccessible while Round 2 bidding is active (both backend & via socket)
      hostSocket.emit('stage_change', { room_code: roomCode, stage: 'trading_window', duration_seconds: 180 });
      await new Promise(r => setTimeout(r, 80));
      expect(room.stage).toBe('unsold_auction');

      // Resolve Round 2 player (pass -> stays unsold)
      roomManager.passPlayer(roomCode, hostId);
      roomManager.passPlayer(roomCode, guestId);
      expect(room.auction_state.phase).toBe('unsold');
      expect(room.pool.length).toBe(0);

      // 6. Round 2 completion unlocks Trade Round
      roomManager.nextPlayer(room);
      expect(room.auction_state.round1_completed).toBe(true);
      expect(room.auction_state.round2_completed).toBe(true);
      expect(room.stage).toBe('trading_window');
      expect(room.auction_state.phase).toBe('trading');
      const initialStageEndsAt = room.auction_state.stage_ends_at!;
      expect(initialStageEndsAt).toBeGreaterThan(Date.now());

      // 13. Multiple participants remain synchronized in Trade Round
      await new Promise(r => setTimeout(r, 80));
      const latestHostSync = hostSyncs[hostSyncs.length - 1];
      const latestGuestSync = guestSyncs[guestSyncs.length - 1];
      expect(latestHostSync?.auction_state?.stage).toBe('trading_window');
      expect(latestGuestSync?.auction_state?.stage).toBe('trading_window');
      expect(latestHostSync?.auction_state?.round1_completed).toBe(true);
      expect(latestGuestSync?.auction_state?.round2_completed).toBe(true);

      // 4. Prevent duplicate trading transition / resetting countdown
      const duplicateTrade = roomManager.transitionStage(roomCode, hostId, 'trading_window', 300);
      expect(duplicateTrade).toBe(false);
      expect(room.auction_state.stage_ends_at).toBe(initialStageEndsAt);

      // 11. Refresh (snapshot + restore) does not reset phase or trading countdown
      await roomManager.saveRoomSnapshot(roomCode, 'verify_active_trading');
      const rmAfterRefresh = new RoomManager(io);
      try {
        const restored = await rmAfterRefresh.restoreRoomFromSnapshot(roomCode);
        expect(restored?.stage).toBe('trading_window');
        expect(restored?.auction_state.phase).toBe('trading');
        expect(restored?.auction_state.stage_ends_at).toBe(initialStageEndsAt);
        expect(restored?.auction_state.round1_completed).toBe(true);
        expect(restored?.auction_state.round2_completed).toBe(true);
      } finally {
        rmAfterRefresh.stopPeriodicSnapshotLoop();
        rmAfterRefresh.removeRoom(roomCode);
      }

      // 12. Reconnection restores the exact persisted phase & stage
      guestSocket.disconnect();
      await new Promise(r => setTimeout(r, 50));
      guestSocket.connect();
      await new Promise<void>(r => guestSocket.once('connect', () => r()));
      const reconnectSync = await new Promise<any>(resolve => {
        guestSocket.once('state_sync', resolve);
        guestSocket.emit('room_join', { room_code: roomCode });
      });
      expect(reconnectSync.auction_state.stage).toBe('trading_window');
      expect(reconnectSync.auction_state.phase).toBe('trading');
      expect(reconnectSync.auction_state.stage_ends_at).toBe(initialStageEndsAt);

      // 7 & 8. Both teams negotiate trades and mutual consent is strictly enforced
      const offer = roomManager.proposeTrade(roomCode, hostId, guestId, pHostBought.id, pGuestBought.id);
      expect(offer.success).toBe(true);
      const tradeId = offer.offer!.id;

      // Sender CANNOT self-accept
      const selfAccept = roomManager.respondTrade(roomCode, hostId, tradeId, 'accept');
      expect(selfAccept.success).toBe(false);
      expect(selfAccept.error).toContain('Mutual consent');

      // Receiver accepts -> atomic swap executes
      const guestAccept = roomManager.respondTrade(roomCode, guestId, tradeId, 'accept');
      expect(guestAccept.success).toBe(true);
      expect(room.completed_trades.length).toBe(1);
      expect(room.participants.get(hostId)!.squad.some(s => s.player_id === pGuestBought.id)).toBe(true);
      expect(room.participants.get(guestId)!.squad.some(s => s.player_id === pHostBought.id)).toBe(true);

      // 9. Unauthorized non-host CANNOT conclude trading; only authorized host concludes trading
      expect(roomManager.transitionStage(roomCode, guestId, 'squad_evaluation')).toBe(false);
      expect(room.stage).toBe('trading_window');

      expect(roomManager.concludeTradingWindow(roomCode)).toBe(true);
      expect(room.stage).toBe('squad_evaluation');
      expect(room.auction_state.phase).toBe('evaluation');
      expect(room.auction_state.trading_completed).toBe(true);

      // Completed trading CANNOT reopen!
      expect(roomManager.transitionStage(roomCode, hostId, 'trading_window', 180)).toBe(false);

      // 10. Final evaluation & results generated accurately
      expect(room.results).not.toBeNull();
      expect(room.results!.leaderboard.length).toBe(2);
      expect(room.results!.trades?.length).toBe(1);

      roomManager.completeAuction(room);
      expect(room.stage).toBe('championship_recap');
      expect(room.auction_state.phase).toBe('completed');
      expect(roomManager.transitionStage(roomCode, hostId, 'trading_window', 180)).toBe(false);
    } finally {
      hostSocket.disconnect();
      guestSocket.disconnect();
    }
  }

  it('Runs full 13-point lifecycle & synchronization for IPL', async () => {
    await runFullSportLifecycleTest('IPL');
  });

  it('Runs full 13-point lifecycle & synchronization for PKL', async () => {
    await runFullSportLifecycleTest('PKL');
  });

  it('14. Safely recovers old persisted inconsistent trading_window snapshots without deleting records', async () => {
    const rmRecover = new RoomManager(io);
    try {
      // Case A: Incomplete Round 1 saved as trading_window with remaining pool -> recovers to Round 1
      const incompleteR1Code = `KR1${Math.floor(100 + Math.random() * 899)}`;
      createdRoomCodes.push(incompleteR1Code);
      const r1 = rmRecover.createRoom(incompleteR1Code, 'Recover R1 PKL', 'host-r1', 'Host R1', 'PKL');
      r1.participants.get('host-r1')!.squad = [
        { player_id: ALL_PKL_PLAYERS[0].id, player: ALL_PKL_PLAYERS[0], bought_for: 15_00_000, timestamp: Date.now() },
      ];
      r1.participants.get('host-r1')!.purse_remaining = 4_85_00_000;
      r1.pool = [ALL_PKL_PLAYERS[1], ALL_PKL_PLAYERS[2]];
      r1.stage = 'trading_window';
      r1.auction_state.stage = 'trading_window';
      r1.auction_state.phase = 'trading';
      r1.auction_state.round_number = 1;
      r1.auction_state.round1_completed = false;
      r1.auction_state.round2_completed = false;
      await rmRecover.saveRoomSnapshot(incompleteR1Code, 'legacy_corrupt_r1');
      rmRecover.removeRoom(incompleteR1Code);

      const restoredR1 = await rmRecover.restoreRoomFromSnapshot(incompleteR1Code);
      expect(restoredR1?.stage).toBe('main_auction');
      expect(restoredR1?.auction_state.phase).toBe('bidding');
      expect(restoredR1?.participants.get('host-r1')?.squad.length).toBe(1);
      expect(restoredR1?.participants.get('host-r1')?.purse_remaining).toBe(4_85_00_000);
      expect(restoredR1?.pool.length).toBe(2);

      // Case B: Incomplete Round 2 saved as trading_window -> recovers to Round 2
      const incompleteR2Code = `KR2${Math.floor(100 + Math.random() * 899)}`;
      createdRoomCodes.push(incompleteR2Code);
      const r2 = rmRecover.createRoom(incompleteR2Code, 'Recover R2 IPL', 'host-r2', 'Host R2', 'IPL');
      r2.pool = [];
      r2.unsold_pool = [ALL_PLAYERS[3]];
      r2.stage = 'trading_window';
      r2.auction_state.stage = 'trading_window';
      r2.auction_state.phase = 'trading';
      r2.auction_state.round_number = 1;
      r2.auction_state.round1_completed = true;
      r2.auction_state.round2_completed = false;
      await rmRecover.saveRoomSnapshot(incompleteR2Code, 'legacy_corrupt_r2');
      rmRecover.removeRoom(incompleteR2Code);

      const restoredR2 = await rmRecover.restoreRoomFromSnapshot(incompleteR2Code);
      expect(restoredR2?.stage).toBe('unsold_auction');
      expect(restoredR2?.auction_state.round_number).toBe(2);
      expect(restoredR2?.pool.length).toBe(1);

      // Case C: Expired trading_window snapshot -> concludes safely to squad_evaluation without reopening trading
      const expiredTradeCode = `KEX${Math.floor(100 + Math.random() * 899)}`;
      createdRoomCodes.push(expiredTradeCode);
      const r3 = rmRecover.createRoom(expiredTradeCode, 'Expired Trade PKL', 'host-r3', 'Host R3', 'PKL');
      rmRecover.joinRoom(expiredTradeCode, 'guest-r3', 'Guest R3', 'sock-g3');
      r3.participants.get('host-r3')!.franchise = PKL_FRANCHISES[0];
      r3.participants.get('guest-r3')!.franchise = PKL_FRANCHISES[1];
      r3.participants.get('host-r3')!.squad = [
        { player_id: ALL_PKL_PLAYERS[0].id, player: ALL_PKL_PLAYERS[0], bought_for: 20_00_000, timestamp: Date.now() },
      ];
      r3.participants.get('guest-r3')!.squad = [
        { player_id: ALL_PKL_PLAYERS[1].id, player: ALL_PKL_PLAYERS[1], bought_for: 20_00_000, timestamp: Date.now() },
      ];
      r3.stage = 'trading_window';
      r3.auction_state.stage = 'trading_window';
      r3.auction_state.phase = 'trading';
      r3.auction_state.round_number = 2;
      r3.auction_state.round1_completed = true;
      r3.auction_state.round2_completed = true;
      r3.auction_state.stage_ends_at = Date.now() - 60_000; // Expired 1 minute ago
      await rmRecover.saveRoomSnapshot(expiredTradeCode, 'expired_trading');
      rmRecover.removeRoom(expiredTradeCode);

      const restoredExpired = await rmRecover.restoreRoomFromSnapshot(expiredTradeCode);
      expect(restoredExpired?.stage).toBe('squad_evaluation');
      expect(restoredExpired?.auction_state.phase).toBe('evaluation');
      expect(restoredExpired?.auction_state.trading_completed).toBe(true);
      expect(restoredExpired?.results?.leaderboard.length).toBe(2);
    } finally {
      rmRecover.stopPeriodicSnapshotLoop();
    }
  });
});
