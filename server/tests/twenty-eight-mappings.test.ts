import { describe, it, expect } from 'vitest';
import { ALL_PLAYERS, getPlayerById } from '../../src/shared/player-data';
import {
  resolvePlayerId,
  getIplCareerStats,
  getIplSeasonStats,
  PLAYER_ALIASES,
} from '../../src/shared/player-career-data';
import { GET as getPlayerStatsRoute } from '../../src/app/api/players/[id]/stats/route';
import { NextRequest } from 'next/server';

describe('IPL Auction 2027 — 28 Name Mappings & Dual Dataset Verification', () => {
  // Definition of the 28 mappings
  const MAPPINGS_28 = [
    {
      targetId: 'p-272',
      canonicalName: 'Salil Arora',
      team: 'Sunrisers Hyderabad',
      aliases: ['S Arora', 'S. Arora', 'Salil Arora'],
      expected2026Runs: 156,
      expected2026Inns: 11,
      expected2026Matches: 14,
    },
    {
      targetId: 'p-115',
      canonicalName: 'Mukul Choudhary',
      team: 'Lucknow Super Giants',
      aliases: ['MD Choudhary', 'M.D. Choudhary', 'Mukul Choudhary', 'Mukul'],
      expected2026Runs: 170,
      expected2026Inns: 10,
      expected2026Matches: 10,
    },
    {
      targetId: 'p-035',
      canonicalName: 'Sahil Parakh',
      team: 'Delhi Capitals',
      aliases: ['SU Parakh', 'S.U. Parakh', 'Sahil Parakh'],
      expected2026Runs: 46,
      expected2026Inns: 4,
      expected2026Matches: 4,
    },
    {
      targetId: 'p-125',
      canonicalName: 'Digvesh Singh Rathi',
      team: 'Lucknow Super Giants',
      aliases: ['DS Rathi', 'D.S. Rathi', 'Digvesh Rathi', 'Digvesh Singh Rathi'],
      expected2026Wkts: 5,
      expected2026Matches: 10,
    },
    {
      targetId: 'p-116',
      canonicalName: 'Arshin Kulkarni',
      team: 'Lucknow Super Giants',
      aliases: ['AA Kulkarni', 'A.A. Kulkarni', 'Arshin Kulkarni'],
      expected2026Runs: 17,
      expected2026Matches: 2,
    },
    {
      targetId: 'p-050',
      canonicalName: 'Vipraj Nigam',
      team: 'Delhi Capitals',
      aliases: ['V Nigam', 'V. Nigam', 'Vipraj Nigam'],
      expected2026Wkts: 2,
      expected2026Matches: 5,
    },
    {
      targetId: 'p-047',
      canonicalName: 'Auqib Nabi Dar',
      team: 'Delhi Capitals',
      aliases: ['Auqib Nabi', 'Auqib Nabi Dar'],
      expected2026Matches: 5,
      expected2026Runs: 14,
    },
    {
      targetId: 'p-110',
      canonicalName: 'Tejasvi Dahiya',
      team: 'Kolkata Knight Riders',
      aliases: ['T Dahiya', 'T. Dahiya', 'Tejasvi Singh Dahiya', 'Tejasvi Dahiya'],
      expected2026Runs: 12,
      expected2026Matches: 2,
    },
    {
      targetId: 'p-198',
      canonicalName: 'Lhuan-dré Pretorius',
      team: 'Rajasthan Royals',
      aliases: ['LG Pretorius', 'L.G. Pretorius', 'Lhuan-dre Pretorius', 'Lhuan-dré Pretorius'],
      expected2026Runs: 7,
      expected2026Matches: 2,
    },
    {
      targetId: 'p-144',
      canonicalName: 'Danish Malewar',
      team: 'Mumbai Indians',
      aliases: ['DV Malewar', 'D.V. Malewar', 'Danish Malewar'],
      expected2026Runs: 2,
      expected2026Matches: 2,
    },
    {
      targetId: 'p-003',
      canonicalName: 'Ramakrishna Ghosh',
      team: 'Chennai Super Kings',
      aliases: ['RS Ghosh', 'R.S. Ghosh', 'Ramakrishna Ghosh'],
      expected2026Wkts: 1,
      expected2026Matches: 1,
    },
    {
      targetId: 'p-127',
      canonicalName: 'Manimaran Siddharth',
      team: 'Lucknow Super Giants',
      aliases: ['M Siddharth', 'M. Siddharth', 'Manimaran Siddharth'],
      expected2026Wkts: 6,
      expected2026Matches: 4,
    },
    {
      targetId: 'p-252',
      canonicalName: 'Ravichandran Smaran',
      team: 'Sunrisers Hyderabad',
      aliases: ['R Smaran', 'R. Smaran', 'Smaran R', 'Ravichandran Smaran'],
      expected2026Runs: 19,
      expected2026Matches: 6,
    },
    {
      targetId: 'p-199',
      canonicalName: 'Yash Punja',
      team: 'Rajasthan Royals',
      aliases: ['Yash Raj Punja', 'Yash Punja'],
      expected2026Wkts: 9,
      expected2026Matches: 8,
    },
    {
      targetId: 'p-231',
      canonicalName: 'Rasikh Dar',
      team: 'Royal Challengers Bengaluru',
      aliases: ['Rasikh Salam', 'Rasikh Salam Dar', 'Rasikh Dar'],
      expected2026Wkts: 19,
      expected2026Matches: 12,
    },
    {
      targetId: 'p-162',
      canonicalName: 'Raj Bawa',
      team: 'Mumbai Indians',
      aliases: ['RA Bawa', 'R.A. Bawa', 'Raj Angad Bawa', 'Raj Bawa'],
      expected2026Runs: 16,
      expected2026Wkts: 2,
      expected2026Matches: 3,
    },
    {
      targetId: 'p-203',
      canonicalName: 'Vaibhav Sooryavanshi',
      team: 'Rajasthan Royals',
      aliases: ['V Suryavanshi', 'Vaibhav Suryavanshi', 'Vaibhav Sooryavanshi'],
      expected2026Runs: 776,
      expected2026Matches: 16,
    },
    {
      targetId: 'p-118',
      canonicalName: 'Mitch Marsh',
      team: 'Lucknow Super Giants',
      aliases: ['MR Marsh', 'Mitchell Marsh', 'Mitch Marsh'],
      expected2026Runs: 563,
      expected2026Matches: 13,
    },
    {
      targetId: 'p-192',
      canonicalName: 'Prabhsimran Singh',
      team: 'Punjab Kings',
      aliases: ['P Simran Singh', 'Simran Singh', 'Prabhsimran Singh'],
      expected2026Runs: 510,
      expected2026Matches: 14,
    },
    {
      targetId: 'p-194',
      canonicalName: 'Donovan Ferreira',
      team: 'Rajasthan Royals',
      aliases: ['D Ferreira', 'Donavon Ferreira', 'Donovan Ferreira'],
      expected2026Runs: 317,
      expected2026Matches: 15,
    },
    {
      targetId: 'p-138',
      canonicalName: 'Nicholas Pooran',
      team: 'Lucknow Super Giants',
      aliases: ['N Pooran', 'Nicolas Pooran', 'Nicholas Pooran'],
      expected2026Runs: 234,
      expected2026Matches: 14,
    },
    {
      targetId: 'p-228',
      canonicalName: 'Phil Salt',
      team: 'Royal Challengers Bengaluru',
      aliases: ['PD Salt', 'Philip Salt', 'Phil Salt'],
      expected2026Runs: 202,
      expected2026Matches: 6,
    },
    {
      targetId: 'p-009',
      canonicalName: 'Matt Short',
      team: 'Chennai Super Kings',
      aliases: ['MW Short', 'Matthew Short', 'Matt Short'],
      expected2026Runs: 60,
      expected2026Matches: 3,
    },
    {
      targetId: 'p-109',
      canonicalName: 'Anukul Roy',
      team: 'Kolkata Knight Riders',
      aliases: ['AS Roy', 'Anukul Roy priyansh Kumar', 'Anukul Roy'],
      expected2026Wkts: 9,
      expected2026Runs: 52,
      expected2026Matches: 14,
    },
    {
      targetId: 'p-165',
      canonicalName: 'Mitch Santner',
      team: 'Mumbai Indians',
      aliases: ['MJ Santner', 'Mitchell Santner', 'Mitch Santner'],
      expected2026Wkts: 5,
      expected2026Runs: 26,
      expected2026Matches: 4,
    },
    {
      targetId: 'p-071',
      canonicalName: 'Sai Kishore',
      team: 'Gujarat Titans',
      aliases: ['R Sai Kishore', 'Ravisrinivasan Sai Kishore', 'Sai Kishore'],
      expected2026Wkts: 1,
      expected2026Matches: 3,
    },
    {
      targetId: 'p-189',
      canonicalName: 'Vijaykumar Vyshak',
      team: 'Punjab Kings',
      aliases: ['Vyshak Vijay Kumar', 'Vijaykumar Vyshak'],
      expected2026Wkts: 9,
      expected2026Matches: 10,
    },
    {
      targetId: 'p-135',
      canonicalName: 'Shahbaz Ahmed',
      team: 'Lucknow Super Giants',
      aliases: ['Sahabaz Ahmed', 'Shahbaz Ahmed'],
      expected2026Runs: 58,
      expected2026Wkts: 5,
      expected2026Matches: 5,
    },
  ];

  describe('1. Name & Alias Resolution (All 28 Mappings)', () => {
    it('Verifies every alias in all 28 mappings resolves deterministically to the correct auction player ID', () => {
      for (const mapping of MAPPINGS_28) {
        // Direct ID match
        expect(resolvePlayerId(mapping.targetId)).toBe(mapping.targetId);

        // Canonical name match
        expect(resolvePlayerId(mapping.canonicalName)).toBe(mapping.targetId);

        // Alias matches
        for (const alias of mapping.aliases) {
          const resolved = resolvePlayerId(alias);
          expect(
            resolved,
            `Expected alias "${alias}" to resolve to "${mapping.targetId}" (${mapping.canonicalName})`
          ).toBe(mapping.targetId);
        }
      }
    });

    it('Verifies player metadata in database matches team and canonical name', () => {
      for (const mapping of MAPPINGS_28) {
        const player = getPlayerById(mapping.targetId);
        expect(player).toBeDefined();
        expect(player!.player_name).toBe(mapping.canonicalName);
        expect(player!.team).toBe(mapping.team);
      }
    });
  });

  describe('2. Dual Statistics Separation for All 28 Mappings', () => {
    it('Ensures career stats and 2026 season stats remain strictly distinct without data bleeding', () => {
      for (const mapping of MAPPINGS_28) {
        const career = getIplCareerStats(mapping.targetId);
        const season = getIplSeasonStats(mapping.targetId);

        expect(career).toBeDefined();
        expect(season).toBeDefined();
        expect(season.season).toBe('2026');

        if (career.has_stats && season.has_stats) {
          expect(career.matches).toBeGreaterThanOrEqual(season.matches);
          if (career.runs !== undefined && season.runs !== undefined) {
            expect(career.runs).toBeGreaterThanOrEqual(season.runs);
          }
          if (career.wickets !== undefined && season.wickets !== undefined) {
            expect(career.wickets).toBeGreaterThanOrEqual(season.wickets);
          }
        }

        // Check specific known 2026 stat values
        if (mapping.expected2026Runs !== undefined) {
          expect(season.runs).toBe(mapping.expected2026Runs);
        }
        if (mapping.expected2026Wkts !== undefined) {
          expect(season.wickets).toBe(mapping.expected2026Wkts);
        }
        if (mapping.expected2026Matches !== undefined) {
          expect(season.matches).toBe(mapping.expected2026Matches);
        }
      }
    });
  });

  describe('3. P Dubey Identity Preservation & Anti-Conflation', () => {
    it('Preserves Praveen Dubey (p-171) without guessing and with zero 2026 appearances', () => {
      // 1. Praveen Dubey (p-171) in PBKS
      const praveen = getPlayerById('p-171');
      expect(praveen).toBeDefined();
      expect(praveen!.player_name).toBe('Praveen Dubey');
      expect(praveen!.team).toBe('Punjab Kings');

      // Alias resolution
      expect(resolvePlayerId('Praveen Dubey')).toBe('p-171');
      expect(resolvePlayerId('P. Dubey')).toBe('p-171');
      expect(resolvePlayerId('P Dubey')).toBe('p-171');

      // Stats check: 0 matches in 2026!
      const s2026 = getIplSeasonStats('p-171');
      expect(s2026.matches).toBe(0);
      expect(s2026.has_season_stats).toBe(false);

      // Career stats: 5 matches, 23 runs, 2 wickets
      const career = getIplCareerStats('p-171');
      expect(career.has_ipl_career).toBe(true);
      expect(career.matches).toBe(5);
      expect(career.runs).toBe(23);
      expect(career.wickets).toBe(2);

      // 2. Distinct from Shubham Dubey (p-193, RR)
      const shubham = getPlayerById('p-193');
      expect(shubham).toBeDefined();
      expect(shubham!.player_name).toBe('Shubham Dubey');
      expect(shubham!.team).toBe('Rajasthan Royals');
      const shubham2026 = getIplSeasonStats('p-193');
      expect(shubham2026.matches).toBe(7);
      expect(shubham2026.runs).toBe(81);

      // 3. Distinct from Harsh Dubey (p-258, SRH)
      const harsh = getPlayerById('p-258');
      expect(harsh).toBeDefined();
      expect(harsh!.player_name).toBe('Harsh Dubey');
      expect(harsh!.team).toBe('Sunrisers Hyderabad');
      const harsh2026 = getIplSeasonStats('p-258');
      expect(harsh2026.matches).toBe(8);
      expect(harsh2026.wickets).toBe(8);

      // 4. Distinct from Saurabh Dubey (p-098, KKR)
      const saurabh = getPlayerById('p-098');
      expect(saurabh).toBeDefined();
      expect(saurabh!.player_name).toBe('Saurabh Dubey');
      expect(saurabh!.team).toBe('Kolkata Knight Riders');
    });
  });

  describe('4. Live Auction Route Integration (/api/players/[id]/stats)', () => {
    it('Returns verified HTTP 200 payload for all 28 target players with dual stats', async () => {
      for (const mapping of MAPPINGS_28) {
        const req = new NextRequest(`http://localhost:3000/api/players/${mapping.targetId}/stats`);
        const res = await getPlayerStatsRoute(req, { params: { id: mapping.targetId } });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.player_id).toBe(mapping.targetId);
        expect(body.canonical_name).toBe(mapping.canonicalName);
        expect(body.team).toBe(mapping.team);
        expect(body.career).toBeDefined();
        expect(body.season_2026).toBeDefined();
        expect(body.season_2026.season).toBe('2026');
      }
    });
  });
});
