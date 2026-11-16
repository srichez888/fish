export interface Palette {
  body: string;
  belly: string;
}

export type GameState = 'menu' | 'play' | 'dead';
export type FishMode = 'wander' | 'flee' | 'chase' | 'feed';
export type FishKind = 'normal' | 'puffer';
export type PickupKind = 'shield' | 'magnet' | 'overdrive';
export type SkinMode = 'palette' | 'custom';

export interface School {
  x: number;
  y: number;
  angle: number;
  desired: number;
  wanderT: number;
  members: Fish[];
}

export interface Food {
  x: number;
  y: number;
  vy: number;
  life: number;
  phase: number;
  dead: boolean;
}

export interface Fish {
  isPlayer: boolean;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  mass: number;
  radius: number;
  palette: Palette;
  squash: number;
  stripes: number;
  phase: number;
  mouthOpen: number;
  turn: number;
  speedMult: number;
  aggression: number;
  decisionT: number;
  wanderT: number;
  desired: number;
  mode: FishMode;
  target: Fish | null;
  foodTarget: Food | null;
  speedNorm: number;
  alive: boolean;
  kind: FishKind;
  inflated: number;
  hitT: number;
  school: School | null;
  orbitA: number;
  orbitR: number;
  customTex: CanvasImageSource | null;
  /* player only */
  shield: number;
  slowT: number;
  stingT: number;
  targetAngle: number;
}

export interface Pellet {
  x: number;
  y: number;
  phase: number;
  hue: number;
}

export interface Jelly {
  x: number;
  y: number;
  dir: number;
  speed: number;
  r: number;
  phase: number;
  stingT: number;
}

export interface Pickup {
  x: number;
  y: number;
  kind: PickupKind;
  phase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  r: number;
}

export interface Popup {
  x: number;
  y: number;
  txt: string;
  color: string;
  life: number;
}

export interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  wob: number;
  life: number;
}

export interface RockDecor {
  t: 'rock';
  x: number;
  y: number;
  s: number;
  seed: number;
  tint: number;
}

export interface CoralDecor {
  t: 'coral';
  x: number;
  y: number;
  s: number;
  seed: number;
  col: string;
}

export interface WoodDecor {
  t: 'wood';
  x: number;
  y: number;
  s: number;
  seed: number;
  flip: boolean;
}

export interface WreckDecor {
  t: 'wreck';
  x: number;
  y: number;
  s: number;
  seed: number;
  flip: boolean;
}

export type Decor = RockDecor | CoralDecor | WoodDecor | WreckDecor;

export interface KelpStrand {
  dx: number;
  len: number;
  phase: number;
  lean: number;
  front: boolean;
  w: number;
  hue: number;
}

export interface Kelp {
  x: number;
  y: number;
  r: number;
  strands: KelpStrand[];
}
