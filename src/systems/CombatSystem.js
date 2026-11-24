// Hero combat: automatic sword attacks, taking damage, death and respawn.
import { COMBAT, PLAYER } from '../config/GameConfig.js';
import { PLAYER_START } from '../config/MapLayout.js';
import { SoundFX } from './SoundFX.js';

export class CombatSystem {
  constructor(scene, player, enemies, economy, fx) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.economy = economy;
    this.fx = fx;
    this.cooldown = 0;
    this.sinceHurt = 99;
    this.respawnTimer = 0;
    this.invulnerable = 0;
    this.damage = PLAYER.swordDamage;
    this.attackInterval = PLAYER.attackInterval;
    this.deaths = 0;

    enemies.ctx.hero = player;
    enemies.ctx.damageHero = (amount) => this.damageHero(amount);
  }

  get respawnRemaining() {
    return this.player.alive ? 0 : Math.max(0, this.respawnTimer);
  }

  /** True while an enemy is close enough that gathering should pause. */
  isThreatened() {
    return this.player.alive && this.enemies.lastNearestDistance < COMBAT.threatRadius;
  }

  update(dt) {
    const p = this.player;
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (!p.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }

    if (this.invulnerable > 0) {
      this.invulnerable -= dt;
      p.sprite.setAlpha(Math.floor(this.invulnerable * 10) % 2 ? 0.45 : 1);
      if (this.invulnerable <= 0) p.sprite.setAlpha(1);
    }

    // Regenerate slowly when out of combat.
    this.sinceHurt += dt;
    if (this.sinceHurt > COMBAT.regenDelay && p.health < p.maxHealth) {
      p.health = Math.min(p.maxHealth, p.health + COMBAT.regenPerSecond * dt);
    }

    const target = this.enemies.nearest(p.x, p.y);
    if (!target || this.enemies.lastNearestDistance > COMBAT.heroReach) return;
    if (this.cooldown > 0 || p.swinging) return;

    this.cooldown = this.attackInterval;
    p.faceTowards(target.x);
    SoundFX.swing();
    p.swing('tool_sword', COMBAT.heroImpactDelay, () => this.impact(target));
  }

  impact(target) {
    const p = this.player;
    // Exactly one target per swing; must still be alive and roughly in reach.
    if (!p.alive || !target.active || target.dying) return;
    const d = Math.hypot(target.x - p.x, (target.y - p.y) * 1.3) - target.def.radius;
    if (d > COMBAT.heroReach + 14) return;
    const killed = target.takeDamage(this.damage);
    this.fx.hitSpark(target.x, target.y - 20);
    this.fx.floatText(target.x, target.y - 46, `-${this.damage}`, '#ffffff');
    SoundFX.hit();
    if (killed) {
      const gold = target.def.gold;
      this.economy.earn(gold);
      this.fx.popIcon('icon_gold', target.x, target.y - 30);
      this.fx.floatText(target.x, target.y - 60, `+${gold}`, '#f5d77a');
      SoundFX.enemyDie();
      this.enemies.onKilled(target);
    }
  }

  damageHero(amount) {
    const p = this.player;
    if (!p.alive || this.invulnerable > 0) return;
    p.health = Math.max(0, p.health - amount);
    this.sinceHurt = 0;
    p.flash(0xff5050);
    this.fx.floatText(p.x, p.y - 64, `-${amount}`, '#ff8a7a');
    SoundFX.hurt();
    if (p.health <= 0) this.killHero();
  }

  killHero() {
    const p = this.player;
    this.deaths += 1;
    p.setDead(true);
    this.respawnTimer = PLAYER.respawnSeconds;
    this.scene.events.emit('hero-died');
  }

  respawn() {
    const p = this.player;
    p.health = p.maxHealth;
    p.teleport(PLAYER_START.x, PLAYER_START.y);
    p.setDead(false);
    this.invulnerable = COMBAT.respawnInvulnerable;
    this.sinceHurt = 0;
    this.scene.events.emit('hero-respawned');
    this.fx.burst(p.x, p.y - 20);
  }
}
