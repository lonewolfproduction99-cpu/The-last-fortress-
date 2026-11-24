// A defensive structure with health: wall section, gate or the Command Keep.
// Destroyed walls/gates turn into passable ruins (colliders off) and can be rebuilt.
import Phaser from 'phaser';

export class Structure {
  /**
   * @param opts.kind 'wall' | 'gate' | 'keep'
   * @param opts.rect Phaser.Geom.Rectangle used for pathing cells and attack range
   * @param opts.img image showing the structure
   * @param opts.liveTexture / ruinTexture texture keys
   * @param opts.colliders zones that are enabled only while standing
   * @param opts.maxHp
   * @param opts.alive initial state
   */
  constructor(scene, opts) {
    this.scene = scene;
    this.kind = opts.kind;
    this.key = opts.key || null;
    this.name = opts.name || opts.kind;
    this.rect = opts.rect;
    this.img = opts.img;
    this.liveTexture = opts.liveTexture;
    this.ruinTexture = opts.ruinTexture;
    this.colliders = opts.colliders || [];
    this.maxHp = opts.maxHp;
    this.hp = opts.alive ? opts.maxHp : 0;
    this.alive = !!opts.alive;
    this.lastHitAt = -9999;
    this.applyState();
  }

  get centerX() {
    return this.rect.centerX;
  }

  get centerY() {
    return this.rect.centerY;
  }

  get damaged() {
    return this.alive && this.hp < this.maxHp;
  }

  /** Distance from a point to the edge of the structure's rectangle. */
  distanceFrom(x, y) {
    const r = this.rect;
    const dx = Math.max(r.x - x, 0, x - r.right);
    const dy = Math.max(r.y - y, 0, y - r.bottom);
    return Math.hypot(dx, dy);
  }

  applyState() {
    for (const z of this.colliders) z.body.enable = this.alive;
    if (this.img && this.liveTexture) this.img.setTexture(this.alive ? this.liveTexture : this.ruinTexture);
    this.refreshTint();
  }

  refreshTint() {
    if (!this.img) return;
    if (!this.alive || this.hp >= this.maxHp) {
      this.img.clearTint();
      return;
    }
    // Darker and redder as it loses health.
    const f = this.hp / this.maxHp;
    const g = Math.round(150 + 105 * f);
    const color = (255 << 16) | (g << 8) | g;
    this.img.setTint(color);
  }

  /** Returns true if this hit destroyed the structure. */
  damage(amount) {
    if (!this.alive || amount <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.lastHitAt = this.scene.time.now;
    if (this.img) {
      this.img.setTintFill(0xffffff);
      this.scene.time.delayedCall(60, () => this.refreshTint());
    }
    this.scene.events.emit('structure-hit', this);
    if (this.hp <= 0) {
      this.alive = false;
      this.applyState();
      this.scene.events.emit('structure-destroyed', this);
      return true;
    }
    return false;
  }

  /** Brings a ruin back at full health (after a repair/build). */
  restore() {
    this.alive = true;
    this.hp = this.maxHp;
    this.applyState();
    this.scene.events.emit('structure-restored', this);
  }

  repairFull() {
    if (!this.alive) return;
    this.hp = this.maxHp;
    this.refreshTint();
  }

  get rectCopy() {
    return new Phaser.Geom.Rectangle(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
  }
}
