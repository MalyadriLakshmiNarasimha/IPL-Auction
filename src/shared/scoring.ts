import { AuctionResults, Award, BoughtPlayer, Participant, Player, RoomSettings, TeamScoreBreakdown } from './types';
import { formatCurrency } from './constants';

export function normalizeRoleToCode(role: string): 'BAT' | 'BOWL' | 'AR' | 'WK' {
  const r = (role || '').toUpperCase();
  if (r.startsWith('BAT')) return 'BAT';
  if (r.startsWith('BOWL')) return 'BOWL';
  if (r.startsWith('ALL') || r === 'AR') return 'AR';
  if (r.startsWith('WICKET') || r === 'WK') return 'WK';
  return 'BAT';
}

/**
 * Calculates a squad's score out of 100 based on:
 * - 40% Role Balance
 * - 30% Squad Completeness
 * - 30% Value for Money
 */
export function calculateTeamScore(
  participant: Participant,
  settings: RoomSettings
): {
  total_score: number;
  role_balance_score: number;
  completeness_score: number;
  value_score: number;
} {
  const squad = participant.squad;
  const squadSize = settings.squad_size;
  const scale = squadSize / 15;

  // 1. Role Balance (Max 40 points)
  // Target ranges scaled to squad size:
  // BAT: 4-6 (scale)
  // BOWL: 4-6 (scale)
  // AR: 2-4 (scale)
  // WK: 1-2 (scale)
  const counts = { BAT: 0, BOWL: 0, AR: 0, WK: 0 };
  for (const item of squad) {
    const code = normalizeRoleToCode(item.player.role);
    if (counts[code] !== undefined) {
      counts[code]++;
    }
  }

  const targetBAT = [Math.round(4 * scale), Math.round(6 * scale)];
  const targetBOWL = [Math.round(4 * scale), Math.round(6 * scale)];
  const targetAR = [Math.round(2 * scale), Math.round(4 * scale)];
  const targetWK = [Math.max(1, Math.round(1 * scale)), Math.round(2 * scale)];

  function evaluateRole(actual: number, [min, max]: [number, number], maxPoints: number): number {
    if (actual >= min && actual <= max) return maxPoints;
    if (actual < min) {
      const deficit = min - actual;
      return Math.max(0, maxPoints - deficit * (maxPoints / min));
    } else {
      const excess = actual - max;
      return Math.max(0, maxPoints - excess * (maxPoints / 2));
    }
  }

  const batScore = evaluateRole(counts.BAT, targetBAT as [number, number], 10);
  const bowlScore = evaluateRole(counts.BOWL, targetBOWL as [number, number], 10);
  const arScore = evaluateRole(counts.AR, targetAR as [number, number], 10);
  const wkScore = evaluateRole(counts.WK, targetWK as [number, number], 10);
  const role_balance_score = Math.min(40, Math.max(0, batScore + bowlScore + arScore + wkScore));

  // 2. Squad Completeness (Max 30 points)
  const completenessFraction = Math.min(1, squad.length / squadSize);
  const completeness_score = completenessFraction * 30;

  // 3. Value for Money (Max 30 points)
  // Evaluates tier composition vs price paid
  // Tier A expected value ~ 10-15 Cr, Tier B ~ 4-8 Cr, Tier C ~ 50L-2 Cr
  let value_score = 0;
  if (squad.length > 0) {
    let valueSum = 0;
    for (const item of squad) {
      const base = item.player.base_price;
      const paid = item.bought_for;
      const tier = item.player.tier;

      // Multiplier benchmark
      let benchmark = base;
      if (tier === 'A') benchmark = Math.max(base, 10_00_00_000);
      else if (tier === 'B') benchmark = Math.max(base, 4_00_00_000);
      else benchmark = Math.max(base, 1_00_00_000);

      // Ratio of benchmark to paid
      const ratio = benchmark / Math.max(paid, 20_00_000);
      valueSum += Math.min(1.5, Math.max(0.5, ratio));
    }
    const avgRatio = valueSum / squad.length; // Normalized around ~1.0
    value_score = Math.min(30, Math.max(5, avgRatio * 20));
  } else {
    value_score = 0;
  }

  const total_score = Math.round(role_balance_score + completeness_score + value_score);

  return {
    total_score: Math.min(100, Math.max(0, total_score)),
    role_balance_score: Math.round(role_balance_score),
    completeness_score: Math.round(completeness_score),
    value_score: Math.round(value_score),
  };
}

export function computeAuctionResults(
  roomCode: string,
  participants: Participant[],
  settings: RoomSettings,
  allBids: { player_id: string; player: Player; bids_count: number; final_price: number; winner_id: string }[]
): AuctionResults {
  // Compute leaderboard
  const scoredParticipants: TeamScoreBreakdown[] = participants
    .filter(p => p.franchise)
    .map(p => {
      const scores = calculateTeamScore(p, settings);
      const totalSpent = p.squad.reduce((sum, item) => sum + item.bought_for, 0);

      return {
        participant_id: p.id,
        display_name: p.display_name,
        franchise: p.franchise!,
        total_score: scores.total_score,
        role_balance_score: scores.role_balance_score,
        completeness_score: scores.completeness_score,
        value_score: scores.value_score,
        players_count: p.squad.length,
        total_spent: totalSpent,
        purse_remaining: p.purse_remaining,
        squad: p.squad,
        rank: 0,
      };
    });

  // Sort descending by total score, then purse remaining
  scoredParticipants.sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    return b.purse_remaining - a.purse_remaining;
  });

  scoredParticipants.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Compute Awards
  const awards: Award[] = [];

  // 1. Best Value Pick (Biggest Tier A / B steal relative to price)
  let bestValuePlayer: { item: BoughtPlayer; owner: Participant } | null = null;
  let bestRatio = -1;

  for (const p of participants) {
    for (const item of p.squad) {
      if (item.player.tier === 'A' || item.player.tier === 'B') {
        const ratio = item.player.base_price / Math.max(item.bought_for, 20_00_000);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestValuePlayer = { item, owner: p };
        }
      }
    }
  }

  if (bestValuePlayer && bestValuePlayer.owner.franchise) {
    awards.push({
      id: 'best_value',
      title: 'Best Value Pick',
      description: 'Secured top talent at near base price',
      winner_name: `${bestValuePlayer.owner.display_name} (${bestValuePlayer.item.player.name})`,
      franchise_short_code: bestValuePlayer.owner.franchise.short_code,
      franchise_color: bestValuePlayer.owner.franchise.color,
      value_highlight: formatCurrency(bestValuePlayer.item.bought_for),
    });
  }

  // 2. Most Expensive Player
  let highestBidPlayer: { player: Player; price: number; team: Participant } | null = null;
  for (const p of participants) {
    for (const item of p.squad) {
      if (!highestBidPlayer || item.bought_for > highestBidPlayer.price) {
        highestBidPlayer = {
          player: item.player,
          price: item.bought_for,
          team: p,
        };
      }
    }
  }

  if (highestBidPlayer && highestBidPlayer.team.franchise) {
    awards.push({
      id: 'most_expensive',
      title: 'Most Expensive Player',
      description: 'The marquee blockbuster signing of the night',
      winner_name: `${highestBidPlayer.player.name} -> ${highestBidPlayer.team.franchise.name}`,
      franchise_short_code: highestBidPlayer.team.franchise.short_code,
      franchise_color: highestBidPlayer.team.franchise.color,
      value_highlight: formatCurrency(highestBidPlayer.price),
    });
  }

  // 3. Biggest Bidding War
  let biggestWar = allBids.sort((a, b) => b.bids_count - a.bids_count)[0];
  if (biggestWar && biggestWar.bids_count > 1) {
    const winner = participants.find(p => p.id === biggestWar.winner_id);
    if (winner && winner.franchise) {
      awards.push({
        id: 'bidding_war',
        title: 'Biggest Bidding War',
        description: 'Most fiercely contested player on the auction table',
        winner_name: `${biggestWar.player.name} (${biggestWar.bids_count} bids)`,
        franchise_short_code: winner.franchise.short_code,
        franchise_color: winner.franchise.color,
        value_highlight: `${biggestWar.bids_count} bids`,
      });
    }
  }

  // 4. Budget Master (Most purse left with >= 75% squad completeness)
  const fullishSquads = [...scoredParticipants].filter(p => p.players_count >= Math.floor(settings.squad_size * 0.75));
  fullishSquads.sort((a, b) => b.purse_remaining - a.purse_remaining);
  if (fullishSquads.length > 0) {
    const bm = fullishSquads[0];
    awards.push({
      id: 'budget_master',
      title: 'Budget Master',
      description: 'Preserved maximum purse while building a competitive squad',
      winner_name: bm.display_name,
      franchise_short_code: bm.franchise.short_code,
      franchise_color: bm.franchise.color,
      value_highlight: `${formatCurrency(bm.purse_remaining)} left`,
    });
  }

  // 5. Role Balancer (Highest role balance score)
  const balanced = [...scoredParticipants].sort((a, b) => b.role_balance_score - a.role_balance_score);
  if (balanced.length > 0) {
    const rb = balanced[0];
    awards.push({
      id: 'role_balancer',
      title: 'Role Balancer',
      description: 'Flawlessly distributed squad between BAT, BOWL, AR & WK',
      winner_name: rb.display_name,
      franchise_short_code: rb.franchise.short_code,
      franchise_color: rb.franchise.color,
      value_highlight: `${rb.role_balance_score} / 40 pts`,
    });
  }

  const totalPlayers = participants.reduce((sum, p) => sum + p.squad.length, 0);
  const totalSpent = participants.reduce((sum, p) => sum + p.squad.reduce((s, i) => s + i.bought_for, 0), 0);

  return {
    room_code: roomCode,
    completed_at: Date.now(),
    awards,
    leaderboard: scoredParticipants,
    total_players_auctioned: totalPlayers,
    total_money_spent: totalSpent,
    most_expensive_player: highestBidPlayer && highestBidPlayer.team.franchise ? {
      player: highestBidPlayer.player,
      price: highestBidPlayer.price,
      team: highestBidPlayer.team.franchise,
    } : null,
    biggest_bidding_war: biggestWar && highestBidPlayer?.team.franchise ? {
      player: biggestWar.player,
      bids_count: biggestWar.bids_count,
      final_price: biggestWar.final_price,
      team: highestBidPlayer.team.franchise,
    } : null,
  };
}
