import { EAT_RATIO } from '../config';
import { clamp, dist2, shade } from '../utils';
import { cam, player, state, time } from '../state';
import { H } from '../canvas';
import type { Fish } from '../types';

export function drawFish(ctx: CanvasRenderingContext2D, f: Fish): void {
  const r = f.radius;
  const wag = Math.sin(time * (5 + f.speedNorm * 9) + f.phase) * 0.42 * (0.4 + f.speedNorm * 0.7);
  const t1 = wag * r * 0.5;
  const squash = f.squash;

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.angle);
  if (Math.cos(f.angle) < 0) ctx.scale(1, -1);
  if (f.kind === 'puffer') ctx.scale(1 + f.inflated * 0.55, 1 + f.inflated * 0.55);
  ctx.scale(1, squash);

  // pufferfish spikes (behind the body)
  if (f.kind === 'puffer' && f.inflated > 0.05){
    ctx.strokeStyle = `rgba(2,16,28,${0.8 * f.inflated})`;
    ctx.lineWidth = Math.max(1.2, r * 0.09);
    for (let i = 0; i < 14; i++){
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.lineTo(Math.cos(a) * r * (1.12 + f.inflated * 0.3), Math.sin(a) * r * (1.12 + f.inflated * 0.3));
      ctx.stroke();
    }
  }

  const pal = f.palette;
  const dark = shade(pal.body, -55);
  const light = pal.belly;

  // tail
  ctx.beginPath();
  ctx.moveTo(-r * 1.02, 0);
  ctx.quadraticCurveTo(-r * 1.55, t1 - r * 0.12, -r * 1.92, -r * 0.72 + t1);
  ctx.quadraticCurveTo(-r * 1.58, t1 * 0.55, -r * 1.92, r * 0.72 + t1);
  ctx.quadraticCurveTo(-r * 1.55, t1 - r * 0.12, -r * 1.02, 0);
  ctx.fillStyle = dark;
  ctx.fill();

  // dorsal fin
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, -r * 0.5);
  ctx.quadraticCurveTo(-r * 0.5, -r * 1.05 + wag * r * 0.2, -r * 0.85, -r * 0.4);
  ctx.closePath();
  ctx.fillStyle = dark;
  ctx.fill();

  // body
  const body = new Path2D();
  body.moveTo(r * 1.38, 0);
  body.bezierCurveTo(r * 1.22, -r * 0.6, r * 0.35, -r * 0.74, -r * 0.45, -r * 0.52);
  body.bezierCurveTo(-r * 0.9, -r * 0.36, -r * 1.12, -r * 0.16, -r * 1.18, 0);
  body.bezierCurveTo(-r * 1.12, r * 0.16, -r * 0.9, r * 0.36, -r * 0.45, r * 0.52);
  body.bezierCurveTo(r * 0.35, r * 0.74, r * 1.22, r * 0.6, r * 1.38, 0);
  if (f.customTex){
    // player-drawn skin: texture mapped into the silhouette
    ctx.save();
    ctx.clip(body);
    ctx.drawImage(f.customTex, -r * 1.18, -r * 0.74, r * 2.56, r * 1.48);
    ctx.restore();
    ctx.strokeStyle = 'rgba(2,16,28,0.5)';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.stroke(body);
  } else {
    const grd = ctx.createLinearGradient(0, -r * 0.7, 0, r * 0.7);
    grd.addColorStop(0, shade(pal.body, -30));
    grd.addColorStop(0.55, pal.body);
    grd.addColorStop(1, light);
    ctx.fillStyle = grd;
    ctx.fill(body);
  }

  // stripes (clipped to the body)
  if (f.stripes > 0){
    ctx.save();
    ctx.clip(body);
    ctx.fillStyle = 'rgba(2,16,28,0.28)';
    for (let i = 0; i < f.stripes; i++){
      const sx = r * (0.55 - i * 0.42);
      ctx.beginPath();
      ctx.moveTo(sx, -r);
      ctx.quadraticCurveTo(sx + r * 0.16, 0, sx, r);
      ctx.lineTo(sx + r * 0.2, r);
      ctx.quadraticCurveTo(sx + r * 0.36, 0, sx + r * 0.2, -r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // gill
  ctx.beginPath();
  ctx.arc(r * 0.42, 0, r * 0.42, -0.7, 0.7);
  ctx.strokeStyle = 'rgba(2,16,28,0.25)';
  ctx.lineWidth = r * 0.07;
  ctx.stroke();

  // pectoral fin
  ctx.save();
  ctx.translate(r * 0.12, r * 0.3);
  ctx.rotate(0.5 + wag * 0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.3, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(2,16,28,0.3)';
  ctx.fill();
  ctx.restore();

  // mouth
  if (f.mouthOpen > 0.05){
    const mo = f.mouthOpen;
    ctx.beginPath();
    ctx.moveTo(r * 1.34, 0);
    ctx.quadraticCurveTo(r * 1.15, r * 0.1 + mo * r * 0.35, r * 0.95, r * 0.12 + mo * r * 0.3);
    ctx.strokeStyle = 'rgba(2,16,28,0.65)';
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // eye
  ctx.beginPath();
  ctx.arc(r * 0.88, -r * 0.16, r * 0.17, 0, Math.PI * 2);
  ctx.fillStyle = '#f4ffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.94, -r * 0.16, r * 0.085, 0, Math.PI * 2);
  ctx.fillStyle = '#03141d';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.97, -r * 0.2, r * 0.03, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  // outline: cyan = edible, red = danger (relative to the player)
  if (state === 'play' && !f.isPlayer && player.alive){
    const inView = dist2(f.x, f.y, cam.x, cam.y) < Math.pow((H / cam.z) * 0.75, 2);
    if (inView){
      const pulse = 0.55 + Math.sin(time * 5 + f.phase) * 0.2;
      if (f.mass * EAT_RATIO < player.mass){
        ctx.strokeStyle = `rgba(62,242,208,${pulse * 0.8})`;
        ctx.lineWidth = Math.max(1.5, r * 0.06);
      } else if (f.mass > player.mass * EAT_RATIO){
        ctx.strokeStyle = `rgba(255,93,108,${pulse * 0.9})`;
        ctx.lineWidth = Math.max(1.5, r * 0.06);
      } else {
        ctx.strokeStyle = 'rgba(234,252,255,0.14)';
        ctx.lineWidth = 1.2;
      }
      ctx.stroke(body);
    }
  }

  // spawn shield
  if (f.isPlayer && player.shield > 0){
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2);
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = `rgba(62,242,208,${clamp(player.shield / 2.5, 0, 1) * 0.7})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}
