import { ctx, H, W } from '../canvas';
import { cam, decor, kelps, time } from '../state';
import { dist2 } from '../utils';
import type { CoralDecor, Kelp, RockDecor, WoodDecor, WreckDecor } from '../types';

export function drawDecor(): void {
  const viewR = (Math.max(W, H) / cam.z) * 0.7 + 300;
  for (const k of kelps){
    if (dist2(k.x, k.y, cam.x, cam.y) > viewR * viewR) continue;
    drawKelp(k, false);
  }
  for (const d of decor){
    if (dist2(d.x, d.y, cam.x, cam.y) > viewR * viewR) continue;
    if (d.t === 'rock') drawRock(d);
    else if (d.t === 'coral') drawCoral(d);
    else if (d.t === 'wood') drawWood(d);
    else drawWreck(d);
  }
}

export function drawKelpFront(): void {
  const viewR = (Math.max(W, H) / cam.z) * 0.7 + 300;
  for (const k of kelps){
    if (dist2(k.x, k.y, cam.x, cam.y) > viewR * viewR) continue;
    drawKelp(k, true);
  }
}

function drawKelp(k: Kelp, front: boolean): void {
  for (const st of k.strands){
    if (st.front !== front) continue;
    const bx = k.x + st.dx, by = k.y;
    const sway = Math.sin(time * 0.9 + st.phase) * 22 + Math.sin(time * 0.5 + st.phase * 2) * 10;
    const tipx = bx + st.lean * st.len * 0.4 + sway;
    const tipy = by - st.len;
    const col = st.hue < 0.5 ? '64,190,120' : '62,242,180';
    ctx.strokeStyle = front ? `rgba(${col},0.85)` : `rgba(${col},0.5)`;
    ctx.lineWidth = st.w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + sway * 0.4, by - st.len * 0.55, tipx, tipy);
    ctx.stroke();
    ctx.fillStyle = front ? `rgba(${col},0.7)` : `rgba(${col},0.38)`;
    for (let q = 1; q <= 3; q++){
      const t = q / 3.2;
      const lx = bx + (tipx - bx) * t + (q % 2 ? 9 : -9);
      const ly = by + (tipy - by) * t;
      ctx.beginPath();
      ctx.ellipse(lx, ly, st.w * 1.1, st.w * 0.55, q % 2 ? 0.6 : -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRock(d: RockDecor): void {
  const s = d.s;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.beginPath();
  for (let i = 0; i < 8; i++){
    const a = (i / 8) * Math.PI * 2 + d.seed;
    const rr = s * (0.72 + Math.abs(Math.sin(d.seed * 3.1 + i * 2.7)) * 0.45);
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.62;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const base = d.tint < 0.5 ? [16, 46, 66] : [22, 40, 58];
  const g = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.4);
  g.addColorStop(0, `rgb(${base[0] + 14},${base[1] + 16},${base[2] + 14})`);
  g.addColorStop(1, `rgb(${base[0] - 6},${base[1] - 6},${base[2] - 4})`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,220,0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawCoral(d: CoralDecor): void {
  const s = d.s;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.lineCap = 'round';
  const branches = 4;
  for (let i = 0; i < branches; i++){
    const a = -Math.PI / 2 + (i / (branches - 1) - 0.5) * 1.3 + Math.sin(d.seed + i) * 0.2;
    const len = s * (0.8 + Math.abs(Math.sin(d.seed * 2.3 + i * 1.7)) * 0.7);
    const mx = Math.cos(a) * len * 0.5 + Math.sin(d.seed + i * 2) * 6;
    const my = Math.sin(a) * len * 0.5;
    const tx = Math.cos(a) * len + Math.sin(d.seed * 1.7 + i) * 10;
    const ty = Math.sin(a) * len;
    ctx.strokeStyle = d.col;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = s * 0.14;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(mx, my, tx, ty);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = d.col;
    ctx.beginPath();
    ctx.arc(tx, ty, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(tx, ty, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWood(d: WoodDecor): void {
  const s = d.s;
  ctx.save();
  ctx.translate(d.x, d.y);
  if (d.flip) ctx.scale(-1, 1);
  ctx.rotate(Math.sin(d.seed) * 0.3);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(74,56,40,0.92)';
  ctx.lineWidth = s * 0.16;
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.quadraticCurveTo(0, -s * 0.3 + Math.sin(d.seed * 3) * 8, s, Math.sin(d.seed * 5) * 10);
  ctx.stroke();
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.12);
  ctx.quadraticCurveTo(-s * 0.45, -s * 0.45, -s * 0.62, -s * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.3, Math.sin(d.seed * 5) * 6);
  ctx.quadraticCurveTo(s * 0.5, -s * 0.3, s * 0.7, -s * 0.36);
  ctx.stroke();
  ctx.restore();
}

function drawWreck(d: WreckDecor): void {
  const s = d.s;
  ctx.save();
  ctx.translate(d.x, d.y);
  if (d.flip) ctx.scale(-1, 1);
  ctx.rotate(Math.sin(d.seed) * 0.06);
  ctx.fillStyle = 'rgba(4,20,32,0.85)';
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.quadraticCurveTo(-s * 0.9, -s * 0.32, -s * 0.4, -s * 0.36);
  ctx.lineTo(s * 0.75, -s * 0.3);
  ctx.quadraticCurveTo(s * 1.02, -s * 0.22, s * 1.08, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(4,20,32,0.85)';
  ctx.lineWidth = s * 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.15, -s * 0.34);
  ctx.lineTo(-s * 0.1, -s * 0.78);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, -s * 0.62);
  ctx.lineTo(s * 0.2, -s * 0.58);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,160,180,0.16)';
  ctx.lineWidth = s * 0.025;
  for (let i = 0; i < 4; i++){
    const wx = -s * 0.75 + i * s * 0.42;
    ctx.beginPath();
    ctx.arc(wx, -s * 0.14, s * 0.055, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
