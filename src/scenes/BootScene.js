// Prepares textures (placeholders for now) then starts the game and HUD.
import Phaser from 'phaser';
import { createPlaceholderTextures } from '../assets/PlaceholderTextures.js';
import { Platform } from '../platform/Platform.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    Platform.loadingStart();
    // Real asset files (Tiny Swords) will be queued here from AssetManifest once provided.
  }

  create() {
    createPlaceholderTextures(this);
    Platform.loadingStop();
    const boot = document.getElementById('boot');
    if (boot) boot.remove();
    this.scene.start('Game'); // GameScene launches the UI scene itself (also on restart)
    Platform.gameplayStart();
  }
}
