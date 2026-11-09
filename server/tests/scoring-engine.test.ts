import { describe, it, expect } from 'vitest';
import {
  calculate5PillarSquadScore,
  calculateManagerScore,
  calculatePlayingXIScore,
  computeParticipantMetrics,
  generateChampionshipAwards,
  SCORING_ENGINE_VERSION,
} from '../../src/shared/scoring';
import { ALL_PLAYERS, getPlayerById } from '../../src/shared/player-data';
import { DEFAULT_ROOM_SETTINGS, FRANCHISE_PRESETS } from '../../src/shared/constants';
import { Participant, PlayingXISubmission, TradeTransaction } from '../../src/shared/types';

describe('Comprehensive Cricket Analytics & Scoring Engine Verification', () => {
  const p1Franchise = FRANCHISE_PRESETS[0]; // CSK
  const p2Franchise = FRANCHISE_PRESETS[1]; // MI

  it('Verifies scoring engine version tag is active and standardized', () => {
    expect(SCORING_ENGINE_VERSION).toBe('2026.1-5pillar');
  });

  it('Calculates smart purse metrics and squad composition accurately', () => {
    const dummyParticipant: Participant = {
      id: 'usr-csk',
      room_code: 'TEST01',
      display_name: 'CSK Manager',
      is_host: true,
      is_connected: true,
      last_active: Date.now(),
      franchise: p1Franchise,
      purse_remaining: 65_00_00_000,
      squad: [
        { player_id: 'p-001', player: getPlayerById('p-001')!, bought_for: 5_00_00_000, timestamp: Date.now() }, // Batter
        { player_id: 'p-002', player: getPlayerById('p-002')!, bought_for: 18_00_00_000, timestamp: Date.now() }, // Ruturaj (BAT)
        { player_id: 'p-028', player: getPlayerById('p-028')!, bought_for: 12_00_00_000, timestamp: Date.now() }, // Dhoni (WK)
      ],
      has_withdrawn_current: false,
    };

    const metrics = computeParticipantMetrics(dummyParticipant, DEFAULT_ROOM_SETTINGS);
    expect(metrics.amount_spent).toBe(35_00_00_000);
    expect(metrics.avg_purchase_price).toBe(Math.round(35_00_00_000 / 3));
    expect(metrics.spent_by_role.BAT).toBe(23_00_00_000);
    expect(metrics.spent_by_role.WK).toBe(12_00_00_000);
    expect(metrics.role_counts.WK).toBe(1);
    expect(metrics.role_counts.BAT).toBe(2);
  });

  it('Evaluates complete squad using the 5-pillar scoring model (40/20/20/10/10)', () => {
    const sampleSquad = ALL_PLAYERS.slice(0, 15).map((p, idx) => ({
      player_id: p.id,
      player: p,
      bought_for: p.base_price,
      timestamp: Date.now() + idx,
    }));

    const dummyParticipant: Participant = {
      id: 'usr-squad',
      room_code: 'TEST02',
      display_name: 'Squad Champion',
      is_host: false,
      is_connected: true,
      last_active: Date.now(),
      franchise: p1Franchise,
      purse_remaining: 15_00_00_000,
      squad: sampleSquad,
      has_withdrawn_current: false,
    };

    const evaluation = calculate5PillarSquadScore(dummyParticipant, DEFAULT_ROOM_SETTINGS);

    expect(evaluation.total_score).toBeGreaterThan(0);
    expect(evaluation.total_score).toBeLessThanOrEqual(100);
    expect(evaluation.individual_performance_score).toBeGreaterThanOrEqual(0);
    expect(evaluation.individual_performance_score).toBeLessThanOrEqual(40);
    expect(evaluation.batting_strength_score).toBeGreaterThanOrEqual(0);
    expect(evaluation.batting_strength_score).toBeLessThanOrEqual(20);
    expect(evaluation.bowling_strength_score).toBeGreaterThanOrEqual(0);
    expect(evaluation.bowling_strength_score).toBeLessThanOrEqual(20);
    expect(evaluation.allrounder_strength_score).toBeGreaterThanOrEqual(0);
    expect(evaluation.allrounder_strength_score).toBeLessThanOrEqual(10);
    expect(evaluation.squad_balance_score).toBeGreaterThanOrEqual(0);
    expect(evaluation.squad_balance_score).toBeLessThanOrEqual(10);
    expect(Array.isArray(evaluation.strengths)).toBe(true);
    expect(Array.isArray(evaluation.weaknesses)).toBe(true);
  });

  it('Calculates independent manager performance rating on all four criteria', () => {
    const dummyParticipant: Participant = {
      id: 'usr-mgr',
      room_code: 'TEST03',
      display_name: 'Master Tactician',
      is_host: false,
      is_connected: true,
      last_active: Date.now(),
      franchise: p1Franchise,
      purse_remaining: 8_00_00_000,
      squad: ALL_PLAYERS.slice(0, 15).map(p => ({
        player_id: p.id,
        player: p,
        bought_for: p.base_price,
        timestamp: Date.now(),
      })),
      has_withdrawn_current: false,
    };

    const trades: TradeTransaction[] = [
      {
        id: 'tr-01',
        room_code: 'TEST03',
        team_a_name: 'Master Tactician',
        team_a_short: 'CSK',
        player_a: getPlayerById('p-010')!,
        team_b_name: 'MI Manager',
        team_b_short: 'MI',
        player_b: getPlayerById('p-020')!,
        timestamp: Date.now(),
      },
    ];

    const managerScore = calculateManagerScore(dummyParticipant, DEFAULT_ROOM_SETTINGS, 88, trades);

    expect(managerScore.total_manager_score).toBeGreaterThan(0);
    expect(managerScore.total_manager_score).toBeLessThanOrEqual(100);
    expect(managerScore.purse_efficiency_score).toBeGreaterThan(0);
    expect(managerScore.purse_efficiency_score).toBeLessThanOrEqual(25);
    expect(managerScore.value_for_money_score).toBeGreaterThan(0);
    expect(managerScore.value_for_money_score).toBeLessThanOrEqual(30);
    expect(managerScore.trade_quality_score).toBeGreaterThan(0);
    expect(managerScore.trade_quality_score).toBeLessThanOrEqual(20);
    expect(managerScore.squad_strength_score).toBeGreaterThan(0);
    expect(managerScore.squad_strength_score).toBeLessThanOrEqual(25);
    expect(managerScore.efficiency_details.reserve_maintained).toBe(true);
  });

  it('Enforces strict IPL rules and scores Playing XI lineups', () => {
    const elevenPlayers = ALL_PLAYERS.slice(0, 11);
    const submission: PlayingXISubmission = {
      participant_id: 'usr-xi',
      display_name: 'CSK Manager',
      franchise: p1Franchise,
      players: elevenPlayers,
      batting_order: elevenPlayers.map(p => p.id),
      wicketkeeper_id: elevenPlayers[0].id,
      substitutes: ALL_PLAYERS.slice(11, 15),
      is_submitted: true,
    };

    const xiScore = calculatePlayingXIScore(submission);
    expect(xiScore.total_score).toBeGreaterThan(0);
    expect(xiScore.total_score).toBeLessThanOrEqual(100);
    expect(xiScore.batting_score).toBeGreaterThan(0);
    expect(xiScore.batting_score).toBeLessThanOrEqual(30);
    expect(xiScore.bowling_score).toBeGreaterThan(0);
    expect(xiScore.bowling_score).toBeLessThanOrEqual(30);
    expect(xiScore.allrounder_score).toBeGreaterThanOrEqual(0);
    expect(xiScore.balance_score).toBeGreaterThan(0);
    expect(Array.isArray(xiScore.strengths)).toBe(true);
  });

  it('Rejects invalid Playing XI submissions with fewer than 11 players', () => {
    const invalidSubmission: PlayingXISubmission = {
      participant_id: 'usr-invalid',
      display_name: 'Short Roster',
      franchise: p2Franchise,
      players: ALL_PLAYERS.slice(0, 8), // Only 8 players
      batting_order: ALL_PLAYERS.slice(0, 8).map(p => p.id),
      wicketkeeper_id: ALL_PLAYERS[0].id,
      substitutes: [],
      is_submitted: false,
    };

    const xiScore = calculatePlayingXIScore(invalidSubmission);
    expect(xiScore.total_score).toBe(0);
    expect(xiScore.weaknesses[0]).toContain('Incomplete Playing XI');
  });

  it('Generates all 7 requested Championship Achievement Awards', () => {
    const squadLeaderboard = [
      {
        participant_id: 'u1',
        display_name: 'Manager One',
        franchise: p1Franchise,
        total_score: 92,
        role_balance_score: 38,
        completeness_score: 30,
        value_score: 28,
        individual_performance_score: 38,
        batting_strength_score: 19,
        bowling_strength_score: 18,
        allrounder_strength_score: 9,
        squad_balance_score: 9.5,
        players_count: 15,
        total_spent: 95_00_00_000,
        purse_remaining: 5_00_00_000,
        squad: [],
        rank: 1,
      },
    ];

    const managerLeaderboard = [
      {
        participant_id: 'u1',
        display_name: 'Manager One',
        franchise: p1Franchise,
        total_manager_score: 89,
        purse_efficiency_score: 24,
        value_for_money_score: 28,
        trade_quality_score: 18,
        squad_strength_score: 23,
        rank: 1,
        efficiency_details: { purse_spent: 950000000, purse_remaining: 50000000, savings_ratio: 0.05, reserve_maintained: true },
        bargain_picks: [],
        trade_impact: { trades_count: 2, net_points_diff: 85 },
      },
    ];

    const playingXILeaderboard = [
      {
        participant_id: 'u1',
        display_name: 'Manager One',
        franchise: p1Franchise,
        total_score: 94,
        batting_score: 28,
        bowling_score: 29,
        allrounder_score: 19,
        balance_score: 18,
        rank: 1,
        strengths: ['Dominant'],
        weaknesses: [],
        openers_rating: 9.5,
        middle_order_rating: 9.0,
        finishers_rating: 9.5,
        pace_spin_ratio: '3P : 2S',
        overseas_count: 4,
      },
    ];

    const awards = generateChampionshipAwards(squadLeaderboard, managerLeaderboard, playingXILeaderboard);

    expect(awards.length).toBeGreaterThanOrEqual(6);
    const awardTitles = awards.map(a => a.title);
    expect(awardTitles.some(t => t.includes('Champion'))).toBe(true);
    expect(awardTitles.some(t => t.includes('Batting'))).toBe(true);
    expect(awardTitles.some(t => t.includes('Bowling'))).toBe(true);
    expect(awardTitles.some(t => t.includes('Balanced'))).toBe(true);
    expect(awardTitles.some(t => t.includes('Auction Strategy'))).toBe(true);
    expect(awardTitles.some(t => t.includes('Strongest Playing XI'))).toBe(true);
  });
});
