import { TIERS, EAT_RATIO, START_MASS, WORLD } from './config';
import { clamp, tierIndex } from './utils';
import { eatenCount, fish, frenzy, foodCd, player, powerTimers, stamina } from './state';
import { playerHidden } from './world';
import { mctx } from './canvas';
import { el } from './dom';

export function updateHUD(): void {
  el('massVal').textContent = Math.round(player.mass) + ' kg';
  el('fishVal').textContent = String(eatenCount);
  const ti = tierIndex(player.mass);
  el('rankVal').textContent = TIERS[ti].name;
  const lo = ti === 0 ? START_MASS : TIERS[ti - 1].max;
  const hi = TIERS[ti].max;
  el('rankFill').style.width = clamp((player.mass - lo) / (hi - lo) * 100, 2, 100) + '%';

  const bf = el('boostFill');
  bf.style.width = stamina + '%';
  bf.classList.toggle('low', stamina < 30);

  // leaderboard
  const all = fish.filter(f => f.alive).map(f => ({ name: f.name, mass: f.mass, me: false }));
  if (player.alive) all.push({ name: 'YOU', mass: player.mass, me: true });
  all.sort((a, b) => b.mass - a.mass);
  const rows = all.slice(0, 5).map((r, i) =>
    `<div class="row${r.me ? ' me' : ''}"><span>${i + 1}. ${r.name}</span><span class="m">${Math.round(r.mass)} kg</span></div>`
  ).join('');
  el('lbRows').innerHTML = rows;

  // minimap
  mctx.clearRect(0, 0, 148, 148);
  mctx.fillStyle = 'rgba(1,14,24,0.85)';
  mctx.fillRect(0, 0, 148, 148);
  const s = 148 / WORLD;
  for (const f of fish){
    if (!f.alive) continue;
    mctx.fillStyle = f.mass > player.mass * EAT_RATIO ? '#ff5d6c' : (f.mass * EAT_RATIO < player.mass ? '#3ef2d0' : 'rgba(234,252,255,0.5)');
    mctx.fillRect(f.x * s - 1.5, f.y * s - 1.5, 3, 3);
  }
  if (player.alive){
    mctx.fillStyle = '#ffd166';
    mctx.beginPath();
    mctx.arc(player.x * s, player.y * s, 4, 0, Math.PI * 2);
    mctx.fill();
  }
  if (frenzy.active){
    mctx.strokeStyle = '#ffd166';
    mctx.lineWidth = 1.5;
    mctx.beginPath();
    mctx.arc(frenzy.x * s, frenzy.y * s, 6, 0, Math.PI * 2);
    mctx.stroke();
  }

  let chips = '';
  if (player.alive && player.shield > 0) chips += `<div class="pchip"><i style="background:#3ef2d0"></i>SHIELD<span class="t">${player.shield.toFixed(1)}s</span></div>`;
  if (powerTimers.magnet > 0) chips += `<div class="pchip"><i style="background:#9b8cff"></i>MAGNET<span class="t">${Math.ceil(powerTimers.magnet)}s</span></div>`;
  if (powerTimers.overdrive > 0) chips += `<div class="pchip"><i style="background:#ffd166"></i>OVERDRIVE<span class="t">${Math.ceil(powerTimers.overdrive)}s</span></div>`;
  if (playerHidden()) chips += `<div class="pchip"><i style="background:#5ce8b5"></i>HIDDEN</div>`;
  if (foodCd > 0) chips += `<div class="pchip"><i style="background:#ffb26b"></i>FOOD<span class="t">${foodCd.toFixed(1)}s</span></div>`;
  if (frenzy.active) chips += `<div class="pchip frenzy"><i style="background:#ffd166"></i>FRENZY<span class="t">${Math.ceil(frenzy.t)}s</span></div>`;
  el('powerChips').innerHTML = chips;
}
