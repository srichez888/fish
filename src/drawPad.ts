import { CustomSkin, selectCustom } from './customSkin';
import { Sound } from './audio';
import { el } from './dom';

/* ---------- drawing screen ---------- */
const pad = el('pad') as HTMLCanvasElement;
const pctx = pad.getContext('2d')!;
const padGuide = el('padGuide') as HTMLCanvasElement;
const gctx = padGuide.getContext('2d')!;
const PAD_W = 480, PAD_H = 300;
const PAD_COLORS = ['#f4f4f4', '#ffd166', '#ff8a5c', '#ff5d6c', '#ff7aa2', '#c26bd4', '#9b8cff', '#5cc9ff', '#3ef2d0', '#5ce8b5', '#c2f970', '#8a5c3b'];
let padColor = '#5cc9ff', padSize = 12, padEraser = false, padDrawing = false, padGuideOn = true;
let lastPX = 0, lastPY = 0;

function drawGuide(): void {
  gctx.clearRect(0, 0, PAD_W, PAD_H);
  if (!padGuideOn) return;
  const r = 104;
  gctx.save();
  gctx.translate(PAD_W / 2, PAD_H / 2);
  gctx.strokeStyle = 'rgba(234,252,255,0.22)';
  gctx.lineWidth = 2;
  gctx.setLineDash([7, 7]);
  gctx.beginPath();
  gctx.moveTo(r * 1.38, 0);
  gctx.bezierCurveTo(r * 1.22, -r * 0.6, r * 0.35, -r * 0.74, -r * 0.45, -r * 0.52);
  gctx.bezierCurveTo(-r * 0.9, -r * 0.36, -r * 1.12, -r * 0.16, -r * 1.18, 0);
  gctx.bezierCurveTo(-r * 1.12, r * 0.16, -r * 0.9, r * 0.36, -r * 0.45, r * 0.52);
  gctx.bezierCurveTo(r * 0.35, r * 0.74, r * 1.22, r * 0.6, r * 1.38, 0);
  gctx.stroke();
  gctx.beginPath();
  gctx.moveTo(-r * 1.05, 0);
  gctx.lineTo(-r * 1.6, -r * 0.5);
  gctx.lineTo(-r * 1.45, 0);
  gctx.lineTo(-r * 1.6, r * 0.5);
  gctx.closePath();
  gctx.stroke();
  gctx.beginPath();
  gctx.arc(r * 0.88, -r * 0.16, r * 0.15, 0, Math.PI * 2);
  gctx.stroke();
  gctx.restore();
}

function padPos(e: PointerEvent): [number, number] {
  const r = pad.getBoundingClientRect();
  return [(e.clientX - r.left) * PAD_W / r.width, (e.clientY - r.top) * PAD_H / r.height];
}

function padStroke(x0: number, y0: number, x1: number, y1: number): void {
  pctx.lineCap = 'round';
  pctx.lineJoin = 'round';
  pctx.lineWidth = padEraser ? padSize * 2.4 : padSize;
  pctx.globalCompositeOperation = padEraser ? 'destination-out' : 'source-over';
  pctx.strokeStyle = padColor;
  pctx.beginPath();
  pctx.moveTo(x0, y0);
  pctx.lineTo(x1, y1);
  pctx.stroke();
  pctx.globalCompositeOperation = 'source-over';
}

pad.addEventListener('pointerdown', e => {
  pad.setPointerCapture(e.pointerId);
  padDrawing = true;
  const p = padPos(e);
  lastPX = p[0]; lastPY = p[1];
  padStroke(lastPX, lastPY, lastPX + 0.1, lastPY + 0.1);
});
pad.addEventListener('pointermove', e => {
  if (!padDrawing) return;
  const p = padPos(e);
  padStroke(lastPX, lastPY, p[0], p[1]);
  lastPX = p[0]; lastPY = p[1];
});
window.addEventListener('pointerup', () => { padDrawing = false; });

function buildPadTools(): void {
  const tools = el('padTools');
  tools.innerHTML = '';
  PAD_COLORS.forEach(c => {
    const b = document.createElement('button');
    b.className = 'sw' + (!padEraser && c === padColor ? ' sel' : '');
    b.style.background = c;
    b.title = 'Color';
    b.addEventListener('click', () => {
      padColor = c; padEraser = false;
      tools.querySelectorAll('.sw').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      Sound.pellet();
    });
    tools.appendChild(b);
  });
  const er = document.createElement('button');
  er.className = 'sw eraser' + (padEraser ? ' sel' : '');
  er.title = 'Eraser';
  er.addEventListener('click', () => {
    padEraser = true;
    tools.querySelectorAll('.sw').forEach(x => x.classList.remove('sel'));
    er.classList.add('sel');
    Sound.pellet();
  });
  tools.appendChild(er);
  [6, 12, 22].forEach(s => {
    const b = document.createElement('button');
    b.className = 'bs' + (s === padSize ? ' sel' : '');
    b.title = 'Size';
    const dot = document.createElement('i');
    dot.style.width = dot.style.height = Math.max(4, s / 2.4) + 'px';
    b.appendChild(dot);
    b.addEventListener('click', () => {
      padSize = s;
      tools.querySelectorAll('.bs').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      Sound.pellet();
    });
    tools.appendChild(b);
  });
}

export function openDraw(): void {
  pctx.clearRect(0, 0, PAD_W, PAD_H);
  drawGuide();
  buildPadTools();
  el('drawScreen').classList.remove('hidden');
  Sound.pellet();
}

function closeDraw(): void {
  el('drawScreen').classList.add('hidden');
}

el('padClear').addEventListener('click', () => { pctx.clearRect(0, 0, PAD_W, PAD_H); Sound.pellet(); });
const guideBtn = el('padGuideBtn');
guideBtn.addEventListener('click', () => {
  padGuideOn = !padGuideOn;
  guideBtn.textContent = 'GUIDE : ' + (padGuideOn ? 'ON' : 'OFF');
  drawGuide();
  Sound.pellet();
});
el('padCancel').addEventListener('click', () => { closeDraw(); Sound.pellet(); });
el('padSave').addEventListener('click', () => {
  const d = pctx.getImageData(0, 0, PAD_W, PAD_H).data;
  let any = false;
  for (let i = 3; i < d.length; i += 64){ if (d[i] > 10){ any = true; break; } }
  if (!any){ Sound.sting(); return; }
  const small = document.createElement('canvas');
  small.width = 128; small.height = 80;
  small.getContext('2d')!.drawImage(pad, 0, 0, 128, 80);
  CustomSkin.save(small.toDataURL('image/png'));
  selectCustom();
  closeDraw();
  Sound.pickup();
});
