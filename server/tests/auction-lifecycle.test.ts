import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server, startServer } from '../index';
import { io as ioClient, Socket } from 'socket.io-client';
import { db, prisma } from '../../src/lib/db';
import { hashPassword, createSession } from '../../src/lib/auth';
import { FRANCHISE_PRESETS } from '../../src/shared/constants';
import http from 'http';

const TEST_PORT = 3003;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

function waitForState(socket: Socket, predicate: (state: any) => boolean, timeoutMs = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('state_sync', handler);
      reject(new Error(`waitForState timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const handler = (data: any) => {
      if (predicate(data)) {
        clearTimeout(timer);
        socket.off('state_sync', handler);
        resolve(data);
      }
    };
    socket.on('state_sync', handler);
  });
}

describe('Full End-to-End Auction Lifecycle & Multi-Client Synchronization', () => {
  let hostUser: any;
  let guestUser: any;
  let hostToken: string;
  let guestToken: string;
  let hostSocket: Socket;
  let guestSocket: Socket;
  let roomCode: string;

  beforeAll(async () => {
    await startServer(TEST_PORT);

    // Clean up test emails if pre-existing
    try {
      await prisma.user.deleteMany({
        where: {
          email: { in: ['lifecycle_host@test.com', 'lifecycle_guest@test.com'] },
        },
      });
    } catch (e) {}

    // 1. Create two test users in MySQL
    const hash = await hashPassword('TestPass123!');
    hostUser = await db.user.create({
      data: {
        name: 'Auction Host',
        email: 'lifecycle_host@test.com',
        password_hash: hash,
      },
    });

    guestUser = await db.user.create({
      data: {
        name: 'Auction Guest',
        email: 'lifecycle_guest@test.com',
        password_hash: hash,
      },
    });

    const hostSess = await createSession(hostUser.id);
    const guestSess = await createSession(guestUser.id);
    hostToken = hostSess.sessionToken;
    guestToken = guestSess.sessionToken;
  });

  afterAll(async () => {
    if (hostSocket?.connected) hostSocket.disconnect();
    if (guestSocket?.connected) guestSocket.disconnect();

    // Drain queued background snapshots before deleting test entities
    await new Promise((r) => setTimeout(r, 250));

    // Clean up test records
    try {
      if (roomCode) {
        await prisma.result.deleteMany({ where: { room_code: roomCode } });
        await prisma.room.deleteMany({ where: { room_code: roomCode } });
      }
      await prisma.user.deleteMany({
        where: {
          email: { in: ['lifecycle_host@test.com', 'lifecycle_guest@test.com'] },
        },
      });
    } catch (e) {}

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. Host creates an auction room via REST API and verifies MySQL record', async () => {
    const postData = JSON.stringify({ room_name: 'Super Kings Championship Arena' });

    const createRes = await new Promise<{ status: number; body: any }>((resolve) => {
      const req = http.request(
        `${SERVER_URL}/api/rooms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            Authorization: `Bearer ${hostToken}`,
          },
        },
        (res) => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            resolve({
              status: res.statusCode || 500,
              body: JSON.parse(data),
            });
          });
        }
      );
      req.write(postData);
      req.end();
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.room_code).toBeDefined();
    expect(createRes.body.room_code).toHaveLength(6);
    roomCode = createRes.body.room_code;

    // Verify room was written to MySQL database
    const dbRoom = await db.room.findUnique({ where: { room_code: roomCode } });
    expect(dbRoom).not.toBeNull();
    expect(dbRoom?.name).toBe('Super Kings Championship Arena');
    expect(dbRoom?.host_user_id).toBe(hostUser.id);
    expect(dbRoom?.status).toBe('lobby');
  });

  it('2. Both Host and Guest join room via Socket.IO with state synchronization', async () => {
    hostSocket = ioClient(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true,
      auth: { token: hostToken },
    });

    guestSocket = ioClient(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true,
      auth: { token: guestToken },
    });

    await Promise.all([
      new Promise<void>((resolve) => hostSocket.on('connect', resolve)),
      new Promise<void>((resolve) => guestSocket.on('connect', resolve)),
    ]);

    expect(hostSocket.connected).toBe(true);
    expect(guestSocket.connected).toBe(true);

    // Host joins and waits for state containing host
    const hostWaitPromise = waitForState(hostSocket, (s) =>
      s.participants.some((p: any) => p.id === hostUser.id)
    );
    hostSocket.emit('room_join', {
      room_code: roomCode,
      display_name: hostUser.name,
      session_id: hostUser.id,
    });
    const hostState = await hostWaitPromise;
    expect(hostState.room_code).toBe(roomCode);
    expect(hostState.participants.length).toBe(1);

    // Guest joins and waits for state containing both participants
    const guestWaitPromise = waitForState(guestSocket, (s) =>
      s.participants.length === 2 && s.participants.some((p: any) => p.id === guestUser.id)
    );
    guestSocket.emit('room_join', {
      room_code: roomCode,
      display_name: guestUser.name,
      session_id: guestUser.id,
    });
    const guestState = await guestWaitPromise;
    expect(guestState.participants.length).toBe(2);
  });

  it('3. Both participants claim distinct franchise identities', async () => {
    const cskFranchise = FRANCHISE_PRESETS[0]; // CSK
    const miFranchise = FRANCHISE_PRESETS[1]; // MI

    // Host picks CSK
    const hostWaitPromise = waitForState(hostSocket, (s) =>
      s.participants.some((p: any) => p.id === hostUser.id && p.franchise?.short_code === 'CSK')
    );
    hostSocket.emit('franchise_pick', {
      room_code: roomCode,
      session_id: hostUser.id,
      franchise: cskFranchise,
    });
    await hostWaitPromise;

    // Guest picks MI
    const guestWaitPromise = waitForState(guestSocket, (s) =>
      s.participants.some((p: any) => p.id === guestUser.id && p.franchise?.short_code === 'MI')
    );
    guestSocket.emit('franchise_pick', {
      room_code: roomCode,
      session_id: guestUser.id,
      franchise: miFranchise,
    });
    const finalState = await guestWaitPromise;

    const hostPart = finalState.participants.find((p: any) => p.id === hostUser.id);
    const guestPart = finalState.participants.find((p: any) => p.id === guestUser.id);
    expect(hostPart.franchise?.short_code).toBe('CSK');
    expect(guestPart.franchise?.short_code).toBe('MI');
  });

  it('4. Host updates settings and starts auction with synchronized countdown', async () => {
    // Configure fast timer and 2 squad size for rapid deterministic testing
    hostSocket.emit('settings_update', {
      room_code: roomCode,
      session_id: hostUser.id,
      settings: {
        timer_seconds: 2,
        squad_size: 2,
        purse: 1000000000, // 100 Cr
      },
    });

    const startPromise = new Promise<any>((resolve) => {
      guestSocket.once('next_player', resolve);
      hostSocket.emit('start_auction', {
        room_code: roomCode,
        session_id: hostUser.id,
      });
    });

    const nextPlayerData = await startPromise;
    expect(nextPlayerData.player).toBeDefined();
    expect(nextPlayerData.player.name).toBeDefined();
    expect(nextPlayerData.auction_state.phase).toBe('announcing');

    // Authoritative Announcement: clients signal completion, transitioning server to bidding phase
    const biddingPromise = new Promise<any>((resolve) => {
      guestSocket.once('bidding_started', resolve);
      hostSocket.emit('announcement_completed', {
        room_code: roomCode,
        session_id: hostUser.id,
        player_id: nextPlayerData.player.id,
      });
      guestSocket.emit('announcement_completed', {
        room_code: roomCode,
        session_id: guestUser.id,
        player_id: nextPlayerData.player.id,
      });
    });

    const biddingData = await biddingPromise;
    expect(biddingData.auction_state.phase).toBe('bidding');
    expect(biddingData.auction_state.timer_ends_at).toBeGreaterThan(Date.now());

    // Verify MySQL room status changed to 'live'
    const dbRoomLive = await db.room.findUnique({ where: { room_code: roomCode } });
    expect(dbRoomLive?.status).toBe('live');
  });

  it('5. Live bidding, validation enforcement, and purse calculations', async () => {
    // Guest places opening bid at base price
    const openingBidPromise = new Promise<any>((resolve) => {
      hostSocket.once('bid_success', resolve);
      guestSocket.emit('place_bid', {
        room_code: roomCode,
        session_id: guestUser.id,
        increment: 2500000,
      });
    });

    const openingBidData = await openingBidPromise;
    expect(openingBidData.bid.participant_id).toBe(guestUser.id);
    expect(openingBidData.auction_state.current_bidder_id).toBe(guestUser.id);

    // Guest cannot bid again immediately (already leading)
    const rejectPromise = new Promise<any>((resolve) => {
      guestSocket.once('bid_rejected', resolve);
      guestSocket.emit('place_bid', {
        room_code: roomCode,
        session_id: guestUser.id,
        increment: 2500000,
      });
    });

    const rejectData = await rejectPromise;
    expect(rejectData.reason).toMatch(/already the highest bidder/i);

    // Host places counter-bid (+₹25 Lakh)
    const counterBidPromise = new Promise<any>((resolve) => {
      guestSocket.once('bid_success', resolve);
      hostSocket.emit('place_bid', {
        room_code: roomCode,
        session_id: hostUser.id,
        increment: 2500000,
      });
    });

    const counterBidData = await counterBidPromise;
    expect(counterBidData.bid.participant_id).toBe(hostUser.id);
    expect(counterBidData.auction_state.current_bidder_id).toBe(hostUser.id);

    // Guest withdraws from current player
    const withdrawPromise = new Promise<any>((resolve) => {
      hostSocket.once('player_sold', resolve);
      guestSocket.emit('withdraw_bid', {
        room_code: roomCode,
        session_id: guestUser.id,
      });
    });

    // When all opponents withdraw, instant gavel strike is triggered!
    const soldData = await withdrawPromise;
    expect(soldData.winner.id).toBe(hostUser.id);
    expect(soldData.price).toBe(counterBidData.bid.amount);

    // Host purse remaining must be strictly: 100 Cr - winning bid
    const expectedPurse = 1000000000 - counterBidData.bid.amount;
    expect(soldData.winner.purse_remaining).toBe(expectedPurse);
    expect(soldData.winner.squad.length).toBe(1);
    expect(soldData.winner.squad[0].player.name).toBe(soldData.player.name);
  });

  it('6. Auction completion, results persistence in MySQL, and permalink verification', async () => {
    const completePromise = new Promise<any>((resolve) => {
      guestSocket.once('auction_ended', resolve);
      hostSocket.emit('host_end_auction', {
        room_code: roomCode,
        session_id: hostUser.id,
      });
    });

    const results = await completePromise;
    expect(results.room_code).toBe(roomCode);
    expect(results.leaderboard.length).toBe(2);
    expect(results.total_players_auctioned).toBe(1);
    expect(results.awards.length).toBeGreaterThan(0);

    // Give MySQL 600ms to persist async
    await new Promise((r) => setTimeout(r, 600));

    // Verify room status in MySQL is updated to 'completed'
    const dbRoomCompleted = await db.room.findUnique({ where: { room_code: roomCode } });
    expect(dbRoomCompleted?.status).toBe('completed');

    // Verify results record exists in results table
    const dbResult = await db.result.findUnique({ where: { room_code: roomCode } });
    expect(dbResult).not.toBeNull();
    expect(dbResult?.room_code).toBe(roomCode);
    expect(dbResult?.total_players_auctioned).toBe(1);

    // Verify GET /api/results/[code] endpoint retrieves persisted results
    const fetchRes = await new Promise<{ status: number; body: any }>((resolve) => {
      http.get(`${SERVER_URL}/api/results/${roomCode}`, (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 500,
            body: JSON.parse(data),
          });
        });
      });
    });

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.room_code).toBe(roomCode);
    expect(fetchRes.body.total_players_auctioned).toBe(1);
    expect(fetchRes.body.leaderboard.length).toBe(2);
  });
});
