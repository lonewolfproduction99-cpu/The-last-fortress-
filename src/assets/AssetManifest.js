// Single source of truth for every texture key used by the game.
//
// PHASE 1 STATUS: every entry below is a TEMPORARY PLACEHOLDER drawn in code by
// src/assets/PlaceholderTextures.js. No external art is loaded yet.
//
// When the Tiny Swords (Free Pack) ZIP is provided, each placeholder will be
// replaced by an entry pointing at a real file *after* inspecting the actual
// file names and frame sizes. Paths and frame sizes must not be guessed, so the
// `file` fields are intentionally left null until then.
//
// Gameplay code only ever uses the logical keys (e.g. 'tree'), never file paths.

export const TEXTURES = {
  grass: { placeholder: true, file: null },
  dirt: { placeholder: true, file: null },
  hero: { placeholder: true, file: null },
  raider: { placeholder: true, file: null },
  fast_raider: { placeholder: true, file: null },
  captain: { placeholder: true, file: null },
  tool_sword: { placeholder: true, file: null },
  tool_axe: { placeholder: true, file: null },
  tool_pick: { placeholder: true, file: null },
  tree: { placeholder: true, file: null },
  stump: { placeholder: true, file: null },
  rock: { placeholder: true, file: null },
  rubble: { placeholder: true, file: null },
  wall: { placeholder: true, file: null },
  wall_ruin: { placeholder: true, file: null },
  gate: { placeholder: true, file: null },
  gate_ruin: { placeholder: true, file: null },
  keep: { placeholder: true, file: null },
  archer_post: { placeholder: true, file: null },
  scaffold: { placeholder: true, file: null },
  icon_wood: { placeholder: true, file: null },
  icon_stone: { placeholder: true, file: null },
  icon_iron: { placeholder: true, file: null },
  icon_gold: { placeholder: true, file: null },
  particle: { placeholder: true, file: null },
  shadow: { placeholder: true, file: null },
};

export const ICON_FOR = {
  wood: 'icon_wood',
  stone: 'icon_stone',
  iron: 'icon_iron',
  gold: 'icon_gold',
};
