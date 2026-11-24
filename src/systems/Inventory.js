// The hero's carried materials. Gold is NOT carried; it lives in Economy.
import Phaser from 'phaser';
import { RESOURCE_TYPES } from '../config/GameConfig.js';

export class Inventory extends Phaser.Events.EventEmitter {
  constructor(capacity) {
    super();
    this.capacity = capacity;
    this.items = Object.fromEntries(RESOURCE_TYPES.map((t) => [t, 0]));
  }

  get total() {
    let sum = 0;
    for (const t of RESOURCE_TYPES) sum += this.items[t];
    return sum;
  }

  get free() {
    return Math.max(0, this.capacity - this.total);
  }

  get isFull() {
    return this.free <= 0;
  }

  count(type) {
    return this.items[type] || 0;
  }

  /** Adds up to `amount`; returns how many were actually added. */
  add(type, amount = 1) {
    const added = Math.min(amount, this.free);
    if (added > 0) {
      this.items[type] += added;
      this.emit('changed', this);
    }
    return added;
  }

  /** Removes up to `amount`; returns how many were actually removed. */
  remove(type, amount = 1) {
    const removed = Math.min(amount, this.items[type]);
    if (removed > 0) {
      this.items[type] -= removed;
      this.emit('changed', this);
    }
    return removed;
  }

  setCapacity(capacity) {
    this.capacity = capacity;
    this.emit('changed', this);
  }
}
