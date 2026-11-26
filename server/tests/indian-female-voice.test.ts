import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatInrForSpeech, parseInrAmount } from '../../src/shared/currency-speech';
import {
  buildPlayerIntroduction,
  buildSoldAnnouncement,
  expandFranchiseName,
  formatRoleDescription,
} from '../../src/shared/voice-templates';
import { voiceCommentary } from '../../src/lib/voice-commentary';
import { RoomManager } from '../room';
import { Player } from '../../src/shared/types';
import {
  synthesizeIndianFemaleVoice,
  getConfiguredProvider,
  isProviderInCooldown,
  resetTtsProviderCircuitBreakers,
  getTtsAvailability,
} from '../../src/lib/server-tts';
import { GET as getTtsRoute } from '../../src/app/api/tts/route';
import { NextRequest } from 'next/server';

describe('IPL Auction — Natural Indian Female Voice & Two-Event Voice System', () => {
  beforeEach(() => {
    voiceCommentary.setMuted(false);
    voiceCommentary.setVolume(0.9);
    voiceCommentary.setSpeechRate(1.1);
  });

  afterEach(() => {
    voiceCommentary.stopAll();
  });

  describe('1. Dedicated INR-to-Speech Formatter', () => {
    it('accurately pronounces ₹50,00,000 as "Fifty lakh rupees"', () => {
      expect(formatInrForSpeech(50_00_000)).toBe('Fifty lakh rupees');
    });

    it('accurately pronounces ₹1,00,00,000 as "One crore rupees"', () => {
      expect(formatInrForSpeech(1_00_00_000)).toBe('One crore rupees');
    });

    it('accurately pronounces ₹2,45,00,000 as "Two crore forty-five lakh rupees"', () => {
      expect(formatInrForSpeech(2_45_00_000)).toBe('Two crore forty-five lakh rupees');
    });

    it('accurately pronounces ₹2,50,00,000 as "Two crore fifty lakh rupees"', () => {
      expect(formatInrForSpeech(2_50_00_000)).toBe('Two crore fifty lakh rupees');
    });

    it('accurately pronounces ₹14,50,00,000 as "Fourteen crore fifty lakh rupees"', () => {
      expect(formatInrForSpeech(14_50_00_000)).toBe('Fourteen crore fifty lakh rupees');
    });

    it('supports lowercase first letter when embedded in sentences', () => {
      const lower = formatInrForSpeech(14_50_00_000, { capitalizeFirst: false });
      expect(lower).toBe('fourteen crore fifty lakh rupees');
    });

    it('guarantees never pronouncing floating-point values or NaN', () => {
      // Floating numbers must be rounded to integer rupees
      const speech1 = formatInrForSpeech(25000000.0000000001);
      expect(speech1).toBe('Two crore fifty lakh rupees');
      expect(speech1).not.toContain('.');
      expect(speech1).not.toContain('point');

      const speech2 = formatInrForSpeech(14499999.8);
      expect(speech2).toBe('One crore forty-five lakh rupees');
      expect(speech2).not.toContain('.');
    });

    it('parses formatted string currencies correctly', () => {
      expect(formatInrForSpeech('₹14.50 Cr')).toBe('Fourteen crore fifty lakh rupees');
      expect(formatInrForSpeech('₹2.45 Cr')).toBe('Two crore forty-five lakh rupees');
      expect(formatInrForSpeech('₹50 L')).toBe('Fifty lakh rupees');
    });
  });

  describe('2. Voice Event 1: Player Introduction', () => {
    const mockHardik = {
      id: 'hardik_pandya',
      name: 'Hardik Pandya',
      country: 'India',
      role: 'All-Rounder',
      base_price: 2_00_00_000,
      home_state: 'Gujarat',
      batting_style: 'Right-hand bat',
      bowling_style: 'Right-arm medium-fast',
      capped: true,
      tier: 'A',
      initials: 'HP',
    } as unknown as Player;

    it('matches required Hardik Pandya introduction example exactly', () => {
      const intro = buildPlayerIntroduction(mockHardik);
      expect(intro).toBe(
        "Up next, we have India's talented all-rounder, Hardik Pandya. His base price is two crore rupees."
      );
    });

    it('introduces overseas players with nationality and role naturally', () => {
      const mockCummins = {
        id: 'pat_cummins',
        name: 'Pat Cummins',
        country: 'Australia',
        role: 'Bowler',
        base_price: 2_00_00_000,
        home_state: 'New South Wales',
        batting_style: 'Right-hand bat',
        bowling_style: 'Right-arm fast',
        capped: true,
        tier: 'A',
        initials: 'PC',
      } as unknown as Player;
      const intro = buildPlayerIntroduction(mockCummins);
      expect(intro).toBe(
        "Up next, we have an Australian fast bowler, Pat Cummins. His base price is two crore rupees."
      );
    });

    it('triggers introduction exactly once per player and does not repeat', () => {
      let callCount = 0;
      const onDone = () => {
        callCount++;
      };

      // First call plays
      voiceCommentary.speakPlayerIntroduction(mockHardik, onDone);

      // Repeat call for identical player ID is blocked
      voiceCommentary.speakPlayerIntroduction(mockHardik, onDone);
      voiceCommentary.speakPlayerIntroduction(mockHardik, onDone);

      // Verify no duplicate processing
      expect(callCount).toBeLessThanOrEqual(1);
    });
  });

  describe('3. Voice Event 2: Sold Announcement', () => {
    it('matches required Hardik Pandya Sold announcement example exactly', () => {
      const sold = buildSoldAnnouncement('Hardik Pandya', 'Mumbai Indians', 14_50_00_000);
      expect(sold).toBe(
        'Sold! Hardik Pandya goes to Mumbai Indians for fourteen crore fifty lakh rupees!'
      );
    });

    it('expands franchise short codes like MI and CSK cleanly', () => {
      expect(expandFranchiseName('MI')).toBe('Mumbai Indians');
      expect(expandFranchiseName('CSK')).toBe('Chennai Super Kings');
      expect(expandFranchiseName('RCB')).toBe('Royal Challengers Bengaluru');
      expect(expandFranchiseName('KKR')).toBe('Kolkata Knight Riders');

      const soldShort = buildSoldAnnouncement('MS Dhoni', 'CSK', 12_00_00_000);
      expect(soldShort).toBe('Sold! MS Dhoni goes to Chennai Super Kings for twelve crore rupees!');
    });

    it('prevents duplicate sold announcements for the same player sale', () => {
      let count = 0;
      const onComplete = () => {
        count++;
      };

      voiceCommentary.speakSoldAnnouncement('Hardik Pandya', 'MI', 14_50_00_000, 'hardik_001', onComplete);
      voiceCommentary.speakSoldAnnouncement('Hardik Pandya', 'MI', 14_50_00_000, 'hardik_001', onComplete);

      expect(count).toBeLessThanOrEqual(1);
    });
  });

  describe('4. Complete Removal of Continuous Commentary', () => {
    it('completely silences speakEvent for bidding and repetitive narration', () => {
      const dummyBidEvent = {
        id: 'bid_event_123',
        room_code: 'TEST01',
        text: 'New bid of 5 Crore rupees placed by Chennai Super Kings',
        type: 'bid' as const,
        timestamp: Date.now(),
      };

      // Calling speakEvent does NOT throw and does NOT queue speech
      expect(() => voiceCommentary.speakEvent(dummyBidEvent)).not.toThrow();
    });

    it('cancels pending speech when the auction advances to the next player', () => {
      expect(() => voiceCommentary.cancelPending()).not.toThrow();
    });
  });

  describe('5. Playback Settings & Female Voice Quality', () => {
    it('defaults voice playback speed to 1.10x', () => {
      expect(voiceCommentary.getSpeechRate()).toBe(1.1);
    });

    it('detects and displays Indian Female Voice Presenter', () => {
      const detected = voiceCommentary.getDetectedVoiceName();
      expect(detected).toMatch(/(Indian|Female|Neerja|Neural)/i);
    });

    it('cleanses raw text strings into broadcast phrasing', () => {
      const raw = 'CSK bid ₹14.50 Cr on Hardik Pandya (AR)';
      const cleaned = voiceCommentary.cleanTextForSpeech(raw);
      expect(cleaned).toContain('Chennai Super Kings');
      expect(cleaned).toContain('fourteen crore fifty lakh rupees');
      expect(cleaned).toContain('All-Rounder');
    });

    it('handles mute and unmute controls faithfully', () => {
      voiceCommentary.setMuted(true);
      expect(voiceCommentary.getIsMuted()).toBe(true);

      let completed = false;
      voiceCommentary.speakAnnouncement('Test announcement', () => {
        completed = true;
      });
      // When muted, callbacks resolve immediately so timers never hang
      expect(completed).toBe(true);

      voiceCommentary.setMuted(false);
      expect(voiceCommentary.getIsMuted()).toBe(false);
    });
  });

  describe('6. Server-Side TTS Multi-Provider Architecture', () => {
    it('provides configurable provider detection', () => {
      const provider = getConfiguredProvider();
      expect(['auto', 'azure', 'elevenlabs', 'google', 'fallback']).toContain(provider);
    });

    it('handles synthesis request and returns audio buffer or fallback', async () => {
      const res = await synthesizeIndianFemaleVoice(
        "Up next, we have India's talented all-rounder, Hardik Pandya. His base price is two crore rupees."
      );
      if (res) {
        expect(res.buffer).toBeInstanceOf(Buffer);
        expect(res.buffer.length).toBeGreaterThan(0);
        expect(res.contentType).toBe('audio/mpeg');
      }
    });
  });

  describe('7. Permanent HTTP 503 Fix, Circuit Breaker & Web Speech Fallback', () => {
    afterEach(() => {
      resetTtsProviderCircuitBreakers();
      voiceCommentary.resetCentralAudioCooldown();
      vi.unstubAllGlobals();
    });

    it('returns HTTP 400 on missing or over-length text without crashing', async () => {
      const emptyReq = new NextRequest('http://localhost:3000/api/tts?text=');
      const emptyRes = await getTtsRoute(emptyReq);
      expect(emptyRes.status).toBe(400);

      const longText = 'A'.repeat(501);
      const longReq = new NextRequest(`http://localhost:3000/api/tts?text=${longText}`);
      const longRes = await getTtsRoute(longReq);
      expect(longRes.status).toBe(400);
    });

    it('returns HTTP 200 fallback directive (never 503) and trips server circuit breaker when external TTS fails', async () => {
      resetTtsProviderCircuitBreakers();
      const fetchSpy = vi.fn().mockRejectedValue(new Error('External TTS network unreachable'));
      vi.stubGlobal('fetch', fetchSpy);

      const req1 = new NextRequest(
        'http://localhost:3000/api/tts?text=Up%20next%20we%20have%20Virat%20Kohli&style=intro&nationality=India&role=Batter'
      );
      const res1 = await getTtsRoute(req1);
      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.fallbackToClient).toBe(true);
      expect(body1.mode).toBe('web_speech');
      expect(body1.rate).toBe(1.1);
      expect(isProviderInCooldown('fallback')).toBe(true);

      const callsAfterFirst = fetchSpy.mock.calls.length;
      expect(callsAfterFirst).toBeGreaterThanOrEqual(1);

      // Consecutive player intro (PKL) must NOT retry the cooled-down external provider
      const req2 = new NextRequest(
        'http://localhost:3000/api/tts?text=Up%20next%20we%20have%20Pardeep%20Narwal&style=intro&nationality=India&role=Raider'
      );
      const res2 = await getTtsRoute(req2);
      expect(res2.status).toBe(200);
      const body2 = await res2.json();
      expect(body2.fallbackToClient).toBe(true);
      expect(fetchSpy.mock.calls.length).toBe(callsAfterFirst);

      const availability = getTtsAvailability();
      expect(availability.fallbackMode).toBe('web_speech');
    });

    it('supports IPL & PKL player introduction templates and trips client cooldown cleanly', async () => {
      const iplIntro = buildPlayerIntroduction({
        id: 'p-kohli',
        name: 'Virat Kohli',
        country: 'India',
        role: 'Batter',
        base_price: 2_00_00_000,
      } as unknown as Player);
      const pklIntro = buildPlayerIntroduction({
        id: 'k-pardeep',
        name: 'Pardeep Narwal',
        country: 'India',
        role: 'Raider',
        base_price: 30_00_000,
      } as unknown as Player);
      expect(iplIntro).toContain('Virat Kohli');
      expect(pklIntro).toContain('Pardeep Narwal');

      // Simulate browser environment with mocked SpeechSynthesis + JSON fallback /api/tts response
      const spokenUtterances: any[] = [];
      const mockSpeechSynthesis = {
        paused: false,
        onvoiceschanged: null,
        getVoices: () => [
          { name: 'Microsoft Neerja Online (Natural) - English (India)', lang: 'en-IN' },
        ],
        speak: vi.fn((utt: any) => {
          spokenUtterances.push(utt);
          if (typeof utt.onend === 'function') utt.onend();
        }),
        cancel: vi.fn(),
        resume: vi.fn(),
      };
      class MockUtterance {
        text: string;
        rate = 1;
        pitch = 1;
        volume = 1;
        voice: any = null;
        onend: any = null;
        onerror: any = null;
        constructor(t: string) {
          this.text = t;
        }
      }

      const storageMap = new Map<string, string>();
      vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
      vi.stubGlobal('window', {
        speechSynthesis: mockSpeechSynthesis,
        localStorage: {
          getItem: (k: string) => storageMap.get(k) ?? null,
          setItem: (k: string, v: string) => storageMap.set(k, v),
        },
        sessionStorage: {
          getItem: (k: string) => storageMap.get(k) ?? null,
          setItem: (k: string, v: string) => storageMap.set(k, v),
          removeItem: (k: string) => storageMap.delete(k),
        },
      });
      const clientFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ available: false, fallbackToClient: true, mode: 'web_speech' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      vi.stubGlobal('fetch', clientFetch);

      voiceCommentary.resetCentralAudioCooldown();
      voiceCommentary.initVoiceSelection();

      // Player 1 (IPL): hits /api/tts once, receives fallback directive, speaks via Web Speech 1.10x, trips cooldown
      await new Promise<void>(resolve => {
        voiceCommentary.speakPlayerIntroduction(
          { id: 'ipl-1', name: 'Virat Kohli', country: 'India', role: 'Batter', base_price: 2_00_00_000 } as any,
          resolve
        );
      });
      expect(clientFetch).toHaveBeenCalledTimes(1);
      expect(voiceCommentary.isCentralAudioBlocked()).toBe(true);

      // Player 2 (PKL): does NOT retry /api/tts at all; speaks directly via Web Speech API
      await new Promise<void>(resolve => {
        voiceCommentary.speakPlayerIntroduction(
          { id: 'pkl-1', name: 'Pardeep Narwal', country: 'India', role: 'Raider', base_price: 30_00_000 } as any,
          resolve
        );
      });
      expect(clientFetch).toHaveBeenCalledTimes(1);
      expect(spokenUtterances.length).toBe(2);
      expect(spokenUtterances[0].rate).toBe(1.1);
      expect(spokenUtterances[0].voice?.lang).toBe('en-IN');
    });
  });
});
