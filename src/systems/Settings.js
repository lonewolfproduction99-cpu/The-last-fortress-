// Player settings with versioned persistence.
import { Storage } from '../platform/Storage.js';
import { Platform } from '../platform/Platform.js';

const KEY = 'settings';
const VERSION = 1;
const DEFAULTS = { version: VERSION, muted: false, sfxVolume: 0.8, musicVolume: 0.5 };

let current = { ...DEFAULTS };
const listeners = new Set();

export const Settings = {
  load() {
    const saved = Storage.getJSON(KEY, null);
    current = saved && saved.version === VERSION ? { ...DEFAULTS, ...saved } : { ...DEFAULTS };
    Platform.onSettingsChange(() => listeners.forEach((fn) => fn(current)));
    return current;
  },
  get(key) {
    return current[key];
  },
  set(key, value) {
    current[key] = value;
    Storage.setJSON(KEY, current);
    listeners.forEach((fn) => fn(current));
  },
  /** Effective mute: the platform's muteAudio setting always wins. */
  get audioMuted() {
    return current.muted || Platform.platformMuted;
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
