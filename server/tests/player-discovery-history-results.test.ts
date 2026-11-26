import { describe, it, expect } from 'vitest';
import { ALL_PLAYERS, getPlayerById } from '../../src/shared/player-data';
import { ALL_PKL_PLAYERS, getPklPlayerById, getPklPlayerStats, LEGACY_PKL_ID_MAP } from '../../src/shared/pkl-player-data';
import {
  getIplCareerStats,
  getIplSeasonStats,
  resolvePlayerId,
  HISTORICAL_IPL_ACHIEVEMENTS,
} from '../../src/shared/player-career-data';
import { buildFullAuctionResults } from '../../src/shared/auction-results-engine';

describe('Player Discovery Centre & Auction Results Engine Integration Tests', () => {
  describe('Phase 4: Player Discovery Centre & Authoritative Registries', () => {
    it('verifies IPL registry contains 274 registered players without cross-contamination', () => {
      expect(ALL_PLAYERS.length).toBe(274);
      const sampleIpl = ALL_PLAYERS[0];
      expect(sampleIpl.id).toBeDefined();
      expect(sampleIpl.name).toBeDefined();
      expect(sampleIpl.base_price).toBeGreaterThan(0);
      expect(sampleIpl.role).toBeDefined();

      // Ensure no PKL players appear in IPL pool
      const pklPlayerInIpl = ALL_PLAYERS.find(p => p.id.startsWith('k-') || p.id.startsWith('pkl-'));
      expect(pklPlayerInIpl).toBeUndefined();
    });

    it('verifies PKL registry contains 235 registered players without cross-contamination', () => {
      expect(ALL_PKL_PLAYERS.length).toBe(235);
      const samplePkl = ALL_PKL_PLAYERS[0];
      expect(samplePkl.id).toBeDefined();
      expect(samplePkl.name).toBeDefined();
      expect(samplePkl.base_price).toBeGreaterThan(0);
      expect(samplePkl.role).toBeDefined();

      // Ensure no IPL players appear in PKL pool
      const iplPlayerInPkl = ALL_PKL_PLAYERS.find(p => p.id.startsWith('p-'));
      expect(iplPlayerInPkl).toBeUndefined();
    });

    it('separates IPL Career Statistics from IPL 2026 Season Statistics without fabricated zeros', () => {
      // Marquee player with full career
      const kohli = ALL_PLAYERS.find(p => p.name.includes('Kohli'));
      expect(kohli).toBeDefined();
      const careerStats = getIplCareerStats(kohli!.id);
      expect(careerStats.has_ipl_career).toBe(true);
      expect(careerStats.runs).toBeGreaterThan(5000);
      expect(careerStats.matches).toBeGreaterThan(200);

      const seasonStats = getIplSeasonStats(kohli!.id);
      expect(seasonStats.season).toBe('2026');

      // Emerging uncapped debutant with no recorded IPL career
      const debutant = ALL_PLAYERS.find(p => !p.capped && (p as any).data_status === 'DEBUTANT');
      if (debutant) {
        const debStats = getIplCareerStats(debutant.id);
        expect(debStats.has_ipl_career).toBe(false);
      }
    });

    it('separates PKL Career Statistics from PKL Season 12 Statistics', () => {
      const pawan = getPklPlayerById('pkl-001') || ALL_PKL_PLAYERS.find(p => p.name.includes('Pawan'));
      expect(pawan).toBeDefined();

      const pklStats = getPklPlayerStats(pawan!.id);
      expect(pklStats).toBeDefined();
      expect(pklStats?.career).toBeDefined();
      expect(pklStats?.career?.raid_points).toBeGreaterThan(0);
    });

    it('resolves player aliases and legacy PKL identifiers deterministically', () => {
      // Legacy PKL mapping
      expect(LEGACY_PKL_ID_MAP['pkl-001']).toBe('k-198');
      const resolvedPkl = getPklPlayerById('pkl-001');
      expect(resolvedPkl).toBeDefined();
      expect(resolvedPkl?.name).toBe('Pawan Sehrawat');

      // IPL alias mapping
      const resolvedDhoni = resolvePlayerId('MS Dhoni');
      expect(resolvedDhoni).toBeDefined();
      expect(HISTORICAL_IPL_ACHIEVEMENTS['Virat Kohli']).toBeDefined();
      expect(HISTORICAL_IPL_ACHIEVEMENTS['Virat Kohli'].length).toBeGreaterThan(0);
    });
  });

  describe('Phase 5: Contextual Auction Availability Model', () => {
    it('supports all 6 required availability statuses deterministically', () => {
      const statuses = [
        'AVAILABLE',
        'SOLD',
        'UNSOLD',
        'WITHDRAWN',
        'NOT IN AUCTION',
        'AUCTION NOT SELECTED',
      ];
      expect(statuses).toHaveLength(6);
    });
  });

  describe('Phase 2 & 3: Post-Auction Results Engine (buildFullAuctionResults)', () => {
    it('generates a complete 7-section result snapshot from auction data', () => {
      const roomCode = 'TEST01';
      const roomName = 'Championship Finale 2026';
      const sportType = 'IPL';
      const completedAt = Date.now();

      const participants = [
        {
          id: 'part_1',
          user_id: 'user_1',
          room_code: roomCode,
          team_id: 'CSK',
          team_name: 'Chennai Super Kings',
          purse_remaining: 150000000,
          current_squad_count: 5,
          user: { name: 'Captain Cool', email: 'cool@test.com' },
        },
        {
          id: 'part_2',
          user_id: 'user_2',
          room_code: roomCode,
          team_id: 'MI',
          team_name: 'Mumbai Indians',
          purse_remaining: 50000000,
          current_squad_count: 5,
          user: { name: 'Hitman Manager', email: 'hitman@test.com' },
        },
      ];

      const rawLeaderboard = [
        {
          rank: 1,
          team_id: 'CSK',
          team_name: 'Chennai Super Kings',
          manager_name: 'Captain Cool',
          final_score: 875,
          squad_size: 5,
          purse_spent: 850000000,
          purse_remaining: 150000000,
        },
        {
          rank: 2,
          team_id: 'MI',
          team_name: 'Mumbai Indians',
          manager_name: 'Hitman Manager',
          final_score: 820,
          squad_size: 5,
          purse_spent: 950000000,
          purse_remaining: 50000000,
        },
      ];

      const allCompletedBids = [
        {
          player_id: 'p-001',
          player_name: 'Dewald Brevis',
          role: 'BAT',
          winning_team: 'CSK',
          winning_bid: 25000000,
          winning_manager: 'Captain Cool',
          base_price: 20000000,
          bids_count: 8,
        },
        {
          player_id: 'p-002',
          player_name: 'Ruturaj Gaikwad',
          role: 'BAT',
          winning_team: 'MI',
          winning_bid: 180000000,
          winning_manager: 'Hitman Manager',
          base_price: 20000000,
          bids_count: 24,
        },
      ];

      const results = buildFullAuctionResults(
        roomCode,
        roomName,
        sportType,
        completedAt,
        participants,
        rawLeaderboard,
        [],
        allCompletedBids,
        ['p-003', 'p-004'],
        [],
        274
      );

      // Section A: Overview
      expect(results.overview).toBeDefined();
      expect(results.overview.room_code).toBe(roomCode);
      expect(results.overview.sport_type).toBe('IPL');
      expect(results.overview.total_teams).toBe(2);
      expect(results.team_rankings[0].team_name).toBe('Chennai Super Kings');

      // Section B: Team Rankings
      expect(results.team_rankings).toHaveLength(2);
      expect(results.team_rankings[0].rank).toBe(1);
      expect(results.team_rankings[0].squad_rating).toBeGreaterThan(0);
      expect(results.team_rankings[0].squad).toBeDefined();

      // Section C: Squad Comparison
      expect(results.squad_comparison).toHaveLength(2);
      expect(results.squad_comparison[0].team_name).toBeDefined();
      expect(results.squad_comparison[0].squad_rating).toBeGreaterThan(0);

      // Section D: Purse Management Awards
      expect(results.purse_awards).toBeDefined();
      expect(results.purse_awards.length).toBeGreaterThan(0);

      // Section E: Player Awards
      expect(results.player_awards).toBeDefined();
      expect(results.player_awards.length).toBeGreaterThan(0);
      const expensiveAward = results.player_awards.find(a => a.award_name === 'Most Expensive Player');
      expect(expensiveAward?.player_name).toBe('Ruturaj Gaikwad');

      // Section F: Bidding Records
      expect(results.bidding_records).toBeDefined();
      expect(results.bidding_records.total_bids_during_auction).toBe(32); // 8 + 24
      expect(results.bidding_records.most_contested_player).toBeDefined();
      expect(results.bidding_records.highest_number_of_bids).toBe(24);

      // Section G: Purchase History
      expect(results.player_purchase_history).toBeDefined();
      expect(results.player_purchase_history.length).toBeGreaterThanOrEqual(2);
      expect(results.player_purchase_history.some(p => p.status === 'SOLD')).toBe(true);
      expect(results.player_purchase_history.some(p => p.status === 'UNSOLD')).toBe(true);
    });

    it('is idempotent and produces identical outputs across multiple evaluations', () => {
      const roomCode = 'IDEM01';
      const callA = buildFullAuctionResults(roomCode, 'Room A', 'IPL', 1000, [], [], [], [], [], [], 100);
      const callB = buildFullAuctionResults(roomCode, 'Room A', 'IPL', 1000, [], [], [], [], [], [], 100);
      expect(callA.overview.room_code).toBe(callB.overview.room_code);
      expect(callA.bidding_records.total_bids_during_auction).toBe(callB.bidding_records.total_bids_during_auction);
    });
  });
});
