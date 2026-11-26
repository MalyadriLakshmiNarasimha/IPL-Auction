import { describe, it, expect } from 'vitest';
import { ALL_PKL_PLAYERS, PKL_FRANCHISES, getPklPlayerById, getPklPlayerStats } from '../../src/shared/pkl-player-data';
import { ALL_PLAYERS, getPlayerById } from '../../src/shared/player-data';
import { PKL_BID_INCREMENTS, BID_INCREMENTS } from '../../src/shared/constants';
import {
  computeParticipantMetrics,
  calculate5PillarSquadScore,
  calculatePlayingXIScore,
  normalizeRoleToCode,
} from '../../src/shared/scoring';
import { Participant, RoomSettings, PlayingXISubmission } from '../../src/shared/types';

describe('Dual-Sport Architecture & PKL Integration Verification Suite', () => {
  it('1. Verifies complete dataset separation between IPL (274) and PKL (235)', () => {
    expect(ALL_PLAYERS.length).toBe(274);
    expect(ALL_PKL_PLAYERS.length).toBe(235);

    // Verify ID namespaces are completely disjoint
    const iplIds = new Set(ALL_PLAYERS.map(p => p.id));
    const pklIds = new Set(ALL_PKL_PLAYERS.map(p => p.id));

    for (const id of pklIds) {
      expect(iplIds.has(id)).toBe(false);
      expect(id.startsWith('k-')).toBe(true);
    }

    // Role separation: PKL has Raider, Defender, All-Rounder (no cricket roles)
    const pklRoles = new Set(ALL_PKL_PLAYERS.map(p => p.role));
    expect(pklRoles.has('Raider' as any)).toBe(true);
    expect(pklRoles.has('Defender' as any)).toBe(true);
    expect(pklRoles.has('Batter' as any)).toBe(false);
    expect(pklRoles.has('Bowler' as any)).toBe(false);
    expect(pklRoles.has('Wicketkeeper' as any)).toBe(false);

    // Cricket roles in IPL
    const iplRoles = new Set(ALL_PLAYERS.map(p => p.role));
    expect(iplRoles.has('Batter')).toBe(true);
    expect(iplRoles.has('Bowler')).toBe(true);
    expect(iplRoles.has('Raider' as any)).toBe(false);
    expect(iplRoles.has('Defender' as any)).toBe(false);
  });

  it('2. Verifies franchise separation: 10 IPL franchises vs 12 PKL franchises', () => {
    expect(PKL_FRANCHISES.length).toBe(12);
    const pklShortCodes = PKL_FRANCHISES.map(f => f.short_code);
    expect(pklShortCodes).toContain('PAT');
    expect(pklShortCodes).toContain('PUN');
    expect(pklShortCodes).toContain('JPP');
    expect(pklShortCodes).toContain('BB');
    expect(pklShortCodes).toContain('DEL');
    expect(pklShortCodes).toContain('MUM');
    expect(pklShortCodes).toContain('BW');
    expect(pklShortCodes).toContain('GG');
    expect(pklShortCodes).toContain('HAR');
    expect(pklShortCodes).toContain('TAM');
    expect(pklShortCodes).toContain('TEL');
    expect(pklShortCodes).toContain('UP');

    // No cross-contamination with IPL franchises
    expect(pklShortCodes).not.toContain('CSK');
    expect(pklShortCodes).not.toContain('MI');
    expect(pklShortCodes).not.toContain('RCB');
    expect(pklShortCodes).not.toContain('KKR');
  });

  it('3. Verifies PKL bid increments (+₹2L, +₹5L, +₹10L) vs IPL (+₹25L, +₹50L, +₹1Cr)', () => {
    expect(PKL_BID_INCREMENTS).toEqual([
      { label: '+₹2L', amount: 2_00_000 },
      { label: '+₹5L', amount: 5_00_000 },
      { label: '+₹10L', amount: 10_00_000 },
    ]);

    expect(BID_INCREMENTS).toEqual([
      { label: '+₹25L', amount: 25_00_000 },
      { label: '+₹50L', amount: 50_00_000 },
      { label: '+₹1Cr', amount: 1_00_00_000 },
    ]);
  });

  it('4. Verifies PKL player lookup and statistics retrieval by canonical and legacy ID', () => {
    // Canonical k-001 (Ankush Rathee)
    const p1 = getPklPlayerById('k-001');
    expect(p1).toBeDefined();
    expect(p1?.name).toBe('Ankush Rathee');
    expect(p1?.role).toBe('Defender');
    expect(p1?.position_detail).toBe('Left Corner');

    const s1 = getPklPlayerStats('k-001');
    expect(s1).toBeDefined();
    expect(s1?.career).toBeDefined();
    expect(s1?.career?.tackle_points).toBeGreaterThan(0);

    // Legacy lookup (pkl-001 -> k-198 Pawan Sehrawat)
    const pLegacy = getPklPlayerById('pkl-001');
    expect(pLegacy).toBeDefined();
    expect(pLegacy?.name).toBe('Pawan Sehrawat');
    expect(pLegacy?.id).toBe('k-198');
  });

  it('5. Verifies computeParticipantMetrics correctly evaluates PKL squads without cricket assumptions', () => {
    const raider = getPklPlayerById('k-002')!; // Akash Shinde (Raider, India)
    const defender = getPklPlayerById('k-001')!; // Ankush Rathee (Defender, India)
    const allrounder = getPklPlayerById('k-218')!; // Mohammadreza Shadloui (All-Rounder, Iran)

    const pklParticipant: Participant = {
      id: 'p-pkl-1',
      room_code: 'PKL123',
      display_name: 'Bengaluru Tigers',
      franchise: PKL_FRANCHISES[0],
      is_host: false,
      is_connected: true,
      last_active: Date.now(),
      has_withdrawn_current: false,
      purse_remaining: 3_50_00_000,
      squad: [
        { player_id: raider.id, player: raider, bought_for: 1_20_00_000, timestamp: 1 },
        { player_id: defender.id, player: defender, bought_for: 80_00_000, timestamp: 2 },
        { player_id: allrounder.id, player: allrounder, bought_for: 90_00_000, timestamp: 3 },
      ],
      spent_by_role: { RAID: 1_20_00_000, DEF: 80_00_000, AR: 90_00_000 },
      role_counts: { RAID: 1, DEF: 1, AR: 1, overseas: 1 },
    };

    const pklSettings: RoomSettings = {
      purse: 5_00_00_000,
      squad_size: 14,
      timer_seconds: 15,
      order_type: 'role',
      sport_type: 'PKL',
      accelerated_round: true,
      selected_player_ids: [],
    };

    const metrics = computeParticipantMetrics(pklParticipant, pklSettings);
    expect(metrics.amount_spent).toBe(2_90_00_000);
    expect(metrics.role_counts.RAID).toBe(1);
    expect(metrics.role_counts.DEF).toBe(1);
    expect(metrics.role_counts.AR).toBe(1);
    expect(metrics.role_counts.overseas).toBe(1);

    // CRITICAL: Must NOT contain "Wicketkeeper" shortage for PKL!
    const wkShortage = metrics.squad_shortages.find(s => s.toLowerCase().includes('wicketkeeper'));
    expect(wkShortage).toBeUndefined();
  });

  it('6. Verifies calculate5PillarSquadScore for PKL does not penalize for missing wicketkeeper', () => {
    const raider = getPklPlayerById('k-001')!;
    const defender = getPklPlayerById('k-002')!;
    const allrounder = getPklPlayerById('k-003')!;

    const pklParticipant: Participant = {
      id: 'p-pkl-2',
      room_code: 'PKL123',
      display_name: 'Puneri Dynamos',
      franchise: PKL_FRANCHISES[1],
      is_host: false,
      is_connected: true,
      last_active: Date.now(),
      has_withdrawn_current: false,
      purse_remaining: 2_00_00_000,
      squad: [
        { player_id: raider.id, player: raider, bought_for: 1_00_00_000, timestamp: 1 },
        { player_id: defender.id, player: defender, bought_for: 90_00_000, timestamp: 2 },
        { player_id: allrounder.id, player: allrounder, bought_for: 80_00_000, timestamp: 3 },
      ],
      spent_by_role: { RAID: 1_00_00_000, DEF: 90_00_000, AR: 80_00_000 },
      role_counts: { RAID: 1, DEF: 1, AR: 1, overseas: 2 },
    };

    const pklSettings: RoomSettings = {
      purse: 5_00_00_000,
      squad_size: 14,
      timer_seconds: 15,
      order_type: 'role',
      sport_type: 'PKL',
      accelerated_round: true,
      selected_player_ids: [],
    };

    const result = calculate5PillarSquadScore(pklParticipant, pklSettings);
    expect(result.scoring_version).toBe('2026.1-5pillar-pkl');
    expect(result.total_score).toBeGreaterThan(0);

    // Ensure zero mentions of wicketkeeper in weaknesses
    const wkWeakness = result.weaknesses.find(w => w.toLowerCase().includes('wicketkeeper'));
    expect(wkWeakness).toBeUndefined();
  });

  it('7. Verifies calculatePlayingXIScore seamlessly handles PKL Starting 7 submissions', () => {
    // Pick 7 PKL players
    const starters = ALL_PKL_PLAYERS.slice(0, 7);

    const submission: PlayingXISubmission = {
      participant_id: 'p-pkl-3',
      display_name: 'Jaipur Royals',
      franchise: PKL_FRANCHISES[2],
      players: starters,
      batting_order: starters.map(p => p.id),
      captain_id: starters[0].id,
      wicketkeeper_id: starters[0].id,
      substitutes: [],
      is_submitted: true,
    };

    const score = calculatePlayingXIScore(submission);
    expect(score.total_score).toBeGreaterThan(0);
    expect(score.weaknesses.some(w => w.includes('Incomplete Playing XI'))).toBe(false);
    expect(score.weaknesses.some(w => w.includes('wicketkeeper'))).toBe(false);
    expect(score.batting_score).toBeGreaterThan(0); // raiding
    expect(score.bowling_score).toBeGreaterThan(0); // defense
  });

  it('8. Verifies role-based PKL statistics logic across Raider, Defender, and All-Rounder', async () => {
    const { getPklRoleCategory } = await import('../../src/components/PlayerStatsCarousel');

    // Verify 100% role categorization accuracy across all 235 PKL players
    let raiderCount = 0;
    let defenderCount = 0;
    let allrounderCount = 0;

    for (const p of ALL_PKL_PLAYERS) {
      const cat = getPklRoleCategory(p.role);
      if (cat === 'Raider') raiderCount++;
      if (cat === 'Defender') defenderCount++;
      if (cat === 'All-Rounder') allrounderCount++;

      // Strict role check
      if (p.role === 'Raider') expect(cat).toBe('Raider');
      if (p.role === 'Defender') expect(cat).toBe('Defender');
      if (p.role === 'All-Rounder') expect(cat).toBe('All-Rounder');
    }

    expect(raiderCount).toBe(88);
    expect(defenderCount).toBe(111);
    expect(allrounderCount).toBe(36);
    expect(raiderCount + defenderCount + allrounderCount).toBe(235);

    // Verify specific players
    expect(getPklRoleCategory('Raider')).toBe('Raider');
    expect(getPklRoleCategory('Defender')).toBe('Defender');
    expect(getPklRoleCategory('All-Rounder')).toBe('All-Rounder');
    expect(getPklRoleCategory('RAID')).toBe('Raider');
    expect(getPklRoleCategory('DEF')).toBe('Defender');
    expect(getPklRoleCategory('AR')).toBe('All-Rounder');
  }, 15000);

  it('9. Verifies PKL bidding dock stabilizes as fixed-bottom while IPL retains sticky layout', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const dockFile = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/StickyBidDock.tsx'),
      'utf-8'
    );
    const roomPageFile = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/room/[code]/page.tsx'),
      'utf-8'
    );

    // PKL Bidding dock must use fixed-bottom with safe-area padding
    expect(dockFile).toContain('fixed bottom-0 left-0 right-0 z-40');
    expect(dockFile).toContain('pb-[max(0.5rem,env(safe-area-inset-bottom))]');

    // IPL Bidding dock must retain sticky bottom layout
    expect(dockFile).toContain('sticky bottom-0 left-0 right-0 z-30');

    // Room page must provide ample bottom padding for PKL to prevent dock overlap
    expect(roomPageFile).toContain("settings?.sport_type === 'PKL' ? 'pb-28 sm:pb-32' : 'pb-2'");
  });
});
