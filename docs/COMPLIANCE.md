# CrazyGames compliance checklist

Status key: ✅ done and tested here · 🟡 implemented, not yet verified on CrazyGames / real devices · ⬜ not started.
Nothing here is claimed as "CrazyGames compliant" until it has been tested through the CrazyGames Developer Portal QA tool.

Sources checked (Nov 2026): docs.crazygames.com `/sdk/intro`, `/sdk/game`, `/sdk/data`, `/requirements/technical`.
Still to read in detail: `/requirements/gameplay`, `/requirements/ads`, `/requirements/game-covers`, `/resources/html5/sitelock/`, `/resources/crazygames-app/` (safe-area padding), `/sdk/user` (system info).

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Initial download ≤ 20 MB (mobile homepage), ≤ 50 MB overall | ✅ | Build is about 1.5 MB (about 360 KB gzipped). Mostly Phaser. |
| 2 | Total ≤ 250 MB, ≤ 1500 files | ✅ | 3 files |
| 3 | Relative paths only | ✅ | Vite `base: './'` |
| 4 | Responsive layout, any iframe size, landscape | 🟡 | Tested at 1280×720, 844×390 @3x and 1340×800 @1.5x in headless Chromium. Needs real-device check. |
| 5 | Gameplay within one click | ✅ | Boots directly into the world, no menu |
| 6 | No custom fullscreen button | ✅ | None |
| 7 | Working mute | ✅ | Pause menu and the M key. Saved setting. |
| 8 | Platform `muteAudio` overrides the in-game toggle | 🟡 | Read via `SDK.game.settings.muteAudio` and the settings listener |
| 9 | Frame-rate independent | 🟡 | Delta-time movement, variable-step physics, dt-based camera smoothing. Needs a test on a 120 Hz device. |
| 10 | Pause / resume / focus loss | 🟡 | Esc/P/button pause. Auto-pauses on blur/hidden. Audio is suspended and resumes on the next tap (iOS rule). |
| 11 | SDK safe with standalone fallback | ✅ | All calls guarded. Works with SDK missing or `disabled`. |
| 12 | `gameplayStart` / `gameplayStop` | 🟡 | Start after boot and on resume. Stop on manual pause. Not called on focus loss (per docs). |
| 13 | `loadingStart` / `loadingStop` | 🟡 | Called around Boot. Becomes meaningful once real assets load. |
| 14 | Data module saves | ⬜ | Storage wrapper is ready (settings only). Full run save comes in Phase 6. |
| 15 | No third-party ads, works with ads unavailable | ✅ | No ad code at all yet |
| 16 | Ad rules (Full Launch) | ⬜ | Phase 7 |
| 17 | No external accounts, store links or promotion | ✅ | |
| 18 | PEGI 12 content | ✅ | Cartoon medieval combat only |
| 19 | `user-select: none` on body for mobile | ✅ | Plus `touch-action: none`, overscroll and long-press blocked |
| 20 | Works in Chrome and Edge, reasonable on Safari | 🟡 | Chromium tested. Safari untested. |
| 21 | Do not detect mobile via touch APIs | ✅ | The joystick hint appears only after a real touch. No device sniffing. |
| 22 | Sitelock | ⬜ | Review `/resources/html5/sitelock/` before submission |
| 23 | Covers 1920×1080, 800×1200, 800×800, preview video | ⬜ | Phase 7 |
