import { FranchiseIdentity, RoomSettings } from './types';

export const MIN_RESERVE_PER_SLOT = 20_00_000; // ₹20 Lakhs

export const BID_INCREMENTS = [
  { label: '+₹25L', amount: 25_00_000 },
  { label: '+₹50L', amount: 50_00_000 },
  { label: '+₹1Cr', amount: 1_00_00_000 },
] as const;

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  purse: 100_00_00_000, // ₹100 Crore
  squad_size: 15,
  timer_seconds: 15,
  order_type: 'random',
  accelerated_round: true,
  selected_player_ids: [],
};

export const FRANCHISE_PRESETS: FranchiseIdentity[] = [
  { id: 'csk', name: 'Chennai Super Kings', short_code: 'CSK', color: '#F9CD05', secondary_color: '#005FA2' },
  { id: 'mi', name: 'Mumbai Indians', short_code: 'MI', color: '#004BA0', secondary_color: '#D1AB3E' },
  { id: 'rcb', name: 'Royal Challengers Bengaluru', short_code: 'RCB', color: '#E31B23', secondary_color: '#2B2A29' },
  { id: 'kkr', name: 'Kolkata Knight Riders', short_code: 'KKR', color: '#3A225D', secondary_color: '#F4C430' },
  { id: 'rr', name: 'Rajasthan Royals', short_code: 'RR', color: '#EA1A85', secondary_color: '#004BA0' },
  { id: 'srh', name: 'Sunrisers Hyderabad', short_code: 'SRH', color: '#F26522', secondary_color: '#000000' },
  { id: 'dc', name: 'Delhi Capitals', short_code: 'DC', color: '#17449E', secondary_color: '#B9251C' },
  { id: 'pbks', name: 'Punjab Kings', short_code: 'PBKS', color: '#DD1F2D', secondary_color: '#B0B0B0' },
  { id: 'gt', name: 'Gujarat Titans', short_code: 'GT', color: '#1B2133', secondary_color: '#BE9B52' },
  { id: 'lsg', name: 'Lucknow Super Giants', short_code: 'LSG', color: '#0057E7', secondary_color: '#E65100' },
  // Extra custom franchises to support up to 20 players:
  { id: 'ktk', name: 'Kochi Tuskers', short_code: 'KTK', color: '#7E22CE', secondary_color: '#EAB308' },
  { id: 'pw', name: 'Pune Warriors', short_code: 'PW', color: '#0D9488', secondary_color: '#0284C7' },
  { id: 'gl', name: 'Gujarat Lions', short_code: 'GL', color: '#EA580C', secondary_color: '#1E293B' },
  { id: 'rps', name: 'Rising Supergiant', short_code: 'RPS', color: '#9333EA', secondary_color: '#F43F5E' },
  { id: 'dc_old', name: 'Deccan Chargers', short_code: 'DCH', color: '#475569', secondary_color: '#94A3B8' },
  { id: 'hyd', name: 'Hyderabad Hawks', short_code: 'HH', color: '#D97706', secondary_color: '#15803D' },
  { id: 'ahm', name: 'Ahmedabad Aces', short_code: 'AA', color: '#2563EB', secondary_color: '#DC2626' },
  { id: 'del', name: 'Delhi Dragons', short_code: 'DD', color: '#DC2626', secondary_color: '#3B82F6' },
  { id: 'mum', name: 'Mumbai Mavericks', short_code: 'MM', color: '#0284C7', secondary_color: '#10B981' },
  { id: 'bng', name: 'Bengal Blasters', short_code: 'BB', color: '#6366F1', secondary_color: '#F59E0B' },
];

/**
 * Formats a currency amount into Indian Crore / Lakh string
 * e.g. 100_00_00_000 -> "₹100 Cr"
 * e.g. 1_50_00_000 -> "₹1.50 Cr"
 * e.g. 20_00_000 -> "₹20 L"
 * e.g. 25_00_000 -> "₹25 L"
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1_00_00_000) {
    const cr = amount / 1_00_00_000;
    // Format to max 2 decimals if not integer
    const formatted = cr % 1 === 0 ? cr.toString() : cr.toFixed(2);
    return `₹${formatted} Cr`;
  }
  if (amount >= 1_00_000) {
    const l = amount / 1_00_000;
    const formatted = l % 1 === 0 ? l.toString() : l.toFixed(1);
    return `₹${formatted} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatRoleName(role: string): string {
  switch (role) {
    case 'BAT':
      return 'Batter';
    case 'BOWL':
      return 'Bowler';
    case 'AR':
      return 'All-Rounder';
    case 'WK':
      return 'Wicket Keeper';
    default:
      return role;
  }
}

