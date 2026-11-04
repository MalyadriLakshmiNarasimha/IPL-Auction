-- IPLAuction PostgreSQL Schema
-- Tables: rooms, settings, participants, franchises, pool_players, auction_state, bids, results, chat_messages

CREATE TABLE IF NOT EXISTS rooms (
  room_code VARCHAR(6) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  host_participant_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'lobby',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  room_code VARCHAR(6) PRIMARY KEY REFERENCES rooms(room_code) ON DELETE CASCADE,
  purse BIGINT NOT NULL DEFAULT 1000000000,
  squad_size INT NOT NULL DEFAULT 15,
  timer_seconds INT NOT NULL DEFAULT 15,
  order_type VARCHAR(32) NOT NULL DEFAULT 'random',
  accelerated_round BOOLEAN NOT NULL DEFAULT TRUE,
  selected_player_ids JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS participants (
  id VARCHAR(64) NOT NULL,
  room_code VARCHAR(6) NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  is_connected BOOLEAN NOT NULL DEFAULT TRUE,
  last_active BIGINT NOT NULL,
  purse_remaining BIGINT NOT NULL DEFAULT 1000000000,
  franchise_id VARCHAR(32),
  franchise_name VARCHAR(100),
  franchise_short_code VARCHAR(8),
  franchise_color VARCHAR(16),
  squad JSONB NOT NULL DEFAULT '[]',
  has_withdrawn_current BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id, room_code)
);

CREATE TABLE IF NOT EXISTS pool_players (
  room_code VARCHAR(6) NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
  player_id VARCHAR(32) NOT NULL,
  round_number INT NOT NULL DEFAULT 1,
  auction_order INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, sold, unsold
  sold_to_participant_id VARCHAR(64),
  final_price BIGINT,
  PRIMARY KEY (room_code, player_id, round_number)
);

CREATE TABLE IF NOT EXISTS auction_state (
  room_code VARCHAR(6) PRIMARY KEY REFERENCES rooms(room_code) ON DELETE CASCADE,
  phase VARCHAR(32) NOT NULL DEFAULT 'lobby',
  round_number INT NOT NULL DEFAULT 1,
  current_player_index INT NOT NULL DEFAULT 0,
  current_player_id VARCHAR(32),
  current_bid BIGINT NOT NULL DEFAULT 0,
  current_bidder_id VARCHAR(64),
  timer_ends_at BIGINT NOT NULL DEFAULT 0,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  pause_remaining_ms INT DEFAULT 0,
  withdrawn_participant_ids JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bids (
  id VARCHAR(64) PRIMARY KEY,
  room_code VARCHAR(6) NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
  player_id VARCHAR(32) NOT NULL,
  participant_id VARCHAR(64) NOT NULL,
  franchise_name VARCHAR(100) NOT NULL,
  franchise_short_code VARCHAR(8) NOT NULL,
  franchise_color VARCHAR(16) NOT NULL,
  amount BIGINT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
  room_code VARCHAR(6) PRIMARY KEY REFERENCES rooms(room_code) ON DELETE CASCADE,
  completed_at BIGINT NOT NULL,
  awards JSONB NOT NULL DEFAULT '[]',
  leaderboard JSONB NOT NULL DEFAULT '[]',
  total_players_auctioned INT NOT NULL DEFAULT 0,
  total_money_spent BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(64) PRIMARY KEY,
  room_code VARCHAR(6) NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
  participant_id VARCHAR(64) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  franchise_short_code VARCHAR(8),
  franchise_color VARCHAR(16),
  message TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_code);
CREATE INDEX IF NOT EXISTS idx_bids_room ON bids(room_code, player_id);
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_code, timestamp);

