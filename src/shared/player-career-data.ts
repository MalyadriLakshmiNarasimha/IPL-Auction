/**
 * Authoritative Historical IPL Career & Season Statistics Registry
 *
 * Backed exclusively by the authoritative Upto2026 CSV datasets:
 * - Upto2026/batting_2026.csv
 * - Upto2026/batting_overall.csv
 * - Upto2026/bowling_2026.csv
 * - Upto2026/bowling_overall.csv
 *
 * Ingested via scripts/import_upto2026_stats.ts into player-stats-registry.json.
 */

import { IplCareerStats, IplSeasonStats, Player, PlayerDataStatus } from './types';
import registryData from './player-stats-registry.json';
import rawPlayersMetadata from '../../players-database.json';

export interface PlayerCareerData {
  stats: IplCareerStats;
  achievements: string[];
}

export interface PlayerIdentityMapping {
  auction_id: string;
  canonical_name: string;
  normalized_name: string;
  aliases: string[];
  source_id: string;
  nationality: string;
  role: string;
  is_debutant: boolean;
  status: PlayerDataStatus;
  sources_checked?: number;
  source_urls?: string[];
}

/**
 * Normalizes player name for deterministic resolution across aliases and punctuation variants.
 */
export function normalizePlayerName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Historical achievements for marquee IPL players
 */
export const HISTORICAL_IPL_ACHIEVEMENTS: Record<string, string[]> = {
  'Rohit Sharma': [
    '🏆 6-time IPL Champion (2009, 2013, 2015, 2017, 2019, 2020)',
    '🌟 IPL Emerging Player of the Year — 2009',
    '🎖️ Player of the Final — 2015',
  ],
  'MS Dhoni': [
    '🏆 5-time IPL Champion (2010, 2011, 2018, 2021, 2023)',
    '🌟 250+ IPL Matches Captained',
    '🧤 Most Dismissals by Wicketkeeper in IPL History',
  ],
  'Mahendra Singh Dhoni': [
    '🏆 5-time IPL Champion (2010, 2011, 2018, 2021, 2023)',
    '🌟 250+ IPL Matches Captained',
    '🧤 Most Dismissals by Wicketkeeper in IPL History',
  ],
  'Virat Kohli': [
    '🧡 2-time Orange Cap Winner — 2016 (973 Runs), 2024 (741 Runs)',
    '🌟 IPL Most Valuable Player (MVP) — 2016',
    '👑 All-Time Leading Run Scorer in IPL History (9,000+ Runs)',
    '💯 Most Centuries in IPL History (8 Hundreds)',
  ],
  'Sunil Narine': [
    '🏆 3-time IPL Champion (2012, 2014, 2024)',
    '🌟 3-time IPL Most Valuable Player (MVP) — 2012, 2018, 2024',
    '🎖️ Player of the Final — 2014',
  ],
  'Harshal Patel': [
    '💜 2-time Purple Cap Winner — 2021 (32 Wickets), 2024 (24 Wickets)',
    '🌟 IPL Most Valuable Player (MVP) — 2021',
  ],
  'Jasprit Bumrah': [
    '🏆 5-time IPL Champion (2013, 2015, 2017, 2019, 2020)',
    '🎖️ Player of the Final — 2019',
    '🎯 Premier Pace Spearhead',
  ],
  'Hardik Pandya': [
    '🏆 5-time IPL Champion (2015, 2017, 2019, 2020, 2022)',
    '🎖️ Player of the Final — 2022',
  ],
};

// Aliases mapping common names / variations to canonical player names
export const PLAYER_ALIASES: Record<string, string> = {
  'MS Dhoni': 'Mahendra Singh Dhoni',
  'M.S. Dhoni': 'Mahendra Singh Dhoni',
  'M S Dhoni': 'Mahendra Singh Dhoni',
  'Dhoni': 'Mahendra Singh Dhoni',
  'V Kohli': 'Virat Kohli',
  'RG Sharma': 'Rohit Sharma',
  'Rohit': 'Rohit Sharma',
  'Kohli': 'Virat Kohli',
  'Aman Hakim Khan': 'Aman Khan',
  'Akash Mandwaal': 'Akash Madhwal',
  'Yudhvir Singh': 'Yudhvir Singh Charak',
  'Mitchell Owen': 'Mitch Owen',
  'K Rabada': 'Kagiso Rabada',
  'B Kumar': 'Bhuvneshwar Kumar',
  'YS Chahal': 'Yuzvendra Chahal',
  'JJ Bumrah': 'Jasprit Bumrah',
  'SP Narine': 'Sunil Narine',

  // 1. Salil Arora (p-272)
  'S Arora': 'Salil Arora',
  'S. Arora': 'Salil Arora',
  'Salil Arora': 'Salil Arora',

  // 2. Mukul Choudhary (p-115)
  'MD Choudhary': 'Mukul Choudhary',
  'M.D. Choudhary': 'Mukul Choudhary',
  'Mukul Choudhary': 'Mukul Choudhary',
  'Mukul': 'Mukul Choudhary',

  // 3. Sahil Parakh (p-035)
  'SU Parakh': 'Sahil Parakh',
  'S.U. Parakh': 'Sahil Parakh',
  'Sahil Parakh': 'Sahil Parakh',

  // 4. Digvesh Singh Rathi (p-125)
  'DS Rathi': 'Digvesh Singh Rathi',
  'D.S. Rathi': 'Digvesh Singh Rathi',
  'Digvesh Rathi': 'Digvesh Singh Rathi',
  'Digvesh Singh Rathi': 'Digvesh Singh Rathi',

  // 5. Arshin Kulkarni (p-116)
  'AA Kulkarni': 'Arshin Kulkarni',
  'A.A. Kulkarni': 'Arshin Kulkarni',
  'Arshin Kulkarni': 'Arshin Kulkarni',

  // 6. Vipraj Nigam (p-050)
  'V Nigam': 'Vipraj Nigam',
  'V. Nigam': 'Vipraj Nigam',
  'Vipraj Nigam': 'Vipraj Nigam',

  // 7. Auqib Nabi Dar (p-047)
  'Auqib Nabi': 'Auqib Nabi Dar',
  'Auqib Nabi Dar': 'Auqib Nabi Dar',

  // 8. Tejasvi Dahiya (p-110)
  'T Dahiya': 'Tejasvi Dahiya',
  'T. Dahiya': 'Tejasvi Dahiya',
  'Tejasvi Singh Dahiya': 'Tejasvi Dahiya',
  'Tejasvi Dahiya': 'Tejasvi Dahiya',

  // 9. Lhuan-dre Pretorius (p-198)
  'LG Pretorius': 'Lhuan-dré Pretorius',
  'L.G. Pretorius': 'Lhuan-dré Pretorius',
  'Lhuan-dre Pretorius': 'Lhuan-dré Pretorius',
  'Lhuan-dré Pretorius': 'Lhuan-dré Pretorius',

  // 10. Danish Malewar (p-144)
  'DV Malewar': 'Danish Malewar',
  'D.V. Malewar': 'Danish Malewar',
  'Danish Malewar': 'Danish Malewar',

  // 11. Ramakrishna Ghosh (p-003)
  'RS Ghosh': 'Ramakrishna Ghosh',
  'R.S. Ghosh': 'Ramakrishna Ghosh',
  'Ramakrishna Ghosh': 'Ramakrishna Ghosh',

  // 12. Manimaran Siddharth (p-127)
  'M Siddharth': 'Manimaran Siddharth',
  'M. Siddharth': 'Manimaran Siddharth',
  'Manimaran Siddharth': 'Manimaran Siddharth',

  // 13. Ravichandran Smaran (p-252)
  'R Smaran': 'Ravichandran Smaran',
  'R. Smaran': 'Ravichandran Smaran',
  'Smaran R': 'Ravichandran Smaran',
  'Ravichandran Smaran': 'Ravichandran Smaran',

  // 14. Yash Punja (p-199)
  'Yash Raj Punja': 'Yash Punja',
  'Yash Punja': 'Yash Punja',

  // 15. Rasikh Dar (p-231)
  'Rasikh Salam': 'Rasikh Dar',
  'Rasikh Salam Dar': 'Rasikh Dar',
  'Rasikh Dar': 'Rasikh Dar',

  // 16. Raj Bawa (p-162)
  'RA Bawa': 'Raj Bawa',
  'R.A. Bawa': 'Raj Bawa',
  'Raj Angad Bawa': 'Raj Bawa',
  'Raj Bawa': 'Raj Bawa',

  // 17. Vaibhav Sooryavanshi (p-203)
  'V Suryavanshi': 'Vaibhav Sooryavanshi',
  'Vaibhav Suryavanshi': 'Vaibhav Sooryavanshi',
  'Vaibhav Sooryavanshi': 'Vaibhav Sooryavanshi',

  // 18. Mitch Marsh (p-118)
  'MR Marsh': 'Mitch Marsh',
  'Mitchell Marsh': 'Mitch Marsh',
  'Mitch Marsh': 'Mitch Marsh',

  // 19. Prabhsimran Singh (p-192)
  'P Simran Singh': 'Prabhsimran Singh',
  'Simran Singh': 'Prabhsimran Singh',
  'Prabhsimran Singh': 'Prabhsimran Singh',

  // 20. Donovan Ferreira (p-194)
  'D Ferreira': 'Donovan Ferreira',
  'Donavon Ferreira': 'Donovan Ferreira',
  'Donovan Ferreira': 'Donovan Ferreira',

  // 21. Nicholas Pooran (p-138)
  'N Pooran': 'Nicholas Pooran',
  'Nicolas Pooran': 'Nicholas Pooran',
  'Nicholas Pooran': 'Nicholas Pooran',

  // 22. Phil Salt (p-228)
  'PD Salt': 'Phil Salt',
  'Philip Salt': 'Phil Salt',
  'Phil Salt': 'Phil Salt',

  // 23. Matt Short (p-009)
  'MW Short': 'Matt Short',
  'Matthew Short': 'Matt Short',
  'Matt Short': 'Matt Short',

  // 24. Anukul Roy (p-109)
  'AS Roy': 'Anukul Roy',
  'Anukul Roy priyansh Kumar': 'Anukul Roy',
  'Anukul Roy': 'Anukul Roy',

  // 25. Mitch Santner (p-165)
  'MJ Santner': 'Mitch Santner',
  'Mitchell Santner': 'Mitch Santner',
  'Mitch Santner': 'Mitch Santner',

  // 26. Sai Kishore (p-071)
  'R Sai Kishore': 'Sai Kishore',
  'Ravisrinivasan Sai Kishore': 'Sai Kishore',
  'Sai Kishore': 'Sai Kishore',

  // 27. Vijaykumar Vyshak (p-189)
  'Vyshak Vijay Kumar': 'Vijaykumar Vyshak',
  'Vijaykumar Vyshak': 'Vijaykumar Vyshak',

  // 28. Shahbaz Ahmed (p-135)
  'Sahabaz Ahmed': 'Shahbaz Ahmed',
  'Shahbaz Ahmed': 'Shahbaz Ahmed',

  // Praveen Dubey (p-171)
  'Praveen Dubey': 'p-171',
  'P. Dubey': 'p-171',
  'P Dubey': 'p-171',
};

// Build memory indexes from registryData
const playersMap = (registryData as any).players as Record<string, any>;

export const HISTORICAL_IPL_CAREER_BY_ID: Record<string, IplCareerStats> = {};
export const HISTORICAL_IPL_2026_BY_ID: Record<string, IplSeasonStats> = {};
export const HISTORICAL_IPL_CAREER_BY_NAME: Record<string, IplCareerStats> = {};
export const HISTORICAL_IPL_2026_BY_NAME: Record<string, IplSeasonStats> = {};

const nameToId = new Map<string, string>();
const normToId = new Map<string, string>();

for (const [auctionId, data] of Object.entries(playersMap)) {
  HISTORICAL_IPL_CAREER_BY_ID[auctionId] = data.career as IplCareerStats;
  HISTORICAL_IPL_2026_BY_ID[auctionId] = data.season_2026 as IplSeasonStats;

  const aName = data.auction_name;
  const cName = data.canonical_name;

  HISTORICAL_IPL_CAREER_BY_NAME[aName] = data.career as IplCareerStats;
  HISTORICAL_IPL_2026_BY_NAME[aName] = data.season_2026 as IplSeasonStats;

  if (cName && cName !== aName) {
    HISTORICAL_IPL_CAREER_BY_NAME[cName] = data.career as IplCareerStats;
    HISTORICAL_IPL_2026_BY_NAME[cName] = data.season_2026 as IplSeasonStats;
  }

  nameToId.set(aName.toLowerCase(), auctionId);
  nameToId.set(cName.toLowerCase(), auctionId);
  normToId.set(normalizePlayerName(aName), auctionId);
  normToId.set(normalizePlayerName(cName), auctionId);
}

/**
 * Resolves an arbitrary player identifier (ID, full name, short name, or alias)
 * to their authoritative auction ID (e.g. 'p-224').
 */
export function resolvePlayerId(identifier: string): string | undefined {
  if (!identifier) return undefined;
  const trimmed = identifier.trim();

  // 1. Direct ID match
  if (playersMap[trimmed]) {
    return trimmed;
  }

  // 2. Exact lowercase name match
  const lower = trimmed.toLowerCase();
  if (nameToId.has(lower)) {
    return nameToId.get(lower);
  }

  // 3. Known alias match
  if (PLAYER_ALIASES[trimmed]) {
    const aliasTarget = PLAYER_ALIASES[trimmed];
    const aliasId = resolvePlayerId(aliasTarget);
    if (aliasId) return aliasId;
  }

  // 4. Normalized name match
  const norm = normalizePlayerName(trimmed);
  if (normToId.has(norm)) {
    return normToId.get(norm);
  }

  return undefined;
}

/**
 * Retrieves historical IPL career statistics for a player.
 */
export function getIplCareerStats(
  playerOrIdentifier?: Player | string | { id?: string; name?: string; player_name?: string } | null
): IplCareerStats {
  if (!playerOrIdentifier) {
    return {
      has_stats: false,
      has_ipl_career: false,
      matches: 0,
      runs: 0,
      batting_average: 0,
      strike_rate: 0,
      status: 'DATA_UNAVAILABLE',
      verification_status: 'DATA_UNAVAILABLE',
    };
  }

  if (typeof playerOrIdentifier === 'object') {
    if (playerOrIdentifier.id && HISTORICAL_IPL_CAREER_BY_ID[playerOrIdentifier.id]) {
      return HISTORICAL_IPL_CAREER_BY_ID[playerOrIdentifier.id];
    }
    const name = playerOrIdentifier.name || (playerOrIdentifier as any).player_name;
    if (name) {
      return getIplCareerStats(name);
    }
  }

  if (typeof playerOrIdentifier === 'string') {
    const rawStr = playerOrIdentifier.trim();
    if (HISTORICAL_IPL_CAREER_BY_ID[rawStr]) {
      return HISTORICAL_IPL_CAREER_BY_ID[rawStr];
    }
    const resolvedId = resolvePlayerId(rawStr);
    if (resolvedId && HISTORICAL_IPL_CAREER_BY_ID[resolvedId]) {
      return HISTORICAL_IPL_CAREER_BY_ID[resolvedId];
    }
  }

  return {
    has_stats: false,
    has_ipl_career: false,
    matches: 0,
    runs: 0,
    batting_average: 0,
    strike_rate: 0,
    status: 'DATA_UNAVAILABLE',
    verification_status: 'DATA_UNAVAILABLE',
  };
}

/**
 * Retrieves verified IPL 2026 season statistics for a player.
 */
export function getIplSeasonStats(
  playerOrIdentifier?: Player | string | { id?: string; name?: string; player_name?: string } | null
): IplSeasonStats {
  if (!playerOrIdentifier) {
    return {
      season: '2026',
      matches: 0,
      has_stats: false,
      has_season_stats: false,
      status: 'DATA_UNAVAILABLE',
      verification_status: 'DATA_UNAVAILABLE',
    };
  }

  if (typeof playerOrIdentifier === 'object') {
    if (playerOrIdentifier.id && HISTORICAL_IPL_2026_BY_ID[playerOrIdentifier.id]) {
      return HISTORICAL_IPL_2026_BY_ID[playerOrIdentifier.id];
    }
    const name = playerOrIdentifier.name || (playerOrIdentifier as any).player_name;
    if (name) {
      return getIplSeasonStats(name);
    }
  }

  if (typeof playerOrIdentifier === 'string') {
    const rawStr = playerOrIdentifier.trim();
    if (HISTORICAL_IPL_2026_BY_ID[rawStr]) {
      return HISTORICAL_IPL_2026_BY_ID[rawStr];
    }
    const resolvedId = resolvePlayerId(rawStr);
    if (resolvedId && HISTORICAL_IPL_2026_BY_ID[resolvedId]) {
      return HISTORICAL_IPL_2026_BY_ID[resolvedId];
    }
  }

  return {
    season: '2026',
    matches: 0,
    has_stats: false,
    has_season_stats: false,
    status: 'DATA_UNAVAILABLE',
    verification_status: 'DATA_UNAVAILABLE',
  };
}

/**
 * Historical achievements for marquee IPL players
 */
export function getPlayerAchievements(playerName: string): string[] {
  if (!playerName) return [];
  if (HISTORICAL_IPL_ACHIEVEMENTS[playerName]) {
    return HISTORICAL_IPL_ACHIEVEMENTS[playerName];
  }
  const resolvedId = resolvePlayerId(playerName);
  if (resolvedId && playersMap[resolvedId]) {
    const canonical = playersMap[resolvedId].canonical_name;
    if (HISTORICAL_IPL_ACHIEVEMENTS[canonical]) {
      return HISTORICAL_IPL_ACHIEVEMENTS[canonical];
    }
  }
  return [];
}
