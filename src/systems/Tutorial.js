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

    if (this.step === 'gather') {
      const w = Math.min(inv.count('wood') + gate.delivered.wood, gate.cost.wood);
      const st = Math.min(inv.count('stone') + gate.delivered.stone, gate.cost.stone);
      if (w >= gate.cost.wood && st >= gate.cost.stone) {
        this.step = 'deliver';
        s.nodes.forEach((n) => n.setHighlighted(false));
      } else {
        const needWood = w < gate.cost.wood;
        const tree = s.nodes.find((n) => n.tutorial && n.kind === 'tree');
        const rock = s.nodes.find((n) => n.tutorial && n.kind === 'rock');
        const target = needWood ? this.nearestAvailable('tree', tree) : this.nearestAvailable('rock', rock);
        const marker = target ? { x: target.x, y: target.y - (target.kind === 'tree' ? 104 : 50) } : null;
        this.set(`Gather materials — walk next to the ${needWood ? 'tree' : 'rock'}.  Wood ${w}/${gate.cost.wood}  ·  Stone ${st}/${gate.cost.stone}`, marker);
        return;
      }
    }

    if (this.step === 'deliver') {
      if (gate.status === 'building' || gate.status === 'done') {
        this.step = 'expand';
      } else {
        this.set('Carry the materials into the glowing square at the gate.', gate.markerPoint);
        return;
      }
    }

    if (this.step === 'expand') {
      const open = s.sites.filter((x) => x.status === 'open' || x.status === 'building');
      if (open.length === 0 && gate.status === 'done') {
        this.step = 'done';
        this.doneTimer = 6;
      } else {
        const target = this.nearestSite(open);
        this.set('Keep rebuilding: repair the east wall and build an archer position.', target ? target.markerPoint : null);
        return;
      }
    }

    if (this.step === 'done') {
      this.set('The keep stands again — for now. (Sieges arrive in the next update.)', null);
    }
  }

  nearestAvailable(kind, fallback) {
    const p = this.scene.player;
    let best = null;
    let bestD = Infinity;
    for (const n of this.scene.nodes) {
      if (n.kind !== kind || !n.available) continue;
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best || fallback;
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
