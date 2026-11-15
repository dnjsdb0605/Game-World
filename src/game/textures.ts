import * as THREE from 'three';

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function createRoadTexture(maxAnisotropy: number, withCrosswalk = false): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Base dark asphalt
  ctx.fillStyle = '#2d333b';
  ctx.fillRect(0, 0, w, h);

  // Subtle asphalt aggregate noise
  for (let i = 0; i < 16000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const v = 36 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle tire wear tracks in main lanes
  ctx.fillStyle = 'rgba(18, 22, 28, 0.28)';
  ctx.fillRect(140, 0, 56, h);
  ctx.fillRect(280, 0, 56, h);
  ctx.fillRect(450, 0, 56, h);
  ctx.fillRect(600, 0, 56, h);

  // Red Korean dedicated bike lane on the right side (x: 720 -> 960 out of 1024)
  ctx.fillStyle = '#8d3632';
  ctx.fillRect(724, 0, 244, h);
  // Subtle speckled texture on bike lane
  for (let i = 0; i < 3200; i++) {
    const x = 724 + Math.random() * 244;
    const y = Math.random() * h;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(40,10,10,0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Left edge solid white gutter line
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(28, 0, 14, h);

  // Yellow center divider (double yellow or solid-dashed) separating oncoming/left lane
  ctx.fillStyle = '#eab308';
  ctx.fillRect(364, 0, 12, h);
  ctx.fillRect(386, 0, 12, h);

  // Solid white line separating vehicle lane & bike lane
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(712, 0, 14, h);

  // Outer right curb edge line
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(968, 0, 14, h);

  // Dashed lane divider between lane 1 and lane 2 (not used since 2 lanes + bike lane, let's put dashed white at x=548)
  ctx.fillStyle = '#e2e8f0';
  for (let y = 32; y < h; y += 160) {
    ctx.fillRect(546, y, 10, 84);
  }

  // White bicycle stencil inside bike lane (centered around x=846)
  ctx.save();
  ctx.translate(846, 512);
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
  ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
  ctx.lineWidth = 7;
  // Rear wheel & front wheel
  ctx.beginPath();
  ctx.arc(-28, 26, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(28, 26, 18, 0, Math.PI * 2);
  ctx.stroke();
  // Diamond frame
  ctx.beginPath();
  ctx.moveTo(-28, 26);
  ctx.lineTo(-4, 0);
  ctx.lineTo(20, 0);
  ctx.lineTo(28, 26);
  ctx.moveTo(-4, 0);
  ctx.lineTo(2, 26);
  ctx.lineTo(-28, 26);
  ctx.moveTo(20, 0);
  ctx.lineTo(14, -14);
  ctx.lineTo(26, -14);
  ctx.stroke();
  // Direction arrow above bike icon
  ctx.beginPath();
  ctx.moveTo(0, -68);
  ctx.lineTo(-18, -42);
  ctx.lineTo(-7, -42);
  ctx.lineTo(-7, -24);
  ctx.lineTo(7, -24);
  ctx.lineTo(7, -42);
  ctx.lineTo(18, -42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (withCrosswalk) {
    // Stop line before crosswalk (near bottom of tile, since player rides toward -Z)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(46, 760, 916, 22);

    // Zebra stripes across road
    ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
    for (let x = 64; x < 950; x += 68) {
      ctx.fillRect(x, 420, 42, 280);
    }

    // Korean "정지" or yellow school zone slow diamond ahead of crosswalk
    ctx.save();
    ctx.translate(546, 895);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.lineTo(38, 0);
    ctx.lineTo(0, 52);
    ctx.lineTo(-38, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 1);
}

export function createSidewalkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, w, h);

  // Paving block grid
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  const step = 64;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Subtle tile tint variation
  for (let gx = 0; gx < w; gx += step) {
    for (let gy = 0; gy < h; gy += step) {
      if ((gx + gy) % 128 === 0) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.fillRect(gx + 2, gy + 2, step - 4, step - 4);
      }
    }
  }

  // Yellow tactile guide block strip near curb
  ctx.fillStyle = '#eab308';
  ctx.fillRect(48, 0, 34, h);
  ctx.fillStyle = '#ca8a04';
  for (let y = 8; y < h; y += 24) {
    ctx.fillRect(54, y, 22, 10);
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 3);
}

export function createBuildingFacadeTexture(
  maxAnisotropy: number,
  variant: number
): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const palettes = [
    { wall: '#e2d9cc', trim: '#b8aa96', glass: '#3b5875', shop: '#0f766e' },
    { wall: '#d6dde6', trim: '#9aa8ba', glass: '#2d4560', shop: '#b45309' },
    { wall: '#dfd5d2', trim: '#ad9c98', glass: '#334155', shop: '#1d4ed8' },
    { wall: '#e5e7eb', trim: '#9ca3af', glass: '#364f6b', shop: '#be123c' },
  ];
  const p = palettes[variant % palettes.length];

  ctx.fillStyle = p.wall;
  ctx.fillRect(0, 0, w, h);

  // Floor bands
  ctx.fillStyle = p.trim;
  for (let y = 0; y < h; y += 96) {
    ctx.fillRect(0, y, w, 10);
  }

  // Upper floor windows
  for (let row = 0; row < 4; row++) {
    const wy = 24 + row * 96;
    for (let col = 0; col < 4; col++) {
      const wx = 28 + col * 120;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(wx - 3, wy - 3, 76, 56);
      ctx.fillStyle = p.glass;
      ctx.fillRect(wx, wy, 70, 50);
      // Sky reflection diagonal
      ctx.fillStyle = 'rgba(224, 242, 254, 0.25)';
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + 42, wy);
      ctx.lineTo(wx + 14, wy + 50);
      ctx.lineTo(wx, wy + 50);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Ground floor Korean storefront awning
  ctx.fillStyle = p.shop;
  ctx.fillRect(0, 396, w, 46);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let x = 0; x < w; x += 32) {
    ctx.fillRect(x, 396, 16, 46);
  }
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(24, 444, w - 48, 68);
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(34, 450, w - 68, 56);

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 1);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(8, 12, 20, 0.62)');
  grad.addColorStop(0.55, 'rgba(8, 12, 20, 0.28)');
  grad.addColorStop(1, 'rgba(8, 12, 20, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createWarningChevronTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.fillRect(16, 16, 224, 224);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 14;
  ctx.strokeRect(16, 16, 224, 224);

  // Warning chevron arrow pointing inward
  ctx.fillStyle = '#fbbf24';
  for (let i = 0; i < 2; i++) {
    const offset = i * 56;
    ctx.beginPath();
    ctx.moveTo(54 + offset, 64);
    ctx.lineTo(106 + offset, 128);
    ctx.lineTo(54 + offset, 192);
    ctx.lineTo(84 + offset, 192);
    ctx.lineTo(136 + offset, 128);
    ctx.lineTo(84 + offset, 64);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createPotholeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#252a31';
  ctx.fillRect(0, 0, 256, 256);

  // Storm drain steel frame
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, 216, 216);

  // Deep drain slots (dangerous for bike tires!)
  ctx.fillStyle = '#090d14';
  for (let x = 42; x < 210; x += 26) {
    ctx.fillRect(x, 38, 12, 180);
  }

  // Yellow hazard corner paint
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(12, 12, 36, 10);
  ctx.fillRect(12, 12, 10, 36);
  ctx.fillRect(208, 12, 36, 10);
  ctx.fillRect(234, 12, 10, 36);
  ctx.fillRect(12, 234, 36, 10);
  ctx.fillRect(12, 208, 10, 36);
  ctx.fillRect(208, 234, 36, 10);
  ctx.fillRect(234, 208, 10, 36);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createPuddleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  // Irregular organic puddle silhouette
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(128, 128, 108, 86, 0.25, 0, Math.PI * 2);
  ctx.ellipse(158, 98, 65, 52, -0.3, 0, Math.PI * 2);
  ctx.ellipse(92, 148, 58, 44, 0.4, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(128, 120, 12, 128, 128, 118);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
  grad.addColorStop(0.55, 'rgba(14, 116, 144, 0.82)');
  grad.addColorStop(0.9, 'rgba(15, 23, 42, 0.7)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Concentric ripple rings
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(122, 120, 48, 34, 0.2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(126, 124, 78, 58, 0.2, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}
