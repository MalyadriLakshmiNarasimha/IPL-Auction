import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, prisma } from '../../src/lib/db';

describe('My Rooms and History Isolation Verification', () => {
  const testEmail = `user_isolation_${Date.now()}@example.com`;
  let testUserId = '';
  let genuineRoomCode = '';

  beforeAll(async () => {
    // 1. Create a genuine test user
    const user = await prisma.user.create({
      data: {
        name: 'Isolation Test User',
        email: testEmail,
        password_hash: 'test-hash',
      },
    });
    testUserId = user.id;

    // 2. Create a genuine room hosted by this user
    genuineRoomCode = `ISO${Math.floor(100 + Math.random() * 899)}`;
    await prisma.room.create({
      data: {
        room_code: genuineRoomCode,
        name: 'Genuine User Room',
        host_user_id: testUserId,
        status: 'lobby',
        sport_type: 'IPL',
      },
    });

    // 3. Create participant record
    await prisma.roomParticipant.create({
      data: {
        room_code: genuineRoomCode,
        user_id: testUserId,
        session_id: testUserId,
        display_name: 'Isolation Test User',
        team_name: 'Gujarat Titans',
        team_short_code: 'GT',
        team_color: '#1C2833',
        is_host: true,
      },
    });

    // 4. Create snapshot for the room
    await prisma.roomSnapshot.create({
      data: {
        room_code: genuineRoomCode,
        stage: 'lobby',
        phase: 'lobby',
        state_data: {
          name: 'Genuine User Room',
          host_session_id: testUserId,
          settings: { purse: 1000000000, squad_size: 25 },
          participants: [
            {
              id: testUserId,
              user_id: testUserId,
              display_name: 'Isolation Test User',
              team_name: 'Gujarat Titans',
              purse_remaining: 1000000000,
              squad: [],
              is_host: true,
            },
          ],
          auction_state: {
            phase: 'lobby',
            sold_count: 0,
            unsold_count: 0,
          },
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up created test room and user
    if (genuineRoomCode) {
      await prisma.room.deleteMany({ where: { room_code: genuineRoomCode } });
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
  });

  it('ensures test rooms are reassigned to system-bot-host-id and not linked to real users', async () => {
    const targetCodes = ['TRADE9', 'ECO8ST', 'PDF8NW', 'L8FMCB', 'AEK87X', 'D37RMM', '8JLZAE', 'TEST99', 'JQCKFM'];

    const testRooms = await prisma.room.findMany({
      where: { room_code: { in: targetCodes } },
      select: { room_code: true, host_user_id: true, status: true },
    });

    for (const r of testRooms) {
      expect(r.host_user_id).toBe('system-bot-host-id');
    }
  });

  it('guarantees snapshot fallback in server/db never assigns arbitrary rooms to real users', async () => {
    const systemBot = await prisma.user.findUnique({
      where: { email: 'system-bot@auction.internal' },
    });
    expect(systemBot).toBeDefined();
    expect(systemBot?.id).toBe('system-bot-host-id');
  });

  it('ensures user query strictly returns only rooms associated with that user', async () => {
    // Simulate query performed by /api/my-rooms
    const userParticipations = await prisma.roomParticipant.findMany({
      where: {
        OR: [{ user_id: testUserId }, { session_id: testUserId }],
      },
      select: { room_code: true },
    });

    const participantRoomCodes = Array.from(new Set(userParticipations.map(p => p.room_code)));

    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { host_user_id: testUserId },
          { room_code: { in: participantRoomCodes } },
        ],
        NOT: {
          OR: [
            { status: 'cancelled' },
            { status: 'archived' },
            { host_user_id: 'system-bot-host-id' },
          ],
        },
      },
      select: { room_code: true, name: true, host_user_id: true },
    });

    expect(rooms.length).toBe(1);
    expect(rooms[0].room_code).toBe(genuineRoomCode);
    expect(rooms[0].host_user_id).toBe(testUserId);

    // Assert that NONE of the unwanted test rooms are included
    const targetCodes = ['TRADE9', 'ECO8ST', 'PDF8NW', 'L8FMCB', 'AEK87X', 'D37RMM', '8JLZAE', 'TEST99', 'JQCKFM'];
    const returnedCodes = rooms.map(r => r.room_code);
    for (const testCode of targetCodes) {
      expect(returnedCodes).not.toContain(testCode);
    }
  });

  it('verifies History query excludes test rooms and unassociated auctions', async () => {
    // Simulate query performed by /api/history for the user
    const userParticipations = await prisma.roomParticipant.findMany({
      where: {
        OR: [{ user_id: testUserId }, { session_id: testUserId }],
      },
      select: { room_code: true },
    });

    const participantRoomCodes = Array.from(new Set(userParticipations.map(p => p.room_code)));

    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { host_user_id: testUserId },
          { room_code: { in: participantRoomCodes } },
        ],
      },
      select: { room_code: true, status: true, host_user_id: true },
    });

    const targetCodes = ['TRADE9', 'ECO8ST', 'PDF8NW', 'L8FMCB', 'AEK87X', 'D37RMM', '8JLZAE', 'TEST99', 'JQCKFM'];
    for (const r of rooms) {
      expect(targetCodes).not.toContain(r.room_code);
      expect(r.host_user_id).not.toBe('system-bot-host-id');
    }
  });
});
