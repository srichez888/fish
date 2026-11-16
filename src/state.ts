import { PALETTES, START_MASS, WORLD } from './config';
import { massToRadius } from './utils';
import type {
  Bubble, Decor, Fish, Food, GameState, Jelly, Kelp, Particle, Pellet,
  Pickup, Popup, School, SkinMode,
} from './types';

/* ---------- state arrays (const: mutate in place) ---------- */
export const fish: Fish[] = [];      // AI fish
export const pellets: Pellet[] = [];
export const particles: Particle[] = [];
export const popups: Popup[] = [];
export const bubbles: Bubble[] = [];
export const schools: School[] = [];
export const jellies: Jelly[] = [];
export const pickups: Pickup[] = [];
export const food: Food[] = [];
export const decor: Decor[] = [];
export const kelps: Kelp[] = [];

/* ---------- scalars: read directly, written through setters ---------- */
export let state: GameState = 'menu';
export function setState(s: GameState): void { state = s; }

export let time = 0;
export function tick(dt: number): void { time += dt; }

export let playTime = 0;
export function addPlayTime(dt: number): void { playTime += dt; }

export let eatenCount = 0;
export function addEaten(): void { eatenCount++; }

export let bestMass = START_MASS;
export function trackMass(m: number): void { if (m > bestMass) bestMass = m; }

/* reset at the start of a run */
export function resetRun(): void {
  playTime = 0;
  eatenCount = 0;
  bestMass = START_MASS;
}

let spawnQueue = 0;
export function queueSpawn(): void { spawnQueue++; }
export function takeSpawnQueue(): number { const n = spawnQueue; spawnQueue = 0; return n; }

let pelletQueue = 0;
export function queuePellet(): void { pelletQueue++; }
export function takePelletQueue(): number { const n = pelletQueue; pelletQueue = 0; return n; }

export let shake = 0;
export function addShake(v: number): void { shake = Math.min(shake + v, 18); }
export function decayShake(dt: number): void { shake *= Math.pow(0.001, dt); }

export let difficulty = 'normal';
export function setDifficulty(d: string): void { difficulty = d; }

export let skinIdx = 0;
export function setSkinIdx(i: number): void { skinIdx = i; }

export let skinMode: SkinMode = 'palette';
export function setSkinMode(m: SkinMode): void { skinMode = m; }

export let foodCd = 0;
export function setFoodCd(v: number): void { foodCd = v; }
export function decayFoodCd(dt: number): void { foodCd = Math.max(0, foodCd - dt); }

export let stamina = 100;
export function setStamina(v: number): void { stamina = v; }

/* ---------- persistent objects ---------- */
export const powerTimers = { magnet: 0, overdrive: 0 };
export const frenzy = { active: false, x: 0, y: 0, t: 0, next: 45, beat: 0 };

export const Records = {
  data: { bestMass: 0, bestTime: 0, totalFish: 0 },
  load(): void {
    try { Object.assign(this.data, JSON.parse(localStorage.getItem('fishio_records') || '{}')); } catch (e) {}
  },
  save(): void {
    try { localStorage.setItem('fishio_records', JSON.stringify(this.data)); } catch (e) {}
  },
};

export const player: Fish = {
  isPlayer: true, name: 'YOU', x: 0, y: 0, vx: 0, vy: 0, angle: 0,
  mass: START_MASS, radius: massToRadius(START_MASS), palette: PALETTES[2],
  squash: 1, stripes: 2, phase: 0, mouthOpen: 0, alive: true,
  targetAngle: 0, wanderT: 0, desired: 0, decisionT: 0, speedNorm: 0,
  shield: 0, slowT: 0, stingT: 0, customTex: null,
  turn: 3, speedMult: 1, aggression: 0.5,
  mode: 'wander', target: null, foodTarget: null,
  school: null, orbitA: 0, orbitR: 0,
  kind: 'normal', inflated: 0, hitT: 0,
};

export const cam = { x: WORLD / 2, y: WORLD / 2, z: 1 };
export const mouse = { x: 0, y: 0, down: false };
