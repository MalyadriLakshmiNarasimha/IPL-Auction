import { Player, SportType } from './types';

export type PlayerAuctionCategory = 'BATTERS' | 'BOWLERS' | 'ALL-ROUNDERS' | 'WICKET KEEPERS';
export type PklAuctionCategory = 'RAIDERS' | 'DEFENDERS' | 'ALL-ROUNDERS';

export const PLAYER_CATEGORY_ORDER: readonly PlayerAuctionCategory[] = [
  'BATTERS',
  'BOWLERS',
  'ALL-ROUNDERS',
  'WICKET KEEPERS',
] as const;

export const PKL_CATEGORY_ORDER: readonly PklAuctionCategory[] = [
  'RAIDERS',
  'DEFENDERS',
  'ALL-ROUNDERS',
] as const;

/**
 * Classifies any player into one of the 4 authoritative IPL auction categories:
 * 1. BATTERS
 * 2. BOWLERS
 * 3. ALL-ROUNDERS
 * 4. WICKET KEEPERS
 */
export function getPlayerCategory(player: { role?: string; name?: string }): PlayerAuctionCategory {
  const r = (player.role || '').toLowerCase();

  // Wicketkeepers take precedence over general batters
  if (r.includes('wicket') || r.includes('wk') || r.includes('keeper')) {
    return 'WICKET KEEPERS';
  }

  // All-Rounders
  if (r.includes('all') || r === 'ar') {
    return 'ALL-ROUNDERS';
  }

  // Bowlers
  if (r.includes('bowl')) {
    return 'BOWLERS';
  }

  // Default to Batters (pure batters, batsmen, etc.)
  return 'BATTERS';
}

/**
 * Classifies any PKL player into one of the 3 authoritative PKL auction categories:
 * 1. RAIDERS
 * 2. DEFENDERS
 * 3. ALL-ROUNDERS
 */
export function getPklPlayerCategory(player: { role?: string; position_detail?: string; name?: string }): PklAuctionCategory {
  const r = (player.role || '').toLowerCase();
  const pos = (player.position_detail || '').toLowerCase();

  if (r.includes('all') || pos.includes('all') || r === 'ar') {
    return 'ALL-ROUNDERS';
  }
  if (r.includes('def') || pos.includes('corner') || pos.includes('cover')) {
    return 'DEFENDERS';
  }
  return 'RAIDERS';
}

/**
 * Performs an unbiased Fisher-Yates (Knuth) in-place shuffle on an array copy.
 * Ensures uniform distribution without biasing positions.
 */
export function fisherYatesShuffle<T>(array: readonly T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Generates the authoritative randomized category-wise player auction sequence:
 *
 * For IPL:
 * 1. BATTERS -> 2. BOWLERS -> 3. ALL-ROUNDERS -> 4. WICKET KEEPERS
 *
 * For PKL:
 * 1. RAIDERS -> 2. DEFENDERS -> 3. ALL-ROUNDERS
 */
export function generateCategoryWiseSequence(
  players: readonly Player[],
  sportType: SportType = 'IPL'
): Player[] {
  if (sportType === 'PKL') {
    const raiders: Player[] = [];
    const defenders: Player[] = [];
    const allRounders: Player[] = [];

    for (const player of players) {
      const category = getPklPlayerCategory(player);
      switch (category) {
        case 'RAIDERS':
          raiders.push(player);
          break;
        case 'DEFENDERS':
          defenders.push(player);
          break;
        case 'ALL-ROUNDERS':
          allRounders.push(player);
          break;
      }
    }

    const shuffledRaiders = fisherYatesShuffle(raiders);
    const shuffledDefenders = fisherYatesShuffle(defenders);
    const shuffledAllRounders = fisherYatesShuffle(allRounders);

    return [
      ...shuffledRaiders,
      ...shuffledDefenders,
      ...shuffledAllRounders,
    ];
  }

  const batters: Player[] = [];
  const bowlers: Player[] = [];
  const allRounders: Player[] = [];
  const wicketKeepers: Player[] = [];

  // Group by category regardless of franchise
  for (const player of players) {
    const category = getPlayerCategory(player);
    switch (category) {
      case 'BATTERS':
        batters.push(player);
        break;
      case 'BOWLERS':
        bowlers.push(player);
        break;
      case 'ALL-ROUNDERS':
        allRounders.push(player);
        break;
      case 'WICKET KEEPERS':
        wicketKeepers.push(player);
        break;
    }
  }

  // Unbiased Fisher-Yates shuffle within each category
  const shuffledBatters = fisherYatesShuffle(batters);
  const shuffledBowlers = fisherYatesShuffle(bowlers);
  const shuffledAllRounders = fisherYatesShuffle(allRounders);
  const shuffledWicketKeepers = fisherYatesShuffle(wicketKeepers);

  // Concatenate in fixed category order:
  // 1. BATTERS
  // 2. BOWLERS
  // 3. ALL-ROUNDERS
  // 4. WICKET KEEPERS
  return [
    ...shuffledBatters,
    ...shuffledBowlers,
    ...shuffledAllRounders,
    ...shuffledWicketKeepers,
  ];
}

/**
 * Validates that an auction sequence strictly adheres to:
 * - Fixed category sequence (BATTERS -> BOWLERS -> ALL-ROUNDERS -> WICKET KEEPERS).
 * - No player appearing twice.
 * - All selected players present.
 */
export function validateCategorySequence(
  sequence: readonly Player[],
  originalPlayers: readonly Player[]
): { valid: boolean; reason?: string } {
  if (sequence.length !== originalPlayers.length) {
    return {
      valid: false,
      reason: `Length mismatch: sequence has ${sequence.length} players, expected ${originalPlayers.length}.`,
    };
  }

  const seenIds = new Set<string>();
  for (const player of sequence) {
    if (seenIds.has(player.id)) {
      return { valid: false, reason: `Duplicate player found in sequence: ${player.name} (${player.id}).` };
    }
    seenIds.add(player.id);
  }

  for (const original of originalPlayers) {
    if (!seenIds.has(original.id)) {
      return { valid: false, reason: `Selected player missing from sequence: ${original.name} (${original.id}).` };
    }
  }

  // Verify category transitions are strictly monotonic according to PLAYER_CATEGORY_ORDER
  let currentCategoryIndex = 0;
  for (const player of sequence) {
    const playerCategory = getPlayerCategory(player);
    const categoryIndex = PLAYER_CATEGORY_ORDER.indexOf(playerCategory);

    if (categoryIndex < currentCategoryIndex) {
      return {
        valid: false,
        reason: `Out-of-order category: player ${player.name} (${playerCategory}) appeared after a player in ${PLAYER_CATEGORY_ORDER[currentCategoryIndex]}.`,
      };
    }
    currentCategoryIndex = categoryIndex;
  }

  return { valid: true };
}

