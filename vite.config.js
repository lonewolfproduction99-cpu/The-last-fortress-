import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import pkg from './package.json' with { type: 'json' };

// Build identifier shown in-game (bottom-right corner).
// Cloudflare Pages exposes CF_PAGES_COMMIT_SHA during its builds; locally we ask git.
function commitId() {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  // Relative base so the build works from any sub-path (CrazyGames, Cloudflare Pages previews, file hosts).
  base: './',
  define: {
    __BUILD_VERSION__: JSON.stringify(`v${pkg.version}-${commitId()}`),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2019',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  server: { host: true },
});
