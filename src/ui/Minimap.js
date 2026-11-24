// Small overview map: castle walls, keep, hero, enemies and repair squares.
// Redrawn a few times per second, not every frame.
import { WORLD } from '../config/GameConfig.js';
import { SPAWN_POINTS } from '../config/MapLayout.js';

const REDRAW = 0.12;

export class Minimap {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics();
    this.timer = 0;
    this.rect = { x: 0, y: 0, w: 100, h: 66 };
    this.warnDirs = [];
  }

  layout(x, y, w, s) {
    this.rect = { x, y, w, h: w * (WORLD.height / WORLD.width) };
    this.s = s;
    this.timer = 0;
  }

  update(dt, gs) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = REDRAW;
    this.draw(gs);
  }

  draw(gs) {
    const g = this.g;
    const { x, y, w, h } = this.rect;
    const k = w / WORLD.width;
    const s = this.s || 1;
    const px = (wx) => x + wx * k;
    const py = (wy) => y + wy * k;
    g.clear();
    g.fillStyle(0x2f5a2a, 0.85).fillRoundedRect(x, y, w, h, 6 * s);
    g.lineStyle(Math.max(2, 2 * s), 0x6b5233, 1).strokeRoundedRect(x, y, w, h, 6 * s);

    // Upcoming / active attack directions.
    const t = gs.time.now / 1000;
    const pulse = 0.45 + 0.35 * Math.sin(t * 6);
    const dirs = gs.waves.state === 'active' ? gs.waves.current.directions : gs.waves.upcoming.directions;
    for (const id of dirs) {
      const sp = SPAWN_POINTS.find((p) => p.id === id);
      const r = 6 * s;
      const cx = Math.min(Math.max(px(sp.x), x + r + 2), x + w - r - 2);
      const cy = Math.min(Math.max(py(sp.y), y + r + 2), y + h - r - 2);
      g.fillStyle(0xff4a3a, pulse).fillCircle(cx, cy, r);
    }

    // Walls and gate.
    for (const st of gs.structures) {
      if (st.kind === 'keep') continue;
      g.fillStyle(st.alive ? 0xc9ced6 : 0xff6b5b, 1);
      g.fillRect(px(st.rect.x), py(st.rect.y), Math.max(1, st.rect.width * k), Math.max(1, st.rect.height * k));
    }
    // Keep.
    const kr = gs.keep.rect;
    g.fillStyle(0x5b8fe0, 1).fillRect(px(kr.x), py(kr.y - 60), kr.width * k, (kr.height + 60) * k);

    // Open construction squares.
    for (const site of gs.sites) {
      if (site.status !== 'open') continue;
      g.lineStyle(1, 0xffffff, 0.9).strokeRect(px(site.rect.x), py(site.rect.y), site.rect.width * k, site.rect.height * k);
    }

    // Enemies.
    g.fillStyle(0xff3b30, 1);
    for (const e of gs.enemies.active) {
      if (!e.dying) g.fillRect(px(e.x) - 1.5 * s, py(e.y) - 1.5 * s, 3 * s, 3 * s);
    }

    // Hero.
    const p = gs.player;
    g.fillStyle(p.alive ? 0x7fd0ff : 0x777777, 1).fillCircle(px(p.x), py(p.y), 3 * s);
    g.lineStyle(1, 0x1d1d26, 1).strokeCircle(px(p.x), py(p.y), 3 * s);

    // Camera view.
    const v = gs.cameras.main.worldView;
    g.lineStyle(1, 0xffffff, 0.5).strokeRect(px(v.x), py(v.y), v.width * k, v.height * k);
  }

  destroy() {
    this.g.destroy();
  }
}
