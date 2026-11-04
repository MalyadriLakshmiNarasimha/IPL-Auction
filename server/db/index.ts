import { AuctionResults } from '../../src/shared/types';
import { prisma } from '../../src/lib/db';

const memoryResults = new Map<string, AuctionResults>();

export function initDatabase() {
  console.log('[DB] Database layer initialized with Prisma ORM for MySQL.');
}

export async function persistResults(results: AuctionResults): Promise<void> {
  memoryResults.set(results.room_code, results);

  try {
    await prisma.result.upsert({
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
    console.log(`[DB] Results for room ${results.room_code} saved to MySQL via Prisma.`);
  } catch (err: any) {
    // If MySQL connection is down, results are preserved in memoryResults map
    console.warn(`[DB] MySQL persist failed (${err.message}). Results saved to memory store.`);
  }
}

export async function getPersistedResults(roomCode: string): Promise<AuctionResults | null> {
  if (memoryResults.has(roomCode)) {
    return memoryResults.get(roomCode)!;
  }

  try {
    const row = await prisma.result.findUnique({
      where: { room_code: roomCode },
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
      memoryResults.set(roomCode, results);
      return results;
    }
  } catch (err) {
    // Return null if not found
  }

  return null;
}
