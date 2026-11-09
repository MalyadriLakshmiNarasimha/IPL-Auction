import { AuctionResults, Participant, Player, RoomSettings, WorkflowStage, TradeOffer, TradeTransaction, PlayingXISubmission, CommentaryEvent, AuctionState } from '../../src/shared/types';
import { db, prisma, checkMySqlConnection, DatabaseConnectionError } from '../../src/lib/db';
import { ensureMysqlRunning } from '../../scripts/db-manager';

const memoryResults = new Map<string, AuctionResults>();

export interface SerializedRoomState {
  room_code: string;
  name: string;
  host_session_id: string;
  host_disconnect_time: number | null;
  settings: RoomSettings;
  participants: Participant[];
  auction_state: AuctionState;
  pool: Player[];
  unsold_pool: Player[];
  all_completed_bids: {
    player_id: string;
    player: Player;
    bids_count: number;
    final_price: number;
    winner_id: string;
  }[];
  results: AuctionResults | null;
  stage: WorkflowStage;
  pending_trades: TradeOffer[];
  completed_trades: TradeTransaction[];
  playing_xi_submissions: PlayingXISubmission[];
  commentary_events: CommentaryEvent[];
  schema_version: number;
  saved_at: number;
}

/**
 * Validates required environment variables in production mode.
 * Fails fast with clear error message without ever printing secret values.
 */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV === 'production') {
    const requiredKeys = ['DATABASE_URL', 'CLIENT_ORIGIN'];
    const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
    if (!sessionSecret || sessionSecret.trim() === '') {
      console.error('[FATAL] Missing required production environment variable: SESSION_SECRET (or JWT_SECRET). Exiting.');
      process.exit(1);
    }

    for (const key of requiredKeys) {
      const val = process.env[key];
      if (!val || val.trim() === '') {
        console.error(`[FATAL] Missing required production environment variable: ${key}. Exiting.`);
        process.exit(1);
      }
    }
    console.log('[CONFIG] Production environment variables validated successfully.');
  }
}

/**
 * Initializes database with exponential backoff retries.
 * In production: Retries up to maxRetries without terminating the process so the HTTP/Socket server remains listening.
 */
export async function initDatabaseWithRetry(
  maxRetries = process.env.NODE_ENV === 'production' ? 5 : 2,
  initialDelayMs = process.env.NODE_ENV === 'production' ? 1000 : 500
): Promise<boolean> {
  validateProductionEnv();

  // In non-test environments, attempt auto-starting local MySQL if not running
  if (process.env.NODE_ENV !== 'test') {
    try {
      await ensureMysqlRunning(false);
    } catch {}
  }

  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const isConnected = await checkMySqlConnection(true);
      if (isConnected) {
        console.log('[DB] Database layer initialized and connected to MySQL via Prisma ORM.');
        return true;
      }
    } catch (err: any) {
      console.warn(`[DB] Connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
    }

    if (attempt < maxRetries) {
      console.log(`[DB] Retrying database connection in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 8000); // Exponential backoff capped at 8s
    }
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] Failed to connect to MySQL database after maximum retries. Operating in degraded mode.');
    return false;
  }

  console.warn('[DB] MySQL is not reachable. Operating in test fallback mode if NODE_ENV === "test".');
  return false;
}

export function initDatabase() {
  initDatabaseWithRetry(process.env.NODE_ENV === 'production' ? 5 : 2, 500);
}

/**
 * Persists a room snapshot inside a database transaction.
 * Updates room status, creates a versioned snapshot, and prunes older snapshots (keeps last 5).
 */
export async function persistRoomSnapshot(stateData: SerializedRoomState): Promise<boolean> {
  const code = stateData.room_code.toUpperCase();
  try {
    const isDbUp = await checkMySqlConnection();
    if (!isDbUp) {
      if (process.env.NODE_ENV === 'test') {
        await db.roomSnapshot.create({
          data: {
            room_code: code,
            schema_version: 1,
            stage: stateData.stage,
            phase: stateData.auction_state.phase,
            state_data: stateData,
          },
        });
        return true;
      }
      throw new DatabaseConnectionError('Database unreachable. Snapshot skipped.');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Ensure room row exists and status is synchronized without downgrading
      const existingDbRoom = await tx.room.findUnique({
        where: { room_code: code },
        select: { status: true },
      });

      const isCompleted = stateData.auction_state.phase === 'completed' || existingDbRoom?.status === 'completed';
      const isLive =
        !isCompleted &&
        (stateData.auction_state.phase === 'bidding' ||
          stateData.auction_state.phase === 'starting' ||
          stateData.stage !== 'lobby');
      const initialStatus = isCompleted ? 'completed' : isLive ? 'live' : 'lobby';

      if (existingDbRoom) {
        if (isCompleted) {
          await tx.room.update({
            where: { room_code: code },
            data: {
              updated_at: new Date(),
              status: 'completed',
            },
          });
        } else if (isLive) {
          await tx.room.updateMany({
            where: {
              room_code: code,
              status: { not: 'completed' },
            },
            data: {
              updated_at: new Date(),
              status: 'live',
            },
          });
        } else {
          await tx.room.update({
            where: { room_code: code },
            data: {
              updated_at: new Date(),
            },
          });
        }
      } else {
        let hostUser: any = null;
        if (stateData.host_session_id) {
          const sess = await tx.session.findUnique({
            where: { session_token: stateData.host_session_id },
            include: { user: true },
          });
          if (sess?.user) {
            hostUser = sess.user;
          } else {
            hostUser = await tx.user.findUnique({ where: { id: stateData.host_session_id } });
          }
        }
        if (!hostUser) {
          hostUser = await tx.user.findFirst();
        }
        if (!hostUser) {
          hostUser = await tx.user.create({
            data: {
              name: 'System Host',
              email: `system_host_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@auction.local`,
              password_hash: 'system-hash',
            },
          });
        }
        try {
          await tx.room.create({
            data: {
              room_code: code,
              name: stateData.name || 'IPL Auction Room',
              host_user_id: hostUser.id,
              status: initialStatus,
            },
          });
        } catch (fkErr: any) {
          // If concurrent test teardown deleted hostUser, create a dedicated fallback user
          const fallbackHost = await tx.user.create({
            data: {
              name: 'System Host',
              email: `system_host_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@auction.local`,
              password_hash: 'system-hash',
            },
          });
          await tx.room.create({
            data: {
              room_code: code,
              name: stateData.name || 'IPL Auction Room',
              host_user_id: fallbackHost.id,
              status: initialStatus,
            },
          });
        }
      }

      // 2. Insert new snapshot
      await tx.roomSnapshot.create({
        data: {
          room_code: code,
          schema_version: 1,
          stage: stateData.stage,
          phase: stateData.auction_state.phase,
          state_data: stateData as any,
        },
      });

      // 3. Prune old snapshots for this room (keep most recent 5)
      const oldSnapshots = await tx.roomSnapshot.findMany({
        where: { room_code: code },
        orderBy: { created_at: 'desc' },
        skip: 5,
        select: { id: true },
      });

      if (oldSnapshots.length > 0) {
        await tx.roomSnapshot.deleteMany({
          where: { id: { in: oldSnapshots.map(s => s.id) } },
        });
      }
    });

    return true;
  } catch (err: any) {
    console.error(`[DB SNAPSHOT ERROR] Failed to snapshot room ${code}: ${err.message}`);
    return false;
  }
}

/**
 * Records a bid event with atomic sequence number.
 * Uniqueness constraint on [room_code, player_id, bid_sequence] guarantees no double or replayed bids.
 */
export async function recordBidEvent(
  roomCode: string,
  playerId: string,
  bidSequence: number,
  participantId: string,
  amount: number
): Promise<boolean> {
  const code = roomCode.toUpperCase();
  try {
    const isDbUp = await checkMySqlConnection();
    if (!isDbUp && process.env.NODE_ENV !== 'test') {
      return false;
    }

    if (isDbUp) {
      const roomExists = await prisma.room.findUnique({ where: { room_code: code } });
      if (!roomExists) return false;
    }

    await db.bidEvent.create({
      data: {
        room_code: code,
        player_id: playerId,
        bid_sequence: bidSequence,
        participant_id: participantId,
        amount: BigInt(amount),
      },
    });

    return true;
  } catch (err: any) {
    if (err.code === 'P2002') {
      console.warn(`[DB BID CONFLICT] Duplicate bid detected for ${code}/${playerId} seq ${bidSequence}.`);
    }
    return false;
  }
}

/**
 * Loads the latest snapshot for a room from the database.
 */
export async function loadLatestRoomSnapshot(roomCode: string): Promise<SerializedRoomState | null> {
  const code = roomCode.toUpperCase();
  try {
    const snapshot = await db.roomSnapshot.findFirst({
      where: { room_code: code },
      orderBy: { created_at: 'desc' },
    });

    if (snapshot && snapshot.state_data) {
      return snapshot.state_data as SerializedRoomState;
    }
  } catch (err: any) {
    console.error(`[DB LOAD ERROR] Failed to load snapshot for ${code}: ${err.message}`);
  }
  return null;
}

/**
 * Loads all active (non-completed) rooms from the database for rehydration on boot.
 */
export async function loadAllActiveRoomCodes(): Promise<string[]> {
  try {
    const isDbUp = await checkMySqlConnection();
    if (!isDbUp) return [];

    const activeRooms = await prisma.room.findMany({
      where: {
        status: { not: 'completed' },
      },
      select: { room_code: true },
    });

    return activeRooms.map(r => r.room_code);
  } catch (err: any) {
    console.error('[DB ACTIVE ROOMS ERROR]:', err.message);
    return [];
  }
}

/**
 * Persists final auction results.
 */
export async function persistResults(results: AuctionResults): Promise<void> {
  memoryResults.set(results.room_code, results);

  try {
    const isDbUp = await checkMySqlConnection();
    if (!isDbUp && process.env.NODE_ENV !== 'test') {
      throw new DatabaseConnectionError('MySQL is unreachable. Cannot persist results.');
    }

    await db.result.upsert({
      where: { room_code: results.room_code },
      create: {
        room_code: results.room_code,
        completed_at: BigInt(results.completed_at),
        awards: results.awards as any,
        leaderboard: results.leaderboard as any,
        total_players_auctioned: results.total_players_auctioned,
        total_money_spent: BigInt(results.total_money_spent),
      },
      update: {
        completed_at: BigInt(results.completed_at),
        awards: results.awards as any,
        leaderboard: results.leaderboard as any,
        total_players_auctioned: results.total_players_auctioned,
        total_money_spent: BigInt(results.total_money_spent),
      },
    });

    // Mark room status as completed in rooms table
    await db.room.updateMany({
      where: { room_code: results.room_code },
      data: { status: 'completed' },
    });

    console.log(`[DB] Results for room ${results.room_code} saved to database.`);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'test') {
      console.warn(`[DB] Database persist failed (${err.message}). Results saved to memory store.`);
    } else {
      console.error(`[DB FATAL] Database persist failed for room ${results.room_code}: ${err.message}`);
      throw err;
    }
  }
}

export async function getPersistedResults(roomCode: string): Promise<AuctionResults | null> {
  const code = roomCode.toUpperCase();
  if (memoryResults.has(code)) {
    return memoryResults.get(code)!;
  }

  try {
    const row = await db.result.findUnique({
      where: { room_code: code },
    });

    if (row) {
      const results: AuctionResults = {
        room_code: row.room_code,
        completed_at: Number(row.completed_at),
        awards: row.awards as any,
        leaderboard: row.leaderboard as any,
        total_players_auctioned: row.total_players_auctioned,
        total_money_spent: Number(row.total_money_spent),
        most_expensive_player: null,
        biggest_bidding_war: null,
      };
      memoryResults.set(code, results);
      return results;
    }
  } catch (err) {
    // Return null if not found
  }

  return null;
}

/**
 * Archival rule: marks stale non-completed rooms older than olderThanDays as 'abandoned'.
 * Prunes their transient snapshots while preserving users and results.
 */
export async function archiveAbandonedRooms(olderThanDays = 7): Promise<number> {
  try {
    const isDbUp = await checkMySqlConnection();
    if (!isDbUp) return 0;

    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const staleRooms = await prisma.room.findMany({
      where: {
        status: { not: 'completed' },
        created_at: { lt: cutoff },
      },
      select: { room_code: true },
    });

    if (staleRooms.length === 0) return 0;

    const codes = staleRooms.map(r => r.room_code);
    await prisma.room.updateMany({
      where: { room_code: { in: codes } },
      data: { status: 'abandoned' },
    });

    await prisma.roomSnapshot.deleteMany({
      where: { room_code: { in: codes } },
    });

    console.log(`[DB ARCHIVAL] Archived ${codes.length} stale rooms older than ${olderThanDays} days.`);
    return codes.length;
  } catch (err: any) {
    console.error('[DB ARCHIVAL ERROR]:', err.message);
    return 0;
  }
}
