import type { Palette, PickupKind } from './types';

export const WORLD = 4200;
export const TARGET_FISH = 60;
export const TARGET_PELLETS = 210;
export const TARGET_PICKUPS = 8;
export const TARGET_JELLIES = 10;
export const SCHOOL_COUNT = 6;
export const EAT_RATIO = 1.2;           // need ~20% bigger to eat
export const START_MASS = 10;

export interface Tier {
  max: number;
  name: string;
}

export const TIERS: Tier[] = [
  { max: 15, name: 'Sardine' },
  { max: 30, name: 'Small Fry' },
  { max: 60, name: 'Mackerel' },
  { max: 110, name: 'Tuna' },
  { max: 200, name: 'Shark' },
  { max: 1e9, name: 'Megalodon' },
];

const NAME_A = ['Captain', 'Baron', 'Doc', 'Old', 'Glutton', 'Ghost', 'Torpedo', 'Flint', 'Neon', 'Swift', 'Trident', 'Marshal', 'Hook', 'Bulwark'];
const NAME_B = ['Derby', 'Brute', 'Turbo', 'Shipbreaker', 'of the Depths', 'the Terrible', 'the Silent', 'the Moonlit', 'Rusty', 'Cobalt', 'Bloodnose', 'Gulper'];

export const PALETTES: Palette[] = [
  { body: '#ff8a5c', belly: '#ffd9a8' },  // clownfish
  { body: '#5cc9ff', belly: '#d2f1ff' },
  { body: '#ffd166', belly: '#fff3cd' },
  { body: '#9b8cff', belly: '#e0daff' },
  { body: '#5ce8b5', belly: '#d8fff0' },
  { body: '#ff7aa2', belly: '#ffdce9' },  // pink fish
  { body: '#c2f970', belly: '#eeffd6' },  // green perch
  { body: '#f4f4f4', belly: '#ffffff' },  // white marlin
];

export interface DiffSettings {
  pred: number;
  aggr: number;
}

export const DIFF: Record<string, DiffSettings> = {
  peaceful: { pred: 0.5, aggr: 0.7 },
  normal: { pred: 1, aggr: 1 },
  savage: { pred: 1.8, aggr: 1.35 },
};

export { NAME_A, NAME_B };

const SKIN_STRIPES = [2, 0, 3, 1, 2, 0, 1, 3];
export interface Skin {
  palette: Palette;
  stripes: number;
}
export const SKINS: Skin[] = PALETTES.map((p, i) => ({ palette: p, stripes: SKIN_STRIPES[i] }));

export const PICKUP_INFO: Record<PickupKind, { label: string; color: string }> = {
  shield: { label: 'SHIELD', color: '#3ef2d0' },
  magnet: { label: 'MAGNET', color: '#9b8cff' },
  overdrive: { label: 'OVERDRIVE', color: '#ffd166' },
};

/* ---------- aquarium additions ---------- */
export const FOOD_CD = 7;          // delay between two drops (s)
export const FOOD_LURE = 520;      // flake attraction radius
export const FOOD_MAX = 42;
export const DECOR_COUNTS = { rocks: 70, corals: 42, wood: 16, wrecks: 3 };
export const KELP_COUNT = 22;
export const CORAL_COLORS = ['#ff7aa2', '#ff8a5c', '#c26bd4', '#ffd166', '#5ce8b5'];
export const CUSTOM_PAL: Palette = { body: '#3ec9ad', belly: '#eafff8' };
