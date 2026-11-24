// The hero knight. Physics lives on an invisible zone at the feet so visual
// effects (bobbing, squash) never change the collision box.
import Phaser from 'phaser';
import { PLAYER } from '../config/GameConfig.js';
import { readMovement } from '../input/InputState.js';

const TOOL_OFFSET_X = 14;
const TOOL_OFFSET_Y = -22;

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = PLAYER.maxHealth;
    this.maxHealth = PLAYER.maxHealth;
    this.speed = PLAYER.speed;
    this.facing = 1;
    this.moving = false;
    this.walkTime = 0;
    this.swinging = false;
    this.move = { x: 0, y: 0 };

    // Collision body (feet).
    this.zone = scene.add.zone(x, y - PLAYER.bodyHeight / 2, PLAYER.bodyWidth, PLAYER.bodyHeight);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body;
    this.body.setCollideWorldBounds(true);

    // Visuals.
    this.shadow = scene.add.image(x, y, 'shadow').setOrigin(0.5, 0.6);
    this.sprite = scene.add.image(x, y, 'hero').setOrigin(0.5, 1);
    this.tool = scene.add.image(x, y, 'tool_sword').setOrigin(0.5, 1);
    this.toolBaseAngle = 20;
    this.tool.setAngle(this.toolBaseAngle);
  }

  /** Feet position in world coordinates. */
  get x() {
    return this.zone.x;
  }

  get y() {
    return this.zone.y + PLAYER.bodyHeight / 2;
  }

  teleport(x, y) {
    this.body.reset(x, y - PLAYER.bodyHeight / 2);
    this.syncVisuals(0);
  }

  update(dt, keys) {
    readMovement(keys, this.move);
    const { x, y } = this.move;
    this.body.setVelocity(x * this.speed, y * this.speed);
    this.moving = Math.abs(x) + Math.abs(y) > 0.05;
    if (this.moving && !this.swinging && Math.abs(x) > 0.1) this.facing = x > 0 ? 1 : -1;
    if (this.moving) this.walkTime += dt;
  }

  /** Called after physics so visuals follow the resolved position. */
  syncVisuals() {
    const fx = this.x;
    const fy = this.y;
    const bob = this.moving ? Math.abs(Math.sin(this.walkTime * 14)) * 3 : 0;
    this.shadow.setPosition(fx, fy).setDepth(fy - 1);
    this.sprite.setPosition(fx, fy - bob).setDepth(fy);
    this.sprite.setFlipX(this.facing < 0);
    this.sprite.setAngle(this.moving ? Math.sin(this.walkTime * 14) * 4 : 0);
    this.tool.setPosition(fx + TOOL_OFFSET_X * this.facing, fy + TOOL_OFFSET_Y - bob).setDepth(fy + 0.5);
    this.tool.setFlipX(this.facing < 0);
    if (!this.swinging) this.tool.setAngle(this.toolBaseAngle * this.facing);
  }

  faceTowards(targetX) {
    if (Math.abs(targetX - this.x) > 2) this.facing = targetX > this.x ? 1 : -1;
  }

  /**
   * Plays a tool swing. `onImpact` is called once, part-way through the swing.
   * Returns false if a swing is already playing.
   */
  swing(toolKey, impactDelay, onImpact) {
    if (this.swinging) return false;
    this.swinging = true;
    this.tool.setTexture(toolKey);
    const dir = this.facing;
    this.tool.setAngle(-70 * dir);
    let impacted = false;
    this.scene.tweens.add({
      targets: this.tool,
      angle: 95 * dir,
      duration: impactDelay * 1000,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        impacted = true;
        onImpact();
        this.scene.tweens.add({
          targets: this.tool,
          angle: this.toolBaseAngle * dir,
          duration: 180,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this.swinging = false;
          },
        });
      },
    });
    // Safety: never leave the hero stuck mid-swing (e.g. tween killed on scene restart).
    this.scene.time.delayedCall(impactDelay * 1000 + 400, () => {
      if (!impacted) this.swinging = false;
    });
    return true;
  }

  restTool() {
    if (!this.swinging) this.tool.setTexture('tool_sword');
  }

  flash(color = 0xffffff) {
    this.sprite.setTintFill(color);
    this.scene.time.delayedCall(70, () => this.sprite.clearTint());
  }

  destroy() {
    this.zone.destroy();
    this.shadow.destroy();
    this.sprite.destroy();
    this.tool.destroy();
  }
}
