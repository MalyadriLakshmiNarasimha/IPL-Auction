import { PrismaClient } from '@prisma/client';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Robust database repository supporting Prisma MySQL with an in-memory fallback
 * when MySQL daemon is not running in local test environments.
 */
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

const memUsers = new Map<string, InMemoryUser>();
const memSessions = new Map<string, InMemorySession>();
const memRooms = new Map<string, InMemoryRoom>();

let isMySqlAvailable: boolean | null = null;

async function checkMySqlConnection(): Promise<boolean> {
  if (isMySqlAvailable !== null) return isMySqlAvailable;
  try {
    // Attempt a lightweight query
    await prisma.$queryRaw`SELECT 1`;
    isMySqlAvailable = true;
    console.log('[DB] Connected to MySQL via Prisma ORM successfully.');
    return true;
  } catch (err: any) {
    isMySqlAvailable = false;
    console.warn('[DB] MySQL database not reachable on localhost:3306. Using fallback relational store for local tests.', err.message);
    return false;
  }
}

export const db = {
  user: {
    async create(args: { data: { name: string; email: string; password_hash: string } }) {
      const mysqlOk = await checkMySqlConnection();
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
      const mysqlOk = await checkMySqlConnection();
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
      const mysqlOk = await checkMySqlConnection();
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
      const mysqlOk = await checkMySqlConnection();
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
      const mysqlOk = await checkMySqlConnection();
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
      const mysqlOk = await checkMySqlConnection();
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
      const mysqlOk = await checkMySqlConnection();
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
      const mysqlOk = await checkMySqlConnection();
      if (mysqlOk) {
        return prisma.room.findUnique(args);
      }
      return memRooms.get(args.where.room_code.toUpperCase()) || null;
    },
  },
};
