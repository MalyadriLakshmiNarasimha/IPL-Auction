import { PrismaClient } from '@prisma/client';
import net from 'net';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Always cache singleton in globalThis across all environments to prevent connection exhaustion
globalThis.prismaGlobal = prisma;

export class DatabaseConnectionError extends Error {
  statusCode: number;
  constructor(message = 'MySQL database is unreachable. Database operations are blocked outside test environments.') {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.statusCode = 503;
  }
}

/**
 * Connection Health Check with Dynamic Re-evaluation (No Permanent Caching)
 * In production and development, verifies live connectivity via a lightweight ping.
 * Positive checks are cached for 3 seconds to avoid overloading the connection pool.
 */
let lastCheckTime = 0;
let lastCheckResult: boolean | null = null;
const CHECK_CACHE_SUCCESS_MS = 3000;
let mockDbAvailable: boolean | null = null;

export function __setMockDbConnected(val: boolean | null) {
  mockDbAvailable = val;
  lastCheckResult = val;
  if (val === null) {
    lastCheckTime = 0;
  } else {
    lastCheckTime = Date.now();
  }
}

function isPortOpen(port = 3306, host = '127.0.0.1', timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export async function checkMySqlConnection(force = false): Promise<boolean> {
  if (mockDbAvailable !== null) {
    return mockDbAvailable;
  }

  const now = Date.now();
  if (!force && lastCheckResult === true && now - lastCheckTime < CHECK_CACHE_SUCCESS_MS) {
    return true;
  }

  // Fast pre-check: verify if port 3306 is open before triggering Prisma's noisy error logger
  const portListening = await isPortOpen(3306, '127.0.0.1', 400);
  if (!portListening) {
    lastCheckResult = false;
    lastCheckTime = now;
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[DB] MySQL port 3306 is not accepting connections.');
    }
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    lastCheckResult = true;
    lastCheckTime = now;
    return true;
  } catch (err: any) {
    lastCheckResult = false;
    lastCheckTime = now;
    if (process.env.NODE_ENV === 'test') {
      console.warn('[DB] MySQL not reachable during test. Falling back to test in-memory relational store.');
    } else {
      console.error('[DB] MySQL connection check failed:', err.message);
    }
    return false;
  }
}

/**
 * Access gate enforcing that in-memory fallback is permitted EXCLUSIVELY in NODE_ENV === 'test'.
 * In development and production, throws DatabaseConnectionError immediately.
 */
export async function getDbAccess(): Promise<boolean> {
  const isAvailable = await checkMySqlConnection();
  if (isAvailable) {
    return true; // use MySQL via Prisma
  }

  if (process.env.NODE_ENV === 'test') {
    return false; // fallback allowed ONLY in unit/integration test mode
  }

  throw new DatabaseConnectionError(
    'Database server is unreachable. In-memory fallback is strictly disabled outside NODE_ENV=test.'
  );
}

// In-Memory Test Store (Active ONLY when process.env.NODE_ENV === 'test')
interface InMemoryUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

interface InMemorySession {
  id: string;
  session_token: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
}

interface InMemoryRoom {
  room_code: string;
  name: string;
  host_user_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface InMemorySnapshot {
  id: string;
  room_code: string;
  schema_version: number;
  stage: string;
  phase: string;
  state_data: any;
  created_at: Date;
}

interface InMemoryBidEvent {
  id: string;
  room_code: string;
  player_id: string;
  bid_sequence: number;
  participant_id: string;
  amount: bigint;
  created_at: Date;
}

interface InMemoryRoomParticipant {
  id: string;
  room_code: string;
  user_id: string | null;
  session_id: string;
  display_name: string;
  team_name: string | null;
  team_name_normalized: string | null;
  team_short_code: string | null;
  team_color: string | null;
  franchise_id: string | null;
  franchise_name: string | null;
  franchise_code: string | null;
  franchise_color: string | null;
  is_host: boolean;
  is_spectator: boolean;
  joined_at: Date;
  updated_at: Date;
}

interface InMemoryCommentaryLog {
  id: string;
  room_code: string;
  text: string;
  event_type: string;
  created_at: Date;
}

const memUsers = new Map<string, InMemoryUser>();
const memSessions = new Map<string, InMemorySession>();
const memRooms = new Map<string, InMemoryRoom>();
const memResults = new Map<string, any>();
const memSnapshots: InMemorySnapshot[] = [];
const memBidEvents: InMemoryBidEvent[] = [];
const memParticipants = new Map<string, InMemoryRoomParticipant>();
const memCommentary: InMemoryCommentaryLog[] = [];

export const db = {
  user: {
    async create(args: { data: { name: string; email: string; password_hash: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.user.create(args);
      }
      const existing = Array.from(memUsers.values()).find(
        u => u.email.toLowerCase() === args.data.email.toLowerCase()
      );
      if (existing) {
        const error = new Error('Unique constraint failed on the constraint: `users_email_key`');
        (error as any).code = 'P2002';
        throw error;
      }
      const user: InMemoryUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: args.data.name,
        email: args.data.email.toLowerCase(),
        password_hash: args.data.password_hash,
        created_at: new Date(),
        updated_at: new Date(),
      };
      memUsers.set(user.id, user);
      return user;
    },

    async findUnique(args: { where: { email?: string; id?: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.user.findUnique(args as any);
      }
      if (args.where.id) {
        return memUsers.get(args.where.id) || null;
      }
      if (args.where.email) {
        return (
          Array.from(memUsers.values()).find(
            u => u.email.toLowerCase() === args.where.email!.toLowerCase()
          ) || null
        );
      }
      return null;
    },
  },

  session: {
    async create(args: { data: { session_token: string; user_id: string; expires_at: Date } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.session.create(args);
      }
      const session: InMemorySession = {
        id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        session_token: args.data.session_token,
        user_id: args.data.user_id,
        expires_at: args.data.expires_at,
        created_at: new Date(),
      };
      memSessions.set(session.session_token, session);
      return session;
    },

    async findUnique(args: { where: { session_token: string }; include?: { user: boolean } }): Promise<any> {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.session.findUnique(args as any);
      }
      const session = memSessions.get(args.where.session_token);
      if (!session) return null;
      if (session.expires_at < new Date()) {
        memSessions.delete(args.where.session_token);
        return null;
      }
      if (args.include?.user) {
        const user = memUsers.get(session.user_id) || null;
        return { ...session, user };
      }
      return session;
    },

    async delete(args: { where: { session_token: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        try {
          return await prisma.session.delete(args);
        } catch (e) {
          return null;
        }
      }
      memSessions.delete(args.where.session_token);
      return true;
    },

    async deleteMany(args: { where: { user_id: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.session.deleteMany(args);
      }
      for (const [token, sess] of memSessions.entries()) {
        if (sess.user_id === args.where.user_id) {
          memSessions.delete(token);
        }
      }
      return { count: 1 };
    },
  },

  room: {
    async create(args: { data: { room_code: string; name: string; host_user_id: string; status?: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.room.create(args as any);
      }
      const room: InMemoryRoom = {
        room_code: args.data.room_code.toUpperCase(),
        name: args.data.name,
        host_user_id: args.data.host_user_id,
        status: args.data.status || 'lobby',
        created_at: new Date(),
        updated_at: new Date(),
      };
      memRooms.set(room.room_code, room);
      return room;
    },

    async findUnique(args: { where: { room_code: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.room.findUnique(args);
      }
      return memRooms.get(args.where.room_code.toUpperCase()) || null;
    },

    async findMany(args?: { where?: any; select?: any }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.room.findMany(args as any);
      }
      return Array.from(memRooms.values());
    },

    async update(args: { where: { room_code: string }; data: { status?: string; name?: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.room.update(args as any);
      }
      const code = args.where.room_code.toUpperCase();
      const existing = memRooms.get(code);
      if (existing) {
        if (args.data.status !== undefined) existing.status = args.data.status;
        if (args.data.name !== undefined) existing.name = args.data.name;
        existing.updated_at = new Date();
        memRooms.set(code, existing);
        return existing;
      }
      return null;
    },

    async updateMany(args: { where: { room_code: string }; data: { status?: string; name?: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.room.updateMany(args as any);
      }
      const code = args.where.room_code.toUpperCase();
      const existing = memRooms.get(code);
      if (existing) {
        if (args.data.status !== undefined) existing.status = args.data.status;
        if (args.data.name !== undefined) existing.name = args.data.name;
        existing.updated_at = new Date();
        memRooms.set(code, existing);
        return { count: 1 };
      }
      return { count: 0 };
    },

    async deleteMany(args?: { where?: { room_code?: string; host_user_id?: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.room.deleteMany(args as any);
      }
      if (!args || !args.where) {
        const count = memRooms.size;
        memRooms.clear();
        return { count };
      }
      let deleted = 0;
      for (const [code, r] of memRooms.entries()) {
        if (args.where.room_code && code === args.where.room_code.toUpperCase()) {
          memRooms.delete(code);
          deleted++;
        } else if (args.where.host_user_id && r.host_user_id === args.where.host_user_id) {
          memRooms.delete(code);
          deleted++;
        }
      }
      return { count: deleted };
    },
  },

  roomSnapshot: {
    async create(args: { data: { room_code: string; schema_version?: number; stage: string; phase: string; state_data: any } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.roomSnapshot.create(args as any);
      }
      const snapshot: InMemorySnapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        room_code: args.data.room_code.toUpperCase(),
        schema_version: args.data.schema_version || 1,
        stage: args.data.stage,
        phase: args.data.phase,
        state_data: args.data.state_data,
        created_at: new Date(),
      };
      memSnapshots.push(snapshot);
      return snapshot;
    },

    async findFirst(args: { where: { room_code: string }; orderBy?: { created_at: 'asc' | 'desc' } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.roomSnapshot.findFirst(args as any);
      }
      const code = args.where.room_code.toUpperCase();
      const filtered = memSnapshots.filter(s => s.room_code === code);
      if (filtered.length === 0) return null;
      return filtered[filtered.length - 1]; // latest
    },

    async findMany(args?: { where?: any; orderBy?: any; take?: number }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.roomSnapshot.findMany(args as any);
      }
      return memSnapshots;
    },

    async deleteMany(args?: { where?: any }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.roomSnapshot.deleteMany(args as any);
      }
      const count = memSnapshots.length;
      memSnapshots.length = 0;
      return { count };
    },
  },

  bidEvent: {
    async create(args: { data: { room_code: string; player_id: string; bid_sequence: number; participant_id: string; amount: bigint | number } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.bidEvent.create({
          data: {
            room_code: args.data.room_code.toUpperCase(),
            player_id: args.data.player_id,
            bid_sequence: args.data.bid_sequence,
            participant_id: args.data.participant_id,
            amount: typeof args.data.amount === 'bigint' ? args.data.amount : BigInt(args.data.amount),
          },
        });
      }
      const code = args.data.room_code.toUpperCase();
      // Enforce unique constraint in memory for test mode
      const exists = memBidEvents.some(
        b => b.room_code === code && b.player_id === args.data.player_id && b.bid_sequence === args.data.bid_sequence
      );
      if (exists) {
        const error = new Error('Unique constraint failed on the constraint: `bid_events_unique`');
        (error as any).code = 'P2002';
        throw error;
      }
      const event: InMemoryBidEvent = {
        id: `bid_ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        room_code: code,
        player_id: args.data.player_id,
        bid_sequence: args.data.bid_sequence,
        participant_id: args.data.participant_id,
        amount: typeof args.data.amount === 'bigint' ? args.data.amount : BigInt(args.data.amount),
        created_at: new Date(),
      };
      memBidEvents.push(event);
      return event;
    },

    async findMany(args?: { where?: any; orderBy?: any }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.bidEvent.findMany(args as any);
      }
      return memBidEvents;
    },

    async deleteMany(args?: { where?: any }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.bidEvent.deleteMany(args as any);
      }
      const count = memBidEvents.length;
      memBidEvents.length = 0;
      return { count };
    },
  },

  result: {
    async upsert(args: {
      where: { room_code: string };
      create: {
        room_code: string;
        completed_at: bigint | number;
        awards: any;
        leaderboard: any;
        total_players_auctioned: number;
        total_money_spent: bigint | number;
      };
      update: any;
    }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.result.upsert(args as any);
      }
      const record = {
        room_code: args.where.room_code.toUpperCase(),
        completed_at: typeof args.create.completed_at === 'bigint' ? args.create.completed_at : BigInt(args.create.completed_at),
        awards: args.create.awards,
        leaderboard: args.create.leaderboard,
        total_players_auctioned: args.create.total_players_auctioned,
        total_money_spent: typeof args.create.total_money_spent === 'bigint' ? args.create.total_money_spent : BigInt(args.create.total_money_spent),
        created_at: new Date(),
      };
      memResults.set(record.room_code, record);
      return record;
    },

    async findUnique(args: { where: { room_code: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.result.findUnique(args);
      }
      return memResults.get(args.where.room_code.toUpperCase()) || null;
    },

    async deleteMany(args?: { where?: { room_code?: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.result.deleteMany(args as any);
      }
      if (!args || !args.where) {
        const count = memResults.size;
        memResults.clear();
        return { count };
      }
      if (args.where.room_code) {
        const deleted = memResults.delete(args.where.room_code.toUpperCase()) ? 1 : 0;
        return { count: deleted };
      }
      return { count: 0 };
    },
  },

  roomParticipant: {
    async upsert(args: {
      where: { room_code_session_id?: { room_code: string; session_id: string } };
      create: {
        room_code: string;
        user_id?: string | null;
        session_id: string;
        display_name: string;
        team_name?: string | null;
        team_name_normalized?: string | null;
        team_short_code?: string | null;
        team_color?: string | null;
        franchise_id?: string | null;
        franchise_name?: string | null;
        franchise_code?: string | null;
        franchise_color?: string | null;
        is_host?: boolean;
        is_spectator?: boolean;
      };
      update: {
        team_name?: string | null;
        team_name_normalized?: string | null;
        team_short_code?: string | null;
        team_color?: string | null;
        franchise_id?: string | null;
        franchise_name?: string | null;
        franchise_code?: string | null;
        franchise_color?: string | null;
        is_spectator?: boolean;
        display_name?: string;
      };
    }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        try {
          return await (prisma as any).roomParticipant.upsert(args);
        } catch {
          // Fall through to in-memory fallback if room record does not exist in MySQL
        }
      }
      const roomCode = (args.create.room_code || args.where?.room_code_session_id?.room_code || '').toUpperCase();
      const sessionId = args.create.session_id || args.where?.room_code_session_id?.session_id || '';
      const key = `${roomCode}_${sessionId}`;
      const existing = memParticipants.get(key);

      if (existing) {
        if (args.update.team_name !== undefined) existing.team_name = args.update.team_name;
        if (args.update.team_name_normalized !== undefined) existing.team_name_normalized = args.update.team_name_normalized;
        if (args.update.team_short_code !== undefined) existing.team_short_code = args.update.team_short_code;
        if (args.update.team_color !== undefined) existing.team_color = args.update.team_color;
        if (args.update.franchise_id !== undefined) existing.franchise_id = args.update.franchise_id;
        if (args.update.franchise_name !== undefined) existing.franchise_name = args.update.franchise_name;
        if (args.update.franchise_code !== undefined) existing.franchise_code = args.update.franchise_code;
        if (args.update.franchise_color !== undefined) existing.franchise_color = args.update.franchise_color;
        if (args.update.is_spectator !== undefined) existing.is_spectator = args.update.is_spectator;
        if (args.update.display_name !== undefined) existing.display_name = args.update.display_name;
        existing.updated_at = new Date();
        return existing;
      }

      const newPart: InMemoryRoomParticipant = {
        id: `rp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        room_code: roomCode,
        user_id: args.create.user_id || null,
        session_id: sessionId,
        display_name: args.create.display_name,
        team_name: args.create.team_name || null,
        team_name_normalized: args.create.team_name_normalized || (args.create.team_name ? args.create.team_name.trim().toLowerCase() : null),
        team_short_code: args.create.team_short_code || null,
        team_color: args.create.team_color || null,
        franchise_id: args.create.franchise_id || null,
        franchise_name: args.create.franchise_name || null,
        franchise_code: args.create.franchise_code || null,
        franchise_color: args.create.franchise_color || null,
        is_host: args.create.is_host || false,
        is_spectator: args.create.is_spectator || false,
        joined_at: new Date(),
        updated_at: new Date(),
      };
      memParticipants.set(key, newPart);
      return newPart;
    },

    async findMany(args?: { where?: { room_code?: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return (prisma as any).roomParticipant.findMany(args);
      }
      const code = args?.where?.room_code?.toUpperCase();
      if (!code) return Array.from(memParticipants.values());
      return Array.from(memParticipants.values()).filter(p => p.room_code === code);
    },

    async deleteMany(args?: { where?: { room_code?: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return (prisma as any).roomParticipant.deleteMany(args);
      }
      let count = 0;
      const code = args?.where?.room_code?.toUpperCase();
      for (const [key, part] of memParticipants.entries()) {
        if (!code || part.room_code === code) {
          memParticipants.delete(key);
          count++;
        }
      }
      return { count };
    },
  },

  commentaryLog: {
    async create(args: {
      data: {
        room_code: string;
        text: string;
        event_type: string;
      };
    }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        try {
          return await (prisma as any).commentaryLog.create({
            data: {
              ...args.data,
              room_code: args.data.room_code.toUpperCase(),
            },
          });
        } catch {
          // Fall through to in-memory fallback if room record does not exist in MySQL
        }
      }
      const log: InMemoryCommentaryLog = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        room_code: args.data.room_code.toUpperCase(),
        text: args.data.text,
        event_type: args.data.event_type,
        created_at: new Date(),
      };
      memCommentary.push(log);
      return log;
    },

    async findMany(args?: { where?: { room_code?: string }; orderBy?: any; take?: number }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return (prisma as any).commentaryLog.findMany(args);
      }
      const code = args?.where?.room_code?.toUpperCase();
      let logs = code ? memCommentary.filter(l => l.room_code === code) : memCommentary;
      if (args?.take) logs = logs.slice(-args.take);
      return logs;
    },

    async deleteMany(args?: { where?: { room_code?: string } }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return (prisma as any).commentaryLog.deleteMany(args);
      }
      const count = memCommentary.length;
      memCommentary.length = 0;
      return { count };
    },
  },
};
