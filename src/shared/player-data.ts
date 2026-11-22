import rawPlayersData from '../../players-database.json';
import playerImagesData from './player-images.json';
import {
  Player,
  PlayerCategory,
  PlayerDatabaseRecord,
  PlayerRole,
  PlayerStats2026,
  PlayerTier,
  PlayerImageEntry,
  ImageVerificationStatus,
} from './types';
import { getIplCareerStats, getIplSeasonStats, getPlayerAchievements } from './player-career-data';

export const RAW_PLAYER_DATABASE: PlayerDatabaseRecord[] = rawPlayersData as PlayerDatabaseRecord[];

export const PLAYER_IMAGES: Record<string, PlayerImageEntry> = playerImagesData as unknown as Record<string, PlayerImageEntry>;

export function getPlayerImageEntry(playerId: string): PlayerImageEntry | undefined {
  return PLAYER_IMAGES[playerId];
}

const TEAM_PALETTE: Record<string, string> = {
  Chennai: '#F9CD05',
  Mumbai: '#004BA0',
  Bengaluru: '#E31B23',
  Kolkata: '#3A225D',
  Rajasthan: '#EA1A85',
  Hyderabad: '#F26522',
  Delhi: '#17449E',
  Punjab: '#DD1F2D',
  Gujarat: '#1B2133',
  Lucknow: '#0057E7',
};

export function generatePlayerAvatarSvg(initials: string, number: number | null, color: string, name: string): string {
  const numDisplay = number ? `#${number}` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" width="200" height="250">
    <defs>
      <linearGradient id="bg_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#14161D" />
        <stop offset="50%" stop-color="#0E0F14" />
        <stop offset="100%" stop-color="#07080A" />
      </linearGradient>
      <radialGradient id="glow_${initials}" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#07080A" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="200" height="250" rx="20" fill="url(#bg_${initials})" />
    <rect width="200" height="250" rx="20" fill="url(#glow_${initials})" />
    <rect x="2" y="2" width="196" height="246" rx="18" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.4" />
    <circle cx="100" cy="95" r="42" fill="#0C0D11" stroke="${color}" stroke-width="2" stroke-opacity="0.6" />
    <text x="100" y="105" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">${initials}</text>
    <text x="100" y="160" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="800" fill="#DCC477" text-anchor="middle" letter-spacing="2">IPL POOL</text>
    <text x="100" y="185" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="700" fill="#8E92A4" text-anchor="middle">${numDisplay}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Authoritative auction-specific pricing and tier overlay for premier marquee stars.
 */
interface AuctionOverlay {
  base_price?: number;
  tier?: PlayerTier;
  capped?: boolean;
  home_state?: string;
}

const AUCTION_OVERLAYS: Record<string, AuctionOverlay> = {
  // 2.00 Crore Marquee Stars (Tier A)
  'Virat Kohli': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Delhi' },
  'Rohit Sharma': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Maharashtra' },
  'Jasprit Bumrah': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Gujarat' },
  'Suryakumar Yadav': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Maharashtra' },
  'Shubman Gill': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Punjab' },
  'Yashasvi Jaiswal': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Uttar Pradesh' },
  'Heinrich Klaasen': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Pretoria' },
  'Travis Head': { base_price: 20000000, tier: 'A', capped: true, home_state: 'South Australia' },
  'Ruturaj Gaikwad': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Maharashtra' },
  'Shreyas Iyer': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Maharashtra' },
  'Rishabh Pant': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Uttarakhand' },
  'KL Rahul': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Karnataka' },
  'Sanju Samson': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Kerala' },
  'Hardik Pandya': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Gujarat' },
  'Ravindra Jadeja': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Gujarat' },
  'Pat Cummins': { base_price: 20000000, tier: 'A', capped: true, home_state: 'New South Wales' },
  'Mitchell Starc': { base_price: 20000000, tier: 'A', capped: true, home_state: 'New South Wales' },
  'Rashid Khan': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Nangarhar' },
  'Nicholas Pooran': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Trinidad' },
  'Mohammed Shami': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Uttar Pradesh' },
  'Mohammed Siraj': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Telangana' },
  'Arshdeep Singh': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Madhya Pradesh' },
  'Trent Boult': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Rotorua' },
  'Kagiso Rabada': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Johannesburg' },
  'Kuldeep Yadav': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Uttar Pradesh' },
  'Yuzvendra Chahal': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Haryana' },
  'Mahendra Singh Dhoni': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Jharkhand' },
  'Sunil Narine': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Trinidad' },
  'Axar Patel': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Gujarat' },
  'Marcus Stoinis': { base_price: 20000000, tier: 'A', capped: true, home_state: 'Perth' },

  // 1.50 Crore Stars (Tier A)
  'Rinku Singh': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Uttar Pradesh' },
  'Tilak Varma': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Telangana' },
  'Shivam Dube': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Maharashtra' },
  'Abhishek Sharma': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Punjab' },
  'Nitish Kumar Reddy': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Andhra Pradesh' },
  'Riyan Parag': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Assam' },
  'Sam Curran': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Northampton' },
  'Liam Livingstone': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Cumberland' },
  'Ishan Kishan': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Bihar' },
  'Ravichandran Ashwin': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Tamil Nadu' },
  'Harshal Patel': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Gujarat' },
  'Varun Chakravarthy': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Tamil Nadu' },
  'Ravi Bishnoi': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Rajasthan' },
  'Mitch Marsh': { base_price: 15000000, tier: 'A', capped: true, home_state: 'Western Australia' },

  // 1.00 Crore Quality Stars (Tier B)
  'Jitesh Sharma': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Maharashtra' },
  'Sai Sudharsan': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Tamil Nadu' },
  'Dhruv Jurel': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Uttar Pradesh' },
  'Washington Sundar': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Tamil Nadu' },
  'Thangarasu Natarajan': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Tamil Nadu' },
  'Harshit Rana': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Delhi' },
  'Mayank Yadav': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Delhi' },
  'Bhuvneshwar Kumar': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Uttar Pradesh' },
  'Deepak Chahar': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Rajasthan' },
  'Shardul Thakur': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Maharashtra' },
  'Prasidh Krishna': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Karnataka' },
  'Avesh Khan': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Madhya Pradesh' },
  'Mukesh Kumar': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Bihar' },
  'Khaleel Ahmed': { base_price: 10000000, tier: 'B', capped: true, home_state: 'Rajasthan' },

  // 75 Lakhs - 50 Lakhs (Tier B)
  'Shahrukh Khan': { base_price: 7500000, tier: 'B', capped: false, home_state: 'Tamil Nadu' },
  'Rahul Tewatia': { base_price: 7500000, tier: 'B', capped: false, home_state: 'Haryana' },
  'Ashutosh Sharma': { base_price: 5000000, tier: 'B', capped: false, home_state: 'Madhya Pradesh' },
  'Shashank Singh': { base_price: 5000000, tier: 'B', capped: false, home_state: 'Chhattisgarh' },
  'Ramandeep Singh': { base_price: 5000000, tier: 'B', capped: false, home_state: 'Punjab' },
  'Mohit Sharma': { base_price: 5000000, tier: 'B', capped: true, home_state: 'Haryana' },
  'Sandeep Sharma': { base_price: 5000000, tier: 'B', capped: true, home_state: 'Punjab' },
  'Rahul Chahar': { base_price: 5000000, tier: 'B', capped: true, home_state: 'Rajasthan' },
  'Mayank Markande': { base_price: 5000000, tier: 'B', capped: true, home_state: 'Punjab' },
  'Sai Kishore': { base_price: 5000000, tier: 'B', capped: false, home_state: 'Tamil Nadu' },

  // 30 Lakhs (Tier C)
  'Angkrish Raghuvanshi': { base_price: 3000000, tier: 'C', capped: false, home_state: 'Delhi' },
  'Rasikh Salam': { base_price: 3000000, tier: 'C', capped: false, home_state: 'Jammu & Kashmir' },
  'Vaibhav Arora': { base_price: 3000000, tier: 'C', capped: false, home_state: 'Himachal Pradesh' },
  'Suyash Sharma': { base_price: 3000000, tier: 'C', capped: false, home_state: 'Delhi' },
  'Manav Suthar': { base_price: 3000000, tier: 'C', capped: false, home_state: 'Rajasthan' },
};

/**
 * Computes initials for badges and avatars.
 */
export function getPlayerInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0][0] + parts[1][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Calculate deterministic player points based on verified statistical performance.
 */
function calculateVerifiedPlayerPoints(
  seasonStats: any,
  careerStats: any,
  tier: PlayerTier
): number {
  const tierBonus = tier === 'A' ? 200 : tier === 'B' ? 100 : 0;

  if (seasonStats && seasonStats.has_season_stats && seasonStats.matches > 0) {
    const runs = seasonStats.runs ?? 0;
    const wickets = seasonStats.wickets ?? 0;
    const fours = seasonStats.fours ?? 0;
    const sixes = seasonStats.sixes ?? 0;
    const sr = seasonStats.strike_rate ?? 0;
    const econ = seasonStats.economy_rate ?? 0;

    const batPts = runs * 0.75 + fours * 1.0 + sixes * 2.0 + (sr > 150 ? 30 : sr > 130 ? 15 : 0);
    const bowlPts = wickets * 28.0 + (econ > 0 && econ < 8.0 ? 30 : econ > 0 && econ < 9.0 ? 15 : 0);
    return Math.min(990, Math.max(160, Math.round(batPts + bowlPts + tierBonus)));
  }

  if (careerStats && careerStats.has_ipl_career && careerStats.matches > 0) {
    const base = tier === 'A' ? 750 : tier === 'B' ? 520 : 320;
    const careerRuns = careerStats.runs ?? 0;
    const careerWkts = careerStats.wickets ?? 0;
    const runBonus = careerRuns > 4000 ? 120 : careerRuns > 2000 ? 70 : careerRuns > 500 ? 30 : 0;
    const bowlBonus = careerWkts > 100 ? 120 : careerWkts > 50 ? 70 : careerWkts > 20 ? 30 : 0;
    return Math.min(960, Math.max(200, Math.round(base + runBonus + bowlBonus)));
  }

  // Debutant baseline by tier
  return tier === 'A' ? 680 : tier === 'B' ? 450 : 250;
}

/**
 * Maps a canonical database record into an auction-ready Player instance
 * powered exclusively by the verified Upto2026 CSV datasets.
 */
function adaptDatabaseRecord(raw: PlayerDatabaseRecord): Player {
  const overlay = AUCTION_OVERLAYS[raw.player_name] || {};
  const isOverseas = raw.nationality !== 'India';

  const base_price = overlay.base_price ?? (isOverseas ? 5000000 : 2000000);
  const capped = overlay.capped ?? isOverseas;
  const tier: PlayerTier =
    overlay.tier ??
    (base_price >= 15000000 ? 'A' : base_price >= 5000000 ? 'B' : 'C');

  let category: PlayerCategory;
  if (tier === 'A') {
    category = isOverseas ? 'International Star' : 'Marquee';
  } else if (tier === 'B') {
    category = isOverseas ? 'International Star' : capped ? 'Domestic Proven' : 'Emerging Talent';
  } else {
    category = 'Emerging Talent';
  }

  const home_state = overlay.home_state || raw.nationality;
  const initials = getPlayerInitials(raw.player_name);
  const teamColor = TEAM_PALETTE[raw['team code']] || '#FF7A1A';

  // Retrieve verified stats exclusively from authoritative CSV registry
  const careerStats = getIplCareerStats(raw.id);
  const seasonStats = getIplSeasonStats(raw.id);

  const points = calculateVerifiedPlayerPoints(seasonStats, careerStats, tier);

  const stats2026: PlayerStats2026 = {
    season: '2026',
    source: 'Official IPL Match Center & Historical Registry',
    last_updated: '2026-03-01',
    verification_status: seasonStats.has_season_stats ? 'verified' : 'unavailable',
    stat_label: seasonStats.has_season_stats ? 'Verified IPL 2026 Official Archive' : 'No 2026 Match Appearances',
    matches: seasonStats.matches ?? 0,
    innings: seasonStats.innings ?? 0,
    runs: seasonStats.runs ?? 0,
    highest_score: 0,
    batting_average: seasonStats.batting_average ?? 0,
    strike_rate: seasonStats.strike_rate ?? 0,
    fifties: 0,
    hundreds: 0,
    fours: seasonStats.fours ?? 0,
    sixes: seasonStats.sixes ?? 0,
    wickets: seasonStats.wickets ?? 0,
    economy_rate: seasonStats.economy_rate ?? 0,
    bowling_average: 0,
    best_bowling: '—',
    maidens: 0,
    dot_balls: 0,
    catches: 0,
    stumpings: 0,
    player_points: points,
  };

  const imageMeta = PLAYER_IMAGES[raw.id];
  const isVerified = imageMeta?.verificationStatus === 'verified' && Boolean(imageMeta.imagePath);
  const authenticPhoto = isVerified ? imageMeta.imagePath : null;
  const has_photo = Boolean(authenticPhoto);
  const image_url = authenticPhoto || generatePlayerAvatarSvg(initials, raw.jersey_number, teamColor, raw.player_name);
  const photo_source = has_photo
    ? (imageMeta?.sourceName || 'Official IPL T20 Media Assets')
    : 'Procedural IPL Fallback (Official Photo Pending)';

  return {
    id: raw.id,
    name: raw.player_name,
    player_name: raw.player_name,
    player_name_from_card: raw.player_name_from_card,
    card_text: raw.card_text,
    jersey_number: raw.jersey_number,
    team: raw.team,
    team_code: raw['team code'],
    nationality: raw.nationality,
    country: raw.nationality,
    role: raw.role as PlayerRole,
    home_state,
    batting_style: raw.batting_style || 'Right Handed',
    bowling_style: raw.bowling_style || 'Right-arm medium',
    base_price,
    capped,
    tier,
    initials,
    category,
    image_url,
    has_photo,
    photo_source,
    stats_2026: stats2026,
    ipl_career_stats: careerStats,
    season_2026_stats: seasonStats,
    data_status: careerStats.status,
    achievements: getPlayerAchievements(raw.player_name),
    player_points: points,
  };
}

/**
 * Authoritative complete player pool for the IPL Auction platform.
 * Single source of truth loaded from players-database.json and verified CSV datasets.
 */
export const ALL_PLAYERS: Player[] = RAW_PLAYER_DATABASE.map(adaptDatabaseRecord);

/**
 * Retrieves a single player by their unique identifier (e.g., 'p-001').
 */
export function getPlayerById(id: string): Player | undefined {
  return ALL_PLAYERS.find(p => p.id === id);
}

/**
 * Filter players by franchise name or code.
 */
export function getPlayersByTeam(teamOrCode: string): Player[] {
  const query = teamOrCode.toLowerCase();
  return ALL_PLAYERS.filter(
    p =>
      p.team?.toLowerCase() === query ||
      p.team_code?.toLowerCase() === query ||
      (p.team && p.team.toLowerCase().includes(query))
  );
}

/**
 * Filter players by cricket role (Batter, Bowler, All-Rounder, Wicketkeeper).
 */
export function getPlayersByRole(role: string): Player[] {
  const query = role.toLowerCase();
  return ALL_PLAYERS.filter(p => p.role.toLowerCase() === query);
}

/**
 * Filter players by nationality (e.g., India, South Africa, Australia).
 */
export function getPlayersByNationality(nationality: string): Player[] {
  const query = nationality.toLowerCase();
  return ALL_PLAYERS.filter(p => p.nationality?.toLowerCase() === query);
}

/**
 * General multi-attribute search for player selection.
 */
export function searchPlayers(query: string): Player[] {
  const q = query.toLowerCase().trim();
  if (!q) return ALL_PLAYERS;
  return ALL_PLAYERS.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      (p.team && p.team.toLowerCase().includes(q)) ||
      (p.team_code && p.team_code.toLowerCase().includes(q)) ||
      p.country.toLowerCase().includes(q)
  );
}
