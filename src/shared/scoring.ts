import {
  AuctionResults,
  Award,
  BoughtPlayer,
  ManagerScoreBreakdown,
  Participant,
  Player,
  PlayingXIScoreBreakdown,
  PlayingXISubmission,
  RoomSettings,
  SeasonRecap,
  TeamScoreBreakdown,
  TradeTransaction,
} from './types';
import { formatCurrency } from './constants';

export const SCORING_ENGINE_VERSION = '2026.1-5pillar';

export function normalizeRoleToCode(role: string): 'BAT' | 'BOWL' | 'AR' | 'WK' {
  const r = (role || '').toUpperCase();
  if (r.startsWith('BAT')) return 'BAT';
  if (r.startsWith('BOWL')) return 'BOWL';
  if (r.startsWith('ALL') || r === 'AR') return 'AR';
  if (r.startsWith('WICKET') || r === 'WK') return 'WK';
  return 'BAT';
}

/**
 * Computes live smart purse metrics and squad composition breakdown for a participant.
 */
export function computeParticipantMetrics(participant: Participant, settings: RoomSettings) {
  const squad = participant.squad || [];
  const spentByRole = { BAT: 0, BOWL: 0, AR: 0, WK: 0 };
  const roleCounts = { BAT: 0, BOWL: 0, AR: 0, WK: 0, overseas: 0 };

  let totalSpent = 0;
  for (const item of squad) {
    totalSpent += item.bought_for;
    const code = normalizeRoleToCode(item.player.role);
    spentByRole[code] += item.bought_for;
    roleCounts[code]++;
    if (item.player.country !== 'India' && item.player.nationality !== 'India') {
      roleCounts.overseas++;
    }
  }

  const avgPrice = squad.length > 0 ? Math.round(totalSpent / squad.length) : 0;
  const shortages: string[] = [];
  const excesses: string[] = [];

  const scale = settings.squad_size / 15;
  const minBat = Math.max(3, Math.round(4 * scale));
  const minBowl = Math.max(3, Math.round(4 * scale));
  const minAR = Math.max(1, Math.round(2 * scale));
  const minWK = 1;

  if (roleCounts.WK < minWK) {
    shortages.push(`Need at least ${minWK} Wicketkeeper (Current: 0)`);
  }
  if (roleCounts.BAT < minBat && squad.length >= Math.round(settings.squad_size * 0.5)) {
    shortages.push(`Batting shortage: ${roleCounts.BAT}/${minBat} recommended`);
  }
  if (roleCounts.BOWL < minBowl && squad.length >= Math.round(settings.squad_size * 0.5)) {
    shortages.push(`Bowling shortage: ${roleCounts.BOWL}/${minBowl} frontline bowlers recommended`);
  }
  if (roleCounts.AR < minAR && squad.length >= Math.round(settings.squad_size * 0.5)) {
    shortages.push(`All-rounder depth needed: ${roleCounts.AR}/${minAR}`);
  }

  if (roleCounts.overseas > 8) {
    excesses.push(`Overseas limit exceeded: ${roleCounts.overseas}/8 maximum`);
  } else if (roleCounts.overseas === 8) {
    excesses.push(`Overseas slots capped: 8/8 full`);
  }
  if (roleCounts.BAT > Math.round(7 * scale)) {
    excesses.push(`Batting heavy roster: ${roleCounts.BAT} pure batters`);
  }
  if (roleCounts.BOWL > Math.round(7 * scale)) {
    excesses.push(`Bowling heavy roster: ${roleCounts.BOWL} pure bowlers`);
  }

  return {
    amount_spent: totalSpent,
    avg_purchase_price: avgPrice,
    spent_by_role: spentByRole,
    role_counts: roleCounts,
    squad_shortages: shortages,
    squad_excesses: excesses,
  };
}

/**
 * Post-Auction Deterministic 5-Pillar Squad Evaluation Scoring Model:
 * 1. Individual player performance: 40%
 * 2. Batting strength: 20%
 * 3. Bowling strength: 20%
 * 4. All-rounder strength: 10%
 * 5. Squad balance & depth: 10%
 * Total = 100%
 */
export function calculate5PillarSquadScore(
  participant: Participant,
  settings: RoomSettings
): {
  total_score: number;
  individual_performance_score: number;
  batting_strength_score: number;
  bowling_strength_score: number;
  allrounder_strength_score: number;
  squad_balance_score: number;
  strengths: string[];
  weaknesses: string[];
  scoring_version?: string;
} {
  const squad = participant.squad || [];
  if (squad.length === 0) {
    return {
      total_score: 0,
      individual_performance_score: 0,
      batting_strength_score: 0,
      bowling_strength_score: 0,
      allrounder_strength_score: 0,
      squad_balance_score: 0,
      strengths: [],
      weaknesses: ['Empty squad: No players acquired.'],
      scoring_version: '2026.1-5pillar',
    };
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Pillar 1: Individual Player Performance (Max 40 points)
  // Evaluates verified 2026 player points of the squad's top 11-15 players
  const playerPointsList = squad.map(s => s.player.player_points || 500).sort((a, b) => b - a);
  const consideredCount = Math.min(squad.length, 15);
  const avgTopPoints =
    consideredCount > 0
      ? playerPointsList.slice(0, consideredCount).reduce((a, b) => a + b, 0) / consideredCount
      : 0;
  // Benchmark: 900+ points = 40 pts, 700 points = 30 pts, 450 points = 20 pts
  const individual_performance_score = Number(Math.min(40, Math.max(5, (avgTopPoints / 950) * 40)).toFixed(1));

  if (avgTopPoints >= 780) {
    strengths.push(`Elite individual caliber: Squad averages ${Math.round(avgTopPoints)} verified player points.`);
  } else if (avgTopPoints < 520) {
    weaknesses.push(`Low star firepower: Squad averages only ${Math.round(avgTopPoints)} player points.`);
  }

  // Pillar 2: Batting Strength (Max 20 points)
  const battersAndKeepers = squad.filter(s => {
    const role = normalizeRoleToCode(s.player.role);
    return role === 'BAT' || role === 'WK' || role === 'AR';
  });
  let totalBattingRuns = 0;
  let weightedStrikeRateSum = 0;

  for (const item of battersAndKeepers) {
    const st = item.player.stats_2026;
    if (st) {
      totalBattingRuns += st.runs || 0;
      weightedStrikeRateSum += (st.strike_rate || 130) * Math.max(st.runs || 10, 50);
    }
  }

  const avgSquadSR = totalBattingRuns > 0 ? weightedStrikeRateSum / totalBattingRuns : 130;
  const battingVolumeScore = Math.min(10, (totalBattingRuns / 1800) * 10);
  const battingQualityScore = Math.min(10, Math.max(0, ((avgSquadSR - 120) / 45) * 10));
  const batting_strength_score = Number(Math.min(20, Math.max(2, battingVolumeScore + battingQualityScore)).toFixed(1));

  if (avgSquadSR >= 155) {
    strengths.push(`Explosive power-hitting: Squad batting strike rate stands at ${avgSquadSR.toFixed(1)}.`);
  } else if (avgSquadSR < 135) {
    weaknesses.push(`Sub-par boundary scoring: Squad strike rate sits low at ${avgSquadSR.toFixed(1)}.`);
  }
  if (totalBattingRuns >= 1600) {
    strengths.push(`Massive run accumulation: ${totalBattingRuns} verified 2026 runs across squad.`);
  }

  // Pillar 3: Bowling Strength (Max 20 points)
  const bowlers = squad.filter(s => {
    const role = normalizeRoleToCode(s.player.role);
    return role === 'BOWL' || role === 'AR';
  });
  let totalWickets = 0;
  let weightedEconomySum = 0;
  let totalOversApproximation = 0;

  for (const item of bowlers) {
    const st = item.player.stats_2026;
    if (st && st.wickets) {
      totalWickets += st.wickets;
      const approxOvers = (st.dot_balls || 50) / 3;
      totalOversApproximation += approxOvers;
      weightedEconomySum += (st.economy_rate || 8.5) * approxOvers;
    }
  }

  const avgEconomy = totalOversApproximation > 0 ? weightedEconomySum / totalOversApproximation : 8.8;
  const wicketScore = Math.min(10, (totalWickets / 65) * 10);
  const economyScore = Math.min(10, Math.max(0, ((10.0 - avgEconomy) / 3.0) * 10));
  const bowling_strength_score = Number(Math.min(20, Math.max(2, wicketScore + economyScore)).toFixed(1));

  if (totalWickets >= 55) {
    strengths.push(`Lethal wicket-taking depth: ${totalWickets} certified wickets in arsenal.`);
  } else if (totalWickets < 30) {
    weaknesses.push(`Shallow wicket threat: Only ${totalWickets} wickets logged by frontline attack.`);
  }
  if (avgEconomy <= 7.8) {
    strengths.push(`Impenetrable run restriction: ${avgEconomy.toFixed(2)} squad economy rate.`);
  } else if (avgEconomy >= 9.2) {
    weaknesses.push(`High run leakage: Attack concedes an elevated ${avgEconomy.toFixed(2)} rpo.`);
  }

  // Pillar 4: All-Rounder Strength (Max 10 points)
  const allrounders = squad.filter(s => normalizeRoleToCode(s.player.role) === 'AR');
  let arTotalPoints = 0;
  for (const item of allrounders) {
    const st = item.player.stats_2026;
    if (st) {
      arTotalPoints += (st.runs || 0) * 0.02 + (st.wickets || 0) * 0.8;
    }
  }
  const arCountScore = Math.min(5, (allrounders.length / 3) * 5);
  const arImpactScore = Math.min(5, (arTotalPoints / 25) * 5);
  const allrounder_strength_score = Number(Math.min(10, Math.max(1, arCountScore + arImpactScore)).toFixed(1));

  if (allrounders.length >= 3 && arImpactScore >= 3.5) {
    strengths.push(`Superb all-rounder utility: ${allrounders.length} impact dual-threat options.`);
  } else if (allrounders.length === 0) {
    weaknesses.push(`Zero specialist all-rounders: Lacks batting depth and sixth-bowler flexibility.`);
  }

  // Pillar 5: Squad Balance & Rules (Max 10 points)
  const counts = { BAT: 0, BOWL: 0, AR: 0, WK: 0, overseas: 0 };
  for (const item of squad) {
    const code = normalizeRoleToCode(item.player.role);
    counts[code]++;
    if (item.player.country !== 'India' && item.player.nationality !== 'India') {
      counts.overseas++;
    }
  }

  let balanceScore = 10;
  if (counts.WK < 1) {
    balanceScore -= 4;
    weaknesses.push(`Critical rule flaw: No wicketkeeper present in the entire squad.`);
  } else if (counts.WK >= 2) {
    strengths.push(`Reliable wicketkeeper coverage: ${counts.WK} wicketkeepers available.`);
  }

  if (counts.overseas > 8) {
    balanceScore -= 5;
    weaknesses.push(`Rule violation penalty: Exceeded 8 overseas players cap (${counts.overseas}/8).`);
  } else if (counts.overseas >= 4 && counts.overseas <= 8) {
    balanceScore += 0; // optimal
  } else if (counts.overseas < 2) {
    balanceScore -= 2;
    weaknesses.push(`Limited overseas international firepower: Only ${counts.overseas} overseas picked.`);
  }

  if (counts.BAT < 3) balanceScore -= 2;
  if (counts.BOWL < 3) balanceScore -= 2;
  const squad_balance_score = Number(Math.min(10, Math.max(1, balanceScore)).toFixed(1));

  const total_score = Math.round(
    individual_performance_score +
    batting_strength_score +
    bowling_strength_score +
    allrounder_strength_score +
    squad_balance_score
  );

  return {
    total_score: Math.min(100, Math.max(0, total_score)),
    individual_performance_score,
    batting_strength_score,
    bowling_strength_score,
    allrounder_strength_score,
    squad_balance_score,
    strengths,
    weaknesses,
    scoring_version: '2026.1-5pillar',
  };
}

/**
 * Backward-compatible wrapper for existing test suites.
 */
export function calculateTeamScore(participant: Participant, settings: RoomSettings) {
  const fivePillar = calculate5PillarSquadScore(participant, settings);
  return {
    total_score: fivePillar.total_score,
    role_balance_score: Math.round(fivePillar.squad_balance_score * 4), // 0-40 scale
    completeness_score: Math.round(Math.min(1, participant.squad.length / settings.squad_size) * 30),
    value_score: Math.round(
      Math.min(30, (fivePillar.individual_performance_score / 40) * 30)
    ),
  };
}

/**
 * Independent Manager Performance Evaluation:
 * 1. Purse utilization efficiency: 25 pts
 * 2. Value for money / bargain index: 30 pts
 * 3. Quality of player trades: 20 pts
 * 4. Final squad output: 25 pts
 * Total: 100%
 */
export function calculateManagerScore(
  participant: Participant,
  settingsOrScore: any,
  squadScoreOrTrades?: any,
  allTradesInput: TradeTransaction[] = []
): ManagerScoreBreakdown {
  // Normalize flexible arguments
  let settings: { purse: number; squad_size: number } = { purse: 100_00_00_000, squad_size: 15 };
  let squadScore = 75;
  let allTrades: TradeTransaction[] = [];

  if (typeof settingsOrScore === 'object' && settingsOrScore !== null && 'purse' in settingsOrScore) {
    settings = settingsOrScore;
    if (typeof squadScoreOrTrades === 'number') {
      squadScore = squadScoreOrTrades;
    } else if (typeof squadScoreOrTrades === 'object' && squadScoreOrTrades?.total_score) {
      squadScore = squadScoreOrTrades.total_score;
    }
    allTrades = Array.isArray(allTradesInput) ? allTradesInput : [];
  } else if (typeof settingsOrScore === 'object' && settingsOrScore !== null && 'total_score' in settingsOrScore) {
    squadScore = settingsOrScore.total_score;
    allTrades = Array.isArray(squadScoreOrTrades) ? squadScoreOrTrades : [];
    if (typeof allTradesInput === 'object' && allTradesInput !== null && 'purse' in (allTradesInput as any)) {
      settings = allTradesInput as any;
    }
  } else if (typeof squadScoreOrTrades === 'object' && squadScoreOrTrades !== null && 'total_score' in squadScoreOrTrades) {
    squadScore = squadScoreOrTrades.total_score;
    allTrades = Array.isArray(allTradesInput) ? allTradesInput : [];
  }

  const squad = participant.squad || [];
  const totalSpent = squad.reduce((sum, item) => sum + (item.bought_for || item.purchase_price || item.player?.base_price || 0), 0);
  const purseRemaining = participant.purse_remaining;

  // 1. Purse Utilization Efficiency (Max 25 pts)
  const emptySlots = Math.max(0, settings.squad_size - squad.length);
  const minReserveNeeded = emptySlots * 20_00_000;
  const reserveMaintained = purseRemaining >= minReserveNeeded;
  const spendRatio = totalSpent / (settings.purse || 100_00_00_000);

  let purseEffScore = 0;
  if (reserveMaintained) {
    if (spendRatio >= 0.85 && spendRatio <= 0.99) {
      purseEffScore = 25;
    } else if (spendRatio >= 0.70) {
      purseEffScore = 20;
    } else {
      purseEffScore = Math.max(5, Math.round(spendRatio * 25));
    }
  } else {
    purseEffScore = 8;
  }

  // 2. Value for Money / Bargain Index (Max 30 pts)
  let surplusTotal = 0;
  const bargainPicks: { player_name: string; paid: number; benchmark: number; surplus: number }[] = [];

  for (const item of squad) {
    const base = item.player.base_price;
    const paid = item.bought_for || item.purchase_price || item.player.base_price || 0;
    const tier = item.player.tier;

    let benchmark = base;
    if (tier === 'A') benchmark = Math.max(base, 12_00_00_000);
    else if (tier === 'B') benchmark = Math.max(base, 4_50_00_000);
    else benchmark = Math.max(base, 1_20_00_000);

    const surplus = benchmark - paid;
    surplusTotal += surplus;

    if (surplus > 0) {
      bargainPicks.push({
        player_name: item.player.name,
        paid,
        benchmark,
        surplus,
      });
    }
  }

  bargainPicks.sort((a, b) => b.surplus - a.surplus);
  const vfmScore = Math.min(30, Math.max(5, Math.round(15 + (surplusTotal / 25_00_00_000) * 15)));

  // 3. Trade Quality Index (Max 20 pts)
  const safeTrades = Array.isArray(allTrades) ? allTrades : [];
  const myTrades = safeTrades.filter(
    t => t.team_a_name === participant.display_name || t.team_b_name === participant.display_name
  );
  let netPointsDiff = 0;

  for (const t of myTrades) {
    const isTeamA = t.team_a_name === participant.display_name;
    const playerReceived = isTeamA ? t.player_b : t.player_a;
    const playerGiven = isTeamA ? t.player_a : t.player_b;
    const diff = ((playerReceived as any).player_points || playerReceived.stats_2026?.player_points || 500) -
                 ((playerGiven as any).player_points || playerGiven.stats_2026?.player_points || 500);
    netPointsDiff += diff;
  }

  let tradeScore = 12;
  if (myTrades.length > 0) {
    tradeScore = Math.min(20, Math.max(2, Math.round(12 + (netPointsDiff / 100) * 4)));
  }

  // 4. Squad Strength Output (Max 25 pts)
  const squadStrengthScore = Number(Math.min(25, Math.max(0, (squadScore / 100) * 25)).toFixed(1));

  const totalManagerScore = Math.round(purseEffScore + vfmScore + tradeScore + squadStrengthScore);

  return {
    participant_id: participant.id,
    display_name: participant.display_name,
    franchise: participant.franchise!,
    total_manager_score: Math.min(100, Math.max(0, totalManagerScore)),
    purse_efficiency_score: purseEffScore,
    value_for_money_score: vfmScore,
    trade_quality_score: tradeScore,
    squad_strength_score: squadStrengthScore,
    rank: 0,
    efficiency_details: {
      purse_spent: totalSpent,
      purse_remaining: purseRemaining,
      savings_ratio: Number((purseRemaining / settings.purse).toFixed(3)),
      reserve_maintained: reserveMaintained,
    },
    bargain_picks: bargainPicks.slice(0, 3),
    trade_impact: {
      trades_count: myTrades.length,
      net_points_diff: netPointsDiff,
    },
  };
}

/**
 * Deterministic Playing XI Statistical Scoring Engine:
 * Evaluates the 11-player lineup based on:
 * - Batting Top Order (1-3) & Middle Order (4-7): 30 pts
 * - Bowling Attack & Death Bowling Depth: 30 pts
 * - All-Rounder & Finishing Utility: 20 pts
 * - Role Balance & IPL Regulations Compliance: 20 pts
 * Total: 100%
 */
export function calculatePlayingXIScore(submission: PlayingXISubmission): PlayingXIScoreBreakdown {
  const players = submission.players || [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (players.length !== 11) {
    return {
      participant_id: submission.participant_id,
      display_name: submission.display_name,
      franchise: submission.franchise,
      total_score: 0,
      batting_score: 0,
      bowling_score: 0,
      allrounder_score: 0,
      balance_score: 0,
      rank: 0,
      strengths: [],
      weaknesses: [`Incomplete Playing XI: Selected ${players.length}/11 required players.`],
      openers_rating: 0,
      middle_order_rating: 0,
      finishers_rating: 0,
      pace_spin_ratio: '0:0',
      overseas_count: 0,
    };
  }

  // 1. Batting Analysis (Positions 1-7)
  const topOrder = players.slice(0, 3);
  const middleOrder = players.slice(3, 7);

  const topOrderAvgPoints = topOrder.reduce((acc, p) => acc + (p.player_points || 500), 0) / 3;
  const middleOrderAvgPoints = middleOrder.reduce((acc, p) => acc + (p.player_points || 500), 0) / 4;

  const openersRating = Number(Math.min(10, (topOrderAvgPoints / 900) * 10).toFixed(1));
  const middleRating = Number(Math.min(10, (middleOrderAvgPoints / 850) * 10).toFixed(1));

  const battingScore = Number(Math.min(30, (openersRating * 1.5 + middleRating * 1.5)).toFixed(1));

  if (topOrderAvgPoints >= 800) {
    strengths.push(`Formidable top-order: Star openers establish commanding tournament powerplays.`);
  } else if (topOrderAvgPoints < 550) {
    weaknesses.push(`Shaky top-order: Openers prone to early collapse.`);
  }

  // 2. Bowling Analysis (Positions 7-11 and all-rounders)
  const designatedBowlers = players.filter(p => {
    const role = normalizeRoleToCode(p.role);
    return role === 'BOWL' || role === 'AR';
  });
  let totalWickets = 0;
  let paceCount = 0;
  let spinCount = 0;

  for (const p of designatedBowlers) {
    totalWickets += p.stats_2026?.wickets || 0;
    const bStyle = (p.bowling_style || '').toLowerCase();
    if (bStyle.includes('spin') || bStyle.includes('break') || bStyle.includes('orthodox')) {
      spinCount++;
    } else if (bStyle.includes('fast') || bStyle.includes('medium') || bStyle.includes('pace')) {
      paceCount++;
    }
  }

  const bowlingScore = Number(Math.min(30, Math.max(5, (totalWickets / 55) * 30)).toFixed(1));

  if (totalWickets >= 48) {
    strengths.push(`Potent bowling attack: ${totalWickets} certified wickets across the lineup.`);
  } else if (totalWickets < 25) {
    weaknesses.push(`Lack of proven wicket-takers in the attack.`);
  }

  // 3. All-Rounder & Finishers (Max 20 pts)
  const allrounders = players.filter(p => normalizeRoleToCode(p.role) === 'AR');
  const finishersRating = Number(Math.min(10, (allrounders.length / 2) * 10).toFixed(1));
  const allrounderScore = Number(Math.min(20, (finishersRating * 2.0)).toFixed(1));

  if (allrounders.length >= 2) {
    strengths.push(`Deep batting with ${allrounders.length} all-rounders extending the lower order.`);
  } else {
    weaknesses.push(`Thin lower order: Lacks multi-dimensional all-round depth.`);
  }

  // 4. Role Balance & Regulation Compliance (Max 20 pts)
  let balanceScore = 20;
  let overseasCount = 0;
  let hasWicketkeeper = false;

  for (const p of players) {
    if (p.country !== 'India' && p.nationality !== 'India') {
      overseasCount++;
    }
    if (normalizeRoleToCode(p.role) === 'WK' || p.id === submission.wicketkeeper_id) {
      hasWicketkeeper = true;
    }
  }

  if (overseasCount > 4) {
    balanceScore -= 10;
    weaknesses.push(`IPL Rule Violation: Lineup has ${overseasCount} overseas players (Maximum 4 allowed).`);
  }
  if (!hasWicketkeeper) {
    balanceScore -= 8;
    weaknesses.push(`No designated wicketkeeper selected in Playing XI.`);
  }
  if (designatedBowlers.length < 5) {
    balanceScore -= 6;
    weaknesses.push(`Fewer than 5 certified bowling options in the lineup.`);
  }

  balanceScore = Math.max(2, balanceScore);

  const totalScore = Math.round(battingScore + bowlingScore + allrounderScore + balanceScore);

  return {
    participant_id: submission.participant_id,
    display_name: submission.display_name,
    franchise: submission.franchise,
    total_score: Math.min(100, Math.max(0, totalScore)),
    batting_score: battingScore,
    bowling_score: bowlingScore,
    allrounder_score: allrounderScore,
    balance_score: balanceScore,
    rank: 0,
    strengths,
    weaknesses,
    openers_rating: openersRating,
    middle_order_rating: middleRating,
    finishers_rating: finishersRating,
    pace_spin_ratio: `${paceCount}P : ${spinCount}S`,
    overseas_count: overseasCount,
  };
}

/**
 * Evaluates the 7 requested Championship Achievement Awards:
 * 1. Best Batting Squad
 * 2. Best Bowling Squad
 * 3. Best Balanced Squad
 * 4. Best Auction Strategy
 * 5. Best Trading Strategy
 * 6. Strongest Playing XI
 * 7. Overall Auction Champion
 */
export function generateChampionshipAwards(
  squadLeaderboard: TeamScoreBreakdown[],
  managerLeaderboard: ManagerScoreBreakdown[],
  playingXILeaderboard: PlayingXIScoreBreakdown[],
  allTrades: TradeTransaction[] = []
): Award[] {
  const awards: Award[] = [];

  // 1. Overall Auction Champion
  if (squadLeaderboard.length > 0) {
    const champ = squadLeaderboard[0];
    awards.push({
      id: 'overall_champion',
      title: '🏆 Overall Auction Champion',
      description: 'Crowned tournament champion with the highest overall squad score',
      winner_name: `${champ.display_name} (${champ.franchise.name})`,
      franchise_short_code: champ.franchise.short_code,
      franchise_color: champ.franchise.color,
      value_highlight: `${champ.total_score} PTS`,
    });
  }

  // 2. Best Batting Squad
  const bestBatting = [...squadLeaderboard].sort(
    (a, b) => (b.batting_strength_score || 0) - (a.batting_strength_score || 0)
  )[0];
  if (bestBatting) {
    awards.push({
      id: 'best_batting',
      title: '🏏 Best Batting Squad',
      description: 'Constructed the most destructive, high-run-rate batting powerhouse',
      winner_name: `${bestBatting.display_name} (${bestBatting.franchise.name})`,
      franchise_short_code: bestBatting.franchise.short_code,
      franchise_color: bestBatting.franchise.color,
      value_highlight: `${bestBatting.batting_strength_score || 0} / 20 PTS`,
    });
  }

  // 3. Best Bowling Squad
  const bestBowling = [...squadLeaderboard].sort(
    (a, b) => (b.bowling_strength_score || 0) - (a.bowling_strength_score || 0)
  )[0];
  if (bestBowling) {
    awards.push({
      id: 'best_bowling',
      title: '🎯 Best Bowling Squad',
      description: 'Assembled the most clinical wicket-taking and restrictive bowling attack',
      winner_name: `${bestBowling.display_name} (${bestBowling.franchise.name})`,
      franchise_short_code: bestBowling.franchise.short_code,
      franchise_color: bestBowling.franchise.color,
      value_highlight: `${bestBowling.bowling_strength_score || 0} / 20 PTS`,
    });
  }

  // 4. Best Balanced Squad
  const bestBalanced = [...squadLeaderboard].sort(
    (a, b) => (b.squad_balance_score || 0) - (a.squad_balance_score || 0)
  )[0];
  if (bestBalanced) {
    awards.push({
      id: 'best_balanced',
      title: '⚖️ Best Balanced Squad',
      description: 'Mastered squad depth, role balance, wicketkeeper coverage and overseas limits',
      winner_name: `${bestBalanced.display_name} (${bestBalanced.franchise.name})`,
      franchise_short_code: bestBalanced.franchise.short_code,
      franchise_color: bestBalanced.franchise.color,
      value_highlight: `${bestBalanced.squad_balance_score || 0} / 10 PTS`,
    });
  }

  // 5. Best Auction Strategy
  if (managerLeaderboard.length > 0) {
    const bestManager = managerLeaderboard[0];
    awards.push({
      id: 'best_auction_strategy',
      title: '🧠 Best Auction Strategy',
      description: 'Outstanding purse utilization efficiency, tactical bidding and bargain acquisitions',
      winner_name: `${bestManager.display_name} (${bestManager.franchise.name})`,
      franchise_short_code: bestManager.franchise.short_code,
      franchise_color: bestManager.franchise.color,
      value_highlight: `${bestManager.total_manager_score} PTS`,
    });
  }

  // 6. Best Trading Strategy
  const bestTrader = [...managerLeaderboard].sort(
    (a, b) => b.trade_quality_score - a.trade_quality_score
  )[0];
  if (bestTrader && bestTrader.trade_impact.trades_count > 0) {
    awards.push({
      id: 'best_trading_strategy',
      title: '🤝 Best Trading Strategy',
      description: 'Executed value-positive player trades that elevated squad quality',
      winner_name: `${bestTrader.display_name} (${bestTrader.franchise.name})`,
      franchise_short_code: bestTrader.franchise.short_code,
      franchise_color: bestTrader.franchise.color,
      value_highlight: `+${bestTrader.trade_impact.net_points_diff} net pts (${bestTrader.trade_impact.trades_count} trades)`,
    });
  } else if (managerLeaderboard.length > 0) {
    const bestValuePick = [...managerLeaderboard].sort((a, b) => b.value_for_money_score - a.value_for_money_score)[0];
    awards.push({
      id: 'best_trading_strategy',
      title: '💎 Best Bargain Hunter',
      description: 'Secured maximum surplus market value across the auction table',
      winner_name: `${bestValuePick.display_name} (${bestValuePick.franchise.name})`,
      franchise_short_code: bestValuePick.franchise.short_code,
      franchise_color: bestValuePick.franchise.color,
      value_highlight: `${bestValuePick.value_for_money_score} / 30 PTS`,
    });
  }

  // 7. Strongest Playing XI
  if (playingXILeaderboard.length > 0) {
    const strongestXI = playingXILeaderboard[0];
    awards.push({
      id: 'strongest_playing_xi',
      title: '⭐ Strongest Playing XI',
      description: 'Crafted the most dominant 11-player matchday starting lineup',
      winner_name: `${strongestXI.display_name} (${strongestXI.franchise.name})`,
      franchise_short_code: strongestXI.franchise.short_code,
      franchise_color: strongestXI.franchise.color,
      value_highlight: `${strongestXI.total_score} PTS`,
    });
  }

  return awards;
}

/**
 * Computes Season Recap analytics.
 */
export function generateSeasonRecap(
  participants: Participant[],
  allCompletedBids: { player_id: string; player: Player; bids_count: number; final_price: number; winner_id: string }[],
  allTrades: TradeTransaction[] = [],
  championFranchise: any = null
): SeasonRecap {
  const activeParticipants = participants.filter(p => p.franchise !== null);
  const totalSpent = activeParticipants.reduce(
    (sum, p) => sum + p.squad.reduce((s, i) => s + i.bought_for, 0),
    0
  );
  const totalSold = activeParticipants.reduce((sum, p) => sum + p.squad.length, 0);

  // Highest Purchase
  let highestPurchase: { player: Player; price: number; franchise: any } | null = null;
  for (const p of activeParticipants) {
    for (const item of p.squad) {
      if (!highestPurchase || item.bought_for > highestPurchase.price) {
        highestPurchase = {
          player: item.player,
          price: item.bought_for,
          franchise: p.franchise!,
        };
      }
    }
  }

  // Best Bargain Pick
  let bestBargain: { player: Player; price: number; franchise: any; surplus: number } | null = null;
  for (const p of activeParticipants) {
    for (const item of p.squad) {
      const benchmark = item.player.tier === 'A' ? 12_00_00_000 : item.player.tier === 'B' ? 4_50_00_000 : 1_20_00_000;
      const surplus = benchmark - item.bought_for;
      if (!bestBargain || surplus > bestBargain.surplus) {
        bestBargain = {
          player: item.player,
          price: item.bought_for,
          franchise: p.franchise!,
          surplus,
        };
      }
    }
  }

  // Highest Spending Team
  let highestSpendingTeam: { franchise: any; spent: number } | null = null;
  for (const p of activeParticipants) {
    const spent = p.squad.reduce((s, i) => s + i.bought_for, 0);
    if (!highestSpendingTeam || spent > highestSpendingTeam.spent) {
      highestSpendingTeam = {
        franchise: p.franchise!,
        spent,
      };
    }
  }

  return {
    total_spent: totalSpent,
    players_sold: totalSold,
    unsold_players_count: Math.max(0, allCompletedBids.length - totalSold),
    highest_purchase: highestPurchase,
    best_bargain: bestBargain,
    highest_spending_team: highestSpendingTeam,
    total_trades_completed: allTrades.length,
    champion_team:
      Array.isArray(championFranchise) && championFranchise.length > 0
        ? {
            name: championFranchise[0].winner_name,
            short_code: championFranchise[0].franchise_short_code,
            color: championFranchise[0].franchise_color,
          }
        : championFranchise?.short_code
        ? championFranchise
        : activeParticipants[0]?.franchise || null,
  };
}

/**
 * Master computation creating all post-auction results.
 */
export function computeAuctionResults(
  roomCode: string,
  participants: Participant[],
  settings: RoomSettings,
  allBids: { player_id: string; player: Player; bids_count: number; final_price: number; winner_id: string }[],
  allTrades: TradeTransaction[] = [],
  playingXISubmissions: PlayingXISubmission[] = []
): AuctionResults {
  const activeParticipants = participants.filter(p => p.franchise !== null);

  // 1. Squad Leaderboard (5-Pillar Score)
  const squadLeaderboard: TeamScoreBreakdown[] = activeParticipants.map(p => {
    const fivePillar = calculate5PillarSquadScore(p, settings);
    const totalSpent = p.squad.reduce((sum, item) => sum + item.bought_for, 0);

    return {
      participant_id: p.id,
      display_name: p.display_name,
      franchise: p.franchise!,
      total_score: fivePillar.total_score,
      role_balance_score: Math.round(fivePillar.squad_balance_score * 4),
      completeness_score: Math.round(Math.min(1, p.squad.length / settings.squad_size) * 30),
      value_score: Math.round((fivePillar.individual_performance_score / 40) * 30),
      individual_performance_score: fivePillar.individual_performance_score,
      batting_strength_score: fivePillar.batting_strength_score,
      bowling_strength_score: fivePillar.bowling_strength_score,
      allrounder_strength_score: fivePillar.allrounder_strength_score,
      squad_balance_score: fivePillar.squad_balance_score,
      strengths: fivePillar.strengths,
      weaknesses: fivePillar.weaknesses,
      scoring_version: SCORING_ENGINE_VERSION,
      players_count: p.squad.length,
      total_spent: totalSpent,
      purse_remaining: p.purse_remaining,
      squad: p.squad,
      rank: 0,
    };
  });

  squadLeaderboard.sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    return b.purse_remaining - a.purse_remaining;
  });
  squadLeaderboard.forEach((item, index) => {
    item.rank = index + 1;
  });

  // 2. Manager Performance Leaderboard
  const managerLeaderboard: ManagerScoreBreakdown[] = activeParticipants.map(p => {
    const squadEntry = squadLeaderboard.find(s => s.participant_id === p.id);
    const score = squadEntry ? squadEntry.total_score : 50;
    return calculateManagerScore(p, settings, score, allTrades);
  });

  managerLeaderboard.sort((a, b) => b.total_manager_score - a.total_manager_score);
  managerLeaderboard.forEach((item, index) => {
    item.rank = index + 1;
  });

  // 3. Playing XI Leaderboard
  const playingXILeaderboard: PlayingXIScoreBreakdown[] = playingXISubmissions.map(sub =>
    calculatePlayingXIScore(sub)
  );

  playingXILeaderboard.sort((a, b) => b.total_score - a.total_score);
  playingXILeaderboard.forEach((item, index) => {
    item.rank = index + 1;
  });

  // 4. Championship Awards
  const awards = generateChampionshipAwards(
    squadLeaderboard,
    managerLeaderboard,
    playingXILeaderboard,
    allTrades
  );

  // 5. Season Recap
  const championFranchise = squadLeaderboard[0]?.franchise || null;
  const seasonRecap = generateSeasonRecap(
    participants,
    allBids,
    allTrades,
    championFranchise
  );

  let mostExpensive: { player: Player; price: number; team: any } | null = null;
  for (const p of activeParticipants) {
    for (const item of p.squad) {
      if (!mostExpensive || item.bought_for > mostExpensive.price) {
        mostExpensive = {
          player: item.player,
          price: item.bought_for,
          team: p.franchise,
        };
      }
    }
  }

  let biggestWar = allBids.sort((a, b) => b.bids_count - a.bids_count)[0];

  return {
    room_code: roomCode,
    completed_at: Date.now(),
    awards,
    leaderboard: squadLeaderboard,
    manager_leaderboard: managerLeaderboard,
    playing_xi_leaderboard: playingXILeaderboard,
    playing_xi_submissions: playingXISubmissions,
    trades: allTrades,
    total_players_auctioned: seasonRecap.players_sold,
    total_money_spent: seasonRecap.total_spent,
    most_expensive_player: mostExpensive,
    biggest_bidding_war:
      biggestWar && mostExpensive
        ? {
            player: biggestWar.player,
            bids_count: biggestWar.bids_count,
            final_price: biggestWar.final_price,
            team: mostExpensive.team,
          }
        : null,
    season_recap: seasonRecap,
  };
}
