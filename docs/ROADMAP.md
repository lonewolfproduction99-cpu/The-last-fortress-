# Roadmap, remaining work and known issues

## Phase status
- [x] **Phase 1**: Movement, joystick, auto-gathering, inventory, construction squares, tutorial prompts, pause/mute, DPR-sharp responsive canvas, Cloudflare deploy
- [x] **Phase 2**: Auto sword combat, 3 enemy types (Raider, Fast Raider, Raid Captain on every 5th wave), enemy AI with flow-field routing (prefers breaches, breaks gates/walls when that is shorter), structure health (walls, gate, keep), destruction into passable ruins with automatic repair squares, endless scaling waves with prep countdown, attack-direction warnings and an early-start bonus, gold rewards, hero death and 8 s respawn, regen out of combat, minimap, defeat screen with best wave, restart
- [ ] Phase 3: Complete rebuilding system (repairs of damaged-but-standing structures, archer towers, upgrades)
- [ ] Phase 4: Resource automation (workers)
- [ ] Phase 5: Troops and advanced progression (barracks, forge, iron, enemy archers, commanders)
- [ ] Phase 6: Full gameplay and polish (save/load, audio files, balance)
- [ ] Phase 7: CrazyGames publication prep

## Next up (Phase 3)
- Repair damaged (not destroyed) walls/gate with resources proportional to damage
- Archer positions and archer towers that actually shoot (pooled arrows)
- Building upgrades (gate/wall durability, keep levels unlocking content)
- Visual damage stages for walls and gate

## Known issues and limitations
- All art is placeholder. Real Tiny Swords sprites are pending the asset ZIP.
- The hero and enemies have no real animation frames, only bob, tilt, lunge and tool-swing tweens.
- Harvesting can trigger while walking past a node. This is intended, but revisit after tablet testing.
- The archer position is decorative until Phase 3 (no archers yet).
- Damaged-but-standing structures cannot be repaired yet. Only destroyed ones get a repair square.
- With the gate repaired, early waves often route through the still-open wall breaches instead of the gate. This is intended (repair the breaches), but watch whether it reads clearly to new players.
- Enemies can briefly overlap each other or the hero when crowded (soft separation only).
- No save/load of a run yet. Refreshing starts over. Mute setting and best wave persist.
- Balance is first-pass: raider damage 6, wave n = 2+n raiders, fast raiders from wave 3, +10% HP / +5% damage per wave.
