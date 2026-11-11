/**
 * Authoritative Historical IPL Career Statistics & Registry
 *
 * Source: Official IPL Historical Records & Match Center (iplt20.com)
 * Covers all-time overall career stats for all 274 players in the auction ecosystem.
 * Players without IPL match appearances are marked has_ipl_career: false (IPL Debutant).
 */

import { IplCareerStats, Player } from './types';

export interface PlayerCareerData {
  stats: IplCareerStats;
  achievements: string[];
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
    '👑 All-Time Leading Run Scorer in IPL History (8,000+ Runs)',
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
    '🎯 165 Career IPL Wickets',
  ],
  'Hardik Pandya': [
    '🏆 5-time IPL Champion (2015, 2017, 2019, 2020, 2022)',
    '🎖️ Player of the Final — 2022',
  ],
};

/**
 * Historical Overall IPL Career Statistics by Unique Player ID (p-001 through p-274)
 * Primary deterministic lookup key.
 */
export const HISTORICAL_IPL_CAREER_BY_ID: Record<string, IplCareerStats> = {
  "p-001": {
    "matches": 10,
    "runs": 230,
    "strike_rate": 142.86,
    "batting_average": 23,
    "has_ipl_career": true
  },
  "p-002": {
    "matches": 66,
    "runs": 2380,
    "strike_rate": 136.86,
    "batting_average": 41.75,
    "has_ipl_career": true
  },
  "p-003": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-004": {
    "matches": 12,
    "runs": 114,
    "strike_rate": 123.91,
    "batting_average": 12.67,
    "has_ipl_career": true
  },
  "p-005": {
    "matches": 50,
    "runs": 585,
    "strike_rate": 130.58,
    "batting_average": 22.5,
    "has_ipl_career": true
  },
  "p-006": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-007": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-008": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-009": {
    "matches": 6,
    "runs": 117,
    "strike_rate": 127.17,
    "batting_average": 19.5,
    "has_ipl_career": true
  },
  "p-010": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-011": {
    "matches": 57,
    "runs": 2,
    "strike_rate": 40,
    "batting_average": 2,
    "has_ipl_career": true
  },
  "p-012": {
    "matches": 79,
    "runs": 111,
    "strike_rate": 112.12,
    "batting_average": 11.1,
    "has_ipl_career": true
  },
  "p-013": {
    "matches": 14,
    "runs": 6,
    "strike_rate": 75,
    "batting_average": 6,
    "has_ipl_career": true
  },
  "p-014": {
    "matches": 16,
    "runs": 34,
    "strike_rate": 106.25,
    "batting_average": 8.5,
    "has_ipl_career": true
  },
  "p-015": {
    "matches": 6,
    "runs": 15,
    "strike_rate": 93.75,
    "batting_average": 7.5,
    "has_ipl_career": true
  },
  "p-016": {
    "matches": 1,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-017": {
    "matches": 5,
    "runs": 1,
    "strike_rate": 50,
    "batting_average": 1,
    "has_ipl_career": true
  },
  "p-018": {
    "matches": 3,
    "runs": 2,
    "strike_rate": 66.67,
    "batting_average": 2,
    "has_ipl_career": true
  },
  "p-019": {
    "matches": 13,
    "runs": 4,
    "strike_rate": 50,
    "batting_average": 4,
    "has_ipl_career": true
  },
  "p-020": {
    "matches": 23,
    "runs": 5,
    "strike_rate": 45.45,
    "batting_average": 2.5,
    "has_ipl_career": true
  },
  "p-021": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-022": {
    "matches": 4,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-023": {
    "matches": 65,
    "runs": 1502,
    "strike_rate": 150.5,
    "batting_average": 31.29,
    "has_ipl_career": true
  },
  "p-024": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-025": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-026": {
    "matches": 52,
    "runs": 180,
    "strike_rate": 107.14,
    "batting_average": 12.86,
    "has_ipl_career": true
  },
  "p-027": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-028": {
    "matches": 264,
    "runs": 5243,
    "strike_rate": 137.54,
    "batting_average": 39.13,
    "has_ipl_career": true
  },
  "p-029": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-030": {
    "matches": 167,
    "runs": 4419,
    "strike_rate": 138.96,
    "batting_average": 30.69,
    "has_ipl_career": true
  },
  "p-031": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-032": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-033": {
    "matches": 130,
    "runs": 2924,
    "strike_rate": 139.24,
    "batting_average": 36.1,
    "has_ipl_career": true
  },
  "p-034": {
    "matches": 76,
    "runs": 1496,
    "strike_rate": 127.65,
    "batting_average": 23.75,
    "has_ipl_career": true
  },
  "p-035": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-036": {
    "matches": 132,
    "runs": 4683,
    "strike_rate": 134.61,
    "batting_average": 45.47,
    "has_ipl_career": true
  },
  "p-037": {
    "matches": 107,
    "runs": 2636,
    "strike_rate": 135.04,
    "batting_average": 28.65,
    "has_ipl_career": true
  },
  "p-038": {
    "matches": 8,
    "runs": 51,
    "strike_rate": 118.6,
    "batting_average": 12.75,
    "has_ipl_career": true
  },
  "p-039": {
    "matches": 11,
    "runs": 189,
    "strike_rate": 167.26,
    "batting_average": 27,
    "has_ipl_career": true
  },
  "p-040": {
    "matches": 79,
    "runs": 1892,
    "strike_rate": 147.47,
    "batting_average": 23.95,
    "has_ipl_career": true
  },
  "p-041": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-042": {
    "matches": 20,
    "runs": 405,
    "strike_rate": 173.08,
    "batting_average": 45,
    "has_ipl_career": true
  },
  "p-043": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-044": {
    "matches": 13,
    "runs": 43,
    "strike_rate": 107.5,
    "batting_average": 10.75,
    "has_ipl_career": true
  },
  "p-045": {
    "matches": 9,
    "runs": 65,
    "strike_rate": 118.18,
    "batting_average": 16.25,
    "has_ipl_career": true
  },
  "p-046": {
    "matches": 20,
    "runs": 8,
    "strike_rate": 80,
    "batting_average": 4,
    "has_ipl_career": true
  },
  "p-047": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-048": {
    "matches": 61,
    "runs": 3,
    "strike_rate": 60,
    "batting_average": 3,
    "has_ipl_career": true
  },
  "p-049": {
    "matches": 14,
    "runs": 12,
    "strike_rate": 75,
    "batting_average": 6,
    "has_ipl_career": true
  },
  "p-050": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-051": {
    "matches": 41,
    "runs": 124,
    "strike_rate": 96.12,
    "batting_average": 10.33,
    "has_ipl_career": true
  },
  "p-052": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-053": {
    "matches": 84,
    "runs": 128,
    "strike_rate": 73.14,
    "batting_average": 10.67,
    "has_ipl_career": true
  },
  "p-054": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-055": {
    "matches": 150,
    "runs": 1653,
    "strike_rate": 130.88,
    "batting_average": 21.47,
    "has_ipl_career": true
  },
  "p-056": {
    "matches": 18,
    "runs": 360,
    "strike_rate": 154.51,
    "batting_average": 27.69,
    "has_ipl_career": true
  },
  "p-057": {
    "matches": 2,
    "runs": 18,
    "strike_rate": 90,
    "batting_average": 9,
    "has_ipl_career": true
  },
  "p-058": {
    "matches": 103,
    "runs": 3216,
    "strike_rate": 135.7,
    "batting_average": 37.84,
    "has_ipl_career": true
  },
  "p-059": {
    "matches": 8,
    "runs": 110,
    "strike_rate": 126.44,
    "batting_average": 18.33,
    "has_ipl_career": true
  },
  "p-060": {
    "matches": 25,
    "runs": 1034,
    "strike_rate": 139.17,
    "batting_average": 47,
    "has_ipl_career": true
  },
  "p-061": {
    "matches": 40,
    "runs": 553,
    "strike_rate": 142.16,
    "batting_average": 20.48,
    "has_ipl_career": true
  },
  "p-062": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-063": {
    "matches": 93,
    "runs": 1013,
    "strike_rate": 142.28,
    "batting_average": 25.33,
    "has_ipl_career": true
  },
  "p-064": {
    "matches": 10,
    "runs": 81,
    "strike_rate": 155.77,
    "batting_average": 40.5,
    "has_ipl_career": true
  },
  "p-065": {
    "matches": 1,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-066": {
    "matches": 5,
    "runs": 2,
    "strike_rate": 66.67,
    "batting_average": 2,
    "has_ipl_career": true
  },
  "p-067": {
    "matches": 51,
    "runs": 7,
    "strike_rate": 43.75,
    "batting_average": 3.5,
    "has_ipl_career": true
  },
  "p-068": {
    "matches": 2,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-069": {
    "matches": 80,
    "runs": 186,
    "strike_rate": 103.91,
    "batting_average": 10.94,
    "has_ipl_career": true
  },
  "p-070": {
    "matches": 121,
    "runs": 544,
    "strike_rate": 147.43,
    "batting_average": 14.7,
    "has_ipl_career": true
  },
  "p-071": {
    "matches": 10,
    "runs": 4,
    "strike_rate": 57.14,
    "batting_average": 4,
    "has_ipl_career": true
  },
  "p-072": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-073": {
    "matches": 110,
    "runs": 64,
    "strike_rate": 88.89,
    "batting_average": 8,
    "has_ipl_career": true
  },
  "p-074": {
    "matches": 93,
    "runs": 109,
    "strike_rate": 83.21,
    "batting_average": 8.38,
    "has_ipl_career": true
  },
  "p-075": {
    "matches": 1,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-076": {
    "matches": 2,
    "runs": 9,
    "strike_rate": 180,
    "batting_average": 9,
    "has_ipl_career": true
  },
  "p-077": {
    "matches": 46,
    "runs": 259,
    "strike_rate": 123.33,
    "batting_average": 12.33,
    "has_ipl_career": true
  },
  "p-078": {
    "matches": 60,
    "runs": 378,
    "strike_rate": 116.31,
    "batting_average": 14.54,
    "has_ipl_career": true
  },
  "p-079": {
    "matches": 20,
    "runs": 51,
    "strike_rate": 108.51,
    "batting_average": 10.2,
    "has_ipl_career": true
  },
  "p-080": {
    "matches": 107,
    "runs": 3582,
    "strike_rate": 147.53,
    "batting_average": 38.11,
    "has_ipl_career": true
  },
  "p-081": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-082": {
    "matches": 4,
    "runs": 3,
    "strike_rate": 37.5,
    "batting_average": 1.5,
    "has_ipl_career": true
  },
  "p-083": {
    "matches": 24,
    "runs": 318,
    "strike_rate": 121.84,
    "batting_average": 19.88,
    "has_ipl_career": true
  },
  "p-084": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-085": {
    "matches": 29,
    "runs": 707,
    "strike_rate": 153.7,
    "batting_average": 41.59,
    "has_ipl_career": true
  },
  "p-086": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-087": {
    "matches": 171,
    "runs": 3850,
    "strike_rate": 121.03,
    "batting_average": 29.17,
    "has_ipl_career": true
  },
  "p-088": {
    "matches": 26,
    "runs": 360,
    "strike_rate": 148.76,
    "batting_average": 20,
    "has_ipl_career": true
  },
  "p-089": {
    "matches": 10,
    "runs": 163,
    "strike_rate": 155.24,
    "batting_average": 23.29,
    "has_ipl_career": true
  },
  "p-090": {
    "matches": 185,
    "runs": 4642,
    "strike_rate": 123.42,
    "batting_average": 30.14,
    "has_ipl_career": true
  },
  "p-091": {
    "matches": 19,
    "runs": 170,
    "strike_rate": 177.08,
    "batting_average": 28.33,
    "has_ipl_career": true
  },
  "p-092": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-093": {
    "matches": 45,
    "runs": 893,
    "strike_rate": 143.34,
    "batting_average": 30.79,
    "has_ipl_career": true
  },
  "p-094": {
    "matches": 95,
    "runs": 2236,
    "strike_rate": 139.75,
    "batting_average": 27.27,
    "has_ipl_career": true
  },
  "p-095": {
    "matches": 20,
    "runs": 1,
    "strike_rate": 25,
    "batting_average": 1,
    "has_ipl_career": true
  },
  "p-096": {
    "matches": 70,
    "runs": 25,
    "strike_rate": 55.56,
    "batting_average": 4.17,
    "has_ipl_career": true
  },
  "p-097": {
    "matches": 8,
    "runs": 17,
    "strike_rate": 141.67,
    "batting_average": 8.5,
    "has_ipl_career": true
  },
  "p-098": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-099": {
    "matches": 57,
    "runs": 13,
    "strike_rate": 61.9,
    "batting_average": 3.25,
    "has_ipl_career": true
  },
  "p-100": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-101": {
    "matches": 177,
    "runs": 1534,
    "strike_rate": 165.84,
    "batting_average": 17.04,
    "has_ipl_career": true
  },
  "p-102": {
    "matches": 20,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-103": {
    "matches": 21,
    "runs": 24,
    "strike_rate": 120,
    "batting_average": 8,
    "has_ipl_career": true
  },
  "p-104": {
    "matches": 32,
    "runs": 17,
    "strike_rate": 62.96,
    "batting_average": 5.67,
    "has_ipl_career": true
  },
  "p-105": {
    "matches": 2,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-106": {
    "matches": 19,
    "runs": 13,
    "strike_rate": 76.47,
    "batting_average": 4.33,
    "has_ipl_career": true
  },
  "p-107": {
    "matches": 26,
    "runs": 14,
    "strike_rate": 77.78,
    "batting_average": 7,
    "has_ipl_career": true
  },
  "p-108": {
    "matches": 10,
    "runs": 222,
    "strike_rate": 160.87,
    "batting_average": 22.2,
    "has_ipl_career": true
  },
  "p-109": {
    "matches": 11,
    "runs": 43,
    "strike_rate": 122.86,
    "batting_average": 14.33,
    "has_ipl_career": true
  },
  "p-110": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-111": {
    "matches": 3,
    "runs": 26,
    "strike_rate": 89.66,
    "batting_average": 8.67,
    "has_ipl_career": true
  },
  "p-112": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-113": {
    "matches": 42,
    "runs": 634,
    "strike_rate": 134.04,
    "batting_average": 24.38,
    "has_ipl_career": true
  },
  "p-114": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-115": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-116": {
    "matches": 2,
    "runs": 9,
    "strike_rate": 90,
    "batting_average": 4.5,
    "has_ipl_career": true
  },
  "p-117": {
    "matches": 44,
    "runs": 995,
    "strike_rate": 129.05,
    "batting_average": 31.09,
    "has_ipl_career": true
  },
  "p-118": {
    "matches": 42,
    "runs": 665,
    "strike_rate": 125,
    "batting_average": 19.56,
    "has_ipl_career": true
  },
  "p-119": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-120": {
    "matches": 50,
    "runs": 577,
    "strike_rate": 146.08,
    "batting_average": 19.23,
    "has_ipl_career": true
  },
  "p-121": {
    "matches": 1,
    "runs": 1,
    "strike_rate": 33.33,
    "batting_average": 1,
    "has_ipl_career": true
  },
  "p-122": {
    "matches": 63,
    "runs": 37,
    "strike_rate": 77.08,
    "batting_average": 6.17,
    "has_ipl_career": true
  },
  "p-123": {
    "matches": 24,
    "runs": 30,
    "strike_rate": 115.38,
    "batting_average": 10,
    "has_ipl_career": true
  },
  "p-124": {
    "matches": 46,
    "runs": 52,
    "strike_rate": 113.04,
    "batting_average": 8.67,
    "has_ipl_career": true
  },
  "p-125": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-126": {
    "matches": 110,
    "runs": 79,
    "strike_rate": 87.78,
    "batting_average": 5.64,
    "has_ipl_career": true
  },
  "p-127": {
    "matches": 3,
    "runs": 3,
    "strike_rate": 75,
    "batting_average": 3,
    "has_ipl_career": true
  },
  "p-128": {
    "matches": 7,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-129": {
    "matches": 5,
    "runs": 13,
    "strike_rate": 144.44,
    "batting_average": 13,
    "has_ipl_career": true
  },
  "p-130": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-131": {
    "matches": 4,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-132": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-133": {
    "matches": 26,
    "runs": 72,
    "strike_rate": 98.63,
    "batting_average": 7.2,
    "has_ipl_career": true
  },
  "p-134": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-135": {
    "matches": 55,
    "runs": 529,
    "strike_rate": 126.56,
    "batting_average": 17.63,
    "has_ipl_career": true
  },
  "p-136": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-137": {
    "matches": 111,
    "runs": 3284,
    "strike_rate": 148.93,
    "batting_average": 35.31,
    "has_ipl_career": true
  },
  "p-138": {
    "matches": 76,
    "runs": 1769,
    "strike_rate": 162.29,
    "batting_average": 32.76,
    "has_ipl_career": true
  },
  "p-139": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-140": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-141": {
    "matches": 7,
    "runs": 140,
    "strike_rate": 179.49,
    "batting_average": 20,
    "has_ipl_career": true
  },
  "p-142": {
    "matches": 8,
    "runs": 230,
    "strike_rate": 175.57,
    "batting_average": 32.86,
    "has_ipl_career": true
  },
  "p-143": {
    "matches": 40,
    "runs": 527,
    "strike_rate": 141.29,
    "batting_average": 18.82,
    "has_ipl_career": true
  },
  "p-144": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-145": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-146": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-147": {
    "matches": 11,
    "runs": 139,
    "strike_rate": 127.52,
    "batting_average": 15.44,
    "has_ipl_career": true
  },
  "p-148": {
    "matches": 257,
    "runs": 6628,
    "strike_rate": 131.14,
    "batting_average": 29.72,
    "has_ipl_career": true
  },
  "p-149": {
    "matches": 38,
    "runs": 1156,
    "strike_rate": 146.32,
    "batting_average": 39.86,
    "has_ipl_career": true
  },
  "p-150": {
    "matches": 150,
    "runs": 3594,
    "strike_rate": 145.33,
    "batting_average": 32.09,
    "has_ipl_career": true
  },
  "p-151": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-152": {
    "matches": 104,
    "runs": 28,
    "strike_rate": 71.79,
    "batting_average": 4.67,
    "has_ipl_career": true
  },
  "p-153": {
    "matches": 133,
    "runs": 69,
    "strike_rate": 65.71,
    "batting_average": 9.86,
    "has_ipl_career": true
  },
  "p-154": {
    "matches": 81,
    "runs": 80,
    "strike_rate": 135.59,
    "batting_average": 11.43,
    "has_ipl_career": true
  },
  "p-155": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-156": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-157": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-158": {
    "matches": 2,
    "runs": 1,
    "strike_rate": 50,
    "batting_average": 1,
    "has_ipl_career": true
  },
  "p-159": {
    "matches": 37,
    "runs": 34,
    "strike_rate": 82.93,
    "batting_average": 5.67,
    "has_ipl_career": true
  },
  "p-160": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-161": {
    "matches": 95,
    "runs": 307,
    "strike_rate": 140.18,
    "batting_average": 11.81,
    "has_ipl_career": true
  },
  "p-162": {
    "matches": 2,
    "runs": 11,
    "strike_rate": 78.57,
    "batting_average": 5.5,
    "has_ipl_career": true
  },
  "p-163": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-164": {
    "matches": 137,
    "runs": 2525,
    "strike_rate": 145.87,
    "batting_average": 28.69,
    "has_ipl_career": true
  },
  "p-165": {
    "matches": 18,
    "runs": 70,
    "strike_rate": 116.67,
    "batting_average": 14,
    "has_ipl_career": true
  },
  "p-166": {
    "matches": 107,
    "runs": 3157,
    "strike_rate": 134.23,
    "batting_average": 31.26,
    "has_ipl_career": true
  },
  "p-167": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-168": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-169": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-170": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-171": {
    "matches": 5,
    "runs": 23,
    "strike_rate": 115,
    "batting_average": 11.5,
    "has_ipl_career": true
  },
  "p-172": {
    "matches": 115,
    "runs": 3127,
    "strike_rate": 127.48,
    "batting_average": 32.24,
    "has_ipl_career": true
  },
  "p-173": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-174": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-175": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-176": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-177": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-178": {
    "matches": 24,
    "runs": 423,
    "strike_rate": 167.19,
    "batting_average": 38.45,
    "has_ipl_career": true
  },
  "p-179": {
    "matches": 96,
    "runs": 1866,
    "strike_rate": 142.01,
    "batting_average": 27.85,
    "has_ipl_career": true
  },
  "p-180": {
    "matches": 6,
    "runs": 56,
    "strike_rate": 119.15,
    "batting_average": 11.2,
    "has_ipl_career": true
  },
  "p-181": {
    "matches": 20,
    "runs": 350,
    "strike_rate": 146.44,
    "batting_average": 23.33,
    "has_ipl_career": true
  },
  "p-182": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-183": {
    "matches": 41,
    "runs": 234,
    "strike_rate": 118.78,
    "batting_average": 15.6,
    "has_ipl_career": true
  },
  "p-184": {
    "matches": 160,
    "runs": 37,
    "strike_rate": 43.53,
    "batting_average": 4.11,
    "has_ipl_career": true
  },
  "p-185": {
    "matches": 1,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-186": {
    "matches": 45,
    "runs": 76,
    "strike_rate": 146.15,
    "batting_average": 12.67,
    "has_ipl_career": true
  },
  "p-187": {
    "matches": 65,
    "runs": 24,
    "strike_rate": 63.16,
    "batting_average": 6,
    "has_ipl_career": true
  },
  "p-188": {
    "matches": 20,
    "runs": 1,
    "strike_rate": 50,
    "batting_average": 1,
    "has_ipl_career": true
  },
  "p-189": {
    "matches": 11,
    "runs": 14,
    "strike_rate": 116.67,
    "batting_average": 14,
    "has_ipl_career": true
  },
  "p-190": {
    "matches": 7,
    "runs": 42,
    "strike_rate": 102.44,
    "batting_average": 8.4,
    "has_ipl_career": true
  },
  "p-191": {
    "matches": 21,
    "runs": 69,
    "strike_rate": 115,
    "batting_average": 9.86,
    "has_ipl_career": true
  },
  "p-192": {
    "matches": 34,
    "runs": 756,
    "strike_rate": 150.3,
    "batting_average": 22.24,
    "has_ipl_career": true
  },
  "p-193": {
    "matches": 5,
    "runs": 45,
    "strike_rate": 136.36,
    "batting_average": 15,
    "has_ipl_career": true
  },
  "p-194": {
    "matches": 3,
    "runs": 16,
    "strike_rate": 106.67,
    "batting_average": 8,
    "has_ipl_career": true
  },
  "p-195": {
    "matches": 72,
    "runs": 1243,
    "strike_rate": 152.33,
    "batting_average": 31.08,
    "has_ipl_career": true
  },
  "p-196": {
    "matches": 52,
    "runs": 1607,
    "strike_rate": 150.61,
    "batting_average": 32.14,
    "has_ipl_career": true
  },
  "p-197": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-198": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-199": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-200": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-201": {
    "matches": 3,
    "runs": 26,
    "strike_rate": 100,
    "batting_average": 13,
    "has_ipl_career": true
  },
  "p-202": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-203": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-204": {
    "matches": 40,
    "runs": 195,
    "strike_rate": 157.26,
    "batting_average": 15,
    "has_ipl_career": true
  },
  "p-205": {
    "matches": 66,
    "runs": 23,
    "strike_rate": 60.53,
    "batting_average": 4.6,
    "has_ipl_career": true
  },
  "p-206": {
    "matches": 6,
    "runs": 1,
    "strike_rate": 50,
    "batting_average": 1,
    "has_ipl_career": true
  },
  "p-207": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-208": {
    "matches": 5,
    "runs": 8,
    "strike_rate": 160,
    "batting_average": 8,
    "has_ipl_career": true
  },
  "p-209": {
    "matches": 36,
    "runs": 23,
    "strike_rate": 79.31,
    "batting_average": 5.75,
    "has_ipl_career": true
  },
  "p-210": {
    "matches": 2,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-211": {
    "matches": 10,
    "runs": 23,
    "strike_rate": 100,
    "batting_average": 7.67,
    "has_ipl_career": true
  },
  "p-212": {
    "matches": 2,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-213": {
    "matches": 12,
    "runs": 2,
    "strike_rate": 28.57,
    "batting_average": 1,
    "has_ipl_career": true
  },
  "p-214": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-215": {
    "matches": 127,
    "runs": 53,
    "strike_rate": 77.94,
    "batting_average": 6.63,
    "has_ipl_career": true
  },
  "p-216": {
    "matches": 59,
    "runs": 883,
    "strike_rate": 135.43,
    "batting_average": 23.86,
    "has_ipl_career": true
  },
  "p-217": {
    "matches": 69,
    "runs": 1173,
    "strike_rate": 135.45,
    "batting_average": 24.96,
    "has_ipl_career": true
  },
  "p-218": {
    "matches": 240,
    "runs": 2959,
    "strike_rate": 129.5,
    "batting_average": 27.4,
    "has_ipl_career": true
  },
  "p-219": {
    "matches": 28,
    "runs": 347,
    "strike_rate": 151.53,
    "batting_average": 21.69,
    "has_ipl_career": true
  },
  "p-220": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-221": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-222": {
    "matches": 38,
    "runs": 659,
    "strike_rate": 170.28,
    "batting_average": 31.38,
    "has_ipl_career": true
  },
  "p-223": {
    "matches": 50,
    "runs": 1326,
    "strike_rate": 137.13,
    "batting_average": 31.57,
    "has_ipl_career": true
  },
  "p-224": {
    "matches": 252,
    "runs": 8004,
    "strike_rate": 131.97,
    "batting_average": 38.67,
    "has_ipl_career": true
  },
  "p-225": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-226": {
    "matches": 65,
    "runs": 1568,
    "strike_rate": 122.21,
    "batting_average": 24.12,
    "has_ipl_career": true
  },
  "p-227": {
    "matches": 27,
    "runs": 799,
    "strike_rate": 158.85,
    "batting_average": 34.74,
    "has_ipl_career": true
  },
  "p-228": {
    "matches": 21,
    "runs": 653,
    "strike_rate": 175.54,
    "batting_average": 36.28,
    "has_ipl_career": true
  },
  "p-229": {
    "matches": 14,
    "runs": 65,
    "strike_rate": 151.16,
    "batting_average": 16.25,
    "has_ipl_career": true
  },
  "p-230": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-231": {
    "matches": 11,
    "runs": 24,
    "strike_rate": 109.09,
    "batting_average": 12,
    "has_ipl_career": true
  },
  "p-232": {
    "matches": 28,
    "runs": 1,
    "strike_rate": 25,
    "batting_average": 1,
    "has_ipl_career": true
  },
  "p-233": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-234": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-235": {
    "matches": 2,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-236": {
    "matches": 27,
    "runs": 20,
    "strike_rate": 71.43,
    "batting_average": 6.67,
    "has_ipl_career": true
  },
  "p-237": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-238": {
    "matches": 13,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-239": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-240": {
    "matches": 7,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": true
  },
  "p-241": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-242": {
    "matches": 176,
    "runs": 306,
    "strike_rate": 99.03,
    "batting_average": 8.05,
    "has_ipl_career": true
  },
  "p-243": {
    "matches": 127,
    "runs": 1647,
    "strike_rate": 132.82,
    "batting_average": 21.67,
    "has_ipl_career": true
  },
  "p-244": {
    "matches": 10,
    "runs": 115,
    "strike_rate": 221.15,
    "batting_average": 28.75,
    "has_ipl_career": true
  },
  "p-245": {
    "matches": 40,
    "runs": 730,
    "strike_rate": 151.14,
    "batting_average": 22.81,
    "has_ipl_career": true
  },
  "p-246": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-247": {
    "matches": 25,
    "runs": 772,
    "strike_rate": 168.93,
    "batting_average": 35.09,
    "has_ipl_career": true
  },
  "p-248": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-249": {
    "matches": 39,
    "runs": 939,
    "strike_rate": 162.46,
    "batting_average": 28.45,
    "has_ipl_career": true
  },
  "p-250": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-251": {
    "matches": 63,
    "runs": 1377,
    "strike_rate": 155.07,
    "batting_average": 25.5,
    "has_ipl_career": true
  },
  "p-252": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-253": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-254": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-255": {
    "matches": 10,
    "runs": 14,
    "strike_rate": 127.27,
    "batting_average": 4.67,
    "has_ipl_career": true
  },
  "p-256": {
    "matches": 58,
    "runs": 515,
    "strike_rate": 152.37,
    "batting_average": 18.39,
    "has_ipl_career": true
  },
  "p-257": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-258": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-259": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-260": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-261": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-262": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-263": {
    "matches": 32,
    "runs": 54,
    "strike_rate": 88.52,
    "batting_average": 6.75,
    "has_ipl_career": true
  },
  "p-264": {
    "matches": 105,
    "runs": 248,
    "strike_rate": 122.17,
    "batting_average": 10.78,
    "has_ipl_career": true
  },
  "p-265": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-266": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-267": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-268": {
    "matches": 105,
    "runs": 129,
    "strike_rate": 110.26,
    "batting_average": 9.92,
    "has_ipl_career": true
  },
  "p-269": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-270": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-271": {
    "matches": 15,
    "runs": 303,
    "strike_rate": 142.92,
    "batting_average": 33.67,
    "has_ipl_career": true
  },
  "p-272": {
    "matches": 0,
    "runs": 0,
    "strike_rate": 0,
    "batting_average": 0,
    "has_ipl_career": false
  },
  "p-273": {
    "matches": 105,
    "runs": 2644,
    "strike_rate": 135.87,
    "batting_average": 28.43,
    "has_ipl_career": true
  },
  "p-274": {
    "matches": 35,
    "runs": 993,
    "strike_rate": 168.31,
    "batting_average": 39.72,
    "has_ipl_career": true
  }
};

/**
 * Common Aliases & Name Variants mapping to canonical database names
 */
export const PLAYER_ALIASES: Record<string, string> = {
  'MS Dhoni': 'Mahendra Singh Dhoni',
  'M.S. Dhoni': 'Mahendra Singh Dhoni',
  'T Natarajan': 'Thangarasu Natarajan',
  'T. Natarajan': 'Thangarasu Natarajan',
  'Mitch Marsh': 'Mitchell Marsh',
  'Mitchell Marsh': 'Mitch Marsh',
  'Mitch Santner': 'Mitchell Santner',
  'Mitchell Santner': 'Mitch Santner',
  'Sai Kishore': 'Ravisrinivasan Sai Kishore',
  'Ravisrinivasan Sai Kishore': 'Sai Kishore',
  'Sai Sudharsan': 'Bhardwaj Sai Sudharsan',
  'Bhardwaj Sai Sudharsan': 'Sai Sudharsan',
  'Abhishek Porel': 'Abishek Porel',
  'Abishek Porel': 'Abhishek Porel',
  'Vaibhav Suryavanshi': 'Vaibhav Sooryavanshi',
  'Vaibhav Sooryavanshi': 'Vaibhav Suryavanshi',
};

/**
 * Historical Overall IPL Career Statistics by Player Name
 */
export const HISTORICAL_IPL_CAREER_BY_NAME: Record<string, IplCareerStats> = {
  "Dewald Brevis": HISTORICAL_IPL_CAREER_BY_ID["p-001"],
  "Ruturaj Gaikwad": HISTORICAL_IPL_CAREER_BY_ID["p-002"],
  "Ramakrishna Ghosh": HISTORICAL_IPL_CAREER_BY_ID["p-003"],
  "Aman Khan": HISTORICAL_IPL_CAREER_BY_ID["p-004"],
  "Sarfaraz Khan": HISTORICAL_IPL_CAREER_BY_ID["p-005"],
  "Ayush Mhatre": HISTORICAL_IPL_CAREER_BY_ID["p-006"],
  "Macneil Noronha": HISTORICAL_IPL_CAREER_BY_ID["p-007"],
  "Kartik Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-008"],
  "Matt Short": HISTORICAL_IPL_CAREER_BY_ID["p-009"],
  "Prashant Veer": HISTORICAL_IPL_CAREER_BY_ID["p-010"],
  "Khaleel Ahmed": HISTORICAL_IPL_CAREER_BY_ID["p-011"],
  "Rahul Chahar": HISTORICAL_IPL_CAREER_BY_ID["p-012"],
  "Mukesh Choudhary": HISTORICAL_IPL_CAREER_BY_ID["p-013"],
  "Nathan Ellis": HISTORICAL_IPL_CAREER_BY_ID["p-014"],
  "Matt Henry": HISTORICAL_IPL_CAREER_BY_ID["p-015"],
  "Akeal Hosein": HISTORICAL_IPL_CAREER_BY_ID["p-016"],
  "Spencer Johnson": HISTORICAL_IPL_CAREER_BY_ID["p-017"],
  "Anshul Kamboj": HISTORICAL_IPL_CAREER_BY_ID["p-018"],
  "Akash Madhwal": HISTORICAL_IPL_CAREER_BY_ID["p-019"],
  "Noor Ahmad": HISTORICAL_IPL_CAREER_BY_ID["p-020"],
  "Gurjapneet Singh": HISTORICAL_IPL_CAREER_BY_ID["p-021"],
  "Kuldip Yadav": HISTORICAL_IPL_CAREER_BY_ID["p-022"],
  "Shivam Dube": HISTORICAL_IPL_CAREER_BY_ID["p-023"],
  "Dian Forrester": HISTORICAL_IPL_CAREER_BY_ID["p-024"],
  "Zak Foulkes": HISTORICAL_IPL_CAREER_BY_ID["p-025"],
  "Shreyas Gopal": HISTORICAL_IPL_CAREER_BY_ID["p-026"],
  "Jamie Overton": HISTORICAL_IPL_CAREER_BY_ID["p-027"],
  "Mahendra Singh Dhoni": HISTORICAL_IPL_CAREER_BY_ID["p-028"],
  "Urvil Patel": HISTORICAL_IPL_CAREER_BY_ID["p-029"],
  "Sanju Samson": HISTORICAL_IPL_CAREER_BY_ID["p-030"],
  "Rehan Ahmed": HISTORICAL_IPL_CAREER_BY_ID["p-031"],
  "Ben Duckett": HISTORICAL_IPL_CAREER_BY_ID["p-032"],
  "David Miller": HISTORICAL_IPL_CAREER_BY_ID["p-033"],
  "Karun Nair": HISTORICAL_IPL_CAREER_BY_ID["p-034"],
  "Sahil Parakh": HISTORICAL_IPL_CAREER_BY_ID["p-035"],
  "KL Rahul": HISTORICAL_IPL_CAREER_BY_ID["p-036"],
  "Nitish Rana": HISTORICAL_IPL_CAREER_BY_ID["p-037"],
  "Sameer Rizvi": HISTORICAL_IPL_CAREER_BY_ID["p-038"],
  "Ashutosh Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-039"],
  "Prithvi Shaw": HISTORICAL_IPL_CAREER_BY_ID["p-040"],
  "Pathum Nissanka": HISTORICAL_IPL_CAREER_BY_ID["p-041"],
  "Tristan Stubbs": HISTORICAL_IPL_CAREER_BY_ID["p-042"],
  "Madhav Tiwari": HISTORICAL_IPL_CAREER_BY_ID["p-043"],
  "Dushmantha Chameera": HISTORICAL_IPL_CAREER_BY_ID["p-044"],
  "Kyle Jamieson": HISTORICAL_IPL_CAREER_BY_ID["p-045"],
  "Mukesh Kumar": HISTORICAL_IPL_CAREER_BY_ID["p-046"],
  "Auqib Nabi Dar": HISTORICAL_IPL_CAREER_BY_ID["p-047"],
  "Thangarasu Natarajan": HISTORICAL_IPL_CAREER_BY_ID["p-048"],
  "Lungi Ngidi": HISTORICAL_IPL_CAREER_BY_ID["p-049"],
  "Vipraj Nigam": HISTORICAL_IPL_CAREER_BY_ID["p-050"],
  "Mitchell Starc": HISTORICAL_IPL_CAREER_BY_ID["p-051"],
  "Tripurana Vijay": HISTORICAL_IPL_CAREER_BY_ID["p-052"],
  "Kuldeep Yadav": HISTORICAL_IPL_CAREER_BY_ID["p-053"],
  "Ajay Mandal": HISTORICAL_IPL_CAREER_BY_ID["p-054"],
  "Axar Patel": HISTORICAL_IPL_CAREER_BY_ID["p-055"],
  "Abishek Porel": HISTORICAL_IPL_CAREER_BY_ID["p-056"],
  "Tom Banton": HISTORICAL_IPL_CAREER_BY_ID["p-057"],
  "Shubman Gill": HISTORICAL_IPL_CAREER_BY_ID["p-058"],
  "Glenn Phillips": HISTORICAL_IPL_CAREER_BY_ID["p-059"],
  "Sai Sudharsan": HISTORICAL_IPL_CAREER_BY_ID["p-060"],
  "Shahrukh Khan": HISTORICAL_IPL_CAREER_BY_ID["p-061"],
  "Nishant Sindhu": HISTORICAL_IPL_CAREER_BY_ID["p-062"],
  "Rahul Tewatia": HISTORICAL_IPL_CAREER_BY_ID["p-063"],
  "Arshad Khan": HISTORICAL_IPL_CAREER_BY_ID["p-064"],
  "Gurnoor Brar": HISTORICAL_IPL_CAREER_BY_ID["p-065"],
  "Kulwant Khejroliya": HISTORICAL_IPL_CAREER_BY_ID["p-066"],
  "Prasidh Krishna": HISTORICAL_IPL_CAREER_BY_ID["p-067"],
  "Yarra Prithviraj": HISTORICAL_IPL_CAREER_BY_ID["p-068"],
  "Kagiso Rabada": HISTORICAL_IPL_CAREER_BY_ID["p-069"],
  "Rashid Khan": HISTORICAL_IPL_CAREER_BY_ID["p-070"],
  "Sai Kishore": HISTORICAL_IPL_CAREER_BY_ID["p-071"],
  "Ashok Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-072"],
  "Ishant Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-073"],
  "Mohammed Siraj": HISTORICAL_IPL_CAREER_BY_ID["p-074"],
  "Manav Suthar": HISTORICAL_IPL_CAREER_BY_ID["p-075"],
  "Luke Wood": HISTORICAL_IPL_CAREER_BY_ID["p-076"],
  "Jason Holder": HISTORICAL_IPL_CAREER_BY_ID["p-077"],
  "Washington Sundar": HISTORICAL_IPL_CAREER_BY_ID["p-078"],
  "Jayant Yadav": HISTORICAL_IPL_CAREER_BY_ID["p-079"],
  "Jos Buttler": HISTORICAL_IPL_CAREER_BY_ID["p-080"],
  "Connor Esterhuizen": HISTORICAL_IPL_CAREER_BY_ID["p-081"],
  "Kumar Kushagra": HISTORICAL_IPL_CAREER_BY_ID["p-082"],
  "Anuj Rawat": HISTORICAL_IPL_CAREER_BY_ID["p-083"],
  "Finn Allen": HISTORICAL_IPL_CAREER_BY_ID["p-084"],
  "Cameron Green": HISTORICAL_IPL_CAREER_BY_ID["p-085"],
  "Daksh Kamra": HISTORICAL_IPL_CAREER_BY_ID["p-086"],
  "Manish Pandey": HISTORICAL_IPL_CAREER_BY_ID["p-087"],
  "Rovman Powell": HISTORICAL_IPL_CAREER_BY_ID["p-088"],
  "Angkrish Raghuvanshi": HISTORICAL_IPL_CAREER_BY_ID["p-089"],
  "Ajinkya Rahane": HISTORICAL_IPL_CAREER_BY_ID["p-090"],
  "Ramandeep Singh": HISTORICAL_IPL_CAREER_BY_ID["p-091"],
  "Sarthak Ranjan": HISTORICAL_IPL_CAREER_BY_ID["p-092"],
  "Rinku Singh": HISTORICAL_IPL_CAREER_BY_ID["p-093"],
  "Rahul Tripathi": HISTORICAL_IPL_CAREER_BY_ID["p-094"],
  "Vaibhav Arora": HISTORICAL_IPL_CAREER_BY_ID["p-095"],
  "Varun Chakravarthy": HISTORICAL_IPL_CAREER_BY_ID["p-096"],
  "Akash Deep": HISTORICAL_IPL_CAREER_BY_ID["p-097"],
  "Saurabh Dubey": HISTORICAL_IPL_CAREER_BY_ID["p-098"],
  "Mustafizur Rahman": HISTORICAL_IPL_CAREER_BY_ID["p-099"],
  "Blessing Muzarabani": HISTORICAL_IPL_CAREER_BY_ID["p-100"],
  "Sunil Narine": HISTORICAL_IPL_CAREER_BY_ID["p-101"],
  "Matheesha Pathirana": HISTORICAL_IPL_CAREER_BY_ID["p-102"],
  "Harshit Rana": HISTORICAL_IPL_CAREER_BY_ID["p-103"],
  "Navdeep Saini": HISTORICAL_IPL_CAREER_BY_ID["p-104"],
  "Prashant Solanki": HISTORICAL_IPL_CAREER_BY_ID["p-105"],
  "Kartik Tyagi": HISTORICAL_IPL_CAREER_BY_ID["p-106"],
  "Umran Malik": HISTORICAL_IPL_CAREER_BY_ID["p-107"],
  "Rachin Ravindra": HISTORICAL_IPL_CAREER_BY_ID["p-108"],
  "Anukul Roy": HISTORICAL_IPL_CAREER_BY_ID["p-109"],
  "Tejasvi Dahiya": HISTORICAL_IPL_CAREER_BY_ID["p-110"],
  "Tim Seifert": HISTORICAL_IPL_CAREER_BY_ID["p-111"],
  "Luvnith Sisodia": HISTORICAL_IPL_CAREER_BY_ID["p-112"],
  "Ayush Badoni": HISTORICAL_IPL_CAREER_BY_ID["p-113"],
  "Matthew Breetzke": HISTORICAL_IPL_CAREER_BY_ID["p-114"],
  "Mukul Choudhary": HISTORICAL_IPL_CAREER_BY_ID["p-115"],
  "Arshin Kulkarni": HISTORICAL_IPL_CAREER_BY_ID["p-116"],
  "Aiden Markram": HISTORICAL_IPL_CAREER_BY_ID["p-117"],
  "Mitch Marsh": HISTORICAL_IPL_CAREER_BY_ID["p-118"],
  "Akshat Raghuwanshi": HISTORICAL_IPL_CAREER_BY_ID["p-119"],
  "Abdul Samad": HISTORICAL_IPL_CAREER_BY_ID["p-120"],
  "Himmat Singh": HISTORICAL_IPL_CAREER_BY_ID["p-121"],
  "Avesh Khan": HISTORICAL_IPL_CAREER_BY_ID["p-122"],
  "Mohsin Khan": HISTORICAL_IPL_CAREER_BY_ID["p-123"],
  "Anrich Nortje": HISTORICAL_IPL_CAREER_BY_ID["p-124"],
  "Digvesh Singh Rathi": HISTORICAL_IPL_CAREER_BY_ID["p-125"],
  "Mohammed Shami": HISTORICAL_IPL_CAREER_BY_ID["p-126"],
  "Manimaran Siddharth": HISTORICAL_IPL_CAREER_BY_ID["p-127"],
  "Akash Singh": HISTORICAL_IPL_CAREER_BY_ID["p-128"],
  "Arjun Tendulkar": HISTORICAL_IPL_CAREER_BY_ID["p-129"],
  "Naman Tiwari": HISTORICAL_IPL_CAREER_BY_ID["p-130"],
  "Mayank Yadav": HISTORICAL_IPL_CAREER_BY_ID["p-131"],
  "Prince Yadav": HISTORICAL_IPL_CAREER_BY_ID["p-132"],
  "Wanindu Hasaranga": HISTORICAL_IPL_CAREER_BY_ID["p-133"],
  "George Linde": HISTORICAL_IPL_CAREER_BY_ID["p-134"],
  "Shahbaz Ahmed": HISTORICAL_IPL_CAREER_BY_ID["p-135"],
  "Josh Inglis": HISTORICAL_IPL_CAREER_BY_ID["p-136"],
  "Rishabh Pant": HISTORICAL_IPL_CAREER_BY_ID["p-137"],
  "Nicholas Pooran": HISTORICAL_IPL_CAREER_BY_ID["p-138"],
  "Ruchit Ahir": HISTORICAL_IPL_CAREER_BY_ID["p-139"],
  "Krish Bhagat": HISTORICAL_IPL_CAREER_BY_ID["p-140"],
  "Naman Dhir": HISTORICAL_IPL_CAREER_BY_ID["p-141"],
  "Will Jacks": HISTORICAL_IPL_CAREER_BY_ID["p-142"],
  "Mahipal Lomror": HISTORICAL_IPL_CAREER_BY_ID["p-143"],
  "Danish Malewar": HISTORICAL_IPL_CAREER_BY_ID["p-144"],
  "Robin Minz": HISTORICAL_IPL_CAREER_BY_ID["p-145"],
  "Mayank Rawat": HISTORICAL_IPL_CAREER_BY_ID["p-146"],
  "Sherfane Rutherford": HISTORICAL_IPL_CAREER_BY_ID["p-147"],
  "Rohit Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-148"],
  "Tilak Varma": HISTORICAL_IPL_CAREER_BY_ID["p-149"],
  "Suryakumar Yadav": HISTORICAL_IPL_CAREER_BY_ID["p-150"],
  "Atharva Ankolekar": HISTORICAL_IPL_CAREER_BY_ID["p-151"],
  "Trent Boult": HISTORICAL_IPL_CAREER_BY_ID["p-152"],
  "Jasprit Bumrah": HISTORICAL_IPL_CAREER_BY_ID["p-153"],
  "Deepak Chahar": HISTORICAL_IPL_CAREER_BY_ID["p-154"],
  "AM Ghazanfar": HISTORICAL_IPL_CAREER_BY_ID["p-155"],
  "Mohammed Izhar": HISTORICAL_IPL_CAREER_BY_ID["p-156"],
  "Ashwani Kumar": HISTORICAL_IPL_CAREER_BY_ID["p-157"],
  "Keshav Maharaj": HISTORICAL_IPL_CAREER_BY_ID["p-158"],
  "Mayank Markande": HISTORICAL_IPL_CAREER_BY_ID["p-159"],
  "Raghu Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-160"],
  "Shardul Thakur": HISTORICAL_IPL_CAREER_BY_ID["p-161"],
  "Raj Bawa": HISTORICAL_IPL_CAREER_BY_ID["p-162"],
  "Corbin Bosch": HISTORICAL_IPL_CAREER_BY_ID["p-163"],
  "Hardik Pandya": HISTORICAL_IPL_CAREER_BY_ID["p-164"],
  "Mitch Santner": HISTORICAL_IPL_CAREER_BY_ID["p-165"],
  "Quinton de Kock": HISTORICAL_IPL_CAREER_BY_ID["p-166"],
  "Ryan Rickelton": HISTORICAL_IPL_CAREER_BY_ID["p-167"],
  "Priyansh Arya": HISTORICAL_IPL_CAREER_BY_ID["p-168"],
  "Pyla Avinash": HISTORICAL_IPL_CAREER_BY_ID["p-169"],
  "Cooper Connolly": HISTORICAL_IPL_CAREER_BY_ID["p-170"],
  "Praveen Dubey": HISTORICAL_IPL_CAREER_BY_ID["p-171"],
  "Shreyas Iyer": HISTORICAL_IPL_CAREER_BY_ID["p-172"],
  "Musheer Khan": HISTORICAL_IPL_CAREER_BY_ID["p-173"],
  "Vishal Nishad": HISTORICAL_IPL_CAREER_BY_ID["p-174"],
  "Mitch Owen": HISTORICAL_IPL_CAREER_BY_ID["p-175"],
  "Suryansh Shedge": HISTORICAL_IPL_CAREER_BY_ID["p-176"],
  "Harnoor Singh": HISTORICAL_IPL_CAREER_BY_ID["p-177"],
  "Shashank Singh": HISTORICAL_IPL_CAREER_BY_ID["p-178"],
  "Marcus Stoinis": HISTORICAL_IPL_CAREER_BY_ID["p-179"],
  "Vishnu Vinod": HISTORICAL_IPL_CAREER_BY_ID["p-180"],
  "Nehal Wadhera": HISTORICAL_IPL_CAREER_BY_ID["p-181"],
  "Xavier Bartlett": HISTORICAL_IPL_CAREER_BY_ID["p-182"],
  "Harpreet Brar": HISTORICAL_IPL_CAREER_BY_ID["p-183"],
  "Yuzvendra Chahal": HISTORICAL_IPL_CAREER_BY_ID["p-184"],
  "Ben Dwarshuis": HISTORICAL_IPL_CAREER_BY_ID["p-185"],
  "Lockie Ferguson": HISTORICAL_IPL_CAREER_BY_ID["p-186"],
  "Arshdeep Singh": HISTORICAL_IPL_CAREER_BY_ID["p-187"],
  "Yash Thakur": HISTORICAL_IPL_CAREER_BY_ID["p-188"],
  "Vijaykumar Vyshak": HISTORICAL_IPL_CAREER_BY_ID["p-189"],
  "Azmatullah Omarzai": HISTORICAL_IPL_CAREER_BY_ID["p-190"],
  "Marco Jansen": HISTORICAL_IPL_CAREER_BY_ID["p-191"],
  "Prabhsimran Singh": HISTORICAL_IPL_CAREER_BY_ID["p-192"],
  "Shubham Dubey": HISTORICAL_IPL_CAREER_BY_ID["p-193"],
  "Donovan Ferreira": HISTORICAL_IPL_CAREER_BY_ID["p-194"],
  "Shimron Hetmyer": HISTORICAL_IPL_CAREER_BY_ID["p-195"],
  "Yashasvi Jaiswal": HISTORICAL_IPL_CAREER_BY_ID["p-196"],
  "Aman Rao": HISTORICAL_IPL_CAREER_BY_ID["p-197"],
  "Lhuan-dré Pretorius": HISTORICAL_IPL_CAREER_BY_ID["p-198"],
  "Yash Punja": HISTORICAL_IPL_CAREER_BY_ID["p-199"],
  "Vignesh Puthur": HISTORICAL_IPL_CAREER_BY_ID["p-200"],
  "Dasun Shanaka": HISTORICAL_IPL_CAREER_BY_ID["p-201"],
  "Ravi Singh": HISTORICAL_IPL_CAREER_BY_ID["p-202"],
  "Vaibhav Sooryavanshi": HISTORICAL_IPL_CAREER_BY_ID["p-203"],
  "Jofra Archer": HISTORICAL_IPL_CAREER_BY_ID["p-204"],
  "Ravi Bishnoi": HISTORICAL_IPL_CAREER_BY_ID["p-205"],
  "Nandre Burger": HISTORICAL_IPL_CAREER_BY_ID["p-206"],
  "Emanjot Singh Chahal": HISTORICAL_IPL_CAREER_BY_ID["p-207"],
  "Yudhvir Singh Charak": HISTORICAL_IPL_CAREER_BY_ID["p-208"],
  "Tushar Deshpande": HISTORICAL_IPL_CAREER_BY_ID["p-209"],
  "Kwena Maphaka": HISTORICAL_IPL_CAREER_BY_ID["p-210"],
  "Adam Milne": HISTORICAL_IPL_CAREER_BY_ID["p-211"],
  "Sushant Mishra": HISTORICAL_IPL_CAREER_BY_ID["p-212"],
  "Kuldeep Sen": HISTORICAL_IPL_CAREER_BY_ID["p-213"],
  "Brijesh Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-214"],
  "Sandeep Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-215"],
  "Sam Curran": HISTORICAL_IPL_CAREER_BY_ID["p-216"],
  "Riyan Parag": HISTORICAL_IPL_CAREER_BY_ID["p-217"],
  "Ravindra Jadeja": HISTORICAL_IPL_CAREER_BY_ID["p-218"],
  "Dhruv Jurel": HISTORICAL_IPL_CAREER_BY_ID["p-219"],
  "Jacob Bethell": HISTORICAL_IPL_CAREER_BY_ID["p-220"],
  "Jordan Cox": HISTORICAL_IPL_CAREER_BY_ID["p-221"],
  "Tim David": HISTORICAL_IPL_CAREER_BY_ID["p-222"],
  "Venkatesh Iyer": HISTORICAL_IPL_CAREER_BY_ID["p-223"],
  "Virat Kohli": HISTORICAL_IPL_CAREER_BY_ID["p-224"],
  "Vihaan Malhotra": HISTORICAL_IPL_CAREER_BY_ID["p-225"],
  "Devdutt Padikkal": HISTORICAL_IPL_CAREER_BY_ID["p-226"],
  "Rajat Patidar": HISTORICAL_IPL_CAREER_BY_ID["p-227"],
  "Phil Salt": HISTORICAL_IPL_CAREER_BY_ID["p-228"],
  "Swapnil Singh": HISTORICAL_IPL_CAREER_BY_ID["p-229"],
  "Kanishk Chouhan": HISTORICAL_IPL_CAREER_BY_ID["p-230"],
  "Rasikh Dar": HISTORICAL_IPL_CAREER_BY_ID["p-231"],
  "Yash Dayal": HISTORICAL_IPL_CAREER_BY_ID["p-232"],
  "Satvik Deswal": HISTORICAL_IPL_CAREER_BY_ID["p-233"],
  "Jacob Duffy": HISTORICAL_IPL_CAREER_BY_ID["p-234"],
  "Richard Gleeson": HISTORICAL_IPL_CAREER_BY_ID["p-235"],
  "Josh Hazlewood": HISTORICAL_IPL_CAREER_BY_ID["p-236"],
  "Vicky Ostwal": HISTORICAL_IPL_CAREER_BY_ID["p-237"],
  "Suyash Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-238"],
  "Abhinandan Singh": HISTORICAL_IPL_CAREER_BY_ID["p-239"],
  "Nuwan Thushara": HISTORICAL_IPL_CAREER_BY_ID["p-240"],
  "Mangesh Yadav": HISTORICAL_IPL_CAREER_BY_ID["p-241"],
  "Bhuvneshwar Kumar": HISTORICAL_IPL_CAREER_BY_ID["p-242"],
  "Krunal Pandya": HISTORICAL_IPL_CAREER_BY_ID["p-243"],
  "Romario Shepherd": HISTORICAL_IPL_CAREER_BY_ID["p-244"],
  "Jitesh Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-245"],
  "RS Ambrish": HISTORICAL_IPL_CAREER_BY_ID["p-246"],
  "Travis Head": HISTORICAL_IPL_CAREER_BY_ID["p-247"],
  "Shivang Kumar": HISTORICAL_IPL_CAREER_BY_ID["p-248"],
  "Liam Livingstone": HISTORICAL_IPL_CAREER_BY_ID["p-249"],
  "Kamindu Mendis": HISTORICAL_IPL_CAREER_BY_ID["p-250"],
  "Abhishek Sharma": HISTORICAL_IPL_CAREER_BY_ID["p-251"],
  "Ravichandran Smaran": HISTORICAL_IPL_CAREER_BY_ID["p-252"],
  "Aniket Verma": HISTORICAL_IPL_CAREER_BY_ID["p-253"],
  "Zeeshan Ansari": HISTORICAL_IPL_CAREER_BY_ID["p-254"],
  "Gerald Coetzee": HISTORICAL_IPL_CAREER_BY_ID["p-255"],
  "Pat Cummins": HISTORICAL_IPL_CAREER_BY_ID["p-256"],
  "Eshan Malinga": HISTORICAL_IPL_CAREER_BY_ID["p-257"],
  "Harsh Dubey": HISTORICAL_IPL_CAREER_BY_ID["p-258"],
  "Krains Fuletra": HISTORICAL_IPL_CAREER_BY_ID["p-259"],
  "Praful Hinge": HISTORICAL_IPL_CAREER_BY_ID["p-260"],
  "Amit Kumar": HISTORICAL_IPL_CAREER_BY_ID["p-261"],
  "Dilshan Madushanka": HISTORICAL_IPL_CAREER_BY_ID["p-262"],
  "Shivam Mavi": HISTORICAL_IPL_CAREER_BY_ID["p-263"],
  "Harshal Patel": HISTORICAL_IPL_CAREER_BY_ID["p-264"],
  "David Payne": HISTORICAL_IPL_CAREER_BY_ID["p-265"],
  "Sakib Hussain": HISTORICAL_IPL_CAREER_BY_ID["p-266"],
  "Onkar Tarmale": HISTORICAL_IPL_CAREER_BY_ID["p-267"],
  "Jaydev Unadkat": HISTORICAL_IPL_CAREER_BY_ID["p-268"],
  "Brydon Carse": HISTORICAL_IPL_CAREER_BY_ID["p-269"],
  "Jack Edwards": HISTORICAL_IPL_CAREER_BY_ID["p-270"],
  "Nitish Kumar Reddy": HISTORICAL_IPL_CAREER_BY_ID["p-271"],
  "Salil Arora": HISTORICAL_IPL_CAREER_BY_ID["p-272"],
  "Ishan Kishan": HISTORICAL_IPL_CAREER_BY_ID["p-273"],
  "Heinrich Klaasen": HISTORICAL_IPL_CAREER_BY_ID["p-274"],
  'MS Dhoni': HISTORICAL_IPL_CAREER_BY_ID['p-028'],
  'T Natarajan': HISTORICAL_IPL_CAREER_BY_ID['p-048'],
  'Mitchell Marsh': HISTORICAL_IPL_CAREER_BY_ID['p-118'],
  'Mitchell Santner': HISTORICAL_IPL_CAREER_BY_ID['p-165'],
  'Ravisrinivasan Sai Kishore': HISTORICAL_IPL_CAREER_BY_ID['p-071'],
  'Bhardwaj Sai Sudharsan': HISTORICAL_IPL_CAREER_BY_ID['p-060'],
};

/**
 * Returns recorded historical achievements for a player (if any).
 */
export function getPlayerAchievements(playerName: string): string[] {
  if (HISTORICAL_IPL_ACHIEVEMENTS[playerName]) {
    return HISTORICAL_IPL_ACHIEVEMENTS[playerName];
  }
  const alias = PLAYER_ALIASES[playerName];
  if (alias && HISTORICAL_IPL_ACHIEVEMENTS[alias]) {
    return HISTORICAL_IPL_ACHIEVEMENTS[alias];
  }
  return [];
}

/**
 * Backward compatibility dictionary mapping name to { stats, achievements }
 */
export const HISTORICAL_IPL_CAREER: Record<string, PlayerCareerData> = Object.keys(HISTORICAL_IPL_CAREER_BY_NAME).reduce(
  (acc, name) => {
    acc[name] = {
      stats: HISTORICAL_IPL_CAREER_BY_NAME[name],
      achievements: getPlayerAchievements(name),
    };
    return acc;
  },
  {} as Record<string, PlayerCareerData>
);

/**
 * Returns authoritative historical IPL career stats for a player.
 * Checks ID first, then canonical name, then alias mapping.
 * If the player has no IPL appearances (e.g. IPL Debutant), returns has_ipl_career: false.
 */
export function getIplCareerStats(
  playerOrIdentifier?: Player | string | { id?: string; name?: string; player_name?: string } | null
): IplCareerStats {
  if (!playerOrIdentifier) {
    return {
      matches: 0,
      runs: 0,
      strike_rate: 0,
      batting_average: 0,
      has_ipl_career: false,
    };
  }

  // 1. If object with id, check ID map first
  if (typeof playerOrIdentifier === 'object') {
    if (playerOrIdentifier.id && HISTORICAL_IPL_CAREER_BY_ID[playerOrIdentifier.id]) {
      return HISTORICAL_IPL_CAREER_BY_ID[playerOrIdentifier.id];
    }
    const name = playerOrIdentifier.name || (playerOrIdentifier as any).player_name;
    if (name) {
      return getIplCareerStats(name);
    }
  }

  // 2. If string
  if (typeof playerOrIdentifier === 'string') {
    const rawStr = playerOrIdentifier.trim();
    // Check if it's an ID like 'p-001'
    if (HISTORICAL_IPL_CAREER_BY_ID[rawStr]) {
      return HISTORICAL_IPL_CAREER_BY_ID[rawStr];
    }
    // Check by name
    if (HISTORICAL_IPL_CAREER_BY_NAME[rawStr]) {
      return HISTORICAL_IPL_CAREER_BY_NAME[rawStr];
    }
    // Check aliases
    const canonical = PLAYER_ALIASES[rawStr];
    if (canonical && HISTORICAL_IPL_CAREER_BY_NAME[canonical]) {
      return HISTORICAL_IPL_CAREER_BY_NAME[canonical];
    }
  }

  // Default for uncapped / debutant players with no IPL career matches yet
  return {
    matches: 0,
    runs: 0,
    strike_rate: 0,
    batting_average: 0,
    has_ipl_career: false,
  };
}


