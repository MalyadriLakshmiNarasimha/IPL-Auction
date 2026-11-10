'use client';

import { CommentaryEvent } from '@/shared/types';

export interface SpeechQueueItem {
  id?: string;
  text: string;
  priority: 'spotlight' | 'event';
  onComplete?: () => void;
}

class VoiceCommentaryService {
  private isVoiceMuted: boolean = false;
  private volume: number = 0.9; // 0.0 to 1.0
  private speechRate: number = 1.10; // Default 1.10x crisp broadcast rate
  private speechQueue: SpeechQueueItem[] = [];
  private isSpeaking: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentWatchdogTimer: any = null;
  private spokenEventIds: Set<string> = new Set();
  private recentSpokenTexts: Map<string, number> = new Map();
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private detectedVoiceName: string = 'Detecting Indian English Voice...';
  private isInitialized: boolean = false;
  private preferCentralAudio: boolean = true;

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
      this.detectedVoiceName = 'Central Audio Presenter (Female en-IN)';
      return;
    }

    const selectBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // 1. Priority: Dedicated Indian English Female Voice
      const indianFemale = voices.find(v => this.isFemaleIndianVoice(v));

      // 2. Priority: Any Indian English Voice
      const indianAny = voices.find(
        v => v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india')
      );

      // 3. Priority: British / Commonwealth Female Voice
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
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('victoria') ||
            v.name.toLowerCase().includes('karen'))
      );

      // 5. Fallback: Any English voice or first available
      const englishAny = voices.find(v => v.lang.toLowerCase().startsWith('en')) || voices[0];

      this.selectedVoice = indianFemale || indianAny || commonwealthFemale || englishFemale || englishAny || null;

      if (indianFemale) {
        this.detectedVoiceName = `Indian Female Presenter (${indianFemale.name})`;
      } else if (indianAny) {
        this.detectedVoiceName = `Indian English Presenter (${indianAny.name})`;
      } else if (this.selectedVoice) {
        this.detectedVoiceName = `English Presenter (${this.selectedVoice.name})`;
      } else {
        this.detectedVoiceName = 'Central Neural Presenter (en-IN)';
      }

      this.isInitialized = true;
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
      localStorage.setItem('ipl_voice_commentary_muted', muted ? 'true' : 'false');
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
      localStorage.setItem('ipl_voice_commentary_volume', clamped.toString());
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
      localStorage.setItem('ipl_voice_commentary_rate', clamped.toString());
    }
  }

  public getDetectedVoiceName(): string {
    return this.detectedVoiceName;
  }

  /**
   * Cleans technical strings, emojis, and currency formats to sound like authentic broadcast commentary
   * with natural pauses between sentences.
   */
  public cleanTextForSpeech(text: string): string {
    return text
      // Strip emojis and non-ascii symbols
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Convert currency: ₹100.00 Cr / ₹15 Cr / ₹2.5 Cr to spoken words
      .replace(/₹\s*([0-9.]+)\s*Cr/gi, '$1 Crore rupees')
      // Convert currency: ₹50 L / ₹25L to spoken words
      .replace(/₹\s*([0-9.]+)\s*L/gi, '$1 Lakh rupees')
      .replace(/₹\s*([0-9,]+)/gi, '$1 rupees')
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
      // Expand roles to complete words
      .replace(/\bBAT\b/g, 'Batter')
      .replace(/\bBOWL\b/g, 'Bowler')
      .replace(/\bAR\b/g, 'All-Rounder')
      .replace(/\bWK\b/g, 'Wicketkeeper')
      // Normalise punctuation and extra spacing
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speaks an authoritative player spotlight announcement.
   * Priority: Spotlight announcements take immediate priority over background event chatter.
   * Authoritative sequence: calls onComplete() when audio finishes (or after watchdog timeout).
   */
  public speakAnnouncement(text: string, onComplete?: () => void): void {
    if (this.isVoiceMuted || typeof window === 'undefined') {
      if (onComplete) onComplete();
      return;
    }

    const spokenText = this.cleanTextForSpeech(text);
    if (!spokenText || spokenText.length < 3) {
      if (onComplete) onComplete();
      return;
    }

    // Stop routine commentary chatter to spotlight the incoming player
    this.stopCurrentSpeech();

    // Place spotlight announcement at the front of the queue
    this.speechQueue.unshift({
      id: `announcement_${Date.now()}`,
      text: spokenText,
      priority: 'spotlight',
      onComplete,
    });

    this.processQueue();
  }

  /**
   * Queues and speaks an authoritative commentary event (bids, sold, unsold, stage change).
   * Automatically deduplicates repeated events and drops old queue items if fast bidding occurs.
   */
  public speakEvent(event: CommentaryEvent): void {
    if (this.isVoiceMuted || typeof window === 'undefined') {
      return;
    }

    // Deduplicate by unique event ID
    if (this.spokenEventIds.has(event.id)) {
      return;
    }
    this.spokenEventIds.add(event.id);
    if (this.spokenEventIds.size > 100) {
      const first = this.spokenEventIds.values().next().value;
      if (first) this.spokenEventIds.delete(first);
    }

    const spokenText = this.cleanTextForSpeech(event.text);
    if (!spokenText || spokenText.length < 3) return;

    // Content-hash deduplication: prevent exact same text within 3 seconds
    const now = Date.now();
    const lastSpokenTime = this.recentSpokenTexts.get(spokenText);
    if (lastSpokenTime && now - lastSpokenTime < 3000) {
      return;
    }
    this.recentSpokenTexts.set(spokenText, now);
    if (this.recentSpokenTexts.size > 50) {
      const oldest = this.recentSpokenTexts.keys().next().value;
      if (oldest) this.recentSpokenTexts.delete(oldest);
    }

    // Bounded queue: discard oldest non-spotlight commentary if queue grows past 4
    if (this.speechQueue.length >= 4) {
      const oldestIndex = this.speechQueue.findIndex(i => i.priority === 'event');
      if (oldestIndex !== -1) {
        this.speechQueue.splice(oldestIndex, 1);
      }
    }

    this.speechQueue.push({
      id: event.id,
      text: spokenText,
      priority: 'event',
    });

    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  /**
   * Processes the speech queue sequentially without unnecessary delays between items.
   */
  private processQueue(): void {
    if (this.isVoiceMuted || this.speechQueue.length === 0 || this.isSpeaking) {
      return;
    }

    const item = this.speechQueue.shift();
    if (!item) return;

    this.isSpeaking = true;
    let completed = false;

    const onFinish = () => {
      if (completed) return;
      completed = true;

      if (this.currentWatchdogTimer) {
        clearTimeout(this.currentWatchdogTimer);
        this.currentWatchdogTimer = null;
      }

      this.isSpeaking = false;
      this.currentAudio = null;

      if (item.onComplete) {
        try {
          item.onComplete();
        } catch {}
      }

      // Start the next announcement immediately after the previous one finishes
      queueMicrotask(() => {
        this.processQueue();
      });
    };

    // Watchdog timer: calculates safe max speech duration based on word count & 1.10x rate
    const words = item.text.split(/\s+/).length;
    const estimatedSeconds = Math.max(3, (words / (this.speechRate * 2.8)) + 1.2);
    this.currentWatchdogTimer = setTimeout(onFinish, Math.round(estimatedSeconds * 1000));

    // Tier 1: High quality central audio stream
    if (this.preferCentralAudio && typeof window !== 'undefined') {
      try {
        const audioUrl = `/api/tts?text=${encodeURIComponent(item.text)}`;
        const audio = new Audio(audioUrl);
        audio.volume = item.priority === 'spotlight' ? this.volume : this.volume * 0.9;
        audio.playbackRate = this.speechRate;

        audio.onended = () => {
          audio.onended = null;
          audio.onerror = null;
          onFinish();
        };

        audio.onerror = () => {
          audio.onended = null;
          audio.onerror = null;
          this.currentAudio = null;
          // Fallback to SpeechSynthesis
          this.speakViaSpeechSynthesis(item.text, onFinish);
        };

        this.currentAudio = audio;
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(() => {
            audio.onended = null;
            audio.onerror = null;
            this.currentAudio = null;
            this.speakViaSpeechSynthesis(item.text, onFinish);
          });
        }
        return;
      } catch {
        // Fall through to SpeechSynthesis
      }
    }

    // Tier 2: Browser SpeechSynthesis
    this.speakViaSpeechSynthesis(item.text, onFinish);
  }

  /**
   * Synthesizes speech using the browser SpeechSynthesis API.
   * Handles cancellation, paused synthesis, and audio rate accurately.
   */
  private speakViaSpeechSynthesis(text: string, onDone: () => void): void {
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
      utterance.rate = this.speechRate;
      utterance.pitch = 1.02;

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
   * Tests the presenter voice with an authentic IPL announcement sample.
   */
  public testVoice(
    sampleText: string = 'Welcome to the TATA IPL 2026 Auction! Virat Kohli is up next at a base price of 2 Crore rupees.',
    onComplete?: () => void
  ): void {
    this.speakAnnouncement(sampleText, onComplete);
  }

  /**
   * Stops currently playing speech without clearing the entire queue.
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
   * Stops all voice output and flushes the queue immediately.
   */
  public stopAll(): void {
    this.stopCurrentSpeech();
    this.speechQueue = [];
  }
}

export const voiceCommentary = new VoiceCommentaryService();
