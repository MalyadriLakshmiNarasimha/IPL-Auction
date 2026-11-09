'use client';

import { CommentaryEvent } from '@/shared/types';

class VoiceCommentaryService {
  private isVoiceMuted: boolean = false;
  private volume: number = 0.9; // 0.0 to 1.0
  private speechRate: number = 0.95; // 0.8 to 1.3 - Calm, professional presenter cadence
  private speechQueue: string[] = [];
  private isSpeaking: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private spokenEventIds: Set<string> = new Set();
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
        if (!isNaN(parsedRate) && parsedRate >= 0.7 && parsedRate <= 1.5) {
          this.speechRate = parsedRate;
        }
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
    const clamped = Math.max(0.75, Math.min(1.4, rate));
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
   * Priority: Centrally generated en-IN audio via /api/tts with SpeechSynthesis fallback.
   * Authoritative sequence: calls onComplete() when audio finishes (or after 8s safety timeout).
   */
  public speakAnnouncement(text: string, onComplete?: () => void): void {
    if (this.isVoiceMuted || typeof window === 'undefined') {
      if (onComplete) onComplete();
      return;
    }

    this.stopAll();

    const spokenText = this.cleanTextForSpeech(text);
    if (!spokenText || spokenText.length < 3) {
      if (onComplete) onComplete();
      return;
    }

    let called = false;
    const finish = () => {
      if (!called) {
        called = true;
        this.isSpeaking = false;
        this.currentAudio = null;
        if (onComplete) onComplete();
      }
    };

    // 8-second safety guarantee: never block auction indefinitely
    const safetyTimer = setTimeout(finish, 8000);

    // Try Tier 1: Centrally generated en-IN MP3 stream
    if (this.preferCentralAudio) {
      try {
        const audioUrl = `/api/tts?text=${encodeURIComponent(spokenText)}`;
        const audio = new Audio(audioUrl);
        audio.volume = this.volume;
        audio.playbackRate = this.speechRate;

        audio.onended = () => {
          clearTimeout(safetyTimer);
          finish();
        };

        audio.onerror = () => {
          // If central audio fails, seamlessly fallback to browser SpeechSynthesis
          this.speakViaSpeechSynthesis(spokenText, () => {
            clearTimeout(safetyTimer);
            finish();
          });
        };

        this.currentAudio = audio;
        this.isSpeaking = true;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay restriction or network block -> fallback to SpeechSynthesis
            this.speakViaSpeechSynthesis(spokenText, () => {
              clearTimeout(safetyTimer);
              finish();
            });
          });
        }
        return;
      } catch {
        // Fallback directly
      }
    }

    // Tier 2: Browser SpeechSynthesis with detected Indian female voice
    this.speakViaSpeechSynthesis(spokenText, () => {
      clearTimeout(safetyTimer);
      finish();
    });
  }

  /**
   * Synthesizes speech using the browser SpeechSynthesis API.
   */
  private speakViaSpeechSynthesis(text: string, onDone?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onDone) onDone();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.volume = this.volume;
      utterance.rate = this.speechRate;
      utterance.pitch = 1.02; // Slightly elevated pitch for natural female presenter cadence

      let called = false;
      const done = () => {
        if (!called) {
          called = true;
          this.isSpeaking = false;
          if (onDone) onDone();
        }
      };

      utterance.onend = done;
      utterance.onerror = done;

      this.isSpeaking = true;
      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
      if (onDone) onDone();
    }
  }

  /**
   * Queues and speaks an authoritative commentary event (bids, sold, unsold, stage change).
   */
  public speakEvent(event: CommentaryEvent): void {
    if (this.isVoiceMuted || typeof window === 'undefined') {
      return;
    }

    if (this.spokenEventIds.has(event.id)) {
      return; // Deduplicate
    }
    this.spokenEventIds.add(event.id);
    if (this.spokenEventIds.size > 100) {
      const first = this.spokenEventIds.values().next().value;
      if (first) this.spokenEventIds.delete(first);
    }

    const spokenText = this.cleanTextForSpeech(event.text);
    if (!spokenText || spokenText.length < 3) return;

    this.enqueue(spokenText);
  }

  private enqueue(text: string): void {
    if (this.speechQueue.length >= 3) {
      this.speechQueue.shift();
    }
    this.speechQueue.push(text);
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.isVoiceMuted || this.speechQueue.length === 0 || this.isSpeaking) {
      return;
    }

    const nextText = this.speechQueue.shift();
    if (!nextText) return;

    // Use central audio if available
    if (this.preferCentralAudio && typeof window !== 'undefined') {
      try {
        const audioUrl = `/api/tts?text=${encodeURIComponent(nextText)}`;
        const audio = new Audio(audioUrl);
        audio.volume = this.volume * 0.9;
        audio.playbackRate = this.speechRate;

        audio.onended = () => {
          this.isSpeaking = false;
          this.currentAudio = null;
          setTimeout(() => this.processQueue(), 250);
        };

        audio.onerror = () => {
          this.speakCommentarySpeechSynthesis(nextText);
        };

        this.currentAudio = audio;
        this.isSpeaking = true;
        const p = audio.play();
        if (p) {
          p.catch(() => {
            this.speakCommentarySpeechSynthesis(nextText);
          });
        }
        return;
      } catch {
        // Fall through
      }
    }

    this.speakCommentarySpeechSynthesis(nextText);
  }

  private speakCommentarySpeechSynthesis(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeaking = false;
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.volume = this.volume * 0.9;
      utterance.rate = this.speechRate * 1.05;
      utterance.pitch = 1.02;

      this.isSpeaking = true;

      utterance.onend = () => {
        this.isSpeaking = false;
        setTimeout(() => this.processQueue(), 250);
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        setTimeout(() => this.processQueue(), 150);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
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

  public stopAll(): void {
    if (this.currentAudio) {
      try {
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

    this.speechQueue = [];
    this.isSpeaking = false;
  }
}

export const voiceCommentary = new VoiceCommentaryService();
