// Thin, defensive wrapper around the CrazyGames HTML5 SDK v3.
//
// The SDK script is included in index.html. Its `environment` is:
//   'crazygames' on CrazyGames domains, 'local' on localhost, 'disabled' elsewhere
//   (e.g. Cloudflare Pages), where SDK calls throw. Every call here is guarded so
//   the game runs identically when the SDK is missing, blocked or disabled.
// Add ?useLocalSdk=true to a URL to force the SDK's local test mode.

const state = {
  sdk: null,
  environment: 'none',
  gameplayActive: false,
  settingsListeners: new Set(),
};

function sdkUsable() {
  return state.sdk && (state.environment === 'crazygames' || state.environment === 'local');
}

function safe(fn, fallback) {
  if (!sdkUsable()) return fallback;
  try {
    return fn(state.sdk);
  } catch (err) {
    console.warn('[Platform] SDK call failed:', err);
    return fallback;
  }
}

export const Platform = {
  async init() {
    const sdk = window.CrazyGames && window.CrazyGames.SDK;
    if (!sdk) {
      state.environment = 'none';
      return state.environment;
    }
    try {
      await Promise.race([
        sdk.init(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SDK init timeout')), 5000)),
      ]);
      state.sdk = sdk;
      state.environment = sdk.environment || 'none';
    } catch (err) {
      console.info('[Platform] CrazyGames SDK unavailable, running standalone.', err && err.message);
      state.sdk = sdk;
      try {
        state.environment = sdk.environment || 'disabled';
      } catch {
        state.environment = 'disabled';
      }
    }
    if (sdkUsable()) {
      safe((s) => s.game.addSettingsChangeListener((settings) => {
        state.settingsListeners.forEach((fn) => fn(settings));
      }));
    }
    return state.environment;
  },

  get environment() {
    return state.environment;
  },

  get isCrazyGames() {
    return state.environment === 'crazygames';
  },

  /** Data module (account-linked saves) when available; null otherwise. */
  get dataStore() {
    return safe((s) => s.data, null);
  },

  loadingStart() {
    safe((s) => s.game.loadingStart());
  },

  loadingStop() {
    safe((s) => s.game.loadingStop());
  },

  /** Call when the player is actively playing (start, resume after pause/menu). */
  gameplayStart() {
    if (state.gameplayActive) return;
    state.gameplayActive = true;
    safe((s) => s.game.gameplayStart());
  },

  /** Call on every break in play (pause menu, defeat screen, ads). Not on focus loss. */
  gameplayStop() {
    if (!state.gameplayActive) return;
    state.gameplayActive = false;
    safe((s) => s.game.gameplayStop());
  },

  /** True when the platform requires all game audio to be muted. Overrides the in-game setting. */
  get platformMuted() {
    return safe((s) => !!(s.game.settings && s.game.settings.muteAudio), false);
  },

  onSettingsChange(fn) {
    state.settingsListeners.add(fn);
  },
};
