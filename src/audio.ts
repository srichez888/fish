import { clamp, rand } from './utils';
import { cam } from './state';
import { W } from './canvas';

export type AudioMode = 'all' | 'nomusic' | 'off';

interface PadVoice {
  oscs: OscillatorNode[];
  gain: GainNode;
}

const CHORDS: number[][] = [
  [110, 130.81, 164.81],      // Am
  [87.31, 110, 130.81],       // F
  [130.81, 164.81, 196],      // C
  [98, 123.47, 146.83],       // G
];
const SCALE = [220, 261.63, 329.63, 392, 440, 523.25];   // A minor pentatonic
const STEP = 0.24;             // pluck grid (s)
const CHORD_LEN = 8;           // pad chord duration (s)
const LOOKAHEAD = 0.15;        // scheduler lookahead (s)

export const Sound = {
  ctx: null as AudioContext | null,
  mode: 'all' as AudioMode,

  master: null as GainNode | null,
  sfxBus: null as GainNode | null,
  musicBus: null as GainNode | null,
  ambBus: null as GainNode | null,
  musicFilter: null as BiquadFilterNode | null,
  ambFilter: null as BiquadFilterNode | null,
  ambDepthGain: null as GainNode | null,
  noiseBuffer: null as AudioBuffer | null,

  _padVoices: [] as PadVoice[],
  _nextNote: 0,
  _nextChord: 0,
  _chordIdx: 0,
  _danger: 0,
  _ducked: false,

  /* ---------- lifecycle ---------- */
  load(): void {
    try {
      const saved = JSON.parse(localStorage.getItem('fishio_audio') || '{}') as { mode?: AudioMode };
      if (saved.mode === 'all' || saved.mode === 'nomusic' || saved.mode === 'off') this.mode = saved.mode;
    } catch (e) { /* keep default */ }
  },
  save(): void {
    try { localStorage.setItem('fishio_audio', JSON.stringify({ mode: this.mode })); } catch (e) { /* ignore */ }
  },
  init(): void {
    if (!this.ctx){
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
      } catch (e) { return; /* no audio available */ }
      const c = this.ctx;

      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      comp.connect(c.destination);

      this.master = c.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(comp);

      this.sfxBus = c.createGain();
      this.sfxBus.gain.value = 1;
      this.sfxBus.connect(this.master);

      this.musicBus = c.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);
      this.musicFilter = c.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 1100;
      // pin the channel layout: pad voices are mono, plucks arrive stereo —
      // letting the count float causes Chrome's "channel count changes" glitch warning
      this.musicFilter.channelCount = 2;
      this.musicFilter.channelCountMode = 'explicit';
      this.musicFilter.connect(this.musicBus);

      this.ambBus = c.createGain();
      this.ambBus.gain.value = 0;
      this.ambBus.connect(this.master);

      // 2 s loopable white-noise buffer, shared by every noise voice
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;

      this._startAmbience();
      this._startMusicScheduler();
      this._applyGains();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  cycle(): AudioMode {
    this.mode = this.mode === 'all' ? 'nomusic' : this.mode === 'nomusic' ? 'off' : 'all';
    this._applyGains();
    this.save();
    return this.mode;
  },
  _applyGains(): void {
    if (!this.ctx || !this.master || !this.sfxBus || !this.musicBus || !this.ambBus) return;
    const t = this.ctx.currentTime;
    const k = this._ducked ? 0.3 : 1;   // death screen ducking
    this.master.gain.setTargetAtTime(this.mode === 'off' ? 0 : 0.75, t, 0.15);
    this.musicBus.gain.setTargetAtTime(this.mode === 'all' ? 0.45 * k : 0, t, 0.3);
    this.ambBus.gain.setTargetAtTime(this.mode === 'off' ? 0 : 0.55 * k, t, 0.3);
  },

  /* ---------- ambience ---------- */
  _startAmbience(): void {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    this.ambFilter = c.createBiquadFilter();
    this.ambFilter.type = 'lowpass';
    this.ambFilter.frequency.value = 320;
    this.ambFilter.Q.value = 0.7;
    this.ambFilter.channelCount = 1;
    this.ambFilter.channelCountMode = 'explicit';

    this.ambDepthGain = c.createGain();
    this.ambDepthGain.gain.value = 0.85;

    // slow swell on the filter (waves)
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 70;
    lfo.connect(lfoGain);
    lfoGain.connect(this.ambFilter.frequency);
    lfo.start();

    src.connect(this.ambFilter);
    this.ambFilter.connect(this.ambDepthGain);
    this.ambDepthGain.connect(this.ambBus!);
    src.start();

    const whale = (): void => {
      this._whaleCall();
      window.setTimeout(whale, rand(22000, 42000));
    };
    window.setTimeout(whale, rand(8000, 20000));
  },
  _whaleCall(): void {
    if (!this.ctx || this.mode === 'off' || this.ctx.state !== 'running') return;
    const c = this.ctx;
    const t = c.currentTime;
    const pan = c.createStereoPanner();
    pan.pan.value = rand(-0.7, 0.7);
    pan.connect(this.ambBus!);
    for (const [mult, vol] of [[1, 0.03], [2.7, 0.012]] as const){
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(190 * mult, t);
      o.frequency.exponentialRampToValueAtTime(72 * mult, t + 3.6);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
      o.connect(g);
      g.connect(pan);
      o.start(t);
      o.stop(t + 4);
    }
  },
  /* depth: 0 = surface, 1 = abyss — deeper gets darker and denser */
  setDepth(t: number): void {
    if (!this.ctx || !this.ambFilter || !this.ambDepthGain) return;
    const d = clamp(t, 0, 1);
    this.ambFilter.frequency.setTargetAtTime(420 - 280 * d, this.ctx.currentTime, 0.5);
    this.ambDepthGain.gain.setTargetAtTime(0.7 + 0.4 * d, this.ctx.currentTime, 0.5);
  },

  /* ---------- music (generative pad + plucks) ---------- */
  _startMusicScheduler(): void {
    window.setInterval(() => this._schedule(), 30);
  },
  _schedule(): void {
    if (!this.ctx || this.mode !== 'all') return;
    const now = this.ctx.currentTime;
    if (this._nextNote < now) this._nextNote = now + 0.05;
    while (this._nextNote < now + LOOKAHEAD){
      if (Math.random() < 0.32) this._pluck(this._nextNote);
      this._nextNote += STEP;
    }
    if (this._nextChord <= now){
      this._chordChange(now + 0.05);
      this._nextChord = now + CHORD_LEN;
    }
  },
  _chordChange(time: number): void {
    const c = this.ctx!;
    // fade out the previous pad
    for (const v of this._padVoices){
      v.gain.gain.setTargetAtTime(0, time, 0.9);
      for (const o of v.oscs) o.stop(time + 3.5);
    }
    this._padVoices = [];
    const chord = CHORDS[this._chordIdx % CHORDS.length];
    this._chordIdx++;
    for (const freq of chord){
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(0.03, time + 1.8);
      g.connect(this.musicFilter!);
      const oscs: OscillatorNode[] = [];
      for (const det of [-6, 6]){
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        o.detune.value = det;
        o.connect(g);
        o.start(time);
        oscs.push(o);
      }
      this._padVoices.push({ oscs, gain: g });
    }
  },
  _pluck(time: number): void {
    const c = this.ctx!;
    let freq = SCALE[Math.floor(Math.random() * SCALE.length)];
    if (this._danger > 0.55 && Math.random() < 0.6) freq /= 2;   // darker register under threat
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    o.detune.value = rand(-8, 8);
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(0.09, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
    const p = c.createStereoPanner();
    p.pan.value = rand(-0.4, 0.4);
    o.connect(g); g.connect(p); p.connect(this.musicFilter!);
    o.start(time);
    o.stop(time + 0.65);
  },
  /* danger: 0 = calm, 1 = predator right on top of you */
  setDanger(d: number): void {
    if (!this.ctx || !this.musicFilter) return;
    this._danger = clamp(d, 0, 1);
    this.musicFilter.frequency.setTargetAtTime(1100 - 760 * this._danger, this.ctx.currentTime, 0.6);
  },
  duck(on: boolean): void {
    this._ducked = on;
    this._applyGains();
  },

  /* ---------- voice helpers ---------- */
  panFor(x: number | undefined): number {
    if (x === undefined) return 0;
    return clamp(((x - cam.x) / (W / cam.z)) * 1.6, -1, 1);
  },
  blip(freq: number, dur: number, vol: number, type?: OscillatorType, pan = 0): void {
    if (!this.ctx || !this.sfxBus || this.mode === 'off') return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    p.pan.value = pan;
    o.connect(g); g.connect(p); p.connect(this.sfxBus);
    o.start(t); o.stop(t + dur);
  },
  noiseBurst(dur: number, freq: number, q: number, vol: number, pan = 0): void {
    if (!this.ctx || !this.sfxBus || !this.noiseBuffer || this.mode === 'off') return;
    const c = this.ctx;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const p = c.createStereoPanner();
    p.pan.value = pan;
    src.connect(f); f.connect(g); g.connect(p); p.connect(this.sfxBus);
    src.start(t, rand(0, 1.5));
    src.stop(t + dur + 0.05);
  },

  /* ---------- game sfx ---------- */
  _eatCombo: 0,
  _lastEatT: 0,
  /* eating is the core reward: rising gulp + crunch + thump, climbing with combo streaks */
  eat(ratio: number, x?: number): void {
    if (!this.ctx || !this.sfxBus || this.mode === 'off') return;
    const c = this.ctx;
    const t = c.currentTime;
    const pan = this.panFor(x);
    // consecutive eats within ~2 s climb in pitch, arcade coin-style
    this._eatCombo = (t - this._lastEatT < 2.2) ? Math.min(this._eatCombo + 1, 10) : 0;
    this._lastEatT = t;
    const sizeBoost = clamp(0.7 + ratio * 0.9, 0.6, 1.5);          // bigger prey = louder reward
    const base = 330 * Math.pow(1.059, this._eatCombo * 2);        // ~1 tone per combo step
    // rising "gulp"
    const o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner();
    o.type = 'triangle';
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.09);
    g.gain.setValueAtTime(0.17 * sizeBoost, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    p.pan.value = pan;
    o.connect(g); g.connect(p); p.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.2);
    // meaty crunch, deeper for bigger prey
    this.noiseBurst(0.14, clamp(1000 - ratio * 700, 260, 1000), 0.9, 0.15 * sizeBoost, pan);
    // low thump on big bites
    if (ratio > 0.45){
      const thump = c.createOscillator(), tg = c.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(95, t);
      thump.frequency.exponentialRampToValueAtTime(50, t + 0.16);
      tg.gain.setValueAtTime(0.12 * sizeBoost, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      thump.connect(tg); tg.connect(p);
      thump.start(t); thump.stop(t + 0.2);
    }
  },
  pellet(x?: number): void {
    this.blip(rand(700, 900), 0.07, 0.09, 'sine', this.panFor(x));
  },
  pickup(kind: 'shield' | 'magnet' | 'overdrive', x?: number): void {
    if (!this.ctx || this.mode === 'off') return;
    const pan = this.panFor(x);
    const notes: Record<string, number[]> = {
      shield: [420, 560, 700],
      magnet: [380, 500, 380],
      overdrive: [500, 660, 830],
    };
    notes[kind].forEach((f, i) => {
      window.setTimeout(() => this.blip(f, i === 2 ? 0.2 : 0.1, 0.11, 'square', pan), i * 85);
    });
  },
  sting(x?: number): void {
    if (!this.ctx || this.mode === 'off') return;
    const pan = this.panFor(x);
    this.blip(95, 0.3, 0.16, 'sawtooth', pan);
    this.noiseBurst(0.15, 180, 1, 0.1, pan);
  },
  death(): void {
    if (!this.ctx || !this.sfxBus || this.mode === 'off') return;
    const c = this.ctx;
    const t = c.currentTime;
    this.blip(220, 0.9, 0.2, 'sawtooth');
    this.blip(110, 1.2, 0.15, 'square');
    this.noiseBurst(0.5, 300, 0.7, 0.18);
    // low boom
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(58, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 1.5);
  },
  click(): void {
    this.blip(700, 0.045, 0.05, 'square');
  },
  kelp(entering: boolean): void {
    this.noiseBurst(0.3, entering ? 800 : 500, 2, 0.07);
  },
  foodPlop(x?: number): void {
    if (!this.ctx || !this.sfxBus || this.mode === 'off') return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner();
    o.type = 'sine';
    o.frequency.setValueAtTime(320, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.18);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    p.pan.value = this.panFor(x);
    o.connect(g); g.connect(p); p.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.22);
    this.noiseBurst(0.06, 1200, 1, 0.04, p.pan.value);
  },
  alert(): void {
    this.blip(660, 0.09, 0.05, 'triangle');
    window.setTimeout(() => this.blip(520, 0.12, 0.05, 'triangle'), 130);
  },
  frenzyChime(): void {
    this.blip(500, 0.25, 0.12, 'triangle');
    window.setTimeout(() => this.blip(630, 0.25, 0.12, 'triangle'), 110);
    window.setTimeout(() => this.blip(760, 0.35, 0.12, 'triangle'), 220);
  },
  frenzyBeat(): void {
    this.blip(rand(480, 620), 0.3, 0.05, 'triangle');
  },
};
