import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket } from 'socket.io-client';
import { createServer } from 'http';
import { NextRequest } from 'next/server';
import { RoomManager, ALL_MANAGERS_EXITED_REASON, AUCTION_TERMINATED_ERROR } from '../room';
import { server as appServer, startServer, roomManager as liveRoomManager } from '../index';
import { db, prisma } from '../../src/lib/db';
import { hashPassword, createSession } from '../../src/lib/auth';
import { FRANCHISE_PRESETS, DEFAULT_ROOM_SETTINGS, DEFAULT_PKL_ROOM_SETTINGS } from '../../src/shared/constants';
import { PKL_FRANCHISES } from '../../src/shared/pkl-player-data';
import { GET as getMyRooms } from '../../src/app/api/my-rooms/route';
import { GET as getHistory } from '../../src/app/api/history/route';
import { SportType } from '../../src/shared/types';

function createTrackedIo() {
  const emittedToRoom: Array<{ room: string; event: string; payload: any }> = [];
  const emittedToTarget: Array<{ target: string; event: string; payload: any }> = [];

  const mockIo = {
    to(target: string) {
      return {
        emit(event: string, payload?: any) {
          emittedToRoom.push({ room: target, event, payload });
          emittedToTarget.push({ target, event, payload });
        },
      };
    },
    emit(event: string, payload?: any) {
      emittedToRoom.push({ room: '*', event, payload });
    },
  } as unknown as SocketIOServer;

  return { mockIo, emittedToRoom, emittedToTarget };
}

function setupStartedAuction(
  rm: RoomManager,
  roomCode: string,
  sport: SportType,
  managerIds: string[],
  spectatorIds: string[] = []
) {
  const isPkl = sport === 'PKL';
  const franchises = isPkl ? PKL_FRANCHISES : FRANCHISE_PRESETS;
  const hostId = managerIds[0];

  const room = rm.createRoom(roomCode, `${sport} Termination Room`, hostId, 'Manager 1', sport);
  for (let i = 1; i < managerIds.length; i++) {
    rm.joinRoom(roomCode, managerIds[i], `Manager ${i + 1}`, `sock-${managerIds[i]}`);
  }
  for (let s = 0; s < spectatorIds.length; s++) {
    rm.joinRoom(roomCode, spectatorIds[s], `Spectator ${s + 1}`, `sock-${spectatorIds[s]}`, true);
  }

  for (let i = 0; i < managerIds.length; i++) {
    rm.pickFranchise(roomCode, managerIds[i], franchises[i]);
  }
  rm.updateSettings(roomCode, hostId, { squad_size: isPkl ? 12 : 2, timer_seconds: 15 });

  expect(rm.startAuction(roomCode, hostId)).toBe(true);
  rm.nextPlayer(room);
  rm.startBiddingPhase(room);
  return room;
}

describe('Automatic Auction Termination & Disqualification (IPL & PKL)', () => {
  const createdRooms: string[] = [];
  const createdUserEmails: string[] = [];

  afterAll(async () => {
    for (const code of createdRooms) {
      await prisma.room.deleteMany({ where: { room_code: code } }).catch(() => {});
    }
    if (createdUserEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: createdUserEmails } } }).catch(() => {});
    }
  });

  describe.each<SportType>(['IPL', 'PKL'])('%s Sport Lifecycle & Exit Matrix', (sport) => {
    it(`1-3. Three managers (${sport}): first exits (active=2), second exits (active=1), final exits (terminated=true)`, () => {
      const { mockIo, emittedToRoom } = createTrackedIo();
      const rm = new RoomManager(mockIo);
      const code = `${sport === 'PKL' ? 'KP' : 'IP'}3${Math.floor(100 + Math.random() * 899)}`;
      const managers = [`${sport}-m1`, `${sport}-m2`, `${sport}-m3`];

      const room = setupStartedAuction(rm, code, sport, managers);
      expect(rm.evaluateActiveParticipantsAndTerminate(code).activeCount).toBe(3);

      // Manager A exits
      expect(rm.leaveRoom(code, managers[0])).toBe(true);
      expect(rm.isRoomTerminated(room)).toBe(false);
      expect(rm.evaluateActiveParticipantsAndTerminate(code).activeCount).toBe(2);
      expect(emittedToRoom.filter(e => e.event === 'auction_terminated')).toHaveLength(0);

      // Remaining manager can place bid
      const player = room.auction_state.current_player!;
      expect(rm.placeBid(code, managers[1], player.base_price, true)).toBe(true);

      // Manager B exits
      expect(rm.leaveRoom(code, managers[1])).toBe(true);
      expect(rm.isRoomTerminated(room)).toBe(false);
      expect(rm.evaluateActiveParticipantsAndTerminate(code).activeCount).toBe(1);
      expect(emittedToRoom.filter(e => e.event === 'auction_terminated')).toHaveLength(0);

      // Final manager C exits -> immediate automatic termination
      expect(rm.leaveRoom(code, managers[2])).toBe(true);
      expect(rm.isRoomTerminated(room)).toBe(true);
      expect(room.status).toBe('terminated');
      expect(room.auction_state.phase).toBe('terminated');
      expect(room.termination_reason).toBe(ALL_MANAGERS_EXITED_REASON);
      expect(room.terminated_by_system).toBe(true);
      expect(room.terminated_at).toBeGreaterThan(0);

      // All 3 participating managers permanently disqualified
      for (const id of managers) {
        const p = room.participants.get(id)!;
        expect(p.participation_status).toBe('DISQUALIFIED');
        expect(p.disqualification_reason).toBe(ALL_MANAGERS_EXITED_REASON);
        expect(p.disqualified_at).toBeGreaterThan(0);
      }

      // Emitted auction_terminated exactly once with required fields
      const termEvents = emittedToRoom.filter(e => e.event === 'auction_terminated');
      expect(termEvents).toHaveLength(1);
      expect(termEvents[0].payload.roomCode).toBe(code);
      expect(termEvents[0].payload.reason).toBe(ALL_MANAGERS_EXITED_REASON);
      expect(termEvents[0].payload.terminatedAt).toBeGreaterThan(0);
      expect(termEvents[0].payload.message).toMatch(/disqualified/i);

      // Historical data preserved (commentary, bids, participants)
      expect(room.participants.size).toBe(3);
      expect(room.auction_state.bids.length).toBeGreaterThan(0);
      expect(room.commentary_events.length).toBeGreaterThan(0);

      rm.removeRoom(code);
    });

    it(`4-5. Two managers (${sport}): first exits (continues), second exits (terminates)`, () => {
      const { mockIo, emittedToRoom } = createTrackedIo();
      const rm = new RoomManager(mockIo);
      const code = `${sport === 'PKL' ? 'K2' : 'I2'}${Math.floor(1000 + Math.random() * 8999)}`;
      const managers = [`${sport}-2m1`, `${sport}-2m2`];

      const room = setupStartedAuction(rm, code, sport, managers);

      expect(rm.leaveRoom(code, managers[0])).toBe(true);
      expect(rm.isRoomTerminated(room)).toBe(false);
      expect(rm.evaluateActiveParticipantsAndTerminate(code).activeCount).toBe(1);

      expect(rm.leaveRoom(code, managers[1])).toBe(true);
      expect(rm.isRoomTerminated(room)).toBe(true);
      expect(emittedToRoom.filter(e => e.event === 'auction_terminated')).toHaveLength(1);

      rm.removeRoom(code);
    });

    it(`6. Rejoin before termination (${sport}): manager exits and rejoins while another remains, restoring active state`, () => {
      const { mockIo } = createTrackedIo();
      const rm = new RoomManager(mockIo);
      const code = `${sport === 'PKL' ? 'KR' : 'IR'}${Math.floor(1000 + Math.random() * 8999)}`;
      const managers = [`${sport}-rj1`, `${sport}-rj2`];

      const room = setupStartedAuction(rm, code, sport, managers);
      const p1Before = room.participants.get(managers[0])!;
      const originalFranchise = p1Before.franchise!;
      const originalPurse = p1Before.purse_remaining;

      // Manager 1 exits
      expect(rm.leaveRoom(code, managers[0])).toBe(true);
      expect(room.participants.get(managers[0])?.has_exited).toBe(true);
      expect(room.participants.get(managers[0])?.participation_status).toBe('EXITED');
      expect(rm.evaluateActiveParticipantsAndTerminate(code).activeCount).toBe(1);

      // Manager 1 rejoins before termination
      const rejoined = rm.joinRoom(code, managers[0], 'Manager 1', 'sock-rj1-new');
      expect(rejoined).toBeDefined();
      const p1After = room.participants.get(managers[0])!;
      expect(p1After.is_connected).toBe(true);
      expect(p1After.has_exited).toBe(false);
      expect(p1After.participation_status).toBe('ACTIVE');
      expect(p1After.franchise?.short_code).toBe(originalFranchise.short_code);
      expect(p1After.purse_remaining).toBe(originalPurse);
      expect(rm.evaluateActiveParticipantsAndTerminate(code).activeCount).toBe(2);

      // Now Manager 2 exits -> Manager 1 is active, so auction continues!
      expect(rm.leaveRoom(code, managers[1])).toBe(true);
      expect(rm.isRoomTerminated(room)).toBe(false);
      expect(rm.evaluateActiveParticipantsAndTerminate(code).activeCount).toBe(1);

      rm.removeRoom(code);
    });

    it(`7-9. Temporary disconnections & browser refreshes (${sport}): NEVER trigger termination`, () => {
      const { mockIo, emittedToRoom } = createTrackedIo();
      const rm = new RoomManager(mockIo);
      const code = `${sport === 'PKL' ? 'KD' : 'ID'}${Math.floor(1000 + Math.random() * 8999)}`;
      const managers = [`${sport}-dc1`, `${sport}-dc2`, `${sport}-dc3`];

      const room = setupStartedAuction(rm, code, sport, managers);

      // 7. Single unexpected Socket.IO disconnect
      rm.handleDisconnect(`sock-${managers[1]}`);
      expect(room.participants.get(managers[1])?.is_connected).toBe(false);
      expect(room.participants.get(managers[1])?.has_exited).toBe(false);
      expect(rm.isRoomTerminated(room)).toBe(false);

      // 8. Refresh browser (disconnect + rejoin)
      rm.joinRoom(code, managers[1], 'Manager 2', `sock-${managers[1]}-refreshed`);
      expect(room.participants.get(managers[1])?.is_connected).toBe(true);
      expect(rm.isRoomTerminated(room)).toBe(false);

      // 9. ALL managers disconnect unexpectedly via Socket.IO
      rm.handleDisconnect(`sock-${managers[0]}`);
      rm.handleDisconnect(`sock-${managers[1]}-refreshed`);
      rm.handleDisconnect(`sock-${managers[2]}`);

      const evalAfterDisconnects = rm.evaluateActiveParticipantsAndTerminate(code);
      expect(evalAfterDisconnects.terminated).toBe(false);
      expect(evalAfterDisconnects.activeCount).toBe(3);
      expect(rm.isRoomTerminated(room)).toBe(false);
      expect(emittedToRoom.filter(e => e.event === 'auction_terminated')).toHaveLength(0);

      rm.removeRoom(code);
    });

    it(`10. Simultaneous exits & idempotency (${sport}): terminates exactly once`, async () => {
      const { mockIo, emittedToRoom } = createTrackedIo();
      const rm = new RoomManager(mockIo);
      const code = `${sport === 'PKL' ? 'KS' : 'IS'}${Math.floor(1000 + Math.random() * 8999)}`;
      const managers = [`${sport}-sim1`, `${sport}-sim2`, `${sport}-sim3`];

      const room = setupStartedAuction(rm, code, sport, managers);

      // Rapid simultaneous exit calls
      await Promise.all(managers.map(id => Promise.resolve(rm.leaveRoom(code, id))));

      expect(rm.isRoomTerminated(room)).toBe(true);
      expect(emittedToRoom.filter(e => e.event === 'auction_terminated')).toHaveLength(1);

      // Subsequent evaluate / terminate / leave calls are idempotent and emit no duplicates
      const secondEval = rm.evaluateActiveParticipantsAndTerminate(code);
      expect(secondEval.terminated).toBe(true);
      expect(secondEval.alreadyTerminated).toBe(true);
      expect(rm.terminateAuction(room)).toBe(false);
      expect(rm.leaveRoom(code, managers[0])).toBe(false);
      expect(emittedToRoom.filter(e => e.event === 'auction_terminated')).toHaveLength(1);

      rm.removeRoom(code);
    });

    it(`11-12. Post-termination rejection (${sport}): blocks rejoin, bids, pass, stages, trading, host controls with AUCTION_TERMINATED`, () => {
      const { mockIo, emittedToTarget } = createTrackedIo();
      const rm = new RoomManager(mockIo);
      const code = `${sport === 'PKL' ? 'KB' : 'IB'}${Math.floor(1000 + Math.random() * 8999)}`;
      const managers = [`${sport}-blk1`, `${sport}-blk2`];

      const room = setupStartedAuction(rm, code, sport, managers);
      const activePlayer = room.auction_state.current_player!;

      rm.leaveRoom(code, managers[0]);
      rm.leaveRoom(code, managers[1]);
      expect(rm.isRoomTerminated(room)).toBe(true);

      emittedToTarget.length = 0;

      // Reject join / rejoin
      expect(rm.joinRoom(code, managers[0], 'Manager 1', 'sock-rejoin')).toBeNull();
      expect(rm.joinRoom(code, 'new-user', 'New User', 'sock-new')).toBeNull();
      expect(
        emittedToTarget.some(e => e.event === 'error_message' && e.payload?.code === AUCTION_TERMINATED_ERROR)
      ).toBe(true);

      // Reject bids, pass/withdraw, next player
      expect(rm.placeBid(code, managers[0], activePlayer.base_price, true)).toBe(false);
      expect(rm.passPlayer(code, managers[1])).toBe(false);
      expect(rm.withdrawBid(code, managers[1])).toBe(false);
      expect(rm.requestNextPlayer(code, managers[0])).toBe(false);

      // Reject stage transitions, Round 2, Trade Round, Playing XI, host controls, conclude
      expect(rm.transitionStage(code, managers[0], 'unsold_auction')).toBe(false);
      expect(rm.transitionStage(code, managers[0], 'trading_window')).toBe(false);
      expect(rm.configureUnsoldPool(code, managers[0], [activePlayer.id])).toBe(false);
      expect(rm.proposeTrade(code, managers[0], managers[1], activePlayer.id, activePlayer.id).error).toContain(
        AUCTION_TERMINATED_ERROR
      );
      expect(rm.respondTrade(code, managers[1], 'fake-trade', 'accept').error).toContain(AUCTION_TERMINATED_ERROR);
      expect(rm.submitPlayingXI(code, managers[0], {
        participant_id: managers[0],
        display_name: 'Manager 1',
        franchise: room.participants.get(managers[0])!.franchise!,
        players: [],
        batting_order: [],
        wicketkeeper_id: '',
        substitutes: [],
        is_submitted: false,
      }).error).toContain(AUCTION_TERMINATED_ERROR);
      expect(rm.endAuctionEarly(code, managers[0])).toBe(false);
      expect(rm.pauseAuction(code, managers[0])).toBe(false);
      expect(rm.resumeAuction(code, managers[0])).toBe(false);
      expect(rm.skipPlayer(code, managers[0])).toBe(false);
      expect(rm.kickParticipant(code, managers[0], managers[1])).toBe(false);
      expect(rm.transferHost(code, managers[0], managers[1])).toBe(false);
      expect(rm.setSpectatorMode(code, managers[1], true)).toBe(false);

      rm.removeRoom(code);
    });

    it(`15. Spectator exits (${sport}): spectator exit never triggers termination; remaining spectator does not block termination`, () => {
      const { mockIo, emittedToRoom } = createTrackedIo();
      const rm = new RoomManager(mockIo);
      const code = `${sport === 'PKL' ? 'KT' : 'IT'}${Math.floor(1000 + Math.random() * 8999)}`;
      const managers = [`${sport}-sp-m1`, `${sport}-sp-m2`];
      const spectators = [`${sport}-spec1`, `${sport}-spec2`];

      const room = setupStartedAuction(rm, code, sport, managers, spectators);

      // Both spectators exit -> 2 active managers remain -> NO termination
      expect(rm.leaveRoom(code, spectators[0])).toBe(true);
      expect(rm.leaveRoom(code, spectators[1])).toBe(true);
      expect(rm.isRoomTerminated(room)).toBe(false);
      expect(rm.evaluateActiveParticipantsAndTerminate(code).activeCount).toBe(2);

      // Add a 3rd spectator who stays connected
      rm.joinRoom(code, `${sport}-spec3`, 'Spectator 3', 'sock-spec3', true);

      // Both managers exit -> even though spectator 3 is still connected, active managers = 0 -> terminates!
      expect(rm.leaveRoom(code, managers[0])).toBe(true);
      expect(rm.isRoomTerminated(room)).toBe(false);
      expect(rm.leaveRoom(code, managers[1])).toBe(true);
      expect(rm.isRoomTerminated(room)).toBe(true);
      expect(emittedToRoom.filter(e => e.event === 'auction_terminated')).toHaveLength(1);

      rm.removeRoom(code);
    });
  });

  it('14. Legacy rooms without new termination metadata restore and operate cleanly', async () => {
    const { mockIo } = createTrackedIo();
    const rm = new RoomManager(mockIo);
    const code = `LEG${Math.floor(100 + Math.random() * 899)}`;

    const legacySnapshot: any = {
      schema_version: 1,
      saved_at: Date.now(),
      room_code: code,
      name: 'Legacy IPL Room',
      host_session_id: 'legacy-h1',
      host_disconnect_time: null,
      settings: { ...DEFAULT_ROOM_SETTINGS, squad_size: 2 },
      participants: [
        {
          id: 'legacy-h1',
          room_code: code,
          display_name: 'Legacy Host',
          team_name: 'Chennai Super Kings',
          franchise: FRANCHISE_PRESETS[0],
          purse_remaining: DEFAULT_ROOM_SETTINGS.purse,
          squad: [],
          has_withdrawn_current: false,
          is_host: true,
          is_connected: false,
          last_active: Date.now(),
        },
        {
          id: 'legacy-g1',
          room_code: code,
          display_name: 'Legacy Guest',
          team_name: 'Mumbai Indians',
          franchise: FRANCHISE_PRESETS[1],
          purse_remaining: DEFAULT_ROOM_SETTINGS.purse,
          squad: [],
          has_withdrawn_current: false,
          is_host: false,
          is_connected: false,
          last_active: Date.now(),
        },
      ],
      auction_state: {
        room_code: code,
        phase: 'bidding',
        stage: 'main_auction',
        round_number: 1,
        current_player_index: 0,
        current_player: null,
        current_bid: 0,
        current_bidder_id: null,
        timer_seconds: 15,
        timer_ends_at: Date.now() + 15000,
        server_time: Date.now(),
        bids: [],
        withdrawn_participant_ids: [],
        total_pool_count: 10,
        remaining_pool_count: 10,
        sold_count: 0,
        unsold_count: 0,
        is_paused: false,
      },
      pool: [],
      unsold_pool: [],
      all_completed_bids: [],
      results: null,
      stage: 'main_auction',
      pending_trades: [],
      completed_trades: [],
      playing_xi_submissions: [],
      commentary_events: [],
    };

    const restored = await rm.restoreRoomFromSnapshot(legacySnapshot);
    expect(restored).toBeDefined();
    expect(rm.isRoomTerminated(restored)).toBe(false);
    expect(restored!.participants.get('legacy-h1')?.participation_status).toBe('ACTIVE');
    expect(restored!.participants.get('legacy-h1')?.has_exited).toBe(false);

    // Works with new exit rule too
    rm.leaveRoom(code, 'legacy-h1');
    expect(rm.isRoomTerminated(restored)).toBe(false);
    rm.leaveRoom(code, 'legacy-g1');
    expect(rm.isRoomTerminated(restored)).toBe(true);
    rm.removeRoom(code);
  });

  it('13. Full MySQL Persistence, Server Restart Recovery, Socket.IO Flow, My Rooms & History Isolation', async () => {
    const TEST_PORT = 3011;
    await startServer(TEST_PORT);
    const serverUrl = `http://localhost:${TEST_PORT}`;

    const ts = Date.now();
    const passHash = await hashPassword('TermPass123!');
    const emails = [`term_m1_${ts}@test.com`, `term_m2_${ts}@test.com`, `term_m3_${ts}@test.com`];
    createdUserEmails.push(...emails);

    const users = await Promise.all(
      emails.map((email, idx) =>
        db.user.create({
          data: { name: `Term Manager ${idx + 1}`, email, password_hash: passHash },
        })
      )
    );
    const sessions = await Promise.all(users.map(u => createSession(u.id)));
    const tokens = sessions.map(s => s.sessionToken);

    const roomCode = `TM${String(ts).slice(-4)}`;
    createdRooms.push(roomCode);

    await prisma.room.create({
      data: {
        room_code: roomCode,
        name: 'Persistent Termination Arena',
        host_user_id: users[0].id,
        status: 'lobby',
        sport_type: 'IPL',
      },
    });

    const room = liveRoomManager.createRoom(roomCode, 'Persistent Termination Arena', users[0].id, users[0].name, 'IPL');

    const sockets: Socket[] = tokens.map(token =>
      ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
        auth: { token },
      })
    );

    try {
      // Connect and join all 3 managers via Socket.IO
      await Promise.all(
        sockets.map(
          (sock, idx) =>
            new Promise<void>((resolve, reject) => {
              const t = setTimeout(() => reject(new Error(`Socket ${idx} join timeout`)), 5000);
              sock.on('state_sync', () => {
                clearTimeout(t);
                resolve();
              });
              sock.on('connect', () => {
                sock.emit('room_join', {
                  room_code: roomCode,
                  display_name: users[idx].name,
                  session_id: users[idx].id,
                });
              });
            })
        )
      );

      // Pick franchises & start auction
      liveRoomManager.pickFranchise(roomCode, users[0].id, FRANCHISE_PRESETS[0]);
      liveRoomManager.pickFranchise(roomCode, users[1].id, FRANCHISE_PRESETS[1]);
      liveRoomManager.pickFranchise(roomCode, users[2].id, FRANCHISE_PRESETS[2]);
      liveRoomManager.updateSettings(roomCode, users[0].id, { squad_size: 2, timer_seconds: 15 });
      expect(liveRoomManager.startAuction(roomCode, users[0].id)).toBe(true);
      liveRoomManager.nextPlayer(room);
      liveRoomManager.startBiddingPhase(room);

      // Place a bid so historical bid record exists
      const activePlayer = room.auction_state.current_player!;
      expect(liveRoomManager.placeBid(roomCode, users[0].id, activePlayer.base_price, true)).toBe(true);

      // Manager 1 & 2 exit via Socket.IO
      sockets[0].emit('room_leave', { room_code: roomCode, session_id: users[0].id });
      await new Promise(r => setTimeout(r, 100));
      expect(liveRoomManager.isRoomTerminated(room)).toBe(false);

      sockets[1].emit('room_leave', { room_code: roomCode, session_id: users[1].id });
      await new Promise(r => setTimeout(r, 100));
      expect(liveRoomManager.isRoomTerminated(room)).toBe(false);

      // Manager 3 listens for auction_terminated and exits via Socket.IO
      const termPayloadPromise = new Promise<any>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Did not receive auction_terminated')), 5000);
        sockets[2].once('auction_terminated', (payload) => {
          clearTimeout(t);
          resolve(payload);
        });
      });

      sockets[2].emit('room_leave', { room_code: roomCode, session_id: users[2].id });
      const termPayload = await termPayloadPromise;
      expect(termPayload.roomCode).toBe(roomCode);
      expect(termPayload.reason).toBe(ALL_MANAGERS_EXITED_REASON);

      // Wait for DB persistence to settle
      let dbRoom: any = null;
      for (let i = 0; i < 20; i++) {
        dbRoom = await prisma.room.findUnique({ where: { room_code: roomCode } });
        if (dbRoom?.status === 'terminated') break;
        await new Promise(r => setTimeout(r, 100));
      }

      expect(dbRoom?.status).toBe('terminated');
      expect(dbRoom?.termination_reason).toBe(ALL_MANAGERS_EXITED_REASON);
      expect(dbRoom?.terminated_by_system).toBe(true);
      expect(dbRoom?.terminated_at).not.toBeNull();

      const dbParticipants = await prisma.roomParticipant.findMany({ where: { room_code: roomCode } });
      expect(dbParticipants.length).toBe(3);
      for (const dp of dbParticipants) {
        expect(dp.participation_status).toBe('DISQUALIFIED');
        expect(dp.disqualification_reason).toBe(ALL_MANAGERS_EXITED_REASON);
        expect(dp.disqualified_at).not.toBeNull();
      }

      // Historical bid_events preserved in DB
      const bidEvents = await prisma.bidEvent.findMany({ where: { room_code: roomCode } });
      expect(bidEvents.length).toBeGreaterThan(0);

      // Check My Rooms & History APIs: never listed as active/ongoing/resumable
      const myRoomsReq = new NextRequest('http://localhost:3000/api/my-rooms', {
        headers: { Authorization: `Bearer ${tokens[0]}` },
      });
      const myRoomsRes = await getMyRooms(myRoomsReq);
      const myRoomsData = await myRoomsRes.json();
      const myRoomEntry = myRoomsData.rooms.find((r: any) => r.room_code === roomCode);
      expect(myRoomEntry).toBeDefined();
      expect(myRoomEntry.status).toBe('terminated');
      expect(myRoomEntry.status_group).toBe('terminated');
      expect(myRoomEntry.user_participation_status).toBe('DISQUALIFIED');

      const historyReq = new NextRequest('http://localhost:3000/api/history', {
        headers: { Authorization: `Bearer ${tokens[0]}` },
      });
      const historyRes = await getHistory(historyReq);
      const historyData = await historyRes.json();
      expect(historyData.ongoing.some((r: any) => r.room_code === roomCode)).toBe(false);
      expect(historyData.completed.some((r: any) => r.room_code === roomCode)).toBe(false);
      expect(historyData.terminated.some((r: any) => r.room_code === roomCode)).toBe(true);

      // Simulate server restart: evict from memory, reconnect with Socket.IO, verify rejoin rejected & termination persists
      liveRoomManager.removeRoom(roomCode);
      expect(liveRoomManager.getRoom(roomCode)).toBeUndefined();

      const rejoinSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
        auth: { token: tokens[0] },
      });

      const rejoinEvents = await new Promise<{ terminated: any; error: any }>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Rejoin check timed out')), 5000);
        let terminated: any = null;
        let error: any = null;
        const done = () => {
          if (terminated && error) {
            clearTimeout(t);
            resolve({ terminated, error });
          }
        };
        rejoinSocket.on('auction_terminated', (p) => {
          terminated = p;
          done();
        });
        rejoinSocket.on('error_message', (e) => {
          error = e;
          done();
        });
        rejoinSocket.on('connect', () => {
          rejoinSocket.emit('room_join', {
            room_code: roomCode,
            display_name: users[0].name,
            session_id: users[0].id,
          });
        });
      });

      expect(rejoinEvents.error.code).toBe(AUCTION_TERMINATED_ERROR);
      expect(rejoinEvents.terminated.roomCode).toBe(roomCode);
      expect(rejoinEvents.terminated.reason).toBe(ALL_MANAGERS_EXITED_REASON);

      rejoinSocket.disconnect();
    } finally {
      sockets.forEach(s => {
        if (s.connected) s.disconnect();
      });
      liveRoomManager.removeRoom(roomCode);
      await new Promise<void>(resolve => appServer.close(() => resolve()));
    }
  });
});
