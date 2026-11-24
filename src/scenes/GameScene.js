// The world: map, hero, resource nodes, structures, construction squares,
// enemies and all gameplay systems. The HUD lives in UIScene.
import Phaser from 'phaser';
import { WORLD, VIEW, PLAYER, ECONOMY, KEEP, STRUCTURE_HP } from '../config/GameConfig.js';
import { BUILDINGS } from '../config/Buildings.js';
import {
  CASTLE, KEEP_POS, PLAYER_START, GATE, WALL_BLOCKS, CONSTRUCTION_SITES, TREES, ROCKS, PATHS,
} from '../config/MapLayout.js';
import { Player } from '../entities/Player.js';
import { ResourceNode } from '../entities/ResourceNode.js';
import { ConstructionSite } from '../entities/ConstructionSite.js';
import { Structure } from '../entities/Structure.js';
import { Inventory } from '../systems/Inventory.js';
import { Economy } from '../systems/Economy.js';
import { HarvestSystem } from '../systems/HarvestSystem.js';
import { Effects } from '../systems/Effects.js';
import { Tutorial } from '../systems/Tutorial.js';
import { SoundFX } from '../systems/SoundFX.js';
import { FlowField } from '../systems/FlowField.js';
import { EnemyManager } from '../systems/EnemyManager.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { WaveManager } from '../systems/WaveManager.js';
import { Storage } from '../platform/Storage.js';
import { Platform } from '../platform/Platform.js';

const MAX_DT = 1 / 20; // clamp long frames (tab switches) so nothing tunnels through walls
const LABEL_DETAIL_DISTANCE = 300;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.labelResolution = 1;
    this.gameOver = false;
    this.elapsed = 0;
    this.repairCounter = 0;
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor('#4f8a3f');

    this.solids = this.physics.add.staticGroup();
    this.enemyBlockers = this.physics.add.staticGroup();
    this.field = new FlowField(WORLD.width, WORLD.height);
    this.structures = [];
    this.fx = new Effects(this);

    this.buildGround();
    this.buildCastle();
    this.buildNodes();

    this.inventory = new Inventory(PLAYER.carryCapacity);
    this.economy = new Economy(ECONOMY.startingGold);

    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.physics.add.collider(this.player.zone, this.solids);

    this.enemies = new EnemyManager(this, {
      field: this.field,
      structures: this.structures,
      keep: this.keep,
      solids: this.solids,
      enemyBlockers: this.enemyBlockers,
    });
    this.combat = new CombatSystem(this, this.player, this.enemies, this.economy, this.fx);
    this.waves = new WaveManager(this, this.enemies, this.economy);

    this.sites = [];
    this.buildSites();

    this.harvest = new HarvestSystem(this, this.player, this.inventory, this.nodes, this.fx);
    this.harvest.isThreatened = () => this.combat.isThreatened();
    this.tutorial = new Tutorial(this);

    this.bars = this.add.graphics().setDepth(99997);

    this.keys = this.input.keyboard
      ? this.input.keyboard.addKeys({
        up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D',
      }, false)
      : null;

    this.applyZoom();
    this.scale.on('resize', this.applyZoom, this);
    this.cameras.main.centerOn(this.player.x, this.player.y - 20);

    this.events.on('postupdate', this.lateUpdate, this);
    this.events.on('structure-destroyed', this.onStructureDestroyed, this);
    this.events.on('structure-restored', this.onStructureRestored, this);
    this.events.on('structure-hit', this.onStructureHit, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.applyZoom, this);
      this.events.off('postupdate', this.lateUpdate, this);
      this.events.off('structure-destroyed', this.onStructureDestroyed, this);
      this.events.off('structure-restored', this.onStructureRestored, this);
      this.events.off('structure-hit', this.onStructureHit, this);
    });

    this.field.build();
    this.scene.launch('UI');
  }

  /* ---------------- world construction ---------------- */

  buildGround() {
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'grass').setOrigin(0).setDepth(-1000);
    for (const p of PATHS) {
      this.add.tileSprite(p.x, p.y, p.w, p.h, 'dirt').setOrigin(0).setDepth(-999);
    }
    this.add.tileSprite(CASTLE.left + 64, CASTLE.top + 64, CASTLE.right - CASTLE.left - 128, CASTLE.bottom - CASTLE.top - 128, 'dirt')
      .setOrigin(0).setDepth(-998).setAlpha(0.45);
  }

  addSolid(x, y, w, h, group = this.solids) {
    const z = this.add.zone(x, y, w, h);
    this.physics.add.existing(z, true);
    group.add(z);
    return z;
  }

  buildCastle() {
    // Wall ring: each 64px block is a Structure with its own health.
    this.wallBlocks = new Map();
    for (const b of WALL_BLOCKS) {
      const key = `${b.x},${b.y}`;
      const baseY = b.y + 32;
      const img = this.add.image(b.x, baseY, 'wall').setOrigin(0.5, 1).setDepth(baseY);
      const collider = this.addSolid(b.x, b.y + 4, 64, 56);
      const s = new Structure(this, {
        kind: 'wall',
        key,
        name: 'Wall',
        rect: new Phaser.Geom.Rectangle(b.x - 32, b.y - 24, 64, 56),
        img,
        liveTexture: 'wall',
        ruinTexture: 'wall_ruin',
        colliders: [collider],
        maxHp: STRUCTURE_HP.wall,
        alive: !b.ruined,
      });
      s.blockX = b.x;
      s.blockY = b.y;
      this.wallBlocks.set(key, s);
      this.addStructure(s);
    }

    // Gate: pillars block everyone, the doorway blocks only enemies.
    const gateBase = GATE.y + 32;
    const gateImg = this.add.image(GATE.x, gateBase, 'gate_ruin').setOrigin(0.5, 1).setDepth(gateBase);
    const pillarL = this.addSolid(GATE.x - 80, GATE.y + 4, 32, 56);
    const pillarR = this.addSolid(GATE.x + 80, GATE.y + 4, 32, 56);
    const doorway = this.addSolid(GATE.x, GATE.y + 4, 128, 40, this.enemyBlockers);
    this.gate = new Structure(this, {
      kind: 'gate',
      name: 'Gate',
      rect: new Phaser.Geom.Rectangle(GATE.x - 96, GATE.y - 24, 192, 56),
      img: gateImg,
      liveTexture: 'gate',
      ruinTexture: 'gate_ruin',
      colliders: [pillarL, pillarR, doorway],
      maxHp: STRUCTURE_HP.gate,
      alive: false,
    });
    this.addStructure(this.gate);

    // Command Keep: the goal of every enemy. Its destruction ends the run.
    const keepImg = this.add.image(KEEP_POS.x, KEEP_POS.y + 80, 'keep').setOrigin(0.5, 1).setDepth(KEEP_POS.y + 80);
    const keepRect = new Phaser.Geom.Rectangle(KEEP_POS.x - 98, KEEP_POS.y + 10, 196, 70);
    this.addSolid(keepRect.centerX, keepRect.centerY, keepRect.width, keepRect.height);
    this.add.ellipse(KEEP_POS.x, KEEP_POS.y + 80, 220, 30, 0x000000, 0.2).setDepth(-500);
    this.keep = new Structure(this, {
      kind: 'keep',
      name: 'Command Keep',
      rect: keepRect,
      img: keepImg,
      maxHp: KEEP.maxHealth,
      alive: true,
    });
    this.structures.push(this.keep);
    this.field.setGoalRect(keepRect.x, keepRect.y, keepRect.width, keepRect.height);
  }

  addStructure(s) {
    this.structures.push(s);
    this.field.addStructure(s);
  }

  buildNodes() {
    this.nodes = [];
    for (const t of TREES) this.nodes.push(new ResourceNode(this, 'tree', t.x, t.y, this.solids, t));
    for (const r of ROCKS) this.nodes.push(new ResourceNode(this, 'rock', r.x, r.y, this.solids, r));
    // Trees and rocks are obstacles for enemy routing (depleted or not, to keep the field stable).
    for (const n of this.nodes) {
      const b = n.blocker;
      this.field.blockRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
    }
  }

  buildSites() {
    for (const layout of CONSTRUCTION_SITES) {
      const base = BUILDINGS[layout.building];
      this.addSite(layout, layout.cost ? { ...base, cost: layout.cost } : base);
    }
    this.refreshSiteLocks();
  }

  addSite(layout, building) {
    const site = new ConstructionSite(this, layout, building);
    site.on('deposit', () => SoundFX.deposit());
    site.on('needGold', (s, missing) => {
      this.events.emit('toast', `Need ${missing} more gold to finish the ${s.building.name}.`);
      SoundFX.denied();
    });
    site.on('buildStart', () => SoundFX.buildStart());
    site.on('complete', (s) => this.onSiteComplete(s));
    this.sites.push(site);
    return site;
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
      this.gate.restore();
      this.popIn(this.gate.img);
      if (L.id === 'gate_main') this.waves.onGateRepaired();
    } else if (L.building === 'wall' || L.building === 'wallSection') {
      for (const key of L.blocks || []) {
        const blk = this.wallBlocks.get(key);
        if (!blk) continue;
        blk.restore();
        this.popIn(blk.img);
      }
    } else {
      const baseY = L.y + L.h / 2 - 10;
      const img = this.add.image(L.x, baseY, b.texture).setOrigin(0.5, 1).setDepth(baseY);
      if (b.body) {
        this.addSolid(L.x, baseY - b.body.h / 2, b.body.w, b.body.h);
        this.field.blockRect(L.x - b.body.w / 2, baseY - b.body.h, b.body.w, b.body.h);
      }
      this.popIn(img);
    }
    this.ensurePlayerFree(L);
    this.fx.burst(L.x, L.y);
    SoundFX.buildDone();
    this.cameras.main.shake(180, 0.004);
    this.events.emit('toast', `${b.name} ${b.verb === 'Repair' ? 'repaired' : 'built'}!`);
    this.events.emit('building-complete', site);
    if (L.dynamic) this.sites = this.sites.filter((s) => s !== site);
    this.refreshSiteLocks();
  }

  popIn(img) {
    img.setScale(0.6, 0.2);
    this.tweens.add({ targets: img, scaleX: 1, scaleY: 1, duration: 450, ease: 'Back.easeOut' });
  }

  /** Never leave the hero stuck inside a freshly finished structure. */
  ensurePlayerFree(layout) {
    const body = this.player.body;
    if (!body.enable) return;
    const overlapping = this.physics.overlapRect(body.x, body.y, body.width, body.height, false, true)
      .some((b) => b.enable && b !== body && this.solids.contains(b.gameObject));
    if (overlapping && layout.safeSpot) this.player.teleport(layout.safeSpot.x, layout.safeSpot.y);
  }

  /* ---------------- structure events ---------------- */

  onStructureHit(s) {
    const now = this.time.now;
    if (!this.lastStructureSound || now - this.lastStructureSound > 180) {
      this.lastStructureSound = now;
      SoundFX.structureHit();
    }
    if (s.kind === 'keep') this.events.emit('keep-hit', s);
  }

  onStructureDestroyed(s) {
    this.field.dirty = true;
    this.fx.burst(s.centerX, s.centerY);
    SoundFX.structureBreak();
    this.cameras.main.shake(220, 0.006);
    if (s.kind === 'keep') {
      this.onDefeat();
      return;
    }
    this.events.emit('toast', `The ${s.name.toLowerCase()} has been breached!`);
    this.createRepairSite(s);
  }

  onStructureRestored() {
    this.field.dirty = true;
  }

  /** A destroyed wall section or gate gets a repair square straight away. */
  createRepairSite(s) {
    this.repairCounter += 1;
    let layout;
    let building;
    if (s.kind === 'gate') {
      building = BUILDINGS.gate;
      layout = { id: `repair_gate_${this.repairCounter}`, building: 'gate', x: GATE.x, y: GATE.y, w: 208, h: 112, dynamic: true };
    } else {
      building = BUILDINGS.wallSection;
      const side = s.blockX === CASTLE.left + 32 || s.blockX === CASTLE.right - 32;
      const topOrBottom = s.blockY === CASTLE.top + 32 || s.blockY === CASTLE.bottom - 32;
      const vertical = side && !topOrBottom;
      const toCx = Math.sign(CASTLE.centerX - s.blockX);
      const toCy = Math.sign(CASTLE.centerY - s.blockY);
      layout = {
        id: `repair_${s.key}_${this.repairCounter}`,
        building: 'wallSection',
        x: s.blockX,
        y: s.blockY,
        w: vertical ? 96 : 64,
        h: vertical ? 64 : 96,
        blocks: [s.key],
        safeSpot: vertical ? { x: s.blockX + toCx * 72, y: s.blockY } : { x: s.blockX, y: s.blockY + toCy * 72 },
        dynamic: true,
      };
    }
    const site = this.addSite(layout, building);
    site.setLabelResolution(this.labelResolution);
    site.open();
  }

  onDefeat() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.player.body.setVelocity(0, 0);
    const stats = {
      wavesSurvived: this.waves.completed,
      reachedWave: this.waves.state === 'active' ? this.waves.current.number : this.waves.nextNumber,
      kills: this.enemies.kills,
      deaths: this.combat.deaths,
      seconds: Math.round(this.elapsed),
    };
    const saved = Storage.getJSON('stats', { version: 1, bestWave: 0 });
    stats.previousBest = saved.bestWave || 0;
    stats.newBest = stats.wavesSurvived > stats.previousBest;
    if (stats.newBest) Storage.setJSON('stats', { version: 1, bestWave: stats.wavesSurvived });
    stats.bestWave = Math.max(stats.previousBest, stats.wavesSurvived);
    SoundFX.defeat();
    Platform.gameplayStop();
    this.events.emit('defeat', stats);
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
    if (this.gameOver) {
      this.player.body.setVelocity(0, 0);
      return;
    }
    this.elapsed += dt;
    this.player.update(dt, this.keys);
    this.waves.update(dt);
    this.enemies.update(dt);
    this.combat.update(dt);
    this.harvest.update(dt);
    this.updateSites(dt);
    this.tutorial.update();
  }

  updateSites(dt) {
    const p = this.player;
    // The single square that receives deliveries: the nearest one containing the hero.
    let active = null;
    let bestD = Infinity;
    for (const s of this.sites) {
      if (s.status !== 'open' || !s.contains(p.x, p.y)) continue;
      const d = Math.hypot(s.layout.x - p.x, s.layout.y - p.y);
      if (d < bestD) {
        bestD = d;
        active = s;
      }
    }
    for (const s of this.sites) {
      s.update(dt, p, this.inventory, this.economy, this.fx, s === active);
      if (s.status === 'open') {
        s.setDetailed(Math.hypot(s.layout.x - p.x, s.layout.y - p.y) < LABEL_DETAIL_DISTANCE || s.layout.tutorial);
      }
    }
  }

  lateUpdate() {
    if (!this.player) return;
    this.player.syncVisuals();
    this.enemies.syncVisuals();
    this.drawBars();
    const cam = this.cameras.main;
    const dt = this.lastDt || 1 / 60;
    const k = 1 - Math.exp(-dt * 9);
    const tx = this.player.x - cam.width / 2;
    const ty = this.player.y - 24 - cam.height / 2;
    cam.setScroll(cam.scrollX + (tx - cam.scrollX) * k, cam.scrollY + (ty - cam.scrollY) * k);
  }

  /** All world-space health bars in one Graphics object, redrawn each frame. */
  drawBars() {
    const g = this.bars;
    g.clear();
    const bar = (x, y, w, h, frac, color) => {
      g.fillStyle(0x1d1d26, 0.85).fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
      g.fillStyle(color, 1).fillRect(x - w / 2, y, w * Phaser.Math.Clamp(frac, 0, 1), h);
    };
    for (const e of this.enemies.active) {
      if (e.dying || e.hp >= e.maxHp) continue;
      bar(e.x, e.y - 58 * e.def.scale, 26, 4, e.hp / e.maxHp, 0xff5a4a);
    }
    for (const s of this.structures) {
      if (!s.damaged) continue;
      const w = s.kind === 'keep' ? 120 : Math.min(60, s.rect.width - 8);
      const y = s.kind === 'keep' ? s.rect.y - 150 : s.rect.y - 22;
      bar(s.centerX, y, w, 5, s.hp / s.maxHp, s.kind === 'keep' ? 0x5b8fe0 : 0xf5c542);
    }
    const p = this.player;
    if (p.alive && p.health < p.maxHealth) bar(p.x, p.y - 64, 30, 4, p.health / p.maxHealth, 0x7bd88f);
  }
}
