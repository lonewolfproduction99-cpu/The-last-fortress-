// An attacking soldier. Reused through a pool (see EnemyManager).
// Decision making runs a few times per second; movement runs every frame.
import Phaser from 'phaser';
import { ENEMY_AI } from '../config/Enemies.js';

const BODY_W = 20;
const BODY_H = 16;
const WINDUP = 0.22; // seconds between starting a swing and the hit landing

export class Enemy {
  constructor(scene, group) {
    this.scene = scene;
    this.active = false;
    this.zone = scene.add.zone(-100, -100, BODY_W, BODY_H);
    scene.physics.add.existing(this.zone);
    group.add(this.zone);
    this.body = this.zone.body;
    this.body.setCollideWorldBounds(true);
    this.body.enable = false;
    this.shadow = scene.add.image(0, 0, 'shadow').setOrigin(0.5, 0.6).setVisible(false);
    this.sprite = scene.add.image(0, 0, 'raider').setOrigin(0.5, 1).setVisible(false);
    this.tmp = { x: 0, y: 0 };
  }

  get x() {
    return this.zone.x;
  }

  get y() {
    return this.zone.y + BODY_H / 2;
  }

  spawn(typeKey, def, x, y, wave) {
    this.type = typeKey;
    this.def = def;
    this.maxHp = Math.round(def.health * wave.healthMul);
    this.hp = this.maxHp;
    this.damage = Math.round(def.damage * wave.damageMul);
    this.speed = def.speed * Phaser.Math.FloatBetween(0.92, 1.08);
    this.active = true;
    this.dying = false;
    this.facing = 1;
    this.target = null; // { kind: 'hero' | 'structure', ref }
    this.cooldown = Phaser.Math.FloatBetween(0, 0.4);
    this.windup = -1;
    this.think = 0;
    this.walk = Math.random() * 10;
    this.stuckTimer = 0;
    this.stuckX = x;
    this.stuckY = y;
    this.nudge = 0;
    this.nudgeX = 0;
    this.nudgeY = 0;
    this.vx = 0;
    this.vy = 0;
    this.body.enable = true;
    this.body.reset(x, y - BODY_H / 2);
    this.sprite.setTexture(def.texture).setVisible(true).setAlpha(1).setAngle(0).setScale(def.scale).clearTint();
    this.shadow.setVisible(true).setAlpha(1);
    this.sync();
  }

  /** Called by EnemyManager each frame with shared world context. */
  update(dt, ctx) {
    if (!this.active || this.dying) return;
    this.cooldown -= dt;
    this.think -= dt;
    if (this.think <= 0) {
      this.think = ENEMY_AI.thinkInterval * Phaser.Math.FloatBetween(0.8, 1.2);
      this.decide(ctx);
    }

    // Attack wind-up resolves into a hit if the target is still in reach.
    if (this.windup >= 0) {
      this.windup -= dt;
      this.vx = 0;
      this.vy = 0;
      if (this.windup < 0) this.landHit(ctx);
      return;
    }

    const t = this.target;
    if (t) {
      const inReach = this.targetDistance(ctx) <= this.def.reach;
      if (inReach) {
        this.vx = 0;
        this.vy = 0;
        this.faceTowards(this.targetX(ctx));
        if (this.cooldown <= 0) this.startAttack();
        return;
      }
      this.moveTowards(this.targetX(ctx), this.targetY(ctx));
    } else if (this.waypoint) {
      this.moveTowards(this.waypoint.x, this.waypoint.y);
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    this.checkStuck(dt, ctx);
    if (this.nudge > 0) {
      this.nudge -= dt;
      this.vx = this.nudgeX * this.speed;
      this.vy = this.nudgeY * this.speed;
    }
  }

  /** Chooses between hero, a blocking structure, the keep, or the next flow-field cell. */
  decide(ctx) {
    const hero = ctx.hero;
    if (hero.alive) {
      const d = Math.hypot(hero.x - this.x, hero.y - this.y);
      if (d < ENEMY_AI.aggroRadius) {
        this.target = { kind: 'hero', ref: hero };
        return;
      }
    }
    const keep = ctx.keep;
    if (keep.alive && keep.distanceFrom(this.x, this.y) < this.def.reach + 22) {
      this.target = { kind: 'structure', ref: keep };
      return;
    }
    const field = ctx.field;
    const cell = field.cellAt(this.x, this.y);
    const next = field.next[cell];
    if (next < 0 || field.dist[cell] === Infinity) {
      // Off the field (e.g. pushed into an obstacle cell): head straight for the keep.
      this.target = null;
      this.waypoint = { x: keep.centerX, y: keep.rect.bottom + 10 };
      return;
    }
    const blocker = field.structureAt(next);
    if (blocker && blocker.alive) {
      this.target = { kind: 'structure', ref: blocker };
      return;
    }
    const here = field.structureAt(cell);
    if (here && here.alive) {
      // Standing in a structure's cell (it was rebuilt around us): attack it.
      this.target = { kind: 'structure', ref: here };
      return;
    }
    this.target = null;
    // Look two cells ahead for smoother paths when the way is clear.
    const next2 = field.next[next];
    const useNext2 = next2 >= 0 && !(field.structureAt(next2) && field.structureAt(next2).alive);
    this.waypoint = field.cellCenter(useNext2 ? next2 : next, this.tmp);
  }

  targetX(ctx) {
    const t = this.target;
    if (t.kind === 'hero') return t.ref.x;
    return Phaser.Math.Clamp(this.x, t.ref.rect.x, t.ref.rect.right);
  }

  targetY(ctx) {
    const t = this.target;
    if (t.kind === 'hero') return t.ref.y;
    return Phaser.Math.Clamp(this.y, t.ref.rect.y, t.ref.rect.bottom);
  }

  targetDistance(ctx) {
    const t = this.target;
    if (t.kind === 'hero') {
      if (!t.ref.alive) return Infinity;
      return Math.hypot(t.ref.x - this.x, (t.ref.y - this.y) * 1.3) - 8;
    }
    if (!t.ref.alive) return Infinity;
    return t.ref.distanceFrom(this.x, this.y);
  }

  moveTowards(tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) {
      this.vx = 0;
      this.vy = 0;
      return;
    }
    this.vx = (dx / len) * this.speed;
    this.vy = (dy / len) * this.speed;
    if (Math.abs(this.vx) > 5) this.facing = this.vx > 0 ? 1 : -1;
  }

  faceTowards(x) {
    if (Math.abs(x - this.x) > 2) this.facing = x > this.x ? 1 : -1;
  }

  checkStuck(dt, ctx) {
    this.stuckTimer += dt;
    if (this.stuckTimer < ENEMY_AI.stuckWindow) return;
    const moved = Math.hypot(this.x - this.stuckX, this.y - this.stuckY);
    this.stuckTimer = 0;
    this.stuckX = this.x;
    this.stuckY = this.y;
    const wantsToMove = Math.abs(this.vx) + Math.abs(this.vy) > 1;
    if (!wantsToMove || moved > ENEMY_AI.stuckDistance) return;
    // Blocked by something standing? Attack the nearest structure in reach.
    const s = ctx.nearestStructure(this.x, this.y, this.def.reach + 16);
    if (s) {
      this.target = { kind: 'structure', ref: s };
      return;
    }
    const a = Math.random() * Math.PI * 2;
    this.nudgeX = Math.cos(a);
    this.nudgeY = Math.sin(a);
    this.nudge = 0.35;
  }

  startAttack() {
    this.windup = WINDUP;
    this.cooldown = this.def.attackInterval;
    const dir = this.facing;
    this.scene.tweens.add({
      targets: this.sprite,
      angle: { from: -8 * dir, to: 14 * dir },
      duration: WINDUP * 1000,
      yoyo: true,
      ease: 'Quad.easeIn',
    });
  }

  landHit(ctx) {
    const t = this.target;
    if (!t || this.targetDistance(ctx) > this.def.reach + 10) return;
    if (t.kind === 'hero') ctx.damageHero(this.damage, this);
    else ctx.damageStructure(t.ref, this.damage, this);
  }

  /** Applies velocity (called after decisions, before physics). */
  applyVelocity(sepX, sepY) {
    this.body.setVelocity(this.vx + sepX, this.vy + sepY);
  }

  takeDamage(amount) {
    if (!this.active || this.dying) return false;
    this.hp -= amount;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => { if (this.active && !this.dying) this.sprite.clearTint(); });
    // Small knockback away from the hero.
    this.body.velocity.scale(0.2);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.dying = true;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.sprite.clearTint();
    this.scene.tweens.add({
      targets: this.sprite,
      angle: 90 * this.facing,
      alpha: 0,
      duration: 450,
      ease: 'Quad.easeIn',
    });
    this.scene.tweens.add({
      targets: this.shadow,
      alpha: 0,
      duration: 450,
      onComplete: () => this.release(),
    });
  }

  release() {
    this.active = false;
    this.dying = false;
    this.body.enable = false;
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);
  }

  sync() {
    const fx = this.x;
    const fy = this.y;
    const moving = Math.abs(this.body.velocity.x) + Math.abs(this.body.velocity.y) > 5;
    if (moving) this.walk += this.scene.game.loop.delta / 1000;
    const bob = moving ? Math.abs(Math.sin(this.walk * 12)) * 2.5 : 0;
    this.shadow.setPosition(fx, fy).setDepth(fy - 1);
    this.sprite.setPosition(fx, fy - bob).setDepth(fy).setFlipX(this.facing < 0);
  }
}
