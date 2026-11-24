// TEMPORARY placeholder art, generated at boot so the prototype needs no files.
// Sizes roughly match the scale of Tiny Swords units/buildings (64px tiles)
// so swapping in the real sprites later does not change gameplay distances.

function make(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

// Small deterministic random so the tiles look the same every run.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function createPlaceholderTextures(scene) {
  make(scene, 'grass', 64, 64, (g) => {
    g.fillStyle(0x6aa84f).fillRect(0, 0, 64, 64);
    const r = rng(7);
    for (let i = 0; i < 22; i++) {
      g.fillStyle(r() > 0.5 ? 0x78b85a : 0x5e9a46).fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 2, 3);
    }
  });

  make(scene, 'dirt', 64, 64, (g) => {
    g.fillStyle(0xc9a66b).fillRect(0, 0, 64, 64);
    const r = rng(11);
    for (let i = 0; i < 16; i++) {
      g.fillStyle(r() > 0.5 ? 0xb8955c : 0xd6b57c).fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 3, 2);
    }
  });

  make(scene, 'shadow', 40, 14, (g) => {
    g.fillStyle(0x000000, 0.28).fillEllipse(20, 7, 40, 14);
  });

  // Hero knight, facing right. Origin is set to the feet by the Player entity.
  make(scene, 'hero', 40, 52, (g) => {
    g.fillStyle(0x2b2b38).fillRect(12, 40, 6, 10).fillRect(22, 40, 6, 10); // legs
    g.fillStyle(0x3d6fd1).fillRoundedRect(8, 20, 24, 22, 4); // blue tabard
    g.fillStyle(0xf5c542).fillRect(18, 22, 4, 18); // gold stripe
    g.fillStyle(0xc9ced6).fillRoundedRect(9, 4, 22, 18, 6); // helmet
    g.fillStyle(0x2b2b38).fillRect(20, 11, 10, 3); // visor slit
    g.fillStyle(0xd94c4c).fillRect(16, 0, 6, 6); // plume
    g.lineStyle(2, 0x1d1d26, 1).strokeRoundedRect(8, 20, 24, 22, 4).strokeRoundedRect(9, 4, 22, 18, 6);
  });

  // Tools are drawn pointing up with the handle at the bottom-centre.
  make(scene, 'tool_sword', 10, 34, (g) => {
    g.fillStyle(0xe7ebf0).fillRect(3, 0, 4, 24);
    g.fillStyle(0xf5c542).fillRect(0, 24, 10, 3);
    g.fillStyle(0x6b4423).fillRect(3, 27, 4, 7);
  });
  make(scene, 'tool_axe', 18, 30, (g) => {
    g.fillStyle(0x8a5a2b).fillRect(7, 4, 4, 26);
    g.fillStyle(0xc9ced6).fillTriangle(10, 2, 18, 0, 18, 12).fillRect(10, 2, 4, 10);
  });
  make(scene, 'tool_pick', 22, 30, (g) => {
    g.fillStyle(0x8a5a2b).fillRect(9, 4, 4, 26);
    g.fillStyle(0xaab2bc).fillTriangle(0, 6, 11, 0, 11, 6).fillTriangle(22, 6, 11, 0, 11, 6);
  });

  make(scene, 'tree', 72, 104, (g) => {
    g.fillStyle(0x6b4423).fillRect(30, 70, 12, 30);
    g.fillStyle(0x2f6b3a).fillCircle(36, 40, 30);
    g.fillStyle(0x3d8a47).fillCircle(28, 34, 20).fillCircle(46, 44, 18);
    g.fillStyle(0x56a85c).fillCircle(26, 26, 9).fillCircle(44, 30, 7);
  });
  make(scene, 'stump', 36, 24, (g) => {
    g.fillStyle(0x6b4423).fillRect(6, 6, 24, 16);
    g.fillStyle(0xc9a66b).fillEllipse(18, 7, 24, 9);
    g.lineStyle(1, 0x8a5a2b).strokeEllipse(18, 7, 12, 4);
  });

  make(scene, 'rock', 60, 46, (g) => {
    g.fillStyle(0x6f7782).fillEllipse(30, 28, 58, 34);
    g.fillStyle(0x8e98a4).fillEllipse(24, 22, 36, 24);
    g.fillStyle(0xb3bcc6).fillEllipse(20, 16, 14, 8);
    g.lineStyle(2, 0x4b525b).strokeEllipse(30, 28, 58, 34);
  });
  make(scene, 'rubble', 48, 24, (g) => {
    g.fillStyle(0x6f7782).fillCircle(12, 16, 7).fillCircle(26, 14, 8).fillCircle(38, 17, 6);
    g.fillStyle(0x8e98a4).fillCircle(24, 11, 4);
  });

  make(scene, 'wall', 64, 72, (g) => {
    g.fillStyle(0x5b6370).fillRect(0, 16, 64, 56);
    g.fillStyle(0x8d96a3).fillRect(0, 8, 64, 52);
    for (let i = 0; i < 4; i++) g.fillStyle(0x8d96a3).fillRect(i * 16 + 2, 0, 12, 10); // crenellations
    g.lineStyle(1, 0x6b7380, 1);
    for (let row = 0; row < 4; row++) {
      const y = 14 + row * 12;
      g.lineBetween(0, y, 64, y);
      for (let x = (row % 2) * 8; x < 64; x += 16) g.lineBetween(x, y, x, y + 12);
    }
  });
  make(scene, 'wall_ruin', 64, 40, (g) => {
    g.fillStyle(0x5b6370).fillRect(4, 22, 18, 14).fillRect(40, 18, 20, 18);
    g.fillStyle(0x8d96a3).fillRect(6, 18, 14, 8).fillRect(42, 14, 16, 8);
    g.fillStyle(0x6f7782).fillCircle(30, 32, 6).fillCircle(22, 34, 4);
  });

  // Gate spans three wall blocks (192px): two 32px pillars and a 128px doorway.
  make(scene, 'gate', 192, 96, (g) => {
    g.fillStyle(0x5b6370).fillRect(0, 10, 32, 86).fillRect(160, 10, 32, 86);
    g.fillStyle(0x8d96a3).fillRect(0, 0, 32, 80).fillRect(160, 0, 32, 80);
    g.fillStyle(0x8d96a3).fillRect(32, 0, 128, 22); // arch top
    g.fillStyle(0x3a2a1a).fillRect(32, 22, 128, 10); // raised portcullis
    g.lineStyle(2, 0x2a2a2a);
    for (let x = 38; x < 160; x += 12) g.lineBetween(x, 22, x, 34);
    g.fillStyle(0xd94c4c).fillTriangle(8, 0, 24, 0, 16, 12).fillTriangle(168, 0, 184, 0, 176, 12); // banners
  });
  make(scene, 'gate_ruin', 192, 48, (g) => {
    g.fillStyle(0x5b6370).fillRect(0, 20, 30, 28).fillRect(164, 16, 28, 32);
    g.fillStyle(0x8d96a3).fillRect(2, 12, 26, 12).fillRect(166, 8, 24, 12);
    g.fillStyle(0x6b4423).fillRect(56, 34, 34, 6).fillRect(104, 30, 6, 16); // broken timbers
    g.fillStyle(0x6f7782).fillCircle(80, 42, 6).fillCircle(130, 40, 5);
  });

  make(scene, 'keep', 200, 190, (g) => {
    g.fillStyle(0x5b6370).fillRect(10, 60, 180, 130);
    g.fillStyle(0x8d96a3).fillRect(10, 50, 180, 128);
    g.fillStyle(0x8d96a3).fillRect(0, 20, 48, 160).fillRect(152, 20, 48, 160); // towers
    for (let i = 0; i < 3; i++) g.fillRect(i * 17, 8, 12, 14).fillRect(152 + i * 17, 8, 12, 14);
    g.fillStyle(0x3d6fd1).fillTriangle(58, 50, 100, 10, 142, 50); // blue roof
    g.fillStyle(0x2a2218).fillRoundedRect(84, 118, 32, 60, { tl: 14, tr: 14, bl: 0, br: 0 }); // door
    g.fillStyle(0x2a2218).fillRect(18, 70, 10, 18).fillRect(172, 70, 10, 18).fillRect(70, 76, 10, 16).fillRect(120, 76, 10, 16);
    // damage cracks & rubble (the keep starts damaged)
    g.lineStyle(2, 0x3a3f47).lineBetween(150, 60, 132, 96).lineBetween(132, 96, 140, 120);
    g.fillStyle(0x6f7782).fillCircle(178, 182, 8).fillCircle(162, 186, 5);
  });

  make(scene, 'archer_post', 68, 92, (g) => {
    g.fillStyle(0x6b4423).fillRect(8, 30, 8, 62).fillRect(52, 30, 8, 62);
    g.lineStyle(4, 0x6b4423).lineBetween(12, 50, 56, 86).lineBetween(56, 50, 12, 86);
    g.fillStyle(0xa8743f).fillRect(0, 22, 68, 14);
    g.fillStyle(0x8a5a2b).fillRect(0, 10, 8, 14).fillRect(20, 10, 8, 14).fillRect(40, 10, 8, 14).fillRect(60, 10, 8, 14);
    g.fillStyle(0x3d6fd1).fillTriangle(30, 0, 30, 12, 42, 6);
  });

  make(scene, 'scaffold', 80, 80, (g) => {
    g.lineStyle(4, 0xa8743f);
    g.lineBetween(8, 80, 8, 4).lineBetween(72, 80, 72, 4).lineBetween(8, 10, 72, 10).lineBetween(8, 44, 72, 44);
    g.lineStyle(3, 0x8a5a2b).lineBetween(8, 44, 72, 10).lineBetween(8, 80, 72, 44);
  });

  make(scene, 'icon_wood', 20, 20, (g) => {
    g.fillStyle(0x8a5a2b).fillRoundedRect(1, 6, 18, 9, 3);
    g.fillStyle(0xd6a86a).fillCircle(4, 10, 3.5);
    g.lineStyle(1, 0x4a2f16).strokeRoundedRect(1, 6, 18, 9, 3);
  });
  make(scene, 'icon_stone', 20, 20, (g) => {
    g.fillStyle(0x8e98a4).fillEllipse(10, 12, 18, 12);
    g.fillStyle(0xc3cbd4).fillEllipse(8, 9, 8, 5);
    g.lineStyle(1, 0x4b525b).strokeEllipse(10, 12, 18, 12);
  });
  make(scene, 'icon_iron', 20, 20, (g) => {
    g.fillStyle(0x5a6b7d).fillRect(2, 8, 16, 8);
    g.fillStyle(0x9fc3e6).fillRect(4, 6, 12, 4);
    g.lineStyle(1, 0x2f3a46).strokeRect(2, 8, 16, 8);
  });
  make(scene, 'icon_gold', 20, 20, (g) => {
    g.fillStyle(0xc9961f).fillCircle(10, 10, 8);
    g.fillStyle(0xf5c542).fillCircle(10, 10, 6);
    g.fillStyle(0xfff0a8).fillRect(8, 6, 2, 7);
  });

  make(scene, 'particle', 6, 6, (g) => {
    g.fillStyle(0xffffff).fillRect(0, 0, 6, 6);
  });
}
