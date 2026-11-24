// Central tuning values. Everything here is a starting point for balancing,
// kept in one place so it can be adjusted without touching gameplay code.

export const TILE = 64;

export const WORLD = {
  width: 3072,
  height: 2048,
};

// How much of the world the camera should show, in world pixels.
// Zoom is derived from the real screen size so every device sees roughly the same area.
export const VIEW = {
  targetVisibleHeight: 640,
  minVisibleWidth: 960,
  cameraLerp: 0.12,
};

export const PLAYER = {
  maxHealth: 100,
  speed: 180, // world px / second
  bodyWidth: 26,
  bodyHeight: 18,
  carryCapacity: 20,
  swordDamage: 12,
  attackInterval: 0.7,
  respawnSeconds: 8,
};

export const HARVEST = {
  reach: 38, // extra distance beyond a node's own radius
  swingInterval: 0.55, // seconds between harvesting strikes
  impactDelay: 0.16, // seconds into the swing when the resource is awarded
  treeAmount: 6,
  rockAmount: 8,
  treeRegrowSeconds: 35,
  rockRegrowSeconds: 45,
};

export const CONSTRUCTION = {
  depositInterval: 0.08, // seconds between single-unit deposits while standing in a square
  buildSeconds: 1.4, // length of the construction animation
};

export const ECONOMY = {
  startingGold: 20,
};

export const KEEP = {
  maxHealth: 500,
};

export const RESOURCE_TYPES = ['wood', 'stone', 'iron'];

export const RESOURCE_LABELS = {
  wood: 'Wood',
  stone: 'Stone',
  iron: 'Iron',
  gold: 'Gold',
};

export const COLORS = {
  wood: 0xc8874a,
  stone: 0xb8c0c8,
  iron: 0x8fb4d9,
  gold: 0xf5c542,
  ok: 0x7bd88f,
  warn: 0xff6b5b,
  text: '#fff8e7',
  textDim: '#d9cfb5',
  panel: 0x2a2218,
  panelEdge: 0x6b5233,
};
