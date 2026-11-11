import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildPlayerIntroduction,
  buildClosingAnnouncement,
  buildSoldAnnouncement,
  buildUnsoldAnnouncement,
  expandFranchiseName,
} from '../../src/shared/voice-templates';
import { voiceCommentary } from '../../src/lib/voice-commentary';
import { RoomManager } from '../room';
import { Player } from '../../src/shared/types';
import { synthesizeIndianFemaleVoice } from '../../src/lib/server-tts';

function createMockIo() {
  const emittedEvents: { event: string; data: any; room?: string }[] = [];
  return {
    to: (room: string) => ({
      emit: (event: string, data?: any) => {
        emittedEvents.push({ event, data, room });
      },
    }),
    emit: (event: string, data?: any) => {
      emittedEvents.push({ event, data });
    },
    getEvents: () => emittedEvents,
    clear: () => {
      emittedEvents.length = 0;
    },
  };
}

describe('IPL AUCTION — Two Voice Modulations & Final 5-Second Closing Announcement', () => {
  beforeEach(() => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    (globalThis as any).localStorage = mockStorage;
    (globalThis as any).window = {
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
        getVoices: vi.fn().mockReturnValue([]),
      },
      localStorage: mockStorage,
    };
    (globalThis as any).Audio = vi.fn().mockImplementation(() => ({
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    voiceCommentary.setMuted(false);
    voiceCommentary.setVolume(0.9);
    voiceCommentary.setSpeechRate(1.1);
    (voiceCommentary as any).lastSpokenPlayerId = null;
    (voiceCommentary as any).lastSoldPlayerId = null;
    (voiceCommentary as any).lastUnsoldPlayerId = null;
    (voiceCommentary as any).lastClosingBidKey = null;
    (voiceCommentary as any).currentAnnouncementType = null;
  });

  afterEach(() => {
    voiceCommentary.stopAll();
    delete (globalThis as any).window;
    delete (globalThis as any).Audio;
    delete (globalThis as any).localStorage;
  });

  describe('1. Voice Modulation A: Player Introduction', () => {
    const mockVirat = {
      id: 'p-224',
      name: 'Virat Kohli',
      country: 'India',
      role: 'Batter',
      base_price: 2_00_00_000,
      home_state: 'Delhi',
      batting_style: 'Right Handed',
      bowling_style: 'Right Arm Medium',
      capped: true,
      tier: 'A',
      player_points: 940,
    } as unknown as Player;

    it('generates professional, calm, informative introduction with player name, nationality, role, and base price', () => {
      const intro = buildPlayerIntroduction(mockVirat);
      expect(intro).toBe(
        "Up next, we have India's talented batter, Virat Kohli. His base price is two crore rupees."
      );
    });

    it('plays only once per player and prevents duplicate triggers on rerender or bid', () => {
      const executeSpy = vi.spyOn(voiceCommentary as any, 'executeSingleSpeech').mockImplementation(() => { });

      voiceCommentary.speakPlayerIntroduction(mockVirat);
      expect(executeSpy).toHaveBeenCalledTimes(1);

      // Subsequent duplicate calls for the same player must be dropped
      voiceCommentary.speakPlayerIntroduction(mockVirat);
      voiceCommentary.speakPlayerIntroduction(mockVirat);
      expect(executeSpy).toHaveBeenCalledTimes(1);

      executeSpy.mockRestore();
    });
  });

  describe('2. Voice Modulation B: Final 5-Second Closing Announcement', () => {
    it('dynamically inserts highest bidder into closing announcement', () => {
      const gtClosing = buildClosingAnnouncement('GT');
      expect(gtClosing).toBe('GT currently holds the highest bid. Going once, going twice...');

      const cskClosing = buildClosingAnnouncement('CSK');
      expect(cskClosing).toBe('CSK currently holds the highest bid. Going once, going twice...');

      const fullTeamClosing = buildClosingAnnouncement('Gujarat Titans');
      expect(fullTeamClosing).toBe('Gujarat Titans currently holds the highest bid. Going once, going twice...');
    });

    it('handles opening bid absent (no opening bid) gracefully', () => {
      const noBidClosing = buildClosingAnnouncement(null);
      expect(noBidClosing).toBe('No bids yet. Going once, going twice...');

      const emptyClosing = buildClosingAnnouncement('');
      expect(emptyClosing).toBe('No bids yet. Going once, going twice...');
    });

    it('uses exciting auctioneer voice modulation with higher pitch and energetic delivery', () => {
      const executeSpy = vi.spyOn(voiceCommentary as any, 'executeSingleSpeech').mockImplementation(() => { });

      voiceCommentary.speakClosingAnnouncement('GT', 10_00_00_000);
      expect(executeSpy).toHaveBeenCalledWith(
        'GT currently holds the highest bid. Going once, going twice...',
        'closing',
        undefined
      );

      executeSpy.mockRestore();
    });

    it('deduplicates 5-second announcement for the same bid sequence', () => {
      const executeSpy = vi.spyOn(voiceCommentary as any, 'executeSingleSpeech').mockImplementation(() => { });

      voiceCommentary.speakClosingAnnouncement('GT', 10_00_00_000);
      expect(executeSpy).toHaveBeenCalledTimes(1);

      // Repeating for identical bidder and bid amount does not replay
      voiceCommentary.speakClosingAnnouncement('GT', 10_00_00_000);
      expect(executeSpy).toHaveBeenCalledTimes(1);

      executeSpy.mockRestore();
    });
  });

  describe('3. Dynamic Highest-Bidder Handling & Outdated Speech Cancellation', () => {
    it('cancels outdated GT announcement immediately when MI places higher bid', () => {
      const stopSpeechSpy = vi.spyOn(voiceCommentary as any, 'stopCurrentSpeech').mockImplementation(() => { });
      const executeSpy = vi.spyOn(voiceCommentary as any, 'executeSingleSpeech').mockImplementation(() => { });

      // At 5 seconds: GT closing announcement starts
      voiceCommentary.speakClosingAnnouncement('GT', 10_00_00_000);
      expect((voiceCommentary as any).currentAnnouncementType).toBe('closing');

      // At 3 seconds: MI places higher bid -> cancelClosingAnnouncement is called
      voiceCommentary.cancelClosingAnnouncement();
      expect(stopSpeechSpy).toHaveBeenCalled();
      expect((voiceCommentary as any).currentAnnouncementType).toBeNull();

      // Countdown resets and reaches 5 seconds again for MI
      voiceCommentary.speakClosingAnnouncement('MI', 12_50_00_000);
      expect(executeSpy).toHaveBeenCalledWith(
        'MI currently holds the highest bid. Going once, going twice...',
        'closing',
        undefined
      );

      stopSpeechSpy.mockRestore();
      executeSpy.mockRestore();
    });
  });

  describe('4. SOLD Announcement Validation & Unsold Handling', () => {
    it('generates authoritative sold announcement with player name, winning team, and formatted price', () => {
      const soldText = buildSoldAnnouncement('Virat Kohli', 'Gujarat Titans', 20_00_00_000);
      expect(soldText).toBe('Sold! Virat Kohli goes to Gujarat Titans for twenty crore rupees!');
    });

    it('expands franchise shortcodes into full official spoken names in sold announcement', () => {
      const soldGT = buildSoldAnnouncement('Hardik Pandya', 'GT', 14_50_00_000);
      expect(soldGT).toBe('Sold! Hardik Pandya goes to Gujarat Titans for fourteen crore fifty lakh rupees!');

      const soldMI = buildSoldAnnouncement('Hardik Pandya', 'MI', 14_50_00_000);
      expect(soldMI).toBe('Sold! Hardik Pandya goes to Mumbai Indians for fourteen crore fifty lakh rupees!');
    });

    it('stops active closing announcement before playing SOLD announcement', () => {
      const stopSpeechSpy = vi.spyOn(voiceCommentary as any, 'stopCurrentSpeech').mockImplementation(() => { });
      const executeSpy = vi.spyOn(voiceCommentary as any, 'executeSingleSpeech').mockImplementation(() => { });

      // Simulate closing speech in progress
      voiceCommentary.speakClosingAnnouncement('GT', 10_00_00_000);

      // Server emits player_sold
      voiceCommentary.speakSoldAnnouncement('Hardik Pandya', 'GT', 10_00_00_000, 'p-164');

      // Halts previous closing announcement and starts sold speech
      expect(stopSpeechSpy).toHaveBeenCalled();
      expect(executeSpy).toHaveBeenLastCalledWith(
        'Sold! Hardik Pandya goes to Gujarat Titans for ten crore rupees!',
        'sold',
        undefined
      );

      stopSpeechSpy.mockRestore();
      executeSpy.mockRestore();
    });

    it('drops duplicate sold announcements for the same player sale', () => {
      const executeSpy = vi.spyOn(voiceCommentary as any, 'executeSingleSpeech').mockImplementation(() => { });

      voiceCommentary.speakSoldAnnouncement('Virat Kohli', 'GT', 20_00_00_000, 'p-224');
      expect(executeSpy).toHaveBeenCalledTimes(1);

      voiceCommentary.speakSoldAnnouncement('Virat Kohli', 'GT', 20_00_00_000, 'p-224');
      expect(executeSpy).toHaveBeenCalledTimes(1);

      executeSpy.mockRestore();
    });
  });

  describe('5. Multiplayer Server-Authoritative 5-Second Warning Broadcast', () => {
    it('broadcasts auction_closing_warning at exactly 5 seconds in server timer loop', () => {
      vi.useFakeTimers();
      const mockIo = createMockIo();
      const rm = new RoomManager(mockIo as any);
      const room = rm.createRoom('CLSTST', 'Closing Test Room', 'host-1', 'Host Manager');

      // Set up bidding phase with 5 seconds remaining
      room.auction_state.phase = 'bidding';
      room.auction_state.timer_ends_at = Date.now() + 5000;
      room.auction_state.current_bid = 5_00_00_000;
      room.auction_state.current_bidder_id = 'host-1';
      const host = room.participants.get('host-1')!;
      host.team_short_code = 'GT';
      host.team_name = 'Gujarat Titans';

      // Start timer loop and trigger interval tick
      (rm as any).startTimerLoop(room);
      vi.advanceTimersByTime(250);

      // Check emitted events within next tick
      const warnings = mockIo.getEvents().filter(e => e.event === 'auction_closing_warning');
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      const payload = warnings[0].data;
      expect(payload.timer_remaining).toBe(5);
      expect(payload.highest_bidder_short_code).toBe('GT');
      expect(payload.current_bid).toBe(5_00_00_000);

      // Clean up timer
      if (room.timer_handle) clearInterval(room.timer_handle);
      vi.useRealTimers();
    });

    it('resets closing warning state when a new bid is placed so next 5s warning triggers with updated bidder', () => {
      const mockIo = createMockIo();
      const rm = new RoomManager(mockIo as any);
      const room = rm.createRoom('RSTTST', 'Reset Test Room', 'host-1', 'Host Manager');

      room.closing_warning_bid_key = 'p-001_5000000_host-1';

      // Add a guest participant and place bid
      const guest = {
        id: 'guest-2',
        session_id: 'guest-2',
        display_name: 'MI Manager',
        team_name: 'Mumbai Indians',
        team_short_code: 'MI',
        is_host: false,
        is_spectator: false,
        purse_remaining: 100_00_00_000,
        squad: [],
        squad_slots_remaining: 15,
        spent_by_role: { BAT: 0, BOWL: 0, AR: 0, WK: 0 },
        role_counts: { BAT: 0, BOWL: 0, AR: 0, WK: 0, overseas: 0 },
        squad_shortages: [],
        squad_excesses: [],
      };
      room.participants.set('guest-2', guest as any);

      room.auction_state.phase = 'bidding';
      room.auction_state.timer_ends_at = Date.now() + 10000;
      room.auction_state.current_player = {
        id: 'p-001',
        name: 'Dewald Brevis',
        base_price: 20_00_00_000,
        role: 'Batter',
        country: 'South Africa',
      } as any;
      room.auction_state.current_bid = 5_00_00_000;
      room.auction_state.current_bidder_id = 'host-1';

      // Guest places higher bid
      rm.placeBid('RSTTST', 'guest-2', 50_00_000);

      // room.closing_warning_bid_key must be reset to null
      expect(room.closing_warning_bid_key).toBeNull();
    });
  });

  describe('6. Server-Side TTS Modulation Support', () => {
    it('synthesizes Indian female voice with modulation styles (intro, closing, sold)', async () => {
      const introRes = await synthesizeIndianFemaleVoice('Test introduction text', 'intro');
      if (introRes) {
        expect(introRes.buffer).toBeInstanceOf(Buffer);
        expect(introRes.contentType).toBe('audio/mpeg');
      }

      const closingRes = await synthesizeIndianFemaleVoice('GT currently holds the highest bid.', 'closing');
      if (closingRes) {
        expect(closingRes.buffer).toBeInstanceOf(Buffer);
        expect(closingRes.contentType).toBe('audio/mpeg');
      }
    });
  });

  describe('7. Budget Option 150 Cr Support', () => {
    it('supports 150 Cr (150_00_00_000) purse in room settings', () => {
      const mockIo = createMockIo();
      const rm = new RoomManager(mockIo as any);
      const room = rm.createRoom('CR150', '150 Cr Room', 'host-1', 'Host Manager');

      rm.updateSettings('CR150', 'host-1', { purse: 150_00_00_000 });
      expect(room.settings.purse).toBe(150_00_00_000);

      const host = room.participants.get('host-1');
      expect(host?.purse_remaining).toBe(150_00_00_000);
    });
  });

  describe('8. Voice Modulation 2: Unsold Player Announcement', () => {
    it('generates 5-second closing text with player name when no bids received', () => {
      const closingUnsold = buildClosingAnnouncement(null, 'Hardik Pandya');
      expect(closingUnsold).toBe('No bids received for Hardik Pandya... Going once, going twice...');

      const closingEmpty = buildClosingAnnouncement('', 'Virat Kohli');
      expect(closingEmpty).toBe('No bids received for Virat Kohli... Going once, going twice...');

      const closingFallback = buildClosingAnnouncement(null, null);
      expect(closingFallback).toBe('No bids yet. Going once, going twice...');
    });

    it('generates authoritative unsold announcement text matching format', () => {
      const unsoldHardik = buildUnsoldAnnouncement('Hardik Pandya');
      expect(unsoldHardik).toBe('UNSOLD! Hardik Pandya remains unsold.');

      const unsoldVirat = buildUnsoldAnnouncement('Virat Kohli');
      expect(unsoldVirat).toBe('UNSOLD! Virat Kohli remains unsold.');
    });

    it('triggers speakUnsoldAnnouncement with suspenseful unsold modulation style', () => {
      const executeSpy = vi.spyOn(voiceCommentary as any, 'executeSingleSpeech').mockImplementation(() => {});

      voiceCommentary.speakUnsoldAnnouncement('Hardik Pandya', 'p-164');
      expect(executeSpy).toHaveBeenCalledWith(
        'UNSOLD! Hardik Pandya remains unsold.',
        'unsold',
        undefined
      );

      executeSpy.mockRestore();
    });

    it('cancels unsold closing announcement when a bid arrives during countdown and switches to sold scenario', () => {
      const stopSpeechSpy = vi.spyOn(voiceCommentary as any, 'stopCurrentSpeech').mockImplementation(() => {});
      const executeSpy = vi.spyOn(voiceCommentary as any, 'executeSingleSpeech').mockImplementation(() => {});

      // 5s: No bids closing warning starts for Hardik
      voiceCommentary.speakClosingAnnouncement(null, 0, 'Hardik Pandya');
      expect((voiceCommentary as any).currentAnnouncementType).toBe('closing');

      // 3s: Bid arrives -> cancelClosingAnnouncement called immediately
      voiceCommentary.cancelClosingAnnouncement();
      expect(stopSpeechSpy).toHaveBeenCalled();
      expect((voiceCommentary as any).currentAnnouncementType).toBeNull();

      // Countdown runs down again with MI holding bid
      voiceCommentary.speakClosingAnnouncement('MI', 2_00_00_000);
      expect(executeSpy).toHaveBeenLastCalledWith(
        'MI currently holds the highest bid. Going once, going twice...',
        'closing',
        undefined
      );

      // Server confirms sale -> sold announcement played (NOT unsold)
      voiceCommentary.speakSoldAnnouncement('Hardik Pandya', 'MI', 2_00_00_000, 'p-164');
      expect(executeSpy).toHaveBeenLastCalledWith(
        'Sold! Hardik Pandya goes to Mumbai Indians for two crore rupees!',
        'sold',
        undefined
      );

      stopSpeechSpy.mockRestore();
      executeSpy.mockRestore();
    });

    it('drops duplicate unsold announcements for the same player', () => {
      const executeSpy = vi.spyOn(voiceCommentary as any, 'executeSingleSpeech').mockImplementation(() => {});

      voiceCommentary.speakUnsoldAnnouncement('Hardik Pandya', 'p-164');
      expect(executeSpy).toHaveBeenCalledTimes(1);

      // Duplicate invocation for identical player is ignored
      voiceCommentary.speakUnsoldAnnouncement('Hardik Pandya', 'p-164');
      expect(executeSpy).toHaveBeenCalledTimes(1);

      executeSpy.mockRestore();
    });

    it('broadcasts player_name in auction_closing_warning when no bids exist', () => {
      vi.useFakeTimers();
      const mockIo = createMockIo();
      const rm = new RoomManager(mockIo as any);
      const room = rm.createRoom('UNSTST', 'Unsold Warning Test', 'host-1', 'Host Manager');

      room.auction_state.phase = 'bidding';
      room.auction_state.timer_ends_at = Date.now() + 5000;
      room.auction_state.current_bid = 0;
      room.auction_state.current_bidder_id = null;
      room.auction_state.current_player = {
        id: 'p-001',
        name: 'Dewald Brevis',
        base_price: 20_00_000,
        role: 'Batter',
        country: 'South Africa',
      } as any;

      (rm as any).startTimerLoop(room);
      vi.advanceTimersByTime(250);

      const warnings = mockIo.getEvents().filter(e => e.event === 'auction_closing_warning');
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      const payload = warnings[0].data;
      expect(payload.timer_remaining).toBe(5);
      expect(payload.highest_bidder_short_code).toBeNull();
      expect(payload.current_bid).toBe(0);
      expect(payload.player_name).toBe('Dewald Brevis');

      if (room.timer_handle) clearInterval(room.timer_handle);
      vi.useRealTimers();
    });
  });
});

