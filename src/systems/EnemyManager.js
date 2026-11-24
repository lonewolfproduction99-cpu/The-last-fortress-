// Owns the enemy pool, spawning and the per-frame update of all enemies.
import Phaser from 'phaser';
import { ENEMIES, ENEMY_AI } from '../config/Enemies.js';
import { Enemy } from '../entities/Enemy.js';

export class EnemyManager {
  constructor(scene, { field, structures, keep, solids, enemyBlockers }) {
    this.scene = scene;
    this.field = field;
    this.structures = structures;
    this.keep = keep;
    this.group = scene.physics.add.group();
    scene.physics.add.collider(this.group, solids);
    scene.physics.add.collider(this.group, enemyBlockers);
    this.pool = [];
    this.active = [];
    this.kills = 0;

    // Shared context handed to every enemy (avoids per-frame allocations).
    this.ctx = {
      field,
      keep,
      hero: null,
      damageHero: () => {},
      damageStructure: (s, amount) => s.damage(amount),
      nearestStructure: (x, y, maxD) => this.nearestStructure(x, y, maxD),
    };
  }

  get count() {
    return this.active.length;
  }

  spawn(typeKey, x, y, wave) {
    if (this.active.length >= ENEMY_AI.maxActive) return null;
    const def = ENEMIES[typeKey];
    let e = this.pool.pop();
    if (!e) e = new Enemy(this.scene, this.group);
    e.spawn(typeKey, def, x, y, wave);
    this.active.push(e);
    return e;
  }

  nearestStructure(x, y, maxD) {
    let best = null;
    let bestD = maxD;
    for (const s of this.structures) {
      if (!s.alive) continue;
      const d = s.distanceFrom(x, y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  /** Nearest living enemy to a point, with distance flattened vertically. */
  nearest(x, y, maxD = Infinity) {
    let best = null;
    let bestD = maxD;
    for (const e of this.active) {
      if (e.dying) continue;
      const d = Math.hypot(e.x - x, (e.y - y) * 1.3) - e.def.radius;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    this.lastNearestDistance = best ? bestD : Infinity;
    return best;
  }

  update(dt) {
    this.field.rebuildIfDirty();
    const list = this.active;
    for (const e of list) e.update(dt, this.ctx);

    // Soft separation so groups spread out instead of stacking.
    const sep = ENEMY_AI.separation;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dying) continue;
      let sx = 0;
      let sy = 0;
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const b = list[j];
        if (b.dying) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < sep * sep) {
          const d = Math.sqrt(d2);
          const push = (sep - d) / sep;
          sx += (dx / d) * push * 60;
          sy += (dy / d) * push * 60;
        }
      }
      a.applyVelocity(sx, sy);
    }

    // Return finished enemies to the pool.
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].active) {
        this.pool.push(list[i]);
        list.splice(i, 1);
      }
    }
  }

  syncVisuals() {
    for (const e of this.active) if (!e.dying) e.sync();
  }

  /** Called when an enemy is killed by the hero or defenders. */
  onKilled(enemy) {
    this.kills += 1;
    this.scene.events.emit('enemy-killed', enemy);
  }

  /** Random walkable point near a spawn location. */
  spawnPoint(base) {
    for (let tries = 0; tries < 12; tries++) {
      const x = Phaser.Math.Clamp(base.x + Phaser.Math.Between(-80, 80), 20, this.scene.physics.world.bounds.width - 20);
      const y = Phaser.Math.Clamp(base.y + Phaser.Math.Between(-60, 60), 20, this.scene.physics.world.bounds.height - 20);
      const c = this.field.cellAt(x, y);
      if (!this.field.blocked[c]) return { x, y };
    }
    return { x: base.x, y: base.y };
  }
}
