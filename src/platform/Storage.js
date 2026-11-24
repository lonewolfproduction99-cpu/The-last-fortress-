// Key/value persistence. Uses the CrazyGames Data module when the SDK is active,
// otherwise browser localStorage. All access is wrapped because storage can be
// unavailable (private mode, blocked third-party storage inside iframes).

import { Platform } from './Platform.js';

const PREFIX = 'siegebound.';
const memory = new Map();

function backend() {
  const data = Platform.dataStore;
  if (data) return data;
  try {
    const ls = window.localStorage;
    const probe = `${PREFIX}probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export const Storage = {
  getJSON(key, fallback = null) {
    const full = PREFIX + key;
    try {
      const store = backend();
      const raw = store ? store.getItem(full) : memory.get(full);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[Storage] read failed', key, err);
      return fallback;
    }
  },

  setJSON(key, value) {
    const full = PREFIX + key;
    const raw = JSON.stringify(value);
    try {
      const store = backend();
      if (store) store.setItem(full, raw);
      else memory.set(full, raw);
    } catch (err) {
      console.warn('[Storage] write failed', key, err);
      memory.set(full, raw);
    }
  },
};
