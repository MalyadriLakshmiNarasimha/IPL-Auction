import rawPklPlayers from '../../pkl-players-database.json';
import pklStatsData from './pkl-player-stats-registry.json';
import pklImagesData from './pkl-player-images.json';
import { FranchiseIdentity, Player, PlayerRole, PlayerTier, PlayerCategory, PlayerImageEntry } from './types';
import { calculatePklPlayerPoints, PklRawStats } from './pkl-scoring';

export const PKL_DISCLAIMER =
  'Unofficial fan game. Virtual money only. Not affiliated with, endorsed by, or sponsored by Mashal Sports or Pro Kabaddi League.';

export const PKL_PLAYER_IMAGES: Record<string, PlayerImageEntry> = pklImagesData as unknown as Record<
  string,
  PlayerImageEntry
>;

export function getPklPlayerImageEntry(playerId: string): PlayerImageEntry | undefined {
  return PKL_PLAYER_IMAGES[playerId];
}

export interface PklDatabaseRecord {
  id: string;
  legacy_id?: string | null;
  official_profile_id: string;
  name: string;
  team: string;
  team_code: string;
  role: 'Raider' | 'Defender' | 'All-Rounder';
  position_detail: 'Raider' | 'Right Corner' | 'Left Corner' | 'Right Cover' | 'Left Cover' | 'Cover' | 'Defender' | 'All-Rounder';
  nationality: string;
  is_overseas: boolean;
  tier: PlayerTier | 'D';
  category: 'Category A' | 'Category B' | 'Category C' | 'Category D';
  base_price: number;
  jersey_number?: number | null;
  profile_url?: string;
  card_text?: string;
  data_status: string;
}

export const PKL_FRANCHISES: FranchiseIdentity[] = [
  { id: 'pat', name: 'Patna Pirates', short_code: 'PAT', color: '#15803D', secondary_color: '#FACC15' },
  { id: 'pun', name: 'Puneri Paltan', short_code: 'PUN', color: '#F97316', secondary_color: '#D97706' },
  { id: 'jpp', name: 'Jaipur Pink Panthers', short_code: 'JPP', color: '#EC4899', secondary_color: '#1E40AF' },
  { id: 'bb', name: 'Bengaluru Bulls', short_code: 'BB', color: '#D1121F', secondary_color: '#18181B' },
  { id: 'del', name: 'Dabang Delhi K.C.', short_code: 'DEL', color: '#1E3A8A', secondary_color: '#DC2626' },
  { id: 'mum', name: 'U Mumba', short_code: 'MUM', color: '#FF6600', secondary_color: '#18181B' },
  { id: 'bw', name: 'Bengal Warriorz', short_code: 'BW', color: '#00A3E0', secondary_color: '#F58220' },
  { id: 'gg', name: 'Gujarat Giants', short_code: 'GG', color: '#EA580C', secondary_color: '#B91C1C' },
  { id: 'har', name: 'Haryana Steelers', short_code: 'HAR', color: '#2563EB', secondary_color: '#FBBF24' },
  { id: 'tam', name: 'Tamil Thalaivas', short_code: 'TAM', color: '#EAB308', secondary_color: '#1D4ED8' },
  { id: 'tel', name: 'Telugu Titans', short_code: 'TEL', color: '#F59E0B', secondary_color: '#EF4444' },
  { id: 'up', name: 'UP Yoddhas', short_code: 'UP', color: '#B91C1C', secondary_color: '#1E3A8A' },
];

const PKL_TEAM_PALETTE: Record<string, string> = {
  BB: '#D1121F',
  DEL: '#1E3A8A',
  JPP: '#EC4899',
  BW: '#00A3E0',
  MUM: '#FF6600',
  PAT: '#15803D',
  PUN: '#F97316',
  TEL: '#F59E0B',
  HAR: '#2563EB',
  TAM: '#EAB308',
  UP: '#B91C1C',
  GG: '#EA580C',
};

export function getPklInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  if (parts.length === 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0][0] + parts[1][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generates an inline procedural SVG avatar with 'PKL POOL' badge and franchise accent.
 */
export function generatePklPlayerAvatarSvg(
  initials: string,
  number: number | null | undefined,
  color: string,
  name: string
): string {
  const numDisplay = number ? `#${number}` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" width="200" height="250">
    <defs>
      <linearGradient id="pkl_bg_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#14161D" />
        <stop offset="50%" stop-color="#0E0F14" />
        <stop offset="100%" stop-color="#07080A" />
      </linearGradient>
      <radialGradient id="pkl_glow_${initials}" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.38" />
        <stop offset="100%" stop-color="#07080A" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="200" height="250" rx="20" fill="url(#pkl_bg_${initials})" />
    <rect width="200" height="250" rx="20" fill="url(#pkl_glow_${initials})" />
    <rect x="2" y="2" width="196" height="246" rx="18" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.45" />
    <circle cx="100" cy="95" r="42" fill="#0C0D11" stroke="${color}" stroke-width="2" stroke-opacity="0.65" />
    <text x="100" y="105" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">${initials}</text>
    <text x="100" y="160" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="800" fill="#EAB308" text-anchor="middle" letter-spacing="2">PKL POOL</text>
    <text x="100" y="185" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="700" fill="#8E92A4" text-anchor="middle">${numDisplay}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const RAW_PKL_PLAYERS: PklDatabaseRecord[] = rawPklPlayers as PklDatabaseRecord[];

// Fast lookup table for stats registry
const STATS_MAP = (pklStatsData as any)?.players || {};

// Deterministic Legacy Mapping for pkl-001 through pkl-072
export const LEGACY_PKL_ID_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const p of (rawPklPlayers as PklDatabaseRecord[])) {
    if (p.legacy_id) {
      map[p.legacy_id] = p.id;
    }
  }
  return map;
})();

function adaptPklRecord(raw: PklDatabaseRecord): Player {
  const initials = getPklInitials(raw.name);
  const teamColor = PKL_TEAM_PALETTE[raw.team_code] || '#F97316';

  const statsEntry = STATS_MAP[raw.id];
  const seasonStats: PklRawStats | null = statsEntry?.season_12 || null;
  const careerStats: PklRawStats | null = statsEntry?.career || null;

  const { total_points, breakdown } = calculatePklPlayerPoints(
    raw.role,
    raw.tier,
    seasonStats,
    careerStats
  );

  const fallbackAvatar = generatePklPlayerAvatarSvg(
    initials,
    raw.jersey_number,
    teamColor,
    raw.name
  );

  const roleCode: PlayerRole =
    raw.role === 'Raider' ? 'RAID' : raw.role === 'Defender' ? 'DEF' : 'AR';

  return {
    id: raw.id,
    name: raw.name,
    player_name: raw.name,
    card_text: raw.card_text,
    jersey_number: raw.jersey_number ?? null,
    team: raw.team,
    team_code: raw.team_code,
    country: raw.nationality,
    nationality: raw.nationality,
    home_state: raw.nationality === 'India' ? 'India' : raw.nationality,
    role: raw.role as PlayerRole,
    batting_style: raw.position_detail, // Stores sub-position for display
    bowling_style: raw.position_detail, // Stores sub-position for display
    base_price: raw.base_price,
    capped: raw.tier === 'A' || raw.tier === 'B',
    tier: raw.tier as PlayerTier,
    initials,
    category: (raw.category === 'Category A'
      ? 'Marquee'
      : raw.category === 'Category B'
      ? 'Domestic Proven'
      : 'Emerging Talent') as PlayerCategory,
    image_url: (() => {
      const photosEnabled = process.env.NEXT_PUBLIC_PKL_PHOTOS !== 'off';
      if (!photosEnabled) return fallbackAvatar;
      const imgEntry = PKL_PLAYER_IMAGES[raw.id];
      if (imgEntry && imgEntry.verificationStatus === 'verified' && imgEntry.imagePath) {
        const imageBaseUrl = process.env.NEXT_PUBLIC_PKL_IMAGE_BASE_URL || '';
        return imageBaseUrl
          ? `${imageBaseUrl.replace(/\/$/, '')}/${raw.id}.webp`
          : imgEntry.imagePath;
      }
      return fallbackAvatar;
    })(),
    has_photo: (() => {
      const photosEnabled = process.env.NEXT_PUBLIC_PKL_PHOTOS !== 'off';
      if (!photosEnabled) return false;
      const imgEntry = PKL_PLAYER_IMAGES[raw.id];
      return Boolean(imgEntry && imgEntry.verificationStatus === 'verified' && imgEntry.imagePath);
    })(),
    photo_source: (() => {
      const photosEnabled = process.env.NEXT_PUBLIC_PKL_PHOTOS !== 'off';
      if (!photosEnabled) return 'Procedural PKL POOL Fallback';
      const imgEntry = PKL_PLAYER_IMAGES[raw.id];
      return imgEntry && imgEntry.verificationStatus === 'verified' && imgEntry.imagePath
        ? imgEntry.sourceName
        : 'Procedural PKL POOL Fallback';
    })(),
    player_points: total_points,
    stats_2026: {
      season: '2026',
      source: 'Official PKL Match Center',
      last_updated: '2026-11-22',
      matches: seasonStats?.matches ?? careerStats?.matches ?? 0,
      innings: 0,
      runs: seasonStats?.raid_points ?? careerStats?.raid_points ?? 0,
      highest_score: 0,
      batting_average: 0,
      strike_rate: 0,
      fifties: 0,
      hundreds: 0,
      fours: 0,
      sixes: 0,
      wickets: seasonStats?.tackle_points ?? careerStats?.tackle_points ?? 0,
      economy_rate: 0,
      bowling_average: 0,
      best_bowling: '—',
      maidens: 0,
      dot_balls: 0,
      catches: 0,
      stumpings: 0,
      player_points: total_points,
    },
    data_status: raw.data_status as any,
    achievements: [
      `${raw.category} Star`,
      raw.position_detail,
      raw.team,
    ],
  };
}

export const ALL_PKL_PLAYERS: Player[] = RAW_PKL_PLAYERS.map(adaptPklRecord);

/**
 * Retrieves a PKL player by their canonical ID (k-xxx) or legacy ID (pkl-xxx).
 */
export function getPklPlayerById(id: string): Player | undefined {
  if (!id) return undefined;
  if (id.startsWith('k-')) {
    return ALL_PKL_PLAYERS.find(p => p.id === id);
  }
  if (id.startsWith('pkl-')) {
    const targetKId = LEGACY_PKL_ID_MAP[id];
    if (targetKId) {
      return ALL_PKL_PLAYERS.find(p => p.id === targetKId);
    }
  }
  return ALL_PKL_PLAYERS.find(p => p.id === id);
}

export function getPklPlayersByTeam(teamOrCode: string): Player[] {
  const query = teamOrCode.toLowerCase();
  return ALL_PKL_PLAYERS.filter(
    p =>
      p.team?.toLowerCase() === query ||
      p.team_code?.toLowerCase() === query ||
      (p.team && p.team.toLowerCase().includes(query))
  );
}

export function getPklPlayersByRole(role: string): Player[] {
  const query = role.toUpperCase();
  return ALL_PKL_PLAYERS.filter(p => (p.role || '').toUpperCase().includes(query));
}
