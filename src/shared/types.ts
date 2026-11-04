export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';
export type PlayerTier = 'A' | 'B' | 'C';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  country: string;
  home_state: string;
  batting_style: string;
  bowling_style: string;
  base_price: number; // In Rupees, e.g. 2000000 (20L), 20000000 (2 Cr)
  capped: boolean;
  tier: PlayerTier;
  initials: string;
}

export interface FranchiseIdentity {
  id: string;
  name: string;
  short_code: string; // CSK, MI, RCB, etc.
  color: string; // hex
  secondary_color?: string;
}

export type OrderType = 'random' | 'role' | 'base_price';

export interface RoomSettings {
  purse: number; // 100_00_00_000 (100 Cr), 125_00_00_000, 150_00_00_000
  squad_size: number; // 15, 20, 25
  timer_seconds: number; // 10, 15, 20
  order_type: OrderType;
  accelerated_round: boolean;
  selected_player_ids: string[];
}

export interface BoughtPlayer {
  player_id: string;
  player: Player;
  bought_for: number;
  timestamp: number;
}

export interface Participant {
  id: string; // Unique session token / ID
  socket_id?: string;
  room_code: string;
  display_name: string;
  is_host: boolean;
  is_connected: boolean;
  last_active: number;
  franchise: FranchiseIdentity | null;
  purse_remaining: number;
  squad: BoughtPlayer[];
  has_withdrawn_current: boolean;
}

export interface Bid {
  id: string;
  player_id: string;
  participant_id: string;
  franchise_name: string;
  franchise_short_code: string;
  franchise_color: string;
  amount: number;
  timestamp: number;
}

export type AuctionPhase =
  | 'lobby'
  | 'starting'
  | 'bidding'
  | 'paused'
  | 'sold'
  | 'unsold'
  | 'round_break'
  | 'accelerated'
  | 'completed';

export interface AuctionState {
  room_code: string;
  phase: AuctionPhase;
  round_number: number; // 1 = Main, 2 = Accelerated
  current_player_index: number;
  current_player: Player | null;
  current_bid: number;
  current_bidder_id: string | null;
  timer_seconds: number;
  timer_ends_at: number; // Server epoch timestamp ms
  server_time: number; // Current server epoch ms for drift calculation
  bids: Bid[]; // Recent bids (up to last 10)
  withdrawn_participant_ids: string[];
  total_pool_count: number;
  remaining_pool_count: number;
  sold_count: number;
  unsold_count: number;
  is_paused: boolean;
  pause_remaining_ms?: number;
}

export interface ChatMessage {
  id: string;
  participant_id: string;
  display_name: string;
  franchise_short_code?: string;
  franchise_color?: string;
  message: string;
  timestamp: number;
}

export interface Reaction {
  id: string;
  participant_id: string;
  display_name: string;
  franchise_color: string;
  emoji: '🔥' | '😱' | '💰' | '😂' | '👏';
  timestamp: number;
}

export interface Award {
  id: string;
  title: string;
  description: string;
  winner_name: string;
  franchise_short_code: string;
  franchise_color: string;
  value_highlight: string;
}

export interface TeamScoreBreakdown {
  participant_id: string;
  display_name: string;
  franchise: FranchiseIdentity;
  total_score: number; // 0 - 100
  role_balance_score: number; // 0 - 40
  completeness_score: number; // 0 - 30
  value_score: number; // 0 - 30
  players_count: number;
  total_spent: number;
  purse_remaining: number;
  squad: BoughtPlayer[];
  rank: number;
}

export interface AuctionResults {
  room_code: string;
  completed_at: number;
  awards: Award[];
  leaderboard: TeamScoreBreakdown[];
  total_players_auctioned: number;
  total_money_spent: number;
  most_expensive_player: {
    player: Player;
    price: number;
    team: FranchiseIdentity;
  } | null;
  biggest_bidding_war: {
    player: Player;
    bids_count: number;
    final_price: number;
    team: FranchiseIdentity;
  } | null;
}

// Client to Server Events
export interface ClientToServerEvents {
  room_join: (data: { room_code: string; display_name: string; session_id: string }) => void;
  room_leave: (data: { room_code: string; session_id: string }) => void;
  franchise_pick: (data: { room_code: string; session_id: string; franchise: FranchiseIdentity }) => void;
  settings_update: (data: { room_code: string; session_id: string; settings: Partial<RoomSettings> }) => void;
  start_auction: (data: { room_code: string; session_id: string }) => void;
  place_bid: (data: { room_code: string; session_id: string; increment: number }) => void;
  withdraw_bid: (data: { room_code: string; session_id: string }) => void;
  host_pause: (data: { room_code: string; session_id: string }) => void;
  host_resume: (data: { room_code: string; session_id: string }) => void;
  host_skip: (data: { room_code: string; session_id: string }) => void;
  host_end_round: (data: { room_code: string; session_id: string }) => void;
  host_end_auction: (data: { room_code: string; session_id: string }) => void;
  host_kick: (data: { room_code: string; session_id: string; target_participant_id: string }) => void;
  host_transfer: (data: { room_code: string; session_id: string; new_host_participant_id: string }) => void;
  send_chat: (data: { room_code: string; session_id: string; message: string }) => void;
  send_reaction: (data: { room_code: string; session_id: string; emoji: Reaction['emoji'] }) => void;
  request_sync: (data: { room_code: string; session_id: string }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  state_sync: (payload: {
    room_code: string;
    settings: RoomSettings;
    participants: Participant[];
    auction_state: AuctionState;
    results?: AuctionResults | null;
  }) => void;
  error_message: (payload: { message: string; code?: string }) => void;
  bid_success: (payload: { bid: Bid; auction_state: AuctionState }) => void;
  bid_rejected: (payload: { reason: string; bid_amount?: number }) => void;
  withdraw_success: (payload: { participant_id: string }) => void;
  player_sold: (payload: {
    player: Player;
    winner: Participant;
    price: number;
    auction_state: AuctionState;
  }) => void;
  player_unsold: (payload: {
    player: Player;
    auction_state: AuctionState;
  }) => void;
  next_player: (payload: {
    player: Player;
    auction_state: AuctionState;
  }) => void;
  timer_tick: (payload: {
    timer_remaining: number;
    server_time: number;
  }) => void;
  new_chat: (message: ChatMessage) => void;
  new_reaction: (reaction: Reaction) => void;
  participant_joined: (participant: Participant) => void;
  participant_left: (participant_id: string) => void;
  host_changed: (new_host_id: string) => void;
  auction_paused: () => void;
  auction_resumed: (timer_ends_at: number) => void;
  auction_ended: (results: AuctionResults) => void;
  kicked: (reason: string) => void;
}

