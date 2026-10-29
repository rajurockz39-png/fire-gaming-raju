// Realistic village-yard set: physical sky, HDRI lighting, soil terrain with grass,
// plastered house with clay-tile roof, brick compound wall, tree, haystack, charpai,
// banana basket, clay pots and distant hills.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import * as T from './textures.js';

const W = 1080, H = 1920;

export function makeRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(W, H);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.85;
  document.body.appendChild(r.domElement);
  return r;
}

async function loadHDRI(renderer, name) {
  const mod = await import(`./node_modules/@pmndrs/assets/hdri/${name}.exr.js`);
  const tex = await new EXRLoader().loadAsync(mod.default);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  tex.dispose();
  return env;
}

function place(m, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ------------------------------------------------------------------ pieces
function ground(scene) {
  const g = new THREE.PlaneGeometry(120, 120, 240, 240);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x, z + 2);
    const k = Math.min(1, Math.max(0, (d - 9) / 10));  // flat yard, rolling land further out
    pos.setY(i, k * k * (T.fbm(x / 120 + 0.5, z / 120 + 0.5, 3, 4, 7) - 0.4) * 6);
    // the bare yard fades into green fields further out
    const g2 = Math.min(1, Math.max(0, (d - 6) / 6)) * (0.8 + T.fbm(x / 60 + 0.5, z / 60 + 0.5, 4, 3, 13) * 0.4);
    colors.push(1 - g2 * 0.55, 1 - g2 * 0.2, 1 - g2 * 0.7);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const soilMat = T.soil([40, 40]).clone();
  soilMat.vertexColors = true;
  const m = place(new THREE.Mesh(g, soilMat), scene);
  m.castShadow = false;
  return m;
}

function grass(scene, count = 70000) {
  const blade = new THREE.PlaneGeometry(0.03, 0.18, 1, 4);
  blade.translate(0, 0.09, 0);
  const p = blade.attributes.position;
  for (let i = 0; i < p.count; i++) {      // taper + bend
    const y = p.getY(i) / 0.18;
    p.setX(i, p.getX(i) * (1 - y * 0.9));
    p.setZ(i, y * y * 0.08);
  }
  blade.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.85 });
  const inst = new THREE.InstancedMesh(blade, mat, count);
  const r = T.rng(3), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const c = new THREE.Color();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 8; tries++) {
    const x = (r() - 0.5) * 30, z = -14 + r() * 16.5;
    const d = Math.hypot(x * 0.9, (z + 0.2) * 1.4);
    const patch = T.fbm(x / 30 + 0.5, z / 30 + 0.5, 4, 3, 17);
    // keep the trampled yard bare; grass thickens towards the edges and along walls
    if (d < 3.6 + patch * 2 && !(z < -2.6 && z > -3.6)) continue;
    if (patch < 0.38 && d < 7) continue;
    e.set((r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5);
    q.setFromEuler(e);
    const s = 0.6 + r() * 0.9;
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.7 + r() * 0.8), s));
    inst.setMatrixAt(n, m4);
    const dry = r() * 0.6 + (1 - patch) * 0.3;
    c.setRGB(0.32 + dry * 0.35, 0.5 + dry * 0.1, 0.14 + dry * 0.06, THREE.SRGBColorSpace);
    inst.setColorAt(n, c);
    n++;
  }
  inst.count = n;
  inst.castShadow = false; inst.receiveShadow = true;
  scene.add(inst);
}

function house(scene) {
  const h = new THREE.Group();
  h.position.set(-3.6, 0, -4.6);
  h.rotation.y = 0.12;
  scene.add(h);
  const Wd = 5.6, Ht = 2.7, Dp = 3.6;
  // stone plinth + plastered walls
  place(new THREE.Mesh(new THREE.BoxGeometry(Wd + 0.3, 0.4, Dp + 0.3), T.stone([4, 0.4])), h, [0, 0.2, 0]);
  place(new THREE.Mesh(new THREE.BoxGeometry(Wd, Ht, Dp), T.plaster([2, 1])), h, [0, 0.4 + Ht / 2, 0]);
  // door (recessed wooden planks with frame)
  const wood = T.wood([1, 1]);
  place(new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.08), wood), h, [-1.0, 1.4, Dp / 2 + 0.01]);
  const frame = T.wood([0.3, 1], [90, 60, 38]);
  place(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.16), frame), h, [-1.0, 2.45, Dp / 2 + 0.03]);
  for (const s of [-1, 1]) place(new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.16), frame), h, [-1.0 + s * 0.62, 1.42, Dp / 2 + 0.03]);
  const knob = new THREE.MeshStandardMaterial({ color: 0x7a6a40, metalness: 0.9, roughness: 0.35 });
  place(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), knob), h, [-0.6, 1.4, Dp / 2 + 0.07]);
  // window with iron bars and blue wooden shutters
  place(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.06), new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 1 })), h, [1.2, 1.75, Dp / 2 + 0.01]);
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.6 });
  for (let i = 0; i < 6; i++) place(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), iron), h, [0.78 + i * 0.17, 1.75, Dp / 2 + 0.05]);
  const shutter = T.wood([0.6, 1], [72, 100, 108]);
  place(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.92, 0.05), shutter), h, [0.42, 1.75, Dp / 2 + 0.25], [0, 1.2, 0]);
  place(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.92, 0.05), shutter), h, [1.98, 1.75, Dp / 2 + 0.25], [0, -1.2, 0]);
  place(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.18), frame), h, [1.2, 1.25, Dp / 2 + 0.06]);
  // two stone steps
  place(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.5), T.stone([1, 0.2])), h, [-1.0, 0.09, Dp / 2 + 0.35]);
  // gable roof of clay half-tiles
  const roof = new THREE.Group(); roof.position.set(0, 0.4 + Ht, 0); h.add(roof);
  const pitch = 0.5, slope = (Dp / 2 + 0.6) / Math.cos(pitch), len = Wd + 0.9;
  const ridgeH = Math.tan(pitch) * Dp / 2 + 0.05;   // sheet clears the wall top
  // clay-tile roof: one corrugated sheet per side (tile ridges + overlapping rows)
  const tileMat = T.terracotta([6, 3]);
  tileMat.side = THREE.DoubleSide;
  for (const side of [-1, 1]) {
    const sheet = new THREE.PlaneGeometry(len, slope, 260, 48);
    sheet.translate(0, -slope / 2, 0);              // ridge at y = 0, eaves at y = -slope
    const sp = sheet.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), y = sp.getY(i);
      const ridge = Math.abs(Math.sin(x * Math.PI / 0.22)) * 0.045;
      const row = ((-y) / 0.32) % 1;
      sp.setZ(i, ridge + row * 0.03);
    }
    sheet.computeVertexNormals();
    const yaw = new THREE.Group(); yaw.position.set(0, ridgeH, 0); yaw.rotation.y = side > 0 ? 0 : Math.PI; roof.add(yaw);
    const tilt = new THREE.Group(); tilt.rotation.x = pitch; yaw.add(tilt);
    place(new THREE.Mesh(sheet, tileMat), tilt, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  }
  place(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, len, 12), T.terracotta()), roof, [0, ridgeH + 0.03, 0], [0, 0, Math.PI / 2]);
  // gable triangles
  const tri = new THREE.Shape([new THREE.Vector2(-Dp / 2, 0), new THREE.Vector2(Dp / 2, 0), new THREE.Vector2(0, ridgeH)]);
  for (const s of [-1, 1]) place(new THREE.Mesh(new THREE.ShapeGeometry(tri), T.plaster([1, 0.3])), roof, [s * Wd / 2, 0, 0], [0, s * Math.PI / 2, 0]);
  return h;
}

function compoundWall(scene) {
  const g = new THREE.Group(); scene.add(g);
  const len = 9, ht = 1.25, th = 0.3;
  const wall = place(new THREE.Mesh(new THREE.BoxGeometry(len, ht, th), T.brick([len / 1.1, ht / 1.1])), g, [4.0, ht / 2, -3.1]);
  // plaster coping on top
  place(new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, th + 0.08), T.plaster([6, 0.2], [200, 192, 175])), g, [4.0, ht + 0.04, -3.1]);
  // a few loose bricks at the base
  const r = T.rng(4);
  for (let i = 0; i < 5; i++) {
    place(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.11), T.brick([0.3, 0.2])), g,
      [1.2 + r() * 5, 0.035, -2.75 + r() * 0.3], [0, r() * 3, 0]);
  }
  return wall;
}

function tree(scene, x, z, seed = 1, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); scene.add(g);
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.36, 3.2, 28, 24);
  const p = trunkGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i));
    const bump = 1 + (T.fbm(a / 6.28 + 0.5, y / 3.2 + 0.5, 4, 3, seed) - 0.5) * 0.35;
    p.setX(i, p.getX(i) * bump + Math.sin(y * 0.9) * 0.08);
    p.setZ(i, p.getZ(i) * bump);
  }
  trunkGeo.computeVertexNormals();
  const barkMat = T.bark([2, 3]);
  place(new THREE.Mesh(trunkGeo, barkMat), g, [0, 1.6, 0]);
  const r = T.rng(seed * 13);
  const centers = [];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + r();
    const len = 1.3 + r() * 0.6;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.13, len, 12), barkMat);
    const dir = new THREE.Vector3(Math.cos(a) * 0.8, 0.9, Math.sin(a) * 0.8).normalize();
    br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    br.position.set(0, 2.8, 0).addScaledVector(dir, len / 2);
    br.castShadow = br.receiveShadow = true;
    g.add(br);
    centers.push(new THREE.Vector3(0, 2.8, 0).addScaledVector(dir, len));
  }
  centers.push(new THREE.Vector3(0, 4.0, 0));
  // dense inner volume + thousands of leaf cards
  const inner = new THREE.MeshStandardMaterial({ color: 0x3a5a24, roughness: 1 });
  const leafGeo = new THREE.PlaneGeometry(0.55, 0.55);
  const leaves = new THREE.InstancedMesh(leafGeo, T.leaves(), centers.length * 900);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  let n = 0;
  for (const cen of centers) {
    const rad = 0.85 + r() * 0.35;
    place(new THREE.Mesh(new THREE.IcosahedronGeometry(rad * 0.75, 2), inner), g, cen.toArray());
    for (let i = 0; i < 900; i++) {
      const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(rad * (0.7 + r() * 0.4));
      m4.compose(cen.clone().add(v), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)),
        new THREE.Vector3(1, 1, 1).multiplyScalar(0.7 + r() * 0.6));
      leaves.setMatrixAt(n, m4);
      c.setHSL(0.22 + r() * 0.06, 0.4, 0.55 + r() * 0.25, THREE.SRGBColorSpace);
      leaves.setColorAt(n, c);
      n++;
    }
  }
  leaves.castShadow = leaves.receiveShadow = true;
  g.add(leaves);
  return g;
}

function haystack(scene, x, z) {
  const prof = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(Math.sin(t * Math.PI / 2) * 1.0 * (1 - t * t * 0.3) + 0.01, (1 - t) * 1.7)); }
  prof.reverse();
  const geo = new THREE.LatheGeometry(prof.map((v, i) => new THREE.Vector2(Math.cos((1 - i / 16) * Math.PI / 2) * 1.1, v.y)), 40);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (T.fbm(p.getX(i) / 3 + 0.5, p.getY(i) / 3 + 0.5, 6, 3, 5) - 0.5) * 0.25;
    p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  const st = place(new THREE.Mesh(geo, T.straw([4, 2])), scene, [x, 0, z]);
  return st;
}

export function charpai(parent, pos, rotY = 0) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; parent.add(g);
  const L = 1.9, Wd = 0.95, Ht = 0.45;
  const wood = T.wood([0.2, 1], [110, 72, 40]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.045 + Math.sin(t * Math.PI * 3) * 0.012 + (1 - t) * 0.01, t * Ht)); }
    place(new THREE.Mesh(new THREE.LatheGeometry(pts, 16), wood), g, [sx * (L / 2 - 0.05), 0, sz * (Wd / 2 - 0.05)]);
  }
  for (const sz of [-1, 1]) place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, L, 12), wood), g, [0, Ht - 0.03, sz * (Wd / 2 - 0.05)], [0, 0, Math.PI / 2]);
  for (const sx of [-1, 1]) place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, Wd, 12), wood), g, [sx * (L / 2 - 0.05), Ht - 0.03, 0], [Math.PI / 2, 0, 0]);
  const bed = new THREE.PlaneGeometry(L - 0.12, Wd - 0.12, 20, 10);
  bed.rotateX(-Math.PI / 2);
  const bp = bed.attributes.position;
  for (let i = 0; i < bp.count; i++) {    // sag in the middle
    const x = bp.getX(i) / (L / 2), z = bp.getZ(i) / (Wd / 2);
    bp.setY(i, -0.05 * (1 - x * x) * (1 - z * z));
  }
  bed.computeVertexNormals();
  place(new THREE.Mesh(bed, T.rope([7, 3.5])), g, [0, Ht - 0.02, 0]);
  return g;
}

export function bananaGeometry(len = 0.2, rad = 0.025, arc = 1.1) {
  const g = new THREE.CylinderGeometry(rad, rad, len, 7, 16);
  const p = g.attributes.position;
  const R = len / arc;
  const col = [];
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / len + 0.5;
    const taper = Math.pow(Math.sin(Math.PI * Math.min(0.98, Math.max(0.02, t))), 0.45);
    const x = p.getX(i) * taper, z = p.getZ(i) * taper;
    const a = (t - 0.5) * arc;
    // bend around an arc in the XY plane
    p.setXYZ(i, (R + x) * Math.cos(a) - R, (R + x) * Math.sin(a), z);
    const tip = t < 0.06 || t > 0.95;
    const c = tip ? [0.05, 0.03, 0.01] : [0.8, 0.52 - Math.abs(t - 0.5) * 0.1, 0.03];
    col.push(...c);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
const bananaMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });

export function banana(parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
  return place(new THREE.Mesh(bananaGeometry(), bananaMat), parent, pos, rot);
}

export function bananaPeel(parent, pos = [0, 0, 0]) {
  const g = new THREE.Group(); g.position.set(...pos); parent.add(g);
  const geo = new THREE.PlaneGeometry(0.05, 0.14, 1, 6);
  const pp = geo.attributes.position;
  for (let i = 0; i < pp.count; i++) { const y = pp.getY(i) / 0.14 + 0.5; pp.setX(i, pp.getX(i) * Math.sin(Math.PI * Math.min(0.95, y + 0.05))); pp.setZ(i, y * y * 0.05); }
  geo.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: 0xe8c43a, roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(geo, m);
    s.rotation.set(-Math.PI / 2 + 0.25, i * Math.PI / 2 + 0.3, 0);
    s.position.set(Math.cos(i * Math.PI / 2 + 0.3) * 0.05, 0.01, -Math.sin(i * Math.PI / 2 + 0.3) * 0.05);
    s.castShadow = true;
    g.add(s);
  }
  place(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x5a4a20 })), g, [0, 0.025, 0]);
  return g;
}

export function basket(parent, pos, bananasCount = 12) {
  const g = new THREE.Group(); g.position.set(...pos); parent.add(g);
  const prof = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.2, 0.0), new THREE.Vector2(0.26, 0.1), new THREE.Vector2(0.3, 0.22), new THREE.Vector2(0.31, 0.24)];
  const m = T.weave();
  m.side = THREE.DoubleSide;
  place(new THREE.Mesh(new THREE.LatheGeometry(prof, 40), m), g);
  place(new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.02, 8, 40), m), g, [0, 0.24, 0], [Math.PI / 2, 0, 0]);
  const r = T.rng(21);
  const items = [];
  for (let i = 0; i < bananasCount; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.17;
    items.push(banana(g, [Math.cos(a) * d, 0.16 + (i / bananasCount) * 0.12, Math.sin(a) * d], [r() * 0.6, r() * 6, r() * 0.6]));
  }
  return { root: g, bananas: items };
}

function pot(parent, pos, s = 1) {
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const r = t < 0.8 ? Math.sin(Math.PI * (t / 0.8) * 0.95 + 0.12) * 0.28 + 0.02 : 0.1 + (t - 0.8) * 0.4;
    pts.push(new THREE.Vector2(r, t * 0.55));
  }
  const m = T.terracotta();
  m.side = THREE.DoubleSide;
  return place(new THREE.Mesh(new THREE.LatheGeometry(pts, 32), m), parent, pos, [0, 0, 0], [s, s, s]);
}

function distant(scene) {
  // hills
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x6f8a5a, roughness: 1 });
  const r = T.rng(8);
  for (let i = 0; i < 7; i++) {
    const geo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const m = new THREE.Mesh(geo, hillMat);
    m.position.set(-110 + i * 36 + r() * 10, -2, -110 - r() * 25);
    m.scale.set(30 + r() * 15, 9 + r() * 9, 18);
    m.receiveShadow = true;
    scene.add(m);
  }
  for (let i = 0; i < 9; i++) tree(scene, -22 + i * 5.5 + r() * 2, -11 - r() * 9, 30 + i, 0.9 + r() * 0.4);
}

// ------------------------------------------------------------------ build
export async function buildSet(renderer, { time = 'morning' } = {}) {
  const scene = new THREE.Scene();
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 6; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.85;
  const elev = time === 'morning' ? 24 : 50, azim = -40;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(azim));
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);
  scene.fog = new THREE.Fog(0xd8dfe4, 30, 170);

  scene.environment = await loadHDRI(renderer, 'park');
  scene.environmentIntensity = 0.55;

  const sun = new THREE.DirectionalLight(0xfff0d8, 3.4);
  sun.position.copy(sunDir).multiplyScalar(30);
  sun.target.position.set(0, 0, -1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 80 });
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xdfe9f2, 0x8a7258, 0.9));

  ground(scene);
  grass(scene);
  house(scene);
  compoundWall(scene);
  const mainTree = tree(scene, 4.2, -1.8, 3, 1.05);
  haystack(scene, -5.3, -1.2);
  pot(scene, [-1.2, 0, -2.6], 1.0);
  pot(scene, [-0.7, 0, -2.75], 0.75);
  distant(scene);

  const cot = charpai(scene, [-0.9, 0, -0.6], 0.08);
  const bask = basket(scene, [0.55, 0, -0.35]);
  return { scene, sun, sky, cot, basket: bask, tree: mainTree };
}
