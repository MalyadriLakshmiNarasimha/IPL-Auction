import { describe, it, expect } from 'vitest';
import { validateBid, getBidButtonStatus, validateAuctionStart } from '../../src/shared/validation';
import { validateTeamName, deriveTeamShortCode } from '../../src/shared/team-validation';
import { AuctionState, Participant, Player, RoomSettings } from '../../src/shared/types';
import { MIN_RESERVE_PER_SLOT, getMinAuctionParticipants, MIN_AUCTION_PARTICIPANTS } from '../../src/shared/constants';

describe('Authoritative Auction Rules & Bid Validation', () => {
  const dummyPlayer: Player = {
    id: 'p-001',
    name: 'Virat Kohli',
    role: 'BAT',
    country: 'India',
    home_state: 'Delhi',
    batting_style: 'Right-hand bat',
    bowling_style: 'Right-arm medium',
    base_price: 20000000, // 2 Cr
    capped: true,
    tier: 'A',
    initials: 'VK',
    category: 'Marquee',
    image_url: '/players/virat-kohli.svg',
    player_points: 920,
    stats_2026: {
      season: '2026',
      source: 'IPL 2026 Official Archive',
      last_updated: '2026-03-01',
      matches: 15,
      innings: 15,
      runs: 741,
      highest_score: 113,
      batting_average: 61.75,
      strike_rate: 154.7,
      fifties: 5,
      hundreds: 1,
      fours: 62,
      sixes: 38,
      wickets: 0,
      economy_rate: 0,
      bowling_average: 0,
      best_bowling: '0/0',
      maidens: 0,
      dot_balls: 0,
      catches: 8,
      stumpings: 0,
      player_points: 920,
    },
  };

  const defaultSettings: RoomSettings = {
    purse: 1000000000, // 100 Cr
    squad_size: 15,
    timer_seconds: 15,
    order_type: 'random',
    accelerated_round: true,
    selected_player_ids: ['p-001'],
  };

  function createParticipant(overrides: Partial<Participant> = {}): Participant {
    return {
      id: 'user-1',
      room_code: 'ROOM01',
      display_name: 'Player One',
      is_host: true,
      is_connected: true,
      last_active: Date.now(),
      franchise: { id: 'rcb', name: 'Royal Challengers Bengaluru', short_code: 'RCB', color: '#E31B23' },
      purse_remaining: 1000000000,
      squad: [],
      has_withdrawn_current: false,
      ...overrides,
    };
  }

  function createAuctionState(overrides: Partial<AuctionState> = {}): AuctionState {
    return {
      room_code: 'ROOM01',
      phase: 'bidding',
      round_number: 1,
      current_player_index: 0,
      current_player: dummyPlayer,
      current_bid: 0,
      current_bidder_id: null,
      timer_seconds: 15,
      timer_ends_at: Date.now() + 15000,
      server_time: Date.now(),
      bids: [],
      withdrawn_participant_ids: [],
      total_pool_count: 50,
      remaining_pool_count: 50,
      sold_count: 0,
      unsold_count: 0,
      is_paused: false,
      ...overrides,
    };
  }

  it('1. First bid must equal player base price', () => {
    const participant = createParticipant();
    const state = createAuctionState();

    const res = validateBid(participant, state, defaultSettings, 2500000, false);
    expect(res.valid).toBe(true);
    expect(res.expectedAmount).toBe(dummyPlayer.base_price);
  });

  it('2. Rejects if participant is already highest bidder', () => {
    const participant = createParticipant({ id: 'user-1' });
    const state = createAuctionState({
      current_bid: 20000000,
      current_bidder_id: 'user-1',
    });

    const res = validateBid(participant, state, defaultSettings, 2500000, false);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/already the highest bidder/i);
  });

  it('3. Rejects if participant has withdrawn from current player', () => {
    const participant = createParticipant({ has_withdrawn_current: true });
    const state = createAuctionState({ current_bid: 20000000, current_bidder_id: 'user-2' });

    const res = validateBid(participant, state, defaultSettings, 2500000, false);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/withdrawn/i);
  });

  it('4. Rejects if squad is already full', () => {
    const fullSquad = Array(15).fill({
      player_id: 'p-old',
      player: dummyPlayer,
      bought_for: 20000000,
      timestamp: Date.now(),
    });

    const participant = createParticipant({ squad: fullSquad });
    const state = createAuctionState({ current_bid: 20000000, current_bidder_id: 'user-2' });

    const res = validateBid(participant, state, defaultSettings, 2500000, false);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/squad is already full/i);
  });

  it('5. Reserve Rule: Rejects when remaining purse is insufficient for remaining slots at 20L each', () => {
    // Current squad: 0 players. Squad target: 15.
    // If user buys this player, remaining empty slots = 15 - 1 = 14 slots.
    // Minimum reserve needed = 14 * 20L = 2.8 Cr = 28000000.
    // If purse is 3 Cr (30000000) and user tries to bid 50L (5000000):
    // purse_after_bid = 2.5 Cr (25000000) < 2.8 Cr reserve -> MUST BE REJECTED!
    const participant = createParticipant({
      purse_remaining: 30000000, // 3 Cr
      squad: [],
    });
    const state = createAuctionState({
      current_bid: 20000000, // 2 Cr
      current_bidder_id: 'user-2',
    });

    // Try to bid 50L increment -> target bid = 2.5 Cr
    // Remaining purse after bid = 3 Cr - 2.5 Cr = 0.5 Cr (50L).
    // Reserve needed for 14 slots = 2.8 Cr.
    const res = validateBid(participant, state, defaultSettings, 5000000, false);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/reserve rule/i);
  });

  it('6. Reserve Rule: Allows spending all remaining purse on the final squad slot', () => {
    // 14 players bought in a 15-player squad.
    // This is the 15th (final) slot.
    // Remaining empty slots after win = 15 - 15 = 0 slots!
    // Minimum reserve needed = 0!
    const squad14 = Array(14).fill({
      player_id: 'p-prev',
      player: dummyPlayer,
      bought_for: 20000000,
      timestamp: Date.now(),
    });

    const participant = createParticipant({
      purse_remaining: 25000000, // 2.5 Cr
      squad: squad14,
    });
    const state = createAuctionState({
      current_bid: 20000000, // 2 Cr
      current_bidder_id: 'user-2',
    });

    // Bid 50L -> target bid = 2.5 Cr. Leaves 0 purse, but 0 empty slots needed!
    const res = validateBid(participant, state, defaultSettings, 5000000, false);
    expect(res.valid).toBe(true);
    expect(res.expectedAmount).toBe(25000000);
  });

  it('7. Rejects bid when timer has already reached 0', () => {
    const participant = createParticipant();
    const state = createAuctionState({
      timer_ends_at: Date.now() - 500, // 500ms in the past
    });

    const res = validateBid(participant, state, defaultSettings, 2500000, false);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/time has expired/i);
  });

  it('8. Bid button status helper reflects proper reasons', () => {
    const participant = createParticipant({ id: 'user-1' });
    const state = createAuctionState({
      current_bid: 20000000,
      current_bidder_id: 'user-1',
    });

    const status = getBidButtonStatus(participant, state, defaultSettings, 2500000);
    expect(status.disabled).toBe(true);
    expect(status.reason).toMatch(/already the highest bidder/i);
  });
});

describe('Auction Start & Player Pool Validation (Single-Player & Multiplayer)', () => {
  function makeHost(hasFranchise = true): Participant {
    return {
      id: 'host-1',
      room_code: 'TEST01',
      display_name: 'Host Manager',
      is_host: true,
      is_connected: true,
      last_active: Date.now(),
      franchise: hasFranchise
        ? { id: 'csk', name: 'Chennai Super Kings', short_code: 'CSK', color: '#F9CD05' }
        : null,
      purse_remaining: 100_00_00_000,
      squad: [],
      has_withdrawn_current: false,
    };
  }

  function makeGuest(hasFranchise = true): Participant {
    return {
      id: 'guest-1',
      room_code: 'TEST01',
      display_name: 'Guest Manager',
      is_host: false,
      is_connected: true,
      last_active: Date.now(),
      franchise: hasFranchise
        ? { id: 'mi', name: 'Mumbai Indians', short_code: 'MI', color: '#004BA0' }
        : null,
      purse_remaining: 100_00_00_000,
      squad: [],
      has_withdrawn_current: false,
    };
  }

  const baseSettings: RoomSettings = {
    purse: 100_00_00_000,
    squad_size: 25,
    timer_seconds: 10,
    order_type: 'random',
    accelerated_round: true,
    selected_player_ids: Array.from({ length: 274 }, (_, i) => `p-${i + 1}`),
  };

  it('1. Rejects auction start when host has NOT chosen a franchise or team name', () => {
    const host = makeHost(false);
    const result = validateAuctionStart(host, [host], baseSettings, 274, 1);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Host must set a team name to start the auction.');
  });

  it('2. Single-player mode: Allows host to start auction alone when minParticipants is 1', () => {
    const host = makeHost(true);
    const result = validateAuctionStart(host, [host], baseSettings, 274, 1);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('3. Multiplayer mode: Rejects when only 1 participant chose franchise/team name and minParticipants is 2', () => {
    const host = makeHost(true);
    const result = validateAuctionStart(host, [host], baseSettings, 274, 2);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('At least 2 participants must set a team name to start the auction.');
  });

  it('4. Multiplayer mode: Passes when 2 participants have chosen franchises', () => {
    const host = makeHost(true);
    const guest = makeGuest(true);
    const result = validateAuctionStart(host, [host, guest], baseSettings, 274, 2);
    expect(result.valid).toBe(true);
  });

  it('5. Pool validation: Passes with 274 selected players when squad size is 25 (requires 25)', () => {
    const host = makeHost(true);
    const result = validateAuctionStart(host, [host], baseSettings, 274, 1);
    expect(result.valid).toBe(true);
  });

  it('6. Pool validation: Rejects when pool has fewer players than required for squad size', () => {
    const host = makeHost(true);
    const insufficientSettings: RoomSettings = {
      ...baseSettings,
      squad_size: 25,
      selected_player_ids: Array.from({ length: 10 }, (_, i) => `p-${i + 1}`), // only 10 selected
    };
    const result = validateAuctionStart(host, [host], insufficientSettings, 274, 1);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Pool requires at least 25 players (10 selected).');
  });

  it('7. Pool validation: Handles zero minimum pool configuration correctly (274 selected passes)', () => {
    const host = makeHost(true);
    const zeroPoolSettings: RoomSettings = {
      ...baseSettings,
      squad_size: 0, // 1 team of 0 = 0 players min required
    };
    const result = validateAuctionStart(host, [host], zeroPoolSettings, 274, 1);
    expect(result.valid).toBe(true);
  });

  it('8. Centralized setting: Resolves configurable participant minimum from environment', () => {
    const min = getMinAuctionParticipants();
    expect(typeof min).toBe('number');
    expect(min).toBeGreaterThanOrEqual(1);
  });
});

describe('Custom Team Name Validation & Short Code Derivation', () => {
  it('1. Allows valid team names within 2-30 chars', () => {
    const res1 = validateTeamName('Bengaluru Blasters');
    expect(res1.valid).toBe(true);
    expect(res1.reason).toBeUndefined();

    const res2 = validateTeamName("King's XI - Rockers & Rollers.");
    expect(res2.valid).toBe(true);
  });

  it('2. Rejects empty, whitespace-only, or too short team names', () => {
    expect(validateTeamName('').valid).toBe(false);
    expect(validateTeamName('   ').valid).toBe(false);
    expect(validateTeamName('A').valid).toBe(false);
  });

  it('3. Rejects team names longer than 30 characters', () => {
    const longName = 'This Team Name Is Way Too Long And Exceeds Thirty Characters';
    const res = validateTeamName(longName);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('cannot exceed 30 characters');
  });

  it('4. Rejects invalid characters and injection attempts', () => {
    expect(validateTeamName('<script>alert(1)</script>').valid).toBe(false);
    expect(validateTeamName('Team #1 @ Mumbai').valid).toBe(false);
    expect(validateTeamName('Team $Money$').valid).toBe(false);
  });

  it('5. Enforces case-insensitive uniqueness in the room', () => {
    const existing = ['Chennai Dynamos', 'Kolkata Knights'];
    const dupResult = validateTeamName('chennai dynamos', existing);
    expect(dupResult.valid).toBe(false);
    expect(dupResult.reason).toContain('already taken');

    // Participant editing their own name should not trigger duplicate
    const selfEdit = validateTeamName('Chennai Dynamos', existing, 'Chennai Dynamos');
    expect(selfEdit.valid).toBe(true);
  });

  it('6. Derives clean 2 to 4 letter short codes', () => {
    expect(deriveTeamShortCode('Mumbai Mavericks')).toBe('MM');
    expect(deriveTeamShortCode('Royal Challengers Bengaluru')).toBe('RCB');
    expect(deriveTeamShortCode('Delhi Capitals Super Kings')).toBe('DCSK');
    expect(deriveTeamShortCode('Warriors')).toBe('WAR');
  });
});

