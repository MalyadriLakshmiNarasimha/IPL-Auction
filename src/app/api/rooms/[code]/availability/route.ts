import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LEGACY_PKL_ID_MAP } from '@/shared/pkl-player-data';
import { resolvePlayerId } from '@/shared/player-career-data';
import { buildFullAuctionResults } from '@/shared/auction-results-engine';

export const dynamic = 'force-dynamic';

export interface PlayerAvailabilityRecord {
  status: 'AVAILABLE' | 'SOLD' | 'UNSOLD' | 'WITHDRAWN' | 'NOT IN AUCTION';
  winning_team?: string;
  winning_bid?: number;
  winning_manager?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = (params.code || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ success: false, error: 'Room code required' }, { status: 400 });
    }

    const [room, snapshot, resultRow] = await Promise.all([
      db.room.findUnique({
        where: { room_code: code },
        include: { participants: true },
      }),
      db.roomSnapshot.findFirst({
        where: { room_code: code },
        orderBy: { created_at: 'desc' },
      }),
      db.result.findUnique({
        where: { room_code: code },
      }),
    ]);

    if (!room && !snapshot && !resultRow) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    let stateData: any = {};
    if (snapshot?.state_data) {
      stateData = typeof snapshot.state_data === 'string'
        ? JSON.parse(snapshot.state_data)
        : snapshot.state_data;
    }

    const sportType: 'IPL' | 'PKL' =
      (room as any)?.sport_type === 'PKL' ||
      code.startsWith('K') ||
      stateData?.sport === 'pkl' ||
      stateData?.config?.season?.includes('Season')
        ? 'PKL'
        : 'IPL';

    // Normalize IDs to handle legacy pkl_xx and p-xxx / k-xxx variations
    const normalizeId = (id: string): string => {
      if (!id) return '';
      const clean = id.trim();
      if (clean.startsWith('pkl-') || clean.startsWith('pkl_')) {
        const canonical = LEGACY_PKL_ID_MAP[clean.replace('_', '-')] || LEGACY_PKL_ID_MAP[clean];
        if (canonical) return canonical;
      }
      const resolved = resolvePlayerId(clean);
      return resolved || clean;
    };

    const playerStatusMap: Record<string, PlayerAvailabilityRecord> = {};
    const poolPlayerIdsSet = new Set<string>();

    // 1. Process Sold Players
    const rawSold = stateData.sold_players || stateData.auction_state?.sold_players || [];
    for (const item of rawSold) {
      const p = item.player || item;
      const pid = normalizeId(p.id);
      if (pid) {
        poolPlayerIdsSet.add(pid);
        playerStatusMap[pid] = {
          status: 'SOLD',
          winning_team: item.buyer_team || item.team || item.winning_team || 'Sold',
          winning_bid: Number(item.price || item.winning_bid || item.sold_price || 0),
          winning_manager: item.buyer_name || item.winning_manager || item.buyer_id,
        };
      }
    }

    // 2. Process Unsold Players
    const rawUnsold = stateData.unsold_players || stateData.auction_state?.unsold_players || stateData.unsold_pool || [];
    for (const item of rawUnsold) {
      const p = item.player || item;
      const pid = normalizeId(typeof item === 'string' ? item : p.id);
      if (pid) {
        poolPlayerIdsSet.add(pid);
        if (!playerStatusMap[pid] || playerStatusMap[pid].status !== 'SOLD') {
          playerStatusMap[pid] = {
            status: 'UNSOLD',
          };
        }
      }
    }

    // 3. Process Remaining Pool / Active Pool
    const rawPool = stateData.remaining_pool || stateData.pool || stateData.auction_state?.players || [];
    for (const item of rawPool) {
      const p = item.player || item;
      const pid = normalizeId(typeof item === 'string' ? item : p.id);
      if (pid) {
        poolPlayerIdsSet.add(pid);
        if (!playerStatusMap[pid]) {
          playerStatusMap[pid] = {
            status: 'AVAILABLE',
          };
        }
      }
    }

    // 4. Current player on auction
    const currentPlayerId = normalizeId(
      stateData.current_player_id || stateData.current_player?.id || stateData.auction_state?.current_player?.id
    );
    if (currentPlayerId) {
      poolPlayerIdsSet.add(currentPlayerId);
      if (!playerStatusMap[currentPlayerId] || playerStatusMap[currentPlayerId].status !== 'SOLD') {
        playerStatusMap[currentPlayerId] = {
          status: 'AVAILABLE',
        };
      }
    }

    // 5. If we have persisted results or snapshot, cross-reference purchases
    try {
      if (resultRow || snapshot?.state_data) {
        const fullResults = buildFullAuctionResults(
          code,
          room?.name || stateData.name || `Auction ${code}`,
          sportType,
          resultRow?.completed_at ? Number(resultRow.completed_at) : (snapshot?.created_at.getTime() || Date.now()),
          stateData.participants || (room as any)?.participants || [],
          (resultRow?.leaderboard as any[]) || stateData.results?.leaderboard || [],
          (resultRow?.awards as any[]) || stateData.results?.awards || [],
          stateData.all_completed_bids || [],
          stateData.unsold_pool || [],
          [],
          stateData.pool?.length || (sportType === 'PKL' ? 235 : 274)
        );

        const purchases = (fullResults as any)?.player_purchase_history || (fullResults as any)?.player_purchases || [];
        if (purchases && purchases.length > 0) {
          for (const purchase of purchases) {
            const pid = normalizeId(purchase.player_id);
            if (pid) {
              poolPlayerIdsSet.add(pid);
              if (purchase.status === 'SOLD') {
                playerStatusMap[pid] = {
                  status: 'SOLD',
                  winning_team: purchase.winning_team,
                  winning_bid: Number(purchase.winning_bid || purchase.final_price || purchase.base_price || 0),
                  winning_manager: purchase.winning_manager,
                };
              } else if (purchase.status === 'UNSOLD') {
                if (!playerStatusMap[pid] || playerStatusMap[pid].status !== 'SOLD') {
                  playerStatusMap[pid] = { status: 'UNSOLD' };
                }
              } else if (purchase.status === 'WITHDRAWN') {
                playerStatusMap[pid] = { status: 'WITHDRAWN' };
              }
            }
          }
        }
      }
    } catch {
      // Best effort
    }

    const soldCount = Object.values(playerStatusMap).filter(v => v.status === 'SOLD').length;
    const unsoldCount = Object.values(playerStatusMap).filter(v => v.status === 'UNSOLD').length;

    return NextResponse.json({
      success: true,
      room_code: code,
      name: room?.name || `Auction ${code}`,
      sport_type: sportType,
      stage: (room as any)?.stage || stateData?.stage || (resultRow ? 'completed' : 'lobby'),
      status: (room as any)?.status || (resultRow ? 'completed' : 'ongoing'),
      total_pool_count: poolPlayerIdsSet.size,
      sold_count: soldCount,
      unsold_count: unsoldCount,
      player_status: playerStatusMap,
      pool_player_ids: Array.from(poolPlayerIdsSet),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to determine room availability' },
      { status: 500 }
    );
  }
}
