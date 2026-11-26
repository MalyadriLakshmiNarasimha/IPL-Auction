import { NextRequest, NextResponse } from 'next/server';
import { getPlayerById } from '../../../../../shared/player-data';
import { getPklPlayerById, getPklPlayerStats } from '../../../../../shared/pkl-player-data';
import {
  getIplCareerStats,
  getIplSeasonStats,
  resolvePlayerId,
  HISTORICAL_IPL_CAREER_BY_ID,
} from '../../../../../shared/player-career-data';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = decodeURIComponent(params.id || '').trim();
    if (!rawId) {
      return NextResponse.json(
        { error: 'Missing player identifier', status: 'MAPPING_ERROR' },
        { status: 400 }
      );
    }

    const resolvedId = resolvePlayerId(rawId) || rawId;
    const player = getPlayerById(resolvedId);

    if (!player) {
      const pklPlayer = getPklPlayerById(rawId);
      if (pklPlayer) {
        const pklStats = getPklPlayerStats(pklPlayer.id);
        return NextResponse.json(
          {
            player_id: pklPlayer.id,
            canonical_name: pklPlayer.name,
            role: pklPlayer.role,
            position_detail: pklPlayer.position_detail,
            nationality: pklPlayer.nationality || pklPlayer.country,
            team: pklPlayer.team,
            sport: 'PKL',
            status: pklStats?.data_status || 'VERIFIED_S12',
            career: pklStats?.career || null,
            season_12: pklStats?.season_12 || null,
            stats_2026: pklPlayer.stats_2026,
          },
          {
            status: 200,
            headers: {
              'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            },
          }
        );
      }

      return NextResponse.json(
        {
          error: `Player '${rawId}' not found in database registry`,
          status: 'MAPPING_ERROR',
        },
        { status: 404 }
      );
    }

    const career = getIplCareerStats(resolvedId);
    const season = getIplSeasonStats(resolvedId);

    const overallStatus =
      career.status === 'GENUINE_IPL_DEBUTANT'
        ? 'GENUINE_IPL_DEBUTANT'
        : career.status || 'VERIFIED';

    return NextResponse.json(
      {
        player_id: player.id,
        canonical_name: player.name,
        role: player.role,
        nationality: player.nationality || player.country,
        team: player.team,
        status: overallStatus,
        career,
        season_2026: season,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error', status: 'DATA_UNAVAILABLE' },
      { status: 500 }
    );
  }
}
