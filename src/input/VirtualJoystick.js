// Floating virtual joystick for touch screens. Touching anywhere in the left
// part of the screen places the stick under the finger; dragging steers.
import { InputState } from './InputState.js';

const DEADZONE = 0.12;

export class VirtualJoystick {
  constructor(scene) {
    this.scene = scene;
    this.pointerId = null;
    this.baseX = 0;
    this.baseY = 0;
    this.radius = 60;
    this.enabled = true;
    this.everTouched = false;
    this.restX = 0;
    this.restY = 0;
    this.gfx = scene.add.graphics().setDepth(50);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.input.on('gameout', () => this.release());
  }

  layout(radius, restX, restY, zoneRight) {
    this.radius = radius;
    this.restX = restX;
    this.restY = restY;
    this.zoneRight = zoneRight;
    this.draw();
  }

  onDown(pointer, over) {
    if (!this.enabled || this.pointerId !== null) return;
    if (over && over.length) return; // a UI button handled it
    if (pointer.x > this.zoneRight) return;
    if (pointer.wasTouch) this.everTouched = true;
    this.pointerId = pointer.id;
    const { width, height } = this.scene.scale;
    const m = this.radius * 1.1;
    this.baseX = Math.min(Math.max(pointer.x, m), width - m);
    this.baseY = Math.min(Math.max(pointer.y, m), height - m);
    this.update(pointer);
  }

  onMove(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.update(pointer);
  }

  onUp(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.release();
  }

  release() {
    this.pointerId = null;
    InputState.clearJoystick();
    this.draw();
  }

  update(pointer) {
    const rx = pointer.x - this.baseX;
    const ry = pointer.y - this.baseY;
    const dist = Math.hypot(rx, ry);
    const ux = dist > 0 ? rx / dist : 0;
    const uy = dist > 0 ? ry / dist : 0;
    const mag = Math.min(dist / this.radius, 1);
    // Ramp smoothly from the deadzone edge to full speed.
    const out = mag < DEADZONE ? 0 : (mag - DEADZONE) / (1 - DEADZONE);
    InputState.setJoystick(ux * out, uy * out);
    this.knobX = this.baseX + ux * mag * this.radius;
    this.knobY = this.baseY + uy * mag * this.radius;
    this.draw();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.release();
    this.draw();
  }

  draw() {
    const g = this.gfx;
    g.clear();
    if (!this.enabled) return;
    const r = this.radius;
    if (this.pointerId !== null) {
      g.fillStyle(0x000000, 0.25).fillCircle(this.baseX, this.baseY, r);
      g.lineStyle(Math.max(2, r * 0.05), 0xffffff, 0.6).strokeCircle(this.baseX, this.baseY, r);
      g.fillStyle(0xffffff, 0.75).fillCircle(this.knobX, this.knobY, r * 0.42);
    } else if (this.everTouched) {
      // Resting hint so touch players know where to steer.
      g.lineStyle(Math.max(2, r * 0.04), 0xffffff, 0.25).strokeCircle(this.restX, this.restY, r);
      g.fillStyle(0xffffff, 0.2).fillCircle(this.restX, this.restY, r * 0.42);
    }
  }
}
