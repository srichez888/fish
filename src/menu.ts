import { SKINS } from './config';
import { difficulty, player, Records, setDifficulty, setSkinIdx, setSkinMode, skinIdx, skinMode } from './state';
import { Sound } from './audio';
import { makeFish } from './spawn';
import { drawFish } from './render/fish';
import { CustomSkin, paintCustomSlot, selectCustom } from './customSkin';
import { openDraw } from './drawPad';
import { el } from './dom';

/* ---------- persisted skins & settings ---------- */
export function updateRecordsLine(): void {
  const d = Records.data;
  el('recordsLine').textContent = d.bestMass > 0
    ? `Best: ${Math.round(d.bestMass)} kg · ${Math.floor(d.bestTime)}s · ${d.totalFish} fish eaten`
    : 'First dive — good luck!';
}

function previewFish(i: number, palette: typeof SKINS[number]['palette'], stripes: number, customTex: CanvasImageSource | null): ReturnType<typeof makeFish> {
  const f = makeFish(13, 39, 23);
  f.palette = palette;
  f.squash = 1;
  f.stripes = stripes;
  f.phase = i * 1.7;
  f.mouthOpen = 0;
  f.speedNorm = 0.4;
  f.angle = 0;
  f.radius = 13;
  f.customTex = customTex;
  return f;
}

export function buildSkinRow(): void {
  const row = el('skinRow');
  row.innerHTML = '';
  SKINS.forEach((s, i) => {
    const c = document.createElement('canvas');
    c.width = 78; c.height = 46;
    c.className = 'skin' + (skinMode === 'palette' && i === skinIdx ? ' sel' : '');
    const g = c.getContext('2d')!;
    drawFish(g, previewFish(i, s.palette, s.stripes, null));
    c.addEventListener('click', () => {
      setSkinIdx(i);
      setSkinMode('palette');
      try { localStorage.setItem('fishio_skin', String(i)); } catch (e) {}
      row.querySelectorAll('.skin').forEach(x => x.classList.remove('sel'));
      c.classList.add('sel');
      player.palette = s.palette;
      player.stripes = s.stripes;
      player.customTex = null;
      Sound.click();
    });
    row.appendChild(c);
  });

  // custom drawing slot
  const c = document.createElement('canvas');
  c.width = 78; c.height = 46;
  c.id = 'customSkinSlot';
  c.className = 'skin' + (skinMode === 'custom' ? ' sel' : '');
  paintCustomSlot(c);
  c.addEventListener('click', () => {
    if (CustomSkin.tex) selectCustom();
    else openDraw();
  });
  row.appendChild(c);
}

export function initMenu(): void {
  const buttons = document.querySelectorAll('.diff') as NodeListOf<HTMLElement>;
  buttons.forEach(b => {
    b.classList.toggle('sel', b.dataset.d === difficulty);
    b.addEventListener('click', () => {
      setDifficulty(b.dataset.d as string);
      try { localStorage.setItem('fishio_diff', difficulty); } catch (e) {}
      buttons.forEach(x => x.classList.toggle('sel', x.dataset.d === difficulty));
    });
  });
}
