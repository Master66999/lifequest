// Web Audio API Sound Effects Engine for LifeQuest AI
// Pure synthesized audio with zero external dependencies or latency

class SoundEffectsEngine {
  private audioCtx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('lifequest_sfx_muted');
      this.muted = storedMute === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifequest_sfx_muted', String(this.muted));
      window.dispatchEvent(new CustomEvent('lifequest-sfx-toggled', { detail: { muted: this.muted } }));
    }
    return this.muted;
  }

  public setMute(muted: boolean) {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifequest_sfx_muted', String(this.muted));
      window.dispatchEvent(new CustomEvent('lifequest-sfx-toggled', { detail: { muted: this.muted } }));
    }
  }

  /** Subtle UI button click */
  public playClick() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // ignore
    }
  }

  /** Quest completion 4-note ascending chime */
  public playQuestComplete() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Notes: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const noteDuration = 0.09;
      const startTime = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + idx * noteDuration);

        gain.gain.setValueAtTime(0, startTime + idx * noteDuration);
        gain.gain.linearRampToValueAtTime(0.18, startTime + idx * noteDuration + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * noteDuration + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + idx * noteDuration);
        osc.stop(startTime + idx * noteDuration + 0.23);
      });
    } catch {
      // ignore
    }
  }

  /** Gold coin clink sound */
  public playCoinClink() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime;
      const freqs = [1318.51, 1760.0]; // E6, A6

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + idx * 0.06);

        gain.gain.setValueAtTime(0.14, startTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + idx * 0.06);
        osc.stop(startTime + idx * 0.06 + 0.25);
      });
    } catch {
      // ignore
    }
  }

  /** Majestic Level Up fanfare */
  public playLevelUpFanfare() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Fanfare sequence: C4, G4, C5, E5, G5, High C6 chord
      const melody = [
        { freq: 261.63, time: 0, dur: 0.12 },
        { freq: 392.0, time: 0.12, dur: 0.12 },
        { freq: 523.25, time: 0.24, dur: 0.14 },
        { freq: 659.25, time: 0.38, dur: 0.14 },
        { freq: 783.99, time: 0.52, dur: 0.18 },
      ];

      const startTime = ctx.currentTime;

      melody.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime + time);

        gain.gain.setValueAtTime(0, startTime + time);
        gain.gain.linearRampToValueAtTime(0.15, startTime + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + time + dur + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + time);
        osc.stop(startTime + time + dur + 0.1);
      });

      // Triumphant Chord at the end (C5 + G5 + C6)
      const chordTime = startTime + 0.72;
      const chordFreqs = [523.25, 783.99, 1046.5];

      chordFreqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, chordTime);

        gain.gain.setValueAtTime(0, chordTime);
        gain.gain.linearRampToValueAtTime(0.2, chordTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(chordTime);
        osc.stop(chordTime + 0.75);
      });
    } catch {
      // ignore
    }
  }

  /** Boss damage impact strike */
  public playBossHit() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime;

      // Heavy punch impact oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, startTime);
      osc.frequency.exponentialRampToValueAtTime(35, startTime + 0.22);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    } catch {
      // ignore
    }
  }

  /** Item equip / unequip click */
  public playEquip() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, startTime);
      osc.frequency.exponentialRampToValueAtTime(1400, startTime + 0.08);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.09);
    } catch {
      // ignore
    }
  }
}

export const soundEffects = new SoundEffectsEngine();
