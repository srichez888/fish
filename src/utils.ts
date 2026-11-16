import { START_MASS, TIERS, NAME_A, NAME_B } from './config';

export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number): number => v < a ? a : v > b ? b : v;
export const dist2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
export const lerpAngle = (a: number, b: number, t: number): number => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export function massToRadius(m: number): number {
  return 14 * Math.pow(m / START_MASS, 0.42);
}

export function speedOf(m: number): number {
  return 168 * Math.pow(START_MASS / m, 0.10);
}

export function tierOf(m: number): string {
  for (const t of TIERS) if (m < t.max) return t.name;
  return 'Megalodon';
}

export function tierIndex(m: number): number {
  for (let i = 0; i < TIERS.length; i++) if (m < TIERS[i].max) return i;
  return TIERS.length - 1;
}

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp((n >> 8 & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

export function fishName(): string {
  return NAME_A[Math.floor(Math.random() * NAME_A.length)] + ' ' + NAME_B[Math.floor(Math.random() * NAME_B.length)];
}

/* state arrays are const: filter in place instead of reassigning */
export function filterInPlace<T>(arr: T[], keep: (v: T) => boolean): void {
  let w = 0;
  for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[w++] = arr[i];
  arr.length = w;
}
