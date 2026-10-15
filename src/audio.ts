// Web Audio API Sound Synthesizer for Retro 8-bit / Mario Style Effects

class AudioManager {
  private ctx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public musicEnabled: boolean = false;
  private bgmInterval: number | null = null;
  private bgmStep: number = 0;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play simple sound effect
  public playJump() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playBlockBump() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playCorrect() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Classic Mario Coin sound: B5 (987.77 Hz) for 0.08s then E6 (1318.51 Hz) for 0.35s
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now);
    osc1.frequency.setValueAtTime(1318.51, now + 0.08);

    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.setValueAtTime(0.25, now + 0.08);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.46);

    // Complementary sparkle tone
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1975.5, now + 0.08);
    gain2.gain.setValueAtTime(0.12, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.36);
  }

  public playWrong() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Gentle playful boing / wobble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.25);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playTurtleEmerge() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.28);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.29);
  }

  public playHurtLifeLost() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Downward dramatic damage chord
    const freqs = [330, 260, 196, 130];
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = now + idx * 0.07;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, startT);
      osc.frequency.linearRampToValueAtTime(f * 0.7, startT + 0.1);

      gain.gain.setValueAtTime(0.25, startT);
      gain.gain.exponentialRampToValueAtTime(0.01, startT + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startT);
      osc.stop(startT + 0.13);
    });
  }

  public playCostumeUnlock() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Mario Powerup chiptune arpeggio: C4, G4, C5, E5, G5, C6
    const notes = [261.6, 392.0, 523.25, 659.25, 783.99, 1046.5];
    let time = this.ctx.currentTime;
    notes.forEach(f => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, time);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.1);
      time += 0.055;
    });
  }

  public playLevelClear() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [
      { f: 392, d: 0.12 }, // G4
      { f: 523, d: 0.12 }, // C5
      { f: 659, d: 0.12 }, // E5
      { f: 784, d: 0.15 }, // G5
      { f: 659, d: 0.12 }, // E5
      { f: 784, d: 0.35 }, // G5
    ];

    let time = this.ctx.currentTime + 0.05;
    notes.forEach(n => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, time);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.linearRampToValueAtTime(0.01, time + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + n.d);
      time += n.d;
    });
  }

  public playPrincessFanfare() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Grand royal victory fanfare
    const notes = [
      { f: 523.25, d: 0.15 }, // C5
      { f: 523.25, d: 0.15 }, // C5
      { f: 523.25, d: 0.15 }, // C5
      { f: 659.25, d: 0.3 },  // E5
      { f: 587.33, d: 0.15 }, // D5
      { f: 523.25, d: 0.15 }, // C5
      { f: 659.25, d: 0.2 },  // E5
      { f: 783.99, d: 0.5 },  // G5
      { f: 1046.5, d: 0.8 },  // C6
    ];

    let time = this.ctx.currentTime + 0.05;
    notes.forEach(n => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, time);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + n.d);
      time += n.d * 0.95;
    });
  }

  public toggleMusic(enable?: boolean) {
    this.musicEnabled = enable !== undefined ? enable : !this.musicEnabled;
    if (this.musicEnabled) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
    return this.musicEnabled;
  }

  public toggleSound(enable?: boolean) {
    this.soundEnabled = enable !== undefined ? enable : !this.soundEnabled;
    return this.soundEnabled;
  }

  private startBGM() {
    this.stopBGM();
    this.initContext();
    if (!this.ctx) return;

    // Catchy cheerful 8-bit melody notes
    const melody = [
      261.63, 329.63, 392.00, 523.25,
      392.00, 329.63, 261.63, 392.00,
      349.23, 440.00, 523.25, 440.00,
      293.66, 349.23, 440.00, 392.00
    ];

    this.bgmStep = 0;
    this.bgmInterval = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx) return;
      const freq = melody[this.bgmStep % melody.length];
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.17);

      this.bgmStep++;
    }, 180);
  }

  private stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const audio = new AudioManager();
