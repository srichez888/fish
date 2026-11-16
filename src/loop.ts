import { EAT_RATIO, TARGET_FISH, TARGET_PELLETS, WORLD } from './config';
import { clamp, dist2, filterInPlace, massToRadius, rand } from './utils';
import {
  addPlayTime, cam, decayFoodCd, decayShake, fish, pellets, player,
  queueSpawn, shake, state, takePelletQueue, takeSpawnQueue, tick, time,
} from './state';
import { updatePlayer } from './player';
import {
  canBeEaten, pruneSchools, pufferDamage, updateFood, updateFrenzy,
  updateJellies, updatePickups, updatePellets, updatePowerTimers, updateSchools,
} from './world';
import { tryEat, updateAI } from './ai';
import { burst, updateBubbles, updateParticles } from './effects';
import { spawnAI, spawnPellet } from './spawn';
import { DPR, ctx, H, W } from './canvas';
import {
  drawBackground, drawBorder, drawParticles, drawPlankton,
  drawRays, drawWorldObjects,
} from './render/world';
import { drawOverlays } from './render/overlays';
import { updateHUD } from './hud';

let lastT = performance.now();
export function loop(now: number): void {
  requestAnimationFrame(loop);
  let dt = (now - lastT) / 1000;
  lastT = now;
  dt = clamp(dt, 0, 0.05);
  tick(dt);

  if (state === 'play'){
    addPlayTime(dt);
    updatePlayer(dt);
    updatePowerTimers(dt);
    for (const f of fish) if (f.alive) updateAI(f, dt);

    // eating: AI vs everyone, player via collision
    const alive = fish.filter(f => f.alive);
    for (let i = 0; i < alive.length; i++){
      const a = alive[i];
      for (let j = i + 1; j < alive.length; j++){
        const b = alive[j];
        if (!a.alive || !b.alive) continue;
        const big = a.mass > b.mass ? a : b, small = a.mass > b.mass ? b : a;
        if (!canBeEaten(small)) continue;
        const rr = big.radius * 0.95 + small.radius * 0.65;
        if (dist2(big.x, big.y, small.x, small.y) < rr * rr && big.mass > small.mass * EAT_RATIO){
          small.alive = false;
          big.mass += small.mass * 0.7;
          big.radius = massToRadius(big.mass);
          burst(small.x, small.y, small.palette.body, 6, 70);
          queueSpawn();
        }
      }
      if (a.alive && player.alive && !a.isPlayer) tryEat(a, player);
      if (a.alive && player.alive && player.mass > a.mass * EAT_RATIO && canBeEaten(a)) tryEat(player, a);
    }
    filterInPlace(fish, f => f.alive);
    pruneSchools();
    let n = takeSpawnQueue();
    while (n > 0){ spawnAI(); n--; }
    if (fish.length < TARGET_FISH && Math.random() < dt * 3) spawnAI();

    updatePellets(dt);
    updateFood(dt);
    decayFoodCd(dt);
    let pq = takePelletQueue();
    while (pq > 0 && pellets.length < TARGET_PELLETS){ spawnPellet(); pq--; }
    if (pellets.length < TARGET_PELLETS && Math.random() < dt * 8) spawnPellet();

    updatePickups(dt);
    updateJellies(dt);
    updateSchools(dt);
    updateFrenzy(dt);
    pufferDamage();

    // camera
    const targetZ = clamp(1.15 * Math.pow(14 / player.radius, 0.35), 0.42, 1.15);
    cam.z += (targetZ - cam.z) * clamp(dt * 2, 0, 1);
    cam.x += (player.x - cam.x) * clamp(dt * 5, 0, 1);
    cam.y += (player.y - cam.y) * clamp(dt * 5, 0, 1);

    updateHUD();
  } else {
    // the world keeps living behind the screens
    for (const f of fish) if (f.alive) updateAI(f, dt);
    filterInPlace(fish, f => f.alive);
    pruneSchools();
    updateSchools(dt);
    updateJellies(dt);
    updateFood(dt);
    let n = takeSpawnQueue();
    while (n > 0){ spawnAI(); n--; }
    if (fish.length < TARGET_FISH && Math.random() < dt * 3) spawnAI();
    if (state === 'menu'){
      cam.x += (WORLD / 2 + Math.sin(time) * 900 - cam.x) * clamp(dt, 0, 1) * 0.4;
      cam.y += (WORLD / 2 + Math.cos(time * 0.13) * 700 - cam.y) * clamp(dt, 0, 1) * 0.4;
      cam.z += (0.55 - cam.z) * clamp(dt, 0, 1);
    }
  }

  updateParticles(dt);
  updateBubbles(dt);
  decayShake(dt);

  // ---- rendering ----
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBackground();
  drawRays();

  ctx.save();
  const shx = shake > 0.3 ? rand(-shake, shake) : 0;
  const shy = shake > 0.3 ? rand(-shake, shake) : 0;
  ctx.translate(W / 2 + shx, H / 2 + shy);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
  drawPlankton();
  drawWorldObjects();
  drawBorder();
  drawParticles();
  ctx.restore();

  drawOverlays();
}
