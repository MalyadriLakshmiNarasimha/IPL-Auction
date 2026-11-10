import { Player } from './types';

export type PlayerAuctionCategory = 'BATTERS' | 'BOWLERS' | 'ALL-ROUNDERS' | 'WICKET KEEPERS';

export const PLAYER_CATEGORY_ORDER: readonly PlayerAuctionCategory[] = [
  'BATTERS',
  'BOWLERS',
  'ALL-ROUNDERS',
  'WICKET KEEPERS',
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
 * 1. Collects all selected players across every IPL team without franchise grouping.
 * 2. Classifies each player into one of the 4 categories:
 *    - BATTERS
 *    - BOWLERS
 *    - ALL-ROUNDERS
 *    - WICKET KEEPERS
 * 3. Randomly shuffles players within each category using an unbiased Fisher-Yates shuffle.
 * 4. Concatenates the shuffled categories in the strict fixed category sequence:
 *    BATTERS -> BOWLERS -> ALL-ROUNDERS -> WICKET KEEPERS.
 * 5. Guarantees that each selected player appears exactly once.
 */
export function generateCategoryWiseSequence(players: readonly Player[]): Player[] {
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

