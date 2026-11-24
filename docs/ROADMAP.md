# Roadmap, remaining work and known issues

## Phase status
- [x] **Phase 1**: Movement, joystick, auto-gathering, inventory, construction squares (gate, wall repair, archer position), tutorial prompts, pause/mute, DPR-sharp responsive canvas, Cloudflare Pages-ready build
- [ ] Phase 2: Combat and siege prototype
- [ ] Phase 3: Complete rebuilding system
- [ ] Phase 4: Resource automation (workers)
- [ ] Phase 5: Troops and advanced progression
- [ ] Phase 6: Full gameplay and polish (save/load, audio files, balance)
- [ ] Phase 7: CrazyGames publication prep

## Next up (Phase 2)
- Enemy entity (raider) with walk/attack, spawning from `SPAWN_POINTS`
- Hero auto-attack (sword swing already exists as a tool swing; add targeting and damage)
- Gate and wall health; the gate blocks enemies but never the hero
- Grid pathfinding (flow field from the keep, rebuilt when walls change)
- Wave timer, early start, gold rewards, hero death/respawn, defeat and restart
- Minimap or edge warnings for attack directions

## Known issues and limitations
- All art is placeholder. Real Tiny Swords sprites are pending the asset ZIP.
- The hero has no real animation frames, only bob, tilt and tool-swing tweens.
- Harvesting can trigger while walking past a node. This is intended, but revisit after tablet testing.
- Built structures do not have health yet (Phase 2/3).
- No save/load yet. Refreshing the page starts over. Only the mute setting persists.
- The keep HP bar is static until enemies exist.
