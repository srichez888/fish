import {
  EAT_RATIO, FOOD_CD, FOOD_LURE, FOOD_MAX, PICKUP_INFO,
  TARGET_PICKUPS, WORLD,
} from './config';
import { clamp, dist2, filterInPlace, lerpAngle, massToRadius, rand } from './utils';
import {
  addShake, cam, food, foodCd, frenzy, fish, jellies,
  kelps, pellets, pickups, player, powerTimers, queuePellet,
  schools, setFoodCd, setStamina, stamina, state, time, trackMass,
} from './state';
import { Sound } from './audio';
import { burst, popup } from './effects';
import { spawnPickup } from './spawn';
import type { Food, Fish, PickupKind } from './types';

/* ---------- kelp: stealth ---------- */
export function inKelp(x: number, y: number): boolean {
  for (const k of kelps) if (dist2(x, y, k.x, k.y) < k.r * k.r) return true;
  return false;
}

export function playerHidden(): boolean {
  return player.alive && inKelp(player.x, player.y);
}

/* ---------- pufferfish: edible only when calm ---------- */
export function canBeEaten(p: Fish): boolean {
  return !(p.kind === 'puffer' && p.inflated > 0.5);
}

/* ---------- food dropped by the player ---------- */
export function dropFood(): void {
  if (state !== 'play' || !player.alive || foodCd > 0) return;
  setFoodCd(FOOD_CD);
  for (let i = 0; i < 6; i++){
    food.push({
      x: clamp(player.x + Math.cos(player.angle) * player.radius * 1.4 + rand(-46, 46), 50, WORLD - 50),
      y: clamp(player.y + Math.sin(player.angle) * player.radius * 1.4 + rand(-30, 30), 50, WORLD - 50),
      vy: rand(12, 26), life: rand(9, 14), phase: rand(0, Math.PI * 2), dead: false,
    });
  }
  if (food.length > FOOD_MAX) food.splice(0, food.length - FOOD_MAX);
  burst(player.x, player.y, '#ffb26b', 6, 70);
  Sound.blip(300, 0.15, 0.1, 'triangle');
}

export function nearestFood(f: Fish, radius: number): Food | null {
  let best: Food | null = null, bD = radius * radius;
  for (const b of food){
    if (b.dead) continue;
    const d = dist2(f.x, f.y, b.x, b.y);
    if (d < bD){ bD = d; best = b; }
  }
  return best;
}

export function updateFood(dt: number): void {
  for (let i = food.length - 1; i >= 0; i--){
    const b = food[i];
    b.life -= dt;
    b.y += b.vy * dt;
    b.x += Math.sin(time * 1.5 + b.phase) * 14 * dt;
    if (b.life <= 0 || b.y > WORLD - 40){ b.dead = true; food.splice(i, 1); continue; }
    for (const f of fish){
      if (!f.alive || f.isPlayer) continue;
      const rr = f.radius * 0.6 + 9;
      if (dist2(f.x, f.y, b.x, b.y) < rr * rr){
        b.dead = true;
        food.splice(i, 1);
        f.mass += 0.5;
        f.radius = massToRadius(f.mass);
        burst(b.x, b.y, '#ffb26b', 4, 50);
        break;
      }
    }
  }
}

/* ---------- fish schools ---------- */
export function updateSchools(dt: number): void {
  for (const s of schools){
    s.wanderT -= dt;
    if (s.wanderT <= 0){ s.wanderT = rand(2, 5); s.desired += rand(-1.2, 1.2); }
    const edge = 300;
    if (s.x < edge || s.x > WORLD - edge || s.y < edge || s.y > WORLD - edge){
      s.desired = Math.atan2(WORLD / 2 - s.y, WORLD / 2 - s.x);
    }
    s.angle = lerpAngle(s.angle, s.desired, clamp(dt * 0.7, 0, 1));
    s.x += Math.cos(s.angle) * 70 * dt;
    s.y += Math.sin(s.angle) * 70 * dt;
    s.x = clamp(s.x, 150, WORLD - 150);
    s.y = clamp(s.y, 150, WORLD - 150);
  }
}

export function pruneSchools(): void {
  for (const s of schools) filterInPlace(s.members, m => m.alive);
  const dissolved = schools.filter(s => s.members.length < 2);
  for (const s of dissolved) for (const m of s.members) m.school = null;
  filterInPlace(schools, s => s.members.length >= 2);
}

/* ---------- jellyfish ---------- */
export function updateJellies(dt: number): void {
  for (const j of jellies){
    j.x += (Math.cos(j.dir) * j.speed + Math.sin(time * 0.7 + j.phase) * 12) * dt;
    j.y += Math.sin(j.dir) * j.speed * 0.6 * dt;
    if (j.x < 120){ j.x = 120; j.dir = Math.PI - j.dir; }
    if (j.x > WORLD - 120){ j.x = WORLD - 120; j.dir = Math.PI - j.dir; }
    if (j.y < 120){ j.y = 120; j.dir = -j.dir; }
    if (j.y > WORLD - 120){ j.y = WORLD - 120; j.dir = -j.dir; }
    if (j.stingT > 0) j.stingT -= dt;

    if (state === 'play' && player.alive && player.shield <= 0 && player.stingT <= 0 && j.stingT <= 0){
      const rr = player.radius * 0.8 + j.r * 0.9;
      if (dist2(player.x, player.y, j.x, j.y) < rr * rr){
        j.stingT = 2; player.stingT = 0.8;
        player.mass = Math.max(5, player.mass - 2);
        setStamina(Math.max(0, stamina - 30));
        player.slowT = Math.max(player.slowT, 1);
        burst(j.x, j.y, '#ff7aa2', 10, 80);
        popup(player.x, player.y - player.radius, '-2 kg', '#ff5d6c');
        addShake(5);
        Sound.sting();
      }
    }
  }
}

/* ---------- power-ups ---------- */
export function applyPickup(kind: PickupKind): void {
  if (kind === 'shield') player.shield = Math.max(player.shield, 5);
  if (kind === 'magnet') powerTimers.magnet = 8;
  if (kind === 'overdrive') powerTimers.overdrive = 6;
}

export function updatePickups(dt: number): void {
  if (state === 'play' && player.alive){
    for (let i = pickups.length - 1; i >= 0; i--){
      const u = pickups[i];
      const rr = player.radius * 0.8 + 16;
      if (dist2(player.x, player.y, u.x, u.y) < rr * rr){
        applyPickup(u.kind);
        burst(u.x, u.y, PICKUP_INFO[u.kind].color, 12, 120);
        popup(u.x, u.y - 14, PICKUP_INFO[u.kind].label, PICKUP_INFO[u.kind].color);
        Sound.pickup();
        pickups.splice(i, 1);
      }
    }
  }
  if (pickups.length < TARGET_PICKUPS && Math.random() < dt * 0.4) spawnPickup();
}

export function updatePowerTimers(dt: number): void {
  powerTimers.magnet = Math.max(0, powerTimers.magnet - dt);
  powerTimers.overdrive = Math.max(0, powerTimers.overdrive - dt);
}

/* ---------- plankton frenzy ---------- */
export function updateFrenzy(dt: number): void {
  if (!frenzy.active){
    frenzy.next -= dt;
    if (frenzy.next <= 0){
      frenzy.active = true;
      frenzy.t = 20;
      let px: number, py: number, tries = 0;
      do {
        px = rand(500, WORLD - 500);
        py = rand(500, WORLD - 500);
        tries++;
      } while (dist2(px, py, player.x, player.y) < 900 * 900 && tries < 20);
      frenzy.x = px; frenzy.y = py;
      for (let i = 0; i < 60; i++){
        const a = rand(0, Math.PI * 2), d = 300 * Math.sqrt(Math.random());
        pellets.push({
          x: clamp(px + Math.cos(a) * d, 60, WORLD - 60),
          y: clamp(py + Math.sin(a) * d, 60, WORLD - 60),
          phase: rand(0, Math.PI * 2), hue: Math.random(),
        });
      }
      frenzy.beat = 0;
      Sound.blip(500, 0.25, 0.12, 'triangle');
      setTimeout(() => Sound.blip(630, 0.25, 0.12, 'triangle'), 110);
      setTimeout(() => Sound.blip(760, 0.35, 0.12, 'triangle'), 220);
    }
  } else {
    frenzy.t -= dt;
    frenzy.beat -= dt;
    if (frenzy.beat <= 0){ frenzy.beat = 2.6; Sound.blip(rand(480, 620), 0.3, 0.05, 'triangle'); }
    if (frenzy.t <= 0){ frenzy.active = false; frenzy.next = rand(50, 70); }
  }
}

/* ---------- pufferfish: contact damage when inflated ---------- */
export function pufferDamage(): void {
  if (!player.alive || player.shield > 0) return;
  for (const f of fish){
    if (!f.alive || f.kind !== 'puffer' || f.inflated <= 0.5 || f.hitT > 0) continue;
    const rr = player.radius * 0.85 + f.radius * (0.85 + f.inflated * 0.55);
    if (dist2(player.x, player.y, f.x, f.y) < rr * rr){
      f.hitT = 1.2;
      player.mass = Math.max(5, player.mass - 2);
      setStamina(Math.max(0, stamina - 25));
      player.slowT = Math.max(player.slowT, 0.9);
      const a = Math.atan2(player.y - f.y, player.x - f.x);
      player.x = clamp(player.x + Math.cos(a) * 46, 60, WORLD - 60);
      player.y = clamp(player.y + Math.sin(a) * 46, 60, WORLD - 60);
      burst(f.x, f.y, '#ffd166', 10, 110);
      popup(player.x, player.y - player.radius, '-2 kg', '#ff5d6c');
      addShake(5);
      Sound.sting();
    }
  }
}

/* ---------- plankton: picked up by the player ---------- */
export function updatePellets(dt: number): void {
  const p = player;
  if (p.alive){
    const r = p.radius * 0.85 + 8;
    const mr = 340;
    for (let i = pellets.length - 1; i >= 0; i--){
      const pel = pellets[i];
      if (powerTimers.magnet > 0){
        const dx = p.x - pel.x, dy = p.y - pel.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < mr){
          const pull = 300 * dt * (1 - d / mr);
          pel.x += dx / d * pull;
          pel.y += dy / d * pull;
        }
      }
      if (dist2(p.x, p.y, pel.x, pel.y) < r * r){
        p.mass += 0.5;
        trackMass(p.mass);
        burst(pel.x, pel.y, pel.hue < 0.5 ? '#3ef2d0' : '#ffd166', 4, 60);
        Sound.pellet();
        pellets.splice(i, 1);
        queuePellet();
      }
    }
  }
}
