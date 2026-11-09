import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import {
  db,
  prisma,
  checkMySqlConnection,
  DatabaseConnectionError,
  getDbAccess,
  __setMockDbConnected,
} from '../../src/lib/db';
import {
  validateProductionEnv,
  initDatabaseWithRetry,
  persistRoomSnapshot,
  loadLatestRoomSnapshot,
  recordBidEvent,
  getPersistedResults,
  SerializedRoomState,
} from '../db';
import { RoomManager, RoomRecord } from '../room';
import { ALL_PLAYERS } from '../../src/shared/player-data';
import { FRANCHISE_PRESETS } from '../../src/shared/constants';
import { TradeOffer, PlayingXISubmission } from '../../src/shared/types';
import { server } from '../index';

const TEST_PORT = 3005;

function setNodeEnv(val: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = val;
}

// Mock Socket.IO Server for RoomManager unit testing
function createMockIo(): any {
  return {
    to: () => ({
      emit: () => {},
    }),
    emit: () => {},
  };
}

// Helper to make HTTP GET requests to local server
function httpGet(url: string): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ statusCode: res.statusCode || 200, data: parsed });
        } catch {
          resolve({ statusCode: res.statusCode || 200, data: raw });
        }
      });
    }).on('error', reject);
  });
}

describe('Phase 2A: Database & Persistence Hardening Verification', () => {
  let httpServerInstance: http.Server;

  beforeAll(async () => {
    // Start HTTP server on port 3005 for health check tests
    await new Promise<void>((resolve) => {
      httpServerInstance = server.listen(TEST_PORT, '0.0.0.0', () => resolve());
    });
  });

  afterAll(async () => {
    __setMockDbConnected(null);
    if (httpServerInstance) {
      await new Promise<void>((resolve) => httpServerInstance.close(() => resolve()));
    }
    // Clean up test rooms from database
    try {
      await prisma.room.deleteMany({
        where: {
          room_code: {
            in: [
              'TESTLB',
              'TESTBD',
              'TESTUN',
              'TESTTR',
              'TESTXI',
              'TESTCP',
              'TMTIME',
              'TMEXPD',
              'NODBLS',
              'REPLAY',
              'TRDDBL',
              'XILOCK',
              'PURCHK',
            ],
          },
        },
      });
    } catch (e) {}
  });

  // =========================================================================
  // 1. Fallback blocked outside test mode
  // =========================================================================
  describe('1. In-memory fallback restricted strictly to NODE_ENV === test', () => {
    it('throws DatabaseConnectionError with status 503 when NODE_ENV is development and DB is unreachable', async () => {
      const origEnv = process.env.NODE_ENV;
      __setMockDbConnected(false);

      try {
        setNodeEnv('development');
        await expect(getDbAccess()).rejects.toThrow(DatabaseConnectionError);
        try {
          await getDbAccess();
        } catch (err: any) {
          expect(err.statusCode).toBe(503);
          expect(err.message).toContain('In-memory fallback is strictly disabled');
        }
      } finally {
        if (origEnv) setNodeEnv(origEnv);
        __setMockDbConnected(null);
      }
    });

    it('throws DatabaseConnectionError with status 503 when NODE_ENV is production and DB is unreachable', async () => {
      const origEnv = process.env.NODE_ENV;
      __setMockDbConnected(false);

      try {
        setNodeEnv('production');
        await expect(getDbAccess()).rejects.toThrow(DatabaseConnectionError);
      } finally {
        if (origEnv) setNodeEnv(origEnv);
        __setMockDbConnected(null);
      }
    });

    it('allows fallback (returns false without throwing) when NODE_ENV is test and DB is unreachable', async () => {
      const origEnv = process.env.NODE_ENV;
      __setMockDbConnected(false);

      try {
        setNodeEnv('test');
        const access = await getDbAccess();
        expect(access).toBe(false); // In test mode, false indicates test in-memory store
      } finally {
        if (origEnv) setNodeEnv(origEnv);
        __setMockDbConnected(null);
      }
    });
  });

  // =========================================================================
  // 2. Production startup validation
  // =========================================================================
  describe('2. Production startup configuration validation', () => {
    it('fails fast with exit code 1 if DATABASE_URL is missing in production', () => {
      const origEnv = { ...process.env };
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: any) => {
        throw new Error(`PROCESS_EXIT_${code}`);
      }) as any);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        setNodeEnv('production');
        process.env.SESSION_SECRET = 'valid-secret-123456';
        process.env.CLIENT_ORIGIN = 'http://localhost:3000';
        delete process.env.DATABASE_URL;

        expect(() => validateProductionEnv()).toThrow('PROCESS_EXIT_1');
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Missing required production environment variable: DATABASE_URL')
        );
      } finally {
        if (origEnv.NODE_ENV) setNodeEnv(origEnv.NODE_ENV);
        process.env = origEnv;
        exitSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('fails fast with exit code 1 if SESSION_SECRET and JWT_SECRET are missing in production', () => {
      const origEnv = { ...process.env };
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: any) => {
        throw new Error(`PROCESS_EXIT_${code}`);
      }) as any);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        setNodeEnv('production');
        process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
        process.env.CLIENT_ORIGIN = 'http://localhost:3000';
        delete process.env.SESSION_SECRET;
        delete process.env.JWT_SECRET;

        expect(() => validateProductionEnv()).toThrow('PROCESS_EXIT_1');
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Missing required production environment variable: SESSION_SECRET')
        );
      } finally {
        if (origEnv.NODE_ENV) setNodeEnv(origEnv.NODE_ENV);
        process.env = origEnv;
        exitSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('does NOT print secret values in logs during validation failure', () => {
      const origEnv = { ...process.env };
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('EXIT');
      }) as any);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        setNodeEnv('production');
        process.env.SESSION_SECRET = 'super-confidential-secret-999';
        delete process.env.DATABASE_URL;

        try {
          validateProductionEnv();
        } catch (e) {}

        for (const call of errorSpy.mock.calls) {
          expect(call.join(' ')).not.toContain('super-confidential-secret-999');
        }
      } finally {
        if (origEnv.NODE_ENV) setNodeEnv(origEnv.NODE_ENV);
        process.env = origEnv;
        exitSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('passes validation when all required production variables are set', () => {
      const origEnv = { ...process.env };
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      try {
        setNodeEnv('production');
        process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
        process.env.CLIENT_ORIGIN = 'https://my-ipl-app.com';
        process.env.SESSION_SECRET = 'strong-prod-session-key';

        expect(() => validateProductionEnv()).not.toThrow();
        expect(exitSpy).not.toHaveBeenCalled();
      } finally {
        if (origEnv.NODE_ENV) setNodeEnv(origEnv.NODE_ENV);
        process.env = origEnv;
        exitSpy.mockRestore();
      }
    });
  });

  // =========================================================================
  // 3. Runtime DB loss & recovery
  // =========================================================================
  describe('3. Runtime DB loss and recovery', () => {
    it('rejects database operations outside test mode when DB drops, then resumes on recovery', async () => {
      const origEnv = process.env.NODE_ENV;

      try {
        setNodeEnv('development');
        __setMockDbConnected(false);

        const dummyState: any = {
          room_code: 'DUMMY1',
          name: 'Dummy',
          host_session_id: 'host-1',
          stage: 'lobby',
          auction_state: { phase: 'lobby' },
        };

        // Snapshot attempt returns false because DB is unreachable
        const result = await persistRoomSnapshot(dummyState);
        expect(result).toBe(false);

        // Simulate DB recovers
        __setMockDbConnected(null);
        const isUp = await checkMySqlConnection(true);
        expect(isUp).toBe(true);
      } finally {
        if (origEnv) setNodeEnv(origEnv);
        __setMockDbConnected(null);
      }
    });
  });

  // =========================================================================
  // 4. Health endpoint
  // =========================================================================
  describe('4. Dedicated /health endpoint verification', () => {
    it('returns HTTP 200 with status ok and db connected when MySQL is reachable', async () => {
      __setMockDbConnected(null);
      const response = await httpGet(`http://localhost:${TEST_PORT}/health`);
      expect(response.statusCode).toBe(200);
      expect(response.data.status).toBe('ok');
      expect(response.data.db).toBe('connected');
      expect(typeof response.data.time).toBe('number');
    });

    it('returns HTTP 503 with status degraded and db disconnected when MySQL is unreachable', async () => {
      __setMockDbConnected(false);

      try {
        const response = await httpGet(`http://localhost:${TEST_PORT}/health`);
        expect(response.statusCode).toBe(503);
        expect(response.data.status).toBe('degraded');
        expect(response.data.db).toBe('disconnected');
        expect(response.data.error).toBe('Database connection failed');
      } finally {
        __setMockDbConnected(null);
      }
    });
  });

  // =========================================================================
  // 5. Restart recovery across stages
  // =========================================================================
  describe('5. State restoration across auction stages', () => {
    const mockIo = createMockIo();

    it('persists and restores a room in lobby stage', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('TESTLB', 'Lobby Test Room', 'host-lb', 'LobbyHost');
      rm1.joinRoom('TESTLB', 'guest-lb', 'LobbyGuest', 'sock-lb1');
      rm1.pickFranchise('TESTLB', 'guest-lb', FRANCHISE_PRESETS[0]);
      await rm1.saveRoomSnapshot('TESTLB', 'manual_save');

      // Create a fresh RoomManager (simulating server reboot)
      const rm2 = new RoomManager(mockIo);
      expect(rm2.getRoom('TESTLB')).toBeUndefined();

      const restored = await rm2.restoreRoomFromSnapshot('TESTLB');
      expect(restored).toBeDefined();

      const restoredRoom = rm2.getRoom('TESTLB');
      expect(restoredRoom).toBeDefined();
      expect(restoredRoom?.name).toBe('Lobby Test Room');
      expect(restoredRoom?.stage).toBe('lobby');
      expect(restoredRoom?.auction_state.phase).toBe('lobby');
      expect(restoredRoom?.participants.has('guest-lb')).toBe(true);
      expect(restoredRoom?.participants.get('guest-lb')?.franchise?.short_code).toBe(FRANCHISE_PRESETS[0].short_code);
    });

    it('persists and restores a room in bidding stage with current player, bid, bidder, and timer', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('TESTBD', 'Bidding Test Room', 'host-bd', 'BidHost');
      rm1.joinRoom('TESTBD', 'bidder-1', 'Bidder One', 'sock-bd1');
      rm1.pickFranchise('TESTBD', 'bidder-1', FRANCHISE_PRESETS[1]);

      // Set room into active bidding state
      room.auction_state.phase = 'bidding';
      room.auction_state.stage = 'main_auction';
      room.stage = 'main_auction';
      room.auction_state.current_player = ALL_PLAYERS[0];
      room.auction_state.current_bid = 50000000; // 5 Cr
      room.auction_state.current_bidder_id = 'bidder-1';
      room.auction_state.timer_ends_at = Date.now() + 20000; // 20s in future
      room.auction_state.timer_seconds = 20;

      await rm1.saveRoomSnapshot('TESTBD', 'bidding_snapshot');

      // Simulate reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('TESTBD');
      expect(restored).toBeDefined();

      const r = rm2.getRoom('TESTBD');
      expect(r).toBeDefined();
      expect(r?.stage).toBe('main_auction');
      expect(r?.auction_state.phase).toBe('bidding');
      expect(r?.auction_state.current_player?.id).toBe(ALL_PLAYERS[0].id);
      expect(r?.auction_state.current_bid).toBe(50000000);
      expect(r?.auction_state.current_bidder_id).toBe('bidder-1');
      expect(r?.auction_state.timer_ends_at).toBeGreaterThan(Date.now());
    });

    it('persists and restores a room in unsold_auction stage with unsold pool intact', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('TESTUN', 'Unsold Test Room', 'host-un', 'UnsoldHost');

      room.stage = 'unsold_auction';
      room.auction_state.stage = 'unsold_auction';
      room.auction_state.phase = 'bidding';
      room.unsold_pool = [ALL_PLAYERS[5], ALL_PLAYERS[6], ALL_PLAYERS[7]];
      room.auction_state.unsold_count = 3;

      await rm1.saveRoomSnapshot('TESTUN', 'unsold_snapshot');

      // Reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('TESTUN');
      expect(restored).toBeDefined();

      const r = rm2.getRoom('TESTUN');
      expect(r).toBeDefined();
      expect(r?.stage).toBe('unsold_auction');
      expect(r?.unsold_pool.length).toBe(3);
      expect(r?.unsold_pool.map((p) => p.id)).toEqual([
        ALL_PLAYERS[5].id,
        ALL_PLAYERS[6].id,
        ALL_PLAYERS[7].id,
      ]);
    });

    it('persists and restores a room in trading_window with pending trade offers intact', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('TESTTR', 'Trading Test Room', 'host-tr', 'TradeHost');
      rm1.joinRoom('TESTTR', 'trader-1', 'Trader 1', 'sock-tr1');
      rm1.joinRoom('TESTTR', 'trader-2', 'Trader 2', 'sock-tr2');

      const p1 = room.participants.get('trader-1')!;
      const p2 = room.participants.get('trader-2')!;
      p1.squad = [{ player_id: ALL_PLAYERS[1].id, player: ALL_PLAYERS[1], bought_for: 20000000, timestamp: Date.now() }];
      p2.squad = [{ player_id: ALL_PLAYERS[2].id, player: ALL_PLAYERS[2], bought_for: 20000000, timestamp: Date.now() }];
      room.stage = 'trading_window';
      room.auction_state.stage = 'trading_window';

      const tradeOffer: TradeOffer = {
        id: 'trade-offer-test-999',
        room_code: 'TESTTR',
        sender_id: 'trader-1',
        sender_name: 'Trader 1',
        sender_franchise: FRANCHISE_PRESETS[0],
        receiver_id: 'trader-2',
        receiver_name: 'Trader 2',
        receiver_franchise: FRANCHISE_PRESETS[1],
        offered_player: ALL_PLAYERS[1],
        requested_player: ALL_PLAYERS[2],
        status: 'pending',
        timestamp: Date.now(),
      };
      room.pending_trades.set(tradeOffer.id, tradeOffer);

      await rm1.saveRoomSnapshot('TESTTR', 'trade_snapshot');

      // Reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('TESTTR');
      expect(restored).toBeDefined();

      const r = rm2.getRoom('TESTTR');
      expect(r).toBeDefined();
      expect(r?.stage).toBe('trading_window');
      expect(r?.pending_trades.has('trade-offer-test-999')).toBe(true);
      const restoredOffer = r?.pending_trades.get('trade-offer-test-999');
      expect(restoredOffer?.offered_player.id).toBe(ALL_PLAYERS[1].id);
      expect(restoredOffer?.requested_player.id).toBe(ALL_PLAYERS[2].id);
    });

    it('persists and restores a room in playing_xi_selection with draft and locked lineups', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('TESTXI', 'XI Test Room', 'host-xi', 'XIHost');
      rm1.joinRoom('TESTXI', 'manager-xi', 'XI Manager', 'sock-xi');
      rm1.pickFranchise('TESTXI', 'manager-xi', FRANCHISE_PRESETS[2]);

      room.stage = 'playing_xi_selection';
      room.auction_state.stage = 'playing_xi_selection';
      room.auction_state.phase = 'bidding';

      const xiPlayers = ALL_PLAYERS.slice(0, 11);
      const xiSubmission: PlayingXISubmission = {
        participant_id: 'manager-xi',
        display_name: 'XI Manager',
        franchise: FRANCHISE_PRESETS[2],
        players: xiPlayers,
        batting_order: xiPlayers.map((p) => p.id),
        wicketkeeper_id: xiPlayers[2].id,
        captain_id: xiPlayers[0].id,
        substitutes: [],
        is_submitted: true,
        is_locked: true,
      };
      room.playing_xi_submissions.set('manager-xi', xiSubmission);

      await rm1.saveRoomSnapshot('TESTXI', 'xi_snapshot');

      // Reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('TESTXI');
      expect(restored).toBeDefined();

      const r = rm2.getRoom('TESTXI');
      expect(r).toBeDefined();
      expect(r?.stage).toBe('playing_xi_selection');
      expect(r?.playing_xi_submissions.has('manager-xi')).toBe(true);
      const sub = r?.playing_xi_submissions.get('manager-xi');
      expect(sub?.is_locked).toBe(true);
      expect(sub?.captain_id).toBe(ALL_PLAYERS[0].id);
      expect(sub?.players.length).toBe(11);
    });

    it('persists and restores a completed auction room with results retrievable', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('TESTCP', 'Complete Test Room', 'host-cp', 'CompleteHost');
      room.auction_state.phase = 'completed';
      room.auction_state.stage = 'championship_recap';
      room.stage = 'championship_recap';
      room.results = {
        room_code: 'TESTCP',
        completed_at: Date.now(),
        current_stage: 'championship_recap',
        awards: [],
        leaderboard: [],
        total_players_auctioned: 10,
        total_money_spent: 50000000,
        most_expensive_player: null,
        biggest_bidding_war: null,
        season_recap: {
          total_spent: 50000000,
          players_sold: 5,
          unsold_players_count: 5,
          highest_purchase: null,
          best_bargain: null,
          highest_spending_team: null,
          total_trades_completed: 2,
          champion_team: FRANCHISE_PRESETS[0],
        },
      };

      await rm1.saveRoomSnapshot('TESTCP', 'completed_snapshot');

      // Reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('TESTCP');
      expect(restored).toBeDefined();

      const r = rm2.getRoom('TESTCP');
      expect(r).toBeDefined();
      expect(r?.auction_state.phase).toBe('completed');
      expect(r?.results).toBeDefined();
      expect(r?.results?.season_recap?.total_spent).toBe(50000000);
    });
  });

  // =========================================================================
  // 6. Timer recovery: time remaining vs expired during downtime
  // =========================================================================
  describe('6. Timer recovery behavior on restart', () => {
    const mockIo = createMockIo();

    it('Case A: rehydrates with remaining timer seconds intact when now < timer_ends_at', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('TMTIME', 'Timer Test Room', 'host-tm', 'TimerHost');
      room.auction_state.phase = 'bidding';
      room.stage = 'main_auction';
      room.auction_state.current_player = ALL_PLAYERS[3];
      room.auction_state.timer_ends_at = Date.now() + 18000; // 18 seconds ahead
      room.auction_state.timer_seconds = 18;

      await rm1.saveRoomSnapshot('TMTIME', 'timer_active');

      // Reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('TMTIME');
      expect(restored).toBeDefined();

      const r = rm2.getRoom('TMTIME');
      expect(r).toBeDefined();
      expect(r?.auction_state.timer_ends_at).toBeGreaterThan(Date.now());
      expect(r?.auction_state.timer_seconds).toBeGreaterThanOrEqual(16);
      expect(r?.auction_state.timer_seconds).toBeLessThanOrEqual(18);
    });

    it('Case B: deterministically resolves expired player as SOLD when now >= timer_ends_at', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('TMEXPD', 'Expired Test Room', 'host-ex', 'ExpiredHost');
      rm1.joinRoom('TMEXPD', 'winner-user', 'Winner User', 'sock-win');

      const winner = room.participants.get('winner-user')!;
      winner.purse_remaining = 1000000000;
      winner.squad = [];

      room.auction_state.phase = 'bidding';
      room.stage = 'main_auction';
      room.auction_state.current_player = ALL_PLAYERS[4];
      room.auction_state.current_bid = 30000000; // 3 Cr
      room.auction_state.current_bidder_id = 'winner-user';
      // Timer expired 10 seconds ago during server downtime
      room.auction_state.timer_ends_at = Date.now() - 10000;
      room.auction_state.timer_seconds = 0;

      await rm1.saveRoomSnapshot('TMEXPD', 'timer_expired');

      // Reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('TMEXPD');
      expect(restored).toBeDefined();

      const r = rm2.getRoom('TMEXPD');
      expect(r).toBeDefined();

      // Deterministic resolution: player sold to winner-user
      const restoredWinner = r?.participants.get('winner-user');
      expect(restoredWinner?.squad.some((s: any) => s.player_id === ALL_PLAYERS[4].id || s.id === ALL_PLAYERS[4].id)).toBe(true);
      expect(restoredWinner?.purse_remaining).toBe(1000000000 - 30000000);
      expect(r?.all_completed_bids.some((b) => b.player_id === ALL_PLAYERS[4].id)).toBe(true);
      // Pauses room for reconnected managers to acknowledge resolution
      expect(r?.auction_state.is_paused).toBe(true);
    });
  });

  // =========================================================================
  // 7. No double-sale during recovery
  // =========================================================================
  describe('7. No double-sale prevention during reboot', () => {
    const mockIo = createMockIo();

    it('does not re-sell a player that is already recorded in all_completed_bids', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('NODBLS', 'No Double Sale Room', 'host-nd', 'NDHost');
      rm1.joinRoom('NODBLS', 'buyer-1', 'Buyer One', 'sock-nd1');

      const buyer = room.participants.get('buyer-1')!;
      buyer.purse_remaining = 900000000;
      buyer.squad = [
        { player_id: ALL_PLAYERS[8].id, player: ALL_PLAYERS[8], bought_for: 100000000, timestamp: Date.now() },
      ];

      // Record player as already completed
      room.all_completed_bids = [
        {
          player_id: ALL_PLAYERS[8].id,
          player: ALL_PLAYERS[8],
          bids_count: 3,
          final_price: 100000000,
          winner_id: 'buyer-1',
        },
      ];

      // Stale auction state might still have this player and expired timer
      room.auction_state.current_player = ALL_PLAYERS[8];
      room.auction_state.current_bidder_id = 'buyer-1';
      room.auction_state.current_bid = 100000000;
      room.auction_state.timer_ends_at = Date.now() - 5000;

      await rm1.saveRoomSnapshot('NODBLS', 'already_sold');

      // Reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('NODBLS');
      expect(restored).toBeDefined();

      const r = rm2.getRoom('NODBLS');
      const restoredBuyer = r?.participants.get('buyer-1');

      // Verify buyer has only 1 copy of the player (not 2)
      const matchingCount = restoredBuyer?.squad.filter((p) => p.player_id === ALL_PLAYERS[8].id).length;
      expect(matchingCount).toBe(1);
      // Purse was not deducted a second time
      expect(restoredBuyer?.purse_remaining).toBe(900000000);
      expect(r?.all_completed_bids.length).toBe(1);
    });
  });

  // =========================================================================
  // 8. Duplicate / replayed bid sequence rejected
  // =========================================================================
  describe('8. Bid idempotency and sequence number enforcement', () => {
    it('records first bid event, rejects duplicate sequence number via DB unique constraint', async () => {
      // Ensure host user and test room exist in database
      const hostUser = await prisma.user.upsert({
        where: { email: 'replay_host@test.com' },
        create: {
          name: 'Replay Host',
          email: 'replay_host@test.com',
          password_hash: 'hash123',
        },
        update: {},
      });

      await prisma.room.upsert({
        where: { room_code: 'REPLAY' },
        create: {
          room_code: 'REPLAY',
          name: 'Replay Test Room',
          host_user_id: hostUser.id,
          status: 'live',
        },
        update: {},
      });

      const seq = 1;
      const playerId = ALL_PLAYERS[0].id;

      // 1. First bid event insertion succeeds
      const firstResult = await recordBidEvent('REPLAY', playerId, seq, 'user-replay-1', 20000000);
      expect(firstResult).toBe(true);

      // 2. Second bid event with same [room_code, player_id, bid_sequence] is rejected
      const duplicateResult = await recordBidEvent('REPLAY', playerId, seq, 'user-replay-2', 25000000);
      expect(duplicateResult).toBe(false);

      // 3. Next sequence number succeeds
      const nextResult = await recordBidEvent('REPLAY', playerId, seq + 1, 'user-replay-2', 25000000);
      expect(nextResult).toBe(true);
    });
  });

  // =========================================================================
  // 9. Trade offers: survive restart and cannot be accepted twice
  // =========================================================================
  describe('9. Trade offer idempotency across restart', () => {
    const mockIo = createMockIo();

    it('restores pending trade offer and prevents double acceptance', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('TRDDBL', 'Trade Double Room', 'host-td', 'TDHost');
      rm1.joinRoom('TRDDBL', 'trader-a', 'Trader A', 'sock-a');
      rm1.joinRoom('TRDDBL', 'trader-b', 'Trader B', 'sock-b');

      const pa = room.participants.get('trader-a')!;
      const pb = room.participants.get('trader-b')!;
      pa.squad = [{ player_id: ALL_PLAYERS[10].id, player: ALL_PLAYERS[10], bought_for: 20000000, timestamp: Date.now() }];
      pb.squad = [{ player_id: ALL_PLAYERS[11].id, player: ALL_PLAYERS[11], bought_for: 20000000, timestamp: Date.now() }];
      room.stage = 'trading_window';

      const tradeOffer: TradeOffer = {
        id: 'offer-double-test-1',
        room_code: 'TRDDBL',
        sender_id: 'trader-a',
        sender_name: 'Trader A',
        sender_franchise: FRANCHISE_PRESETS[0],
        receiver_id: 'trader-b',
        receiver_name: 'Trader B',
        receiver_franchise: FRANCHISE_PRESETS[1],
        offered_player: ALL_PLAYERS[10],
        requested_player: ALL_PLAYERS[11],
        status: 'pending',
        timestamp: Date.now(),
      };
      room.pending_trades.set(tradeOffer.id, tradeOffer);

      await rm1.saveRoomSnapshot('TRDDBL', 'pending_trade');

      // Reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('TRDDBL');
      expect(restored).toBeDefined();

      // First acceptance succeeds
      const firstAccept = rm2.respondTrade('TRDDBL', 'trader-b', 'offer-double-test-1', 'accept');
      expect(firstAccept.success).toBe(true);

      // Second acceptance fails (already completed / removed from pending)
      const secondAccept = rm2.respondTrade('TRDDBL', 'trader-b', 'offer-double-test-1', 'accept');
      expect(secondAccept.success).toBe(false);

      // Swapped players verified
      const r = rm2.getRoom('TRDDBL');
      const restoredA = r?.participants.get('trader-a');
      const restoredB = r?.participants.get('trader-b');
      expect(restoredA?.squad.some((s: any) => s.player_id === ALL_PLAYERS[11].id || s.id === ALL_PLAYERS[11].id)).toBe(true);
      expect(restoredB?.squad.some((s: any) => s.player_id === ALL_PLAYERS[10].id || s.id === ALL_PLAYERS[10].id)).toBe(true);
    });
  });

  // =========================================================================
  // 10. Playing XI drafts: survive restart and locked state is preserved
  // =========================================================================
  describe('10. Playing XI locked state preservation', () => {
    const mockIo = createMockIo();

    it('preserves locked Playing XI submission across restart and prevents resubmission', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('XILOCK', 'XI Lock Room', 'host-xl', 'XLHost');
      rm1.joinRoom('XILOCK', 'manager-lock', 'Manager Lock', 'sock-xl');
      rm1.pickFranchise('XILOCK', 'manager-lock', FRANCHISE_PRESETS[0]);

      room.stage = 'playing_xi_selection';
      const manager = room.participants.get('manager-lock')!;
      const selected11 = ALL_PLAYERS.filter((p) => p.country === 'India' || p.nationality === 'India').slice(0, 11);
      manager.squad = selected11.map((p) => ({
        player_id: p.id,
        player: p,
        bought_for: 20000000,
        timestamp: Date.now(),
      }));

      const submission: any = {
        participant_id: 'manager-lock',
        franchise_short_code: 'CSK',
        players: selected11,
        captain_id: selected11[0].id,
        vice_captain_id: selected11[1].id,
        wicket_keeper_id: selected11[2].id,
        is_locked: true,
        submitted_at: Date.now(),
      };
      const submissionSuccess = rm1.submitPlayingXI('XILOCK', 'manager-lock', submission);
      expect(submissionSuccess.success).toBe(true);

      await rm1.saveRoomSnapshot('XILOCK', 'xi_locked');

      // Reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('XILOCK');
      expect(restored).toBeDefined();

      const r = rm2.getRoom('XILOCK');
      expect(r?.playing_xi_submissions.get('manager-lock')?.is_locked).toBe(true);

      // Attempting to overwrite locked submission is rejected
      const overwriteAttempt = rm2.submitPlayingXI('XILOCK', 'manager-lock', submission);
      expect(overwriteAttempt.success).toBe(false);
      expect(overwriteAttempt.error).toContain('already been submitted and locked');
    });
  });

  // =========================================================================
  // 11. Purses, role counts, spent amounts, and squads identical
  // =========================================================================
  describe('11. Complete financial and squad integrity across restart', () => {
    const mockIo = createMockIo();

    it('ensures purses, spent amounts, role counts, and squad arrays are identical', async () => {
      const rm1 = new RoomManager(mockIo);
      const room = rm1.createRoom('PURCHK', 'Purse Check Room', 'host-pc', 'PCHost');
      rm1.joinRoom('PURCHK', 'user-pc1', 'PC Manager', 'sock-pc1');

      const p = room.participants.get('user-pc1')!;
      p.purse_remaining = 745000000;
      p.amount_spent = 255000000;
      p.avg_purchase_price = 127500000;
      p.spent_by_role = { BAT: 150000000, BOWL: 105000000, AR: 0, WK: 0 };
      p.role_counts = { BAT: 1, BOWL: 1, AR: 0, WK: 0, overseas: 1 };
      p.squad = [
        { player_id: ALL_PLAYERS[0].id, player: ALL_PLAYERS[0], bought_for: 150000000, timestamp: Date.now() },
        { player_id: ALL_PLAYERS[1].id, player: ALL_PLAYERS[1], bought_for: 105000000, timestamp: Date.now() },
      ]; // 2 players
      p.squad_shortages = ['Need at least 3 more Batters', 'Need at least 1 Wicketkeeper'];
      p.squad_excesses = [];

      await rm1.saveRoomSnapshot('PURCHK', 'purse_snapshot');

      // Reboot
      const rm2 = new RoomManager(mockIo);
      const restored = await rm2.restoreRoomFromSnapshot('PURCHK');
      expect(restored).toBeDefined();

      const r = rm2.getRoom('PURCHK');
      const rp = r?.participants.get('user-pc1')!;

      expect(rp.purse_remaining).toBe(745000000);
      expect(rp.amount_spent).toBe(255000000);
      expect(rp.avg_purchase_price).toBe(127500000);
      expect(rp.spent_by_role).toEqual({ BAT: 150000000, BOWL: 105000000, AR: 0, WK: 0 });
      expect(rp.role_counts).toEqual({ BAT: 1, BOWL: 1, AR: 0, WK: 0, overseas: 1 });
      expect(rp.squad.length).toBe(2);
      expect(rp.squad[0].player_id).toBe(ALL_PLAYERS[0].id);
      expect(rp.squad[1].player_id).toBe(ALL_PLAYERS[1].id);
      expect(rp.squad_shortages).toEqual(['Need at least 3 more Batters', 'Need at least 1 Wicketkeeper']);
    });
  });
});
