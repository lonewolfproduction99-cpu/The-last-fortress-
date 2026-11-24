// Data-driven building definitions. New buildings are added here; the
// construction system reads cost and texture data and needs no code changes.
//
// cost: materials delivered by the player (wood/stone/iron) plus a one-time gold charge.
// texture: placeholder texture key (see src/assets/AssetManifest.js).

export const BUILDINGS = {
  gate: {
    name: 'Castle Gate',
    verb: 'Repair',
    cost: { wood: 6, stone: 4, gold: 0 },
    texture: 'gate',
    ruinTexture: 'gate_ruin',
    maxHealth: 300,
    // The gate never blocks the hero or friendly units; it will block enemies (Phase 2).
    solidForPlayer: false,
  },
  wall: {
    name: 'Castle Wall',
    verb: 'Repair',
    cost: { wood: 8, stone: 10, gold: 0 },
    texture: 'wall',
    ruinTexture: 'wall_ruin',
    maxHealth: 250,
    solidForPlayer: true,
  },
  // Used for repair squares that appear when a wall section is destroyed.
  wallSection: {
    name: 'Wall Section',
    verb: 'Repair',
    cost: { wood: 4, stone: 5, gold: 0 },
  },
  archerPost: {
    name: 'Archer Position',
    verb: 'Build',
    cost: { wood: 12, stone: 10, gold: 15 },
    texture: 'archer_post',
    maxHealth: 150,
    solidForPlayer: true,
    body: { w: 40, h: 22, offsetY: 0 },
  },

  // Defined now so the data model is complete; placed on the map in later phases.
  lumberHut: { name: 'Lumberjack Hut', verb: 'Build', cost: { wood: 15, stone: 8, gold: 10 } },
  minerHut: { name: "Miner's Hut", verb: 'Build', cost: { wood: 15, stone: 12, gold: 10 } },
  barracks: { name: 'Barracks', verb: 'Build', cost: { wood: 20, stone: 20, gold: 40 } },
  archerTower: { name: 'Archer Tower', verb: 'Build', cost: { wood: 16, stone: 20, gold: 35 } },
  forge: { name: 'Forge', verb: 'Build', cost: { wood: 18, stone: 24, gold: 60 } },
};
