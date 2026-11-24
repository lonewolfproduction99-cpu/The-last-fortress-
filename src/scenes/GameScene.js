// The world: map, hero, resource nodes, construction squares and gameplay systems.
import Phaser from 'phaser';
import { WORLD, VIEW, PLAYER, ECONOMY, KEEP } from '../config/GameConfig.js';
import { BUILDINGS } from '../config/Buildings.js';
import {
  CASTLE, KEEP_POS, PLAYER_START, GATE, WALL_BLOCKS, CONSTRUCTION_SITES, TREES, ROCKS, PATHS,
} from '../config/MapLayout.js';
import { Player } from '../entities/Player.js';
import { ResourceNode } from '../entities/ResourceNode.js';
import { ConstructionSite } from '../entities/ConstructionSite.js';
import { Inventory } from '../systems/Inventory.js';
import { Economy } from '../systems/Economy.js';
import { HarvestSystem } from '../systems/HarvestSystem.js';
import { Effects } from '../systems/Effects.js';
import { Tutorial } from '../systems/Tutorial.js';
import { SoundFX } from '../systems/SoundFX.js';

const MAX_DT = 1 / 20; // clamp long frames (tab switches) so nothing tunnels through walls

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.labelResolution = 1;
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor('#4f8a3f');

    this.solids = this.physics.add.staticGroup();
    this.fx = new Effects(this);

    this.buildGround();
    this.buildCastle();
    this.buildNodes();

    this.inventory = new Inventory(PLAYER.carryCapacity);
    this.economy = new Economy(ECONOMY.startingGold);
    this.keepHealth = KEEP.maxHealth;
    this.keepMaxHealth = KEEP.maxHealth;

    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.physics.add.collider(this.player.zone, this.solids);

    this.buildSites();

    this.harvest = new HarvestSystem(this, this.player, this.inventory, this.nodes, this.fx);
    this.tutorial = new Tutorial(this);

    this.keys = this.input.keyboard
      ? this.input.keyboard.addKeys({
        up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D',
      }, false)
      : null;

    this.applyZoom();
    this.scale.on('resize', this.applyZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.applyZoom, this));
    this.cameras.main.centerOn(this.player.x, this.player.y - 20);

    this.events.on('postupdate', this.lateUpdate, this);
  }

  /* ---------------- world construction ---------------- */

  buildGround() {
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'grass').setOrigin(0).setDepth(-1000);
    for (const p of PATHS) {
      this.add.tileSprite(p.x, p.y, p.w, p.h, 'dirt').setOrigin(0).setDepth(-999);
    }
    // Castle courtyard (slightly lighter dirt).
    this.add.tileSprite(CASTLE.left + 64, CASTLE.top + 64, CASTLE.right - CASTLE.left - 128, CASTLE.bottom - CASTLE.top - 128, 'dirt')
      .setOrigin(0).setDepth(-998).setAlpha(0.45);
  }

  addSolid(x, y, w, h) {
    const z = this.add.zone(x, y, w, h);
    this.physics.add.existing(z, true);
    this.solids.add(z);
    return z;
  }

  buildCastle() {
    // Wall ring. Each block: an image plus a collider along its base.
    this.wallBlocks = new Map();
    for (const b of WALL_BLOCKS) {
      const key = `${b.x},${b.y}`;
      const baseY = b.y + 32;
      const img = this.add.image(b.x, baseY, b.ruined ? 'wall_ruin' : 'wall').setOrigin(0.5, 1).setDepth(baseY);
      const collider = this.addSolid(b.x, b.y + 8, 64, 48);
      collider.body.enable = !b.ruined;
      this.wallBlocks.set(key, { ...b, img, collider, baseY });
    }

    // Gate (starts ruined, passable).
    const gateBase = GATE.y + 32;
    this.gateImg = this.add.image(GATE.x, gateBase, 'gate_ruin').setOrigin(0.5, 1).setDepth(gateBase);

    // Command Keep.
    this.keepImg = this.add.image(KEEP_POS.x, KEEP_POS.y + 80, 'keep').setOrigin(0.5, 1).setDepth(KEEP_POS.y + 80);
    this.addSolid(KEEP_POS.x, KEEP_POS.y + 45, 196, 70);
    this.keepShadow = this.add.ellipse(KEEP_POS.x, KEEP_POS.y + 80, 220, 30, 0x000000, 0.2).setDepth(-500);
  }

  buildNodes() {
    this.nodes = [];
    for (const t of TREES) this.nodes.push(new ResourceNode(this, 'tree', t.x, t.y, this.solids, t));
    for (const r of ROCKS) this.nodes.push(new ResourceNode(this, 'rock', r.x, r.y, this.solids, r));
  }

  buildSites() {
    this.sites = CONSTRUCTION_SITES.map((layout) => {
      const site = new ConstructionSite(this, layout, BUILDINGS[layout.building]);
      site.on('deposit', () => SoundFX.deposit());
      site.on('needGold', (s, missing) => {
        this.events.emit('toast', `Need ${missing} more gold to finish the ${s.building.name}.`);
        SoundFX.denied();
      });
      site.on('buildStart', () => SoundFX.buildStart());
      site.on('complete', (s) => this.onSiteComplete(s));
      return site;
    });
    this.refreshSiteLocks();
  }

  refreshSiteLocks() {
    for (const s of this.sites) {
      if (s.status !== 'locked') continue;
      const req = s.layout.requires;
      const reqSite = req && this.sites.find((x) => x.id === req);
      if (!req || (reqSite && reqSite.status === 'done')) s.open();
    }
  }

  onSiteComplete(site) {
    const L = site.layout;
    const b = site.building;
    if (L.building === 'gate') {
      this.gateImg.setTexture('gate');
      // Side pillars are solid; the doorway always stays open for the hero.
      this.addSolid(GATE.x - 80, GATE.y + 8, 32, 48);
      this.addSolid(GATE.x + 80, GATE.y + 8, 32, 48);
      this.popIn(this.gateImg);
    } else if (L.building === 'wall') {
      for (const key of L.blocks || []) {
        const blk = this.wallBlocks.get(key);
        if (!blk) continue;
        blk.ruined = false;
        blk.img.setTexture('wall');
        blk.collider.body.enable = true;
        this.popIn(blk.img);
      }
    } else {
      const baseY = L.y + L.h / 2 - 10;
      const img = this.add.image(L.x, baseY, b.texture).setOrigin(0.5, 1).setDepth(baseY);
      if (b.body) this.addSolid(L.x, baseY - b.body.h / 2, b.body.w, b.body.h);
      this.popIn(img);
    }
    this.ensurePlayerFree(L);
    this.fx.burst(L.x, L.y);
    SoundFX.buildDone();
    this.cameras.main.shake(180, 0.004);
    this.events.emit('toast', `${b.name} ${b.verb === 'Repair' ? 'repaired' : 'built'}!`);
    this.events.emit('building-complete', site);
    this.refreshSiteLocks();
  }

  popIn(img) {
    img.setScale(0.6, 0.2);
    this.tweens.add({ targets: img, scaleX: 1, scaleY: 1, duration: 450, ease: 'Back.easeOut' });
  }

  /** Never leave the hero stuck inside a freshly finished structure. */
  ensurePlayerFree(layout) {
    const body = this.player.body;
    const overlapping = this.physics.overlapRect(body.x, body.y, body.width, body.height, false, true)
      .some((b) => b.enable && b !== body);
    if (overlapping && layout.safeSpot) this.player.teleport(layout.safeSpot.x, layout.safeSpot.y);
  }

  /* ---------------- camera / resize ---------------- */

  applyZoom() {
    const { width, height } = this.scale;
    const zoom = Math.min(height / VIEW.targetVisibleHeight, width / VIEW.minVisibleWidth);
    const z = Math.max(0.5, zoom);
    this.cameras.main.setZoom(z);
    this.labelResolution = Math.max(1, Math.ceil(z * 2) / 2);
    if (this.sites) this.sites.forEach((s) => s.setLabelResolution(this.labelResolution));
  }

  /* ---------------- loop ---------------- */

  update(time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, MAX_DT);
    this.lastDt = dt;
    this.player.update(dt, this.keys);
    this.harvest.update(dt);
    for (const s of this.sites) s.update(dt, this.player, this.inventory, this.economy, this.fx);
    this.tutorial.update();
  }

  lateUpdate() {
    if (!this.player) return;
    this.player.syncVisuals();
    // Frame-rate independent camera smoothing.
    const cam = this.cameras.main;
    const dt = this.lastDt || 1 / 60;
    const k = 1 - Math.exp(-dt * 9);
    const tx = this.player.x - cam.width / 2;
    const ty = this.player.y - 24 - cam.height / 2;
    cam.setScroll(cam.scrollX + (tx - cam.scrollX) * k, cam.scrollY + (ty - cam.scrollY) * k);
  }
}
