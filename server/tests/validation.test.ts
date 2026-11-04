import { describe, it, expect } from 'vitest';
import { validateBid, getBidButtonStatus } from '../../src/shared/validation';
import { AuctionState, Participant, Player, RoomSettings } from '../../src/shared/types';
import { MIN_RESERVE_PER_SLOT } from '../../src/shared/constants';

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

