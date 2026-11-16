import { clamp, rand } from './utils';

export const Sound = {
  ctx: null as AudioContext | null,
  on: true,
  init(): void {
    if (!this.ctx){
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
      } catch (e) { /* no audio available */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  blip(freq: number, dur: number, vol: number, type?: OscillatorType): void {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  },
  eat(ratio: number): void { this.blip(clamp(560 - ratio * 260, 140, 560), 0.16, 0.14, 'triangle'); },
  pellet(): void { this.blip(rand(700, 900), 0.07, 0.05, 'sine'); },
  pickup(): void {
    this.blip(420, 0.12, 0.12, 'square');
    setTimeout(() => this.blip(640, 0.18, 0.12, 'square'), 90);
  },
  sting(): void { this.blip(95, 0.3, 0.18, 'sawtooth'); },
  death(): void {
    if (!this.on || !this.ctx) return;
    this.blip(220, 0.9, 0.22, 'sawtooth');
    this.blip(110, 1.2, 0.18, 'square');
  },
};
