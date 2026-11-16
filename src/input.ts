import { mouse } from './state';
import { Sound } from './audio';
import { dropFood } from './world';
import { startGame } from './game';
import { el } from './dom';

export function initInput(): void {
  window.addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('pointerdown', e => {
    mouse.down = true; mouse.x = e.clientX; mouse.y = e.clientY;
    Sound.init();
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ShiftLeft') mouse.down = true;
    if (e.code === 'KeyF' && !e.repeat) dropFood();
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ShiftLeft') mouse.down = false; });

  const muteBtn = el('muteBtn');
  muteBtn.addEventListener('click', () => {
    Sound.on = !Sound.on;
    muteBtn.textContent = Sound.on ? '♪' : '✕';
    muteBtn.style.color = Sound.on ? 'var(--glow)' : 'var(--danger)';
  });

  el('playBtn').addEventListener('click', () => startGame());
  el('retryBtn').addEventListener('click', () => startGame());
}
