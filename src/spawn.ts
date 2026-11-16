import {
  CORAL_COLORS, DECOR_COUNTS, DIFF, KELP_COUNT, PALETTES,
  SCHOOL_COUNT, TARGET_FISH, TARGET_JELLIES, TARGET_PELLETS,
  TARGET_PICKUPS, WORLD,
} from './config';
import { clamp, dist2, fishName, massToRadius, rand } from './utils';
import {
  decor, difficulty, fish, food, frenzy, jellies, kelps, particles,
  pellets, pickups, player, popups, powerTimers, schools, setFoodCd,
} from './state';
import type { Fish, Jelly, Kelp, Pellet, Pickup, PickupKind, School } from './types';

export function makeFish(mass: number, x: number, y: number): Fish {
  const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  return {
    isPlayer: false,
    name: fishName(),
    x, y, vx: 0, vy: 0,
    angle: rand(0, Math.PI * 2),
    mass, radius: massToRadius(mass),
    palette: p,
    squash: rand(0.82, 1.12),
    stripes: Math.random() < 0.45 ? Math.floor(rand(1, 4)) : 0,
    phase: rand(0, Math.PI * 2),
    mouthOpen: 0,
    turn: rand(2.0, 3.2),
    speedMult: rand(0.85, 1.08),
    aggression: rand(0.5, 1),
    decisionT: rand(0, 0.3),
    wanderT: 0,
    desired: rand(0, Math.PI * 2),
    mode: 'wander',
    target: null,
    foodTarget: null,
    speedNorm: 0,
    alive: true,
    kind: 'normal',
    inflated: 0,
    hitT: 0,
    school: null,
    orbitA: 0,
    orbitR: 0,
    customTex: null,
    shield: 0,
    slowT: 0,
    stingT: 0,
    targetAngle: 0,
  };
}

export function spawnPosAwayFromPlayer(): { x: number; y: number } {
  for (let i = 0; i < 14; i++){
    const x = rand(200, WORLD - 200), y = rand(200, WORLD - 200);
    if (dist2(x, y, player.x, player.y) > 1150 * 1150) return { x, y };
  }
  return { x: rand(200, WORLD - 200), y: rand(200, WORLD - 200) };
}

export function spawnAI(): void {
  // mass distribution weighted by player mass: always smaller AND bigger fish around
  const d = DIFF[difficulty] || DIFF.normal;
  const predW = 0.09 * d.pred, apexW = 0.03 * d.pred;
  const roll = Math.random() * (0.68 + predW + apexW);
  let mass: number;
  if (roll < 0.42)                      mass = player.mass * rand(0.22, 0.5);   // easy prey
  else if (roll < 0.68)                 mass = player.mass * rand(0.5, 0.85);   // prey
  else if (roll < 0.68 + predW)         mass = player.mass * rand(1.25, 1.9);   // predators
  else if (roll < 0.68 + predW + apexW) mass = player.mass * rand(1.9, 3.2);    // apex
  else                                  mass = player.mass * rand(0.85, 1.1);   // neutral
  mass = clamp(mass, 1.5, 600);
  const p = spawnPosAwayFromPlayer();
  const f = makeFish(mass, p.x, p.y);
  f.aggression *= d.aggr;
  if (f.mass < 9 && Math.random() < 0.07) f.kind = 'puffer';
  fish.push(f);
}

export function spawnPellet(): void {
  const pel: Pellet = { x: rand(60, WORLD - 60), y: rand(60, WORLD - 60), phase: rand(0, Math.PI * 2), hue: Math.random() };
  pellets.push(pel);
}

export function initWorld(): void {
  fish.length = 0; pellets.length = 0; particles.length = 0; popups.length = 0;
  schools.length = 0; jellies.length = 0; pickups.length = 0;
  food.length = 0; setFoodCd(0);
  powerTimers.magnet = 0; powerTimers.overdrive = 0;
  frenzy.active = false; frenzy.t = 0; frenzy.next = rand(40, 60);
  spawnDecor();
  for (let i = 0; i < TARGET_FISH; i++) spawnAI();
  for (let i = 0; i < TARGET_PELLETS; i++) spawnPellet();
  for (let i = 0; i < SCHOOL_COUNT; i++) makeSchool();
  for (let i = 0; i < TARGET_JELLIES; i++) spawnJelly();
  for (let i = 0; i < TARGET_PICKUPS; i++) spawnPickup();
}

/* ---------- aquarium decor ---------- */
export function spawnDecor(): void {
  decor.length = 0; kelps.length = 0;
  const D = DECOR_COUNTS;
  for (let i = 0; i < D.rocks; i++)
    decor.push({ t: 'rock', x: rand(80, WORLD - 80), y: rand(220, WORLD - 70), s: rand(26, 92), seed: rand(0, 7), tint: Math.random() });
  for (let i = 0; i < D.corals; i++)
    decor.push({ t: 'coral', x: rand(80, WORLD - 80), y: rand(320, WORLD - 60), s: rand(20, 52), seed: rand(0, 9), col: CORAL_COLORS[Math.floor(Math.random() * CORAL_COLORS.length)] });
  for (let i = 0; i < D.wood; i++)
    decor.push({ t: 'wood', x: rand(120, WORLD - 120), y: rand(380, WORLD - 60), s: rand(60, 150), seed: rand(0, 9), flip: Math.random() < 0.5 });
  for (let i = 0; i < D.wrecks; i++)
    decor.push({ t: 'wreck', x: rand(600, WORLD - 600), y: rand(500, WORLD - 220), s: rand(210, 340), seed: rand(0, 9), flip: Math.random() < 0.5 });
  for (let i = 0; i < KELP_COUNT; i++){
    const k: Kelp = { x: rand(150, WORLD - 150), y: rand(420, WORLD - 90), r: rand(85, 150), strands: [] };
    const n = 4 + Math.floor(rand(0, 4));
    for (let j = 0; j < n; j++)
      k.strands.push({ dx: rand(-k.r * 0.75, k.r * 0.75), len: rand(90, 240), phase: rand(0, 7), lean: rand(-0.35, 0.35), front: j < 2, w: rand(4, 9), hue: Math.random() });
    kelps.push(k);
  }
}

/* ---------- fish schools ---------- */
export function makeSchool(): void {
  const s: School = { x: rand(400, WORLD - 400), y: rand(400, WORLD - 400), angle: rand(0, Math.PI * 2), desired: rand(0, Math.PI * 2), wanderT: rand(1, 3), members: [] };
  const n = Math.floor(rand(5, 9));
  for (let i = 0; i < n; i++){
    const m = makeFish(rand(1.5, 4), s.x + rand(-60, 60), s.y + rand(-60, 60));
    m.school = s;
    m.orbitA = (i / n) * Math.PI * 2;
    m.orbitR = rand(50, 110);
    s.members.push(m);
    fish.push(m);
  }
  schools.push(s);
}

export function spawnJelly(): void {
  const j: Jelly = {
    x: rand(150, WORLD - 150), y: rand(150, WORLD - 150),
    dir: rand(0, Math.PI * 2), speed: rand(15, 35),
    r: rand(13, 22), phase: rand(0, Math.PI * 2), stingT: 0,
  };
  jellies.push(j);
}

export function spawnPickup(): void {
  const kinds: PickupKind[] = ['shield', 'magnet', 'overdrive'];
  const u: Pickup = {
    x: rand(120, WORLD - 120), y: rand(120, WORLD - 120),
    kind: kinds[Math.floor(Math.random() * kinds.length)],
    phase: rand(0, Math.PI * 2),
  };
  pickups.push(u);
}
