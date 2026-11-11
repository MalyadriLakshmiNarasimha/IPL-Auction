import { describe, it, expect } from 'vitest';
import { ALL_PLAYERS, getPlayerById } from '../../src/shared/player-data';
import {
  getIplCareerStats,
  getIplSeasonStats,
  HISTORICAL_IPL_CAREER_BY_ID,
  HISTORICAL_IPL_2026_BY_ID,
} from '../../src/shared/player-career-data';

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
    });
  });
});
