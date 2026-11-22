import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ALL_PLAYERS } from '@/shared/player-data';
import { ALL_PKL_PLAYERS, PKL_FRANCHISES } from '@/shared/pkl-player-data';
import { OFFICIAL_IPL_FRANCHISES } from '@/shared/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let userCount = 0;
    let roomCount = 0;

    try {
      userCount = await db.user.count();
    } catch {
      userCount = 0;
    }

    try {
      roomCount = await db.room.count();
    } catch {
      roomCount = 0;
    }

    return NextResponse.json({
      success: true,
      stats: {
        registeredManagers: userCount,
        roomsCreated: roomCount,
        iplPlayers: ALL_PLAYERS.length,
        pklPlayers: ALL_PKL_PLAYERS.length,
        iplFranchises: OFFICIAL_IPL_FRANCHISES.length,
        pklFranchises: PKL_FRANCHISES.length,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      stats: {
        registeredManagers: 0,
        roomsCreated: 0,
        iplPlayers: ALL_PLAYERS.length,
        pklPlayers: ALL_PKL_PLAYERS.length,
        iplFranchises: OFFICIAL_IPL_FRANCHISES.length,
        pklFranchises: PKL_FRANCHISES.length,
      },
      updatedAt: new Date().toISOString(),
    });
  }
}
