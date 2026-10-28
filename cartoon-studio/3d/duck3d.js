// Duck story cast: fluffy Duckling (hero), Mother Duck, Butterfly.
// Fluff uses shell texturing: N copies of a mesh pushed out along the normals,
// alpha-tested against a strand map so the outer shells only keep the long strands.
import * as THREE from 'three';
import { rng, fbm } from './textures.js';

// ------------------------------------------------------------------ helpers
function grp(parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.set(...rot); parent.add(g); return g;
}
function msh(geo, mat, parent, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rot);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
const S = (r, w = 48, h = 32) => new THREE.SphereGeometry(r, w, h);

let strandTex = null;
function strands() {
  if (strandTex) return strandTex;
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n;
  const ctx = c.getContext('2d'), img = ctx.createImageData(n, n), r = rng(99);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    // clumped strand heights: cell noise * random
    const clump = fbm(x / n, y / n, 16, 2, 5);
    const v = Math.pow(r(), 0.7) * (0.55 + clump * 0.6);
    const i = (y * n + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v * 255); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  strandTex = new THREE.CanvasTexture(c);
  strandTex.wrapS = strandTex.wrapT = THREE.RepeatWrapping;
  return strandTex;
}

// Adds fluffy shells to `base` (a Mesh). colors: root -> tip.
export function fur(base, { layers = 18, length = 0.03, root = 0xb08020, tip = 0xffe27a, repeat = 18, gravity = 0.3, roughness = 1 } = {}) {
  repeat = Math.max(2, repeat * 0.45);
  const tex = strands().clone();
  tex.needsUpdate = true;
  const geo = base.geometry;
  if (!geo.attributes.fluff) {   // clumpy, uneven fluff length -> soft irregular silhouette
    const p = geo.attributes.position, f = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      f[i] = 0.55 + fbm(v.x * 0.5 + 0.5 + v.z * 0.13, v.y * 0.5 + 0.5 + v.z * 0.07, 8, 3, 3) * 0.9;
    }
    geo.setAttribute('fluff', new THREE.BufferAttribute(f, 1));
  }
  tex.repeat.set(repeat, repeat);
  const rc = new THREE.Color(root), tc = new THREE.Color(tip);
  const shells = [];
  for (let i = 1; i <= layers; i++) {
    const k = i / layers;
    const m = new THREE.MeshStandardMaterial({
      color: rc.clone().lerp(tc, Math.pow(k, 0.6)), alphaMap: tex, alphaTest: 0.08 + k * 0.82,
      roughness, side: THREE.FrontSide,
    });
    const off = length * k, grav = gravity * off * k;
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float fluff;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>
         transformed += normalize(objectNormal) * ${off.toFixed(5)} * fluff;
         transformed.y -= ${grav.toFixed(5)} * fluff;`);
    };
    m.customProgramCacheKey = () => 'fur' + i + layers + length;
    const s = new THREE.Mesh(base.geometry, m);
    s.castShadow = i < layers * 0.4;
    s.receiveShadow = true;
    base.add(s);
    shells.push(s);
  }
  return shells;
}

// Big glossy cartoon eye (iris texture + wet cornea + highlights). Returns rig parts.
function irisTexture(col) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const base = new THREE.Color(col);
  const css = (k) => `rgb(${(base.r * 255 * k) | 0},${(base.g * 255 * k) | 0},${(base.b * 255 * k) | 0})`;
  const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, css(1.6)); grad.addColorStop(0.55, css(1.0)); grad.addColorStop(0.9, css(0.55)); grad.addColorStop(1, css(0.25));
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const r = rng(4);
  g.globalAlpha = 0.35;
  for (let i = 0; i < 160; i++) {
    const a = r() * Math.PI * 2;
    g.strokeStyle = r() > 0.5 ? css(1.9) : css(0.5);
    g.lineWidth = 1 + r() * 2;
    g.beginPath(); g.moveTo(128 + Math.cos(a) * 45, 128 + Math.sin(a) * 45); g.lineTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = '#0a0a10'; g.beginPath(); g.arc(128, 128, 46, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function bigEye(parent, pos, r, irisColor, lidColor) {
  const eye = grp(parent, pos);
  msh(S(r), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, sheen: 0.2 }), eye, [0, 0, 0], [1, 1.12, 0.85]);
  const look = grp(eye);
  const irisMat = new THREE.MeshPhysicalMaterial({ map: irisTexture(irisColor), roughness: 0.25 });
  const cap = new THREE.SphereGeometry(r * 1.004, 48, 24, 0, Math.PI * 2, 0, 0.78);
  cap.rotateX(Math.PI / 2);
  const cp = cap.attributes.position, cuv = cap.attributes.uv, span = r * Math.sin(0.78) * 2;
  for (let i = 0; i < cp.count; i++) cuv.setXY(i, cp.getX(i) / span + 0.5, cp.getY(i) / span + 0.5);
  msh(cap, irisMat, look, [0, 0, 0], [1, 1.12, 0.85]);
  // wet cornea + highlights
  msh(S(r * 1.03), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0, clearcoat: 1, metalness: 0 }), eye, [0, 0, 0], [1, 1.12, 0.87]);
  const hl = new THREE.MeshBasicMaterial({ color: 0xffffff });
  msh(S(r * 0.2), hl, look, [r * 0.28, r * 0.38, r * 0.82]).castShadow = false;
  msh(S(r * 0.09), hl, look, [-r * 0.25, -r * 0.3, r * 0.84]).castShadow = false;
  // upper eyelid (blink / sad droop): half shell scaled on Y
  const lid = grp(eye, [0, r * 1.12, 0]);
  const lm = msh(new THREE.SphereGeometry(r * 1.06, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: lidColor, roughness: 0.9 }), lid, [0, -r * 1.12, 0], [1, 1.12, 0.9]);
  lm.castShadow = false;
  lid.scale.y = 0.001;
  // tear water line (grows when sad)
  const tearLine = msh(new THREE.TorusGeometry(r * 0.75, r * 0.12, 8, 24, Math.PI * 0.8),
    new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0, transmission: 0.6, transparent: true, opacity: 0.75, clearcoat: 1 }),
    eye, [0, -r * 0.15, r * 0.55], [1, 1, 0.6], [0, 0, Math.PI + Math.PI * 0.1]);
  tearLine.visible = false; tearLine.castShadow = false;
  return { eye, look, lid, tearLine };
}

function webbedFoot(parent, pos, color, scale = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.quadraticCurveTo(-0.07, 0.06, -0.075, 0.13);
  sh.quadraticCurveTo(-0.045, 0.11, -0.035, 0.14);
  sh.quadraticCurveTo(-0.012, 0.115, 0, 0.155);
  sh.quadraticCurveTo(0.012, 0.115, 0.035, 0.14);
  sh.quadraticCurveTo(0.045, 0.11, 0.075, 0.13);
  sh.quadraticCurveTo(0.07, 0.06, 0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 3, curveSegments: 10 });
  geo.rotateX(Math.PI / 2);
  const f = msh(geo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, clearcoat: 0.3 }), parent, pos, [scale, scale, scale]);
  return f;
}

// ------------------------------------------------------------------ Duckling
export function makeDuckling({ tint = 0xffd84a, scale = 1, eyeColor = 0x3a8fe0 } = {}) {
  const root = new THREE.Group();
  const rig = {};
  const s = scale;
  root.scale.setScalar(s);
  const body = rig.body = grp(root);
  const orange = 0xf28a1a;
  const base = new THREE.Color(tint);
  const rootCol = base.clone().multiplyScalar(0.62).getHex();
  const skinMat = new THREE.MeshStandardMaterial({ color: rootCol, roughness: 1 });

  // legs + webbed feet
  rig.legs = [-1, 1].map(side => {
    const hip = grp(body, [side * 0.085, 0.1, 0.02]);
    msh(new THREE.CylinderGeometry(0.022, 0.026, 0.1, 12), new THREE.MeshStandardMaterial({ color: orange, roughness: 0.5 }), hip, [0, -0.05, 0]);
    rig[side < 0 ? 'footL' : 'footR'] = webbedFoot(hip, [0, -0.095, -0.01], orange, 1);
    return hip;
  });
  // round fluffy body
  const torso = rig.torso = grp(body, [0, 0.24, 0]);
  const bodyMesh = msh(S(0.2, 64, 48), skinMat, torso, [0, 0, -0.01], [1, 0.95, 1.08]);
  fur(bodyMesh, { root: rootCol, tip: tint, length: 0.045, layers: 20, repeat: 22 });
  // brownish fluff patch on the back (like a real duckling)
  const backMat = new THREE.MeshStandardMaterial({ color: 0x6a4a22, roughness: 1 });
  const back = msh(new THREE.SphereGeometry(0.17, 48, 24, 0, Math.PI * 2, 0, 1.0), backMat, torso, [0, 0.03, -0.06], [1, 0.9, 1], [-0.9, 0, 0]);
  fur(back, { root: 0x4a3214, tip: 0x9c7a44, length: 0.03, layers: 14, repeat: 18 });
  // little tail fluff
  const tail = msh(S(0.05), skinMat, torso, [0, 0.06, -0.21], [1, 0.8, 1]);
  fur(tail, { root: rootCol, tip: tint, length: 0.035, layers: 14, repeat: 8, gravity: -0.4 });
  // stubby wings
  rig.wings = [-1, 1].map(side => {
    const w = grp(torso, [side * 0.18, 0.02, -0.01], [0, 0, side * 0.25]);
    const wm = msh(S(0.08), skinMat, w, [side * 0.01, -0.02, 0], [0.45, 0.85, 1.1]);
    fur(wm, { root: rootCol, tip: tint, length: 0.03, layers: 14, repeat: 10 });
    return w;
  });
  // big head
  const head = rig.head = grp(torso, [0, 0.25, 0.03]);
  const headMesh = msh(S(0.17, 64, 48), skinMat, head, [0, 0, 0], [1, 0.97, 0.98]);
  fur(headMesh, { root: rootCol, tip: tint, length: 0.04, layers: 20, repeat: 18 });
  // messy tuft on top
  rig.tuft = grp(head, [0, 0.16, 0.0]);
  const tuftMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 1 });
  const r = rng(12);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const len = 0.05 + r() * 0.05;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.012, len, 6), tuftMat);
    c.position.set(Math.cos(a) * 0.02, len / 2, Math.sin(a) * 0.02);
    c.rotation.set(Math.sin(a) * 0.6 + (r() - 0.5) * 0.3, 0, -Math.cos(a) * 0.6);
    c.castShadow = true;
    rig.tuft.add(c);
  }
  // eyes (big, glossy, close to the bill like the reference)
  rig.eyes = [-1, 1].map(side => bigEye(head, [side * 0.072, 0.02, 0.14], 0.058, eyeColor, rootCol));
  rig.eyes.forEach((e, i) => { e.eye.rotation.y = (i ? 1 : -1) * 0.28; });
  // fluffy brows for expressions
  rig.brows = [-1, 1].map(side => {
    const b = grp(head, [side * 0.072, 0.1, 0.165]);
    const bm = msh(new THREE.CapsuleGeometry(0.007, 0.04, 6, 12), new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.55), roughness: 1 }), b, [0, 0, 0], [1, 1, 0.8], [0, 0, Math.PI / 2]);
    return b;
  });
  // bill: upper + lower (lower drops to "quack")
  const billMat = new THREE.MeshPhysicalMaterial({ color: orange, roughness: 0.35, clearcoat: 0.5 });
  rig.bill = grp(head, [0, -0.055, 0.12]);
  msh(S(0.075, 48, 24), billMat, rig.bill, [0, 0.0, 0.05], [0.95, 0.3, 1.05], [-0.15, 0, 0]);
  msh(S(0.006), new THREE.MeshStandardMaterial({ color: 0x8a3a0a }), rig.bill, [-0.016, 0.022, 0.095]);
  msh(S(0.006), new THREE.MeshStandardMaterial({ color: 0x8a3a0a }), rig.bill, [0.016, 0.022, 0.095]);
  msh(new THREE.TorusGeometry(0.06, 0.003, 6, 32, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: 0xa8460a }), rig.bill, [0, -0.004, 0.045], [1.1, 1, 1.15], [Math.PI / 2 - 0.15, 0, Math.PI * 0.05]);
  rig.jaw = grp(rig.bill, [0, -0.01, 0.0]);
  msh(S(0.065, 48, 24), new THREE.MeshPhysicalMaterial({ color: 0xd8701a, roughness: 0.4 }), rig.jaw, [0, -0.008, 0.045], [0.85, 0.22, 0.95], [-0.15, 0, 0]);
  // tear drop (rolls down the cheek when crying)
  rig.tear = msh(S(0.014), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0, transmission: 0.9, thickness: 0.02, transparent: true, opacity: 0.85, clearcoat: 1, ior: 1.33 }), head, [0.1, -0.03, 0.15], [1, 1.35, 1]);
  rig.tear.visible = false;
  return { root, rig };
}

// ------------------------------------------------------------------ Mother duck
function featherTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#7a5530'; g.fillRect(0, 0, 512, 512);
  const r = rng(31);
  // overlapping scalloped feathers, each with a dark centre streak and pale edge
  for (let row = -1; row < 20; row++) for (let col = -1; col < 14; col++) {
    const x = col * 40 + (row % 2) * 20 + (r() - 0.5) * 6, y = row * 28;
    const tone = 0.75 + r() * 0.5;
    g.fillStyle = `rgb(${(150 * tone) | 0},${(108 * tone) | 0},${(66 * tone) | 0})`;
    g.beginPath(); g.ellipse(x, y, 22, 30, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(230,200,150,0.7)`; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y, 21, 29, 0, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = `rgba(50,30,15,0.75)`;
    g.beginPath(); g.ellipse(x, y + 2, 6, 18, 0, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
  return t;
}

export function makeMotherDuck() {
  const root = new THREE.Group();
  const rig = {};
  const body = rig.body = grp(root);
  const ftex = featherTexture();
  const plumage = new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.75 });
  const orange = 0xe8801a;

  rig.legs = [-1, 1].map(side => {
    const hip = grp(body, [side * 0.12, 0.16, 0.05]);
    msh(new THREE.CylinderGeometry(0.03, 0.035, 0.16, 12), new THREE.MeshStandardMaterial({ color: orange, roughness: 0.5 }), hip, [0, -0.08, 0]);
    webbedFoot(hip, [0, -0.15, -0.01], orange, 1.15);
    return hip;
  });
  const torso = rig.torso = grp(body, [0, 0.36, 0]);
  const bm = msh(S(0.3, 64, 48), plumage, torso, [0, 0, -0.04], [1, 0.82, 1.45]);
  fur(bm, { root: 0x5a3c1e, tip: 0xb08858, length: 0.012, layers: 6, repeat: 30, gravity: 0 });
  // tail feathers
  msh(new THREE.ConeGeometry(0.12, 0.28, 24), plumage, torso, [0, 0.12, -0.5], [1, 1, 0.4], [-2.1, 0, 0]);
  // wings with the iconic blue speculum
  rig.wings = [-1, 1].map(side => {
    const w = grp(torso, [side * 0.27, 0.06, -0.05], [0, 0, side * 0.12]);
    msh(S(0.2), plumage, w, [0, 0, -0.05], [0.3, 0.6, 1.4]);
    msh(new THREE.BoxGeometry(0.02, 0.06, 0.16), new THREE.MeshPhysicalMaterial({ color: 0x2a4ac8, roughness: 0.2, clearcoat: 1, iridescence: 0.8 }), w, [side * 0.05, -0.03, -0.12]);
    return w;
  });
  // neck + head
  rig.neck = grp(torso, [0, 0.16, 0.3]);
  const neckTex = featherTexture(); neckTex.repeat.set(2, 1.2);
  const neckMat = new THREE.MeshStandardMaterial({ map: neckTex, roughness: 0.75 });
  msh(new THREE.CylinderGeometry(0.085, 0.13, 0.3, 24), neckMat, rig.neck, [0, 0.12, 0], [1, 1, 1], [0.25, 0, 0]);
  const head = rig.head = grp(rig.neck, [0, 0.3, 0.06]);
  msh(S(0.15), plumage, head, [0, 0, 0], [0.95, 0.95, 1.1]);
  // dark eye stripe
  for (const side of [-1, 1]) msh(new THREE.CapsuleGeometry(0.012, 0.1, 6, 12), new THREE.MeshStandardMaterial({ color: 0x3a2412 }), head, [side * 0.12, 0.02, 0.03], [1, 1, 1], [Math.PI / 2, 0, side * 0.1]);
  rig.eyes = [-1, 1].map(side => bigEye(head, [side * 0.085, 0.03, 0.1], 0.042, 0x6a3a14, 0x7a5530));
  rig.eyes.forEach((e, i) => { e.eye.rotation.y = (i ? 1 : -1) * 0.5; });
  const billMat = new THREE.MeshPhysicalMaterial({ color: orange, roughness: 0.4, clearcoat: 0.4 });
  rig.bill = grp(head, [0, -0.03, 0.14]);
  msh(S(0.08), billMat, rig.bill, [0, 0, 0.07], [0.9, 0.3, 1.25]);
  msh(S(0.03), new THREE.MeshStandardMaterial({ color: 0x3a2412 }), rig.bill, [0, 0.015, 0.1], [1, 0.4, 1.2]);
  rig.jaw = grp(rig.bill, [0, -0.012, 0]);
  msh(S(0.07), billMat, rig.jaw, [0, -0.01, 0.06], [0.85, 0.22, 1.2]);
  return { root, rig };
}

// ------------------------------------------------------------------ Butterfly
export function makeButterfly() {
  const root = new THREE.Group();
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  // monarch-like wing (drawn for the right side; mirrored for the left)
  g.fillStyle = '#ff8a1a';
  g.beginPath(); g.moveTo(10, 128); g.bezierCurveTo(80, 0, 250, 10, 240, 90); g.bezierCurveTo(230, 130, 140, 128, 10, 128); g.fill();
  g.beginPath(); g.moveTo(10, 128); g.bezierCurveTo(120, 140, 210, 170, 170, 230); g.bezierCurveTo(130, 260, 60, 200, 10, 128); g.fill();
  g.strokeStyle = '#1a1010'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(10, 128); g.bezierCurveTo(80, 0, 250, 10, 240, 90); g.bezierCurveTo(230, 130, 140, 128, 10, 128); g.stroke();
  g.beginPath(); g.moveTo(10, 128); g.bezierCurveTo(120, 140, 210, 170, 170, 230); g.bezierCurveTo(130, 260, 60, 200, 10, 128); g.stroke();
  g.lineWidth = 3;
  for (const [x, y] of [[60, 100], [110, 80], [160, 70], [70, 160], [120, 180]]) { g.beginPath(); g.moveTo(10, 128); g.lineTo(x, y); g.stroke(); }
  g.fillStyle = '#fff';
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(180 + Math.cos(i) * 40, 60 + Math.sin(i * 1.7) * 20, 4, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, emissive: 0x442200, emissiveIntensity: 0.5 });
  const wingGeo = new THREE.PlaneGeometry(0.12, 0.12);
  wingGeo.translate(0.06, 0, 0);
  const wings = [-1, 1].map(side => {
    const w = new THREE.Group(); root.add(w);
    const m = new THREE.Mesh(wingGeo, mat); m.rotation.x = -Math.PI / 2; m.scale.x = side;
    m.castShadow = true;
    w.add(m);
    return w;
  });
  const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.05, 4, 8), new THREE.MeshStandardMaterial({ color: 0x1a1010 }));
  bodyM.rotation.x = Math.PI / 2; root.add(bodyM);
  return { root, rig: { wings } };
}
