// Siege waves: preparation countdown, spawning, completion rewards, early start.
import { WAVE_TIMING, composeWave, DIRECTION_LABELS } from '../config/Waves.js';
import { SPAWN_POINTS } from '../config/MapLayout.js';
import { SoundFX } from './SoundFX.js';

export class WaveManager {
  constructor(scene, enemies, economy) {
    this.scene = scene;
    this.enemies = enemies;
    this.economy = economy;
    this.state = 'waiting'; // waiting (for the first gate repair) | prep | active
    this.timer = WAVE_TIMING.firstWaveFallback;
    this.completed = 0;
    this.current = null;
    this.queue = [];
    this.spawnTimer = 0;
    this.upcoming = composeWave(1);
    this.spawnById = Object.fromEntries(SPAWN_POINTS.map((p) => [p.id, p]));
  }

  get nextNumber() {
    return this.completed + 1;
  }

  get remainingEnemies() {
    return this.queue.length + this.enemies.count;
  }

  get canStartEarly() {
    return this.state === 'prep' && this.timer > 3;
  }

  directionText(wave) {
    return wave.directions.map((d) => DIRECTION_LABELS[d]).join(' and ');
  }

  /** Called when the first gate repair finishes: shorten the first countdown. */
  onGateRepaired() {
    if (this.state === 'waiting') {
      this.state = 'prep';
      this.timer = Math.min(this.timer, WAVE_TIMING.afterGateRepair);
      this.scene.events.emit('wave-warning', this.upcoming, this.directionText(this.upcoming));
    }
  }

  startEarly() {
    if (!this.canStartEarly) return 0;
    const bonus = Math.floor(this.timer / WAVE_TIMING.earlyStartGoldPerSeconds);
    if (bonus > 0) this.economy.earn(bonus);
    this.timer = 0;
    return bonus;
  }

  update(dt) {
    if (this.state === 'waiting' || this.state === 'prep') {
      this.timer -= dt;
      if (this.timer <= 0) this.startWave();
      return;
    }

    // Active: release queued enemies one at a time.
    if (this.queue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const s = this.queue[0];
        const pt = this.enemies.spawnPoint(this.spawnById[s.dir]);
        if (this.enemies.spawn(s.type, pt.x, pt.y, this.current)) {
          this.queue.shift();
          this.spawnTimer = WAVE_TIMING.spawnInterval;
        } else {
          this.spawnTimer = 0.5; // at the active cap: try again shortly
        }
      }
    } else if (this.enemies.count === 0) {
      this.completeWave();
    }
  }

  startWave() {
    this.current = this.upcoming;
    this.queue = this.current.spawns.slice();
    this.spawnTimer = 0;
    this.state = 'active';
    SoundFX.horn();
    this.scene.events.emit('wave-start', this.current, this.directionText(this.current));
  }

  completeWave() {
    const wave = this.current;
    this.completed = wave.number;
    this.economy.earn(wave.clearBonus);
    this.upcoming = composeWave(wave.number + 1);
    this.state = 'prep';
    this.timer = WAVE_TIMING.prepTime;
    this.scene.events.emit('wave-complete', wave);
    this.scene.events.emit('wave-warning', this.upcoming, this.directionText(this.upcoming));
  }
}
