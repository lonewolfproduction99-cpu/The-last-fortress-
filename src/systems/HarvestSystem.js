// Automatic gathering: when the hero stands near a resource node and has
// room in the bag, they swing the right tool and gain one unit per strike.
import { HARVEST } from '../config/GameConfig.js';
import { ICON_FOR } from '../assets/AssetManifest.js';
import { SoundFX } from './SoundFX.js';

const NODE_TICK = 0.25; // seconds between regrowth checks

export class HarvestSystem {
  constructor(scene, player, inventory, nodes, fx) {
    this.scene = scene;
    this.player = player;
    this.inventory = inventory;
    this.nodes = nodes;
    this.fx = fx;
    this.cooldown = 0;
    this.nodeTick = 0;
    this.target = null;
    this.fullWarnCooldown = 0;
    // Hook for Phase 2: return true while an enemy is close, which pauses gathering.
    this.isThreatened = () => false;
  }

  findTarget() {
    const px = this.player.x;
    const py = this.player.y;
    let best = null;
    let bestD = Infinity;
    for (const n of this.nodes) {
      if (!n.available) continue;
      const dx = n.x - px;
      const dy = (n.y - py) * 1.4; // flatten: reach is mostly sideways
      const d = Math.hypot(dx, dy) - n.radius;
      if (d < HARVEST.reach && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.fullWarnCooldown = Math.max(0, this.fullWarnCooldown - dt);

    this.nodeTick += dt;
    if (this.nodeTick >= NODE_TICK) {
      for (const n of this.nodes) n.tick(this.nodeTick, this.player);
      this.nodeTick = 0;
    }

    if (!this.player.alive || this.isThreatened()) {
      this.player.restTool();
      return;
    }
    const target = this.findTarget();
    this.target = target;
    if (!target) {
      this.player.restTool();
      return;
    }
    if (this.inventory.isFull) {
      if (this.fullWarnCooldown <= 0) {
        this.fullWarnCooldown = 4;
        this.fx.floatText(this.player.x, this.player.y - 60, 'Bag full!', '#ffb86b');
        SoundFX.full();
        this.scene.events.emit('bag-full');
      }
      return;
    }
    if (this.cooldown > 0 || this.player.swinging) return;

    this.cooldown = HARVEST.swingInterval;
    this.player.faceTowards(target.x);
    this.player.swing(target.tool, HARVEST.impactDelay, () => this.impact(target));
  }

  impact(node) {
    // Re-validate at the moment of impact: node may have depleted or the hero walked away.
    if (!this.player.alive || !node.available || this.inventory.isFull) return;
    const d = Math.hypot(node.x - this.player.x, (node.y - this.player.y) * 1.4) - node.radius;
    if (d > HARVEST.reach + 12) return;
    const got = node.strike();
    if (!got) return;
    const added = this.inventory.add(node.resource, got);
    if (!added) return;
    const hitY = node.kind === 'tree' ? node.y - 30 : node.y - 14;
    this.fx.chipsAt(node.resource, node.x, hitY);
    this.fx.popIcon(ICON_FOR[node.resource], this.player.x, this.player.y - 62);
    if (node.resource === 'wood') SoundFX.chop();
    else SoundFX.mine();
    this.scene.events.emit('harvested', node.resource, node);
  }
}
