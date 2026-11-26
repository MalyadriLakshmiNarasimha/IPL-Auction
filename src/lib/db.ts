import { PrismaClient } from '@prisma/client';

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

export async function checkMySqlConnection(force = false): Promise<boolean> {
  if (mockDbAvailable !== null) {
    return mockDbAvailable;
  }

  const now = Date.now();
  if (!force && lastCheckResult === true && now - lastCheckTime < CHECK_CACHE_SUCCESS_MS) {
    return true;
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
  sport_type?: string | null;
  termination_reason?: string | null;
  terminated_at?: Date | null;
  terminated_by_system?: boolean;
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
  participation_status: string;
  disqualification_reason: string | null;
  disqualified_at: Date | null;
  exited_at: Date | null;
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

    async count(): Promise<number> {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return await prisma.user.count();
      }
      return memUsers.size;
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
    async create(args: {
      data: {
        room_code: string;
        name: string;
        host_user_id: string;
        status?: string;
        sport_type?: string | null;
        termination_reason?: string | null;
        terminated_at?: Date | null;
        terminated_by_system?: boolean;
      };
    }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.room.create(args as any);
      }
      const room: InMemoryRoom = {
        room_code: args.data.room_code.toUpperCase(),
        name: args.data.name,
        host_user_id: args.data.host_user_id,
        status: args.data.status || 'lobby',
        sport_type: args.data.sport_type || 'IPL',
        termination_reason: args.data.termination_reason || null,
        terminated_at: args.data.terminated_at || null,
        terminated_by_system: args.data.terminated_by_system ?? false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      memRooms.set(room.room_code, room);
      return room;
    },

    async findUnique(args: { where: { room_code: string }; include?: any; select?: any }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.room.findUnique(args as any);
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

    async count(): Promise<number> {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return await prisma.room.count();
      }
      return memRooms.size;
    },

    async update(args: {
      where: { room_code: string };
      data: {
        status?: string;
        name?: string;
        termination_reason?: string | null;
        terminated_at?: Date | null;
        terminated_by_system?: boolean;
      };
    }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.room.update(args as any);
      }
      const code = args.where.room_code.toUpperCase();
      const existing = memRooms.get(code);
      if (existing) {
        if (args.data.status !== undefined) existing.status = args.data.status;
        if (args.data.name !== undefined) existing.name = args.data.name;
        if (args.data.termination_reason !== undefined) existing.termination_reason = args.data.termination_reason;
        if (args.data.terminated_at !== undefined) existing.terminated_at = args.data.terminated_at;
        if (args.data.terminated_by_system !== undefined) existing.terminated_by_system = args.data.terminated_by_system;
        existing.updated_at = new Date();
        memRooms.set(code, existing);
        return existing;
      }
      return null;
    },

    async updateMany(args: {
      where: { room_code: string; status?: any };
      data: {
        status?: string;
        name?: string;
        termination_reason?: string | null;
        terminated_at?: Date | null;
        terminated_by_system?: boolean;
      };
    }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        return prisma.room.updateMany(args as any);
      }
      const code = args.where.room_code.toUpperCase();
      const existing = memRooms.get(code);
      if (existing) {
        if (args.data.status !== undefined) existing.status = args.data.status;
        if (args.data.name !== undefined) existing.name = args.data.name;
        if (args.data.termination_reason !== undefined) existing.termination_reason = args.data.termination_reason;
        if (args.data.terminated_at !== undefined) existing.terminated_at = args.data.terminated_at;
        if (args.data.terminated_by_system !== undefined) existing.terminated_by_system = args.data.terminated_by_system;
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
        participation_status?: string;
        disqualification_reason?: string | null;
        disqualified_at?: Date | null;
        exited_at?: Date | null;
      };
      update: {
        user_id?: string | null;
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
        display_name?: string;
        participation_status?: string;
        disqualification_reason?: string | null;
        disqualified_at?: Date | null;
        exited_at?: Date | null;
      };
    }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        try {
          return await (prisma as any).roomParticipant.upsert(args);
        } catch (err: any) {
          // Concurrent upserts in MySQL InnoDB can race on the unique key (P2002); retry as an update
          if (err?.code === 'P2002' && args.where?.room_code_session_id) {
            return await (prisma as any).roomParticipant.update({
              where: args.where,
              data: args.update,
            });
          }
          if (process.env.NODE_ENV !== 'test') {
            throw err;
          }
          // Test-only fallback if unit test constructs RoomManager without a DB room row
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
        if (args.update.participation_status !== undefined) existing.participation_status = args.update.participation_status;
        if (args.update.disqualification_reason !== undefined) existing.disqualification_reason = args.update.disqualification_reason;
        if (args.update.disqualified_at !== undefined) existing.disqualified_at = args.update.disqualified_at;
        if (args.update.exited_at !== undefined) existing.exited_at = args.update.exited_at;
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
        participation_status: args.create.participation_status || 'ACTIVE',
        disqualification_reason: args.create.disqualification_reason || null,
        disqualified_at: args.create.disqualified_at || null,
        exited_at: args.create.exited_at || null,
        joined_at: new Date(),
        updated_at: new Date(),
      };
      memParticipants.set(key, newPart);
      return newPart;
    },

    async updateMany(args: {
      where: { room_code: string; session_id?: string; is_spectator?: boolean };
      data: {
        participation_status?: string;
        disqualification_reason?: string | null;
        disqualified_at?: Date | null;
        exited_at?: Date | null;
      };
    }) {
      const mysqlOk = await getDbAccess();
      if (mysqlOk) {
        try {
          return await (prisma as any).roomParticipant.updateMany({
            where: {
              ...args.where,
              room_code: args.where.room_code.toUpperCase(),
            },
            data: args.data,
          });
        } catch (err) {
          if (process.env.NODE_ENV !== 'test') throw err;
        }
      }
      const code = args.where.room_code.toUpperCase();
      let count = 0;
      for (const part of memParticipants.values()) {
        if (part.room_code !== code) continue;
        if (args.where.session_id !== undefined && part.session_id !== args.where.session_id) continue;
        if (args.where.is_spectator !== undefined && part.is_spectator !== args.where.is_spectator) continue;
        if (args.data.participation_status !== undefined) part.participation_status = args.data.participation_status;
        if (args.data.disqualification_reason !== undefined) part.disqualification_reason = args.data.disqualification_reason;
        if (args.data.disqualified_at !== undefined) part.disqualified_at = args.data.disqualified_at;
        if (args.data.exited_at !== undefined) part.exited_at = args.data.exited_at;
        part.updated_at = new Date();
        count++;
      }
      return { count };
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
        if (process.env.NODE_ENV !== 'test') {
          return await (prisma as any).commentaryLog.create({
            data: {
              ...args.data,
              room_code: args.data.room_code.toUpperCase(),
            },
          });
        }
        try {
          return await (prisma as any).commentaryLog.create({
            data: {
              ...args.data,
              room_code: args.data.room_code.toUpperCase(),
            },
          });
        } catch {
          // Test-only fallback if unit test constructs RoomManager without a DB room row
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
