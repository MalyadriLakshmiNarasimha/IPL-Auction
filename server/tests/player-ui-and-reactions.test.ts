import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ALL_PLAYERS } from '../../src/shared/player-data';
import { getIplCareerStats, getPlayerAchievements } from '../../src/shared/player-career-data';
import { Reaction } from '../../src/shared/types';
import { BID_INCREMENTS } from '../../src/shared/constants';

describe('Player UI Enhancements, IPL Career Statistics & Multiplayer Reactions', () => {
  describe('1. Authentic Historical IPL Career Statistics Registry', () => {
    it('returns authentic all-time historical statistics for Virat Kohli', () => {
      const stats = getIplCareerStats('Virat Kohli');
      expect(stats.has_ipl_career).toBe(true);
      expect(stats.matches).toBe(252);
      expect(stats.runs).toBe(8004);
      expect(stats.strike_rate).toBeCloseTo(131.97, 1);
      expect(stats.batting_average).toBeCloseTo(38.66, 1);
    });

    it('returns authentic all-time historical statistics for Rohit Sharma', () => {
      const stats = getIplCareerStats('Rohit Sharma');
      expect(stats.has_ipl_career).toBe(true);
      expect(stats.matches).toBe(257);
      expect(stats.runs).toBe(6628);
      expect(stats.strike_rate).toBeCloseTo(131.14, 1);
      expect(stats.batting_average).toBeCloseTo(29.72, 1);
    });

    it('returns authentic all-time historical statistics for MS Dhoni', () => {
      const stats = getIplCareerStats('MS Dhoni');
      expect(stats.has_ipl_career).toBe(true);
      expect(stats.matches).toBe(264);
      expect(stats.runs).toBe(5243);
      expect(stats.strike_rate).toBeCloseTo(137.53, 1);
      expect(stats.batting_average).toBeCloseTo(39.12, 1);
    });

    it('returns authentic all-time historical statistics for bowlers (e.g. Jasprit Bumrah)', () => {
      const stats = getIplCareerStats('Jasprit Bumrah');
      expect(stats.has_ipl_career).toBe(true);
      expect(stats.matches).toBe(133);
    });

    it('gracefully handles uncapped debutants with zero IPL matches', () => {
      const stats = getIplCareerStats('Unknown Debutant 2026');
      expect(stats.has_ipl_career).toBe(false);
      expect(stats.matches).toBe(0);
      expect(stats.runs).toBe(0);
      expect(stats.strike_rate).toBe(0);
      expect(stats.batting_average).toBe(0);
    });
  });

  describe('2. Verified Authentic IPL Career Achievements', () => {
    it('returns verified achievements for Rohit Sharma (6-time champion)', () => {
      const achievements = getPlayerAchievements('Rohit Sharma');
      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements.some(a => a.includes('6-time IPL Champion'))).toBe(true);
    });

    it('returns verified achievements for MS Dhoni (5-time champion)', () => {
      const achievements = getPlayerAchievements('MS Dhoni');
      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements.some(a => a.includes('5-time IPL Champion'))).toBe(true);
    });

    it('returns verified achievements for Virat Kohli (Orange Cap & leading run scorer)', () => {
      const achievements = getPlayerAchievements('Virat Kohli');
      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements.some(a => a.includes('2-time Orange Cap Winner'))).toBe(true);
      expect(achievements.some(a => a.includes('All-Time Leading Run Scorer'))).toBe(true);
    });

    it('returns verified achievements for Sunil Narine (3-time MVP)', () => {
      const achievements = getPlayerAchievements('Sunil Narine');
      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements.some(a => a.includes('3-time IPL Most Valuable Player (MVP)'))).toBe(true);
    });

    it('returns verified achievements for Harshal Patel (2-time Purple Cap)', () => {
      const achievements = getPlayerAchievements('Harshal Patel');
      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements.some(a => a.includes('2-time Purple Cap Winner'))).toBe(true);
    });

    it('returns empty array when player has no recorded IPL career achievements', () => {
      const achievements = getPlayerAchievements('Nonexistent Player');
      expect(achievements).toEqual([]);
    });
  });

  describe('3. Player Object Augmentation with Career Stats and Achievements', () => {
    it('verifies ALL_PLAYERS have ipl_career_stats and achievements populated', () => {
      expect(ALL_PLAYERS.length).toBe(274);
      for (const player of ALL_PLAYERS) {
        expect(player.ipl_career_stats).toBeDefined();
        expect(typeof player.ipl_career_stats!.matches).toBe('number');
        expect(typeof player.ipl_career_stats!.runs).toBe('number');
        expect(typeof player.ipl_career_stats!.strike_rate).toBe('number');
        expect(typeof player.ipl_career_stats!.batting_average).toBe('number');
        expect(Array.isArray(player.achievements)).toBe(true);
      }
    });

    it('verifies specific marquee players retain accurate career stats in ALL_PLAYERS', () => {
      const kohli = ALL_PLAYERS.find(p => p.name === 'Virat Kohli');
      expect(kohli).toBeDefined();
      expect(kohli!.ipl_career_stats!.runs).toBe(8004);
      expect(kohli!.achievements!.length).toBeGreaterThan(0);

      const rohit = ALL_PLAYERS.find(p => p.name === 'Rohit Sharma');
      expect(rohit).toBeDefined();
      expect(rohit!.ipl_career_stats!.runs).toBe(6628);
      expect(rohit!.achievements!.some(a => a.includes('6-time IPL Champion'))).toBe(true);
    });
  });

  describe('4. Multiplayer Reaction Support (🥵)', () => {
    it('verifies 🥵 is a valid Reaction emoji type', () => {
      const hotReaction: Reaction = {
        id: 'test-rx-1',
        participant_id: 'part-123',
        display_name: 'Test Fan',
        franchise_color: '#F5B83D',
        emoji: '🥵',
        timestamp: Date.now(),
      };
      expect(hotReaction.emoji).toBe('🥵');
    });

    it('verifies ReactionRail component contains 🥵 in its emoji list', () => {
      const railPath = path.resolve(process.cwd(), 'src/components/ReactionRail.tsx');
      const railContent = fs.readFileSync(railPath, 'utf-8');
      expect(railContent).toContain("'🥵'");
    });
  });

  describe('5. Verified Badge Removal Verification', () => {
    it('verifies PlayerPortrait does not render VERIFIED overlay badge text', () => {
      const portraitPath = path.resolve(process.cwd(), 'src/components/PlayerPortrait.tsx');
      const portraitContent = fs.readFileSync(portraitPath, 'utf-8');
      expect(portraitContent).not.toContain('VERIFIED');
      expect(portraitContent).not.toContain('OFFICIAL PHOTO');
    });

    it('verifies PlayerSpotlight does not render Official Photo badge pill', () => {
      const spotlightPath = path.resolve(process.cwd(), 'src/components/PlayerSpotlight.tsx');
      const spotlightContent = fs.readFileSync(spotlightPath, 'utf-8');
      expect(spotlightContent).not.toContain('Official Photo');
    });

    it('verifies PlayerDossierModal does not render Official Headshot badge pill', () => {
      const dossierPath = path.resolve(process.cwd(), 'src/components/PlayerDossierModal.tsx');
      const dossierContent = fs.readFileSync(dossierPath, 'utf-8');
      expect(dossierContent).not.toContain('Official Headshot');
      expect(dossierContent).not.toContain('Card Placeholder');
    });
  });

  describe('6. Custom Bid Removal in StickyBidDock', () => {
    it('verifies StickyBidDock does not render Custom Bid button or input panel', () => {
      const dockPath = path.resolve(process.cwd(), 'src/components/StickyBidDock.tsx');
      const dockContent = fs.readFileSync(dockPath, 'utf-8');
      expect(dockContent).not.toContain('Custom Jump Bid');
      expect(dockContent).not.toContain('showCustomBid');
      expect(dockContent).not.toContain('Place Custom Bid');
      expect(dockContent).not.toContain('handleCustomBidSubmit');
    });

    it('verifies StickyBidDock uses 3-column balanced grid for standard quick bids', () => {
      const dockPath = path.resolve(process.cwd(), 'src/components/StickyBidDock.tsx');
      const dockContent = fs.readFileSync(dockPath, 'utf-8');
      expect(dockContent).toContain('grid grid-cols-3');
      expect(dockContent).toContain('Pass / Withdraw');
      expect(BID_INCREMENTS.length).toBe(3);
    });
  });
});
