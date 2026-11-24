import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { Platform } from './platform/Platform.js';
import { Settings } from './systems/Settings.js';
import { getTargetSize, watchResize } from './platform/Display.js';

// Block browser gestures that would fight the joystick (scroll, pinch-zoom, long-press menu).
const block = (e) => e.preventDefault();
document.addEventListener('contextmenu', block);
document.addEventListener('gesturestart', block);
document.addEventListener('touchmove', block, { passive: false });
document.addEventListener('dblclick', block);

async function start() {
  await Platform.init();
  Settings.load();

  const parent = document.getElementById('game');
  const { width, height } = getTargetSize(parent);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: '#1d2b2a',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 3,
      touch: { capture: true },
    },
    physics: {
      default: 'arcade',
      // Variable step: movement uses real frame time, so 60/90/120/144 Hz screens all
      // move at the same speed and high-refresh displays stay smooth.
      arcade: { debug: false, fixedStep: false },
    },
    fps: { smoothStep: true },
    disableContextMenu: true,
    scene: [BootScene, GameScene, UIScene],
  });

  watchResize(game, parent);
  window.__siegebound = game; // handy for debugging in the browser console
}

start();
