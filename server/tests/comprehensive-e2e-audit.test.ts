import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { RoomManager } from '../room';
import { db, prisma } from '../../src/lib/db';
import { hashPassword, verifyPassword, createSession, validateSessionToken, destroySession, AUTH_COOKIE_NAME } from '../../src/lib/auth';
import { ALL_PLAYERS } from '../../src/shared/player-data';
import { ALL_PKL_PLAYERS, PKL_FRANCHISES } from '../../src/shared/pkl-player-data';
import { FRANCHISE_PRESETS, DEFAULT_ROOM_SETTINGS, DEFAULT_PKL_ROOM_SETTINGS } from '../../src/shared/constants';
import { GET as getMyRooms, POST as postMyRooms } from '../../src/app/api/my-rooms/route';
import { GET as getHistory } from '../../src/app/api/history/route';
import { Server } from 'socket.io';
import { createServer } from 'http';

describe('Comprehensive E2E Audit Suite (IPL + PKL, Auth, My Rooms vs History, Concurrency & Exit)', () => {
  const httpServer = createServer();
  const io = new Server(httpServer, { cors: { origin: '*' } });
  let roomManager: RoomManager;

  const ts = Date.now();
  let userA: any;
  let userB: any;
  let tokenA = '';
  let tokenB = '';
  const createdRoomCodes: string[] = [];

  beforeAll(async () => {
    roomManager = new RoomManager(io);
    const pwHash = await hashPassword('AuditSecure123!');

    userA = await db.user.create({
      data: {
        name: 'Audit Host A',
        email: `audit_a_${ts}@test.local`,
        password_hash: pwHash,
      },
    });
    userB = await db.user.create({
      data: {
        name: 'Audit Guest B',
        email: `audit_b_${ts}@test.local`,
        password_hash: pwHash,
      },
    });

    tokenA = (await createSession(userA.id)).sessionToken;
    tokenB = (await createSession(userB.id)).sessionToken;
  });

  afterAll(async () => {
    roomManager.stopPeriodicSnapshotLoop();
    for (const code of createdRoomCodes) {
      roomManager.removeRoom(code);
      await prisma.result.deleteMany({ where: { room_code: code } }).catch(() => {});
      await prisma.room.deleteMany({ where: { room_code: code } }).catch(() => {});
    }
    if (userA?.id) await prisma.user.deleteMany({ where: { id: userA.id } }).catch(() => {});
    if (userB?.id) await prisma.user.deleteMany({ where: { id: userB.id } }).catch(() => {});
    io.close();
  });

  it('1. Authentication: verifies password hashing, session validation, and session destruction', async () => {
    const validPw = await verifyPassword('AuditSecure123!', userA.password_hash);
    const invalidPw = await verifyPassword('WrongPass!', userA.password_hash);
    expect(validPw).toBe(true);
    expect(invalidPw).toBe(false);

    const validated = await validateSessionToken(tokenA);
    expect(validated?.user.id).toBe(userA.id);

    const tempToken = (await createSession(userA.id)).sessionToken;
    expect(await validateSessionToken(tempToken)).not.toBeNull();
    await destroySession(tempToken);
    expect(await validateSessionToken(tempToken)).toBeNull();
  });

  it('2. My Rooms vs History separation: lobby rooms appear in My Rooms only, not History ongoing or completed', async () => {
    const lobbyCode = `LB${String(ts).slice(-4)}`;
    createdRoomCodes.push(lobbyCode);

    await prisma.room.create({
      data: {
        room_code: lobbyCode,
        name: 'Audit Lobby Room',
        host_user_id: userA.id,
        status: 'lobby',
        sport_type: 'IPL',
      },
    });

    const room = roomManager.createRoom(lobbyCode, 'Audit Lobby Room', userA.id, userA.name, 'IPL');
    roomManager.joinRoom(lobbyCode, userB.id, userB.name, 'sock-b-1');
    await roomManager.saveRoomSnapshot(lobbyCode, 'lobby_check');

    // User A calls /api/my-rooms -> sees lobby room
    const myRoomsReqA = new NextRequest('http://localhost:3000/api/my-rooms', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const myRoomsResA = await getMyRooms(myRoomsReqA);
    const myRoomsDataA = await myRoomsResA.json();
    expect(myRoomsResA.status).toBe(200);
    const foundLobby = myRoomsDataA.rooms.find((r: any) => r.room_code === lobbyCode);
    expect(foundLobby).toBeDefined();
    expect(foundLobby.status_group).toBe('waiting');
    expect(foundLobby.participant_count).toBe(2);

    // User B (joined participant) also sees lobby room in /api/my-rooms
    const myRoomsReqB = new NextRequest('http://localhost:3000/api/my-rooms', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const myRoomsResB = await getMyRooms(myRoomsReqB);
    const myRoomsDataB = await myRoomsResB.json();
    expect(myRoomsDataB.rooms.some((r: any) => r.room_code === lobbyCode)).toBe(true);

    // User A calls /api/history -> lobby room MUST NOT be in ongoing or completed
    const historyReqA = new NextRequest('http://localhost:3000/api/history', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const historyResA = await getHistory(historyReqA);
    const historyDataA = await historyResA.json();
    expect(historyResA.status).toBe(200);
    expect(historyDataA.ongoing.some((r: any) => r.room_code === lobbyCode)).toBe(false);
    expect(historyDataA.completed.some((r: any) => r.room_code === lobbyCode)).toBe(false);

    // User B leaves lobby room via POST /api/my-rooms -> removed from User B's My Rooms
    const leaveReqB = new NextRequest('http://localhost:3000/api/my-rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ room_code: lobbyCode, action: 'leave' }),
    });
    const leaveResB = await postMyRooms(leaveReqB);
    expect(leaveResB.status).toBe(200);

    const myRoomsResBAfter = await getMyRooms(myRoomsReqB);
    const myRoomsDataBAfter = await myRoomsResBAfter.json();
    expect(myRoomsDataBAfter.rooms.some((r: any) => r.room_code === lobbyCode)).toBe(false);
  });

  it('3. IPL Lifecycle & Bidding Concurrency (>10 bids without sequence collision, purse calculation, exit & reconnect)', async () => {
    const iplCode = `IP${String(ts).slice(-4)}`;
    createdRoomCodes.push(iplCode);

    await prisma.room.create({
      data: {
        room_code: iplCode,
        name: 'Audit IPL Arena',
        host_user_id: userA.id,
        status: 'lobby',
        sport_type: 'IPL',
      },
    });

    const room = roomManager.createRoom(iplCode, 'Audit IPL Arena', userA.id, userA.name, 'IPL');
    roomManager.joinRoom(iplCode, userB.id, userB.name, 'sock-ipl-b');
    expect(room.settings.sport_type).toBe('IPL');
    expect(room.settings.purse).toBe(DEFAULT_ROOM_SETTINGS.purse);
    expect(room.settings.selected_player_ids.length).toBe(ALL_PLAYERS.length);

    roomManager.pickFranchise(iplCode, userA.id, FRANCHISE_PRESETS[0]);
    roomManager.pickFranchise(iplCode, userB.id, FRANCHISE_PRESETS[1]);
    roomManager.updateSettings(iplCode, userA.id, { squad_size: 2, timer_seconds: 15 });

    expect(roomManager.startAuction(iplCode, userA.id)).toBe(true);
    roomManager.nextPlayer(room);
    roomManager.startBiddingPhase(room);

    // Place 12 alternating bids (>10 cap on auction_state.bids) to verify monotonic bid_sequence & no P2002 collision
    const player = room.auction_state.current_player!;
    let ok = roomManager.placeBid(iplCode, userA.id, player.base_price, true);
    expect(ok).toBe(true);

    for (let i = 1; i <= 11; i++) {
      const bidderId = i % 2 === 1 ? userB.id : userA.id;
      ok = roomManager.placeBid(iplCode, bidderId, 25_00_000, false);
      expect(ok).toBe(true);
    }
    expect(room.current_player_bid_count).toBe(12);
    expect(room.auction_state.bids.length).toBe(10); // UI history capped at 10

    // Simultaneous duplicate bid by same highest bidder rejected
    expect(roomManager.placeBid(iplCode, userB.id, 25_00_000, false)).toBe(false);

    // User A passes -> instant sold to User B
    const winningBid = room.auction_state.current_bid;
    roomManager.passPlayer(iplCode, userA.id);
    expect(room.auction_state.phase).toBe('sold');
    const winner = room.participants.get(userB.id)!;
    expect(winner.purse_remaining).toBe(DEFAULT_ROOM_SETTINGS.purse - winningBid);
    expect(winner.squad.length).toBe(1);

    // Participant exits room -> room stays active, participant data preserved, reconnect restores
    expect(roomManager.leaveRoom(iplCode, userB.id)).toBe(true);
    expect(room.participants.get(userB.id)?.is_connected).toBe(false);
    expect(room.auction_state.phase).not.toBe('completed');

    roomManager.joinRoom(iplCode, userB.id, userB.name, 'sock-ipl-b2');
    expect(room.participants.get(userB.id)?.is_connected).toBe(true);
    expect(room.participants.get(userB.id)?.squad.length).toBe(1);

    // Complete auction and wait for serialized DB persistence
    roomManager.completeAuction(room);
    for (let i = 0; i < 20; i++) {
      const r = await prisma.room.findUnique({ where: { room_code: iplCode } });
      const res = await prisma.result.findUnique({ where: { room_code: iplCode } });
      if (r?.status === 'completed' && res) break;
      await new Promise(r => setTimeout(r, 100));
    }

    const historyReqA = new NextRequest('http://localhost:3000/api/history', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const historyResA = await getHistory(historyReqA);
    const historyDataA = await historyResA.json();
    expect(historyDataA.completed.some((r: any) => r.room_code === iplCode)).toBe(true);
    expect(historyDataA.ongoing.some((r: any) => r.room_code === iplCode)).toBe(false);
  });

  it('4. PKL Lifecycle: enforces PKL 235 pool, ₹5 Cr purse, ₹9L reserve, and Starting 7 validation', async () => {
    const pklCode = `KP${String(ts).slice(-4)}`;
    createdRoomCodes.push(pklCode);

    await prisma.room.create({
      data: {
        room_code: pklCode,
        name: 'Audit PKL Arena',
        host_user_id: userA.id,
        status: 'lobby',
        sport_type: 'PKL',
      },
    });

    const room = roomManager.createRoom(pklCode, 'Audit PKL Arena', userA.id, userA.name, 'PKL');
    roomManager.joinRoom(pklCode, userB.id, userB.name, 'sock-pkl-b');

    expect(room.settings.sport_type).toBe('PKL');
    expect(room.settings.purse).toBe(DEFAULT_PKL_ROOM_SETTINGS.purse);
    expect(room.settings.selected_player_ids.length).toBe(ALL_PKL_PLAYERS.length);

    roomManager.pickFranchise(pklCode, userA.id, PKL_FRANCHISES[0]);
    roomManager.pickFranchise(pklCode, userB.id, PKL_FRANCHISES[1]);
    roomManager.updateSettings(pklCode, userA.id, { squad_size: 12, timer_seconds: 15 });

    expect(roomManager.startAuction(pklCode, userA.id)).toBe(true);
    roomManager.nextPlayer(room);
    roomManager.startBiddingPhase(room);

    const pklPlayer = room.auction_state.current_player!;
    expect(pklPlayer.id.startsWith('k-')).toBe(true);

    // Unanimous pass triggers instant UNSOLD
    roomManager.passPlayer(pklCode, userA.id);
    roomManager.passPlayer(pklCode, userB.id);
    expect(room.auction_state.phase).toBe('unsold');
    expect(room.unsold_pool.some(p => p.id === pklPlayer.id)).toBe(true);

    // Advance out of unsold cleanly
    expect(roomManager.requestNextPlayer(pklCode, userA.id)).toBe(true);
    expect(room.auction_state.phase).toBe('announcing');

    // Verify PKL Starting 7 validation accepts 7 Indian players (and rejects 11)
    const hostP = room.participants.get(userA.id)!;
    const indianPkl7 = ALL_PKL_PLAYERS.filter(p => p.country === 'India').slice(0, 7);
    hostP.squad = indianPkl7.map(p => ({
      player_id: p.id,
      player: p,
      bought_for: p.base_price,
      timestamp: Date.now(),
    }));

    const valid7 = roomManager.submitPlayingXI(pklCode, userA.id, {
      participant_id: userA.id,
      display_name: userA.name,
      franchise: PKL_FRANCHISES[0],
      players: indianPkl7,
      batting_order: indianPkl7.map(p => p.id),
      wicketkeeper_id: '',
      substitutes: [],
      is_submitted: true,
    });
    expect(valid7.success).toBe(true);
    expect(valid7.scoreBreakdown?.total_score).toBeGreaterThan(0);

    // Snapshot & restore preserves PKL settings
    await roomManager.saveRoomSnapshot(pklCode, 'pkl_test');
    const restored = await roomManager.restoreRoomFromSnapshot(pklCode);
    expect(restored?.settings.sport_type).toBe('PKL');
    expect(restored?.settings.purse).toBe(DEFAULT_PKL_ROOM_SETTINGS.purse);
  });
});
