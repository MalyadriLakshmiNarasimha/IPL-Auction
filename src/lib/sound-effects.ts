// Web Audio API Synthesizer Sound Effects for Auction Events (Zero External Asset Dependency)

class SoundFX {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ipl_sound_fx');
      this.enabled = stored !== null ? stored === 'true' : true;
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(value: boolean) {
    this.enabled = value;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ipl_sound_fx', value ? 'true' : 'false');
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  // Soft countdown tick (under 5 seconds)
  public playTick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // AudioContext policy suppression fallback
    }
  }

  // Crisper high tick for final 2 seconds
  public playUrgentTick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1320, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {
      // AudioContext policy suppression fallback
    }
  }

  // Uplifting ascending chirp on placing or receiving a bid
  public playBid() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // AudioContext policy suppression fallback
    }
  }

  // Wooden Gavel Hammer Impact (realistic wooden auctioneer gavel strike)
  public playGavel() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // 1. Primary wooden body thud
      const bodyOsc = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(175, t);
      bodyOsc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
      bodyGain.gain.setValueAtTime(0.55, t);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      bodyOsc.connect(bodyGain);
      bodyGain.connect(this.ctx.destination);
      bodyOsc.start(t);
      bodyOsc.stop(t + 0.30);

      // 2. High-frequency wood-on-wood impact crack
      const crackOsc = this.ctx.createOscillator();
      const crackGain = this.ctx.createGain();
      crackOsc.type = 'square';
      crackOsc.frequency.setValueAtTime(650, t);
      crackOsc.frequency.exponentialRampToValueAtTime(90, t + 0.05);
      crackGain.gain.setValueAtTime(0.3, t);
      crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      crackOsc.connect(crackGain);
      crackGain.connect(this.ctx.destination);
      crackOsc.start(t);
      crackOsc.stop(t + 0.07);

      // 3. Acoustic soundboard resonance
      const resOsc = this.ctx.createOscillator();
      const resGain = this.ctx.createGain();
      resOsc.type = 'sine';
      resOsc.frequency.setValueAtTime(260, t + 0.01);
      resOsc.frequency.exponentialRampToValueAtTime(110, t + 0.18);
      resGain.gain.setValueAtTime(0.18, t + 0.01);
      resGain.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
      resOsc.connect(resGain);
      resGain.connect(this.ctx.destination);
      resOsc.start(t + 0.01);
      resOsc.stop(t + 0.22);
    } catch {
      // AudioContext policy suppression fallback
    }
  }

  // SOLD Celebration Fanfare
  public playSold() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);
        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.15, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.35);
      });
    } catch {
      // AudioContext policy suppression fallback
    }
  }

  // UNSOLD Low descending tone
  public playUnsold() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(160, t + 0.4);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    } catch {
      // AudioContext policy suppression fallback
    }
  }
}

export const soundFX = new SoundFX();

