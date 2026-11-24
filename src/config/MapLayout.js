// Handcrafted map for the first version. All positions are world pixels.
// Wall blocks are 64x64 and laid on a ring around the Command Keep.

const BLOCK = 64;

export const CASTLE = {
  left: 1088,
  right: 2048,
  top: 640,
  bottom: 1472,
  get centerX() { return (this.left + this.right) / 2; },
  get centerY() { return (this.top + this.bottom) / 2; },
};

export const KEEP_POS = { x: 1568, y: 980 };
export const PLAYER_START = { x: 1568, y: 1150 };

// Gate occupies the three middle blocks of the south wall (block centres 1504/1568/1632).
export const GATE = { x: 1568, y: CASTLE.bottom - BLOCK / 2, blocks: [1504, 1568, 1632] };

// Wall blocks that start as rubble. Listed by block centre.
const RUINED = new Set([
  // North-east breach
  '1760,672', '1824,672',
  // East breach (first wall repair site)
  '2016,1056', '2016,1120',
  // West breach
  '1120,864',
]);

function buildWallRing() {
  const blocks = [];
  const yTop = CASTLE.top + BLOCK / 2;
  const yBot = CASTLE.bottom - BLOCK / 2;
  const xL = CASTLE.left + BLOCK / 2;
  const xR = CASTLE.right - BLOCK / 2;
  for (let x = xL; x <= xR; x += BLOCK) {
    blocks.push({ x, y: yTop });
    if (!GATE.blocks.includes(x)) blocks.push({ x, y: yBot });
  }
  for (let y = yTop + BLOCK; y < yBot; y += BLOCK) {
    blocks.push({ x: xL, y });
    blocks.push({ x: xR, y });
  }
  return blocks.map((b) => ({ ...b, ruined: RUINED.has(`${b.x},${b.y}`) }));
}

export const WALL_BLOCKS = buildWallRing();

// Construction squares. `building` refers to src/config/Buildings.js.
// `blocks` lists the ruined wall blocks a wall repair restores.
// `safeSpot` is where the hero is moved if the finished structure would overlap them.
export const CONSTRUCTION_SITES = [
  {
    id: 'gate_main',
    building: 'gate',
    x: GATE.x, y: GATE.y, w: 208, h: 112,
    tutorial: true,
  },
  {
    id: 'wall_east',
    building: 'wall',
    x: 2016, y: 1088, w: 112, h: 160,
    blocks: ['2016,1056', '2016,1120'],
    safeSpot: { x: 1930, y: 1088 },
    requires: 'gate_main',
  },
  {
    id: 'archer_post_sw',
    building: 'archerPost',
    x: 1376, y: 1336, w: 96, h: 96,
    safeSpot: { x: 1376, y: 1260 },
    requires: 'gate_main',
  },
];

// Resource nodes. `tutorial` nodes are highlighted for new players.
export const TREES = [
  { x: 1400, y: 1620, tutorial: true },
  // West forest
  { x: 620, y: 700 }, { x: 760, y: 640 }, { x: 540, y: 860 }, { x: 700, y: 900 },
  { x: 860, y: 800 }, { x: 600, y: 1080 }, { x: 780, y: 1140 }, { x: 520, y: 1300 },
  { x: 700, y: 1380 }, { x: 880, y: 1300 },
  // North forest
  { x: 1300, y: 360 }, { x: 1460, y: 300 }, { x: 1620, y: 380 }, { x: 1780, y: 300 },
  // South-west grove
  { x: 1180, y: 1720 }, { x: 1020, y: 1640 },
];

export const ROCKS = [
  { x: 1740, y: 1640, tutorial: true },
  // East quarry
  { x: 2360, y: 960 }, { x: 2480, y: 1080 }, { x: 2340, y: 1200 }, { x: 2560, y: 900 },
  { x: 2600, y: 1240 },
  // South quarry
  { x: 1960, y: 1760 }, { x: 2120, y: 1700 },
];

// Enemy entry points, used from Phase 2.
export const SPAWN_POINTS = [
  { id: 'south', x: 1568, y: 2000 },
  { id: 'west', x: 60, y: 1056 },
  { id: 'east', x: 3010, y: 1056 },
  { id: 'north', x: 1568, y: 60 },
];

// Decorative dirt paths (rectangles) drawn under everything.
export const PATHS = [
  { x: 1504, y: 1440, w: 128, h: 608 }, // south road out of the gate
  { x: 1152, y: 1100, w: 832, h: 96 }, // inner courtyard road
  { x: 1504, y: 1060, w: 128, h: 380 },
];
