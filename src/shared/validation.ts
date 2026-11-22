import { AuctionState, Participant, Player, RoomSettings } from './types';
import { MIN_RESERVE_PER_SLOT, formatCurrency, getMinAuctionParticipants } from './constants';

export interface BidValidationResult {
  valid: boolean;
  reason?: string;
  expectedAmount?: number;
}

/**
 * Validates whether a participant can place a bid of a given amount or increment.
 */
export function validateBid(
  participant: Participant,
  auctionState: AuctionState,
  settings: RoomSettings,
  requestedIncrementOrAmount: number,
  isExplicitAmount: boolean = false
): BidValidationResult {
  // 1. Auction Phase Check
  if (auctionState.phase === 'announcing') {
    return { valid: false, reason: 'Bidding has not started yet. Player announcement in progress.' };
  }
  if (auctionState.phase !== 'bidding') {
    return { valid: false, reason: 'Bidding is not currently active' };
  }

  // 2. Timer Check
  const now = Date.now();
  if (auctionState.timer_ends_at <= now) {
    return { valid: false, reason: 'Time has expired for this player' };
  }

  // 3. Player check
  const player = auctionState.current_player;
  if (!player) {
    return { valid: false, reason: 'No active player to bid on' };
  }

  // 4. Highest Bidder Check
  if (auctionState.current_bidder_id === participant.id) {
    return { valid: false, reason: "You are already the highest bidder" };
  }

  // 5. Withdrawal Check
  if (
    participant.has_withdrawn_current ||
    auctionState.withdrawn_participant_ids.includes(participant.id)
  ) {
    return { valid: false, reason: 'You have withdrawn from this player' };
  }

  // 6. Squad Capacity Check
  const currentSquadCount = participant.squad.length;
  if (currentSquadCount >= settings.squad_size) {
    return { valid: false, reason: 'Your squad is already full' };
  }

  // 7. Calculate Target Bid Amount
  let targetBidAmount: number;
  if (isExplicitAmount) {
    targetBidAmount = requestedIncrementOrAmount;
  } else {
    // If no bids yet on this player, first bid must be at base price
    if (!auctionState.current_bidder_id || auctionState.current_bid === 0) {
      targetBidAmount = player.base_price;
    } else {
      targetBidAmount = auctionState.current_bid + requestedIncrementOrAmount;
    }
  }

  // Check minimum bid amount
  if (auctionState.current_bid > 0 && targetBidAmount <= auctionState.current_bid) {
    return {
      valid: false,
      reason: `Bid must be higher than current bid of ${formatCurrency(auctionState.current_bid)}`,
      expectedAmount: targetBidAmount,
    };
  }

  // 8. Purse Check
  if (targetBidAmount > participant.purse_remaining) {
    return {
      valid: false,
      reason: `Not enough purse: you have ${formatCurrency(participant.purse_remaining)} remaining`,
    };
  }

  // 9. Reserve Rule Check:
  // After this bid, player would occupy 1 slot.
  // Remaining empty slots = squad_size - (currentSquadCount + 1)
  const remainingEmptySlots = settings.squad_size - (currentSquadCount + 1);
  const minReserveNeeded = remainingEmptySlots * MIN_RESERVE_PER_SLOT;
  const purseAfterBid = participant.purse_remaining - targetBidAmount;

  if (purseAfterBid < minReserveNeeded) {
    return {
      valid: false,
      reason: `Reserve rule: you must keep ${formatCurrency(minReserveNeeded)} for your remaining ${remainingEmptySlots} empty slot${remainingEmptySlots === 1 ? '' : 's'}`,
    };
  }

  return { valid: true, expectedAmount: targetBidAmount };
}

/**
 * Helper to check if a specific increment button should be disabled for a participant,
 * and provide the exact tooltip reason.
 */
export function getBidButtonStatus(
  participant: Participant | null,
  auctionState: AuctionState,
  settings: RoomSettings,
  increment: number
): { disabled: boolean; reason?: string; targetAmount: number } {
  if (!participant) {
    return { disabled: true, reason: 'Not in room', targetAmount: 0 };
  }

  const player = auctionState.current_player;
  if (!player) {
    return { disabled: true, reason: 'No active player', targetAmount: 0 };
  }

  let targetAmount: number;
  if (!auctionState.current_bidder_id || auctionState.current_bid === 0) {
    // First bid is at base price
    targetAmount = player.base_price;
  } else {
    targetAmount = auctionState.current_bid + increment;
  }

  const validation = validateBid(participant, auctionState, settings, targetAmount, true);

  return {
    disabled: !validation.valid,
    reason: validation.reason,
    targetAmount,
  };
}

export interface AuctionStartValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates whether an auction room is ready to be started by the host.
 * Checks:
 * 1. Host has selected a franchise.
 * 2. Active franchise count meets the minimum required participants.
 * 3. Selected player pool is non-empty and meets activeParticipants * squad_size.
 */
export function validateAuctionStart(
  hostParticipant: Participant | null | undefined,
  participants: Participant[],
  settings: RoomSettings,
  totalAvailablePlayersCount: number = 274,
  customMinParticipants?: number
): AuctionStartValidationResult {
  const hostHasTeam = Boolean(hostParticipant?.team_name || hostParticipant?.franchise);
  if (!hostParticipant || !hostHasTeam) {
    return {
      valid: false,
      reason: 'Host must set a team name to start the auction.',
    };
  }

  const minParticipants = customMinParticipants ?? getMinAuctionParticipants();
  const activeParticipants = participants.filter(
    p => !p.is_spectator && (p.team_name || p.franchise)
  );

  if (activeParticipants.length < minParticipants) {
    return {
      valid: false,
      reason: `At least ${minParticipants} participant${minParticipants > 1 ? 's' : ''} must set a team name to start the auction.`,
    };
  }

  const poolCount =
    settings.selected_player_ids && settings.selected_player_ids.length > 0
      ? settings.selected_player_ids.length
      : totalAvailablePlayersCount;

  const minPoolRequired = activeParticipants.length * settings.squad_size;
  if (poolCount < minPoolRequired || poolCount === 0) {
    return {
      valid: false,
      reason: `Pool requires at least ${minPoolRequired} players (${poolCount} selected).`,
    };
  }

  return { valid: true };
}


