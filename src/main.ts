import { CUSTOM_PAL, DIFF, SKINS, WORLD } from './config';
import { clamp } from './utils';
import { Sound } from './audio';
import { CustomSkin } from './customSkin';
import { buildSkinRow, initMenu, updateRecordsLine } from './menu';
import { initInput } from './input';
import { initWorld } from './spawn';
import { loop } from './loop';
import { difficulty, player, Records, setDifficulty, setSkinIdx, setSkinMode, skinMode } from './state';

/* ---------- boot ---------- */
Records.load();
Sound.load();
try { setDifficulty(localStorage.getItem('fishio_diff') || 'normal'); } catch (e) {}
if (!DIFF[difficulty]) setDifficulty('normal');
CustomSkin.load();
try {
  const savedSkin = localStorage.getItem('fishio_skin');
  if (savedSkin === 'custom' && CustomSkin.data) setSkinMode('custom');
  else setSkinIdx(clamp(parseInt(savedSkin || '0', 10) || 0, 0, SKINS.length - 1));
} catch (e) {}
if (skinMode === 'custom' && CustomSkin.tex){
  player.palette = CUSTOM_PAL;
  player.stripes = 0;
  player.customTex = CustomSkin.tex;
}
buildSkinRow();
initMenu();
updateRecordsLine();
initInput();

/* start the world so the home screen is alive */
initWorld();
player.x = WORLD / 2; player.y = WORLD / 2;
requestAnimationFrame(loop);
