import { bubbles, cam, particles, popups, time } from './state';
import { H, W } from './canvas';
import { clamp, rand } from './utils';
import type { Particle, Popup } from './types';

export function burst(x: number, y: number, color: string, n: number, spd: number): void {
  for (let i = 0; i < n; i++){
    const a = rand(0, Math.PI * 2), s = rand(spd * 0.3, spd);
    const p: Particle = { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.4, 0.9), max: 0.9, color, r: rand(2, 5) };
    particles.push(p);
  }
}

export function popup(x: number, y: number, txt: string, color: string): void {
  const u: Popup = { x, y, txt, color, life: 1 };
  popups.push(u);
}

export function updateParticles(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--){
    const q = particles[i];
    q.life -= dt;
    if (q.life <= 0){ particles.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    q.vx *= 0.92; q.vy *= 0.92;
  }
  for (let i = popups.length - 1; i >= 0; i--){
    const u = popups[i];
    u.life -= dt * 0.9;
    u.y -= 40 * dt;
    if (u.life <= 0) popups.splice(i, 1);
  }
}

export function updateBubbles(dt: number): void {
  if (bubbles.length < 42 && Math.random() < 0.3){
    bubbles.push({
      x: cam.x + rand(-W / 2 / cam.z, W / 2 / cam.z),
      y: cam.y + (H / 2) / cam.z + rand(0, 300),
      r: rand(2, 7), vy: rand(-90, -40), wob: rand(0, Math.PI * 2), life: rand(4, 9),
    });
  }
  for (let i = bubbles.length - 1; i >= 0; i--){
    const b = bubbles[i];
    b.life -= dt; b.y += b.vy * dt; b.x += Math.sin(time * 2 + b.wob) * 20 * dt;
    if (b.life <= 0 || b.y < cam.y - (H / 2) / cam.z - 200) bubbles.splice(i, 1);
  }
}
