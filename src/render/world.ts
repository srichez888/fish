import { PICKUP_INFO, WORLD } from '../config';
import { clamp, dist2 } from '../utils';
import {
  bubbles, cam, fish, food, frenzy, jellies, particles, pellets,
  pickups, player, popups, state, time,
} from '../state';
import { ctx, H, W } from '../canvas';
import { drawFish } from './fish';
import { drawDecor, drawKelpFront } from './decor';
import type { Jelly, Pickup } from '../types';

function lerpColor(c1: number[], c2: number[], t: number): number[] {
  return [Math.round(c1[0] + (c2[0] - c1[0]) * t), Math.round(c1[1] + (c2[1] - c1[1]) * t), Math.round(c1[2] + (c2[2] - c1[2]) * t)];
}
const C_SHALLOW = [14, 86, 116], C_MID = [6, 46, 70], C_DEEP = [1, 9, 18];

export function drawBackground(): void {
  const t = clamp(cam.y / WORLD, 0, 1);
  const top = t < 0.5 ? lerpColor(C_SHALLOW, C_MID, t * 2) : lerpColor(C_MID, C_DEEP, (t - 0.5) * 2);
  const bot = t < 0.5 ? lerpColor(C_MID, C_DEEP, t * 2) : C_DEEP;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${top[0]},${top[1]},${top[2]})`);
  g.addColorStop(1, `rgb(${bot[0]},${bot[1]},${bot[2]})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawRays(): void {
  // light rays in screen space, parallax 0.3
  const par = 0.3;
  const sx0 = cam.x * par - W / 2 - 500;
  const sx1 = cam.x * par + W / 2 + 500;
  const first = Math.floor(sx0 / 640) * 640;
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.85);
  g.addColorStop(0, 'rgba(140,240,255,0.10)');
  g.addColorStop(1, 'rgba(140,240,255,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.globalCompositeOperation = 'lighter';
  for (let rx = first; rx < sx1; rx += 640){
    const sway = Math.sin(time * 0.35 + rx * 0.011) * 110;
    const sx = rx - cam.x * par;
    ctx.beginPath();
    ctx.moveTo(sx, -20);
    ctx.lineTo(sx + 320, -20);
    ctx.lineTo(sx + 560 + sway, H * 0.9);
    ctx.lineTo(sx - 160 + sway, H * 0.9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawPlankton(): void {
  // infinite field: pseudo-random points per cell, parallax 0.55
  const par = 0.55, cell = 190;
  const viewW = W / cam.z, viewH = H / cam.z;
  const ox = cam.x * par, oy = cam.y * par;
  const cx0 = Math.floor((ox - viewW / 2) / cell), cx1 = Math.floor((ox + viewW / 2) / cell);
  const cy0 = Math.floor((oy - viewH / 2) / cell), cy1 = Math.floor((oy + viewH / 2) / cell);
  const wxBase = cam.x * (1 - par), wyBase = cam.y * (1 - par);
  for (let cx = cx0; cx <= cx1; cx++){
    for (let cy = cy0; cy <= cy1; cy++){
      const seed = Math.abs(Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453) % 1;
      const seed2 = Math.abs(Math.sin(cx * 269.5 + cy * 183.3) * 43758.5453) % 1;
      const px = (cx + seed) * cell + wxBase;
      const py = (cy + seed2) * cell + wyBase;
      const tw = 0.4 + Math.abs(Math.sin(time * 1.4 + seed * 20)) * 0.6;
      ctx.fillStyle = `rgba(150,250,230,${0.12 + tw * 0.2})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.6 + seed * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawJelly(j: Jelly): void {
  const r = j.r * (1 + Math.sin(time * 1.6 + j.phase) * 0.12);
  ctx.save();
  ctx.translate(j.x, j.y);
  ctx.strokeStyle = 'rgba(255,122,162,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++){
    const bx = (i / 5 - 0.5) * r * 1.3;
    ctx.beginPath();
    ctx.moveTo(bx, r * 0.15);
    ctx.quadraticCurveTo(bx + Math.sin(time * 2.2 + i + j.phase) * 6, r * 0.9,
                         bx + Math.sin(time * 2.2 + i * 2 + j.phase) * 10, r * 1.7);
    ctx.stroke();
  }
  const grd = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.15);
  grd.addColorStop(0, 'rgba(255,170,200,0.8)');
  grd.addColorStop(1, 'rgba(170,90,210,0.3)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  ctx.quadraticCurveTo(r * 0.5, r * 0.38, 0, r * 0.32);
  ctx.quadraticCurveTo(-r * 0.5, r * 0.38, -r, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,140,190,0.1)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPickup(u: Pickup): void {
  const info = PICKUP_INFO[u.kind];
  const pulse = 1 + Math.sin(time * 3 + u.phase) * 0.25;
  ctx.save();
  ctx.translate(u.x, u.y);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = info.color;
  ctx.beginPath();
  ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = info.color;
  ctx.fillStyle = info.color;
  ctx.lineWidth = 2;
  if (u.kind === 'shield'){
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
  } else if (u.kind === 'magnet'){
    ctx.beginPath();
    ctx.arc(0, -1.5, 5.5, Math.PI, 0);
    ctx.moveTo(-5.5, -1.5); ctx.lineTo(-5.5, 5);
    ctx.moveTo(5.5, -1.5); ctx.lineTo(5.5, 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(2, -9); ctx.lineTo(-4, 1); ctx.lineTo(-0.5, 1);
    ctx.lineTo(-2, 9); ctx.lineTo(4, -1); ctx.lineTo(0.5, -1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawFrenzy(): void {
  if (!frenzy.active) return;
  const a = 0.16 + Math.sin(time * 3) * 0.05;
  const beam = ctx.createLinearGradient(frenzy.x, frenzy.y - 900, frenzy.x, frenzy.y);
  beam.addColorStop(0, 'rgba(255,209,102,0)');
  beam.addColorStop(1, `rgba(255,209,102,${a * 1.4})`);
  ctx.fillStyle = beam;
  ctx.fillRect(frenzy.x - 70, frenzy.y - 900, 140, 900);
  const g = ctx.createRadialGradient(frenzy.x, frenzy.y, 30, frenzy.x, frenzy.y, 360);
  g.addColorStop(0, `rgba(255,209,102,${a})`);
  g.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(frenzy.x, frenzy.y, 360, 0, Math.PI * 2);
  ctx.fill();
  // laser show: three sweeping beams
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cols = ['255,209,102', '255,93,108', '62,242,208'];
  for (let i = 0; i < 3; i++){
    const la = time * (0.35 + i * 0.13) + i * 2.1;
    const len = 1000;
    const lg = ctx.createLinearGradient(frenzy.x, frenzy.y, frenzy.x + Math.cos(la) * len, frenzy.y + Math.sin(la) * len);
    lg.addColorStop(0, `rgba(${cols[i]},${0.45 + Math.sin(time * 4 + i * 2) * 0.2})`);
    lg.addColorStop(1, `rgba(${cols[i]},0)`);
    ctx.strokeStyle = lg;
    ctx.lineWidth = 12 + Math.sin(time * 6 + i * 2) * 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(frenzy.x, frenzy.y);
    ctx.lineTo(frenzy.x + Math.cos(la) * len, frenzy.y + Math.sin(la) * len);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = `rgba(255,209,102,${0.35 + Math.sin(time * 3) * 0.15})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 14]);
  ctx.lineDashOffset = -time * 40;
  ctx.beginPath();
  ctx.arc(frenzy.x, frenzy.y, 300, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawWorldObjects(): void {
  const viewR = (Math.max(W, H) / cam.z) * 0.7 + 200;

  drawFrenzy();
  drawDecor();

  for (const j of jellies){
    if (dist2(j.x, j.y, cam.x, cam.y) > viewR * viewR) continue;
    drawJelly(j);
  }
  for (const u of pickups){
    if (dist2(u.x, u.y, cam.x, cam.y) > viewR * viewR) continue;
    drawPickup(u);
  }

  // edible plankton
  for (const pel of pellets){
    if (dist2(pel.x, pel.y, cam.x, cam.y) > viewR * viewR) continue;
    const pulse = 1 + Math.sin(time * 3 + pel.phase) * 0.3;
    const col = pel.hue < 0.5 ? '62,242,208' : '255,209,102';
    ctx.fillStyle = `rgba(${col},0.9)`;
    ctx.beginPath();
    ctx.arc(pel.x, pel.y, 3 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${col},0.2)`;
    ctx.beginPath();
    ctx.arc(pel.x, pel.y, 8 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // food dropped by the player
  for (const b of food){
    if (dist2(b.x, b.y, cam.x, cam.y) > viewR * viewR) continue;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(time * 1.5 + b.phase);
    ctx.fillStyle = 'rgba(255,178,107,0.95)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,178,107,0.14)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // bubbles
  for (const b of bubbles){
    const a = clamp(b.life / 3, 0, 1) * 0.4;
    ctx.strokeStyle = `rgba(200,245,255,${a})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // fish (smallest first, bigger on top)
  const sorted = fish.filter(f => f.alive && dist2(f.x, f.y, cam.x, cam.y) < viewR * viewR)
                     .sort((a, b) => a.mass - b.mass);
  for (const f of sorted) drawFish(ctx, f);
  if (player.alive && state === 'play') drawFish(ctx, player);
  drawKelpFront();
}

export function drawBorder(): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(62,242,208,0.5)';
  ctx.lineWidth = 5 / cam.z;
  ctx.setLineDash([26 / cam.z, 18 / cam.z]);
  ctx.lineDashOffset = -time * 30;
  ctx.strokeRect(30, 30, WORLD - 60, WORLD - 60);
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(62,242,208,0.12)';
  ctx.lineWidth = 26 / cam.z;
  ctx.strokeRect(30, 30, WORLD - 60, WORLD - 60);
  ctx.restore();
}

export function drawParticles(): void {
  for (const q of particles){
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = q.color;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.r * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const u of popups){
    ctx.globalAlpha = clamp(u.life, 0, 1);
    ctx.font = '700 16px "Space Mono", monospace';
    ctx.fillStyle = u.color;
    ctx.fillText(u.txt, u.x, u.y);
  }
  ctx.globalAlpha = 1;
}
