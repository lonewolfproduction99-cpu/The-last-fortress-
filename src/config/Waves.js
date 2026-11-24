// Wave timing and composition. composeWave(n) is deterministic per wave number,
// so the warning shown during preparation matches the wave that arrives.

export const WAVE_TIMING = {
  firstWaveFallback: 150, // seconds before wave 1 starts even if the gate is not repaired
  afterGateRepair: 25, // countdown to wave 1 once the gate is repaired
  prepTime: 45, // seconds between waves
  spawnInterval: 0.8, // seconds between individual spawns
  earlyStartGoldPerSeconds: 4, // bonus: 1 gold per N seconds skipped
};

export const DIRECTION_LABELS = { south: 'the South', west: 'the West', east: 'the East', north: 'the North' };

function rng(seed) {
  let s = (seed * 9973 + 17) % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function unlockedDirections(n) {
  if (n < 4) return ['south'];
  if (n < 7) return ['south', 'west'];
  if (n < 10) return ['south', 'west', 'east'];
  return ['south', 'west', 'east', 'north'];
}

export function composeWave(n) {
  const r = rng(n);
  const milestone = n % 5 === 0;
  const dirs = unlockedDirections(n);
  // A newly unlocked direction is always used the first time it appears.
  const newest = dirs[dirs.length - 1];
  const prev = unlockedDirections(n - 1);
  const groupCount = Math.min(dirs.length, (n >= 8 ? 2 : 1) + (milestone ? 1 : 0));
  const chosen = [];
  if (!prev.includes(newest)) chosen.push(newest);
  while (chosen.length < groupCount) {
    const d = dirs[Math.floor(r() * dirs.length)];
    if (!chosen.includes(d)) chosen.push(d);
  }

  const units = [];
  const raiders = 2 + n;
  const fast = n >= 3 ? Math.floor((n - 1) / 2) : 0;
  const captains = milestone ? n / 5 : 0;
  for (let i = 0; i < raiders; i++) units.push('raider');
  for (let i = 0; i < fast; i++) units.push('fastRaider');
  for (let i = 0; i < captains; i++) units.push('captain');
  const capped = units.slice(0, 30);

  // Assign units to directions round-robin, captains last so they lead the final push.
  const spawns = capped.map((type, i) => ({ type, dir: chosen[i % chosen.length] }));

  return {
    number: n,
    milestone,
    title: milestone ? "Captain's Assault" : `Wave ${n}`,
    directions: chosen,
    spawns,
    healthMul: 1 + 0.1 * (n - 1),
    damageMul: 1 + 0.05 * (n - 1),
    clearBonus: 8 + 3 * n,
  };
}
