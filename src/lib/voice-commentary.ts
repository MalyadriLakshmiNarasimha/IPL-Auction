'use client';

import { Player, CommentaryEvent, VoiceModulationStyle } from '../shared/types';
import { formatInrForSpeech } from '../shared/currency-speech';
import {
  buildPlayerIntroduction,
  buildClosingAnnouncement,
  buildSoldAnnouncement,
  buildUnsoldAnnouncement,
  expandFranchiseName,
} from '../shared/voice-templates';

export interface SpeechQueueItem {
  id?: string;
  text: string;
  type: 'intro' | 'sold';
  onComplete?: () => void;
}

/**
 * Natural Indian Female Voice Presenter Service for IPL Auction
 *
 * Exclusively handles the TWO permitted voice events:
 * 1. Player Introduction (when player enters auction block)
 * 2. Sold Announcement (when authoritative server confirms sale)
 *
 * All continuous commentary (bids, timers, countdowns, reactions) is completely removed.
 */
class VoiceCommentaryService {
  private isVoiceMuted: boolean = false;
  private volume: number = 0.9; // 0.0 to 1.0
  private speechRate: number = 1.10; // Default 1.10x speed as requested
  private isSpeaking: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentWatchdogTimer: any = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private detectedVoiceName: string = 'Detecting Indian English Female Voice...';
  private preferCentralAudio: boolean = true;
  private lastSpokenPlayerId: string | null = null;
  private lastSoldPlayerId: string | null = null;
  private lastUnsoldPlayerId: string | null = null;
  private currentAnnouncementType: VoiceModulationStyle | null = null;
  private lastClosingBidKey: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const storedMuted = localStorage.getItem('ipl_voice_commentary_muted');
      if (storedMuted !== null) {
        this.isVoiceMuted = storedMuted === 'true';
      }

      const storedVolume = localStorage.getItem('ipl_voice_commentary_volume');
      if (storedVolume !== null) {
        const parsed = parseFloat(storedVolume);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }

      const storedRate = localStorage.getItem('ipl_voice_commentary_rate');
      if (storedRate !== null) {
        const parsedRate = parseFloat(storedRate);
        if (!isNaN(parsedRate) && parsedRate >= 0.75 && parsedRate <= 1.5) {
          this.speechRate = parsedRate;
        } else {
          this.speechRate = 1.10;
        }
      } else {
        this.speechRate = 1.10;
      }

      this.initVoiceSelection();
    }
  }

  private isFemaleIndianVoice(v: SpeechSynthesisVoice): boolean {
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();
    const isIndianLang = lang.includes('en-in') || lang.includes('en_in') || name.includes('india');

    // Known Indian female voice names across Windows, Edge, macOS, iOS, Android, and Chrome
    const isFemaleIdentified =
      name.includes('heera') ||
      name.includes('neerja') ||
      name.includes('veena') ||
      name.includes('lekha') ||
      name.includes('priya') ||
      name.includes('aditi') ||
      name.includes('kavya') ||
      name.includes('ananya') ||
      name.includes('female') ||
      name.includes('google english india');

    return isIndianLang && isFemaleIdentified;
  }

  public initVoiceSelection(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.detectedVoiceName = 'Central Neural Presenter (en-IN Neerja)';
      return;
    }

    const selectBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // 1. Priority: Dedicated Indian English Female Voice (Neerja, Kavya, Heera, Veena...)
      const indianFemale = voices.find(v => this.isFemaleIndianVoice(v));

      // 2. Priority: Any Indian English Voice
      const indianAny = voices.find(
        v => v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india')
      );

      // 3. Priority: Commonwealth / British English Female Voice
      const commonwealthFemale = voices.find(
        v =>
          (v.lang.toLowerCase().includes('en-gb') || v.lang.toLowerCase().includes('en-au')) &&
          (v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('libby') ||
            v.name.toLowerCase().includes('sonia') ||
            v.name.toLowerCase().includes('hazel'))
      );

      // 4. Priority: Any English Female Voice
      const englishFemale = voices.find(
        v =>
          v.lang.toLowerCase().startsWith('en') &&
          (v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('samantha'))
      );

      // 5. Fallback: Any English voice
      const englishAny = voices.find(v => v.lang.toLowerCase().startsWith('en')) || voices[0];

      this.selectedVoice = indianFemale || indianAny || commonwealthFemale || englishFemale || englishAny || null;

      if (indianFemale) {
        this.detectedVoiceName = `Indian Female Presenter (${indianFemale.name})`;
      } else if (indianAny) {
        this.detectedVoiceName = `Indian English Presenter (${indianAny.name})`;
      } else {
        this.detectedVoiceName = 'Central Neural Presenter (en-IN Neerja)';
      }
    };

    selectBestVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = selectBestVoice;
    }
  }

  public getIsMuted(): boolean {
    return this.isVoiceMuted;
  }

  public setMuted(muted: boolean): void {
    this.isVoiceMuted = muted;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem('ipl_voice_commentary_muted', muted ? 'true' : 'false');
      } catch {}
      if (muted) {
        this.stopAll();
      }
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isVoiceMuted);
    return this.isVoiceMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    if (this.currentAudio) {
      this.currentAudio.volume = clamped;
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem('ipl_voice_commentary_volume', clamped.toString());
      } catch {}
    }
  }

  public getSpeechRate(): number {
    return this.speechRate;
  }

  public setSpeechRate(rate: number): void {
    const clamped = Math.max(0.75, Math.min(1.5, rate));
    this.speechRate = clamped;
    if (this.currentAudio) {
      this.currentAudio.playbackRate = clamped;
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem('ipl_voice_commentary_rate', clamped.toString());
      } catch {}
    }
  }

  public getDetectedVoiceName(): string {
    return this.detectedVoiceName;
  }

  /**
   * Cleans text and normalizes currency / team names for speech.
   */
  public cleanTextForSpeech(text: string): string {
    return text
      // Strip emojis and non-ascii symbols
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Convert raw currency patterns using INR speech formatter
      .replace(/₹\s*([0-9.]+)\s*Cr/gi, (_, val) =>
        formatInrForSpeech(parseFloat(val) * 1_00_00_000, { capitalizeFirst: false })
      )
      .replace(/₹\s*([0-9.]+)\s*L/gi, (_, val) =>
        formatInrForSpeech(parseFloat(val) * 1_00_000, { capitalizeFirst: false })
      )
      .replace(/₹\s*([0-9,]+)/gi, (_, val) =>
        formatInrForSpeech(parseInt(val.replace(/,/g, ''), 10), { capitalizeFirst: false })
      )
      // Expand official team names with natural spoken phrasing
      .replace(/\bCSK\b/g, 'Chennai Super Kings')
      .replace(/\bMI\b/g, 'Mumbai Indians')
      .replace(/\bRCB\b/g, 'Royal Challengers Bengaluru')
      .replace(/\bSRH\b/g, 'Sunrisers Hyderabad')
      .replace(/\bKKR\b/g, 'Kolkata Knight Riders')
      .replace(/\bRR\b/g, 'Rajasthan Royals')
      .replace(/\bDC\b/g, 'Delhi Capitals')
      .replace(/\bPBKS\b/g, 'Punjab Kings')
      .replace(/\bGT\b/g, 'Gujarat Titans')
      .replace(/\bLSG\b/g, 'Lucknow Super Giants')
      // Expand roles
      .replace(/\bBAT\b/g, 'Batter')
      .replace(/\bBOWL\b/g, 'Bowler')
      .replace(/\bAR\b/g, 'All-Rounder')
      .replace(/\bWK\b/g, 'Wicketkeeper')
      // Normalise punctuation and extra spacing
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * VOICE MODULATION A: Player Introduction
   * Triggered exactly once when a player becomes active.
   * Style: Professional, informative, calm, confident delivery (1.10x rate, 1.0 pitch).
   * Example: "Up next, we have India's talented all-rounder, Hardik Pandya. His base price is two crore rupees."
   */
  public speakPlayerIntroduction(player: Player, onComplete?: () => void): void {
    if (!player || !player.id) {
      if (onComplete) onComplete();
      return;
    }

    // Guard: Prevent repeat introduction for the same player
    if (this.lastSpokenPlayerId === player.id) {
      // Already announced: drop duplicate call
      return;
    }
    this.lastSpokenPlayerId = player.id;
    this.lastClosingBidKey = null; // Reset closing announcement state for new player
    this.lastUnsoldPlayerId = null; // Reset unsold state for new player

    if (this.isVoiceMuted || typeof window === 'undefined') {
      if (onComplete) onComplete();
      return;
    }

    this.currentAnnouncementType = 'intro';
    const introText = buildPlayerIntroduction(player);
    this.executeSingleSpeech(introText, 'intro', onComplete);
  }

  /**
   * VOICE MODULATION B: Final 5-Second Closing Announcement
   * Triggered when official auction countdown reaches 5 seconds.
   * Style: Exciting auctioneer-style expression, suspenseful pacing, energetic delivery.
   *
   * Example (with bid):
   * "GT currently holds the highest bid. Going once, going twice..."
   *
   * Example (no bids):
   * "No bids received for Hardik Pandya... Going once, going twice..."
   *
   * If a new bid is placed after this starts (e.g. at 3s), cancelClosingAnnouncement()
   * immediately halts this speech and resets state.
   */
  public speakClosingAnnouncement(
    highestBidderTeamOrCode?: string | null,
    currentBidAmount?: number,
    playerName?: string | null,
    onComplete?: () => void
  ): void {
    if (this.isVoiceMuted || typeof window === 'undefined') {
      if (onComplete) onComplete();
      return;
    }

    const dedupeKey = `${this.lastSpokenPlayerId || 'cur'}:${highestBidderTeamOrCode || 'nobid'}:${currentBidAmount || 0}`;
    if (this.lastClosingBidKey === dedupeKey) {
      // Already running or executed for this exact bid sequence
      return;
    }
    this.lastClosingBidKey = dedupeKey;
    this.currentAnnouncementType = 'closing';

    const closingText = buildClosingAnnouncement(highestBidderTeamOrCode, playerName);
    this.executeSingleSpeech(closingText, 'closing', onComplete);
  }

  /**
   * Cancels active closing announcement immediately when a new bid arrives or state changes.
   * Halts any audio / Web Speech Synthesis instantly without leaving stale queues.
   */
  public cancelClosingAnnouncement(): void {
    if (this.currentAnnouncementType === 'closing') {
      this.stopCurrentSpeech();
      this.currentAnnouncementType = null;
      this.lastClosingBidKey = null; // Allows re-trigger when new countdown reaches 5s
    }
  }

  /**
   * RESOLUTION OF MODULATION B (SOLD): Sold Announcement
   * Triggered ONLY after authoritative server confirms player is sold.
   * Style: Decisive, triumphant, authoritative confirmation.
   * Example: "Sold! Hardik Pandya goes to Mumbai Indians for fourteen crore fifty lakh rupees!"
   */
  public speakSoldAnnouncement(
    playerName: string,
    winningTeam: string | undefined | null,
    finalPrice: number,
    playerId?: string,
    onComplete?: () => void
  ): void {
    // Immediately stop any active closing announcement
    this.stopCurrentSpeech();

    // Guard: Prevent duplicate sold announcement for same player sale
    if (playerId) {
      if (this.lastSoldPlayerId === playerId) {
        // Already announced: drop duplicate call
        return;
      }
      this.lastSoldPlayerId = playerId;
    }

    if (this.isVoiceMuted || typeof window === 'undefined') {
      if (onComplete) onComplete();
      return;
    }

    this.currentAnnouncementType = 'sold';
    const soldText = buildSoldAnnouncement(playerName, winningTeam, finalPrice);
    this.executeSingleSpeech(soldText, 'sold', onComplete);
  }

  /**
   * RESOLUTION OF MODULATION B (UNSOLD): Unsold Announcement
   * Triggered ONLY after authoritative server confirms player is unsold.
   * Style: Authoritative, suspenseful delivery.
   * Example: "UNSOLD! Hardik Pandya remains unsold."
   */
  public speakUnsoldAnnouncement(
    playerName: string,
    playerId?: string,
    onComplete?: () => void
  ): void {
    // Immediately stop any active closing announcement
    this.stopCurrentSpeech();

    // Guard: Prevent duplicate unsold announcement for same player
    if (playerId) {
      if (this.lastUnsoldPlayerId === playerId) {
        // Already announced: drop duplicate call
        return;
      }
      this.lastUnsoldPlayerId = playerId;
    }

    if (this.isVoiceMuted || typeof window === 'undefined') {
      if (onComplete) onComplete();
      return;
    }

    this.currentAnnouncementType = 'unsold';
    const unsoldText = buildUnsoldAnnouncement(playerName);
    this.executeSingleSpeech(unsoldText, 'unsold', onComplete);
  }

  /**
   * Authoritative announcement bridge (used by room host and test voice)
   */
  public speakAnnouncement(text: string, onComplete?: () => void): void {
    if (this.isVoiceMuted || typeof window === 'undefined') {
      if (onComplete) onComplete();
      return;
    }

    const cleaned = this.cleanTextForSpeech(text);
    if (!cleaned || cleaned.length < 3) {
      if (onComplete) onComplete();
      return;
    }

    this.executeSingleSpeech(cleaned, 'intro', onComplete);
  }

  /**
   * COMPLETELY REMOVED CONTINUOUS COMMENTARY
   * Bid amount announcements, countdown commentary, repeated bidding updates,
   * automatic reactions, and repetitive narrations are permanently silenced.
   */
  public speakEvent(_event: CommentaryEvent): void {
    // Intentionally no-op. Continuous auction commentary is completely removed.
  }

  /**
   * Executes a single, non-overlapping voice announcement with the specified modulation style.
   * Never overlaps with previous or outdated audio.
   */
  private executeSingleSpeech(
    text: string,
    style: VoiceModulationStyle = 'intro',
    onDone?: () => void
  ): void {
    // 1. Immediately halt any currently playing audio/speech
    this.stopCurrentSpeech();

    this.isSpeaking = true;
    let completed = false;

    const finish = () => {
      if (completed) return;
      completed = true;

      if (this.currentWatchdogTimer) {
        clearTimeout(this.currentWatchdogTimer);
        this.currentWatchdogTimer = null;
      }

      this.isSpeaking = false;
      this.currentAudio = null;
      this.currentAnnouncementType = null;

      if (onDone) {
        try {
          onDone();
        } catch {}
      }
    };

    // Watchdog timer: calculates safe max speech duration based on word count & 1.10x rate
    const words = text.split(/\s+/).length;
    const effectiveRate = style === 'closing' ? this.speechRate * 1.05 : this.speechRate;
    const estimatedSeconds = Math.max(2.0, words / (effectiveRate * 2.6) + 1.0);
    this.currentWatchdogTimer = setTimeout(finish, Math.round(estimatedSeconds * 1000));

    // Tier 1: High quality central server-side audio (Azure Neerja / ElevenLabs / Google Neural2)
    if (this.preferCentralAudio && typeof window !== 'undefined') {
      try {
        const audioUrl = `/api/tts?text=${encodeURIComponent(text)}&style=${encodeURIComponent(style)}`;
        const audio = new Audio(audioUrl);
        audio.volume = this.volume;
        audio.playbackRate = effectiveRate;

        audio.onended = () => {
          audio.onended = null;
          audio.onerror = null;
          finish();
        };

        audio.onerror = () => {
          audio.onended = null;
          audio.onerror = null;
          this.currentAudio = null;
          // Fallback to SpeechSynthesis
          this.speakViaSpeechSynthesis(text, style, finish);
        };

        this.currentAudio = audio;
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(() => {
            audio.onended = null;
            audio.onerror = null;
            this.currentAudio = null;
            this.speakViaSpeechSynthesis(text, style, finish);
          });
        }
        return;
      } catch {
        // Fall through to SpeechSynthesis
      }
    }

    // Tier 2: Browser SpeechSynthesis
    this.speakViaSpeechSynthesis(text, style, finish);
  }

  /**
   * Synthesizes speech using the browser SpeechSynthesis API.
   * Applies distinct pitch and rate modulation according to announcement style:
   * - 'intro': Calm, informative (1.10x rate, 1.00 pitch)
   * - 'closing': Exciting auctioneer delivery (1.12x rate, 1.15 pitch)
   * - 'sold': Decisive, triumphant (1.10x rate, 1.08 pitch)
   */
  private speakViaSpeechSynthesis(
    text: string,
    style: VoiceModulationStyle = 'intro',
    onDone: () => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone();
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.volume = this.volume;

      if (style === 'closing') {
        utterance.rate = Math.min(1.25, Number((this.speechRate * 1.02).toFixed(2)));
        utterance.pitch = 1.15; // Energetic, suspenseful auctioneer tone
      } else if (style === 'sold') {
        utterance.rate = this.speechRate;
        utterance.pitch = 1.08; // Triumphant tone
      } else if (style === 'unsold') {
        utterance.rate = this.speechRate;
        utterance.pitch = 1.10; // Authoritative, suspenseful tone
      } else {
        utterance.rate = this.speechRate;
        utterance.pitch = 1.0; // Professional calm tone
      }

      let hasDone = false;
      const finish = () => {
        if (!hasDone) {
          hasDone = true;
          onDone();
        }
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);
    } catch {
      onDone();
    }
  }

  /**
   * Tests the presenter voice with the natural Hardik Pandya announcement sample.
   */
  public testVoice(
    sampleText: string = "Up next, we have India's talented all-rounder, Hardik Pandya. His base price is two crore rupees.",
    onComplete?: () => void
  ): void {
    this.executeSingleSpeech(sampleText, 'intro', onComplete);
  }

  /**
   * Cancels any pending or outdated audio when auction advances.
   */
  public cancelPending(): void {
    this.stopCurrentSpeech();
  }

  /**
   * Stops currently playing speech and resets player tracking guards if needed.
   */
  private stopCurrentSpeech(): void {
    if (this.currentWatchdogTimer) {
      clearTimeout(this.currentWatchdogTimer);
      this.currentWatchdogTimer = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.isSpeaking = false;
  }

  /**
   * Stops all voice output immediately.
   */
  public stopAll(): void {
    this.stopCurrentSpeech();
  }
}

export const voiceCommentary = new VoiceCommentaryService();
