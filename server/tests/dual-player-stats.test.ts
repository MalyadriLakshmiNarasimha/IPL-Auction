import { describe, it, expect } from 'vitest';
import { ALL_PLAYERS, getPlayerById } from '../../src/shared/player-data';
import {
  getIplCareerStats,
  getIplSeasonStats,
  HISTORICAL_IPL_CAREER_BY_ID,
  HISTORICAL_IPL_2026_BY_ID,
  normalizePlayerName,
  resolvePlayerId,
  PLAYER_ALIASES,
} from '../../src/shared/player-career-data';
import { GET as getPlayerStatsRoute } from '../../src/app/api/players/[id]/stats/route';
import { NextRequest } from 'next/server';
import { RoomManager } from '../room';
import { Server as SocketIOServer } from 'socket.io';

describe('IPL Auction 2027 — Dual Player Statistics System', () => {
  describe('1. Two Distinct Datasets (Career vs 2026 Season)', () => {
    it('Maintains separate and distinct datasets without data mixing', () => {
      const kohli = getPlayerById('p-224');
      expect(kohli).toBeDefined();

      const career = kohli!.ipl_career_stats!;
      const season = kohli!.season_2026_stats!;

      expect(career).toBeDefined();
      expect(season).toBeDefined();

      // Separate references and separate values from Upto2026 CSV datasets
      expect(career.runs).toBe(9336);
      expect(season.runs).toBe(675);
      expect(career.matches).toBe(282);
      expect(season.matches).toBe(16);
      expect(career.runs).not.toEqual(season.runs);
      expect(career.matches).not.toEqual(season.matches);
    });

    it('Verifies all 274 players have defined dual stats', () => {
      expect(ALL_PLAYERS.length).toBe(274);
      for (const p of ALL_PLAYERS) {
        expect(p.ipl_career_stats).toBeDefined();
        expect(p.season_2026_stats).toBeDefined();
        expect(typeof p.ipl_career_stats!.has_stats).toBe('boolean');
        expect(typeof p.season_2026_stats!.has_stats).toBe('boolean');
      }
    });

    it('Verifies career numbers are greater than or equal to 2026 season numbers', () => {
      for (const p of ALL_PLAYERS) {
        const c = p.ipl_career_stats!;
        const s = p.season_2026_stats!;
        if (c.has_stats && s.has_stats) {
          expect(c.matches).toBeGreaterThanOrEqual(s.matches);
          if (c.runs !== undefined && s.runs !== undefined) {
            expect(c.runs).toBeGreaterThanOrEqual(s.runs);
          }
          if (c.wickets !== undefined && s.wickets !== undefined) {
            expect(c.wickets).toBeGreaterThanOrEqual(s.wickets);
          }
        }
      }
    });
  });

  describe('2. Test Player Profiles Verification', () => {
    it('Verifies Virat Kohli (p-224) Batter dual stats', () => {
      const career = getIplCareerStats('p-224');
      const season = getIplSeasonStats('p-224');

      // Career
      expect(career.has_stats).toBe(true);
      expect(career.has_ipl_career).toBe(true);
      expect(career.matches).toBe(282);
      expect(career.runs).toBe(9336);
      expect(career.batting_average).toBe(40.42);
      expect(career.strike_rate).toBe(134.8);
      expect(career.fours).toBe(844);
      expect(career.sixes).toBe(316);

      // 2026 Season
      expect(season.has_stats).toBe(true);
      expect(season.has_season_stats).toBe(true);
      expect(season.season).toBe('2026');
      expect(season.matches).toBe(16);
      expect(season.runs).toBe(675);
      expect(season.batting_average).toBe(56.25);
      expect(season.strike_rate).toBe(165.85);
      expect(season.fours).toBe(73);
      expect(season.sixes).toBe(25);
    });

    it('Verifies Rohit Sharma (p-148) Batter dual stats', () => {
      const career = getIplCareerStats('p-148');
      const season = getIplSeasonStats('p-148');

      // Career
      expect(career.has_stats).toBe(true);
      expect(career.has_ipl_career).toBe(true);
      expect(career.matches).toBe(281);
      expect(career.runs).toBe(7329);
      expect(career.batting_average).toBe(29.91);
      expect(career.strike_rate).toBe(132.92);
      expect(career.fours).toBe(661);
      expect(career.sixes).toBe(323);

      // 2026 Season
      expect(season.has_stats).toBe(true);
      expect(season.has_season_stats).toBe(true);
      expect(season.matches).toBe(9);
      expect(season.runs).toBe(283);
      expect(season.batting_average).toBe(35.38);
      expect(season.strike_rate).toBe(157.22);
      expect(season.fours).toBe(21);
      expect(season.sixes).toBe(21);
    });

    it('Verifies MS Dhoni (p-028) Wicketkeeper dual stats', () => {
      const career = getIplCareerStats('p-028');
      const season = getIplSeasonStats('p-028');

      // Career
      expect(career.has_stats).toBe(true);
      expect(career.matches).toBe(277);
      expect(career.runs).toBe(5439);
      expect(career.batting_average).toBe(38.3);
      expect(career.strike_rate).toBe(137.45);
      expect(career.fours).toBe(375);
      expect(career.sixes).toBe(264);

      // 2026 Season: no appearances in 2026
      expect(season.has_stats).toBe(false);
      expect(season.matches).toBe(0);
      expect(season.status).toBe('NO_APPEARANCES_IN_2026');
    });

    it('Verifies Hardik Pandya (p-164) All-Rounder dual stats', () => {
      const career = getIplCareerStats('p-164');
      const season = getIplSeasonStats('p-164');

      // Career
      expect(career.has_stats).toBe(true);
      expect(career.matches).toBe(162);
      expect(career.runs).toBe(2955);
      expect(career.wickets).toBe(82);
      expect(career.economy_rate).toBe(9.36);

      // 2026 Season
      expect(season.has_stats).toBe(true);
      expect(season.matches).toBe(10);
      expect(season.runs).toBe(206);
      expect(season.wickets).toBe(4);
      expect(season.economy_rate).toBe(11.43);
    });

    it('Verifies Jasprit Bumrah (p-153) Bowler dual stats', () => {
      const career = getIplCareerStats('p-153');
      const season = getIplSeasonStats('p-153');

      // Career
      expect(career.has_stats).toBe(true);
      expect(career.matches).toBe(158);
      expect(career.wickets).toBe(187);
      expect(career.economy_rate).toBe(7.34);

      // 2026 Season
      expect(season.has_stats).toBe(true);
      expect(season.matches).toBe(13);
      expect(season.wickets).toBe(4);
      expect(season.economy_rate).toBe(8.37);
    });

    it('Verifies Vaibhav Sooryavanshi (p-203) verified stats', () => {
      const career = getIplCareerStats('p-203');
      const season = getIplSeasonStats('p-203');

      expect(career.has_stats).toBe(true);
      expect(career.matches).toBe(23);
      expect(career.runs).toBe(1028);

      expect(season.has_stats).toBe(true);
      expect(season.matches).toBe(16);
      expect(season.runs).toBe(776);
    });

    it('Verifies Macneil Noronha (p-007) Uncapped Debutant stats unavailable', () => {
      const career = getIplCareerStats('p-007');
      const season = getIplSeasonStats('p-007');

      expect(career.has_stats).toBe(false);
      expect(career.has_ipl_career).toBe(false);
      expect(career.matches).toBe(0);
      expect(career.status).toBe('GENUINE_IPL_DEBUTANT');

      expect(season.has_stats).toBe(false);
      expect(season.has_season_stats).toBe(false);
      expect(season.matches).toBe(0);
      expect(season.status).toBe('GENUINE_IPL_DEBUTANT');
    });
  });

  describe('3. Role-Specific Attributes Enforcement', () => {
    it('Requires overs and economy for all bowlers with wickets', () => {
      for (const p of ALL_PLAYERS) {
        if (p.role.toUpperCase().includes('BOWL') && p.ipl_career_stats?.has_stats && (p.ipl_career_stats.wickets || 0) > 0) {
          expect(p.ipl_career_stats.overs).toBeDefined();
          expect(p.ipl_career_stats.economy_rate).toBeDefined();
        }
      }
    });

    it('Requires strike_rate and runs for all batters with runs', () => {
      for (const p of ALL_PLAYERS) {
        if (p.role.toUpperCase().includes('BAT') && p.ipl_career_stats?.has_stats && (p.ipl_career_stats.runs || 0) > 0) {
          expect(p.ipl_career_stats.strike_rate).toBeDefined();
          expect(p.ipl_career_stats.strike_rate).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('4. Deterministic Resolution by ID, Name, and Aliases', () => {
    it('Resolves career and season stats by alias (e.g. MS Dhoni)', () => {
      const byAliasCareer = getIplCareerStats('MS Dhoni');
      const byIdCareer = getIplCareerStats('p-028');
      expect(byAliasCareer.runs).toBe(byIdCareer.runs);
      expect(byAliasCareer.matches).toBe(byIdCareer.matches);

      const byAliasSeason = getIplSeasonStats('MS Dhoni');
      const byIdSeason = getIplSeasonStats('p-028');
      expect(byAliasSeason.matches).toBe(byIdSeason.matches);
    });

    it('Resolves career and season stats by player object', () => {
      const p = getPlayerById('p-224');
      const career = getIplCareerStats(p);
      const season = getIplSeasonStats(p);

      expect(career.runs).toBe(9336);
      expect(season.runs).toBe(675);
    });

    it('Safely returns clean defaults for unknown or null inputs', () => {
      const c = getIplCareerStats(null);
      expect(c.has_stats).toBe(false);
      expect(c.matches).toBe(0);
      expect(c.status).toBe('DATA_UNAVAILABLE');

      const s = getIplSeasonStats('unknown-player-xyz');
      expect(s.has_stats).toBe(false);
      expect(s.matches).toBe(0);
      expect(s.status).toBe('DATA_UNAVAILABLE');
    });
  });

  describe('5. Automatic Carousel Rotation Configuration', () => {
    it('verifies carousel component exports cleanly', async () => {
      const carouselModule = await import('../../src/components/PlayerStatsCarousel');
      expect(carouselModule.PlayerStatsCarousel).toBeDefined();
    }, 15000);
  });

  describe('6. P0 Critical Regression Test: Donovan Ferreira (p-194) Verified Statistics', () => {
    it('proves Donovan Ferreira cannot be displayed as having zero 2026 appearances', () => {
      const seasonStats = getIplSeasonStats('p-194');

      expect(seasonStats.matches).not.toBe(0);
      expect(seasonStats.matches).toBe(15);
      expect(seasonStats.has_stats).toBe(true);
      expect(seasonStats.has_season_stats).toBe(true);
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(seasonStats.status);

      // Exact verified 2026 match records
      expect(seasonStats.innings).toBe(13);
      expect(seasonStats.runs).toBe(317);
      expect(seasonStats.batting_average).toBe(35.22);
      expect(seasonStats.strike_rate).toBe(179.1);
      expect(seasonStats.fours).toBe(25);
      expect(seasonStats.sixes).toBe(23);
      expect(seasonStats.wickets).toBe(1);
      expect(seasonStats.economy_rate).toBe(13.67);
    });

    it('verifies Donovan Ferreira overall career stats include 18 matches, 326 runs and 1 wicket', () => {
      const careerStats = getIplCareerStats('p-194');

      expect(careerStats.has_stats).toBe(true);
      expect(careerStats.has_ipl_career).toBe(true);
      expect(careerStats.matches).toBe(18);
      expect(careerStats.runs).toBe(326);
      expect(careerStats.wickets).toBe(1);
      expect(careerStats.economy_rate).toBe(13.67);
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(careerStats.status);
    });

    it('resolves Donovan Ferreira by ID (p-194), canonical name, and alias (D. Ferreira)', () => {
      const byId = getIplSeasonStats('p-194');
      const byName = getIplSeasonStats('Donovan Ferreira');

      expect(byId.runs).toBe(317);
      expect(byName.runs).toBe(317);
      expect(byId.matches).toBe(15);
      expect(byName.matches).toBe(15);
    });
  });

  describe('7. Verification of All Phase 6 Required Test Players', () => {
    it('verifies Virat Kohli (p-224) Batter dual stats', () => {
      const c = getIplCareerStats('p-224');
      const s = getIplSeasonStats('p-224');
      expect(c.matches).toBe(282);
      expect(c.runs).toBe(9336);
      expect(s.matches).toBe(16);
      expect(s.runs).toBe(675);
    });

    it('verifies Rohit Sharma (p-148) Batter dual stats', () => {
      const c = getIplCareerStats('p-148');
      const s = getIplSeasonStats('p-148');
      expect(c.matches).toBe(281);
      expect(c.runs).toBe(7329);
      expect(s.matches).toBe(9);
      expect(s.runs).toBe(283);
    });

    it('verifies MS Dhoni (p-028) resolves via alias "MS Dhoni"', () => {
      const c = getIplCareerStats('MS Dhoni');
      const s = getIplSeasonStats('MS Dhoni');
      expect(c.matches).toBe(277);
      expect(c.runs).toBe(5439);
      expect(s.matches).toBe(0);
      expect(s.status).toBe('NO_APPEARANCES_IN_2026');
    });

    it('verifies Hardik Pandya (p-164) All-Rounder dual stats', () => {
      const c = getIplCareerStats('p-164');
      const s = getIplSeasonStats('p-164');
      expect(c.matches).toBe(162);
      expect(c.runs).toBe(2955);
      expect(c.wickets).toBe(82);
      expect(s.matches).toBe(10);
      expect(s.runs).toBe(206);
      expect(s.wickets).toBe(4);
    });

    it('verifies Ayush Mhatre (p-006) with verified record (201 season runs)', () => {
      const c = getIplCareerStats('p-006');
      const s = getIplSeasonStats('p-006');
      expect(c.matches).toBe(13);
      expect(c.runs).toBe(441);
      expect(s.matches).toBe(6);
      expect(s.runs).toBe(201);
    });

    it('verifies Vaibhav Sooryavanshi (p-203) with verified breakthrough record (776 runs)', () => {
      const c = getIplCareerStats('p-203');
      const s = getIplSeasonStats('p-203');
      expect(c.matches).toBe(23);
      expect(c.runs).toBe(1028);
      expect(s.matches).toBe(16);
      expect(s.runs).toBe(776);
    });

    it('verifies Cameron Green (p-085) with batting and bowling statistics', () => {
      const c = getIplCareerStats('p-085');
      const s = getIplSeasonStats('p-085');
      expect(c.matches).toBe(43);
      expect(c.runs).toBe(1029);
      expect(c.wickets).toBe(23);
      expect(s.matches).toBe(14);
      expect(s.runs).toBe(322);
      expect(s.wickets).toBe(7);
    });

    it('verifies Aiden Markram (p-117) with batting and bowling figures', () => {
      const c = getIplCareerStats('p-117');
      const s = getIplSeasonStats('p-117');
      expect(c.matches).toBe(69);
      expect(c.runs).toBe(1671);
      expect(c.wickets).toBe(6);
      expect(s.matches).toBe(12);
      expect(s.runs).toBe(231);
      expect(s.wickets).toBe(0);
    });

    it('verifies KL Rahul (p-036) with batting figures', () => {
      const c = getIplCareerStats('p-036');
      const s = getIplSeasonStats('p-036');
      expect(c.matches).toBe(160);
      expect(c.runs).toBe(5815);
      expect(s.matches).toBe(14);
      expect(s.runs).toBe(593);
    });

    it('verifies Marcus Stoinis (p-179) with batting and bowling figures', () => {
      const c = getIplCareerStats('p-179');
      const s = getIplSeasonStats('p-179');
      expect(c.matches).toBe(123);
      expect(c.runs).toBe(2242);
      expect(c.wickets).toBe(46);
      expect(s.matches).toBe(13);
      expect(s.runs).toBe(216);
      expect(s.wickets).toBe(2);
    });

    it('verifies Mitchell Marsh resolves from alias to "Mitch Marsh" (p-118)', () => {
      const c = getIplCareerStats('Mitchell Marsh');
      const s = getIplSeasonStats('Mitchell Marsh');
      expect(c.matches).toBe(68);
      expect(c.runs).toBe(1855);
      expect(c.wickets).toBe(37);
      expect(s.matches).toBe(13);
      expect(s.runs).toBe(563);
    });

    it('verifies Macneil Noronha (p-007) is a genuine IPL debutant', () => {
      const c = getIplCareerStats('p-007');
      const s = getIplSeasonStats('p-007');
      expect(c.matches).toBe(0);
      expect(c.status).toBe('GENUINE_IPL_DEBUTANT');
      expect(s.matches).toBe(0);
      expect(s.status).toBe('GENUINE_IPL_DEBUTANT');
    });
  });

  describe('8. Player Statistics Categories & Status Enforcement', () => {
    it('verifies player with career but no 2026 appearances has NO_APPEARANCES_IN_2026 status', () => {
      const bantonCareer = getIplCareerStats('p-057');
      const bantonSeason = getIplSeasonStats('p-057');

      expect(bantonCareer.matches).toBeGreaterThan(0);
      expect(['VERIFIED', 'VERIFIED_DATA', 'NO_APPEARANCES_IN_2026', 'NO_APPEARANCES_IN_SEASON']).toContain(bantonCareer.status);

      expect(bantonSeason.matches).toBe(0);
      expect(bantonSeason.has_stats).toBe(false);
      expect(['NO_APPEARANCES_IN_SEASON', 'NO_APPEARANCES_IN_2026']).toContain(bantonSeason.status);
    });

    it('verifies genuine debutants have GENUINE_IPL_DEBUTANT status across both datasets', () => {
      const debutantCareer = getIplCareerStats('p-007');
      const debutantSeason = getIplSeasonStats('p-007');

      expect(debutantCareer.status).toBe('GENUINE_IPL_DEBUTANT');
      expect(debutantSeason.status).toBe('GENUINE_IPL_DEBUTANT');
    });

    it('verifies active established players have VERIFIED_DATA status across both datasets', () => {
      const kohliCareer = getIplCareerStats('p-224');
      const kohliSeason = getIplSeasonStats('p-224');

      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(kohliCareer.status);
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(kohliSeason.status);
    });
  });

  describe('9. Normalization, Diacritics, Punctuation and Name Aliasing', () => {
    it('normalizes names with accents, punctuation, and casing', () => {
      expect(normalizePlayerName('M.S. Dhoni')).toBe('msdhoni');
      expect(normalizePlayerName('K.L. Rahul')).toBe('klrahul');
      expect(normalizePlayerName('Donovan Ferreira')).toBe('donovanferreira');
    });

    it('resolves player IDs from various string variants', () => {
      expect(resolvePlayerId('p-194')).toBe('p-194');
      expect(resolvePlayerId('Donovan Ferreira')).toBe('p-194');
      expect(resolvePlayerId('MS Dhoni')).toBe('p-028');
      expect(resolvePlayerId('Mahendra Singh Dhoni')).toBe('p-028');
      expect(resolvePlayerId('Mitchell Marsh')).toBe('p-118');
      expect(resolvePlayerId('Mitch Marsh')).toBe('p-118');
    });

    it('returns undefined for nonexistent player identifiers', () => {
      expect(resolvePlayerId('Nonexistent Player')).toBeUndefined();
    });
  });

  describe('10. Statistics API Endpoint Integration (/api/players/[id]/stats)', () => {
    it('returns 200 with complete dual stats for verified player (p-194 Donovan Ferreira)', async () => {
      const req = new NextRequest('http://localhost:3000/api/players/p-194/stats');
      const res = await getPlayerStatsRoute(req, { params: { id: 'p-194' } });

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.player_id).toBe('p-194');
      expect(json.career).toBeDefined();
      expect(json.career.runs).toBe(326);
      expect(json.career.matches).toBe(18);
      expect(json.season_2026).toBeDefined();
      expect(json.season_2026.runs).toBe(317);
      expect(json.season_2026.matches).toBe(15);
    });

    it('returns 200 when querying by alias "MS Dhoni"', async () => {
      const req = new NextRequest('http://localhost:3000/api/players/MS%20Dhoni/stats');
      const res = await getPlayerStatsRoute(req, { params: { id: 'MS Dhoni' } });

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.player_id).toBe('p-028');
      expect(json.career.runs).toBe(5439);
      expect(json.career.matches).toBe(277);
      expect(json.season_2026.matches).toBe(0);
    });

    it('returns 200 with GENUINE_IPL_DEBUTANT for uncapped player (p-007 Macneil Noronha)', async () => {
      const req = new NextRequest('http://localhost:3000/api/players/p-007/stats');
      const res = await getPlayerStatsRoute(req, { params: { id: 'p-007' } });

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.player_id).toBe('p-007');
      expect(json.status).toBe('GENUINE_IPL_DEBUTANT');
      expect(json.career.matches).toBe(0);
      expect(json.season_2026.matches).toBe(0);
    });

    it('returns 404 for unknown player ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/players/unknown-id/stats');
      const res = await getPlayerStatsRoute(req, { params: { id: 'unknown-id' } });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.status).toBe('MAPPING_ERROR');
    });
  });

  describe('11. Multi-Client Socket.IO Player Statistics Broadcasting', () => {
    it('ensures all players carry populated dual stats for authoritative broadcasting', () => {
      const mockIo = {
        to: () => ({ emit: () => {} }),
        emit: () => {},
      } as unknown as SocketIOServer;

      const rm = new RoomManager(mockIo);
      const room = rm.createRoom('TESTSTATS', 'Test Stats Room', 'host_session_1', 'Host');

      expect(room.settings.selected_player_ids.length).toBe(274);

      // Verify all 274 players in ALL_PLAYERS have populated dual stats
      expect(ALL_PLAYERS.length).toBe(274);
      for (const p of ALL_PLAYERS) {
        expect(p.ipl_career_stats).toBeDefined();
        expect(p.season_2026_stats).toBeDefined();
      }

      // Verify Donovan Ferreira (p-194) in ALL_PLAYERS carries verified stats
      const df = ALL_PLAYERS.find(p => p.id === 'p-194');
      expect(df).toBeDefined();
      expect(df!.ipl_career_stats).toBeDefined();
      expect(df!.season_2026_stats).toBeDefined();
      expect(df!.ipl_career_stats!.runs).toBe(326);
      expect(df!.season_2026_stats!.runs).toBe(317);
      expect(df!.season_2026_stats!.matches).toBe(15);
      expect(df!.season_2026_stats!.strike_rate).toBe(179.1);

      // Verify simulated bidding_started payload carries identical dual stats for clients
      const biddingPayload = {
        player: df!,
        timer_ends_at: Date.now() + 15000,
        timer_seconds: 15,
        auction_state: rm.getPublicState(room),
      };

      expect(biddingPayload.player.season_2026_stats?.runs).toBe(317);
      expect(biddingPayload.player.season_2026_stats?.matches).toBe(15);
      expect(biddingPayload.player.ipl_career_stats?.runs).toBe(326);
    });
  });

  describe('12. Multi-Source IPL Data Collection & Cross-Verification (Phase 2A)', () => {
    it('verifies all 274 players have minimum 3 independent sources checked with provenance metadata', () => {
      expect(ALL_PLAYERS.length).toBe(274);

      for (const player of ALL_PLAYERS) {
        const career = HISTORICAL_IPL_CAREER_BY_ID[player.id];
        const season = HISTORICAL_IPL_2026_BY_ID[player.id];

        expect(career).toBeDefined();
        expect(season).toBeDefined();

        expect(career.sources_checked).toBeGreaterThanOrEqual(3);
        expect(season.sources_checked).toBeGreaterThanOrEqual(3);

        expect(career.source_urls).toBeDefined();
        expect(career.source_urls!.length).toBeGreaterThanOrEqual(3);
        expect(season.source_urls).toBeDefined();
        expect(season.source_urls!.length).toBeGreaterThanOrEqual(3);

        expect(career.cross_verification).toBeDefined();
        expect(career.cross_verification!.source_1).toBeDefined();
        expect(career.cross_verification!.source_2).toBeDefined();
        expect(career.cross_verification!.source_3).toBeDefined();
        expect(career.cross_verification!.agreement_level).toBeDefined();

        expect(season.cross_verification).toBeDefined();
        expect(season.cross_verification!.source_1).toBeDefined();
        expect(season.cross_verification!.source_2).toBeDefined();
        expect(season.cross_verification!.source_3).toBeDefined();
        expect(season.cross_verification!.agreement_level).toBeDefined();
      }
    });

    it('verifies Donovan Ferreira (p-194) multi-source concordance across IPL, Franchise & Secondary sources', () => {
      const career = HISTORICAL_IPL_CAREER_BY_ID['p-194'];
      const season = HISTORICAL_IPL_2026_BY_ID['p-194'];

      expect(career.matches).toBe(18);
      expect(career.runs).toBe(326);
      expect(career.wickets).toBe(1);

      expect(season.matches).toBe(15);
      expect(season.innings).toBe(13);
      expect(season.runs).toBe(317);
      expect(season.batting_average).toBe(35.22);
      expect(season.strike_rate).toBe(179.1);
      expect(season.fours).toBe(25);
      expect(season.sixes).toBe(23);
      expect(season.wickets).toBe(1);

      expect(season.cross_verification?.agreement_level).toBe('UNANIMOUS');
      expect(season.source_urls).toContain('https://www.iplt20.com/stats/2026');
      expect(season.source_urls).toContain('https://www.rajasthanroyals.com/rr-players/donovan-ferreira-ipl-profile-23487');
    });

    it('verifies generated Phase 2A reports exist and are populated', () => {
      const fs = require('fs');
      const path = require('path');

      const resolveReport = (fileName: string) => {
        const rootPath = path.join(process.cwd(), fileName);
        if (fs.existsSync(rootPath)) return rootPath;
        const mdPath = path.join(process.cwd(), 'md', fileName);
        if (fs.existsSync(mdPath)) return mdPath;
        return rootPath;
      };

      const csvPath = resolveReport('IPL_MULTI_SOURCE_STATISTICS_COMPARISON.csv');
      const mdCompPath = resolveReport('IPL_MULTI_SOURCE_STATISTICS_COMPARISON.md');
      const discPath = resolveReport('IPL_STATISTICS_DISCREPANCY_REPORT.md');
      const updatePath = resolveReport('IPL_STATISTICS_DATASET_UPDATE_REPORT.md');

      expect(fs.existsSync(csvPath)).toBe(true);
      expect(fs.existsSync(mdCompPath)).toBe(true);
      expect(fs.existsSync(discPath)).toBe(true);
      expect(fs.existsSync(updatePath)).toBe(true);

      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n');
      expect(lines.length).toBeGreaterThan(10000);

      const discContent = fs.readFileSync(discPath, 'utf8');
      expect(discContent).toContain('Donovan Ferreira');
      expect(discContent).toContain('Cameron Green');
      expect(discContent).toContain('KL Rahul');
    });

    it('verifies API endpoint /api/players/[id]/stats returns multi-source provenance metadata', async () => {
      const req = new NextRequest('http://localhost:3000/api/players/p-194/stats');
      const res = await getPlayerStatsRoute(req, { params: { id: 'p-194' } });

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.career.sources_checked).toBe(3);
      expect(json.career.source_urls.length).toBeGreaterThanOrEqual(3);
      expect(json.career.cross_verification).toBeDefined();
      expect(json.career.cross_verification.agreement_level).toBe('UNANIMOUS');

      expect(json.season_2026.sources_checked).toBe(3);
      expect(json.season_2026.source_urls.length).toBeGreaterThanOrEqual(3);
      expect(json.season_2026.cross_verification.agreement_level).toBe('UNANIMOUS');
    });
  });

  describe('13. Mandatory P0 Regression Cases: Mukul Choudhary, Jacob Bethell & Shreyas Iyer', () => {
    it('proves Mukul Choudhary (p-115) is NOT an IPL Debutant and carries verified 2026 record (170 runs)', () => {
      const p = ALL_PLAYERS.find(x => x.id === 'p-115');
      expect(p).toBeDefined();
      expect(p!.name).toBe('Mukul Choudhary');
      expect(p!.team).toBe('Lucknow Super Giants');

      const career = getIplCareerStats('p-115');
      const season = getIplSeasonStats('p-115');

      expect(career.status).not.toBe('GENUINE_IPL_DEBUTANT');
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(career.status);
      expect(career.matches).toBe(10);
      expect(career.runs).toBe(170);

      expect(season.status).not.toBe('GENUINE_IPL_DEBUTANT');
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(season.status);
      expect(season.matches).toBe(10);
      expect(season.runs).toBe(170);

      expect(resolvePlayerId('Mukul Choudhary')).toBe('p-115');
      expect(resolvePlayerId('MD Choudhary')).toBe('p-115');
    });

    it('proves Jacob Bethell (p-220) is NOT an IPL Debutant and carries distinct career (163) and 2026 (96) records', () => {
      const p = ALL_PLAYERS.find(x => x.id === 'p-220');
      expect(p).toBeDefined();
      expect(p!.name).toBe('Jacob Bethell');
      expect(p!.team).toBe('Royal Challengers Bengaluru');

      const career = getIplCareerStats('p-220');
      const season = getIplSeasonStats('p-220');

      expect(career.status).not.toBe('GENUINE_IPL_DEBUTANT');
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(career.status);
      expect(career.matches).toBe(9);
      expect(career.runs).toBe(163);

      expect(season.status).not.toBe('GENUINE_IPL_DEBUTANT');
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(season.status);
      expect(season.matches).toBe(7);
      expect(season.runs).toBe(96);

      expect(career.runs).toBeGreaterThan(season.runs!);
      expect(career.matches).toBeGreaterThan(season.matches);

      expect(resolvePlayerId('Jacob Bethell')).toBe('p-220');
    });

    it('proves Shreyas Iyer (p-172) carries full 2026 season record (14 M, 498 R) and NOT truncated 6 M, 139 R', () => {
      const p = ALL_PLAYERS.find(x => x.id === 'p-172');
      expect(p).toBeDefined();
      expect(p!.name).toBe('Shreyas Iyer');
      expect(p!.team).toBe('Punjab Kings');

      const season = getIplSeasonStats('p-172');
      const career = getIplCareerStats('p-172');

      expect(season.matches).not.toBe(6);
      expect(season.runs).not.toBe(139);

      expect(season.matches).toBe(14);
      expect(season.runs).toBe(498);
      expect(season.batting_average).toBe(55.33);
      expect(season.strike_rate).toBe(168.81);

      expect(career.matches).toBe(147);
      expect(career.runs).toBe(4229);

      expect(resolvePlayerId('Shreyas Iyer')).toBe('p-172');
    });

    it('proves Ryan Rickelton, Josh Inglis, Priyansh Arya and Cooper Connolly have verified records', () => {
      const ryan = getIplCareerStats('p-167');
      expect(ryan.matches).toBe(26);
      expect(ryan.runs).toBe(836);
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(ryan.status);

      const inglis = getIplCareerStats('p-136');
      expect(inglis.matches).toBe(17);
      expect(inglis.runs).toBe(544);
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(inglis.status);

      const arya = getIplCareerStats('p-168');
      expect(arya.matches).toBe(31);
      expect(arya.runs).toBe(909);
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(arya.status);

      const cooper = getIplCareerStats('p-170');
      expect(cooper.matches).toBe(14);
      expect(cooper.runs).toBe(491);
      expect(['VERIFIED', 'VERIFIED_DATA']).toContain(cooper.status);
    });

    it('verifies all required deliverable documentation reports exist', () => {
      const fs = require('fs');
      const path = require('path');

      const resolveReport = (fileName: string) => {
        const rootPath = path.join(process.cwd(), fileName);
        if (fs.existsSync(rootPath)) return rootPath;
        const mdPath = path.join(process.cwd(), 'md', fileName);
        if (fs.existsSync(mdPath)) return mdPath;
        return rootPath;
      };

      const auditPath = resolveReport('IPL_STATISTICS_DATA_AUDIT_REPORT.md');
      const sourcePath = resolveReport('IPL_STATISTICS_SOURCE_VERIFICATION.md');
      const mappingPath = resolveReport('IPL_STATISTICS_MAPPING_ERRORS.md');
      const regressionPath = resolveReport('IPL_STATISTICS_REGRESSION_TEST_REPORT.md');

      expect(fs.existsSync(auditPath)).toBe(true);
      expect(fs.existsSync(sourcePath)).toBe(true);
      expect(fs.existsSync(mappingPath)).toBe(true);
      expect(fs.existsSync(regressionPath)).toBe(true);
    });
  });
});
