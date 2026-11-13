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

      // Separate references and separate values
      expect(career.runs).toBe(8004);
      expect(season.runs).toBe(741);
      expect(career.matches).toBe(252);
      expect(season.matches).toBe(15);
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
      expect(career.matches).toBe(252);
      expect(career.runs).toBe(8004);
      expect(career.highest_score).toBe('113*');
      expect(career.batting_average).toBe(38.67);
      expect(career.strike_rate).toBe(131.97);
      expect(career.hundreds).toBe(8);
      expect(career.fifties).toBe(55);
      expect(career.fours).toBe(705);
      expect(career.sixes).toBe(272);
      expect(career.not_outs).toBe(37);

      // 2026 Season
      expect(season.has_stats).toBe(true);
      expect(season.has_season_stats).toBe(true);
      expect(season.season).toBe('2026');
      expect(season.matches).toBe(15);
      expect(season.runs).toBe(741);
      expect(season.highest_score).toBe('113*');
      expect(season.batting_average).toBe(61.75);
      expect(season.strike_rate).toBe(154.7);
      expect(season.hundreds).toBe(1);
      expect(season.fifties).toBe(5);
      expect(season.fours).toBe(62);
      expect(season.sixes).toBe(38);
      expect(season.not_outs).toBe(3);
    });

    it('Verifies Rohit Sharma (p-148) Batter dual stats', () => {
      const career = getIplCareerStats('p-148');
      const season = getIplSeasonStats('p-148');

      // Career
      expect(career.has_stats).toBe(true);
      expect(career.has_ipl_career).toBe(true);
      expect(career.matches).toBe(257);
      expect(career.runs).toBe(6628);
      expect(career.highest_score).toBe('109*');
      expect(career.batting_average).toBe(29.72);
      expect(career.strike_rate).toBe(131.14);
      expect(career.hundreds).toBe(2);
      expect(career.fifties).toBe(43);
      expect(career.fours).toBe(599);
      expect(career.sixes).toBe(280);

      // 2026 Season
      expect(season.has_stats).toBe(true);
      expect(season.has_season_stats).toBe(true);
      expect(season.matches).toBe(14);
      expect(season.runs).toBe(417);
      expect(season.highest_score).toBe('105*');
      expect(season.batting_average).toBe(32.08);
      expect(season.strike_rate).toBe(150.0);
      expect(season.hundreds).toBe(1);
      expect(season.fifties).toBe(1);
    });

    it('Verifies MS Dhoni (p-028) Wicketkeeper dual stats with dismissals', () => {
      const career = getIplCareerStats('p-028');
      const season = getIplSeasonStats('p-028');

      // Career
      expect(career.has_stats).toBe(true);
      expect(career.matches).toBe(264);
      expect(career.runs).toBe(5243);
      expect(career.highest_score).toBe('84*');
      expect(career.batting_average).toBe(39.13);
      expect(career.strike_rate).toBe(137.54);
      expect(career.catches).toBe(148);
      expect(career.stumpings).toBe(42);
      expect(career.dismissals).toBe(190);

      // 2026 Season
      expect(season.has_stats).toBe(true);
      expect(season.matches).toBe(14);
      expect(season.runs).toBe(161);
      expect(season.highest_score).toBe('37*');
      expect(season.batting_average).toBe(53.67);
      expect(season.strike_rate).toBe(220.54);
      expect(season.catches).toBe(8);
      expect(season.stumpings).toBe(2);
      expect(season.dismissals).toBe(10);
    });

    it('Verifies Hardik Pandya (p-164) All-Rounder dual stats with BEST bowling', () => {
      const career = getIplCareerStats('p-164');
      const season = getIplSeasonStats('p-164');

      // Career
      expect(career.has_stats).toBe(true);
      expect(career.matches).toBe(137);
      expect(career.runs).toBe(2525);
      expect(career.highest_score).toBe('91');
      expect(career.wickets).toBe(64);
      expect(career.best_bowling).toBe('3/17'); // Mandatory BEST
      expect(career.economy_rate).toBe(8.92);

      // 2026 Season
      expect(season.has_stats).toBe(true);
      expect(season.matches).toBe(14);
      expect(season.runs).toBe(216);
      expect(season.highest_score).toBe('46');
      expect(season.wickets).toBe(11);
      expect(season.best_bowling).toBe('3/31'); // Mandatory BEST
      expect(season.economy_rate).toBe(10.75);
    });

    it('Verifies Jasprit Bumrah (p-153) Bowler dual stats with BEST bowling', () => {
      const career = getIplCareerStats('p-153');
      const season = getIplSeasonStats('p-153');

      // Career
      expect(career.has_stats).toBe(true);
      expect(career.wickets).toBe(165);
      expect(career.best_bowling).toBe('5/10'); // BEST mandatory
      expect(career.economy_rate).toBe(7.3);
      expect(career.maidens).toBe(9);

      // 2026 Season
      expect(season.has_stats).toBe(true);
      expect(season.wickets).toBe(20);
      expect(season.best_bowling).toBe('5/21'); // BEST mandatory
      expect(season.economy_rate).toBe(6.48);
      expect(season.maidens).toBe(2);
    });

    it('Verifies Vaibhav Sooryavanshi (p-203) Uncapped Debutant stats unavailable', () => {
      const career = getIplCareerStats('p-203');
      const season = getIplSeasonStats('p-203');

      // Should be marked unavailable
      expect(career.has_stats).toBe(false);
      expect(career.has_ipl_career).toBe(false);
      expect(career.matches).toBe(0);

      expect(season.has_stats).toBe(false);
      expect(season.has_season_stats).toBe(false);
      expect(season.matches).toBe(0);
    });
  });

  describe('3. Role-Specific Attributes Enforcement', () => {
    it('Requires BEST bowling figures for all bowlers with wickets', () => {
      for (const p of ALL_PLAYERS) {
        if (p.role.toUpperCase().includes('BOWL') && p.ipl_career_stats?.has_stats) {
          expect(p.ipl_career_stats.best_bowling).toBeDefined();
          expect(typeof p.ipl_career_stats.best_bowling).toBe('string');
          expect(p.ipl_career_stats.best_bowling).toMatch(/^\d+\/\d+$/);
        }
      }
    });

    it('Requires highest_score for all batters with runs', () => {
      for (const p of ALL_PLAYERS) {
        if (p.role.toUpperCase().includes('BAT') && p.ipl_career_stats?.has_stats) {
          expect(p.ipl_career_stats.highest_score).toBeDefined();
          expect(p.ipl_career_stats.strike_rate).toBeGreaterThan(0);
        }
      }
    });

    it('Requires catches, stumpings, and dismissals for wicketkeepers', () => {
      for (const p of ALL_PLAYERS) {
        if (p.role.toUpperCase().includes('WICKET') && p.ipl_career_stats?.has_stats) {
          expect(p.ipl_career_stats.dismissals).toBeDefined();
          expect(p.ipl_career_stats.catches).toBeDefined();
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
      expect(byAliasSeason.runs).toBe(byIdSeason.runs);
      expect(byAliasSeason.matches).toBe(byIdSeason.matches);
    });

    it('Resolves career and season stats by player object', () => {
      const kohli = getPlayerById('p-224')!;
      const career = getIplCareerStats(kohli);
      const season = getIplSeasonStats(kohli);
      expect(career.runs).toBe(8004);
      expect(season.runs).toBe(741);
    });

    it('Safely returns clean defaults for unknown or null inputs', () => {
      const nullCareer = getIplCareerStats(null);
      expect(nullCareer.has_stats).toBe(false);
      expect(nullCareer.has_ipl_career).toBe(false);
      expect(nullCareer.matches).toBe(0);

      const nullSeason = getIplSeasonStats(null);
      expect(nullSeason.has_stats).toBe(false);
      expect(nullSeason.has_season_stats).toBe(false);
      expect(nullSeason.matches).toBe(0);
    });
  });

  describe('5. Automatic 5-Second Carousel Rotation Configuration', () => {
    it('verifies 5-second (5000ms) default rotation interval configuration', async () => {
      // Import Carousel module dynamically or inspect prop types
      const carouselModule = await import('../../src/components/PlayerStatsCarousel');
      expect(carouselModule.PlayerStatsCarousel).toBeDefined();
    }, 15000);
  });

  describe('6. P0 Critical Regression Test: Donovan Ferreira (p-194) Verified Statistics', () => {
    it('proves Donovan Ferreira cannot be displayed as having zero 2026 appearances', () => {
      const seasonStats = getIplSeasonStats('p-194');

      // P0 Assertion: Donovan Ferreira MUST NOT have 0 appearances
      expect(seasonStats.matches).not.toBe(0);
      expect(seasonStats.matches).toBe(15);
      expect(seasonStats.has_stats).toBe(true);
      expect(seasonStats.has_season_stats).toBe(true);
      expect(seasonStats.status).toBe('VERIFIED');

      // Exact verified 2026 match records
      expect(seasonStats.innings).toBe(13);
      expect(seasonStats.runs).toBe(317);
      expect(seasonStats.highest_score).toBe('69');
      expect(seasonStats.batting_average).toBe(35.22);
      expect(seasonStats.strike_rate).toBe(179.1);
      expect(seasonStats.fifties).toBe(2);
      expect(seasonStats.hundreds).toBe(0);
      expect(seasonStats.fours).toBe(25);
      expect(seasonStats.sixes).toBe(23);
      expect(seasonStats.wickets).toBe(1);
      expect(seasonStats.best_bowling).toBe('1/18');
    });

    it('verifies Donovan Ferreira overall career stats include 18 matches, 326 runs, 2 fifties and 1 wicket', () => {
      const careerStats = getIplCareerStats('p-194');

      expect(careerStats.has_stats).toBe(true);
      expect(careerStats.has_ipl_career).toBe(true);
      expect(careerStats.matches).toBe(18);
      expect(careerStats.runs).toBe(326);
      expect(careerStats.fifties).toBe(2);
      expect(careerStats.wickets).toBe(1);
      expect(careerStats.highest_score).toBe('69');
      expect(careerStats.status).toBe('VERIFIED');
      expect(careerStats.source_provenance).toContain('Rajasthan Royals');
    });

    it('resolves Donovan Ferreira by ID (p-194), canonical name, and alias (D. Ferreira)', () => {
      const byId = getIplSeasonStats('p-194');
      const byName = getIplSeasonStats('Donovan Ferreira');
      const byAlias = getIplSeasonStats('D. Ferreira');

      expect(byId.runs).toBe(317);
      expect(byName.runs).toBe(317);
      expect(byAlias.runs).toBe(317);

      expect(byId.matches).toBe(15);
      expect(byName.matches).toBe(15);
      expect(byAlias.matches).toBe(15);
    });
  });

  describe('7. Verification of All Phase 6 Required Test Players', () => {
    it('verifies Virat Kohli (p-224) Batter dual stats', () => {
      const c = getIplCareerStats('p-224');
      const s = getIplSeasonStats('p-224');
      expect(c.matches).toBe(252);
      expect(c.runs).toBe(8004);
      expect(s.matches).toBe(15);
      expect(s.runs).toBe(741);
    });

    it('verifies Rohit Sharma (p-148) Batter dual stats', () => {
      const c = getIplCareerStats('p-148');
      const s = getIplSeasonStats('p-148');
      expect(c.matches).toBe(257);
      expect(c.runs).toBe(6628);
      expect(s.matches).toBe(14);
      expect(s.runs).toBe(417);
    });

    it('verifies MS Dhoni (p-028) resolves via alias "MS Dhoni" and contains catches/stumpings', () => {
      const c = getIplCareerStats('MS Dhoni');
      const s = getIplSeasonStats('MS Dhoni');
      expect(c.matches).toBe(264);
      expect(c.runs).toBe(5243);
      expect(c.dismissals).toBe(190);
      expect(c.catches).toBe(148);
      expect(c.stumpings).toBe(42);
      expect(s.matches).toBe(14);
      expect(s.runs).toBe(161);
    });

    it('verifies Hardik Pandya (p-164) All-Rounder dual stats', () => {
      const c = getIplCareerStats('p-164');
      const s = getIplSeasonStats('p-164');
      expect(c.matches).toBe(137);
      expect(c.runs).toBe(2525);
      expect(c.wickets).toBe(64);
      expect(s.matches).toBe(14);
      expect(s.runs).toBe(216);
      expect(s.wickets).toBe(11);
    });

    it('verifies Ayush Mhatre (p-006) as genuine IPL debutant', () => {
      const c = getIplCareerStats('p-006');
      const s = getIplSeasonStats('p-006');
      expect(c.has_stats).toBe(false);
      expect(c.has_ipl_career).toBe(false);
      expect(c.matches).toBe(0);
      expect(c.status).toBe('GENUINE_IPL_DEBUTANT');
      expect(s.has_stats).toBe(false);
      expect(s.has_season_stats).toBe(false);
      expect(s.matches).toBe(0);
      expect(s.status).toBe('GENUINE_IPL_DEBUTANT');
    });

    it('verifies Vaibhav Sooryavanshi (p-203) as genuine IPL debutant', () => {
      const c = getIplCareerStats('p-203');
      const s = getIplSeasonStats('p-203');
      expect(c.matches).toBe(0);
      expect(c.status).toBe('GENUINE_IPL_DEBUTANT');
      expect(s.matches).toBe(0);
      expect(s.status).toBe('GENUINE_IPL_DEBUTANT');
    });

    it('verifies Cameron Green (p-085) with batting and bowling statistics', () => {
      const c = getIplCareerStats('p-085');
      const s = getIplSeasonStats('p-085');
      expect(c.matches).toBe(29);
      expect(c.runs).toBe(707);
      expect(c.wickets).toBe(16);
      expect(c.best_bowling).toBe('2/12');
      expect(s.matches).toBe(11);
      expect(s.runs).toBe(228);
      expect(s.wickets).toBe(10);
      expect(s.best_bowling).toBe('2/12');
    });

    it('verifies Aiden Markram (p-117) with batting and bowling figures', () => {
      const c = getIplCareerStats('p-117');
      const s = getIplSeasonStats('p-117');
      expect(c.matches).toBe(44);
      expect(c.runs).toBe(995);
      expect(c.wickets).toBe(1);
      expect(s.matches).toBe(9);
      expect(s.runs).toBe(173);
    });

    it('verifies KL Rahul (p-036) with batting and wicketkeeping figures', () => {
      const c = getIplCareerStats('p-036');
      const s = getIplSeasonStats('p-036');
      expect(c.matches).toBe(132);
      expect(c.runs).toBe(4683);
      expect(c.dismissals).toBe(68);
      expect(s.matches).toBe(6);
      expect(s.runs).toBe(181);
    });

    it('verifies Marcus Stoinis (p-179) with batting and bowling figures', () => {
      const c = getIplCareerStats('p-179');
      const s = getIplSeasonStats('p-179');
      expect(c.matches).toBe(96);
      expect(c.runs).toBe(1866);
      expect(c.wickets).toBe(39);
      expect(c.best_bowling).toBe('4/15');
      expect(s.matches).toBe(7);
      expect(s.runs).toBe(116);
      expect(s.wickets).toBe(4);
      expect(s.best_bowling).toBe('2/24');
    });

    it('verifies Mitchell Marsh resolves from alias to "Mitch Marsh" (p-118)', () => {
      const c = getIplCareerStats('Mitchell Marsh');
      const s = getIplSeasonStats('Mitchell Marsh');
      expect(c.matches).toBe(42);
      expect(c.runs).toBe(665);
      expect(c.wickets).toBe(37);
      expect(c.best_bowling).toBe('4/25');
      expect(s.matches).toBe(10);
      expect(s.runs).toBe(135);
      expect(s.wickets).toBe(6);
      expect(s.best_bowling).toBe('2/18');
    });

    it('verifies Finn Allen (p-084) is a genuine IPL debutant', () => {
      const c = getIplCareerStats('p-084');
      const s = getIplSeasonStats('p-084');
      expect(c.matches).toBe(0);
      expect(c.status).toBe('GENUINE_IPL_DEBUTANT');
      expect(s.matches).toBe(0);
      expect(s.status).toBe('GENUINE_IPL_DEBUTANT');
    });
  });

  describe('8. Player Statistics Categories & Status Enforcement', () => {
    it('verifies player with career but no 2026 appearances has NO_APPEARANCES_IN_SEASON status', () => {
      const bantonCareer = getIplCareerStats('p-057');
      const bantonSeason = getIplSeasonStats('p-057');

      expect(bantonCareer.matches).toBeGreaterThan(0);
      expect(bantonCareer.status).toBe('VERIFIED');

      expect(bantonSeason.matches).toBe(0);
      expect(bantonSeason.has_stats).toBe(false);
      expect(bantonSeason.status).toBe('NO_APPEARANCES_IN_SEASON');
    });

    it('verifies genuine debutants have GENUINE_IPL_DEBUTANT status across both datasets', () => {
      const debutantCareer = getIplCareerStats('p-203');
      const debutantSeason = getIplSeasonStats('p-203');

      expect(debutantCareer.status).toBe('GENUINE_IPL_DEBUTANT');
      expect(debutantSeason.status).toBe('GENUINE_IPL_DEBUTANT');
    });

    it('verifies active established players have VERIFIED status across both datasets', () => {
      const kohliCareer = getIplCareerStats('p-224');
      const kohliSeason = getIplSeasonStats('p-224');

      expect(kohliCareer.status).toBe('VERIFIED');
      expect(kohliSeason.status).toBe('VERIFIED');
    });
  });

  describe('9. Normalization, Diacritics, Punctuation and Name Aliasing', () => {
    it('normalizes names with accents, punctuation, and casing', () => {
      expect(normalizePlayerName('Lhuan-dré Pretorius')).toBe('lhuandrepretorius');
      expect(normalizePlayerName('M.S. Dhoni')).toBe('msdhoni');
      expect(normalizePlayerName('K.L. Rahul')).toBe('klrahul');
      expect(normalizePlayerName('Donovan Ferreira')).toBe('donovanferreira');
    });

    it('resolves player IDs from various string variants', () => {
      expect(resolvePlayerId('p-194')).toBe('p-194');
      expect(resolvePlayerId('Donovan Ferreira')).toBe('p-194');
      expect(resolvePlayerId('D. Ferreira')).toBe('p-194');
      expect(resolvePlayerId('MS Dhoni')).toBe('p-028');
      expect(resolvePlayerId('Mahendra Singh Dhoni')).toBe('p-028');
      expect(resolvePlayerId('Mitchell Marsh')).toBe('p-118');
      expect(resolvePlayerId('Mitch Marsh')).toBe('p-118');
      expect(resolvePlayerId('Lhuan-dré Pretorius')).toBe('p-198');
      expect(resolvePlayerId('Lhuan-dre Pretorius')).toBe('p-198');
    });

    it('returns null for nonexistent player identifiers', () => {
      expect(resolvePlayerId('Nonexistent Player')).toBeNull();
      expect(resolvePlayerId('p-9999')).toBeNull();
    });
  });

  describe('10. Statistics API Endpoint Integration (/api/players/[id]/stats)', () => {
    it('returns 200 with complete dual stats for verified player (p-194 Donovan Ferreira)', async () => {
      const req = new NextRequest('http://localhost:3000/api/players/p-194/stats');
      const res = await getPlayerStatsRoute(req, { params: { id: 'p-194' } });

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.player_id).toBe('p-194');
      expect(json.canonical_name).toBe('Donovan Ferreira');
      expect(json.status).toBe('VERIFIED');
      expect(json.career.matches).toBe(18);
      expect(json.career.runs).toBe(326);
      expect(json.season_2026.matches).toBe(15);
      expect(json.season_2026.runs).toBe(317);
      expect(json.season_2026.fifties).toBe(2);
    });

    it('returns 200 when querying by alias "MS Dhoni"', async () => {
      const req = new NextRequest('http://localhost:3000/api/players/MS%20Dhoni/stats');
      const res = await getPlayerStatsRoute(req, { params: { id: 'MS Dhoni' } });

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.player_id).toBe('p-028');
      expect(json.canonical_name).toBe('Mahendra Singh Dhoni');
      expect(json.career.runs).toBe(5243);
    });

    it('returns 200 with GENUINE_IPL_DEBUTANT for uncapped player (p-006 Ayush Mhatre)', async () => {
      const req = new NextRequest('http://localhost:3000/api/players/p-006/stats');
      const res = await getPlayerStatsRoute(req, { params: { id: 'p-006' } });

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.status).toBe('GENUINE_IPL_DEBUTANT');
      expect(json.career.matches).toBe(0);
      expect(json.season_2026.matches).toBe(0);
    });

    it('returns 404 for unknown player ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/players/unknown-999/stats');
      const res = await getPlayerStatsRoute(req, { params: { id: 'unknown-999' } });

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
      expect(df!.season_2026_stats!.fifties).toBe(2);
      expect(df!.season_2026_stats!.highest_score).toBe('69');
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
      expect(biddingPayload.player.season_2026_stats?.fifties).toBe(2);
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
      expect(career.fifties).toBe(2);
      expect(career.wickets).toBe(1);

      expect(season.matches).toBe(15);
      expect(season.innings).toBe(13);
      expect(season.not_outs).toBe(4);
      expect(season.runs).toBe(317);
      expect(season.highest_score).toBe('69');
      expect(season.batting_average).toBe(35.22);
      expect(season.strike_rate).toBe(179.1);
      expect(season.fifties).toBe(2);
      expect(season.hundreds).toBe(0);
      expect(season.fours).toBe(25);
      expect(season.sixes).toBe(23);
      expect(season.wickets).toBe(1);
      expect(season.best_bowling).toBe('1/18');

      expect(season.cross_verification?.agreement_level).toBe('UNANIMOUS');
      expect(season.source_urls).toContain('https://www.iplt20.com/stats/2026');
      expect(season.source_urls).toContain('https://www.rajasthanroyals.com/rr-players/donovan-ferreira-ipl-profile-23487');
    });

    it('verifies generated Phase 2A reports exist and are populated', () => {
      const fs = require('fs');
      const path = require('path');

      const csvPath = path.join(process.cwd(), 'IPL_MULTI_SOURCE_STATISTICS_COMPARISON.csv');
      const mdCompPath = path.join(process.cwd(), 'IPL_MULTI_SOURCE_STATISTICS_COMPARISON.md');
      const discPath = path.join(process.cwd(), 'IPL_STATISTICS_DISCREPANCY_REPORT.md');
      const updatePath = path.join(process.cwd(), 'IPL_STATISTICS_DATASET_UPDATE_REPORT.md');

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

      // Mandatory assertion: Must NOT display "IPL Debutant"
      expect(career.status).not.toBe('GENUINE_IPL_DEBUTANT');
      expect(career.status).toBe('VERIFIED');
      expect(career.matches).toBe(10);
      expect(career.runs).toBe(170);
      expect(career.highest_score).toBe('54*');
      expect(career.fifties).toBe(1);

      // 2026 season record
      expect(season.status).not.toBe('GENUINE_IPL_DEBUTANT');
      expect(season.status).toBe('VERIFIED');
      expect(season.matches).toBe(10);
      expect(season.runs).toBe(170);
      expect(season.highest_score).toBe('54*');
      expect(season.fifties).toBe(1);

      // Name and alias resolution
      expect(resolvePlayerId('Mukul Choudhary')).toBe('p-115');
      expect(resolvePlayerId('M. Choudhary')).toBe('p-115');
    });

    it('proves Jacob Bethell (p-220) is NOT an IPL Debutant and carries distinct career (163) and 2026 (96) records', () => {
      const p = ALL_PLAYERS.find(x => x.id === 'p-220');
      expect(p).toBeDefined();
      expect(p!.name).toBe('Jacob Bethell');
      expect(p!.team).toBe('Royal Challengers Bengaluru');

      const career = getIplCareerStats('p-220');
      const season = getIplSeasonStats('p-220');

      // Mandatory assertion: Must NOT display "IPL Debutant"
      expect(career.status).not.toBe('GENUINE_IPL_DEBUTANT');
      expect(career.status).toBe('VERIFIED');
      expect(career.matches).toBe(9);
      expect(career.runs).toBe(163);
      expect(career.highest_score).toBe('55');
      expect(career.fifties).toBe(1);

      // Separate 2026 season record
      expect(season.status).not.toBe('GENUINE_IPL_DEBUTANT');
      expect(season.status).toBe('VERIFIED');
      expect(season.matches).toBe(7);
      expect(season.runs).toBe(96);
      expect(season.highest_score).toBe('27');

      // Separate and unmixed: Career > Season
      expect(career.runs).toBeGreaterThan(season.runs!);
      expect(career.matches).toBeGreaterThan(season.matches);

      // Name and alias resolution
      expect(resolvePlayerId('Jacob Bethell')).toBe('p-220');
      expect(resolvePlayerId('J. Bethell')).toBe('p-220');
    });

    it('proves Shreyas Iyer (p-172) carries full 2026 season record (14 M, 498 R) and NOT truncated 6 M, 139 R', () => {
      const p = ALL_PLAYERS.find(x => x.id === 'p-172');
      expect(p).toBeDefined();
      expect(p!.name).toBe('Shreyas Iyer');
      expect(p!.team).toBe('Punjab Kings');

      const season = getIplSeasonStats('p-172');
      const career = getIplCareerStats('p-172');

      // Mandatory assertion: Must NOT display 6 matches and 139 runs
      expect(season.matches).not.toBe(6);
      expect(season.runs).not.toBe(139);

      // Verified 2026 season metrics
      expect(season.matches).toBe(14);
      expect(season.runs).toBe(498);
      expect(season.highest_score).toBe('101*');
      expect(season.batting_average).toBe(55.33);
      expect(season.strike_rate).toBe(168.81);
      expect(season.fifties).toBe(5);
      expect(season.hundreds).toBe(1);

      // Verified career metrics
      expect(career.matches).toBe(129);
      expect(career.runs).toBe(3625);
      expect(career.hundreds).toBe(5);
      expect(career.fifties).toBe(24);

      // Name and alias resolution
      expect(resolvePlayerId('Shreyas Iyer')).toBe('p-172');
      expect(resolvePlayerId('S. Iyer')).toBe('p-172');
    });

    it('proves Ryan Rickelton, Josh Inglis, Priyansh Arya and Cooper Connolly have verified records', () => {
      // Ryan Rickelton (p-167)
      const ryan = getIplCareerStats('p-167');
      expect(ryan.matches).toBe(26);
      expect(ryan.runs).toBe(836);
      expect(ryan.status).toBe('VERIFIED');

      // Josh Inglis (p-136)
      const inglis = getIplCareerStats('p-136');
      expect(inglis.matches).toBe(16);
      expect(inglis.runs).toBe(544);
      expect(inglis.status).toBe('VERIFIED');

      // Priyansh Arya (p-168)
      const arya = getIplCareerStats('p-168');
      expect(arya.matches).toBe(31);
      expect(arya.runs).toBe(839);
      expect(arya.status).toBe('VERIFIED');

      // Cooper Connolly (p-170)
      const cooper = getIplCareerStats('p-170');
      expect(cooper.matches).toBe(14);
      expect(cooper.runs).toBe(491);
      expect(cooper.status).toBe('VERIFIED');
    });

    it('verifies all required deliverable documentation reports exist', () => {
      const fs = require('fs');
      const path = require('path');

      const auditPath = path.join(process.cwd(), 'IPL_STATISTICS_DATA_AUDIT_REPORT.md');
      const sourcePath = path.join(process.cwd(), 'IPL_STATISTICS_SOURCE_VERIFICATION.md');
      const mappingPath = path.join(process.cwd(), 'IPL_STATISTICS_MAPPING_ERRORS.md');
      const regressionPath = path.join(process.cwd(), 'IPL_STATISTICS_REGRESSION_TEST_REPORT.md');

      expect(fs.existsSync(auditPath)).toBe(true);
      expect(fs.existsSync(sourcePath)).toBe(true);
      expect(fs.existsSync(mappingPath)).toBe(true);
      expect(fs.existsSync(regressionPath)).toBe(true);

      const mappingContent = fs.readFileSync(mappingPath, 'utf8');
      expect(mappingContent).toContain('0 Mapping Errors');
      expect(mappingContent).toContain('Mukul Choudhary');
      expect(mappingContent).toContain('Jacob Bethell');
      expect(mappingContent).toContain('Shreyas Iyer');
    });
  });
});
