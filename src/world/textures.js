import * as THREE from 'three';

// Todas las texturas se generan en canvas: el juego no necesita ficheros de imagen.

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function speckle(ctx, w, h, count, alpha, light = false) {
  for (let i = 0; i < count; i++) {
    const v = light ? 160 + Math.random() * 95 : Math.random() * 90;
    ctx.fillStyle = `rgba(${v | 0},${v | 0},${v | 0},${alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

function veins(ctx, x, y, size, color, count) {
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    let px = x + Math.random() * size;
    let py = y + Math.random() * size;
    ctx.moveTo(px, py);
    for (let k = 0; k < 6; k++) {
      px += (Math.random() - 0.5) * size * 0.4;
      py += (Math.random() - 0.5) * size * 0.4;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

// Ajedrezado de mármol: 2x2 baldosas por textura.
export function floorTexture(repeat) {
  const s = 512;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  const half = s / 2;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const dark = (i + j) % 2 === 0;
      ctx.fillStyle = dark ? '#151515' : '#cfcac0';
      ctx.fillRect(i * half, j * half, half, half);
      ctx.save();
      ctx.beginPath();
      ctx.rect(i * half, j * half, half, half);
      ctx.clip();
      veins(ctx, i * half, j * half, half, dark ? 'rgba(120,120,120,0.25)' : 'rgba(60,55,50,0.25)', 5);
      speckle(ctx, s, s, 200, 0.08, !dark);
      ctx.restore();
    }
  }
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, s, s);
  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.lineTo(half, s);
  ctx.moveTo(0, half);
  ctx.lineTo(s, half);
  ctx.stroke();
  return toTexture(c, { repeat });
}

// Papel pintado a rayas con rombos art déco.
export function wallpaperTexture() {
  const w = 256;
  const h = 512;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#57524a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#655f55';
  ctx.fillRect(0, 0, w / 2, h);
  ctx.strokeStyle = 'rgba(200,190,160,0.22)';
  ctx.lineWidth = 2;
  for (let y = 0; y < h; y += 128) {
    ctx.beginPath();
    ctx.moveTo(w / 2, y);
    ctx.lineTo(w * 0.85, y + 64);
    ctx.lineTo(w / 2, y + 128);
    ctx.lineTo(w * 0.15, y + 64);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, y + 64, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(w / 2 - 1, 0, 2, h);
  speckle(ctx, w, h, 900, 0.06);
  return toTexture(c);
}

export function woodTexture() {
  const w = 256;
  const h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2b1d14';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * h;
    ctx.strokeStyle = `rgba(${15 + Math.random() * 40},${10 + Math.random() * 20},5,${0.3 + Math.random() * 0.4})`;
    ctx.lineWidth = 0.5 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 3);
    ctx.stroke();
  }
  return toTexture(c);
}

// Máscara de persiana veneciana para el foco del mostrador.
export function blindsTexture() {
  const s = 512;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, s, s);
  const g = ctx.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, s / 2);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.75, '#ddd');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#000';
  for (let y = 0; y < s; y += 36) ctx.fillRect(0, y, s, 13);
  // Marco central de la ventana
  ctx.fillRect(s / 2 - 6, 0, 12, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function ceilingTexture() {
  const s = 256;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1b1a18';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#2c2a26';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, s - 10, s - 10);
  ctx.strokeStyle = '#0d0c0b';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, s - 48, s - 48);
  return toTexture(c);
}

export function rugTexture() {
  const w = 512;
  const h = 512;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1716';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#4b4339';
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, w - 80, h - 80);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  for (let r = 0; r < 8; r++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(40, 150);
    ctx.lineTo(0, 190);
    ctx.lineTo(-40, 150);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
  speckle(ctx, w, h, 4000, 0.1);
  return toTexture(c);
}

// Rótulo de texto genérico (placas, letreros, cristales pintados).
export function textTexture(lines, opts = {}) {
  const {
    width = 512,
    height = 128,
    bg = null,
    color = '#d8c58a',
    font = '64px Limelight, Georgia, serif',
    mirror = false,
    border = null,
  } = opts;
  const c = makeCanvas(width, height);
  const ctx = c.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, width - 16, height - 16);
  }
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  const arr = Array.isArray(lines) ? lines : [lines];
  const lh = height / (arr.length + 0.5);
  arr.forEach((line, i) => ctx.fillText(line, width / 2, lh * (i + 0.75)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function clockFaceTexture() {
  const s = 512;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d9d2bf';
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '52px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  numerals.forEach((n, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.fillText(n, s / 2 + Math.cos(a) * 190, s / 2 + Math.sin(a) * 190);
  });
  ctx.font = 'italic 22px "Playfair Display", Georgia, serif';
  ctx.fillText('Punto Nexo', s / 2, s / 2 + 90);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Página del libro de registro sobre el mostrador (decorativa).
export function ledgerPageTexture() {
  const w = 256;
  const h = 320;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ddd4bc';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(80,70,50,0.35)';
  for (let y = 40; y < h; y += 18) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(w - 14, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(20,20,30,0.7)';
  for (let y = 36; y < h - 20; y += 18) {
    if (Math.random() < 0.25) continue;
    ctx.beginPath();
    let x = 20;
    ctx.moveTo(x, y);
    const len = 80 + Math.random() * 130;
    while (x < 20 + len) {
      x += 4;
      ctx.lineTo(x, y - Math.random() * 6);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#222';
  ctx.font = '20px "Playfair Display", Georgia, serif';
  ctx.fillText('Registro', 80, 24);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function paperTexture(title) {
  const w = 256;
  const h = 180;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e3dac2';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#2a251e';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = '#2a251e';
  ctx.font = 'bold 20px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 34);
  ctx.fillStyle = '#777';
  ctx.fillRect(18, 52, 70, 90);
  ctx.fillStyle = '#3a342b';
  for (let y = 60; y < 150; y += 16) ctx.fillRect(100, y, 120 - Math.random() * 40, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Moqueta del pasillo: rojo oscuro con hexágonos negros y filo dorado. El rojo sobrevive al filtro noir.
export function carpetTexture() {
  const s = 256;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5c0a0f';
  ctx.fillRect(0, 0, s, s);
  const r = 32;
  const h = Math.sqrt(3) * r;
  ctx.lineWidth = 5;
  for (let row = -1; row < s / h + 1; row++) {
    for (let col = -1; col < s / (r * 3) + 1; col++) {
      const cx = col * r * 3 + (row % 2 ? r * 1.5 : 0);
      const cy = row * h * 0.5;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.lineTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8);
      }
      ctx.closePath();
      ctx.fillStyle = '#1c0204';
      ctx.fill();
      ctx.strokeStyle = '#7a5a26';
      ctx.stroke();
    }
  }
  speckle(ctx, s, s, 2500, 0.08);
  return toTexture(c);
}
