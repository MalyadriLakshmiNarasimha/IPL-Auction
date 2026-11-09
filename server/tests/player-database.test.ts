import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  ALL_PLAYERS,
  RAW_PLAYER_DATABASE,
  getPlayerById,
  getPlayersByTeam,
  getPlayersByRole,
  getPlayersByNationality,
  searchPlayers,
} from '../../src/shared/player-data';
import { RoomManager } from '../room';
import { calculateTeamScore } from '../../src/shared/scoring';
import { DEFAULT_ROOM_SETTINGS, FRANCHISE_PRESETS } from '../../src/shared/constants';
import { Participant, Player } from '../../src/shared/types';
import { Server as SocketIOServer } from 'socket.io';

describe('1. Centralized Player Database Schema & Integrity', () => {
  const jsonPath = path.resolve(process.cwd(), 'players-database.json');

  it('Verifies players-database.json exists and parses correctly', () => {
    expect(fs.existsSync(jsonPath)).toBe(true);
    const rawContent = fs.readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(rawContent);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(274);
  });

  it('Verifies all 274 player IDs are unique and match p-XXX format', () => {
    const ids = RAW_PLAYER_DATABASE.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(274);

    for (let i = 1; i <= 274; i++) {
      const expectedId = `p-${String(i).padStart(3, '0')}`;
      expect(uniqueIds.has(expectedId)).toBe(true);
    }
  });

  it('Verifies zero duplicate player names in the database', () => {
    const names = RAW_PLAYER_DATABASE.map(p => p.player_name.trim().toLowerCase());
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(274);
  });

  it('Verifies representation of all 10 IPL franchises with exact counts', () => {
    const teamCounts: Record<string, number> = {};
    for (const p of RAW_PLAYER_DATABASE) {
      teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
    }

    const expectedTeams: Record<string, number> = {
      'Chennai Super Kings': 30,
      'Kolkata Knight Riders': 29,
      'Mumbai Indians': 29,
      'Sunrisers Hyderabad': 29,
      'Gujarat Titans': 27,
      'Rajasthan Royals': 27,
      'Delhi Capitals': 26,
      'Lucknow Super Giants': 26,
      'Royal Challengers Bengaluru': 26,
      'Punjab Kings': 25,
    };

    expect(Object.keys(teamCounts).length).toBe(10);
    for (const [team, count] of Object.entries(expectedTeams)) {
      expect(teamCounts[team]).toBe(count);
    }
  });

  it('Verifies team codes match corresponding franchise names', () => {
    const codeMap: Record<string, string> = {
      'Chennai Super Kings': 'Chennai',
      'Delhi Capitals': 'Delhi',
      'Gujarat Titans': 'Gujarat',
      'Kolkata Knight Riders': 'Kolkata',
      'Lucknow Super Giants': 'Lucknow',
      'Mumbai Indians': 'Mumbai',
      'Punjab Kings': 'Punjab',
      'Rajasthan Royals': 'Rajasthan',
      'Royal Challengers Bengaluru': 'Bengaluru',
      'Sunrisers Hyderabad': 'Hyderabad',
    };

    for (const p of RAW_PLAYER_DATABASE) {
      expect(p['team code']).toBe(codeMap[p.team]);
    }
  });

  it('Verifies role normalization to canonical cricket roles', () => {
    const validRoles = new Set(['Batter', 'Bowler', 'All-Rounder', 'Wicketkeeper']);
    for (const p of RAW_PLAYER_DATABASE) {
      expect(validRoles.has(p.role)).toBe(true);
    }
  });

  it('Verifies missing field handling (null jersey numbers & null bowling styles)', () => {
    const missingJerseys = RAW_PLAYER_DATABASE.filter(p => p.jersey_number === null);
    const missingBowling = RAW_PLAYER_DATABASE.filter(p => p.bowling_style === null);

    expect(missingJerseys.length).toBe(23);
    expect(missingBowling.length).toBe(13);

    // Ensure all numeric jersey numbers are valid positive integers
    for (const p of RAW_PLAYER_DATABASE) {
      if (p.jersey_number !== null) {
        expect(typeof p.jersey_number).toBe('number');
        expect(p.jersey_number).toBeGreaterThan(0);
      }
    }
  });
});

describe('2. TypeScript Data Adapter & Player Query Helpers', () => {
  it('Verifies ALL_PLAYERS contains 274 fully hydrated player instances', () => {
    expect(ALL_PLAYERS.length).toBe(274);

    for (const p of ALL_PLAYERS) {
      expect(p.id).toMatch(/^p-\d{3}$/);
      expect(p.name).toBeTruthy();
      expect(p.role).toBeTruthy();
      expect(p.country).toBeTruthy();
      expect(p.base_price).toBeGreaterThanOrEqual(2000000); // Min ₹20 Lakhs
      expect(typeof p.capped).toBe('boolean');
      expect(['A', 'B', 'C']).toContain(p.tier);
      expect(p.initials).toMatch(/^[A-Z]{2,3}$/);
    }
  });

  it('Verifies getPlayerById returns correct records across the full spectrum', () => {
    const p1 = getPlayerById('p-001');
    expect(p1).toBeDefined();
    expect(p1?.name).toBe('Dewald Brevis');
    expect(p1?.country).toBe('South Africa');
    expect(p1?.team).toBe('Chennai Super Kings');

    const p274 = getPlayerById('p-274');
    expect(p274).toBeDefined();
    expect(p274?.name).toBe('Heinrich Klaasen');
    expect(p274?.country).toBe('South Africa');
    expect(p274?.team).toBe('Sunrisers Hyderabad');

    const nonExistent = getPlayerById('p-999');
    expect(nonExistent).toBeUndefined();
  });

  it('Verifies getPlayersByTeam filters correctly', () => {
    const cskPlayers = getPlayersByTeam('Chennai');
    expect(cskPlayers.length).toBe(30);

    const rcbPlayers = getPlayersByTeam('Royal Challengers Bengaluru');
    expect(rcbPlayers.length).toBe(26);
  });

  it('Verifies getPlayersByRole filters correctly', () => {
    const batters = getPlayersByRole('Batter');
    expect(batters.length).toBe(105);

    const bowlers = getPlayersByRole('Bowler');
    expect(bowlers.length).toBe(117);

    const allRounders = getPlayersByRole('All-Rounder');
    expect(allRounders.length).toBe(30);

    const wicketkeepers = getPlayersByRole('Wicketkeeper');
    expect(wicketkeepers.length).toBe(22);
  });

  it('Verifies getPlayersByNationality filters correctly', () => {
    const indians = getPlayersByNationality('India');
    expect(indians.length).toBe(184);

    const overseas = ALL_PLAYERS.filter(p => p.country !== 'India');
    expect(overseas.length).toBe(90);
  });

  it('Verifies multi-attribute search functionality', () => {
    // Search by name
    const byName = searchPlayers('Klaasen');
    expect(byName.some(p => p.name === 'Heinrich Klaasen')).toBe(true);

    // Search by team
    const byTeam = searchPlayers('Rajasthan Royals');
    expect(byTeam.length).toBe(27);

    // Search by nationality
    const byNat = searchPlayers('South Africa');
    expect(byNat.length).toBe(22);
  });
});

describe('3. Auction Engine & Room Manager Integration with 274 Players', () => {
  const mockIo = {
    to: () => ({ emit: () => {} }),
    emit: () => {},
  } as unknown as SocketIOServer;

  it('Initializes room with all 274 player IDs by default', () => {
    const rm = new RoomManager(mockIo);
    const room = rm.createRoom('TEST01', 'Test Room', 'host-1', 'Host User');

    expect(room.settings.selected_player_ids.length).toBe(274);
    expect(room.auction_state.total_pool_count).toBe(274);
    expect(room.auction_state.remaining_pool_count).toBe(274);
  });

  it('Allows auction pool selection of newly imported players', () => {
    const rm = new RoomManager(mockIo);
    const room = rm.createRoom('TEST02', 'Test Room 2', 'host-1', 'Host User');

    // Host selects a custom subset including previously unseeded players
    const selected = ['p-001', 'p-002', 'p-273', 'p-274'];
    room.settings.selected_player_ids = selected;

    // Join two participants with franchises
    const p1 = room.participants.get('host-1')!;
    p1.franchise = FRANCHISE_PRESETS[0];

    const p2: Participant = {
      id: 'user-2',
      room_code: 'TEST02',
      display_name: 'Player 2',
      is_host: false,
      is_connected: true,
      last_active: Date.now(),
      franchise: FRANCHISE_PRESETS[1],
      purse_remaining: 100_00_00_000,
      squad: [],
      has_withdrawn_current: false,
    };
    room.participants.set('user-2', p2);

    room.settings.squad_size = 2; // 2 teams of 2 = 4 players min pool
    const started = rm.startAuction('TEST02', 'host-1');
    expect(started).toBe(true);
    expect(room.pool.length).toBe(4);
    expect(room.pool.map(p => p.id)).toEqual(expect.arrayContaining(selected));
  });

  it('Allows host to start auction with single participant when MIN_AUCTION_PARTICIPANTS is 1', () => {
    const rm = new RoomManager(mockIo);
    const room = rm.createRoom('TEST-SOLO', 'Solo Test Room', 'host-solo', 'Solo Host');

    // Host selects franchise
    const host = room.participants.get('host-solo')!;
    host.franchise = FRANCHISE_PRESETS[0];

    // Room has default 274 players selected, squad size 15 (requires 15)
    expect(room.participants.size).toBe(1);
    expect(room.settings.selected_player_ids.length).toBe(274);

    const started = rm.startAuction('TEST-SOLO', 'host-solo');
    expect(started).toBe(true);
    expect(room.auction_state.phase).toBe('starting');
    expect(room.pool.length).toBe(274);
  });

  it('Executes bidding and sold cycle on newly imported player', () => {
    const rm = new RoomManager(mockIo);
    const room = rm.createRoom('TEST03', 'Test Room 3', 'host-1', 'Host User');

    const p1 = room.participants.get('host-1')!;
    p1.franchise = FRANCHISE_PRESETS[0];

    const p2: Participant = {
      id: 'user-2',
      room_code: 'TEST03',
      display_name: 'Player 2',
      is_host: false,
      is_connected: true,
      last_active: Date.now(),
      franchise: FRANCHISE_PRESETS[1],
      purse_remaining: 100_00_00_000,
      squad: [],
      has_withdrawn_current: false,
    };
    room.participants.set('user-2', p2);

    // Use newly imported player Dewald Brevis
    const player = getPlayerById('p-001')!;
    expect(player).toBeDefined();

    room.pool = [player];
    room.auction_state.phase = 'bidding';
    room.auction_state.current_player = player;
    room.auction_state.current_bid = 0;
    room.auction_state.current_bidder_id = null;
    room.auction_state.timer_ends_at = Date.now() + 15000;

    // Place bid
    const bidSuccess = rm.placeBid('TEST03', 'user-2', 25_00_000);
    expect(bidSuccess).toBe(true);
    expect(room.auction_state.current_bidder_id).toBe('user-2');
    expect(room.auction_state.current_bid).toBe(player.base_price);

    // Finalize sold via authoritative timer expiration
    (rm as any).handleTimerExpired(room);
    expect(room.auction_state.sold_count).toBe(1);
    expect(p2.squad.length).toBe(1);
    expect(p2.squad[0].player_id).toBe('p-001');
    expect(p2.squad[0].player.name).toBe('Dewald Brevis');
  });

  it('Unsold player goes to unsold pool and enters accelerated round', () => {
    const rm = new RoomManager(mockIo);
    const room = rm.createRoom('TEST04', 'Test Room 4', 'host-1', 'Host User');

    const p1 = room.participants.get('host-1')!;
    p1.franchise = FRANCHISE_PRESETS[0];

    const p2: Participant = {
      id: 'user-2',
      room_code: 'TEST04',
      display_name: 'Player 2',
      is_host: false,
      is_connected: true,
      last_active: Date.now(),
      franchise: FRANCHISE_PRESETS[1],
      purse_remaining: 100_00_00_000,
      squad: [],
      has_withdrawn_current: false,
    };
    room.participants.set('user-2', p2);

    const player = getPlayerById('p-003')!; // Ramakrishna Ghosh
    room.pool = [player];
    room.auction_state.phase = 'bidding';
    room.auction_state.current_player = player;
    room.auction_state.current_bid = 0;
    room.auction_state.current_bidder_id = null; // No bids placed!

    (rm as any).handleTimerExpired(room);
    expect(room.auction_state.unsold_count).toBe(1);
    expect(room.unsold_pool.length).toBe(1);
    expect(room.unsold_pool[0].id).toBe('p-003');
  });

  it('Scores squad balance correctly with normalized role names', () => {
    const dummyParticipant: Participant = {
      id: 'user-score',
      room_code: 'SCORE',
      display_name: 'Score Tester',
      is_host: false,
      is_connected: true,
      last_active: Date.now(),
      franchise: FRANCHISE_PRESETS[0],
      purse_remaining: 50_00_00_000,
      squad: [
        { player_id: 'p-001', player: getPlayerById('p-001')!, bought_for: 2000000, timestamp: Date.now() },
        { player_id: 'p-002', player: getPlayerById('p-002')!, bought_for: 20000000, timestamp: Date.now() },
        { player_id: 'p-274', player: getPlayerById('p-274')!, bought_for: 20000000, timestamp: Date.now() },
      ],
      has_withdrawn_current: false,
    };

    const score = calculateTeamScore(dummyParticipant, {
      ...DEFAULT_ROOM_SETTINGS,
      squad_size: 15,
    });

    expect(score.total_score).toBeGreaterThan(0);
    expect(score.role_balance_score).toBeGreaterThanOrEqual(0);
    expect(score.completeness_score).toBeGreaterThan(0);
  });

  it('Verifies all 274 players have verified 2026 IPL statistics, image_url, category, and points', () => {
    expect(ALL_PLAYERS.length).toBe(274);

    for (const player of ALL_PLAYERS) {
      expect(player.stats_2026).toBeDefined();
      expect(player.stats_2026.season).toBe('2026');
      expect(player.stats_2026.source).toBe('Official IPL Match Center & Historical Registry');
      expect(player.stats_2026.matches).toBeGreaterThanOrEqual(4);
      expect(player.player_points).toBeGreaterThanOrEqual(140);
      expect(player.player_points).toBeLessThanOrEqual(1000);
      expect(player.image_url).toBeDefined();
      expect(player.image_url.length).toBeGreaterThan(20);
      expect(['Marquee', 'International Star', 'Domestic Proven', 'Emerging Talent']).toContain(player.category);
    }

    // Verify marquee stars verified data
    const virat = ALL_PLAYERS.find(p => p.name === 'Virat Kohli')!;
    expect(virat.stats_2026.runs).toBe(741);
    expect(virat.stats_2026.highest_score).toBe(113);
    expect(virat.category).toBe('Marquee');

    const bumrah = ALL_PLAYERS.find(p => p.name === 'Jasprit Bumrah')!;
    expect(bumrah.stats_2026.wickets).toBe(20);
    expect(bumrah.stats_2026.economy_rate).toBe(6.48);
    expect(bumrah.category).toBe('Marquee');
  });
});
