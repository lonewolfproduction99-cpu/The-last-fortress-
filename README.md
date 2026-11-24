# Siegebound: Rebuild the Keep

A 2D medieval castle-rebuilding and siege-defense game for the browser (desktop + mobile landscape), built with **Phaser 3 + Vite**, targeting **CrazyGames**.

**Current state: Phase 1 prototype.** Move, gather wood and stone automatically, carry them in a 20-slot bag, and deliver them to white construction squares to repair the gate, repair a wall breach and build an archer position. All art is **temporary placeholder art drawn in code**. It will be replaced with Tiny Swords (Free Pack) once the asset ZIP is provided.

## Run locally

Requires Node.js 20+ (22 recommended).

```bash
npm install
npm run dev        # dev server on http://localhost:5173 (also reachable from your LAN with --host)
npm run build      # production build into dist/
npm run preview    # serve the production build on http://localhost:4173
```

To test on a tablet on the same Wi-Fi: run `npm run dev` and open the `Network:` URL Vite prints.

## Controls

| | Desktop | Touch |
|---|---|---|
| Move | WASD / arrow keys | Drag anywhere on the left half of the screen (floating joystick) |
| Gather | Automatic: stand next to a tree or rock | Same |
| Build | Walk into a white square while carrying materials | Same |
| Pause | Esc or P, or the ❚❚ button | ❚❚ button |
| Mute | M, or in the pause menu | Pause menu |

## Deploy to Cloudflare (automatic on every push)

The game is deployed as a **Cloudflare Worker with static assets**, connected to this GitHub repo (Workers Builds):

- Worker name: `the-last-fortress` (must match `name` in `wrangler.toml`)
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy` (uploads `dist/` as set in `wrangler.toml`)

Every push to the connected branch rebuilds and publishes. The live URL is shown in the Cloudflare dashboard (Workers & Pages → the-last-fortress), typically `https://the-last-fortress.<your-subdomain>.workers.dev`. Open it in your Android browser; nothing needs to be installed.

The build version (e.g. `v0.1.0-a1b2c3d · disabled`) is shown in the bottom-right corner. The commit comes from Cloudflare's `WORKERS_CI_COMMIT_SHA` or from `git`. The second word is the CrazyGames SDK environment: `disabled` on Cloudflare (expected), `local` on localhost, `crazygames` on CrazyGames. Add `?useLocalSdk=true` to a URL to force the SDK's local test mode.

To deploy manually from a computer: `npm run build && npx wrangler deploy`.

## Project structure

```
index.html                 Page shell, CSS that blocks touch gestures, CrazyGames SDK script
vite.config.js             Relative base path, build version injection
public/_headers            Cloudflare cache headers
src/
  main.js                  Phaser game config, gesture blocking, startup
  config/
    GameConfig.js          All tuning numbers (speeds, capacities, timings)
    Buildings.js           Data-driven building definitions and costs
    MapLayout.js           Handcrafted map: walls, keep, gate, nodes, construction squares
  assets/
    AssetManifest.js       Central list of texture keys (placeholders now)
    PlaceholderTextures.js Temporary code-drawn art
  entities/
    Player.js              Hero movement, facing, tool swings
    ResourceNode.js        Trees and rocks: strikes, depletion, regrowth
    ConstructionSite.js    White squares: deposits, gold charge, build animation
  systems/
    Inventory.js Economy.js HarvestSystem.js Effects.js Tutorial.js Settings.js SoundFX.js
  input/
    InputState.js          Keyboard + joystick merged into one movement vector
    VirtualJoystick.js     Floating touch joystick
  platform/
    Platform.js            Guarded CrazyGames SDK v3 wrapper
    Storage.js             CrazyGames Data module or localStorage fallback
    Display.js             DPR-aware sizing and resize handling
  scenes/
    BootScene.js GameScene.js UIScene.js
  ui/SafeArea.js           Mobile safe-area insets
docs/
  COMPLIANCE.md            CrazyGames requirement checklist
  ASSETS.md                Asset sources and licences
  ROADMAP.md               Phase plan, remaining work, known bugs
```
