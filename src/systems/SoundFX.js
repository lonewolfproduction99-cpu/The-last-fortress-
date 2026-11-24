// Tiny synthesized sound effects (Web Audio), so Phase 1 needs no audio files.
// Will be replaced or complemented by small licensed sound files in Phase 6.
import { Settings } from './Settings.js';

let ctx = null;
let master = null;
let noiseBuffer = null;
let suspendedByGame = false;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    applyVolume();
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
  return ctx;
}

function applyVolume() {
  if (!master) return;
  master.gain.value = Settings.audioMuted ? 0 : Settings.get('sfxVolume');
}

function tone(freq, dur, type = 'square', vol = 0.15, slideTo = null, delay = 0) {
  if (!ctx || Settings.audioMuted || ctx.state !== 'running') return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, filterFreq, vol = 0.2) {
  if (!ctx || Settings.audioMuted || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const SoundFX = {
  /** Must be called from a user gesture (pointer/key) so browsers allow audio. */
  unlock() {
    const c = ensureContext();
    if (c && c.state === 'suspended' && !suspendedByGame) c.resume().catch(() => {});
  },
  suspend() {
    suspendedByGame = true;
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  },
  resume() {
    suspendedByGame = false;
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  },
  refreshVolume: applyVolume,

  chop() { noise(0.12, 900, 0.35); tone(140, 0.08, 'triangle', 0.12); },
  mine() { noise(0.08, 3200, 0.25); tone(820, 0.07, 'square', 0.05, 500); },
  pickup() { tone(660, 0.06, 'square', 0.05, 990); },
  deposit() { tone(420, 0.05, 'triangle', 0.1, 560); },
  full() { tone(220, 0.15, 'square', 0.06, 180); },
  buildStart() { noise(0.25, 600, 0.2); },
  buildDone() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.07, null, i * 0.08));
  },
  click() { tone(880, 0.04, 'square', 0.05); },
  denied() { tone(200, 0.12, 'sawtooth', 0.06, 150); },
};

Settings.onChange(applyVolume);
