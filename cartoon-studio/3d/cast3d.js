// Naa Idea 3D cast: Bujji, Peddayya, Kodi King (built from primitives, toy/clay style).
// Each builder returns { root, rig } — root sits on the ground at its feet and faces +Z;
// rig holds the named joints the episode timeline animates.
import * as THREE from 'three';

const mats = {};
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats[key]) {
    mats[key] = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, sheen: 0.3, ...opts });
  }
  return mats[key];
}

export function mesh(geo, material, parent, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function group(parent, pos = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...pos);
  parent.add(g);
  return g;
}

const S = (r, w = 48, h = 32) => new THREE.SphereGeometry(r, w, h);
const CAP = (r, len) => new THREE.CapsuleGeometry(r, len, 12, 24);

const EYE_WHITE = () => mat(0xffffff, { roughness: 0.15, clearcoat: 1, sheen: 0 });
const PUPIL = () => mat(0x1a1210, { roughness: 0.1, clearcoat: 1, sheen: 0 });
const SHINE = () => mat(0xffffff, { roughness: 0.0, emissive: 0xffffff, emissiveIntensity: 0.6 });

// Cartoon eye with iris, pupil and highlight. Returns { eye, pupilGroup, lid } for blinks / looks.
function cartoonEye(parent, pos, r, irisColor, skin) {
  const eye = group(parent, pos);
  mesh(S(r), EYE_WHITE(), eye, [0, 0, 0], [1, 1.15, 0.7]);
  const look = group(eye, [0, 0, 0]);
  mesh(S(r * 0.62), mat(irisColor, { roughness: 0.2, clearcoat: 1 }), look, [0, -r * 0.05, r * 0.42], [1, 1.1, 0.5]);
  mesh(S(r * 0.36), PUPIL(), look, [0, -r * 0.05, r * 0.6], [1, 1.1, 0.4]);
  mesh(S(r * 0.14), SHINE(), look, [r * 0.22, r * 0.25, r * 0.72]);
  // eyelid: a skin-coloured half shell, scaled on Y to blink
  const lid = group(eye, [0, r * 1.15, 0]);
  const lidMesh = mesh(new THREE.SphereGeometry(r * 1.06, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(skin), lid, [0, -r * 1.15, 0], [1, 1.15, 0.75]);
  lid.scale.y = 0.001;
  lidMesh.castShadow = false;
  return { eye, look, lid };
}

function smile(parent, pos, r, tube, color = 0x5a1a1a) {
  const g = group(parent, pos);
  const m = mesh(new THREE.TorusGeometry(r, tube, 12, 32, Math.PI), mat(color), g, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI]);
  return g;
}

function openMouth(parent, pos, r) {
  const g = group(parent, pos);
  mesh(S(r), mat(0x7a1c24, { roughness: 0.4 }), g, [0, 0, 0], [1, 0.8, 0.35]);
  mesh(S(r * 0.55), mat(0xe86a7a), g, [0, -r * 0.35, r * 0.15], [1, 0.5, 0.3]);
  g.visible = false;
  return g;
}

// ------------------------------------------------------------------ Bujji
export function makeBujji() {
  const skin = 0xc98a5e;
  const root = new THREE.Group();
  const rig = {};
  const body = rig.body = group(root, [0, 0, 0]);

  // legs
  rig.legs = [-1, 1].map(side => {
    const hip = group(body, [side * 0.11, 0.5, 0]);
    mesh(CAP(0.065, 0.28), mat(skin), hip, [0, -0.2, 0]);
    const shoe = mesh(S(0.1), mat(0xd23c32, { roughness: 0.4, clearcoat: 0.5 }), hip, [0, -0.44, 0.05], [0.9, 0.6, 1.4]);
    mesh(S(0.1), mat(0xf5f5f5), hip, [0, -0.48, 0.05], [0.95, 0.25, 1.45]);
    return hip;
  });
  // shorts
  const denim = mat(0x2f5fc8, { roughness: 0.8 });
  mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.13, 32), denim, body, [0, 0.56, 0]);
  for (const side of [-1, 1]) mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.14, 24), denim, body, [side * 0.105, 0.46, 0]);
  // torso / shirt
  const torso = rig.torso = group(body, [0, 0.62, 0]);
  mesh(CAP(0.215, 0.18), mat(0xffc928, { roughness: 0.75, sheen: 0.6, sheenColor: 0xffffff }), torso, [0, 0.17, 0], [1, 1, 0.85]);
  mesh(new THREE.TorusGeometry(0.1, 0.025, 12, 32), mat(0xffffff), torso, [0, 0.39, 0.02], [1, 1, 1], [Math.PI / 2.2, 0, 0]);
  mesh(S(0.025), mat(0x2f5fc8), torso, [0, 0.22, 0.19]);
  mesh(S(0.025), mat(0x2f5fc8), torso, [0, 0.12, 0.2]);
  // arms
  rig.arms = [-1, 1].map(side => {
    const sh = group(torso, [side * 0.22, 0.32, 0]);
    mesh(S(0.085), mat(0xffc928, { roughness: 0.75 }), sh, [0, 0, 0]);
    mesh(CAP(0.052, 0.24), mat(skin), sh, [side * 0.02, -0.17, 0]);
    const hand = rig[side < 0 ? 'handL' : 'handR'] = group(sh, [side * 0.03, -0.34, 0]);
    mesh(S(0.07), mat(skin), hand, [0, 0, 0]);
    sh.rotation.z = side * 0.12;
    return sh;
  });
  mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 20), mat(skin), torso, [0, 0.42, 0]);
  // head
  const head = rig.head = group(torso, [0, 0.66, 0]);
  mesh(S(0.34), mat(skin, { roughness: 0.6, sheen: 0.4, sheenColor: 0xffd0b0 }), head, [0, 0, 0], [1, 0.95, 0.95]);
  mesh(S(0.08), mat(skin), head, [-0.33, -0.02, 0], [0.6, 1, 0.8]);
  mesh(S(0.08), mat(skin), head, [0.33, -0.02, 0], [0.6, 1, 0.8]);
  // cheeks
  mesh(S(0.06), mat(0xe8826e, { roughness: 0.9 }), head, [-0.19, -0.1, 0.27], [1, 0.6, 0.4]);
  mesh(S(0.06), mat(0xe8826e, { roughness: 0.9 }), head, [0.19, -0.1, 0.27], [1, 0.6, 0.4]);
  // hair cap + spiky tuft
  const hairMat = mat(0x1d1513, { roughness: 0.5, clearcoat: 0.3 });
  mesh(new THREE.SphereGeometry(0.355, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.42), hairMat, head, [0, 0.02, -0.02], [1, 1, 1], [-0.25, 0, 0]);
  for (let i = 0; i < 5; i++) {
    const a = -0.6 + i * 0.3;
    mesh(new THREE.ConeGeometry(0.07, 0.2, 16), hairMat, head, [Math.sin(a) * 0.16, 0.32, 0.1 - Math.abs(a) * 0.1], [1, 1, 1], [0.5, 0, -a * 0.8]);
  }
  // face
  rig.eyes = [-1, 1].map(side => cartoonEye(head, [side * 0.12, 0.04, 0.27], 0.085, 0x4a2a14, skin));
  rig.brows = [-1, 1].map(side => {
    const b = group(head, [side * 0.12, 0.17, 0.3]);
    mesh(CAP(0.018, 0.08), hairMat, b, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2 + side * 0.15]);
    return b;
  });
  mesh(S(0.045), mat(skin), head, [0, -0.04, 0.33], [1, 0.9, 1]);
  rig.smile = smile(head, [0, -0.13, 0.3], 0.075, 0.016);
  rig.mouthOpen = openMouth(head, [0, -0.15, 0.29], 0.07);
  rig.skin = skin;
  return { root, rig };
}

// ------------------------------------------------------------------ Peddayya
export function makePeddayya() {
  const skin = 0xb57a52;
  const root = new THREE.Group();
  const rig = {};
  const body = rig.body = group(root, [0, 0, 0]);
  const white = mat(0xf7f3ea, { roughness: 0.85, sheen: 0.8, sheenColor: 0xffffff });

  // feet + sandals
  rig.legs = [-1, 1].map(side => {
    const hip = group(body, [side * 0.13, 0.55, 0]);
    mesh(CAP(0.07, 0.35), mat(skin), hip, [0, -0.3, 0]);
    mesh(S(0.1), mat(skin), hip, [0, -0.5, 0.06], [0.9, 0.5, 1.4]);
    mesh(new THREE.BoxGeometry(0.17, 0.03, 0.3), mat(0x6b3d1f), hip, [0, -0.545, 0.06]);
    return hip;
  });
  // lungi: checked green (canvas texture)
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#2f8f5a'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(15,70,40,0.6)';
  for (let i = 0; i < 128; i += 32) { g.fillRect(i, 0, 10, 128); g.fillRect(0, i, 128, 10); }
  g.fillStyle = 'rgba(255,230,120,0.5)';
  for (let i = 16; i < 128; i += 32) { g.fillRect(i, 0, 3, 128); g.fillRect(0, i, 128, 3); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  rig.lungi = mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.62, 40, 1, true), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide, sheen: 0.5 }), body, [0, 0.42, 0]);
  // torso: big belly in white kurta
  const torso = rig.torso = group(body, [0, 0.72, 0]);
  mesh(S(0.42), white, torso, [0, 0.3, 0.02], [1, 1.08, 0.95]);
  for (let i = 0; i < 3; i++) mesh(S(0.025), mat(0xd9b45a, { metalness: 0.6, roughness: 0.3 }), torso, [0, 0.55 - i * 0.12, 0.36 + i * 0.02]);
  // towel on shoulder
  mesh(CAP(0.06, 0.4), mat(0xe8463c, { roughness: 0.9 }), torso, [0.2, 0.62, 0.0], [1, 1, 0.6], [0, 0, 0.9]);
  // arms
  rig.arms = [-1, 1].map(side => {
    const sh = group(torso, [side * 0.4, 0.58, 0]);
    mesh(CAP(0.09, 0.28), white, sh, [side * 0.02, -0.16, 0]);
    mesh(CAP(0.055, 0.12), mat(skin), sh, [side * 0.03, -0.4, 0]);
    const hand = rig[side < 0 ? 'handL' : 'handR'] = group(sh, [side * 0.03, -0.5, 0]);
    mesh(S(0.075), mat(skin), hand);
    sh.rotation.z = side * 0.18;
    return sh;
  });
  // head
  const head = rig.head = group(torso, [0, 0.95, 0]);
  mesh(S(0.3), mat(skin, { roughness: 0.55, sheen: 0.3 }), head, [0, 0, 0], [1, 1.02, 0.95]);
  mesh(S(0.07), mat(skin), head, [-0.29, -0.02, 0], [0.6, 1, 0.8]);
  mesh(S(0.07), mat(skin), head, [0.29, -0.02, 0], [0.6, 1, 0.8]);
  const hair = mat(0xf2f2f2, { roughness: 0.9, sheen: 1, sheenColor: 0xffffff });
  for (const side of [-1, 1]) {
    mesh(S(0.11), hair, head, [side * 0.25, 0.04, -0.08], [0.7, 1, 1.2]);
    mesh(S(0.08), hair, head, [side * 0.2, 0.1, -0.2], [0.8, 0.8, 1]);
  }
  mesh(new THREE.BoxGeometry(0.03, 0.09, 0.02), mat(0xd42a2a), head, [0, 0.19, 0.27], [1, 1, 1], [-0.3, 0, 0]);
  rig.eyes = [-1, 1].map(side => cartoonEye(head, [side * 0.105, 0.05, 0.245], 0.06, 0x3a2414, skin));
  // round glasses
  const gold = mat(0x8a6a2a, { metalness: 0.8, roughness: 0.3 });
  for (const side of [-1, 1]) mesh(new THREE.TorusGeometry(0.075, 0.009, 8, 32), gold, head, [side * 0.105, 0.05, 0.3]);
  mesh(CAP(0.008, 0.05), gold, head, [0, 0.07, 0.31], [1, 1, 1], [0, 0, Math.PI / 2]);
  rig.brows = [-1, 1].map(side => {
    const b = group(head, [side * 0.11, 0.155, 0.27]);
    mesh(CAP(0.028, 0.08), hair, b, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2 - side * 0.2]);
    return b;
  });
  // big nose
  mesh(S(0.065), mat(skin), head, [0, -0.04, 0.3], [1, 0.9, 1]);
  // mustache: two curled tubes
  rig.mustache = group(head, [0, -0.11, 0.27]);
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0.03), new THREE.Vector3(side * 0.12, -0.03, 0.01),
      new THREE.Vector3(side * 0.24, 0.02, -0.04), new THREE.Vector3(side * 0.27, 0.11, -0.06),
      new THREE.Vector3(side * 0.22, 0.13, -0.05)]);
    mesh(new THREE.TubeGeometry(curve, 40, 0.042, 16, false), hair, rig.mustache);
    mesh(S(0.042), hair, rig.mustache, [side * 0.22, 0.13, -0.05]);
  }
  rig.smile = smile(head, [0, -0.19, 0.25], 0.05, 0.013);
  rig.mouthOpen = openMouth(head, [0, -0.2, 0.25], 0.065);
  rig.skin = skin;
  return { root, rig };
}

// ------------------------------------------------------------------ Kodi King
export function makeKodi() {
  const root = new THREE.Group();
  const rig = {};
  const body = rig.body = group(root, [0, 0, 0]);
  const white = mat(0xfbfaf4, { roughness: 0.9, sheen: 1, sheenColor: 0xffffff });
  const orange = mat(0xf2a020, { roughness: 0.5 });

  rig.legs = [-1, 1].map(side => {
    const hip = group(body, [side * 0.07, 0.3, 0]);
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 12), orange, hip, [0, -0.14, 0]);
    for (const a of [-0.5, 0, 0.5]) mesh(CAP(0.012, 0.07), orange, hip, [Math.sin(a) * 0.04, -0.27, 0.04], [1, 1, 1], [Math.PI / 2, 0, a]);
    return hip;
  });
  const torso = rig.torso = group(body, [0, 0.42, 0]);
  mesh(S(0.22), white, torso, [0, 0, 0], [1, 0.9, 1.25]);
  // wings
  rig.wings = [-1, 1].map(side => {
    const w = group(torso, [side * 0.2, 0.03, -0.02]);
    mesh(S(0.13), mat(0xece8dc, { roughness: 0.9, sheen: 1 }), w, [0, 0, -0.04], [0.35, 0.75, 1.2]);
    return w;
  });
  // tail fan
  rig.tail = group(torso, [0, 0.08, -0.22]);
  const tailCols = [0x1f6f48, 0xc8282c, 0x1c1c26, 0x1f6f48, 0xc8282c];
  tailCols.forEach((col, i) => {
    const a = -0.7 + i * 0.35;
    const f = group(rig.tail, [0, 0, 0]);
    f.rotation.set(-0.7, 0, a);
    mesh(S(0.08), mat(col, { roughness: 0.3, clearcoat: 1, sheen: 0 }), f, [0, 0.22, -0.02], [0.45, 2.4, 0.3]);
  });
  // neck + head
  rig.neck = group(torso, [0, 0.12, 0.17]);
  mesh(CAP(0.095, 0.06), white, rig.neck, [0, 0.05, 0], [1, 1, 1], [0.35, 0, 0]);
  const head = rig.head = group(rig.neck, [0, 0.15, 0.04]);
  mesh(S(0.11), white, head);
  for (let i = 0; i < 3; i++) mesh(S(0.06), mat(0xe0242c, { roughness: 0.4, clearcoat: 0.6 }), head, [0, 0.12 + (i === 1 ? 0.04 : 0), -0.06 + i * 0.06], [0.55, 1, 0.8]);
  rig.beak = mesh(new THREE.ConeGeometry(0.04, 0.11, 24), mat(0xffbe2e, { roughness: 0.3, clearcoat: 0.6 }), head, [0, -0.01, 0.13], [1, 1, 1], [Math.PI / 2, 0, 0]);
  mesh(S(0.035), mat(0xe0242c), head, [0, -0.09, 0.08], [0.7, 1.3, 0.7]);
  rig.eyes = [-1, 1].map(side => {
    const e = group(head, [side * 0.07, 0.025, 0.07]);
    mesh(S(0.03), EYE_WHITE(), e);
    mesh(S(0.018), PUPIL(), e, [side * 0.006, 0, 0.018]);
    mesh(S(0.006), SHINE(), e, [side * 0.01, 0.01, 0.03]);
    return e;
  });
  // sunglasses (hidden until the cool ending)
  rig.shades = group(head, [0, 0.03, 0.09]);
  for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(0.08, 0.045, 0.02), mat(0x111111, { roughness: 0.05, clearcoat: 1 }), rig.shades, [side * 0.05, 0, 0]);
  mesh(new THREE.BoxGeometry(0.2, 0.012, 0.012), mat(0x111111), rig.shades, [0, 0.015, 0]);
  rig.shades.visible = false;
  return { root, rig };
}

// ------------------------------------------------------------------ props
export function makeBomb() {
  const root = new THREE.Group();
  mesh(S(0.12), mat(0xc81e2a, { roughness: 0.3, clearcoat: 1 }), root, [0, 0.14, 0]);
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), mat(0x777777, { metalness: 0.7, roughness: 0.3 }), root, [0, 0.29, 0]);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0.02, 0.38, 0), new THREE.Vector3(0.07, 0.43, 0), new THREE.Vector3(0.1, 0.5, 0)]);
  const fuse = mesh(new THREE.TubeGeometry(curve, 20, 0.012, 8, false), mat(0x6b4a2a), root);
  const spark = new THREE.PointLight(0xffaa33, 0, 1.5);
  spark.position.set(0.1, 0.5, 0);
  root.add(spark);
  const sparkMesh = mesh(S(0.03), mat(0xffee88, { emissive: 0xffaa00, emissiveIntensity: 3 }), root, [0.1, 0.5, 0]);
  sparkMesh.visible = false;
  return { root, rig: { fuse, spark, sparkMesh, curve } };
}
