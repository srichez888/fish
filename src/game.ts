import { CUSTOM_PAL, SKINS, START_MASS } from './config';
import { massToRadius, rand, tierOf } from './utils';
import {
  addShake, cam, eatenCount, player, playTime, Records, resetRun,
  setSkinMode, setState, setStamina, skinIdx, skinMode, powerTimers,
} from './state';
import { Sound } from './audio';
import { burst } from './effects';
import { initWorld, spawnPosAwayFromPlayer } from './spawn';
import { CustomSkin } from './customSkin';
import { updateRecordsLine } from './menu';
import { el } from './dom';
import type { Fish } from './types';

export function onDeath(killer: Fish): void {
  player.alive = false;
  setState('dead');
  burst(player.x, player.y, '#ffd166', 30, 200);
  burst(player.x, player.y, '#ff8a5c', 20, 160);
  addShake(14);
  Sound.death();
  const beatMass = player.mass > Records.data.bestMass;
  Records.data.bestMass = Math.max(Records.data.bestMass, player.mass);
  Records.data.bestTime = Math.max(Records.data.bestTime, playTime);
  Records.data.totalFish += eatenCount;
  Records.save();
  el('killerLine').innerHTML =
    `Devoured by <b>${killer.name}</b> — a ${tierOf(killer.mass)} of ${Math.round(killer.mass)} kg`;
  el('dMass').textContent = Math.round(player.mass) + ' kg';
  el('dFish').textContent = String(eatenCount);
  el('dTime').textContent = Math.floor(playTime) + 's';
  el('dBest').textContent = Math.round(Records.data.bestMass) + ' kg';
  el('newRecord').style.display = beatMass ? 'block' : 'none';
  updateRecordsLine();
  setTimeout(() => {
    el('deathScreen').classList.remove('hidden');
    el('hud').classList.remove('on');
    el('muteBtn').classList.remove('on');
  }, 900);
}

export function startGame(): void {
  initWorld();
  // safe spawn position
  const p = spawnPosAwayFromPlayer();
  player.x = p.x; player.y = p.y;
  player.mass = START_MASS; player.radius = massToRadius(START_MASS);
  player.angle = rand(0, Math.PI * 2); player.alive = true; player.shield = 2.5;
  player.slowT = 0; player.stingT = 0;
  if (skinMode === 'custom' && CustomSkin.tex){
    player.palette = CUSTOM_PAL;
    player.stripes = 0;
    player.customTex = CustomSkin.tex;
  } else {
    setSkinMode('palette');
    player.palette = SKINS[skinIdx].palette;
    player.stripes = SKINS[skinIdx].stripes;
    player.customTex = null;
  }
  powerTimers.magnet = 0; powerTimers.overdrive = 0;
  cam.x = player.x; cam.y = player.y;
  setStamina(100);
  resetRun();
  setState('play');
  el('startScreen').classList.add('hidden');
  el('deathScreen').classList.add('hidden');
  el('hud').classList.add('on');
  el('muteBtn').classList.add('on');
  Sound.init();
}
