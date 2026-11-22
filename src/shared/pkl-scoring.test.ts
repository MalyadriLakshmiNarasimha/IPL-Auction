import { describe, it, expect } from 'vitest';
import { calculatePklPlayerPoints, calculateStarting7Score, PKL_SCORING_CONFIG } from './pkl-scoring';
import { Player } from './types';

describe('PKL Scoring Engine Unit Tests', () => {
  it('assigns documented baseline points to players with zero data', () => {
    const raiderA = calculatePklPlayerPoints('Raider', 'A', null, null);
    const raiderB = calculatePklPlayerPoints('Raider', 'B', null, null);
    const raiderC = calculatePklPlayerPoints('Raider', 'C', null, null);
    const raiderD = calculatePklPlayerPoints('Raider', 'D', null, null);

    expect(raiderA.total_points).toBe(PKL_SCORING_CONFIG.TIER_BASELINES.A);
    expect(raiderB.total_points).toBe(PKL_SCORING_CONFIG.TIER_BASELINES.B);
    expect(raiderC.total_points).toBe(PKL_SCORING_CONFIG.TIER_BASELINES.C);
    expect(raiderD.total_points).toBe(PKL_SCORING_CONFIG.TIER_BASELINES.D);
  });

  it('guarantees a low-match player NEVER scores below a comparable player with zero data', () => {
    // Player 1: Zero matches, Tier B
    const zeroMatchPlayer = calculatePklPlayerPoints('Raider', 'B', null, null);

    // Player 2: Low matches (e.g. 1 match, 0 points), Tier B
    const lowMatchPoorPerform = calculatePklPlayerPoints(
      'Raider',
      'B',
      { matches: 1, raid_points: 0, total_points: 0 },
      { matches: 1, raid_points: 0, total_points: 0 }
    );

    // Player 3: Low matches (e.g. 2 matches, low raid points), Tier B
    const lowMatchDecent = calculatePklPlayerPoints(
      'Raider',
      'B',
      { matches: 2, raid_points: 4, total_points: 4 },
      { matches: 2, raid_points: 4, total_points: 4 }
    );

    expect(lowMatchPoorPerform.total_points).toBeGreaterThanOrEqual(zeroMatchPlayer.total_points);
    expect(lowMatchDecent.total_points).toBeGreaterThanOrEqual(zeroMatchPlayer.total_points);
  });

  it('correctly blends season stats with career stats when matches < 5', () => {
    const blended = calculatePklPlayerPoints(
      'Defender',
      'A',
      { matches: 2, tackle_points: 6 },
      { matches: 30, tackle_points: 90 }
    );

    expect(blended.breakdown.is_blended).toBe(true);
    expect(blended.breakdown.sample_size_matches).toBe(2);
    expect(blended.total_points).toBeGreaterThanOrEqual(PKL_SCORING_CONFIG.TIER_BASELINES.A);
  });

  it('evaluates a complete Starting 7 with proper regulation rules', () => {
    const mockStarting7: any[] = [
      { id: 'k-001', role: 'Defender', position_detail: 'Left Corner', player_points: 750, country: 'India' },
      { id: 'k-002', role: 'Defender', position_detail: 'Right Corner', player_points: 720, country: 'India' },
      { id: 'k-003', role: 'Defender', position_detail: 'Left Cover', player_points: 680, country: 'India' },
      { id: 'k-004', role: 'Defender', position_detail: 'Right Cover', player_points: 690, country: 'India' },
      { id: 'k-005', role: 'Raider', position_detail: 'Raider', player_points: 850, country: 'India' },
      { id: 'k-006', role: 'Raider', position_detail: 'Raider', player_points: 820, country: 'India' },
      { id: 'k-007', role: 'All-Rounder', position_detail: 'All-Rounder', player_points: 780, country: 'Iran' },
    ];

    const result = calculateStarting7Score('part-1', 'Manager Alpha', mockStarting7 as Player[]);
    expect(result.total_score).toBeGreaterThan(70);
    expect(result.overseas_count).toBe(1);
    expect(result.weaknesses.length).toBe(0);
  });

  it('penalizes Starting 7 lineups with more than 2 overseas players', () => {
    const mockIllegalOverseas: any[] = [
      { id: 'k-001', role: 'Defender', position_detail: 'Left Corner', player_points: 750, country: 'Iran' },
      { id: 'k-002', role: 'Defender', position_detail: 'Right Corner', player_points: 720, country: 'Iran' },
      { id: 'k-003', role: 'Defender', position_detail: 'Left Cover', player_points: 680, country: 'Korea' }, // 3rd overseas
      { id: 'k-004', role: 'Defender', position_detail: 'Right Cover', player_points: 690, country: 'India' },
      { id: 'k-005', role: 'Raider', position_detail: 'Raider', player_points: 850, country: 'India' },
      { id: 'k-006', role: 'Raider', position_detail: 'Raider', player_points: 820, country: 'India' },
      { id: 'k-007', role: 'All-Rounder', position_detail: 'All-Rounder', player_points: 780, country: 'India' },
    ];

    const result = calculateStarting7Score('part-1', 'Manager Beta', mockIllegalOverseas as Player[]);
    expect(result.overseas_count).toBe(3);
    expect(result.weaknesses.some(w => w.includes('Maximum 2 allowed'))).toBe(true);
  });
});
