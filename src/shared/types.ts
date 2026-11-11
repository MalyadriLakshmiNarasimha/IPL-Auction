export type PlayerRole =
  | 'BAT'
  | 'BOWL'
  | 'AR'
  | 'WK'
  | 'Batter'
  | 'Bowler'
  | 'All-Rounder'
  | 'Wicketkeeper';

export type PlayerTier = 'A' | 'B' | 'C';

export type PlayerCategory =
  | 'Marquee'
  | 'International Star'
  | 'Domestic Proven'
  | 'Emerging Talent';

export type StatVerificationStatus = 'verified' | 'projected' | 'historical_benchmark' | 'unavailable';

export type ImageVerificationStatus = 'verified' | 'missing' | 'ambiguous';

export interface PlayerImageEntry {
  playerId: string;
  playerName: string;
  imagePath: string | null;
  sourceUrl: string | null;
  sourceName: string;
  verificationStatus: ImageVerificationStatus;
  verifiedAt: string;
  imageWidth: number | null;
  imageHeight: number | null;
}

export interface PlayerStats2026 {
  season: '2026';
  source: string;
  source_url?: string;
  last_updated: string;
  verification_status?: StatVerificationStatus;
  stat_label?: string; // e.g. "Verified IPL Official Archive" or "2026 Projected Performance"
  matches: number;
  innings: number;
  runs: number;
  highest_score: number;
  batting_average: number;
  strike_rate: number;
  fifties: number;
  hundreds: number;
  fours: number;
  sixes: number;
  wickets: number;
  economy_rate: number;
  bowling_average: number;
  best_bowling: string;
  maidens: number;
  dot_balls: number;
  catches: number;
  stumpings: number;
  player_points: number; // 0 - 1000 deterministic player performance points
}

export interface PlayerDatabaseRecord {
  id: string;
  card_text: string | null;
  player_name_from_card: string | null;
  jersey_number: number | null;
  team: string;
  'team code': string;
  player_name: string;
  nationality: string;
  role: string;
  batting_style: string | null;
  bowling_style: string | null;
}

export interface IplCareerStats {
  matches: number;
  runs: number;
  strike_rate: number;
  batting_average: number;
  has_ipl_career: boolean;
}

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

  // Enriched 2026 IPL ecosystem fields
  category: PlayerCategory;
  image_url: string;
  has_photo?: boolean; // true if authentic headshot photograph exists, false if vector monogram fallback
  photo_source?: string;
  stats_2026: PlayerStats2026;
  ipl_career_stats?: IplCareerStats;
  achievements?: string[];
  player_points: number;

  // Scraped centralized database fields
  card_text?: string | null;
  player_name_from_card?: string | null;
  jersey_number?: number | null;
  team?: string;
  team_code?: string;
  player_name?: string;
  nationality?: string;
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
  purchase_price?: number;
  timestamp: number;
}

export interface Participant {
  id: string; // Unique session token / ID
  socket_id?: string;
  room_code: string;
  display_name: string;
  team_name?: string;
  team_name_normalized?: string;
  team_short_code?: string;
  team_color?: string;
  is_host: boolean;
  is_connected: boolean;
  last_active: number;
  franchise: FranchiseIdentity | null;
  purse_remaining: number;
  squad: BoughtPlayer[];
  has_withdrawn_current: boolean;

  // Role & Spectator enhancements
  is_spectator?: boolean;
  role?: 'host' | 'manager' | 'spectator';

  // Smart Purse & Squad Composition metrics
  amount_spent?: number;
  avg_purchase_price?: number;
  spent_by_role?: {
    BAT: number;
    BOWL: number;
    AR: number;
    WK: number;
  };
  role_counts?: {
    BAT: number;
    BOWL: number;
    AR: number;
    WK: number;
    overseas: number;
  };
  squad_shortages?: string[];
  squad_excesses?: string[];
}

export interface Bid {
  id: string;
  player_id: string;
  participant_id: string;
  team_name?: string;
  franchise_name: string;
  franchise_short_code: string;
  franchise_color: string;
  amount: number;
  timestamp: number;
}

export type WorkflowStage =
  | 'lobby'
  | 'main_auction'
  | 'unsold_auction'
  | 'trading_window'
  | 'squad_evaluation'
  | 'playing_xi_selection'
  | 'playing_xi_evaluation'
  | 'championship_recap';

export type AuctionPhase =
  | 'lobby'
  | 'starting'
  | 'announcing'
  | 'bidding'
  | 'paused'
  | 'sold'
  | 'unsold'
  | 'round_break'
  | 'accelerated'
  | 'unsold_round'
  | 'trading'
  | 'evaluation'
  | 'playing_xi'
  | 'completed';

export interface AuctionState {
  room_code: string;
  phase: AuctionPhase;
  stage?: WorkflowStage;
  round_number: number; // 1 = Main, 2 = Accelerated / Unsold
  current_player_index: number;
  current_player: Player | null;
  current_category?: string; // Authoritative active category: 'BATTERS' | 'BOWLERS' | 'ALL-ROUNDERS' | 'WICKET KEEPERS'
  upcoming_players?: Player[];
  current_bid: number;
  current_bidder_id: string | null;
  timer_seconds: number;
  timer_ends_at: number; // Server epoch timestamp ms
  server_time: number; // Current server epoch ms for drift calculation
  bids: Bid[]; // Recent bids (up to last 10)
  withdrawn_participant_ids: string[];
  pass_count?: number;
  total_eligible_passers?: number;
  passed_participant_ids?: string[];
  total_pool_count: number;
  remaining_pool_count: number;
  sold_count: number;
  unsold_count: number;
  is_paused: boolean;
  pause_remaining_ms?: number;

  // Announcement sequence & timing (authoritative server-controlled)
  announcement_text?: string;
  announcement_duration_ms?: number;
  announcement_started_at?: number;
  announcement_ends_at?: number;
  bidding_started_at?: number;

  // Stage countdown & trading timers
  stage_duration_seconds?: number;
  stage_ends_at?: number;
  active_trades_count?: number;
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

export interface CommentaryEvent {
  id: string;
  room_code: string;
  text: string;
  type: 'bid' | 'bidding_war' | 'sold' | 'unsold' | 'record' | 'trade' | 'stage';
  timestamp: number;
}

export interface Reaction {
  id: string;
  participant_id: string;
  display_name: string;
  franchise_color: string;
  emoji: '🔥' | '😂' | '👏' | '😮' | '❤️' | '💪' | '🥵' | '😱' | '💰' | string;
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

  // 5-Pillar Detailed Scoring Extensions
  individual_performance_score?: number; // 0 - 40
  batting_strength_score?: number; // 0 - 20
  bowling_strength_score?: number; // 0 - 20
  allrounder_strength_score?: number; // 0 - 10
  squad_balance_score?: number; // 0 - 10
  strengths?: string[];
  weaknesses?: string[];
  scoring_version?: string;
}

export interface ManagerScoreBreakdown {
  participant_id: string;
  display_name: string;
  franchise: FranchiseIdentity;
  total_manager_score: number; // 0 - 100
  purse_efficiency_score: number; // 0 - 25
  value_for_money_score: number; // 0 - 30
  trade_quality_score: number; // 0 - 20
  squad_strength_score: number; // 0 - 25
  rank: number;
  efficiency_details: {
    purse_spent: number;
    purse_remaining: number;
    savings_ratio: number;
    reserve_maintained: boolean;
  };
  bargain_picks: {
    player_name: string;
    paid: number;
    benchmark: number;
    surplus: number;
  }[];
  trade_impact: {
    trades_count: number;
    net_points_diff: number;
  };
}

export interface TradeOffer {
  id: string;
  room_code: string;
  sender_id: string;
  sender_name: string;
  sender_franchise: FranchiseIdentity;
  receiver_id: string;
  receiver_name: string;
  receiver_franchise: FranchiseIdentity;
  offered_player: Player;
  requested_player: Player;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'cancelled';
  counter_player?: Player;
  timestamp: number;
}

export interface TradeTransaction {
  id: string;
  room_code: string;
  team_a_name: string;
  team_a_short: string;
  player_a: Player;
  team_b_name: string;
  team_b_short: string;
  player_b: Player;
  timestamp: number;
}

export interface PlayingXISubmission {
  participant_id: string;
  display_name: string;
  franchise: FranchiseIdentity;
  players: Player[]; // exactly 11 players
  batting_order: string[]; // 11 player ids in 1-11 sequence
  wicketkeeper_id: string;
  captain_id?: string;
  substitutes: Player[];
  is_submitted: boolean;
  is_locked?: boolean;
  score?: number;
  breakdown?: PlayingXIScoreBreakdown;
}

export interface PlayingXIScoreBreakdown {
  participant_id: string;
  display_name: string;
  franchise: FranchiseIdentity;
  total_score: number; // 0 - 100
  batting_score: number; // 0 - 30
  bowling_score: number; // 0 - 30
  allrounder_score: number; // 0 - 20
  balance_score: number; // 0 - 20
  rank: number;
  strengths: string[];
  weaknesses: string[];
  openers_rating: number;
  middle_order_rating: number;
  finishers_rating: number;
  pace_spin_ratio: string;
  overseas_count: number;
}

export interface SeasonRecap {
  total_spent: number;
  players_sold: number;
  unsold_players_count: number;
  highest_purchase: {
    player: Player;
    price: number;
    franchise: FranchiseIdentity;
  } | null;
  best_bargain: {
    player: Player;
    price: number;
    franchise: FranchiseIdentity;
    surplus: number;
  } | null;
  highest_spending_team: {
    franchise: FranchiseIdentity;
    spent: number;
  } | null;
  total_trades_completed: number;
  champion_team: FranchiseIdentity | null;
}

export interface AuctionResults {
  room_code: string;
  completed_at: number;
  current_stage?: WorkflowStage;
  awards: Award[];
  leaderboard: TeamScoreBreakdown[];
  manager_leaderboard?: ManagerScoreBreakdown[];
  playing_xi_leaderboard?: PlayingXIScoreBreakdown[];
  playing_xi_submissions?: PlayingXISubmission[];
  trades?: TradeTransaction[];
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
  season_recap?: SeasonRecap;
}

// Client to Server Events
export interface ClientToServerEvents {
  room_join: (data: { room_code: string; display_name: string; session_id: string; is_spectator?: boolean }) => void;
  room_leave: (data: { room_code: string; session_id: string }) => void;
  franchise_pick: (data: { room_code: string; session_id: string; franchise: FranchiseIdentity }) => void;
  settings_update: (data: { room_code: string; session_id: string; settings: Partial<RoomSettings> }) => void;
  start_auction: (data: { room_code: string; session_id: string }) => void;
  place_bid: (data: {
    room_code: string;
    session_id: string;
    increment?: number;
    amount?: number;
    is_explicit_amount?: boolean;
    is_custom?: boolean;
  }) => void;
  withdraw_bid: (data: { room_code: string; session_id: string }) => void;
  pass_player: (data: { room_code: string; session_id: string }) => void;
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

  // New Workflow Events
  stage_change: (data: { room_code: string; session_id: string; stage: WorkflowStage; duration_seconds?: number }) => void;
  toggle_spectator: (data: { room_code: string; session_id: string; is_spectator: boolean }) => void;
  unsold_pool_configure: (data: { room_code: string; session_id: string; player_ids: string[]; order_type?: OrderType }) => void;
  trade_propose: (data: { room_code: string; session_id: string; target_participant_id: string; offered_player_id: string; requested_player_id: string }) => void;
  trade_respond: (data: { room_code: string; session_id: string; trade_id: string; action: 'accept' | 'reject' | 'counter'; counter_player_id?: string }) => void;
  trade_cancel: (data: { room_code: string; session_id: string; trade_id: string }) => void;
  playing_xi_save_draft: (data: { room_code: string; session_id: string; submission: Partial<PlayingXISubmission> }) => void;
  playing_xi_submit: (data: { room_code: string; session_id: string; submission: PlayingXISubmission }) => void;

  // Custom Team Identity & Announcement Events
  set_team_name: (data: { room_code: string; session_id: string; team_name: string; team_color?: string }) => void;
  announcement_completed: (data: { room_code: string; session_id: string; player_id: string }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  state_sync: (payload: {
    room_code: string;
    settings: RoomSettings;
    participants: Participant[];
    auction_state: AuctionState;
    results?: AuctionResults | null;
    trades?: TradeTransaction[];
    pending_trade_offers?: TradeOffer[];
    playing_xi_submissions?: PlayingXISubmission[];
    commentary?: CommentaryEvent[];
  }) => void;
  error_message: (payload: { message: string; code?: string }) => void;
  bid_success: (payload: { bid: Bid; auction_state: AuctionState }) => void;
  bid_rejected: (payload: { reason: string; bid_amount?: number }) => void;
  withdraw_success: (payload: { participant_id: string }) => void;
  pass_updated: (payload: {
    pass_count: number;
    total_eligible: number;
    passed_participant_ids: string[];
  }) => void;
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
  bidding_started: (payload: {
    player: Player;
    timer_ends_at: number;
    timer_seconds: number;
    auction_state: AuctionState;
  }) => void;
  team_name_updated: (payload: {
    session_id: string;
    team_name: string;
    team_short_code: string;
    team_color: string;
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

  // New Workflow Broadcasts
  stage_transitioned: (payload: { stage: WorkflowStage; auction_state: AuctionState }) => void;
  commentary_broadcast: (commentary: CommentaryEvent) => void;
  trade_offer_received: (offer: TradeOffer) => void;
  trade_offer_updated: (offer: TradeOffer) => void;
  trade_executed: (payload: { trade: TradeTransaction; team_a_squad: BoughtPlayer[]; team_b_squad: BoughtPlayer[] }) => void;
  playing_xi_updated: (submission: PlayingXISubmission) => void;
}

