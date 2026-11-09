/**
 * Validation and normalization utilities for Custom Team Names in IPL Auction rooms.
 */

export const TEAM_COLOR_PALETTE = [
  '#F9CD05', // Royal Gold
  '#2563EB', // Blue Impact
  '#DC2626', // Scarlet Crimson
  '#059669', // Emerald Turf
  '#7C3AED', // Regal Purple
  '#EA580C', // Sunrise Orange
  '#0D9488', // Teal Surge
  '#DB2777', // Hot Pink
  '#4F46E5', // Indigo Strike
  '#CA8A04', // Amber Glow
  '#0284C7', // Sky Warrior
  '#16A34A', // Vibrant Green
];

export interface TeamNameValidationResult {
  valid: boolean;
  reason?: string;
  normalized?: string;
  shortCode?: string;
}

/**
 * Normalizes a team name for consistent, case-insensitive comparison.
 * Collapses internal whitespace, removes leading/trailing spaces, and lowers case.
 */
export function normalizeTeamName(name: string): string {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Automatically derives a clean 2 to 4 character uppercase short code from a team name.
 * e.g. "Mumbai Mavericks" -> "MM", "Royal Challengers" -> "RC", "Warriors" -> "WAR", "Super Kings" -> "SK"
 */
export function deriveTeamShortCode(name: string): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const initials = words.map(w => w[0].toUpperCase()).join('');
    return initials.slice(0, 4);
  }
  const single = (words[0] || 'TEAM').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (single.length <= 4) return single;
  return single.slice(0, 3);
}

/**
 * Validates a custom team name against rules:
 * 1. Must not be empty or whitespace-only.
 * 2. Must be between 2 and 30 characters.
 * 3. Only allowed characters: letters, numbers, spaces, hyphens, apostrophes, ampersands, periods.
 * 4. Must be unique within the room (case-insensitive) compared against existing participant team names.
 */
export function validateTeamName(
  teamName: string | null | undefined,
  existingTeamNamesInRoom: string[] = [],
  currentParticipantTeamName?: string | null
): TeamNameValidationResult {
  if (!teamName || typeof teamName !== 'string') {
    return { valid: false, reason: 'Team name cannot be empty.' };
  }

  const trimmed = teamName.trim().replace(/\s+/g, ' ');

  if (trimmed.length < 2) {
    return { valid: false, reason: 'Team name must be at least 2 characters long.' };
  }

  if (trimmed.length > 30) {
    return { valid: false, reason: 'Team name cannot exceed 30 characters.' };
  }

  // Allowed: letters, numbers, spaces, hyphens, apostrophes, ampersands, dots
  const validPattern = /^[a-zA-Z0-9\s\-&'.]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      valid: false,
      reason: 'Team name contains invalid characters. Use letters, numbers, spaces, -, &, \', or . only.',
    };
  }

  const normalized = normalizeTeamName(trimmed);
  const currentNormalized = currentParticipantTeamName ? normalizeTeamName(currentParticipantTeamName) : null;

  const isDuplicate = existingTeamNamesInRoom.some(existing => {
    const existingNorm = normalizeTeamName(existing);
    if (currentNormalized && existingNorm === currentNormalized) {
      return false; // same team name belongs to current participant
    }
    return existingNorm === normalized;
  });

  if (isDuplicate) {
    return {
      valid: false,
      reason: `The team name "${trimmed}" is already taken in this room. Please choose another name.`,
    };
  }

  return {
    valid: true,
    normalized,
    shortCode: deriveTeamShortCode(trimmed),
  };
}

