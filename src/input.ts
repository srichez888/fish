import { mouse } from './state';
import { Sound, type AudioMode } from './audio';
import { dropFood } from './world';
import { startGame } from './game';
import { el } from './dom';

const MUTE_ICONS: Record<AudioMode, string> = { all: '♪', nomusic: '♩', off: '✕' };

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
  const applyMuteIcon = (): void => {
    muteBtn.textContent = MUTE_ICONS[Sound.mode];
    muteBtn.style.color = Sound.mode === 'off' ? 'var(--danger)' : 'var(--glow)';
    muteBtn.title = Sound.mode === 'all' ? 'Sound: all on' : Sound.mode === 'nomusic' ? 'Sound: music off' : 'Sound: muted';
  };
  muteBtn.addEventListener('click', () => {
    Sound.cycle();
    applyMuteIcon();
  });
  applyMuteIcon();

  el('playBtn').addEventListener('click', () => startGame());
  el('retryBtn').addEventListener('click', () => startGame());
}
