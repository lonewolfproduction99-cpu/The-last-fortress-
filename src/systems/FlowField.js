// Grid flow field toward the Command Keep (Dijkstra from the keep outward).
// Rebuilt only when structures are built or destroyed, never per frame.
// Each cell stores the neighbour that leads closer to the keep; enemies just
// look up their cell. Standing walls/gates are passable at a high cost, which
// means "break through here": enemies attack the structure in their next cell.
import { NAV } from '../config/GameConfig.js';

const SQRT2 = Math.SQRT2;
const NEIGHBOURS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
];

class MinHeap {
  constructor(capacity) {
    this.idx = new Int32Array(capacity);
    this.pri = new Float32Array(capacity);
    this.size = 0;
  }

  push(i, p) {
    let n = this.size++;
    this.idx[n] = i;
    this.pri[n] = p;
    while (n > 0) {
      const parent = (n - 1) >> 1;
      if (this.pri[parent] <= this.pri[n]) break;
      this.swap(n, parent);
      n = parent;
    }
  }

  pop() {
    const top = this.idx[0];
    this.lastPri = this.pri[0];
    this.size--;
    if (this.size > 0) {
      this.idx[0] = this.idx[this.size];
      this.pri[0] = this.pri[this.size];
      let n = 0;
      for (;;) {
        const l = n * 2 + 1;
        const r = l + 1;
        let m = n;
        if (l < this.size && this.pri[l] < this.pri[m]) m = l;
        if (r < this.size && this.pri[r] < this.pri[m]) m = r;
        if (m === n) break;
        this.swap(n, m);
        n = m;
      }
    }
    return top;
  }

  swap(a, b) {
    const ti = this.idx[a]; this.idx[a] = this.idx[b]; this.idx[b] = ti;
    const tp = this.pri[a]; this.pri[a] = this.pri[b]; this.pri[b] = tp;
  }
}

export class FlowField {
  constructor(worldW, worldH) {
    this.cell = NAV.cell;
    this.cols = Math.ceil(worldW / this.cell);
    this.rows = Math.ceil(worldH / this.cell);
    const n = this.cols * this.rows;
    this.blocked = new Uint8Array(n); // static obstacles (trees, rocks, keep, buildings)
    this.goal = new Uint8Array(n);
    this.structIndex = new Int16Array(n).fill(-1);
    this.structures = [];
    this.dist = new Float32Array(n);
    this.next = new Int32Array(n);
    // Upper bound: each cell can be pushed once per neighbour.
    this.heap = new MinHeap(n * 8);
    this.dirty = true;
  }

  index(c, r) {
    return r * this.cols + c;
  }

  cellAt(x, y) {
    const c = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cell)));
    const r = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cell)));
    return this.index(c, r);
  }

  cellCenter(i, out) {
    out.x = (i % this.cols) * this.cell + this.cell / 2;
    out.y = Math.floor(i / this.cols) * this.cell + this.cell / 2;
    return out;
  }

  /** Marks every cell overlapping the rectangle as blocked. */
  blockRect(x, y, w, h) {
    this.forCellsOverlapping(x, y, w, h, (i) => { this.blocked[i] = 1; });
    this.dirty = true;
  }

  forCellsOverlapping(x, y, w, h, fn) {
    const c0 = Math.max(0, Math.floor(x / this.cell));
    const c1 = Math.min(this.cols - 1, Math.floor((x + w - 0.01) / this.cell));
    const r0 = Math.max(0, Math.floor(y / this.cell));
    const r1 = Math.min(this.rows - 1, Math.floor((y + h - 0.01) / this.cell));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) fn(this.index(c, r));
  }

  /** Cells whose centres lie inside the rect belong to the structure. */
  addStructure(structure) {
    const id = this.structures.length;
    this.structures.push(structure);
    const { x, y, width, height } = structure.rect;
    const half = this.cell / 2;
    this.forCellsOverlapping(x, y, width, height, (i) => {
      const cx = (i % this.cols) * this.cell + half;
      const cy = Math.floor(i / this.cols) * this.cell + half;
      if (cx >= x && cx <= x + width && cy >= y && cy <= y + height) this.structIndex[i] = id;
    });
    this.dirty = true;
  }

  structureAt(i) {
    const id = this.structIndex[i];
    return id >= 0 ? this.structures[id] : null;
  }

  /** The keep: its cells are blocked and the cells around it become goals. */
  setGoalRect(x, y, w, h) {
    this.goal.fill(0);
    this.blockRect(x, y, w, h);
    this.forCellsOverlapping(x - this.cell, y - this.cell, w + this.cell * 2, h + this.cell * 2, (i) => {
      if (!this.blocked[i]) this.goal[i] = 1;
    });
  }

  enterCost(i) {
    const s = this.structureAt(i);
    if (s && s.alive) return s.kind === 'gate' ? NAV.gatePenalty : NAV.wallPenalty;
    return 0;
  }

  build() {
    const { cols, rows, dist, next, blocked, heap } = this;
    dist.fill(Infinity);
    next.fill(-1);
    heap.size = 0;
    for (let i = 0; i < this.goal.length; i++) {
      if (this.goal[i]) {
        dist[i] = 0;
        heap.push(i, 0);
      }
    }
    while (heap.size > 0) {
      const i = heap.pop();
      const d = dist[i];
      if (heap.lastPri > d) continue; // stale entry
      const c = i % cols;
      const r = (i - c) / cols;
      // Cost to step from a neighbour into cell i (paths are reversed: we expand from the goal).
      const into = this.enterCost(i);
      for (let k = 0; k < 8; k++) {
        const [dc, dr, step] = NEIGHBOURS[k];
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const j = nr * cols + nc;
        if (blocked[j]) continue;
        // No diagonal corner-cutting past blocked cells.
        if (dc !== 0 && dr !== 0 && (blocked[r * cols + nc] || blocked[nr * cols + c])) continue;
        const nd = d + step + into;
        if (nd < dist[j]) {
          dist[j] = nd;
          next[j] = i;
          heap.push(j, nd);
        }
      }
    }
    this.dirty = false;
  }

  rebuildIfDirty() {
    if (this.dirty) this.build();
  }
}
