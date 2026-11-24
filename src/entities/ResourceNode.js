// A harvestable tree or rock. Depletes after a set number of strikes and
// regrows later so the player can never run permanently out of materials.
import { HARVEST } from '../config/GameConfig.js';

const KINDS = {
  tree: {
    resource: 'wood',
    texture: 'tree',
    depletedTexture: 'stump',
    tool: 'tool_axe',
    amount: HARVEST.treeAmount,
    regrow: HARVEST.treeRegrowSeconds,
    radius: 18,
    body: { w: 22, h: 14 },
  },
  rock: {
    resource: 'stone',
    texture: 'rock',
    depletedTexture: 'rubble',
    tool: 'tool_pick',
    amount: HARVEST.rockAmount,
    regrow: HARVEST.rockRegrowSeconds,
    radius: 26,
    body: { w: 48, h: 22 },
  },
};

export class ResourceNode {
  constructor(scene, kind, x, y, solids, opts = {}) {
    const def = KINDS[kind];
    this.scene = scene;
    this.kind = kind;
    this.def = def;
    this.resource = def.resource;
    this.tool = def.tool;
    this.radius = def.radius;
    this.x = x;
    this.y = y; // base / feet line
    this.maxAmount = def.amount;
    this.amount = def.amount;
    this.depleted = false;
    this.regrowTimer = 0;
    this.tutorial = !!opts.tutorial;

    this.shadow = scene.add.image(x, y, 'shadow').setOrigin(0.5, 0.5).setScale(kind === 'tree' ? 1.2 : 1.5, 1.2).setDepth(y - 2);
    this.sprite = scene.add.image(x, y + 4, def.texture).setOrigin(0.5, 1).setDepth(y);

    this.blocker = scene.add.zone(x, y - def.body.h / 2, def.body.w, def.body.h);
    scene.physics.add.existing(this.blocker, true);
    solids.add(this.blocker);

    this.highlight = null;
    if (this.tutorial) this.setHighlighted(true);
  }

  get available() {
    return !this.depleted && this.amount > 0;
  }

  setHighlighted(on) {
    if (on && !this.highlight) {
      this.highlight = this.scene.add.ellipse(this.x, this.y, this.radius * 3.2, this.radius * 1.6)
        .setStrokeStyle(3, 0xffffff, 0.9).setFillStyle(0xffffff, 0.12).setDepth(this.y - 3);
      this.scene.tweens.add({ targets: this.highlight, alpha: 0.35, yoyo: true, repeat: -1, duration: 600 });
    } else if (!on && this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
  }

  /** One harvesting strike. Returns the number of units yielded (0 or 1). */
  strike() {
    if (!this.available) return 0;
    this.amount -= 1;
    this.scene.tweens.add({
      targets: this.sprite,
      x: { from: this.x - 3, to: this.x },
      duration: 120,
      ease: 'Bounce.easeOut',
    });
    if (this.kind === 'rock') {
      const s = 0.55 + 0.45 * (this.amount / this.maxAmount);
      this.sprite.setScale(s);
    }
    if (this.amount <= 0) this.deplete();
    return 1;
  }

  deplete() {
    this.depleted = true;
    this.regrowTimer = this.def.regrow;
    this.sprite.setTexture(this.def.depletedTexture).setScale(1);
    this.blocker.body.enable = false;
    this.setHighlighted(false);
  }

  /** Called a few times per second (not every frame) by the harvest system. */
  tick(dt, player) {
    if (!this.depleted) return;
    this.regrowTimer -= dt;
    if (this.regrowTimer > 0) return;
    // Don't regrow on top of the hero; retry shortly.
    if (Math.abs(player.x - this.x) < 40 && Math.abs(player.y - this.y) < 30) {
      this.regrowTimer = 2;
      return;
    }
    this.depleted = false;
    this.amount = this.maxAmount;
    this.sprite.setTexture(this.def.texture).setScale(0.2);
    this.scene.tweens.add({ targets: this.sprite, scale: 1, duration: 400, ease: 'Back.easeOut' });
    this.blocker.body.enable = true;
  }
}
