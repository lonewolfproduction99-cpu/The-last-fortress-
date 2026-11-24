// A white glowing construction square. The hero walks in and materials are
// deposited automatically, one unit at a time. Partial deliveries are kept.
// Gold is charged exactly once, only after all materials are delivered.
import Phaser from 'phaser';
import { CONSTRUCTION, RESOURCE_TYPES, COLORS } from '../config/GameConfig.js';
import { ICON_FOR } from '../assets/AssetManifest.js';

const LABEL_W = 150;
const FONT = '"Trebuchet MS", Verdana, sans-serif';

export class ConstructionSite extends Phaser.Events.EventEmitter {
  /**
   * @param scene GameScene
   * @param layout entry from MapLayout.CONSTRUCTION_SITES
   * @param building entry from Buildings.BUILDINGS
   */
  constructor(scene, layout, building) {
    super();
    this.scene = scene;
    this.id = layout.id;
    this.layout = layout;
    this.building = building;
    this.rect = new Phaser.Geom.Rectangle(layout.x - layout.w / 2, layout.y - layout.h / 2, layout.w, layout.h);
    this.cost = building.cost;
    this.delivered = Object.fromEntries(RESOURCE_TYPES.map((t) => [t, 0]));
    this.goldPaid = false;
    this.status = 'locked'; // locked | open | building | done
    this.depositTimer = 0;
    this.buildTimer = 0;
    this.playerInside = false;
    this.needGoldShown = false;

    this.gfx = scene.add.graphics().setDepth(layout.y - layout.h / 2 - 1);
    this.drawSquare(false);

    this.label = this.createLabel();
    this.setVisible(false);
  }

  /* ---------- state helpers ---------- */

  remaining(type) {
    return Math.max(0, (this.cost[type] || 0) - this.delivered[type]);
  }

  get materialsComplete() {
    return RESOURCE_TYPES.every((t) => this.remaining(t) === 0);
  }

  get progress() {
    let need = 0;
    let have = 0;
    for (const t of RESOURCE_TYPES) {
      need += this.cost[t] || 0;
      have += this.delivered[t];
    }
    return need === 0 ? 1 : have / need;
  }

  /** Point just above the floating label, used by the objective marker. */
  get markerPoint() {
    return { x: this.layout.x, y: this.rect.y - 8 - (this.labelHeight || 60) };
  }

  contains(x, y) {
    return this.rect.contains(x, y);
  }

  open() {
    if (this.status !== 'locked') return;
    this.status = 'open';
    this.setVisible(true);
    this.gfx.setAlpha(0);
    this.label.setAlpha(0);
    this.scene.tweens.add({ targets: [this.gfx, this.label], alpha: 1, duration: 500 });
    this.pulse = this.scene.tweens.add({ targets: this.gfx, alpha: { from: 1, to: 0.55 }, yoyo: true, repeat: -1, duration: 700, delay: 500 });
  }

  setVisible(v) {
    this.gfx.setVisible(v);
    this.label.setVisible(v);
  }

  /* ---------- per-frame update ---------- */

  update(dt, player, inventory, economy, fx) {
    if (this.status === 'building') {
      this.buildTimer += dt;
      const p = Math.min(1, this.buildTimer / CONSTRUCTION.buildSeconds);
      this.drawBar(p, COLORS.ok);
      if (Math.random() < dt * 14) fx.dust(this.layout.x + Phaser.Math.Between(-this.layout.w / 3, this.layout.w / 3), this.layout.y + this.layout.h / 4);
      if (p >= 1) this.finish();
      return;
    }
    if (this.status !== 'open') return;

    const inside = this.contains(player.x, player.y);
    if (inside !== this.playerInside) {
      this.playerInside = inside;
      this.drawSquare(inside);
      this.depositTimer = 0;
    }
    if (!inside) return;

    this.depositTimer += dt;
    while (this.depositTimer >= CONSTRUCTION.depositInterval) {
      this.depositTimer -= CONSTRUCTION.depositInterval;
      if (!this.depositOne(player, inventory, fx)) {
        this.depositTimer = 0;
        break;
      }
    }

    if (this.materialsComplete) this.tryPayAndBuild(economy);
  }

  /** Moves one useful unit from the inventory into the site. Returns false if nothing to deposit. */
  depositOne(player, inventory, fx) {
    for (const type of RESOURCE_TYPES) {
      if (this.remaining(type) > 0 && inventory.count(type) > 0) {
        const removed = inventory.remove(type, 1);
        if (removed !== 1) continue;
        this.delivered[type] += 1;
        fx.flyIcon(ICON_FOR[type], player.x, player.y - 30, this.layout.x, this.layout.y);
        this.emit('deposit', this, type);
        this.refreshLabel();
        return true;
      }
    }
    return false;
  }

  tryPayAndBuild(economy) {
    const gold = this.cost.gold || 0;
    if (!this.goldPaid) {
      if (!economy.spend(gold)) {
        if (!this.needGoldShown) {
          this.needGoldShown = true;
          this.emit('needGold', this, gold - economy.gold);
        }
        this.refreshLabel(economy);
        return;
      }
      this.goldPaid = true;
    }
    this.startBuilding();
  }

  startBuilding() {
    this.status = 'building';
    this.buildTimer = 0;
    if (this.pulse) this.pulse.stop();
    this.gfx.setAlpha(1);
    this.drawSquare(true);
    this.scaffold = this.scene.add.image(this.layout.x, this.layout.y + this.layout.h / 2 - 8, 'scaffold')
      .setOrigin(0.5, 1).setDepth(this.layout.y + this.layout.h / 2).setScale(0.2);
    this.scene.tweens.add({ targets: this.scaffold, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.labelTitle.setText('Building…');
    this.labelRows.forEach((r) => r.setVisible(false));
    this.emit('buildStart', this);
  }

  finish() {
    this.status = 'done';
    this.scaffold.destroy();
    this.gfx.destroy();
    this.label.destroy();
    this.emit('complete', this);
  }

  /* ---------- visuals ---------- */

  drawSquare(active) {
    const g = this.gfx;
    const { x, y, width: w, height: h } = this.rect;
    g.clear();
    g.fillStyle(0xffffff, active ? 0.28 : 0.13).fillRect(x, y, w, h);
    g.lineStyle(8, 0xffffff, 0.18).strokeRect(x - 2, y - 2, w + 4, h + 4);
    g.lineStyle(3, 0xffffff, 0.95).strokeRect(x, y, w, h);
    const c = 16;
    g.lineStyle(5, 0xffffff, 1);
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, sx, sy]) => {
      g.lineBetween(cx, cy, cx + c * sx, cy);
      g.lineBetween(cx, cy, cx, cy + c * sy);
    });
  }

  createLabel() {
    const s = this.scene;
    const res = s.labelResolution || 1;
    const c = s.add.container(this.layout.x, this.rect.y - 8).setDepth(100000);
    this.labelBg = s.add.graphics();
    this.labelTitle = s.add.text(0, 0, `${this.building.verb} ${this.building.name}`, {
      fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: COLORS.text,
    }).setOrigin(0.5, 0).setResolution(res);
    c.add([this.labelBg, this.labelTitle]);

    this.labelRows = [];
    const types = [...RESOURCE_TYPES.filter((t) => (this.cost[t] || 0) > 0), ...((this.cost.gold || 0) > 0 ? ['gold'] : [])];
    this.rowTypes = types;
    types.forEach((t) => {
      const icon = s.add.image(0, 0, ICON_FOR[t]).setScale(0.75);
      const txt = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: COLORS.text })
        .setOrigin(0, 0.5).setResolution(res);
      const row = s.add.container(0, 0, [icon, txt]);
      row.icon = icon;
      row.txt = txt;
      row.type = t;
      this.labelRows.push(row);
      c.add(row);
    });
    this.labelBar = s.add.graphics();
    c.add(this.labelBar);
    this.layoutLabel();
    this.refreshLabel();
    return c;
  }

  layoutLabel() {
    const rowH = 16;
    const titleH = 18;
    const barH = 7;
    const pad = 6;
    const h = pad + titleH + this.labelRows.length * rowH + barH + pad + 2;
    this.labelHeight = h;
    // Container origin is the bottom-centre of the label.
    this.labelBg.clear();
    this.labelBg.fillStyle(COLORS.panel, 0.82).fillRoundedRect(-LABEL_W / 2, -h, LABEL_W, h, 6);
    this.labelBg.lineStyle(2, COLORS.panelEdge, 1).strokeRoundedRect(-LABEL_W / 2, -h, LABEL_W, h, 6);
    this.labelTitle.setPosition(0, -h + pad - 1);
    this.labelRows.forEach((row, i) => {
      row.setPosition(-LABEL_W / 2 + 18, -h + pad + titleH + i * rowH + rowH / 2);
      row.icon.setPosition(0, 0);
      row.txt.setPosition(12, 0);
    });
    this.barY = -pad - barH;
    this.barH = barH;
  }

  refreshLabel(economy) {
    this.labelRows.forEach((row) => {
      const t = row.type;
      if (t === 'gold') {
        const need = this.cost.gold;
        if (this.goldPaid) {
          row.txt.setText(`Gold ${need} paid`).setColor('#7bd88f');
        } else if (economy && this.materialsComplete && economy.gold < need) {
          row.txt.setText(`Gold: need ${need - economy.gold} more`).setColor('#ff8a7a');
        } else {
          row.txt.setText(`Gold: ${need} required`).setColor('#f5d77a');
        }
      } else {
        const need = this.cost[t];
        const have = this.delivered[t];
        row.txt.setText(`${t[0].toUpperCase()}${t.slice(1)}: ${have}/${need}`).setColor(have >= need ? '#7bd88f' : COLORS.text);
      }
    });
    this.drawBar(this.progress, 0xf5c542);
  }

  drawBar(p, color) {
    const w = LABEL_W - 16;
    this.labelBar.clear();
    this.labelBar.fillStyle(0x000000, 0.5).fillRect(-w / 2, this.barY, w, this.barH);
    this.labelBar.fillStyle(color, 1).fillRect(-w / 2, this.barY, w * Phaser.Math.Clamp(p, 0, 1), this.barH);
  }

  setLabelResolution(res) {
    if (this.status === 'done') return;
    this.labelTitle.setResolution(res);
    this.labelRows.forEach((r) => r.txt.setResolution(res));
  }
}
