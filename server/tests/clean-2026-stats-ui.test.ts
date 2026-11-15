import { describe, it, expect } from 'vitest';
import { ALL_PLAYERS, getPlayerById } from '../../src/shared/player-data';
import { getIplCareerStats, getIplSeasonStats } from '../../src/shared/player-career-data';
import registry from '../../src/shared/player-stats-registry.json';

describe('IPL AUCTION — Clean IPL 2026 Statistics Display & Multiplayer Sync Verification', () => {
  describe('1. Seven-Field Batting Statistics Specification', () => {
    it('verifies pure batters only contain the 7 supported batting metrics in 2026', () => {
      const batters = ['p-224', 'p-148', 'p-172', 'p-058', 'p-036']; // Kohli, Rohit, Shreyas Iyer, Gill, KL Rahul
      for (const id of batters) {
        const season = getIplSeasonStats(id);
        expect(season.matches).toBeGreaterThan(0);
        expect(season.innings).toBeDefined();
        expect(season.runs).toBeDefined();
        expect(season.batting_average).toBeDefined();
        expect(season.strike_rate).toBeDefined();
        expect(season.fours).toBeDefined();
        expect(season.sixes).toBeDefined();

        // Must not have unsupported bowling metrics
        expect(season.wickets).toBeUndefined();
      }
    });

    it('verifies Virat Kohli (p-224) 2026 batting metrics match the 7 fields exactly', () => {
      const season = getIplSeasonStats('p-224');
      expect(season.matches).toBe(16);
      expect(season.innings).toBe(16);
      expect(season.runs).toBe(675);
      expect(season.batting_average).toBeCloseTo(56.25, 2);
      expect(season.strike_rate).toBeCloseTo(165.85, 2);
      expect(season.fours).toBe(73);
      expect(season.sixes).toBe(25);
    });

    it('verifies Shreyas Iyer (p-172) 2026 batting metrics match the 7 fields exactly', () => {
      const season = getIplSeasonStats('p-172');
      expect(season.matches).toBe(14);
      expect(season.innings).toBe(13);
      expect(season.runs).toBe(498);
      expect(season.batting_average).toBeCloseTo(55.33, 2);
      expect(season.strike_rate).toBeCloseTo(168.81, 2);
      expect(season.fours).toBe(39);
      expect(season.sixes).toBe(30);
    });
  });

  describe('2. Seven-Field Bowling Statistics Specification', () => {
    it('verifies pure bowlers only contain the 7 supported bowling metrics in 2026', () => {
      const bowlers = ['p-045', 'p-153', 'p-070', 'p-074', 'p-184']; // Jamieson, Bumrah, Rashid Khan, Siraj, Chahal
      for (const id of bowlers) {
        const season = getIplSeasonStats(id);
        expect(season.matches).toBeGreaterThan(0);
        expect(season.bowling_innings).toBeDefined();
        expect(season.overs).toBeDefined();
        expect(season.balls).toBeDefined();
        expect(season.runs_conceded).toBeDefined();
        expect(season.wickets).toBeDefined();
        expect(season.economy_rate).toBeDefined();
      }
    });

    it('verifies Kyle Jamieson (p-045) 2026 bowling metrics match the 7 fields exactly', () => {
      const season = getIplSeasonStats('p-045');
      expect(season.matches).toBe(2);
      expect(season.bowling_innings).toBe(2);
      expect(season.overs).toBe(7);
      expect(season.balls).toBe(42);
      expect(season.runs_conceded).toBe(90);
      expect(season.wickets).toBe(2);
      expect(season.economy_rate).toBeCloseTo(12.86, 2);
    });

    it('verifies Jasprit Bumrah (p-153) 2026 bowling metrics match the 7 fields exactly', () => {
      const season = getIplSeasonStats('p-153');
      expect(season.matches).toBe(13);
      expect(season.bowling_innings).toBe(13);
      expect(season.overs).toBe(49);
      expect(season.balls).toBe(294);
      expect(season.runs_conceded).toBe(410);
      expect(season.wickets).toBe(4);
      expect(season.economy_rate).toBeCloseTo(8.37, 2);
    });
  });

  describe('3. Dynamic Role-Based Rendering Verification', () => {
    it('All-Rounders possess both batting and bowling data in 2026', () => {
      const allRounders = ['p-164', 'p-085', 'p-179', 'p-194']; // Hardik, Green, Stoinis, Ferreira
      for (const id of allRounders) {
        const season = getIplSeasonStats(id);
        expect(season.runs).toBeGreaterThan(0);
        expect(season.wickets).toBeDefined();
        expect(season.economy_rate).toBeGreaterThan(0);
      }
    });

    it('Donovan Ferreira (p-194) has both 7-field batting and 7-field bowling in 2026', () => {
      const season = getIplSeasonStats('p-194');
      // Batting (7 fields)
      expect(season.matches).toBe(15);
      expect(season.innings).toBe(13);
      expect(season.runs).toBe(317);
      expect(season.batting_average).toBeCloseTo(35.22, 2);
      expect(season.strike_rate).toBeCloseTo(179.10, 2);
      expect(season.fours).toBe(25);
      expect(season.sixes).toBe(23);

      // Bowling (7 fields)
      expect(season.bowling_innings).toBe(3);
      expect(season.overs).toBe(3.0);
      expect(season.balls).toBe(18);
      expect(season.runs_conceded).toBe(41);
      expect(season.wickets).toBe(1);
      expect(season.economy_rate).toBeCloseTo(13.67, 2);
    });

    it('Hardik Pandya (p-164) has both 7-field batting and 7-field bowling in 2026', () => {
      const season = getIplSeasonStats('p-164');
      // Batting
      expect(season.matches).toBe(10);
      expect(season.innings).toBe(10);
      expect(season.runs).toBe(206);
      expect(season.batting_average).toBeCloseTo(22.89, 2);
      expect(season.strike_rate).toBeCloseTo(138.26, 2);
      expect(season.fours).toBe(21);
      expect(season.sixes).toBe(7);

      // Bowling
      expect(season.bowling_innings).toBe(9);
      expect(season.overs).toBe(22.4);
      expect(season.balls).toBe(136);
      expect(season.runs_conceded).toBe(259);
      expect(season.wickets).toBe(4);
      expect(season.economy_rate).toBeCloseTo(11.43, 2);
    });

    it('Cameron Green (p-085) has both 7-field batting and 7-field bowling in 2026', () => {
      const season = getIplSeasonStats('p-085');
      // Batting
      expect(season.matches).toBe(14);
      expect(season.innings).toBe(14);
      expect(season.runs).toBe(322);
      expect(season.batting_average).toBeCloseTo(32.20, 2);
      expect(season.strike_rate).toBeCloseTo(145.70, 2);
      expect(season.fours).toBe(22);
      expect(season.sixes).toBe(17);

      // Bowling
      expect(season.bowling_innings).toBe(10);
      expect(season.overs).toBe(22.0);
      expect(season.balls).toBe(132);
      expect(season.runs_conceded).toBe(234);
      expect(season.wickets).toBe(7);
      expect(season.economy_rate).toBeCloseTo(10.64, 2);
    });
  });

  describe('4. Zero and Missing Value Distinction', () => {
    it('distinguishes genuine recorded zero wickets (e.g. Aiden Markram 2026) from missing values', () => {
      const season = getIplSeasonStats('p-117'); // Aiden Markram
      expect(season.wickets).toBe(0); // Genuine zero wickets taken
      expect(season.overs).toBe(6.0);
      expect(season.runs_conceded).toBe(83);
      expect(season.economy_rate).toBeCloseTo(13.83, 2);
    });

    it('pure batters have undefined (not zero) for bowling metrics', () => {
      const season = getIplSeasonStats('p-224'); // Virat Kohli did not bowl in 2026
      expect(season.wickets).toBeUndefined();
      expect(season.overs).toBeUndefined();
      expect(season.economy_rate).toBeUndefined();
    });
  });

  describe('5. Multiplayer Synchronization & Kyle Jamieson Verification', () => {
    it('confirms Kyle Jamieson (p-045) data is identical across serialized socket payloads', () => {
      const rawKyle = getPlayerById('p-045');
      expect(rawKyle).toBeDefined();

      // Simulate serialization across Socket.IO to Client 1 (Host) and Client 2 (Participant)
      const hostPayload = JSON.parse(JSON.stringify(rawKyle));
      const participantPayload = JSON.parse(JSON.stringify(rawKyle));

      const hostSeason = getIplSeasonStats(hostPayload);
      const participantSeason = getIplSeasonStats(participantPayload);

      // Verify exact parity between both clients
      expect(hostSeason.matches).toBe(participantSeason.matches);
      expect(hostSeason.matches).toBe(2);
      expect(hostSeason.bowling_innings).toBe(participantSeason.bowling_innings);
      expect(hostSeason.bowling_innings).toBe(2);
      expect(hostSeason.overs).toBe(participantSeason.overs);
      expect(hostSeason.overs).toBe(7);
      expect(hostSeason.balls).toBe(participantSeason.balls);
      expect(hostSeason.balls).toBe(42);
      expect(hostSeason.runs_conceded).toBe(participantSeason.runs_conceded);
      expect(hostSeason.runs_conceded).toBe(90);
      expect(hostSeason.wickets).toBe(participantSeason.wickets);
      expect(hostSeason.wickets).toBe(2);
      expect(hostSeason.economy_rate).toBeCloseTo(participantSeason.economy_rate!, 2);
      expect(hostSeason.economy_rate).toBeCloseTo(12.86, 2);
    });

    it('verifies PlayerStatsCarousel component imports cleanly and exports as React FC', async () => {
      const carouselModule = await import('../../src/components/PlayerStatsCarousel');
      expect(carouselModule.PlayerStatsCarousel).toBeDefined();
      expect(typeof carouselModule.PlayerStatsCarousel).toBe('function');
    }, 15000);
  });
});
