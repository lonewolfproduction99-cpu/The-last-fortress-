// Screen-space HUD drawn on top of the world: bars, inventory, gold, objective,
// toasts, the touch joystick and the pause menu. Sized in device pixels.
import Phaser from 'phaser';
import { COLORS } from '../config/GameConfig.js';
import { VirtualJoystick } from '../input/VirtualJoystick.js';
import { InputState } from '../input/InputState.js';
import { getSafeArea } from '../ui/SafeArea.js';
import { Settings } from '../systems/Settings.js';
import { SoundFX } from '../systems/SoundFX.js';
import { Platform } from '../platform/Platform.js';
import { getPixelRatio } from '../platform/Display.js';
import { Minimap } from '../ui/Minimap.js';

const FONT = '"Trebuchet MS", Verdana, sans-serif';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.gameScene = this.scene.get('Game');
    this.paused = false;
    this.defeated = null;
    this.toastTimer = 0;
    this.lastKeepWarning = -99999;

    this.hud = this.add.container(0, 0);
    this.minimap = new Minimap(this);
    this.joystick = new VirtualJoystick(this);
    this.arrow = this.add.graphics().setDepth(40);

    this.buildHud();
    this.scale.on('resize', this.onResize, this);

    // Listeners on GameScene emitters are tracked and removed when this scene shuts
    // down, because both scenes are restarted together on a new run.
    this.gsListeners = [];
    const gs = this.gameScene;
    this.listen(gs.inventory, 'changed', () => this.refreshInventory());
    this.listen(gs.economy, 'changed', (gold, delta) => {
      this.refreshGold();
      if (delta > 0) this.bump(this.goldText);
    });
    this.listen(gs.events, 'toast', (msg) => this.toast(msg));
    this.listen(gs.events, 'bag-full', () => this.toast('Bag full! Deliver materials to a glowing square.'));
    this.listen(gs.events, 'wave-start', (wave, dirText) => {
      this.toast(`${wave.milestone ? `${wave.title}! ` : ''}Wave ${wave.number} attacks from ${dirText}!`, '#ff9f8a');
    });
    this.listen(gs.events, 'wave-complete', (wave) => {
      SoundFX.waveClear();
      this.toast(`Wave ${wave.number} survived!  +${wave.clearBonus} gold`, '#9ff0a8');
    });
    this.listen(gs.events, 'keep-hit', () => {
      this.flashKeepBar = 0.25;
      if (this.time.now - this.lastKeepWarning > 8000) {
        this.lastKeepWarning = this.time.now;
        this.toast('The Command Keep is under attack!', '#ff9f8a');
      }
    });
    this.listen(gs.events, 'hero-died', () => this.toast('Your hero has fallen!', '#ff9f8a'));
    this.listen(gs.events, 'defeat', (stats) => this.showDefeat(stats));

    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      for (const [em, ev, fn] of this.gsListeners) em.off(ev, fn);
      this.gsListeners = [];
    });

    // Keyboard shortcuts.
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => this.togglePause());
      this.input.keyboard.on('keydown-P', () => this.togglePause());
      this.input.keyboard.on('keydown-M', () => this.toggleMute());
    }

    // Unlock audio on the first gesture, and again after returning from background (iOS).
    const unlock = () => { if (!this.paused) SoundFX.unlock(); };
    this.input.on('pointerup', unlock);
    if (this.input.keyboard) this.input.keyboard.on('keydown', unlock);

    // Focus loss: pause the game (platform handles its own gameplay events for this).
    this.game.events.on('hidden', this.onHidden, this);
    this.game.events.on('blur', this.onHidden, this);
    this.events.once('shutdown', () => {
      this.game.events.off('hidden', this.onHidden, this);
      this.game.events.off('blur', this.onHidden, this);
    });
  }

  listen(emitter, event, fn) {
    emitter.on(event, fn);
    this.gsListeners.push([emitter, event, fn]);
  }

  /* ---------------- layout ---------------- */

  onResize() {
    this.hud.removeAll(true);
    if (this.pauseLayer) {
      this.pauseLayer.destroy();
      this.pauseLayer = null;
    }
    if (this.defeatLayer) {
      this.defeatLayer.destroy();
      this.defeatLayer = null;
    }
    this.buildHud();
    if (this.defeated) this.showDefeat(this.defeated);
    else if (this.paused) this.showPauseMenu();
  }

  computeMetrics() {
    const { width, height } = this.scale;
    const dpr = getPixelRatio();
    const cssW = width / dpr;
    const cssH = height / dpr;
    const s = dpr * Phaser.Math.Clamp(Math.min(cssW / 1000, cssH / 560), 0.8, 1.35);
    const safe = getSafeArea();
    const m = 10 * s;
    return {
      width, height, s, dpr,
      left: safe.left * dpr + m,
      right: width - safe.right * dpr - m,
      top: safe.top * dpr + m,
      bottom: height - safe.bottom * dpr - m,
    };
  }

  text(x, y, str, size, color = COLORS.text, style = {}) {
    return this.add.text(x, y, str, {
      fontFamily: FONT, fontSize: `${Math.round(size)}px`, fontStyle: 'bold', color,
      stroke: '#1d1d26', strokeThickness: Math.max(2, Math.round(size / 5)), ...style,
    });
  }

  panel(x, y, w, h, alpha = 0.78) {
    const g = this.add.graphics();
    const r = 8 * this.M.s;
    g.fillStyle(COLORS.panel, alpha).fillRoundedRect(x, y, w, h, r);
    g.lineStyle(Math.max(2, 2 * this.M.s), COLORS.panelEdge, 1).strokeRoundedRect(x, y, w, h, r);
    return g;
  }

  buildHud() {
    const M = (this.M = this.computeMetrics());
    const s = M.s;
    const H = this.hud;

    // --- Top-left: Keep + Hero health, carried materials ---
    const pw = 230 * s;
    const ph = 98 * s;
    H.add(this.panel(M.left, M.top, pw, ph));
    const barX = M.left + 64 * s;
    const barW = pw - 74 * s;
    H.add(this.text(M.left + 10 * s, M.top + 8 * s, 'Keep', 14 * s));
    H.add(this.text(M.left + 10 * s, M.top + 30 * s, 'Hero', 14 * s));
    this.keepBar = this.add.graphics();
    this.heroBar = this.add.graphics();
    this.keepBarRect = { x: barX, y: M.top + 10 * s, w: barW, h: 15 * s };
    this.heroBarRect = { x: barX, y: M.top + 32 * s, w: barW, h: 15 * s };
    this.keepBarText = this.text(barX + barW / 2, M.top + 17.5 * s, '', 11 * s).setOrigin(0.5);
    this.heroBarText = this.text(barX + barW / 2, M.top + 39.5 * s, '', 11 * s).setOrigin(0.5);
    H.add([this.keepBar, this.heroBar, this.keepBarText, this.heroBarText]);

    const rowY = M.top + 66 * s;
    this.invTexts = {};
    ['wood', 'stone', 'iron'].forEach((t, i) => {
      const x = M.left + 12 * s + i * 56 * s;
      H.add(this.add.image(x + 9 * s, rowY, `icon_${t}`).setScale(s * 1.05));
      const txt = this.text(x + 22 * s, rowY, '0', 15 * s).setOrigin(0, 0.5);
      this.invTexts[t] = txt;
      H.add(txt);
    });
    this.invTexts.iron.setAlpha(0.35);
    this.bagText = this.text(M.left + pw - 10 * s, rowY - 1 * s, '', 12 * s, COLORS.textDim).setOrigin(1, 0.5);
    this.bagBar = this.add.graphics();
    this.bagBarRect = { x: M.left + 10 * s, y: M.top + ph - 10 * s, w: pw - 20 * s, h: 5 * s };
    H.add([this.bagText, this.bagBar]);

    // --- Top-right: gold and pause button ---
    const btn = 44 * s;
    const pauseX = M.right - btn;
    H.add(this.panel(pauseX, M.top, btn, btn));
    const pg = this.add.graphics();
    pg.fillStyle(0xfff8e7, 1).fillRect(pauseX + btn * 0.32, M.top + btn * 0.27, btn * 0.12, btn * 0.46)
      .fillRect(pauseX + btn * 0.56, M.top + btn * 0.27, btn * 0.12, btn * 0.46);
    H.add(pg);
    const pauseHit = this.add.zone(pauseX, M.top, btn, btn).setOrigin(0).setInteractive({ useHandCursor: true });
    pauseHit.on('pointerdown', () => this.togglePause());
    H.add(pauseHit);

    const gw = 110 * s;
    const gx = pauseX - 8 * s - gw;
    H.add(this.panel(gx, M.top, gw, btn));
    H.add(this.add.image(gx + 20 * s, M.top + btn / 2, 'icon_gold').setScale(s * 1.2));
    this.goldText = this.text(gx + 36 * s, M.top + btn / 2, '0', 18 * s, '#f5d77a').setOrigin(0, 0.5);
    H.add(this.goldText);

    // --- Minimap (under gold / pause) ---
    const mmW = Math.min(150 * s, M.right - gx);
    this.minimap.layout(M.right - mmW, M.top + btn + 8 * s, mmW, s);

    // --- Top-centre: wave panel, then objective ---
    const leftEdge = M.left + pw + 10 * s;
    const rightEdge = gx - 10 * s;
    const ow = Math.max(160 * s, rightEdge - leftEdge);
    this.objX = (leftEdge + rightEdge) / 2;
    const waveH = 34 * s;
    this.waveBg = this.add.graphics();
    this.waveText = this.text(this.objX, M.top + waveH / 2, '', 16 * s).setOrigin(0.5);
    this.waveRect = { y: M.top, h: waveH };
    H.add([this.waveBg, this.waveText]);
    this.lastWaveText = null;

    // "Start now" button, shown during preparation.
    const sbW = 116 * s;
    const sbH = 30 * s;
    this.startBtn = this.add.container(0, 0);
    const sbg = this.add.graphics();
    sbg.fillStyle(0x3f7a3a, 1).fillRoundedRect(-sbW / 2, -sbH / 2, sbW, sbH, 8 * s);
    sbg.lineStyle(2 * s, 0x1d1d26, 1).strokeRoundedRect(-sbW / 2, -sbH / 2, sbW, sbH, 8 * s);
    const stx = this.text(0, 0, 'Start now ▶', 14 * s).setOrigin(0.5);
    const shit = this.add.zone(0, 0, sbW, sbH).setInteractive({ useHandCursor: true });
    shit.on('pointerdown', () => this.startWaveEarly());
    this.startBtn.add([sbg, stx, shit]);
    this.startBtn.setPosition(this.objX, M.top + waveH + 6 * s + sbH / 2).setVisible(false);
    this.startBtnH = sbH + 6 * s;
    H.add(this.startBtn);

    this.objBg = this.add.graphics();
    this.objTopBase = M.top + waveH + 6 * s;
    this.objText = this.text(this.objX, this.objTopBase + 7 * s, '', 13 * s, COLORS.text, {
      align: 'center', wordWrap: { width: ow - 24 * s },
    }).setOrigin(0.5, 0);
    this.objW = ow;
    H.add([this.objBg, this.objText]);
    this.lastObjective = null;
    this.lastObjOffset = null;

    // --- Respawn countdown (centre) ---
    this.respawnText = this.text(M.width / 2, M.height * 0.5, '', 26 * s, '#ffd0c4', { align: 'center' }).setOrigin(0.5).setVisible(false);
    H.add(this.respawnText);

    // --- Toast (centre) ---
    this.toastText = this.text(M.width / 2, M.height * 0.3, '', 18 * s, '#fff2b0', {
      align: 'center', wordWrap: { width: M.width * 0.7 },
    }).setOrigin(0.5).setAlpha(0);
    H.add(this.toastText);

    // --- Version (bottom-right) ---
    H.add(this.text(M.right, M.bottom, `${__BUILD_VERSION__} · ${Platform.environment}`, 10 * s, '#ffffffaa', { strokeThickness: 2 })
      .setOrigin(1, 1));

    // --- Joystick ---
    const r = 58 * s;
    this.joystick.layout(r, M.left + r + 20 * s, M.bottom - r - 20 * s, M.width * 0.5);

    this.refreshInventory();
    this.refreshGold();
    this.refreshBars();
  }

  /* ---------------- refresh ---------------- */

  drawBar(g, r, frac, color) {
    g.clear();
    g.fillStyle(0x000000, 0.55).fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle(color, 1).fillRect(r.x, r.y, r.w * Phaser.Math.Clamp(frac, 0, 1), r.h);
    g.lineStyle(Math.max(1, this.M.s), 0x1d1d26, 1).strokeRect(r.x, r.y, r.w, r.h);
  }

  refreshBars() {
    const gs = this.gameScene;
    const keepColor = this.flashKeepBar > 0 ? 0xff6b5b : 0x5b8fe0;
    this.drawBar(this.keepBar, this.keepBarRect, gs.keep.hp / gs.keep.maxHp, keepColor);
    this.keepBarText.setText(`${Math.ceil(gs.keep.hp)}/${gs.keep.maxHp}`);
    const p = gs.player;
    this.drawBar(this.heroBar, this.heroBarRect, p.health / p.maxHealth, 0xd94c4c);
    this.heroBarText.setText(`${Math.ceil(p.health)}/${p.maxHealth}`);
  }

  refreshInventory() {
    const inv = this.gameScene.inventory;
    for (const t of ['wood', 'stone', 'iron']) this.invTexts[t].setText(String(inv.count(t)));
    this.bagText.setText(`Bag ${inv.total}/${inv.capacity}`).setColor(inv.isFull ? '#ffb86b' : COLORS.textDim);
    this.drawBar(this.bagBar, this.bagBarRect, inv.total / inv.capacity, inv.isFull ? 0xffb86b : 0xf5c542);
  }

  refreshGold() {
    this.goldText.setText(String(this.gameScene.economy.gold));
  }

  bump(obj) {
    this.tweens.add({ targets: obj, scale: { from: 1.3, to: 1 }, duration: 250, ease: 'Back.easeOut' });
  }

  toast(msg, color = '#fff2b0') {
    this.toastText.setText(msg).setColor(color).setAlpha(1);
    this.toastText.setScale(0.9);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2200, duration: 500 });
  }

  update(time, deltaMs) {
    const gs = this.gameScene;
    if (!gs || !gs.tutorial) return;
    const dt = deltaMs / 1000;
    if (this.flashKeepBar > 0) this.flashKeepBar -= dt;
    this.refreshBars();
    this.updateWavePanel();
    this.updateObjective();
    if (!this.paused) this.minimap.update(dt, gs);
    const r = gs.combat.respawnRemaining;
    this.respawnText.setVisible(r > 0 && !this.defeated);
    if (r > 0) this.respawnText.setText(`Respawning at the keep in ${Math.ceil(r)}…`);
  }

  updateWavePanel() {
    const w = this.gameScene.waves;
    const M = this.M;
    const s = M.s;
    let text;
    if (w.state === 'active') {
      const left = w.remainingEnemies;
      text = `${w.current.milestone ? '⚔ ' : ''}Wave ${w.current.number}  ·  ${left} ${left === 1 ? 'enemy' : 'enemies'} left`;
    } else {
      const secs = Math.max(0, Math.ceil(w.timer));
      const mm = Math.floor(secs / 60);
      const ss = String(secs % 60).padStart(2, '0');
      text = `Wave ${w.nextNumber} in ${mm}:${ss}`;
    }
    if (text !== this.lastWaveText) {
      this.lastWaveText = text;
      this.waveText.setText(text);
      const bw = this.waveText.width + 28 * s;
      this.waveBg.clear();
      const danger = w.state === 'active';
      this.waveBg.fillStyle(danger ? 0x5a1f1a : COLORS.panel, 0.88).fillRoundedRect(this.objX - bw / 2, this.waveRect.y, bw, this.waveRect.h, 8 * s);
      this.waveBg.lineStyle(Math.max(2, 2 * s), danger ? 0xb84a3a : COLORS.panelEdge, 1)
        .strokeRoundedRect(this.objX - bw / 2, this.waveRect.y, bw, this.waveRect.h, 8 * s);
    }
    const showStart = w.canStartEarly && !this.defeated;
    if (showStart !== this.startBtn.visible) this.startBtn.setVisible(showStart);
  }

  startWaveEarly() {
    if (this.paused || this.defeated) return;
    SoundFX.click();
    const bonus = this.gameScene.waves.startEarly();
    if (bonus > 0) this.toast(`Early start bonus: +${bonus} gold`, '#f5d77a');
  }

  updateObjective() {
    const obj = this.gameScene.tutorial.objective;
    const M = this.M;
    const s = M.s;
    const offset = this.startBtn.visible ? this.startBtnH : 0;
    if (obj.text !== this.lastObjective || offset !== this.lastObjOffset) {
      const changed = obj.text !== this.lastObjective;
      this.lastObjective = obj.text;
      this.lastObjOffset = offset;
      const top = this.objTopBase + offset;
      this.objText.setText(obj.text).setY(top + 7 * s);
      const w = Math.min(this.objW, this.objText.width + 24 * s);
      const h = this.objText.height + 14 * s;
      this.objBg.clear();
      if (obj.text) {
        this.objBg.fillStyle(0x1d1d26, 0.6).fillRoundedRect(this.objX - w / 2, top, w, h, 8 * s);
        // Only animate real objective changes, not countdown ticks.
        if (changed && !/\d+s/.test(obj.text)) this.bump(this.objText);
      }
    }
    this.drawPointer(obj.target);
  }

  /** Edge arrow when the objective is off-screen, bouncing marker when on-screen. */
  drawPointer(target) {
    const g = this.arrow;
    g.clear();
    if (!target || this.paused || this.defeated) return;
    const cam = this.gameScene.cameras.main;
    const M = this.M;
    const s = M.s;
    const sx = (target.x - cam.worldView.x) * cam.zoom;
    const sy = (target.y - cam.worldView.y) * cam.zoom;
    const margin = 40 * s;
    const t = this.time.now / 1000;
    if (sx > margin && sx < M.width - margin && sy > margin * 3 && sy < M.height - margin) {
      const bob = Math.sin(t * 6) * 6 * s;
      const y = sy - 18 * s + bob;
      const w = 14 * s;
      g.fillStyle(0xfff2b0, 1).fillTriangle(sx - w, y - w, sx + w, y - w, sx, y + w * 0.6);
      g.lineStyle(2 * s, 0x1d1d26, 1).strokeTriangle(sx - w, y - w, sx + w, y - w, sx, y + w * 0.6);
      return;
    }
    const cx = M.width / 2;
    const cy = M.height / 2;
    const ang = Math.atan2(sy - cy, sx - cx);
    const ex = Phaser.Math.Clamp(cx + Math.cos(ang) * M.width, margin, M.width - margin);
    const ey = Phaser.Math.Clamp(cy + Math.sin(ang) * M.height, margin * 3, M.height - margin);
    const len = 22 * s;
    const pts = [
      [ex + Math.cos(ang) * len, ey + Math.sin(ang) * len],
      [ex + Math.cos(ang + 2.5) * len * 0.8, ey + Math.sin(ang + 2.5) * len * 0.8],
      [ex + Math.cos(ang - 2.5) * len * 0.8, ey + Math.sin(ang - 2.5) * len * 0.8],
    ];
    const a = 0.75 + Math.sin(t * 6) * 0.25;
    g.fillStyle(0xfff2b0, a).fillTriangle(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    g.lineStyle(2 * s, 0x1d1d26, a).strokeTriangle(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
  }

  /* ---------------- pause / settings ---------------- */

  onHidden() {
    if (!this.paused && !this.defeated) this.setPaused(true, { fromFocusLoss: true });
    SoundFX.suspend();
  }

  togglePause() {
    if (this.defeated) return;
    SoundFX.click();
    this.setPaused(!this.paused);
  }

  setPaused(paused, opts = {}) {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      this.scene.pause('Game');
      this.joystick.setEnabled(false);
      InputState.clearJoystick();
      if (!opts.fromFocusLoss) Platform.gameplayStop();
      this.showPauseMenu();
    } else {
      if (this.pauseLayer) {
        this.pauseLayer.destroy();
        this.pauseLayer = null;
      }
      SoundFX.resume();
      SoundFX.unlock();
      this.joystick.setEnabled(true);
      this.scene.resume('Game');
      Platform.gameplayStart();
    }
  }

  toggleMute() {
    Settings.set('muted', !Settings.get('muted'));
    SoundFX.refreshVolume();
    if (this.soundBtnText) this.soundBtnText.setText(this.soundLabel());
  }

  soundLabel() {
    if (Platform.platformMuted) return 'Sound: Off (platform)';
    return Settings.get('muted') ? 'Sound: Off' : 'Sound: On';
  }

  button(layer, x, y, w, h, label, onClick) {
    const s = this.M.s;
    const g = this.add.graphics();
    const draw = (hover) => {
      g.clear();
      g.fillStyle(hover ? 0x8a6a3f : 0x6b5233, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 10 * s);
      g.lineStyle(3 * s, 0x2a2218, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10 * s);
    };
    draw(false);
    const t = this.text(x, y, label, 20 * s).setOrigin(0.5);
    const hit = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerup', () => onClick());
    layer.add([g, t, hit]);
    return t;
  }

  showPauseMenu() {
    const M = this.M;
    const s = M.s;
    const layer = (this.pauseLayer = this.add.container(0, 0).setDepth(100));
    const dim = this.add.rectangle(0, 0, M.width, M.height, 0x000000, 0.55).setOrigin(0).setInteractive();
    layer.add(dim);
    const w = 300 * s;
    const h = 230 * s;
    const cx = M.width / 2;
    const cy = M.height / 2;
    layer.add(this.panel(cx - w / 2, cy - h / 2, w, h, 0.95));
    layer.add(this.text(cx, cy - h / 2 + 30 * s, 'Paused', 26 * s).setOrigin(0.5));
    this.button(layer, cx, cy - 10 * s, w - 60 * s, 48 * s, 'Resume', () => this.togglePause());
    this.soundBtnText = this.button(layer, cx, cy + 52 * s, w - 60 * s, 48 * s, this.soundLabel(), () => {
      SoundFX.unlock();
      this.toggleMute();
      SoundFX.click();
    });
    layer.add(this.text(cx, cy + h / 2 - 18 * s, 'Esc / P: pause   ·   M: mute', 11 * s, COLORS.textDim).setOrigin(0.5));
  }

  /* ---------------- defeat ---------------- */

  showDefeat(stats) {
    this.defeated = stats;
    this.joystick.setEnabled(false);
    InputState.clearJoystick();
    if (this.pauseLayer) {
      this.pauseLayer.destroy();
      this.pauseLayer = null;
    }
    this.paused = false;
    const M = this.M;
    const s = M.s;
    const layer = (this.defeatLayer = this.add.container(0, 0).setDepth(200));
    const dim = this.add.rectangle(0, 0, M.width, M.height, 0x12080a, 0.7).setOrigin(0).setInteractive();
    layer.add(dim);
    const w = Math.min(380 * s, M.width - 40 * s);
    const h = Math.min(300 * s, M.height - 30 * s);
    const cx = M.width / 2;
    const cy = M.height / 2;
    layer.add(this.panel(cx - w / 2, cy - h / 2, w, h, 0.96));
    layer.add(this.text(cx, cy - h / 2 + 30 * s, 'The Keep Has Fallen', 26 * s, '#ff9f8a').setOrigin(0.5));
    const waves = stats.wavesSurvived === 1 ? '1 wave' : `${stats.wavesSurvived} waves`;
    const lines = [
      `Survived ${waves}`,
      `Enemies defeated: ${stats.kills}`,
      stats.newBest ? 'New best!' : `Best: ${stats.bestWave} waves`,
    ];
    layer.add(this.text(cx, cy - 22 * s, lines.join('\n'), 17 * s, COLORS.text, { align: 'center', lineSpacing: 6 * s }).setOrigin(0.5));
    this.button(layer, cx, cy + h / 2 - 44 * s, w - 80 * s, 50 * s, 'Rebuild (New Run)', () => this.restartRun());
    layer.setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 600, delay: 500 });
    this.time.delayedCall(900, () => {
      if (this.defeated) this.scene.pause('Game');
    });
  }

  restartRun() {
    SoundFX.click();
    this.defeated = null;
    Platform.gameplayStart();
    // GameScene recreates everything and relaunches this UI scene.
    this.scene.stop();
    this.scene.start('Game');
  }
}
