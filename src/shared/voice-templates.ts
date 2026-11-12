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
 * e.g. "AR" -> "all-rounder", "WK" -> "wicketkeeper", "BAT" -> "batter", "BOWL" -> "bowler"
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
 * Detailed role description taking bowling style into account.
 * Bowlers with fast/pace/medium styles are identified as "fast bowler".
 * Bowlers with spin/orthodox/break/googly styles are identified as "spin bowler".
 */
export function formatDetailedRoleDescription(role: string, bowlingStyle?: string | null): string {
  const normalized = formatRoleDescription(role);
  if (normalized === 'bowler') {
    const style = (bowlingStyle || '').toLowerCase();
    if (style.includes('spin') || style.includes('break') || style.includes('orthodox') || style.includes('googly')) {
      return 'spin bowler';
    }
    if (style.includes('fast') || style.includes('pace') || style.includes('medium')) {
      return 'fast bowler';
    }
    return 'bowler';
  }
  return normalized;
}

export interface NationalityGrammar {
  article: string;
  demonym: string;
  isSpecialIndia?: boolean;
}

/**
 * Grammatically accurate demonym and article mappings for all 10 tournament nationalities.
 */
export const NATIONALITY_GRAMMAR_MAP: Record<string, NationalityGrammar> = {
  India: { article: '', demonym: "India's talented", isSpecialIndia: true },
  England: { article: 'an', demonym: 'English' },
  Australia: { article: 'an', demonym: 'Australian' },
  'New Zealand': { article: 'a', demonym: 'New Zealand' },
  'South Africa': { article: 'a', demonym: 'South African' },
  'West Indies': { article: 'a', demonym: 'West Indian' },
  Afghanistan: { article: 'an', demonym: 'Afghan' },
  'Sri Lanka': { article: 'a', demonym: 'Sri Lankan' },
  Bangladesh: { article: 'a', demonym: 'Bangladeshi' },
  Zimbabwe: { article: 'a', demonym: 'Zimbabwean' },
};

/**
 * Resolves the grammatically correct nationality prefix with article.
 * e.g. "India" -> "India's talented"
 *      "England" -> "an English"
 *      "New Zealand" -> "a New Zealand"
 *      "South Africa" -> "a South African"
 */
export function getNationalityPrefix(countryOrNationality?: string | null): string {
  const country = (countryOrNationality || 'India').trim();
  const config = NATIONALITY_GRAMMAR_MAP[country];
  if (config) {
    if (config.isSpecialIndia) {
      return config.demonym;
    }
    return `${config.article} ${config.demonym}`.trim();
  }
  const startsWithVowel = /^[aeiou]/i.test(country);
  return `${startsWithVowel ? 'an' : 'a'} ${country}`;
}

/**
 * Generates the authoritative Player Introduction text dynamically based on nationality and role.
 * Triggered exactly once when a player becomes active on the auction block.
 *
 * Examples:
 * - India: "Up next, we have India's talented batter, Rahul Tripathi. His base price is twenty lakh rupees."
 * - England: "Up next, we have an English fast bowler, Jofra Archer. His base price is two crore rupees."
 * - New Zealand: "Up next, we have a New Zealand all-rounder, Mitchell Santner. His base price is two crore rupees."
 * - South Africa: "Up next, we have a South African wicketkeeper, Heinrich Klaasen. His base price is two crore rupees."
 */
export function buildPlayerIntroduction(player: Player): string {
  const nationality = (player.country || player.nationality || 'India').trim();
  const prefix = getNationalityPrefix(nationality);
  const role = formatDetailedRoleDescription(player.role, player.bowling_style);
  const basePriceSpoken = formatInrForSpeech(player.base_price, { capitalizeFirst: false });

  return `Up next, we have ${prefix} ${role}, ${player.name}. His base price is ${basePriceSpoken}.`;
}

/**
 * Generates the authoritative Final 5-Second Closing Announcement text.
 * Triggered when the auction countdown reaches 5 seconds.
 *
 * Example (with bid):
 * "GT currently holds the highest bid. Going once, going twice..."
 *
 * Example (no bids):
 * "No bids received for Hardik Pandya... Going once, going twice..."
 */
export function buildClosingAnnouncement(
  highestBidderTeamOrCode?: string | null,
  playerName?: string | null
): string {
  const team = (highestBidderTeamOrCode || '').trim();
  if (team) {
    return `${team} currently holds the highest bid. Going once, going twice...`;
  }
  const player = (playerName || '').trim();
  if (player) {
    return `No bids received for ${player}... Going once, going twice...`;
  }
  return `No bids yet. Going once, going twice...`;
}

/**
 * Generates the authoritative Unsold Announcement text.
 * Triggered only after the authoritative server confirms the player is unsold.
 *
 * Example:
 * "UNSOLD! Hardik Pandya remains unsold."
 */
export function buildUnsoldAnnouncement(playerName: string): string {
  const name = (playerName || 'This player').trim();
  return `UNSOLD! ${name} remains unsold.`;
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

