/**
 * Voice Announcement Templates for IPL Auction
 *
 * Exclusively supports the two required voice events:
 * 1. Player Introduction
 *    Example: "Up next, we have India's talented all-rounder, Hardik Pandya. His base price is two crore rupees."
 * 2. Sold Announcement
 *    Example: "Sold! Hardik Pandya goes to Mumbai Indians for fourteen crore fifty lakh rupees!"
 */

import { Player } from './types';
import { formatInrForSpeech } from './currency-speech';

/**
 * Maps franchise short codes to their official spoken franchise names.
 */
const FRANCHISE_NAME_MAP: Record<string, string> = {
  CSK: 'Chennai Super Kings',
  MI: 'Mumbai Indians',
  RCB: 'Royal Challengers Bengaluru',
  SRH: 'Sunrisers Hyderabad',
  KKR: 'Kolkata Knight Riders',
  RR: 'Rajasthan Royals',
  DC: 'Delhi Capitals',
  PBKS: 'Punjab Kings',
  GT: 'Gujarat Titans',
  LSG: 'Lucknow Super Giants',
};

/**
 * Expands a team shortcode or raw name into a clean spoken team name.
 */
export function expandFranchiseName(nameOrCode?: string | null): string {
  if (!nameOrCode) return 'the winning team';
  const trimmed = nameOrCode.trim();
  const upper = trimmed.toUpperCase();
  if (FRANCHISE_NAME_MAP[upper]) {
    return FRANCHISE_NAME_MAP[upper];
  }
  return trimmed;
}

/**
 * Normalizes player cricket role for natural broadcast speech.
 * e.g. "AR" -> "all-rounder", "WK" -> "wicketkeeper-batter", "BAT" -> "batter", "BOWL" -> "bowler"
 */
export function formatRoleDescription(role: string): string {
  const lower = (role || '').toLowerCase().trim();
  if (lower.includes('all-rounder') || lower.includes('all rounder') || lower === 'ar') {
    return 'all-rounder';
  }
  if (lower.includes('wicket') || lower === 'wk') {
    return 'wicketkeeper';
  }
  if (lower.includes('bowl')) {
    return 'bowler';
  }
  if (lower.includes('bat')) {
    return 'batter';
  }
  return lower || 'cricketer';
}

/**
 * Generates the authoritative Player Introduction text.
 * Triggered exactly once when a player becomes active on the auction block.
 *
 * Example:
 * "Up next, we have India's talented all-rounder, Hardik Pandya. His base price is two crore rupees."
 */
export function buildPlayerIntroduction(player: Player): string {
  const nationality = (player.country || 'India').trim();
  const role = formatRoleDescription(player.role);
  const basePriceSpoken = formatInrForSpeech(player.base_price, { capitalizeFirst: false });

  // Example: "Up next, we have India's talented all-rounder, Hardik Pandya. His base price is two crore rupees."
  return `Up next, we have ${nationality}'s talented ${role}, ${player.name}. His base price is ${basePriceSpoken}.`;
}

/**
 * Generates the authoritative Final 5-Second Closing Announcement text.
 * Triggered when the auction countdown reaches 5 seconds.
 *
 * Example:
 * "GT currently holds the highest bid. Going once, going twice..."
 */
export function buildClosingAnnouncement(highestBidderTeamOrCode?: string | null): string {
  const team = (highestBidderTeamOrCode || '').trim();
  if (team) {
    return `${team} currently holds the highest bid. Going once, going twice...`;
  }
  return `No bids yet. Going once, going twice...`;
}

/**
 * Generates the authoritative Sold Announcement text.
 * Triggered only after the authoritative server confirms the sale.
 *
 * Example:
 * "Sold! Hardik Pandya goes to Mumbai Indians for fourteen crore fifty lakh rupees!"
 */
export function buildSoldAnnouncement(
  playerName: string,
  winningTeamName: string | undefined | null,
  finalPrice: number
): string {
  const team = expandFranchiseName(winningTeamName);
  const priceSpoken = formatInrForSpeech(finalPrice, { capitalizeFirst: false });

  // Example: "Sold! Hardik Pandya goes to Mumbai Indians for fourteen crore fifty lakh rupees!"
  return `Sold! ${playerName} goes to ${team} for ${priceSpoken}!`;
}

