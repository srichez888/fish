import { EAT_RATIO } from '../config';
import { clamp, dist2 } from '../utils';
import { cam, fish, player, state, time } from '../state';
import { ctx, H, W } from '../canvas';

export function drawOverlays(): void {
  // dark vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,5,12,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  if (state !== 'play' || !player.alive) return;

  // danger: nearest predator
  let nearest: typeof player | null = null, nD = Infinity;
  for (const f of fish){
    if (!f.alive || f.mass <= player.mass * EAT_RATIO) continue;
    const d2 = dist2(f.x, f.y, player.x, player.y);
    if (d2 < nD){ nD = d2; nearest = f; }
  }
  if (nearest && nD < 900 * 900){
    const d = Math.sqrt(nD);
    const intensity = clamp(1 - (d - player.radius * 4) / 700, 0, 1);
    if (intensity > 0.02){
      const pulse = 0.75 + Math.sin(time * 7) * 0.25;
      const rg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
      rg.addColorStop(0, 'rgba(255,40,60,0)');
      rg.addColorStop(1, `rgba(255,40,60,${intensity * 0.42 * pulse})`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);

      // arrow toward the predator
      const ang = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      const ax = W / 2 + Math.cos(ang) * (Math.min(W, H) / 2 - 60);
      const ay = H / 2 + Math.sin(ang) * (Math.min(W, H) / 2 - 60);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.globalAlpha = clamp(intensity * 1.4, 0, 1) * pulse;
      ctx.fillStyle = '#ff5d6c';
      ctx.beginPath();
      ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}
