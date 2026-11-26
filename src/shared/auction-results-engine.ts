import { BoughtPlayer, Player, SportType } from './types';
import { ALL_PLAYERS, getPlayerById } from './player-data';
import { ALL_PKL_PLAYERS, getPklPlayerById } from './pkl-player-data';
import { formatCurrency } from './constants';

export interface AuctionOverviewData {
  room_code: string;
  name: string;
  sport_type: 'IPL' | 'PKL';
  completed_at: string;
  total_managers: number;
  total_teams: number;
  total_pool: number;
  total_sold: number;
  total_unsold: number;
  total_bids: number;
  total_spent: number;
}

export interface TeamRankingData {
  rank: number;
  participant_id: string;
  team_name: string;
  team_short_code: string;
  team_color: string;
  manager_name: string;
  squad_rating: number;
  players_purchased: number;
  purse_spent: number;
  purse_remaining: number;
  squad_composition: Record<string, number>;
  squad: BoughtPlayer[];
  strengths: string[];
  weaknesses: string[];
}

export interface SquadComparisonData {
  team_name: string;
  team_short_code: string;
  team_color: string;
  manager_name: string;
  role_counts: Record<string, number>;
  squad_rating: number;
  purse_spent: number;
  purse_remaining: number;
  batting_rating?: number;
  bowling_rating?: number;
  allrounder_rating?: number;
  raid_rating?: number;
  defence_rating?: number;
}

export interface PurseManagementAward {
  id: string;
  title: string;
  subtitle: string;
  winner_team: string;
  winner_manager: string;
  team_color: string;
  metric_value: string;
  explanation: string;
}

export interface PlayerAwardData {
  award_name: string;
  category: string;
  player_id: string;
  player_name: string;
  player_image?: string | null;
  player_role: string;
  winning_team: string;
  winning_manager: string;
  price_paid: number;
  base_price?: number;
  performance_score?: number;
  highlight_metric: string;
  available: boolean;
}

export interface BiddingRecordsData {
  most_contested_player: {
    player_id: string;
    player_name: string;
    player_image?: string | null;
    role: string;
    bid_count: number;
    final_price: number;
    winning_team: string;
  } | null;
  highest_number_of_bids: number;
  highest_winning_bid: {
    player_name: string;
    amount: number;
    team: string;
  } | null;
  most_expensive_player: {
    player_id: string;
    player_name: string;
    player_image?: string | null;
    amount: number;
    team: string;
  } | null;
  biggest_bidding_competition: {
    player_name: string;
    unique_bidders_count: number;
    winning_team: string;
  } | null;
  total_bids_during_auction: number;
  average_bids_per_sold_player: number;
}

export interface PlayerPurchaseRecord {
  player_id: string;
  player_name: string;
  player_image: string | null;
  primary_role: string;
  status: 'SOLD' | 'UNSOLD' | 'WITHDRAWN';
  winning_team: string | null;
  winning_manager: string | null;
  final_price: number;
  total_bids: number;
  base_price?: number;
}

export interface FullAuctionLeaderboardData {
  overview: AuctionOverviewData;
  team_rankings: TeamRankingData[];
  squad_comparison: SquadComparisonData[];
  purse_awards: PurseManagementAward[];
  player_awards: PlayerAwardData[];
  bidding_records: BiddingRecordsData;
  player_purchase_history: PlayerPurchaseRecord[];
}

export function getPlayerPhotograph(playerId: string | undefined | null, sport: 'IPL' | 'PKL'): string | null {
  if (!playerId) {
    return sport === 'PKL' ? '/images/pkl-players/k-001.webp' : '/images/players/placeholder.webp';
  }
  if (sport === 'PKL' || playerId.startsWith('k-') || playerId.startsWith('pkl_')) {
    const canonicalId = playerId.startsWith('pkl_')
      ? `k-${playerId.replace('pkl_', '').padStart(3, '0')}`
      : playerId;
    return `/images/pkl-players/${canonicalId}.webp`;
  }
  const iplPlayer = getPlayerById(playerId);
  if (iplPlayer?.image_url) {
    return iplPlayer.image_url;
  }
  return `/images/players/${playerId}.webp`;
}

/**
 * Builds the comprehensive 7-section post-auction result data
 * from room metadata, snapshots, and bid events deterministically.
 */
export function buildFullAuctionResults(
  roomCode: string,
  roomName: string,
  sportType: 'IPL' | 'PKL',
  completedAt: number | string,
  rawParticipants: any[],
  rawLeaderboard: any[],
  rawAwards: any[],
  allCompletedBids: any[] = [],
  rawUnsoldPool: any[] = [],
  bidEvents: any[] = [],
  totalPoolCount = 0
): FullAuctionLeaderboardData {
  const compDate = new Date(completedAt).toISOString();
  const isPkl = sportType === 'PKL';

  // 1. Build Team Rankings (Section B)
  const team_rankings: TeamRankingData[] = [];
  const squad_comparison: SquadComparisonData[] = [];

  const participantsList = Array.isArray(rawParticipants) ? rawParticipants : [];
  const leaderboardList = Array.isArray(rawLeaderboard) && rawLeaderboard.length > 0
    ? rawLeaderboard
    : participantsList.map((p, idx) => ({
        rank: idx + 1,
        participant_id: p.id || p.session_id || `part_${idx}`,
        display_name: p.display_name || p.name || 'Manager',
        team_name: p.team_name || p.franchise?.name || 'Team',
        team_short_code: p.team_short_code || p.franchise?.short_code || 'TM',
        team_color: p.team_color || p.franchise?.color || '#D6B65D',
        total_score: p.total_score || 85,
        squad: p.squad || [],
        total_spent: p.total_spent || (p.squad ? p.squad.reduce((s: number, b: any) => s + (b.bought_for || 0), 0) : 0),
        purse_remaining: p.purse_remaining ?? 0,
        strengths: p.strengths || [],
        weaknesses: p.weaknesses || [],
      }));

  let totalMoneySpent = 0;
  let totalPlayersSold = 0;

  leaderboardList.forEach((team: any, idx: number) => {
    let squad: BoughtPlayer[] = Array.isArray(team.squad) ? [...team.squad] : [];
    if (squad.length === 0 && Array.isArray(allCompletedBids)) {
      allCompletedBids.forEach(cb => {
        const teamMatch =
          cb.winning_team === team.team_name ||
          cb.winning_team === team.team_id ||
          cb.buyer_team === team.team_name ||
          cb.buyer_team === team.team_id;
        if (teamMatch) {
          const pid = cb.player_id || cb.player?.id;
          const fallbackPlayer = isPkl ? getPklPlayerById(pid) : getPlayerById(pid);
          const p = cb.player || fallbackPlayer || {
            id: pid,
            name: cb.player_name || pid,
            role: cb.role || 'BAT',
            base_price: cb.base_price || 2000000,
          };
          squad.push({
            player_id: pid,
            player: p as Player,
            bought_for: Number(cb.winning_bid || cb.price || cb.sold_price || 0),
            timestamp: Date.now(),
          });
        }
      });
    }

    const roleComposition: Record<string, number> = {};

    squad.forEach(item => {
      const role = item.player?.role || 'Unknown';
      roleComposition[role] = (roleComposition[role] || 0) + 1;
    });

    const spent = Number(team.total_spent || squad.reduce((sum, item) => sum + (item.bought_for || 0), 0));
    totalMoneySpent += spent;
    totalPlayersSold += squad.length;

    const rankNumber = team.rank || idx + 1;
    const teamName = team.team_name || team.franchise?.name || 'Team';
    const shortCode = team.team_short_code || team.franchise?.short_code || teamName.substring(0, 3).toUpperCase();
    const color = team.team_color || team.franchise?.color || '#D6B65D';
    const managerName = team.display_name || team.name || 'Manager';
    const rating = Math.round((Number(team.total_score) || 85) * 10) / 10;

    team_rankings.push({
      rank: rankNumber,
      participant_id: team.participant_id || team.id || `part_${idx}`,
      team_name: teamName,
      team_short_code: shortCode,
      team_color: color,
      manager_name: managerName,
      squad_rating: rating,
      players_purchased: squad.length,
      purse_spent: spent,
      purse_remaining: Number(team.purse_remaining ?? 0),
      squad_composition: roleComposition,
      squad,
      strengths: Array.isArray(team.strengths) ? team.strengths : [],
      weaknesses: Array.isArray(team.weaknesses) ? team.weaknesses : [],
    });

    // Section C Comparison Data
    squad_comparison.push({
      team_name: teamName,
      team_short_code: shortCode,
      team_color: color,
      manager_name: managerName,
      role_counts: roleComposition,
      squad_rating: rating,
      purse_spent: spent,
      purse_remaining: Number(team.purse_remaining ?? 0),
      batting_rating: Number(team.batting_strength_score) || undefined,
      bowling_rating: Number(team.bowling_strength_score) || undefined,
      allrounder_rating: Number(team.allrounder_strength_score) || undefined,
      raid_rating: isPkl ? Math.round((roleComposition['Raider'] || 0) * 18.5) : undefined,
      defence_rating: isPkl ? Math.round((roleComposition['Defender'] || 0) * 17.2) : undefined,
    });
  });

  // Sort rankings by rank
  team_rankings.sort((a, b) => a.rank - b.rank);
  squad_comparison.sort((a, b) => a.squad_rating - b.squad_rating ? b.squad_rating - a.squad_rating : a.purse_spent - b.purse_spent);

  // 2. Build Bidding Records (Section F)
  const bidsMap = new Map<string, number>();
  const biddersPerPlayer = new Map<string, Set<string>>();

  // Extract from bidEvents if present
  if (Array.isArray(bidEvents) && bidEvents.length > 0) {
    bidEvents.forEach((b: any) => {
      const pid = b.player_id;
      bidsMap.set(pid, (bidsMap.get(pid) || 0) + 1);
      if (!biddersPerPlayer.has(pid)) {
        biddersPerPlayer.set(pid, new Set());
      }
      biddersPerPlayer.get(pid)!.add(b.participant_id);
    });
  }

  // Also ingest allCompletedBids
  const completedBidsList = Array.isArray(allCompletedBids) ? allCompletedBids : [];
  completedBidsList.forEach(cb => {
    const pid = cb.player_id || cb.player?.id;
    if (pid && cb.bids_count) {
      const existing = bidsMap.get(pid) || 0;
      if (cb.bids_count > existing) {
        bidsMap.set(pid, cb.bids_count);
      }
    }
  });

  // Calculate most contested player
  let mostContestedPlayer: BiddingRecordsData['most_contested_player'] = null;
  let highestBidCount = 0;
  let mostExpensivePlayer: BiddingRecordsData['most_expensive_player'] = null;
  let highestPrice = 0;

  // Scan all bought squad items for accurate purchase metrics
  const allSoldMap = new Map<string, { player: Player; price: number; team: string; manager: string }>();

  team_rankings.forEach(t => {
    t.squad.forEach(item => {
      const p = item.player;
      if (!p) return;
      allSoldMap.set(p.id, {
        player: p,
        price: item.bought_for,
        team: t.team_name,
        manager: t.manager_name,
      });

      if (item.bought_for > highestPrice) {
        highestPrice = item.bought_for;
        mostExpensivePlayer = {
          player_id: p.id,
          player_name: p.name,
          player_image: getPlayerPhotograph(p.id, sportType),
          amount: item.bought_for,
          team: t.team_name,
        };
      }

      const bCount = bidsMap.get(p.id) || (item.bought_for > (p.base_price || 0) ? Math.max(1, Math.round((item.bought_for - (p.base_price || 0)) / 500000) + 1) : 1);
      if (bCount > highestBidCount) {
        highestBidCount = bCount;
        mostContestedPlayer = {
          player_id: p.id,
          player_name: p.name,
          player_image: getPlayerPhotograph(p.id, sportType),
          role: p.role,
          bid_count: bCount,
          final_price: item.bought_for,
          winning_team: t.team_name,
        };
      }
    });
  });

  // Calculate biggest bidding competition (unique bidders)
  let biggestCompetition: BiddingRecordsData['biggest_bidding_competition'] = null;
  let maxUniqueBidders = 0;

  biddersPerPlayer.forEach((biddersSet, pid) => {
    if (biddersSet.size > maxUniqueBidders) {
      maxUniqueBidders = biddersSet.size;
      const soldInfo = allSoldMap.get(pid);
      if (soldInfo) {
        biggestCompetition = {
          player_name: soldInfo.player.name,
          unique_bidders_count: maxUniqueBidders,
          winning_team: soldInfo.team,
        };
      }
    }
  });

  const totalBidsRecorded = Array.from(bidsMap.values()).reduce((sum, count) => sum + count, 0) || Math.max(totalPlayersSold * 2, bidEvents.length);
  const avgBids = totalPlayersSold > 0 ? Math.round((totalBidsRecorded / totalPlayersSold) * 10) / 10 : 0;

  const bidding_records: BiddingRecordsData = {
    most_contested_player: mostContestedPlayer,
    highest_number_of_bids: highestBidCount,
    highest_winning_bid: mostExpensivePlayer ? {
      player_name: (mostExpensivePlayer as any).player_name,
      amount: (mostExpensivePlayer as any).amount,
      team: (mostExpensivePlayer as any).team,
    } : null,
    most_expensive_player: mostExpensivePlayer,
    biggest_bidding_competition: biggestCompetition,
    total_bids_during_auction: totalBidsRecorded,
    average_bids_per_sold_player: avgBids,
  };

  // 3. Build Purse Management Awards (Section D)
  const purse_awards: PurseManagementAward[] = [];

  if (team_rankings.length > 0) {
    // 1. Best Purse Management: optimal balance of squad score and budget conservation
    const sortedByBalance = [...team_rankings].sort((a, b) => {
      const scoreA = a.squad_rating + (a.purse_remaining / 10000000);
      const scoreB = b.squad_rating + (b.purse_remaining / 10000000);
      return scoreB - scoreA;
    });
    const bestManager = sortedByBalance[0];
    purse_awards.push({
      id: 'best_purse_management',
      title: 'Best Purse Management',
      subtitle: 'Optimal Squad Rating & Financial Prudence',
      winner_team: bestManager.team_name,
      winner_manager: bestManager.manager_name,
      team_color: bestManager.team_color,
      metric_value: `Rating: ${bestManager.squad_rating} · Rem: ${formatCurrency(bestManager.purse_remaining)}`,
      explanation: 'Crafted a balanced championship squad while preserving critical purse reserves throughout all bidding rounds.',
    });

    // 2. Best Budget Utilization: highest % spent with full squad
    const sortedByUtilization = [...team_rankings].sort((a, b) => b.purse_spent - a.purse_spent);
    const topUtilizer = sortedByUtilization[0];
    purse_awards.push({
      id: 'best_budget_utilization',
      title: 'Best Budget Utilization',
      subtitle: 'Maximum Capital Deployment',
      winner_team: topUtilizer.team_name,
      winner_manager: topUtilizer.manager_name,
      team_color: topUtilizer.team_color,
      metric_value: `Spent: ${formatCurrency(topUtilizer.purse_spent)} (${topUtilizer.players_purchased} Players)`,
      explanation: 'Effectively deployed maximum auction capital to secure premier target talent without leaving excess unspent purse.',
    });

    // 3. Most Economical Squad: lowest average cost per player
    const fullSquads = team_rankings.filter(t => t.players_purchased >= 5);
    const sortedByEconomy = (fullSquads.length > 0 ? fullSquads : team_rankings).sort((a, b) => {
      const avgA = a.purse_spent / Math.max(1, a.players_purchased);
      const avgB = b.purse_spent / Math.max(1, b.players_purchased);
      return avgA - avgB;
    });
    const mostEconomical = sortedByEconomy[0];
    const avgCost = Math.round(mostEconomical.purse_spent / Math.max(1, mostEconomical.players_purchased));
    purse_awards.push({
      id: 'most_economical_squad',
      title: 'Most Economical Squad',
      subtitle: 'Lowest Average Acquisition Cost',
      winner_team: mostEconomical.team_name,
      winner_manager: mostEconomical.manager_name,
      team_color: mostEconomical.team_color,
      metric_value: `Avg: ${formatCurrency(avgCost)} / Player`,
      explanation: 'Constructed an entire competitive lineup with remarkable price discipline and smart value acquisitions.',
    });

    // 4. Highest Remaining Purse
    const sortedByRemaining = [...team_rankings].sort((a, b) => b.purse_remaining - a.purse_remaining);
    const highestRemaining = sortedByRemaining[0];
    purse_awards.push({
      id: 'highest_remaining_purse',
      title: 'Highest Remaining Purse',
      subtitle: 'Capital Surplus Leader',
      winner_team: highestRemaining.team_name,
      winner_manager: highestRemaining.manager_name,
      team_color: highestRemaining.team_color,
      metric_value: formatCurrency(highestRemaining.purse_remaining),
      explanation: 'Maintained the highest financial liquidity and emergency purse cushion at auction conclusion.',
    });
  }

  // 4. Build Player Awards (Section E)
  const player_awards: PlayerAwardData[] = [];
  const soldPlayersList = Array.from(allSoldMap.values());

  if (soldPlayersList.length > 0) {
    // 1. Most Expensive Player
    const mostExpensive = [...soldPlayersList].sort((a, b) => b.price - a.price)[0];
    player_awards.push({
      award_name: 'Most Expensive Player',
      category: 'Financial Milestone',
      player_id: mostExpensive.player.id,
      player_name: mostExpensive.player.name,
      player_image: getPlayerPhotograph(mostExpensive.player.id, sportType),
      player_role: mostExpensive.player.role,
      winning_team: mostExpensive.team,
      winning_manager: mostExpensive.manager,
      price_paid: mostExpensive.price,
      base_price: mostExpensive.player.base_price,
      highlight_metric: formatCurrency(mostExpensive.price),
      available: true,
    });

    // 2. Biggest Bargain: Sold at base price or lowest relative price
    const bargain = [...soldPlayersList]
      .filter(item => (item.player.tier === 'A' || item.player.tier === 'B' || item.player.category === 'Marquee'))
      .sort((a, b) => a.price - b.price)[0] || soldPlayersList[soldPlayersList.length - 1];

    if (bargain) {
      player_awards.push({
        award_name: 'Biggest Bargain',
        category: 'Value Acquisition',
        player_id: bargain.player.id,
        player_name: bargain.player.name,
        player_image: getPlayerPhotograph(bargain.player.id, sportType),
        player_role: bargain.player.role,
        winning_team: bargain.team,
        winning_manager: bargain.manager,
        price_paid: bargain.price,
        base_price: bargain.player.base_price,
        highlight_metric: `${formatCurrency(bargain.price)} (Base: ${formatCurrency(bargain.player.base_price || 0)})`,
        available: true,
      });
    }

    // 3. Highest Base-to-Sold-Price Increase
    const sortedByEscalation = [...soldPlayersList]
      .map(item => ({
        ...item,
        increase: item.price - (item.player.base_price || 0),
        multiplier: (item.player.base_price && item.player.base_price > 0) ? (item.price / item.player.base_price) : 1,
      }))
      .sort((a, b) => b.increase - a.increase);

    const biggestJump = sortedByEscalation[0];
    if (biggestJump && biggestJump.increase > 0) {
      player_awards.push({
        award_name: 'Highest Price Escalation',
        category: 'Bidding War Champion',
        player_id: biggestJump.player.id,
        player_name: biggestJump.player.name,
        player_image: getPlayerPhotograph(biggestJump.player.id, sportType),
        player_role: biggestJump.player.role,
        winning_team: biggestJump.team,
        winning_manager: biggestJump.manager,
        price_paid: biggestJump.price,
        base_price: biggestJump.player.base_price,
        highlight_metric: `+${formatCurrency(biggestJump.increase)} (${Math.round(biggestJump.multiplier * 10) / 10}x Base)`,
        available: true,
      });
    }

    // 4. Most Valuable Player (MVP)
    // For IPL, pick marquee or proven player with top ranking; for PKL, pick top raider/allrounder
    const mvpCandidate = isPkl
      ? ([...soldPlayersList].find(item => item.player.role === 'All-Rounder' || item.player.role === 'Raider') || soldPlayersList[0])
      : ([...soldPlayersList].find(item => item.player.category === 'Marquee' || item.player.role === 'AR') || soldPlayersList[0]);

    if (mvpCandidate) {
      player_awards.push({
        award_name: 'Tournament MVP',
        category: isPkl ? 'Kabaddi Match Winner' : 'Cricket Match Winner',
        player_id: mvpCandidate.player.id,
        player_name: mvpCandidate.player.name,
        player_image: getPlayerPhotograph(mvpCandidate.player.id, sportType),
        player_role: mvpCandidate.player.role,
        winning_team: mvpCandidate.team,
        winning_manager: mvpCandidate.manager,
        price_paid: mvpCandidate.price,
        base_price: mvpCandidate.player.base_price,
        highlight_metric: `Star Impact (${mvpCandidate.player.role})`,
        available: true,
      });
    }
  }

  // 5. Build Complete Player Purchase History (Section G)
  const player_purchase_history: PlayerPurchaseRecord[] = [];

  // Add all sold players
  soldPlayersList.forEach(item => {
    const p = item.player;
    player_purchase_history.push({
      player_id: p.id,
      player_name: p.name,
      player_image: getPlayerPhotograph(p.id, sportType),
      primary_role: p.role,
      status: 'SOLD',
      winning_team: item.team,
      winning_manager: item.manager,
      final_price: item.price,
      total_bids: bidsMap.get(p.id) || (item.price > (p.base_price || 0) ? Math.max(1, Math.round((item.price - (p.base_price || 0)) / 500000) + 1) : 1),
      base_price: p.base_price,
    });
  });

  // Add all unsold players
  const unsoldList = Array.isArray(rawUnsoldPool) ? rawUnsoldPool : [];
  unsoldList.forEach((p: any) => {
    const pid = typeof p === 'string' ? p : p?.id;
    if (pid && !allSoldMap.has(pid)) {
      const fallbackPlayer = isPkl ? getPklPlayerById(pid) : getPlayerById(pid);
      player_purchase_history.push({
        player_id: pid,
        player_name: (typeof p === 'object' && p?.name) ? p.name : (fallbackPlayer?.name || pid),
        player_image: getPlayerPhotograph(pid, sportType),
        primary_role: (typeof p === 'object' && p?.role) ? p.role : (fallbackPlayer?.role || 'BAT'),
        status: 'UNSOLD',
        winning_team: null,
        winning_manager: null,
        final_price: 0,
        total_bids: bidsMap.get(pid) || 0,
        base_price: (typeof p === 'object' && p?.base_price) ? p.base_price : (fallbackPlayer?.base_price || 2000000),
      });
    }
  });

  const totalPool = Math.max(totalPoolCount, player_purchase_history.length, isPkl ? 235 : 274);
  const totalUnsold = Math.max(unsoldList.length, player_purchase_history.filter(p => p.status === 'UNSOLD').length);

  // 6. Build Overview (Section A)
  const overview: AuctionOverviewData = {
    room_code: roomCode,
    name: roomName,
    sport_type: sportType,
    completed_at: compDate,
    total_managers: team_rankings.length,
    total_teams: team_rankings.length,
    total_pool: totalPool,
    total_sold: totalPlayersSold,
    total_unsold: totalUnsold,
    total_bids: totalBidsRecorded,
    total_spent: totalMoneySpent,
  };

  return {
    overview,
    team_rankings,
    squad_comparison,
    purse_awards,
    player_awards,
    bidding_records,
    player_purchase_history,
  };
}
