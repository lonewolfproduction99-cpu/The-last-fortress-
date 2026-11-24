// Lightweight pooled visual feedback: chips, dust, flying resource icons, floating text.
import Phaser from 'phaser';

const FONT = '"Trebuchet MS", Verdana, sans-serif';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    const base = { lifespan: 450, speed: { min: 60, max: 150 }, gravityY: 300, scale: { start: 0.9, end: 0.2 }, emitting: false };
    this.chips = {
      wood: scene.add.particles(0, 0, 'particle', { ...base, tint: [0xc8874a, 0x8a5a2b, 0x3d8a47] }).setDepth(99990),
      stone: scene.add.particles(0, 0, 'particle', { ...base, tint: [0xb8c0c8, 0x6f7782] }).setDepth(99990),
    };
    this.dustEmitter = scene.add.particles(0, 0, 'particle', {
      lifespan: 600, speed: { min: 10, max: 40 }, angle: { min: 200, max: 340 }, scale: { start: 1.6, end: 0.2 },
      alpha: { start: 0.6, end: 0 }, tint: 0xd9c8a0, emitting: false,
    }).setDepth(99990);
    this.sparkle = scene.add.particles(0, 0, 'particle', {
      lifespan: 800, speed: { min: 80, max: 220 }, scale: { start: 1.2, end: 0 }, gravityY: 120,
      tint: [0xffffff, 0xf5c542, 0x7bd88f], emitting: false,
    }).setDepth(99990);

    this.iconPool = [];
    this.textPool = [];
  }

  chipsAt(resource, x, y) {
    const e = this.chips[resource] || this.chips.stone;
    e.explode(6, x, y);
  }

  hitSpark(x, y) {
    this.sparkle.explode(8, x, y);
  }

  dust(x, y) {
    this.dustEmitter.explode(2, x, y);
  }

  burst(x, y) {
    this.sparkle.explode(36, x, y);
    for (let i = 0; i < 10; i++) this.dustEmitter.explode(2, x + Phaser.Math.Between(-50, 50), y + Phaser.Math.Between(-10, 20));
  }

  getIcon(key) {
    const img = this.iconPool.pop() || this.scene.add.image(0, 0, key);
    return img.setTexture(key).setVisible(true).setActive(true).setAlpha(1).setScale(1).setDepth(99995);
  }

  releaseIcon(img) {
    img.setVisible(false).setActive(false);
    this.iconPool.push(img);
  }

  /** Icon pops from (x,y) upward, e.g. "+1 wood" when harvesting. */
  popIcon(key, x, y) {
    const img = this.getIcon(key).setPosition(x, y);
    this.scene.tweens.add({
      targets: img, y: y - 34, alpha: { from: 1, to: 0 }, duration: 650, ease: 'Cubic.easeOut',
      onComplete: () => this.releaseIcon(img),
    });
  }

  /** Icon flies in an arc from one point to another (deposits). */
  flyIcon(key, fromX, fromY, toX, toY) {
    const img = this.getIcon(key).setPosition(fromX, fromY);
    const midY = Math.min(fromY, toY) - 50;
    const t = { p: 0 };
    this.scene.tweens.add({
      targets: t, p: 1, duration: 320, ease: 'Sine.easeIn',
      onUpdate: () => {
        const p = t.p;
        const x = Phaser.Math.Linear(fromX, toX, p);
        const y = (1 - p) * (1 - p) * fromY + 2 * (1 - p) * p * midY + p * p * toY;
        img.setPosition(x, y).setScale(1 - p * 0.4);
      },
      onComplete: () => this.releaseIcon(img),
    });
  }

  floatText(x, y, text, color = '#ffffff') {
    let t = this.textPool.pop();
    if (!t) {
      t = this.scene.add.text(0, 0, '', {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#fff', stroke: '#1d1d26', strokeThickness: 4,
      }).setOrigin(0.5);
    }
    t.setResolution(this.scene.labelResolution || 1);
    t.setText(text).setColor(color).setPosition(x, y).setAlpha(1).setVisible(true).setDepth(99996);
    this.scene.tweens.add({
      targets: t, y: y - 40, alpha: 0, duration: 1100, ease: 'Cubic.easeOut',
      onComplete: () => { t.setVisible(false); this.textPool.push(t); },
    });
  }
}
