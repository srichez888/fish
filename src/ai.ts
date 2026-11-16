import { EAT_RATIO, FOOD_LURE, WORLD } from './config';
import { clamp, dist2, lerpAngle, massToRadius, rand, speedOf } from './utils';
import { addEaten, addShake, fish, player, queueSpawn, time, trackMass } from './state';
import { Sound } from './audio';
import { burst, popup } from './effects';
import { canBeEaten, nearestFood, playerHidden } from './world';
import { onDeath } from './game';
import type { Fish } from './types';

export function updateAI(f: Fish, dt: number): void {
  f.decisionT -= dt;
  if (f.decisionT <= 0){
    f.decisionT = rand(0.18, 0.32);
    const fearR = (f.radius * 7 + 170);
    const huntR = 320 + f.aggression * 260 + f.radius * 3;

    if (f.kind === 'puffer'){
      // pufferfish doesn't hunt or flee: it puffs up in place
      f.mode = 'wander';
      f.wanderT -= 0.25;
      if (f.wanderT <= 0){ f.wanderT = rand(1, 3); f.desired += rand(-1.1, 1.1); }
    } else {
      // flee: bigger fish nearby (player included)
      let threat: Fish | null = null, tD = Infinity;
      // prey: smaller fish nearby
      let prey: Fish | null = null, pD = Infinity;
      for (const o of fish){
        if (o === f || !o.alive) continue;
        if (o.kind === 'puffer' && o.inflated > 0.5) continue;
        const d2 = dist2(f.x, f.y, o.x, o.y);
        if (o.mass > f.mass * EAT_RATIO && d2 < fearR * fearR){
          if (o.isPlayer && player.shield > 0) continue;
          if (d2 < tD){ tD = d2; threat = o; }
        } else if (o.mass * EAT_RATIO < f.mass && d2 < huntR * huntR){
          if (d2 < pD){ pD = d2; prey = o; }
        }
      }

      // the player is prey/threat like any other (invisible inside kelp)
      if (player.alive && !playerHidden()){
        const d2p = dist2(f.x, f.y, player.x, player.y);
        if (player.mass > f.mass * EAT_RATIO && d2p < fearR * fearR && player.shield <= 0){
          if (d2p < tD){ tD = d2p; threat = player; }
        } else if (player.mass * EAT_RATIO < f.mass && d2p < huntR * huntR){
          if (d2p < pD){ pD = d2p; prey = player; }
        }
      }

      if (threat){
        f.mode = 'flee';
        f.desired = Math.atan2(f.y - threat.y, f.x - threat.x) + rand(-0.3, 0.3);
      } else {
        // a food flake in range is worth more than prey that runs
        const fd = nearestFood(f, FOOD_LURE);
        const preyFar = prey !== null && dist2(f.x, f.y, prey.x, prey.y) > 240 * 240;
        if (fd && (!prey || preyFar)){
          f.mode = 'feed';
          f.foodTarget = fd;
          f.desired = Math.atan2(fd.y - f.y, fd.x - f.x);
        } else if (prey){
          f.mode = 'chase';
          f.target = prey;
          f.desired = Math.atan2(prey.y - f.y, prey.x - f.x);
        } else {
          f.mode = 'wander';
          if (f.school){
            const ox = f.school.x + Math.cos(time * 0.7 + f.orbitA) * f.orbitR;
            const oy = f.school.y + Math.sin(time * 0.7 + f.orbitA) * f.orbitR;
            f.desired = Math.atan2(oy - f.y, ox - f.x);
          } else {
            f.wanderT -= 0.25;
            if (f.wanderT <= 0){ f.wanderT = rand(1, 3); f.desired += rand(-1.1, 1.1); }
          }
        }
      }
    }
  }

  // pufferfish: inflates when a predator approaches
  if (f.kind === 'puffer'){
    let danger = false;
    if (player.alive && player.mass > f.mass * EAT_RATIO && dist2(f.x, f.y, player.x, player.y) < 280 * 280) danger = true;
    if (!danger){
      for (const o of fish){
        if (o === f || !o.alive) continue;
        if (o.mass > f.mass * EAT_RATIO && dist2(f.x, f.y, o.x, o.y) < 280 * 280){ danger = true; break; }
      }
    }
    f.inflated = clamp(f.inflated + (danger ? 3 : -1.6) * dt, 0, 1);
  }
  if (f.hitT > 0) f.hitT -= dt;

  if (f.mode === 'chase'){
    if (!f.target || !f.target.alive || f.target.mass * EAT_RATIO > f.mass || !canBeEaten(f.target) || (f.target.isPlayer && playerHidden())){
      f.mode = 'wander'; f.target = null;
    }
    else f.desired = Math.atan2(f.target.y - f.y, f.target.x - f.x);
  }
  if (f.mode === 'feed'){
    if (!f.foodTarget || f.foodTarget.dead){ f.mode = 'wander'; f.foodTarget = null; }
    else f.desired = Math.atan2(f.foodTarget.y - f.y, f.foodTarget.x - f.x);
  }

  // avoid edges
  const edge = 320;
  if (f.x < edge || f.x > WORLD - edge || f.y < edge || f.y > WORLD - edge){
    f.desired = Math.atan2(WORLD / 2 - f.y, WORLD / 2 - f.x);
    if (f.mode === 'chase') f.mode = 'wander';
  }

  const turn = f.turn * clamp(14 / f.radius, 0.5, 1.3);
  f.angle = lerpAngle(f.angle, f.desired, clamp(turn * dt, 0, 1));

  let spd = speedOf(f.mass) * f.speedMult;
  if (f.mode === 'flee') spd *= 1.08;
  if (f.mode === 'chase' && f.target && dist2(f.x, f.y, f.target.x, f.target.y) < 160 * 160) spd *= 1.3;
  f.vx = Math.cos(f.angle) * spd;
  f.vy = Math.sin(f.angle) * spd;
  f.x += f.vx * dt; f.y += f.vy * dt;
  f.x = clamp(f.x, 40, WORLD - 40); f.y = clamp(f.y, 40, WORLD - 40);
  f.speedNorm = clamp(spd / 260, 0, 1.4);
  f.mouthOpen = f.mode === 'chase' ? Math.min(1, f.mouthOpen + dt * 5) : Math.max(0, f.mouthOpen - dt * 4);
}

export function tryEat(eater: Fish, prey: Fish): void {
  if (!prey.alive || !eater.alive) return;
  if (prey.isPlayer && prey.shield > 0) return;
  if (!canBeEaten(prey)) return;
  if (eater.mass < prey.mass * EAT_RATIO) return;
  const rr = eater.radius * 0.95 + prey.radius * 0.65;
  if (dist2(eater.x, eater.y, prey.x, prey.y) < rr * rr){
    prey.alive = false;
    const gain = prey.mass * 0.7;
    eater.mass += gain;
    eater.radius = massToRadius(eater.mass);
    burst(prey.x, prey.y, prey.palette.body, Math.floor(8 + prey.radius * 0.5), 90 + prey.radius * 2);

    if (eater.isPlayer){
      addEaten();
      popup(prey.x, prey.y - prey.radius, '+' + Math.round(gain) + ' kg', '#ffd166');
      Sound.eat(prey.mass / eater.mass);
      if (prey.mass > eater.mass * 0.45) addShake(6);
      trackMass(player.mass);
    } else if (prey.isPlayer){
      onDeath(eater);
    } else {
      queueSpawn();
    }
  }
}
