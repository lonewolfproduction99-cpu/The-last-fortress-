# Asset sources and licences

## Current build (Phase 1)

| Asset | Source | Licence |
|---|---|---|
| All textures (hero, trees, rocks, walls, gate, keep, archer post, icons, particles) | Drawn procedurally in `src/assets/PlaceholderTextures.js` for this project | Original, project-owned. **Temporary placeholders.** |
| Sound effects | Synthesised at runtime with Web Audio (`src/systems/SoundFX.js`) | Original, project-owned |
| Font | System fonts (Trebuchet MS / Verdana / sans-serif) | No font files bundled |
| Engine | Phaser 3 (phaser.io) | MIT |

## Planned

**Tiny Swords (Free Pack)** by Pixel Frog: https://pixelfrog-assets.itch.io/tiny-swords

- Only the free pack will be used, not the paid Enemy Pack or the Warfare expansion.
- Before integration: read the licence text included in the ZIP and record it here verbatim (commercial-use terms, redistribution restriction, credit wording).
- File paths and frame sizes will be taken from the actual files, never guessed. They will be recorded in `src/assets/AssetManifest.js`.
- Credit (even if optional): "Art: Tiny Swords by Pixel Frog".
- Recolours and edits are kept inside the game build only. They are never published as a standalone asset pack.

Sound files (Phase 6) will be listed here with source URL, author and licence before they are added.
