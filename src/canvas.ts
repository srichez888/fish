export const canvas = document.getElementById('game') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d')!;
export const mini = document.getElementById('minimap') as HTMLCanvasElement;
export const mctx = mini.getContext('2d')!;

export let W = 0;
export let H = 0;
export let DPR = 1;

function resize(): void {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
}
window.addEventListener('resize', resize);
resize();
