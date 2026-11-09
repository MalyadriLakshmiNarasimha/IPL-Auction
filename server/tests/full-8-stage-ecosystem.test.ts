import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { RoomManager } from '../room';
import {
  calculate5PillarSquadScore,
  calculateManagerScore,
  calculatePlayingXIScore,
  generateChampionshipAwards,
  generateSeasonRecap,
  computeParticipantMetrics,
} from '../../src/shared/scoring';
import { ALL_PLAYERS } from '../../src/shared/player-data';
import { Participant, PlayingXISubmission, Player } from '../../src/shared/types';
import { DEFAULT_ROOM_SETTINGS } from '../../src/shared/constants';

describe('Comprehensive 8-Stage IPL Auction & Team Management Ecosystem Verification', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let roomManager: RoomManager;
  let port: number;
  const roomCode = 'ECO8ST';

  beforeAll(async () => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });
    roomManager = new RoomManager(io);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('Stage 1: Verified Player Spotlight, 2026 Statistics & Smart Purse Metrics', () => {
    // Verify marquee stars have authentic 2026 stats and SVG vector headshots
    const kohli = ALL_PLAYERS.find(p => p.name === 'Virat Kohli');
    const dhoni = ALL_PLAYERS.find(p => p.name.includes('Dhoni'));
    const bumrah = ALL_PLAYERS.find(p => p.name === 'Jasprit Bumrah');

    expect(kohli).toBeDefined();
    expect(kohli?.stats_2026?.season).toBe('2026');
    expect(kohli?.stats_2026?.player_points).toBeGreaterThan(800);
    expect(kohli?.image_url).toBeDefined();
    expect(kohli?.image_url.length).toBeGreaterThan(0);

    expect(dhoni).toBeDefined();
    expect(dhoni?.role.toLowerCase()).toContain('wicket');
    expect(dhoni?.stats_2026?.player_points).toBeGreaterThan(600);

    expect(bumrah).toBeDefined();
    expect(bumrah?.role.toUpperCase()).toContain('BOWL');
    expect(bumrah?.stats_2026?.wickets).toBeGreaterThan(15);

    // Smart purse & composition calculation
    const participant: Participant = {
      id: 'mgr-1',
      room_code: roomCode,
      display_name: 'CSK Boss',
      is_host: true,
      is_connected: true,
      last_active: Date.now(),
      franchise: { id: 'csk', name: 'Chennai Super Kings', short_code: 'CSK', color: '#F9CD05' },
      purse_remaining: 85_00_00_000,
      squad: [
        { player_id: kohli!.id, player: kohli!, purchase_price: 15_00_00_000, bought_for: 15_00_00_000, timestamp: Date.now() },
        { player_id: dhoni!.id, player: dhoni!, purchase_price: 10_00_00_000, bought_for: 10_00_00_000, timestamp: Date.now() },
      ],
      has_withdrawn_current: false,
    };

    const metrics = computeParticipantMetrics(participant, { ...DEFAULT_ROOM_SETTINGS, purse: 100_00_00_000, squad_size: 15 });
    expect(metrics.amount_spent).toBe(25_00_00_000);
    expect(metrics.avg_purchase_price).toBe(12_50_00_000);
    expect(metrics.spent_by_role.BAT).toBe(15_00_00_000);
    expect(metrics.spent_by_role.WK).toBe(10_00_00_000);
    expect(metrics.role_counts.BAT).toBe(1);
    expect(metrics.role_counts.WK).toBe(1);
  });

  it('Stage 2: Automatic Unsold Pool Maintenance & Re-Entry Configuration', () => {
    const room = roomManager.createRoom(roomCode, 'Ecosystem Test Room', 'mgr-1', 'Host Manager');
    const p1 = ALL_PLAYERS[0];
    const p2 = ALL_PLAYERS[1];
    const p3 = ALL_PLAYERS[2];

    room.unsold_pool.push(p1, p2, p3);
    expect(room.unsold_pool.length).toBe(3);

    // Admin selects p1 and p2 for re-entry into accelerated round 2
    const configured = roomManager.configureUnsoldPool(roomCode, 'mgr-1', [p1.id, p2.id], 'base_price');
    expect(configured).toBe(true);
    expect(room.pool.length).toBe(2);
    expect(room.unsold_pool.length).toBe(1);
    expect(room.auction_state.round_number).toBe(2);
    expect(room.stage).toBe('unsold_auction');
  });

  it('Stage 3: Player-for-Player Trading Window with Double Opt-In & Atomic Execution', () => {
    const room = roomManager.getRoom(roomCode)!;

    const pA = ALL_PLAYERS.find(p => p.name === 'Virat Kohli')!;
    const pB = ALL_PLAYERS.find(p => p.name === 'Jasprit Bumrah')!;

    const teamA: Participant = {
      id: 'mgr-A',
      room_code: roomCode,
      display_name: 'RCB Manager',
      is_host: true,
      is_connected: true,
      last_active: Date.now(),
      franchise: { id: 'rcb', name: 'Royal Challengers Bengaluru', short_code: 'RCB', color: '#EC1C24' },
      purse_remaining: 50_00_00_000,
      squad: [{ player_id: pA.id, player: pA, purchase_price: 15_00_00_000, bought_for: 15_00_00_000, timestamp: Date.now() }],
      has_withdrawn_current: false,
    };

    const teamB: Participant = {
      id: 'mgr-B',
      room_code: roomCode,
      display_name: 'MI Manager',
      is_host: false,
      is_connected: true,
      last_active: Date.now(),
      franchise: { id: 'mi', name: 'Mumbai Indians', short_code: 'MI', color: '#004BA0' },
      purse_remaining: 50_00_00_000,
      squad: [{ player_id: pB.id, player: pB, purchase_price: 14_00_00_000, bought_for: 14_00_00_000, timestamp: Date.now() }],
      has_withdrawn_current: false,
    };

    room.participants.set('mgr-A', teamA);
    room.participants.set('mgr-B', teamB);
    room.stage = 'trading_window';

    // Step 1: Team A proposes 1-for-1 trade: offer Kohli for Bumrah
    const propResult = roomManager.proposeTrade(roomCode, 'mgr-A', 'mgr-B', pA.id, pB.id);
    expect(propResult.success).toBe(true);
    expect(propResult.offer).toBeDefined();

    const tradeId = propResult.offer!.id;

    // Step 2: Team B accepts the trade
    const respondResult = roomManager.respondTrade(roomCode, 'mgr-B', tradeId, 'accept');
    expect(respondResult.success).toBe(true);

    // Verify atomic ownership swap
    expect(teamA.squad[0].player_id).toBe(pB.id);
    expect(teamB.squad[0].player_id).toBe(pA.id);

    // Verify trade recorded in permanent room trade history
    expect(room.completed_trades.length).toBe(1);
    expect(room.completed_trades[0].team_a_short).toBe('RCB');
    expect(room.completed_trades[0].team_b_short).toBe('MI');
  });

  it('Stage 4: Post-Auction Deterministic 5-Pillar Squad Evaluation', () => {
    const squadPlayers = ALL_PLAYERS.slice(0, 15).map((p, idx) => ({
      player_id: p.id,
      player: p,
      purchase_price: 5_00_00_000 + idx * 10_00_000,
      bought_for: 5_00_00_000 + idx * 10_00_000,
      timestamp: Date.now(),
    }));

    const participant: Participant = {
      id: 'mgr-A',
      room_code: roomCode,
      display_name: 'Evaluated Manager',
      is_host: true,
      is_connected: true,
      last_active: Date.now(),
      franchise: { id: 'kkr', name: 'Kolkata Knight Riders', short_code: 'KKR', color: '#3A225D' },
      purse_remaining: 10_00_00_000,
      squad: squadPlayers,
      has_withdrawn_current: false,
    };

    const breakdown = calculate5PillarSquadScore(participant, { purse: 100_00_00_000, squad_size: 15 } as any);

    expect(breakdown.scoring_version).toBe('2026.1-5pillar');
    expect(breakdown.total_score).toBeGreaterThan(0);
    expect(breakdown.total_score).toBeLessThanOrEqual(100);
    expect(breakdown.individual_performance_score).toBeLessThanOrEqual(40);
    expect(breakdown.batting_strength_score).toBeLessThanOrEqual(20);
    expect(breakdown.bowling_strength_score).toBeLessThanOrEqual(20);
    expect(breakdown.allrounder_strength_score).toBeLessThanOrEqual(10);
    expect(breakdown.squad_balance_score).toBeLessThanOrEqual(10);
    expect(breakdown.strengths.length).toBeGreaterThan(0);
  });

  it('Stage 5: Independent Manager Strategy Leaderboard & Bargain Surplus Engine', () => {
    const marqueePlayer = ALL_PLAYERS.find(p => p.name === 'Virat Kohli')!;
    const squad = [
      { player_id: marqueePlayer.id, player: marqueePlayer, purchase_price: 3_00_00_000, bought_for: 3_00_00_000, timestamp: Date.now() },
      ...ALL_PLAYERS.slice(1, 12).map((p) => ({
        player_id: p.id,
        player: p,
        purchase_price: 1_20_00_000,
        bought_for: 1_20_00_000,
        timestamp: Date.now(),
      })),
    ];

    const totalSpent = squad.reduce((sum, item) => sum + item.bought_for, 0); // 3 Cr + 13.2 Cr = 16.2 Cr
    const purse = 18_00_00_000;
    const purseRemaining = purse - totalSpent; // 1.8 Cr (90% spent)

    const participant: Participant = {
      id: 'mgr-A',
      room_code: roomCode,
      display_name: 'Savvy Buyer',
      is_host: true,
      is_connected: true,
      last_active: Date.now(),
      franchise: { id: 'rr', name: 'Rajasthan Royals', short_code: 'RR', color: '#EA1A85' },
      purse_remaining: purseRemaining,
      squad,
      has_withdrawn_current: false,
    };

    const squadScore = calculate5PillarSquadScore(participant, { purse, squad_size: 12 } as any);
    const managerScore = calculateManagerScore(participant, { purse, squad_size: 12 }, squadScore.total_score, []);

    expect(managerScore.total_manager_score).toBeGreaterThan(0);
    expect(managerScore.value_for_money_score).toBeGreaterThan(15);
    expect(managerScore.purse_efficiency_score).toBeGreaterThan(10);
    expect(managerScore.bargain_picks.length).toBeGreaterThan(0);
  });

  it('Stage 6 & 7: Playing XI Lineup Selection, IPL Rules Validation & Statistical Ratings', () => {
    // Gather distinct players matching the required balance
    const batters = ALL_PLAYERS.filter(p => p.role.includes('Bat') || p.role === 'BAT');
    const keepers = ALL_PLAYERS.filter(p => p.role.includes('Wicket') || p.role.includes('WK'));
    const allrounders = ALL_PLAYERS.filter(p => p.role.includes('All') || p.role === 'AR');
    const bowlers = ALL_PLAYERS.filter(p => p.role.includes('Bowl') || p.role === 'BOWL');

    const xiPlayers: Player[] = [
      batters[0],
      batters[1],
      batters[2],
      keepers[0],
      allrounders[0],
      allrounders[1],
      allrounders[2],
      bowlers[0],
      bowlers[1],
      bowlers[2],
      bowlers[3],
    ];

    expect(xiPlayers.length).toBe(11);

    const submission: PlayingXISubmission = {
      participant_id: 'mgr-A',
      display_name: 'Tactician',
      franchise: { id: 'gt', name: 'Gujarat Titans', short_code: 'GT', color: '#1B2133' },
      players: xiPlayers,
      batting_order: xiPlayers.map(p => p.id),
      wicketkeeper_id: keepers[0].id,
      captain_id: batters[0].id,
      substitutes: [],
      is_submitted: true,
    };

    const lineupScore = calculatePlayingXIScore(submission);
    expect(lineupScore.total_score).toBeGreaterThan(0);
    expect(lineupScore.batting_score).toBeLessThanOrEqual(30);
    expect(lineupScore.bowling_score).toBeLessThanOrEqual(30);
    expect(lineupScore.allrounder_score).toBeLessThanOrEqual(20);
    expect(lineupScore.balance_score).toBeLessThanOrEqual(20);
    expect(lineupScore.openers_rating).toBeGreaterThan(0);
  });

  it('Stage 8: Final Season Recap & 7 Certified Championship Honors', () => {
    const franchiseA = { id: 'csk', name: 'Chennai Super Kings', short_code: 'CSK', color: '#F9CD05' };
    const franchiseB = { id: 'mi', name: 'Mumbai Indians', short_code: 'MI', color: '#004BA0' };

    const mockSquadScores = [
      {
        participant_id: 'p1',
        display_name: 'Manager A',
        franchise: franchiseA,
        total_score: 88,
        role_balance_score: 35,
        completeness_score: 28,
        value_score: 25,
        players_count: 15,
        total_spent: 95_00_00_000,
        purse_remaining: 5_00_00_000,
        squad: [],
        rank: 1,
        batting_strength_score: 18,
        bowling_strength_score: 17,
        allrounder_strength_score: 9,
        squad_balance_score: 9,
      },
      {
        participant_id: 'p2',
        display_name: 'Manager B',
        franchise: franchiseB,
        total_score: 82,
        role_balance_score: 30,
        completeness_score: 26,
        value_score: 26,
        players_count: 15,
        total_spent: 98_00_00_000,
        purse_remaining: 2_00_00_000,
        squad: [],
        rank: 2,
        batting_strength_score: 16,
        bowling_strength_score: 19,
        allrounder_strength_score: 8,
        squad_balance_score: 8,
      },
    ];

    const mockManagerScores = [
      {
        participant_id: 'p1',
        display_name: 'Manager A',
        franchise: franchiseA,
        total_manager_score: 85,
        purse_efficiency_score: 22,
        value_for_money_score: 26,
        trade_quality_score: 15,
        squad_strength_score: 22,
        rank: 1,
        efficiency_details: { purse_spent: 95_00_00_000, purse_remaining: 5_00_00_000, savings_ratio: 0.05, reserve_maintained: true },
        bargain_picks: [],
        trade_impact: { trades_count: 1, net_points_diff: 50 },
      },
    ];

    const mockLineupScores = [
      {
        participant_id: 'p1',
        display_name: 'Manager A',
        franchise: franchiseA,
        total_score: 89,
        batting_score: 27,
        bowling_score: 26,
        allrounder_score: 18,
        balance_score: 18,
        rank: 1,
        strengths: ['Elite Top-Order Firepower'],
        weaknesses: [],
        openers_rating: 1750,
        middle_order_rating: 2400,
        finishers_rating: 1600,
        pace_spin_ratio: '3:2',
        overseas_count: 4,
      },
    ];

    // Verify 7 official awards generated
    const awards = generateChampionshipAwards(mockSquadScores, mockManagerScores, mockLineupScores, []);
    expect(awards.length).toBe(7);

    const awardIds = awards.map(a => a.id);
    expect(awardIds).toContain('overall_champion');
    expect(awardIds).toContain('best_batting');
    expect(awardIds).toContain('best_bowling');
    expect(awardIds).toContain('best_balanced');
    expect(awardIds).toContain('best_auction_strategy');
    expect(awardIds).toContain('best_trading_strategy');
    expect(awardIds).toContain('strongest_playing_xi');

    // Verify season recap
    const recap = generateSeasonRecap(
      [
        {
          id: 'p1',
          room_code: roomCode,
          display_name: 'Manager A',
          is_host: true,
          is_connected: true,
          last_active: Date.now(),
          franchise: franchiseA,
          purse_remaining: 5_00_00_000,
          squad: [{ player_id: ALL_PLAYERS[0].id, player: ALL_PLAYERS[0], purchase_price: 15_00_00_000, bought_for: 15_00_00_000, timestamp: Date.now() }],
          has_withdrawn_current: false,
        },
      ],
      [],
      [],
      awards
    );

    expect(recap.players_sold).toBe(1);
    expect(recap.total_spent).toBe(15_00_00_000);
    expect(recap.champion_team?.short_code).toBe('CSK');
  });
});
