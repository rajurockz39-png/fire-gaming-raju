// Procedural PBR-ish textures (colour + normal maps) painted on canvas with fractal noise.
// No downloads needed: soil, brick, lime plaster, wood planks, bark, leaves, straw, rope, fur.
import * as THREE from 'three';

// ---------------------------------------------------------------- noise
function hash(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function smooth(t) { return t * t * (3 - 2 * t); }
// tileable value noise with period p
function vnoise(x, y, p, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const m = (v) => ((v % p) + p) % p;
  const a = hash(m(xi), m(yi), seed), b = hash(m(xi + 1), m(yi), seed);
  const c = hash(m(xi), m(yi + 1), seed), d = hash(m(xi + 1), m(yi + 1), seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
export function fbm(u, v, base = 4, oct = 5, seed = 1) {
  let s = 0, amp = 0.5, f = base;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(u * f, v * f, f, seed + i); amp *= 0.5; f *= 2; }
  return s;
}
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------------------------------------------------------------- canvas helpers
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Build colour + height per pixel with fn(u, v) -> [r, g, b, height(0..1), alpha?]
function paint(size, fn) {
  const col = canvas(size, size), ctx = col.getContext('2d');
  const img = ctx.createImageData(size, size);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, g, b, h, a = 255] = fn(x / size, y / size, x, y);
    const i = (y * size + x);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = a;
    height[i] = h;
  }
  ctx.putImageData(img, 0, 0);
  return { col, ctx, height, size };
}

function normalFromHeight(height, size, strength = 4) {
  const c = canvas(size, size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const H = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
    const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * size + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function tex(c, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Returns a MeshStandardMaterial from a painted texture set.
function pbr(p, { repeat = [1, 1], normal = 4, roughness = 0.9, extra = {} } = {}) {
  return new THREE.MeshStandardMaterial({
    map: tex(p.col, repeat),
    normalMap: tex(normalFromHeight(p.height, p.size, normal), repeat, false),
    roughness, ...extra,
  });
}

const mix = (a, b, t) => a + (b - a) * t;
const mixc = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------- materials
const cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());

export const soil = (repeat = [14, 14]) => once('soil' + repeat, () => {
  const p = paint(1024, (u, v) => {
    const n = fbm(u, v, 6, 6, 3);
    const big = fbm(u, v, 2, 3, 9);
    let c = mixc([142, 110, 80], [188, 156, 118], clamp01(n * 1.3 - 0.15));
    c = mixc(c, [92, 70, 52], clamp01(big - 0.45) * 1.5);
    let h = n * 0.6 + big * 0.3;
    const grit = hash(Math.floor(u * 1024), Math.floor(v * 1024), 5);
    if (grit > 0.992) { c = mixc(c, [176, 160, 140], 0.35); h += 0.05; }
    return [...c, h];
  });
  // pebbles
  const r = rng(11);
  for (let i = 0; i < 90; i++) {
    const x = r() * 1024, y = r() * 1024, s = 2 + r() * 5;
    const g = 120 + r() * 50;
    const grad = p.ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s);
    grad.addColorStop(0, `rgb(${g + 40},${g + 34},${g + 25})`);
    grad.addColorStop(1, `rgb(${g - 40},${g - 45},${g - 50})`);
    p.ctx.fillStyle = grad;
    p.ctx.beginPath(); p.ctx.ellipse(x, y, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2); p.ctx.fill();
    for (let yy = -s; yy < s; yy++) for (let xx = -s; xx < s; xx++) {
      const d = 1 - (xx * xx + yy * yy) / (s * s);
      if (d > 0) { const idx = (((Math.floor(y + yy) + 1024) % 1024) * 1024 + ((Math.floor(x + xx) + 1024) % 1024)); p.height[idx] += d * 0.25; }
    }
  }
  return pbr(p, { repeat, normal: 6, roughness: 0.95 });
});

export const brick = (repeat = [1, 1]) => once('brick' + repeat, () => {
  const rows = 8, cols = 4;
  const p = paint(512, (u, v) => {
    const row = Math.floor(v * rows);
    const off = (row % 2) * 0.5 / cols;
    const cu = ((u + off) * cols) % 1, cv = (v * rows) % 1;
    const col = Math.floor((u + off) * cols);
    const mortar = cu < 0.04 || cv < 0.09;
    const n = fbm(u, v, 16, 4, 2);
    if (mortar) { const g = 150 + n * 40; return [g + 10, g, g - 15, 0.2 + n * 0.1]; }
    const tone = hash(col, row, 7);
    let c = mixc([150, 64, 42], [190, 98, 64], tone);
    c = mixc(c, [110, 60, 45], clamp01(fbm(u, v, 8, 3, 33) - 0.5) * 1.5);
    c = c.map(x => x * (0.85 + n * 0.3));
    const edge = Math.min(cu - 0.04, 1 - cu, (cv - 0.09) * 2, (1 - cv) * 2) * 8;
    return [...c, 0.6 + Math.min(edge, 0.3) + n * 0.15];
  });
  return pbr(p, { repeat, normal: 5, roughness: 0.9 });
});

export const plaster = (repeat = [1, 1], tint = [226, 214, 190]) => once('plaster' + repeat + tint, () => {
  const p = paint(1024, (u, v) => {
    const n = fbm(u, v, 4, 6, 41);
    const stain = clamp01(fbm(u, v, 3, 4, 52) - 0.55) * 2;
    let c = tint.map(x => x * (0.88 + n * 0.22));
    c = mixc(c, [150, 130, 105], stain * 0.6);
    // dirt creeping up from the bottom (v = 1 is the bottom in canvas space)
    const grime = clamp01((v - 0.7) / 0.3 + (fbm(u, v, 8, 3, 61) - 0.5));
    c = mixc(c, [120, 100, 80], grime * 0.7);
    let h = n * 0.5;
    return [...c, h];
  });
  return pbr(p, { repeat, normal: 3, roughness: 0.95 });
});

export const wood = (repeat = [1, 1], tint = [120, 82, 50]) => once('wood' + repeat + tint, () => {
  const planks = 5;
  const p = paint(512, (u, v) => {
    const pl = Math.floor(u * planks);
    const pu = (u * planks) % 1;
    const grain = fbm(u * 0.3 + pl * 0.17, v * 6, 4, 4, 81 + pl);
    const ring = Math.sin((grain * 18 + pu * 3) * Math.PI) * 0.5 + 0.5;
    let c = tint.map(x => x * (0.85 + ring * 0.12 + hash(pl, 0, 3) * 0.15));
    const gap = pu < 0.03 || pu > 0.97;
    if (gap) c = c.map(x => x * 0.4);
    return [...c, gap ? 0 : 0.5 + ring * 0.2];
  });
  return pbr(p, { repeat, normal: 4, roughness: 0.8 });
});

export const bark = (repeat = [2, 2]) => once('bark' + repeat, () => {
  const p = paint(512, (u, v) => {
    const ridges = Math.abs(fbm(u * 3, v * 0.6, 4, 5, 91) - 0.5) * 2;
    const n = fbm(u, v, 16, 3, 95);
    const c = mixc([58, 44, 34], [128, 108, 88], clamp01(ridges * 1.2 + n * 0.2));
    return [...c, ridges];
  });
  return pbr(p, { repeat, normal: 8, roughness: 0.95 });
});

export const straw = (repeat = [3, 3]) => once('straw' + repeat, () => {
  const p = paint(512, () => [190, 160, 90, 0.5]);
  const r = rng(5);
  for (let i = 0; i < 2600; i++) {
    const x = r() * 512, y = r() * 512, a = (r() - 0.5) * 1.2 + Math.PI / 2, l = 20 + r() * 60;
    const g = 140 + r() * 100;
    p.ctx.strokeStyle = `rgb(${g + 30},${g},${g * 0.45})`;
    p.ctx.lineWidth = 1 + r() * 2;
    p.ctx.beginPath(); p.ctx.moveTo(x, y); p.ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); p.ctx.stroke();
  }
  const d = p.ctx.getImageData(0, 0, 512, 512).data;
  for (let i = 0; i < 512 * 512; i++) p.height[i] = d[i * 4] / 255;
  return pbr(p, { repeat, normal: 3, roughness: 1 });
});

export const rope = (repeat = [6, 3]) => once('rope' + repeat, () => {
  // woven jute rope (charpai) — over/under pattern
  const p = paint(256, (u, v) => {
    const a = (u * 8) % 1, b = (v * 8) % 1;
    const cellA = Math.floor(u * 8), cellB = Math.floor(v * 8);
    const over = (cellA + cellB) % 2 === 0;
    const t = over ? Math.sin(a * Math.PI) : Math.sin(b * Math.PI);
    const twist = Math.sin(((over ? b : a) * 10 + (over ? a : b) * 2) * Math.PI) * 0.15;
    const g = 150 + t * 70 + twist * 80;
    return [g, g * 0.82, g * 0.55, t * 0.8 + twist];
  });
  return pbr(p, { repeat, normal: 6, roughness: 1 });
});

export const weave = (repeat = [8, 2]) => once('weave' + repeat, () => {
  const p = paint(256, (u, v) => {
    const a = (u * 6) % 1, b = (v * 10) % 1;
    const over = (Math.floor(u * 6) + Math.floor(v * 10)) % 2 === 0;
    const t = over ? Math.sin(b * Math.PI) : Math.sin(a * Math.PI) * 0.6;
    const g = 120 + t * 90;
    return [g * 1.05, g * 0.85, g * 0.5, t];
  });
  return pbr(p, { repeat, normal: 5, roughness: 0.95 });
});

export const terracotta = (repeat = [1, 1]) => once('terra' + repeat, () => {
  const p = paint(256, (u, v) => {
    const n = fbm(u, v, 8, 5, 111);
    const c = mixc([150, 68, 40], [196, 104, 66], n);
    return [...c, n];
  });
  return pbr(p, { repeat, normal: 2, roughness: 0.85 });
});

export const stone = (repeat = [1, 1]) => once('stone' + repeat, () => {
  const p = paint(512, (u, v) => {
    const cell = fbm(u, v, 6, 2, 121);
    const n = fbm(u, v, 12, 4, 131);
    const g = 110 + n * 70;
    return [g, g * 0.97, g * 0.92, cell * 0.5 + n * 0.5];
  });
  return pbr(p, { repeat, normal: 5, roughness: 0.9 });
});

// Leaf atlas with alpha (several leaves per texture) for instanced foliage cards.
export const leaves = () => once('leaves', () => {
  const c = canvas(256, 256), ctx = c.getContext('2d');
  const r = rng(77);
  for (let i = 0; i < 26; i++) {
    const x = 20 + r() * 216, y = 20 + r() * 216, s = 14 + r() * 16, a = r() * Math.PI * 2;
    const g = 90 + r() * 80;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = `rgb(${g * 0.55},${g + 40},${g * 0.3})`;
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.45, s, 0); ctx.quadraticCurveTo(0, s * 0.45, -s, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(30,60,20,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
    ctx.restore();
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
});

// Soft fur normal map shared by the animal characters (short directional strands).
export const furNormal = () => once('fur', () => {
  const p = paint(256, (u, v) => {
    const s = fbm(u * 0.5, v * 4, 16, 3, 141);
    return [0, 0, 0, s];
  });
  return tex(normalFromHeight(p.height, p.size, 4), [12, 12], false);
});
