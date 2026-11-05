import rawPlayersData from '../../players-database.json';
import { Player, PlayerDatabaseRecord, PlayerRole, PlayerTier } from './types';

export const RAW_PLAYER_DATABASE: PlayerDatabaseRecord[] = rawPlayersData as PlayerDatabaseRecord[];

/**
 * Optional auction-specific pricing and tier overlay for premier marquee stars.
 * Scraped official squad data does not include auction economics, so this
 * configuration supplies authoritative IPL auction base valuations.
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
 * Computes human-friendly initials for badges and avatars.
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
  // For 3+ words (e.g. Mahendra Singh Dhoni -> MSD)
  return (parts[0][0] + parts[1][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Maps a canonical scraped database record into an auction-ready Player instance.
 */
function adaptDatabaseRecord(raw: PlayerDatabaseRecord): Player {
  const overlay = AUCTION_OVERLAYS[raw.player_name] || {};
  const isOverseas = raw.nationality !== 'India';

  // Base price: overlay price or ₹20 Lakhs IPL reserve default
  const base_price = overlay.base_price ?? (isOverseas ? 5000000 : 2000000);

  // Capped: overseas players are international capped; Indian players follow overlay or uncapped default
  const capped = overlay.capped ?? isOverseas;

  // Tier: A (>= 1.5 Cr), B (>= 50L), C (< 50L)
  const tier: PlayerTier =
    overlay.tier ??
    (base_price >= 15000000 ? 'A' : base_price >= 5000000 ? 'B' : 'C');

  const home_state = overlay.home_state || raw.nationality;

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
    bowling_style: raw.bowling_style || 'None',
    base_price,
    capped,
    tier,
    initials: getPlayerInitials(raw.player_name),
  };
}

/**
 * Authoritative complete player pool for the IPL Auction platform.
 * Single source of truth loaded from players-database.json.
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
