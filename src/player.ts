import { START_MASS, WORLD } from './config';
import { clamp, lerpAngle, rand, speedOf } from './utils';
import { cam, mouse, player, powerTimers, particles, setStamina, stamina } from './state';
import { H, W } from './canvas';

export function updatePlayer(dt: number): void {
  const p = player;
  if (!p.alive) return;

  // direction toward the mouse
  const wx = cam.x + (mouse.x - W / 2) / cam.z;
  const wy = cam.y + (mouse.y - H / 2) / cam.z;
  p.targetAngle = Math.atan2(wy - p.y, wx - p.x);

  // sprint
  const od = powerTimers.overdrive > 0;
  const wantBoost = od || (mouse.down && stamina > 6 && p.mass > START_MASS * 0.9);
  if (wantBoost && !od){ setStamina(Math.max(0, stamina - 26 * dt)); }
  else if (!wantBoost){ setStamina(Math.min(100, stamina + 20 * dt)); }
  const boost = wantBoost ? 1.75 : 1;

  const base = speedOf(p.mass) * 1.1;
  const turn = clamp(4.6 * Math.pow(14 / p.radius, 0.25), 1.8, 5);
  p.angle = lerpAngle(p.angle, p.targetAngle, clamp(turn * dt, 0, 1));
  const spd = base * boost * (p.slowT > 0 ? 0.55 : 1);
  p.vx = Math.cos(p.angle) * spd;
  p.vy = Math.sin(p.angle) * spd;
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.x = clamp(p.x, 60, WORLD - 60); p.y = clamp(p.y, 60, WORLD - 60);
  p.speedNorm = clamp(spd / 260, 0, 1.4);
  p.mouthOpen = wantBoost ? 1 : Math.max(0, p.mouthOpen - dt * 4);
  if (p.shield > 0) p.shield -= dt;
  if (p.slowT > 0) p.slowT -= dt;
  if (p.stingT > 0) p.stingT -= dt;

  if (wantBoost && Math.random() < 0.5){
    particles.push({
      x: p.x - Math.cos(p.angle) * p.radius, y: p.y - Math.sin(p.angle) * p.radius,
      vx: rand(-30, 30) - Math.cos(p.angle) * 60, vy: rand(-30, 30) - Math.sin(p.angle) * 60,
      life: 0.5, max: 0.5, color: 'rgba(125,255,222,0.8)', r: rand(1.5, 3),
    });
  }
}
