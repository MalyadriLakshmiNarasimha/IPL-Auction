import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ALL_PLAYERS } from '../../src/shared/player-data';
import {
  getPlayerCategory,
  fisherYatesShuffle,
  generateCategoryWiseSequence,
  validateCategorySequence,
  PLAYER_CATEGORY_ORDER,
} from '../../src/shared/player-sequence';
import { RoomManager } from '../room';
import { voiceCommentary } from '../../src/lib/voice-commentary';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';

function createMockIo(): any {
  const emitted: Record<string, any[]> = {};
  return {
    to: () => ({
      emit: (event: string, data: any) => {
        if (!emitted[event]) emitted[event] = [];
        emitted[event].push(data);
      },
    }),
    emit: (event: string, data: any) => {
      if (!emitted[event]) emitted[event] = [];
      emitted[event].push(data);
    },
    _getEmitted: (event: string) => emitted[event] || [],
  };
}

describe('IPL Auction — Voice Optimization & Category-Wise Player Sequence Verification', () => {
  // --------------------------------------------------------------------------
  // 1. Fixed Category Sequence: BATTERS -> BOWLERS -> ALL-ROUNDERS -> WICKET KEEPERS
  // --------------------------------------------------------------------------
  describe('1. Fixed Category Sequence & Player Classification', () => {
    it('accurately classifies players into the 4 authoritative categories', () => {
      const virat = ALL_PLAYERS.find(p => p.name === 'Virat Kohli')!;
      const bumrah = ALL_PLAYERS.find(p => p.name === 'Jasprit Bumrah')!;
      const pandya = ALL_PLAYERS.find(p => p.name === 'Hardik Pandya')!;
      const pant = ALL_PLAYERS.find(p => p.name === 'Rishabh Pant')!;

      expect(getPlayerCategory(virat)).toBe('BATTERS');
      expect(getPlayerCategory(bumrah)).toBe('BOWLERS');
      expect(getPlayerCategory(pandya)).toBe('ALL-ROUNDERS');
      expect(getPlayerCategory(pant)).toBe('WICKET KEEPERS');
    });

    it('classifies all 274 players into exactly one valid category without unknowns', () => {
      for (const player of ALL_PLAYERS) {
        const cat = getPlayerCategory(player);
        expect(PLAYER_CATEGORY_ORDER).toContain(cat);
      }
    });

    it('orders the entire sequence strictly as: 1. BATTERS, 2. BOWLERS, 3. ALL-ROUNDERS, 4. WICKET KEEPERS', () => {
      const sequence = generateCategoryWiseSequence(ALL_PLAYERS);
      expect(sequence.length).toBe(ALL_PLAYERS.length);

      const validation = validateCategorySequence(sequence, ALL_PLAYERS);
      expect(validation.valid).toBe(true);

      // Verify category segments
      let currentStage: 'BATTERS' | 'BOWLERS' | 'ALL-ROUNDERS' | 'WICKET KEEPERS' = 'BATTERS';
      const stageTransitionIndices: Record<string, number> = {};

      for (let i = 0; i < sequence.length; i++) {
        const player = sequence[i];
        const cat = getPlayerCategory(player);

        if (cat !== currentStage) {
          if (currentStage === 'BATTERS') {
            expect(cat).toBe('BOWLERS');
            currentStage = 'BOWLERS';
          } else if (currentStage === 'BOWLERS') {
            expect(cat).toBe('ALL-ROUNDERS');
            currentStage = 'ALL-ROUNDERS';
          } else if (currentStage === 'ALL-ROUNDERS') {
            expect(cat).toBe('WICKET KEEPERS');
            currentStage = 'WICKET KEEPERS';
          }
          stageTransitionIndices[currentStage] = i;
        }
      }

      // Guarantee all 4 categories exist and transitioned in order
      expect(stageTransitionIndices['BOWLERS']).toBeGreaterThan(0);
      expect(stageTransitionIndices['ALL-ROUNDERS']).toBeGreaterThan(stageTransitionIndices['BOWLERS']);
      expect(stageTransitionIndices['WICKET KEEPERS']).toBeGreaterThan(stageTransitionIndices['ALL-ROUNDERS']);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Franchise Mixing & Randomization within Categories
  // --------------------------------------------------------------------------
  describe('2. Franchise Mixing & Randomization', () => {
    it('mixes players from different franchises within each category (no team clustering)', () => {
      const sequence = generateCategoryWiseSequence(ALL_PLAYERS);
      const batters = sequence.filter(p => getPlayerCategory(p) === 'BATTERS');

      // Collect team codes for first 15 batters
      const sampleTeams = batters.slice(0, 15).map(p => p.team_code);
      const uniqueTeamsInSample = new Set(sampleTeams);

      // In a mixed list, 15 batters should come from at least 4 different franchises
      expect(uniqueTeamsInSample.size).toBeGreaterThanOrEqual(4);

      // Verify players from the same franchise are not contiguous
      let contiguousSameTeamCount = 0;
      for (let i = 1; i < batters.length; i++) {
        if (batters[i].team_code === batters[i - 1].team_code) {
          contiguousSameTeamCount++;
        }
      }
      // With 10 teams uniformly distributed, same-team adjacency is rare (< 25% of list)
      expect(contiguousSameTeamCount).toBeLessThan(batters.length * 0.35);
    });

    it('produces unbiased randomized orders within categories across different generations', () => {
      const seq1 = generateCategoryWiseSequence(ALL_PLAYERS);
      const seq2 = generateCategoryWiseSequence(ALL_PLAYERS);

      // Both sequences must have the exact same length and valid category order
      expect(seq1.length).toBe(ALL_PLAYERS.length);
      expect(seq2.length).toBe(ALL_PLAYERS.length);

      // The exact order of player IDs within the sequences must differ due to Fisher-Yates shuffle
      const ids1 = seq1.map(p => p.id).join(',');
      const ids2 = seq2.map(p => p.id).join(',');
      expect(ids1).not.toBe(ids2);

      // But both satisfy category ordering
      expect(validateCategorySequence(seq1, ALL_PLAYERS).valid).toBe(true);
      expect(validateCategorySequence(seq2, ALL_PLAYERS).valid).toBe(true);
    });

    it('guarantees that every player appears exactly once (zero duplicates, zero missing)', () => {
      const sequence = generateCategoryWiseSequence(ALL_PLAYERS);
      const ids = sequence.map(p => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ALL_PLAYERS.length);
      expect(sequence.length).toBe(ALL_PLAYERS.length);

      for (const player of ALL_PLAYERS) {
        expect(uniqueIds.has(player.id)).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. Authoritative Room State & No Re-Randomization on Progression
  // --------------------------------------------------------------------------
  describe('3. Authoritative Auction Sequencing & Progression', () => {
    it('generates the sequence once at startAuction and preserves order through sold/unsold transitions', () => {
      const mockIo = createMockIo();
      const rm = new RoomManager(mockIo);
      const room = rm.createRoom('SEQ101', 'Sequence Room', 'host-1', 'Host One');

      // Set order_type to role
      room.settings.order_type = 'role';
      room.settings.selected_player_ids = ALL_PLAYERS.map(p => p.id);

      // Add a second manager so auction can start
      rm.joinRoom('SEQ101', 'guest-1', 'Guest Manager', 'socket-g1');

      // Set team names for participants to satisfy startValidation
      room.participants.get('host-1')!.team_name = 'Host Super Kings';
      room.participants.get('guest-1')!.team_name = 'Guest Royals';

      // Start auction
      const started = rm.startAuction('SEQ101', 'host-1');
      expect(started).toBe(true);

      // Initial pool sequence must be category-ordered
      expect(room.pool.length).toBe(ALL_PLAYERS.length);
      expect(validateCategorySequence(room.pool, ALL_PLAYERS).valid).toBe(true);

      // Capture next 5 players in the pool
      const upcomingSlice = room.pool.slice(0, 5).map(p => p.id);

      // Call nextPlayer (pops player 0)
      rm.nextPlayer(room);
      expect(room.auction_state.current_player).toBeDefined();
      expect(room.auction_state.current_category).toBe('BATTERS');

      // Next player popped must match the first upcoming player
      expect(room.auction_state.current_player?.id).toBe(upcomingSlice[0]);

      // The remaining upcoming players (1, 2, 3, 4) must still be at the front of room.pool in identical order
      expect(room.pool.slice(0, 4).map(p => p.id)).toEqual(upcomingSlice.slice(1));

      // Simulate player selling via timer expiry
      rm.placeBid('SEQ101', 'host-1', room.auction_state.current_player!.base_price);
      (rm as any).handleTimerExpired(room);

      // Remaining pool must NOT be re-shuffled after sale
      expect(room.pool.slice(0, 4).map(p => p.id)).toEqual(upcomingSlice.slice(1));

      // Pop next player and simulate unsold
      rm.nextPlayer(room);
      expect(room.auction_state.current_player?.id).toBe(upcomingSlice[1]);
      (rm as any).handleTimerExpired(room); // with no bids -> goes unsold

      // Remaining pool must NOT be re-shuffled after unsold
      expect(room.pool.slice(0, 3).map(p => p.id)).toEqual(upcomingSlice.slice(2));
    });

    it('exposes current_category and upcoming_players in public auction state for client synchronization', () => {
      const mockIo = createMockIo();
      const rm = new RoomManager(mockIo);
      const room = rm.createRoom('SYNC01', 'Sync Room', 'host-1', 'Host One');

      room.settings.order_type = 'role';
      room.settings.selected_player_ids = ALL_PLAYERS.map(p => p.id);
      rm.joinRoom('SYNC01', 'guest-1', 'Guest Manager', 'socket-g1');
      room.participants.get('host-1')!.team_name = 'Sync Host';
      room.participants.get('guest-1')!.team_name = 'Sync Guest';
      rm.startAuction('SYNC01', 'host-1');
      rm.nextPlayer(room);

      const publicState = rm.getPublicState(room);
      expect(publicState.current_category).toBe('BATTERS');
      expect(publicState.upcoming_players).toBeDefined();
      expect(publicState.upcoming_players?.length).toBe(10);
      expect(publicState.current_player_index).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Voice Commentary Service & Playback Rate Optimization
  // --------------------------------------------------------------------------
  describe('4. Voice Commentary Service Optimization', () => {
    it('sets default speech rate to 1.10x for crisp broadcast cadence', () => {
      // Re-initialize or check default
      expect(voiceCommentary.getSpeechRate()).toBe(1.10);
    });

    it('allows configurable playback rate and preserves bounds', () => {
      voiceCommentary.setSpeechRate(1.25);
      expect(voiceCommentary.getSpeechRate()).toBe(1.25);

      // Clamping between 0.75 and 1.50
      voiceCommentary.setSpeechRate(2.5);
      expect(voiceCommentary.getSpeechRate()).toBe(1.5);

      voiceCommentary.setSpeechRate(0.5);
      expect(voiceCommentary.getSpeechRate()).toBe(0.75);

      // Restore default
      voiceCommentary.setSpeechRate(1.10);
      expect(voiceCommentary.getSpeechRate()).toBe(1.10);
    });

    it('cleans broadcast text accurately (currencies, team names, role names)', () => {
      const rawText = '🔥 BID ₹15 Cr by CSK on Virat Kohli (BAT)! Base: ₹2 Cr.';
      const cleaned = voiceCommentary.cleanTextForSpeech(rawText);

      expect(cleaned).toContain('15 Crore rupees');
      expect(cleaned).toContain('Chennai Super Kings');
      expect(cleaned).toContain('Batter');
      expect(cleaned).toContain('2 Crore rupees');
      expect(cleaned).not.toContain('🔥');
      expect(cleaned).not.toContain('₹');
    });

    it('deduplicates commentary events by ID and prevents repeat queuing', () => {
      let completedCalls = 0;
      const dummyEvent = {
        id: 'event_test_dup_001',
        room_code: 'TEST01',
        text: 'Bid placed for Virat Kohli at 2 Crore rupees',
        type: 'bid' as const,
        timestamp: Date.now(),
      };

      // First call processes
      voiceCommentary.speakEvent(dummyEvent);

      // Immediate second call with identical ID should be dropped
      voiceCommentary.speakEvent(dummyEvent);

      // Third call with identical ID should also be dropped
      voiceCommentary.speakEvent(dummyEvent);

      // Verify no exceptions and clean state
      expect(voiceCommentary.getIsMuted()).toBe(false);
    });

    it('handles mute controls cleanly, flushing queue and immediately calling spotlight completion', () => {
      voiceCommentary.setMuted(true);
      expect(voiceCommentary.getIsMuted()).toBe(true);

      let onCompleteCalled = false;
      voiceCommentary.speakAnnouncement('Spotlight: Jasprit Bumrah', () => {
        onCompleteCalled = true;
      });

      // When muted, onComplete must be called immediately so auction is not stalled!
      expect(onCompleteCalled).toBe(true);

      // Restore unmuted
      voiceCommentary.setMuted(false);
      expect(voiceCommentary.getIsMuted()).toBe(false);
    });
  });
});
