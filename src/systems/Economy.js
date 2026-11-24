// Shared gold currency.
import Phaser from 'phaser';

export class Economy extends Phaser.Events.EventEmitter {
  constructor(startingGold) {
    super();
    this.gold = startingGold;
  }

  canAfford(amount) {
    return this.gold >= amount;
  }

  /** Spends exactly `amount` if affordable. Returns true on success. */
  spend(amount) {
    if (amount <= 0) return true;
    if (this.gold < amount) return false;
    this.gold -= amount;
    this.emit('changed', this.gold, -amount);
    return true;
  }

  earn(amount) {
    if (amount <= 0) return;
    this.gold += amount;
    this.emit('changed', this.gold, amount);
  }
}
