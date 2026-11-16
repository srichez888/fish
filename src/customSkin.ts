import { CUSTOM_PAL } from './config';
import { player, setSkinMode, skinMode } from './state';
import { Sound } from './audio';
import { makeFish } from './spawn';
import { drawFish } from './render/fish';

/* ---------- skin drawn by the player ---------- */
export const CustomSkin = {
  data: null as string | null,
  tex: null as HTMLCanvasElement | null,
  load(): void {
    try { this.data = localStorage.getItem('fishio_custom'); } catch (e) {}
    if (this.data) this.build();
  },
  build(): void {
    if (!this.data || !this.data.startsWith('data:')) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 80;
      c.getContext('2d')!.drawImage(img, 0, 0, 128, 80);
      this.tex = c;
      const slot = document.getElementById('customSkinSlot') as HTMLCanvasElement | null;
      if (slot) paintCustomSlot(slot);
    };
    img.src = this.data;
  },
  save(dataURL: string): void {
    this.data = dataURL;
    try { localStorage.setItem('fishio_custom', dataURL); } catch (e) {}
    this.build();
  },
};

export function paintCustomSlot(c: HTMLCanvasElement): void {
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  if (CustomSkin.tex){
    const f = makeFish(13, 39, 23);
    f.palette = CUSTOM_PAL;
    f.squash = 1;
    f.stripes = 0;
    f.phase = 1.3;
    f.mouthOpen = 0;
    f.speedNorm = 0.4;
    f.angle = 0;
    f.radius = 13;
    f.customTex = CustomSkin.tex;
    drawFish(g, f);
  } else {
    g.strokeStyle = 'rgba(234,252,255,0.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(39, 15); g.lineTo(39, 31);
    g.moveTo(31, 23); g.lineTo(47, 23);
    g.stroke();
    g.fillStyle = 'rgba(234,252,255,0.55)';
    g.font = '9px "Space Mono", monospace';
    g.textAlign = 'center';
    g.fillText('DRAW', 39, 42);
  }
}

export function selectCustom(): void {
  if (!CustomSkin.tex) return;
  setSkinMode('custom');
  try { localStorage.setItem('fishio_skin', 'custom'); } catch (e) {}
  document.querySelectorAll('#skinRow .skin').forEach(x => x.classList.remove('sel'));
  const slot = document.getElementById('customSkinSlot');
  if (slot) slot.classList.add('sel');
  player.palette = CUSTOM_PAL;
  player.stripes = 0;
  player.customTex = CustomSkin.tex;
  Sound.pellet();
}

/* keeps skinMode imported so the boot state stays coherent */
export function isCustomSelected(): boolean { return skinMode === 'custom'; }
