// Data-driven enemy definitions. Stats are scaled per wave by Waves.js.
// texture: placeholder key (see AssetManifest). radius: used for reach checks.

export const ENEMIES = {
  raider: {
    name: 'Raider',
    texture: 'raider',
    health: 30,
    speed: 70,
    damage: 6,
    attackInterval: 1.1,
    reach: 26,
    radius: 10,
    gold: 3,
    scale: 1,
  },
  fastRaider: {
    name: 'Fast Raider',
    texture: 'fast_raider',
    health: 18,
    speed: 115,
    damage: 5,
    attackInterval: 0.8,
    reach: 24,
    radius: 9,
    gold: 3,
    scale: 0.9,
  },
  captain: {
    name: 'Raid Captain',
    texture: 'captain',
    health: 150,
    speed: 55,
    damage: 18,
    attackInterval: 1.4,
    reach: 30,
    radius: 14,
    gold: 15,
    scale: 1,
  },
};

export const ENEMY_AI = {
  aggroRadius: 120, // enemies switch to the hero when this close
  thinkInterval: 0.2, // seconds between target re-evaluations
  stuckWindow: 1.0, // seconds used to detect being stuck
  stuckDistance: 8, // world px moved within the window to count as stuck
  separation: 18, // min distance between enemies
  maxActive: 40,
};
