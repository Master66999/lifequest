/**
 * AURA Voice Synthesizer using the browser's native Web Speech API.
 * Provides spoken Game Master debriefs, advice, and celebration voice-overs.
 */

class AuraVoiceEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isSupported = true;
    }
  }

  public canSpeak(): boolean {
    return this.isSupported && !!this.synth;
  }

  public speak(
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: () => void;
    }
  ): boolean {
    if (!this.canSpeak() || !this.synth) {
      options?.onError?.();
      return false;
    }

    // Stop any ongoing speech
    this.stop();

    // Clean markdown, symbols, and emojis for cleaner spoken speech
    const cleanText = text
      .replace(/[*_~`#]/g, '')
      .replace(/[⚔️🔮🗡️🎭🛡️🔥⚡👑🌟🦉🐉💰🥋🧠✨👹🎯🧘]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;

    // Configure commanding, mystical Game Master tone
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    utterance.volume = 1.0;

    // Pick best English voice available
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('George') || v.name.includes('Guy'))) ||
        v.lang.startsWith('en-US') ||
        v.lang.startsWith('en-GB')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      options?.onError?.();
    };

    this.synth.speak(utterance);
    return true;
  }

  public stop(): void {
    if (this.canSpeak() && this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return !!(this.synth && (this.synth.speaking || this.synth.pending));
  }
}

export const auraVoice = new AuraVoiceEngine();
