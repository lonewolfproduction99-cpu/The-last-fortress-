// In-game guidance: one short objective at a time, with a target the UI points at.
// Advances by watching game state, so the player is never forced into menus.

export class Tutorial {
  constructor(scene) {
    this.scene = scene;
    this.step = 'gather';
    this.objective = { text: '', target: null };
  }

  update() {
    const s = this.scene;
    const inv = s.inventory;
    const gate = s.sites.find((x) => x.id === 'gate_main');
    const waves = s.waves;

    if (this.step === 'gather') {
      if (waves.state === 'active' && gate.status === 'open') {
        this.defendObjective();
        return;
      }
      if (gate.status !== 'open') {
        this.step = 'deliver';
      } else {
        const w = Math.min(inv.count('wood') + gate.delivered.wood, gate.cost.wood);
        const st = Math.min(inv.count('stone') + gate.delivered.stone, gate.cost.stone);
        if (w >= gate.cost.wood && st >= gate.cost.stone) {
          this.step = 'deliver';
          s.nodes.forEach((n) => n.setHighlighted(false));
        } else {
          const needWood = w < gate.cost.wood;
          const target = this.nearestNode(needWood ? 'tree' : 'rock');
          const marker = target ? { x: target.x, y: target.y - (target.kind === 'tree' ? 104 : 50) } : null;
          const timer = waves.state === 'waiting' && waves.timer < 60 ? `  ·  Raiders in ${Math.ceil(waves.timer)}s` : '';
          this.set(`Gather materials — walk next to the ${needWood ? 'tree' : 'rock'}.  Wood ${w}/${gate.cost.wood}  ·  Stone ${st}/${gate.cost.stone}${timer}`, marker);
          return;
        }
      }
    }

    if (this.step === 'deliver') {
      if (gate.status === 'building' || gate.status === 'done') {
        this.step = 'defend';
      } else if (waves.state === 'active') {
        this.defendObjective();
        return;
      } else {
        this.set('Carry the materials into the glowing square at the gate.', gate.markerPoint);
        return;
      }
    }

    if (this.step === 'defend') {
      if (waves.completed >= 1) {
        this.step = 'expand';
      } else if (waves.state === 'active') {
        this.defendObjective();
        return;
      } else {
        this.set(`Raiders attack from the South in ${Math.ceil(waves.timer)}s! Defeat them for gold.`, null);
        return;
      }
    }

    // From here on: point at breaches first, then unfinished construction.
    const breach = this.nearestSite(s.sites.filter((x) => x.layout.dynamic && x.status === 'open'));
    if (breach) {
      this.set(`Repair the breached ${breach.building.name.toLowerCase()}!`, breach.markerPoint);
      return;
    }
    if (waves.state === 'active' && waves.current) {
      this.defendObjective();
      return;
    }

    if (this.step === 'expand') {
      const open = s.sites.filter((x) => !x.layout.dynamic && (x.status === 'open' || x.status === 'building'));
      if (open.length === 0) {
        this.step = 'done';
      } else {
        const target = this.nearestSite(open);
        this.set('Use your gold and materials: repair the walls and build an archer position.', target ? target.markerPoint : null);
        return;
      }
    }

    this.set('Survive the sieges. Gather, rebuild and defend the keep.', null);
  }

  defendObjective() {
    const s = this.scene;
    const p = s.player;
    if (!p.alive) {
      this.set(`Your hero has fallen — back in ${Math.ceil(s.combat.respawnRemaining)}s. The keep is exposed!`, null);
      return;
    }
    const e = s.enemies.nearest(p.x, p.y);
    const marker = e ? { x: e.x, y: e.y - 60 } : null;
    this.set('Defend the keep! Walk up to raiders — your hero attacks automatically.', marker);
  }

  nearestNode(kind) {
    const p = this.scene.player;
    let best = null;
    let bestD = Infinity;
    for (const n of this.scene.nodes) {
      if (n.kind !== kind || !n.available) continue;
      const d = Math.hypot(n.x - p.x, n.y - p.y) - (n.tutorial ? 400 : 0);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  nearestSite(list) {
    const p = this.scene.player;
    let best = null;
    let bestD = Infinity;
    for (const site of list) {
      const d = Math.hypot(site.layout.x - p.x, site.layout.y - p.y);
      if (d < bestD) { bestD = d; best = site; }
    }
    return best;
  }

  set(text, target) {
    this.objective.text = text;
    this.objective.target = target ? { x: target.x, y: target.y } : null;
  }
}
