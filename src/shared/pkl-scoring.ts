/**
 * PRO KABADDI LEAGUE (PKL) — SCORING & SQUAD EVALUATION ENGINE
 *
 * Implements:
 * 1. Role-weighted player points calculation with bonus caps.
 * 2. Minimum-sample blending (N < 5 matches) preventing small-sample anomalies.
 * 3. Documented tier baselines ensuring a player with few matches never scores
 *    below a comparable player with zero data.
 * 4. Deterministic Starting 7 Evaluation Model (0 - 100 points).
 */

import { Player, PlayerTier } from './types';

export const PKL_SCORING_CONFIG = {
  MIN_MATCHES_FOR_SEASON_ONLY: 5,
  MAX_BONUS_SUPER_10: 45,
  MAX_BONUS_HIGH_5: 45,
  MAX_BONUS_SUPER_RAID: 25,
  MAX_BONUS_SUPER_TACKLE: 25,
  TIER_BASELINES: {
    A: 720,
    B: 540,
    C: 380,
    D: 240,
  } as Record<PlayerTier | 'D', number>,
  WEIGHTS: {
    RAIDER: {
      RAID_POINT: 1.2,
      SUPER_RAID: 4.0,
      SUPER_10: 15.0,
      DO_OR_DIE: 0.5,
    },
    DEFENDER: {
      TACKLE_POINT: 2.4,
      SUPER_TACKLE: 6.0,
      HIGH_5: 18.0,
    },
    ALL_ROUNDER: {
      RAID_POINT: 0.8,
      SUPER_10: 10.0,
      TACKLE_POINT: 1.8,
      HIGH_5: 12.0,
    },
  },
};

export interface PklRawStats {
  matches?: number;
  total_points?: number;
  raid_points?: number;
  tackle_points?: number;
  successful_raids?: number;
  super_raids?: number;
  super_10s?: number;
  high_5s?: number;
  super_tackles?: number;
  tackles?: number;
  do_or_die_points?: number;
  tackle_success_rate?: number;
  not_out_percentage?: number;
}

export interface PklPlayerPointsBreakdown {
  player_id: string;
  player_name: string;
  role: string;
  tier: string;
  total_points: number;
  tier_baseline: number;
  raw_calculated_score: number;
  is_blended: boolean;
  sample_size_matches: number;
  components: {
    raiding_points: number;
    tackling_points: number;
    super_10_bonus: number;
    high_5_bonus: number;
    super_raid_bonus: number;
    super_tackle_bonus: number;
  };
}

/**
 * Calculates deterministic PKL player points (160 - 990).
 */
export function calculatePklPlayerPoints(
  role: string,
  tier: PlayerTier | 'D',
  seasonStats?: PklRawStats | null,
  careerStats?: PklRawStats | null
): { total_points: number; breakdown: PklPlayerPointsBreakdown } {
  const normRole = (role || '').toUpperCase();
  const tierKey = (tier || 'D') as PlayerTier | 'D';
  const baseline = PKL_SCORING_CONFIG.TIER_BASELINES[tierKey] || 240;

  const sMatches = seasonStats?.matches ?? 0;
  const cMatches = careerStats?.matches ?? 0;

  let effectiveStats: PklRawStats;
  let isBlended = false;

  if (sMatches >= PKL_SCORING_CONFIG.MIN_MATCHES_FOR_SEASON_ONLY) {
    // Sufficient sample in latest season
    effectiveStats = { ...seasonStats };
  } else if (sMatches > 0 && cMatches > 0) {
    // Blend season with career
    isBlended = true;
    const seasonWeight = sMatches / PKL_SCORING_CONFIG.MIN_MATCHES_FOR_SEASON_ONLY;
    const careerWeight = 1 - seasonWeight;

    effectiveStats = {
      matches: sMatches,
      raid_points: (seasonStats?.raid_points ?? 0) * seasonWeight + ((careerStats?.raid_points ?? 0) / Math.max(1, cMatches) * 5) * careerWeight,
      tackle_points: (seasonStats?.tackle_points ?? 0) * seasonWeight + ((careerStats?.tackle_points ?? 0) / Math.max(1, cMatches) * 5) * careerWeight,
      super_raids: Math.round((seasonStats?.super_raids ?? 0) * seasonWeight + ((careerStats?.super_raids ?? 0) / Math.max(1, cMatches) * 5) * careerWeight),
      super_tackles: Math.round((seasonStats?.super_tackles ?? 0) * seasonWeight + ((careerStats?.super_tackles ?? 0) / Math.max(1, cMatches) * 5) * careerWeight),
      super_10s: Math.round((seasonStats?.super_10s ?? 0) * seasonWeight + ((careerStats?.super_10s ?? 0) / Math.max(1, cMatches) * 5) * careerWeight),
      high_5s: Math.round((seasonStats?.high_5s ?? 0) * seasonWeight + ((careerStats?.high_5s ?? 0) / Math.max(1, cMatches) * 5) * careerWeight),
      do_or_die_points: Math.round((seasonStats?.do_or_die_points ?? 0) * seasonWeight + ((careerStats?.do_or_die_points ?? 0) / Math.max(1, cMatches) * 5) * careerWeight),
    };
  } else if (cMatches > 0) {
    // Only career available
    effectiveStats = { ...careerStats };
  } else {
    // Zero data: returns tier baseline directly
    const emptyBreakdown: PklPlayerPointsBreakdown = {
      player_id: '',
      player_name: '',
      role,
      tier: tierKey,
      total_points: baseline,
      tier_baseline: baseline,
      raw_calculated_score: baseline,
      is_blended: false,
      sample_size_matches: 0,
      components: {
        raiding_points: 0,
        tackling_points: 0,
        super_10_bonus: 0,
        high_5_bonus: 0,
        super_raid_bonus: 0,
        super_tackle_bonus: 0,
      },
    };
    return { total_points: baseline, breakdown: emptyBreakdown };
  }

  // Calculate components with bonus caps
  let raidingPts = 0;
  let tacklingPts = 0;
  let s10Bonus = 0;
  let h5Bonus = 0;
  let sRaidBonus = 0;
  let sTackleBonus = 0;

  const w = PKL_SCORING_CONFIG.WEIGHTS;

  if (normRole.includes('RAID')) {
    raidingPts = (effectiveStats.raid_points ?? 0) * w.RAIDER.RAID_POINT + (effectiveStats.do_or_die_points ?? 0) * w.RAIDER.DO_OR_DIE;
    sRaidBonus = Math.min(PKL_SCORING_CONFIG.MAX_BONUS_SUPER_RAID, (effectiveStats.super_raids ?? 0) * w.RAIDER.SUPER_RAID);
    s10Bonus = Math.min(PKL_SCORING_CONFIG.MAX_BONUS_SUPER_10, (effectiveStats.super_10s ?? 0) * w.RAIDER.SUPER_10);
  } else if (normRole.includes('DEF')) {
    tacklingPts = (effectiveStats.tackle_points ?? 0) * w.DEFENDER.TACKLE_POINT;
    sTackleBonus = Math.min(PKL_SCORING_CONFIG.MAX_BONUS_SUPER_TACKLE, (effectiveStats.super_tackles ?? 0) * w.DEFENDER.SUPER_TACKLE);
    h5Bonus = Math.min(PKL_SCORING_CONFIG.MAX_BONUS_HIGH_5, (effectiveStats.high_5s ?? 0) * w.DEFENDER.HIGH_5);
  } else {
    // All-Rounder
    raidingPts = (effectiveStats.raid_points ?? 0) * w.ALL_ROUNDER.RAID_POINT;
    tacklingPts = (effectiveStats.tackle_points ?? 0) * w.ALL_ROUNDER.TACKLE_POINT;
    s10Bonus = Math.min(PKL_SCORING_CONFIG.MAX_BONUS_SUPER_10, (effectiveStats.super_10s ?? 0) * w.ALL_ROUNDER.SUPER_10);
    h5Bonus = Math.min(PKL_SCORING_CONFIG.MAX_BONUS_HIGH_5, (effectiveStats.high_5s ?? 0) * w.ALL_ROUNDER.HIGH_5);
  }

  const rawSum = Math.round(raidingPts + tacklingPts + s10Bonus + h5Bonus + sRaidBonus + sTackleBonus);
  const normalizedSum = Math.round((rawSum / 250) * 450); // Scale to 450 pt benchmark

  // Monotonicity guarantee: calculated points can never drop below the tier baseline
  const finalScore = Math.min(990, Math.max(baseline, Math.max(160, baseline + normalizedSum)));

  const breakdown: PklPlayerPointsBreakdown = {
    player_id: '',
    player_name: '',
    role,
    tier: tierKey,
    total_points: finalScore,
    tier_baseline: baseline,
    raw_calculated_score: rawSum,
    is_blended: isBlended,
    sample_size_matches: sMatches || cMatches,
    components: {
      raiding_points: Math.round(raidingPts),
      tackling_points: Math.round(tacklingPts),
      super_10_bonus: Math.round(s10Bonus),
      high_5_bonus: Math.round(h5Bonus),
      super_raid_bonus: Math.round(sRaidBonus),
      super_tackle_bonus: Math.round(sTackleBonus),
    },
  };

  return { total_points: finalScore, breakdown };
}

export interface Starting7ScoreBreakdown {
  participant_id: string;
  display_name: string;
  total_score: number;
  raiding_score: number;
  corner_defense_score: number;
  cover_defense_score: number;
  allrounder_score: number;
  balance_score: number;
  rank: number;
  strengths: string[];
  weaknesses: string[];
  overseas_count: number;
}

/**
 * Evaluates a 7-player Starting 7 lineup on a 0 - 100 scale.
 */
export function calculateStarting7Score(
  participantId: string,
  displayName: string,
  players: Player[]
): Starting7ScoreBreakdown {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (players.length !== 7) {
    return {
      participant_id: participantId,
      display_name: displayName,
      total_score: 0,
      raiding_score: 0,
      corner_defense_score: 0,
      cover_defense_score: 0,
      allrounder_score: 0,
      balance_score: 0,
      rank: 0,
      strengths: [],
      weaknesses: [`Incomplete Starting 7: Selected ${players.length}/7 required players.`],
      overseas_count: 0,
    };
  }

  // Identify roles & positions
  const raiders = players.filter(p => (p.role || '').toUpperCase().includes('RAID'));
  const allrounders = players.filter(p => (p.role || '').toUpperCase().includes('ALL') || p.role === 'AR');
  const defenders = players.filter(p => (p.role || '').toUpperCase().includes('DEF'));

  let leftCorners = 0;
  let rightCorners = 0;
  let leftCovers = 0;
  let rightCovers = 0;

  for (const p of players) {
    const pos = ((p as any).position_detail || '').toLowerCase();
    if (pos.includes('left corner')) leftCorners++;
    else if (pos.includes('right corner')) rightCorners++;
    else if (pos.includes('left cover')) leftCovers++;
    else if (pos.includes('right cover')) rightCovers++;
  }

  // 1. Raiding Firepower (35 pts max)
  const raidPointsSum = raiders.reduce((acc, p) => acc + (p.player_points || 400), 0) +
    allrounders.reduce((acc, p) => acc + ((p.player_points || 400) * 0.5), 0);
  const raidingScore = Number(Math.min(35, Math.max(5, (raidPointsSum / 1800) * 35)).toFixed(1));

  if (raiders.length >= 2 && raidingScore >= 26) {
    strengths.push(`Lethal raiding unit: Dual strike raiders keep opposing defense under relentless pressure.`);
  } else if (raiders.length < 2) {
    weaknesses.push(`Lack of raiding depth: Less than 2 specialist raiders in Starting 7.`);
  }

  // 2. Corner Wall Defense (25 pts max)
  const cornerScoreRaw = (leftCorners > 0 ? 12.5 : 4) + (rightCorners > 0 ? 12.5 : 4);
  const cornerDefenseScore = Number(Math.min(25, cornerScoreRaw).toFixed(1));

  if (leftCorners > 0 && rightCorners > 0) {
    strengths.push(`Locked corners: Specialist Left & Right Corners anchor the mat.`);
  } else {
    weaknesses.push(`Vulnerable corners: Missing specialist corner defenders.`);
  }

  // 3. Cover Stability (20 pts max)
  const coverScoreRaw = (leftCovers > 0 ? 10 : 3) + (rightCovers > 0 ? 10 : 3);
  const coverDefenseScore = Number(Math.min(20, coverScoreRaw).toFixed(1));

  if (leftCovers > 0 && rightCovers > 0) {
    strengths.push(`Impenetrable cover wall: Proven Left & Right Covers control the midline.`);
  } else {
    weaknesses.push(`Shaky inner defense: Missing dedicated cover defenders.`);
  }

  // 4. All-Round Flexibility (10 pts max)
  const allrounderScore = Number(Math.min(10, allrounders.length >= 1 ? 10 : 4).toFixed(1));
  if (allrounders.length >= 1) {
    strengths.push(`All-round utility: Dual-threat players offer tactical substitutions.`);
  }

  // 5. Regulation Compliance & Mat Balance (10 pts max)
  let balanceScore = 10;
  let overseasCount = 0;
  for (const p of players) {
    if (p.country !== 'India' && p.nationality !== 'India') {
      overseasCount++;
    }
  }

  if (overseasCount > 2) {
    balanceScore -= 8;
    weaknesses.push(`PKL Rule Violation: Lineup has ${overseasCount} overseas players (Maximum 2 allowed on mat).`);
  }

  const totalScore = Number(
    Math.min(100, Math.max(0, raidingScore + cornerDefenseScore + coverDefenseScore + allrounderScore + balanceScore)).toFixed(1)
  );

  return {
    participant_id: participantId,
    display_name: displayName,
    total_score: totalScore,
    raiding_score: raidingScore,
    corner_defense_score: cornerDefenseScore,
    cover_defense_score: coverDefenseScore,
    allrounder_score: allrounderScore,
    balance_score: balanceScore,
    rank: 0,
    strengths,
    weaknesses,
    overseas_count: overseasCount,
  };
}
