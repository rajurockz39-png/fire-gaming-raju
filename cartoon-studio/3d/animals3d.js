// Naa Idea animal cast (funny comedy 3D): Monkey (troublemaker), Bulldog (lazy grump),
// Rooster (twist-maker). Same conventions as cast3d.js: root on the ground, facing +Z,
// rig = named joints for the timeline.
import * as THREE from 'three';
import { mat, mesh, group, cartoonEye, smile, openMouth } from './cast3d.js';

const S = (r, w = 48, h = 32) => new THREE.SphereGeometry(r, w, h);
const CAP = (r, len) => new THREE.CapsuleGeometry(r, len, 12, 24);
const fur = (c, extra = {}) => mat(c, { roughness: 0.9, sheen: 1, sheenRoughness: 0.5, sheenColor: 0xffffff, ...extra });

function tube(points, r, material, parent) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve, 64, r, 16, false), material, parent);
}

// ------------------------------------------------------------------ Monkey
export function makeMonkey() {
  const brown = fur(0x7a4a26), tan = fur(0xe8b98a);
  const root = new THREE.Group();
  const rig = {};
  const body = rig.body = group(root, [0, 0, 0]);

  // short bandy legs + big feet
  rig.legs = [-1, 1].map(side => {
    const hip = group(body, [side * 0.1, 0.3, 0]);
    mesh(CAP(0.06, 0.16), brown, hip, [side * 0.02, -0.12, 0], [1, 1, 1], [0, 0, side * 0.2]);
    mesh(S(0.09), tan, hip, [side * 0.05, -0.27, 0.06], [1, 0.45, 1.6]);
    return hip;
  });
  // pear body + belly
  const torso = rig.torso = group(body, [0, 0.32, 0]);
  mesh(S(0.2), brown, torso, [0, 0.13, 0], [1, 1.15, 0.9]);
  mesh(S(0.15), tan, torso, [0, 0.1, 0.1], [0.95, 1.1, 0.75]);
  // red bandana
  mesh(new THREE.TorusGeometry(0.11, 0.035, 12, 32), mat(0xe0262c, { roughness: 0.7 }), torso, [0, 0.33, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  mesh(new THREE.ConeGeometry(0.07, 0.12, 3), mat(0xe0262c, { roughness: 0.7 }), torso, [0, 0.27, 0.1], [1, 1, 0.4], [Math.PI, 0, 0]);
  // looong arms
  rig.arms = [-1, 1].map(side => {
    const sh = group(torso, [side * 0.17, 0.26, 0]);
    mesh(S(0.06), brown, sh);
    mesh(CAP(0.045, 0.3), brown, sh, [0, -0.19, 0]);
    const hand = rig[side < 0 ? 'handL' : 'handR'] = group(sh, [0, -0.39, 0]);
    mesh(S(0.065), tan, hand, [0, 0, 0], [1, 1.1, 0.8]);
    mesh(CAP(0.02, 0.04), tan, hand, [side * -0.05, 0.01, 0.03], [1, 1, 1], [0, 0, side * 0.8]);
    sh.rotation.z = side * 0.15;
    return sh;
  });
  // curly tail
  const tailPts = [];
  for (let i = 0; i <= 24; i++) {
    const k = i / 24;
    const a = k * Math.PI * 2.6;
    const rad = 0.18 * (1 - k * 0.6);
    tailPts.push([Math.sin(a) * rad * 0.4, 0.05 + k * 0.5 + Math.cos(a) * rad * 0.3 - 0.1, -0.16 - k * 0.15 - Math.sin(a) * rad * 0.2]);
  }
  rig.tail = group(torso, [0, 0, 0]);
  tube(tailPts, 0.025, brown, rig.tail);

  // head
  const head = rig.head = group(torso, [0, 0.58, 0]);
  mesh(S(0.27), brown, head, [0, 0, 0], [1.05, 0.95, 0.95]);
  // tuft
  for (let i = 0; i < 3; i++) mesh(new THREE.ConeGeometry(0.035, 0.12, 12), brown, head, [(i - 1) * 0.05, 0.27, 0.02], [1, 1, 1], [0.2, 0, (1 - i) * 0.4]);
  // big round ears
  for (const side of [-1, 1]) {
    mesh(S(0.11), brown, head, [side * 0.29, 0.03, -0.02], [0.45, 1, 1]);
    mesh(S(0.075), mat(0xd99a7a, { roughness: 0.8 }), head, [side * 0.31, 0.03, 0.01], [0.3, 1, 1]);
  }
  // heart-shaped face mask + big muzzle
  mesh(S(0.12), tan, head, [-0.075, 0.05, 0.17], [1, 1.1, 0.7]);
  mesh(S(0.12), tan, head, [0.075, 0.05, 0.17], [1, 1.1, 0.7]);
  const muzzle = rig.muzzle = group(head, [0, -0.1, 0.2]);
  mesh(S(0.15), tan, muzzle, [0, 0, 0], [1.15, 0.85, 0.8]);
  mesh(S(0.017), mat(0x2a1a12), muzzle, [-0.03, 0.06, 0.12]);
  mesh(S(0.017), mat(0x2a1a12), muzzle, [0.03, 0.06, 0.12]);
  rig.eyes = [-1, 1].map(side => cartoonEye(head, [side * 0.075, 0.07, 0.24], 0.07, 0x5a3418, 0xe8b98a));
  rig.brows = [-1, 1].map(side => {
    const b = group(head, [side * 0.08, 0.18, 0.24]);
    mesh(CAP(0.016, 0.07), mat(0x4a2a14), b, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2 + side * 0.25]);
    return b;
  });
  // mouth variants: smile, cheeky toothy grin, open "O"
  rig.smile = smile(muzzle, [0, -0.015, 0.115], 0.07, 0.013);
  rig.grin = group(muzzle, [0, -0.04, 0.1]);
  mesh(S(0.09), mat(0x6a1a20), rig.grin, [0, 0, 0], [1.1, 0.45, 0.4]);
  mesh(new THREE.BoxGeometry(0.15, 0.03, 0.02), mat(0xffffff, { roughness: 0.2 }), rig.grin, [0, 0.02, 0.035]);
  rig.grin.visible = false;
  rig.mouthOpen = openMouth(muzzle, [0, -0.04, 0.11], 0.055);
  return { root, rig };
}

// ------------------------------------------------------------------ Bulldog
export function makeBulldog() {
  const coat = fur(0xc9905a), cream = fur(0xf3e6d0), dark = fur(0x7a4e2c);
  const root = new THREE.Group();
  const rig = {};
  const body = rig.body = group(root, [0, 0, 0]);

  // stubby legs
  rig.legs = [-1, 1].map(side => {
    const hip = group(body, [side * 0.17, 0.26, 0]);
    mesh(CAP(0.09, 0.1), coat, hip, [0, -0.1, 0]);
    mesh(S(0.11), cream, hip, [0, -0.22, 0.07], [1, 0.5, 1.3]);
    for (const t of [-1, 0, 1]) mesh(S(0.025), cream, hip, [t * 0.045, -0.22, 0.2]);
    return hip;
  });
  // barrel body + belly
  const torso = rig.torso = group(body, [0, 0.28, 0]);
  rig.belly = mesh(S(0.38), coat, torso, [0, 0.26, 0], [1.1, 0.95, 0.95]);
  mesh(S(0.3), cream, torso, [0, 0.22, 0.13], [1.05, 0.95, 0.8]);
  mesh(S(0.05), coat, torso, [0, 0.12, -0.38]);   // stub tail
  // short thick arms
  rig.arms = [-1, 1].map(side => {
    const sh = group(torso, [side * 0.38, 0.42, 0]);
    mesh(CAP(0.08, 0.16), coat, sh, [side * 0.02, -0.12, 0]);
    const hand = rig[side < 0 ? 'handL' : 'handR'] = group(sh, [side * 0.03, -0.27, 0]);
    mesh(S(0.09), cream, hand, [0, 0, 0], [1, 0.9, 1]);
    sh.rotation.z = side * 0.35;
    return sh;
  });
  // spiked collar
  const collar = group(torso, [0, 0.58, 0]);
  mesh(new THREE.TorusGeometry(0.21, 0.04, 12, 40), mat(0xd42a2a, { roughness: 0.4, clearcoat: 0.6 }), collar, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const spike = group(collar, [0, 0, 0]);
    spike.rotation.y = a;
    mesh(new THREE.ConeGeometry(0.025, 0.07, 12), mat(0xd8d8e0, { metalness: 0.9, roughness: 0.2 }), spike,
      [0, 0, 0.25], [1, 1, 1], [Math.PI / 2, 0, 0]);
  }
  // tag
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 24), mat(0xf2c230, { metalness: 0.8, roughness: 0.25 }), collar, [0, -0.07, 0.24], [1, 1, 1], [Math.PI / 2, 0, 0]);

  // big wide head
  const head = rig.head = group(torso, [0, 0.83, 0.02]);
  mesh(S(0.3), coat, head, [0, 0, 0], [1.25, 0.95, 1]);
  // droopy ears
  rig.ears = [-1, 1].map(side => {
    const e = group(head, [side * 0.3, 0.17, -0.02]);
    mesh(S(0.12), dark, e, [side * 0.04, -0.1, 0], [0.55, 1.1, 0.25], [0, 0, side * 0.5]);
    return e;
  });
  // grumpy heavy-lidded eyes
  rig.eyes = [-1, 1].map(side => cartoonEye(head, [side * 0.11, 0.08, 0.25], 0.065, 0x3a2a1a, 0xc9905a));
  rig.brows = [-1, 1].map(side => {
    const b = group(head, [side * 0.11, 0.17, 0.27]);
    mesh(CAP(0.03, 0.1), dark, b, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2 - side * 0.3]);
    return b;
  });
  // jowls + muzzle + big nose
  const muzzle = rig.muzzle = group(head, [0, -0.1, 0.2]);
  rig.jowls = [-1, 1].map(side => mesh(S(0.13), cream, muzzle, [side * 0.1, -0.03, 0.02], [1, 0.95, 0.85]));
  mesh(S(0.08), mat(0x1a1416, { roughness: 0.15, clearcoat: 1 }), muzzle, [0, 0.07, 0.11], [1.2, 0.8, 0.8]);
  // underbite: lower jaw with two little fangs poking up
  rig.jaw = group(muzzle, [0, -0.1, 0.05]);
  mesh(S(0.11), cream, rig.jaw, [0, 0, 0], [1.1, 0.5, 0.8]);
  for (const side of [-1, 1]) mesh(new THREE.ConeGeometry(0.018, 0.06, 12), mat(0xffffff, { roughness: 0.2 }), rig.jaw, [side * 0.06, 0.06, 0.06]);
  rig.mouthOpen = openMouth(muzzle, [0, -0.08, 0.1], 0.08);
  return { root, rig };
}

// ------------------------------------------------------------------ Rooster
export function makeRooster() {
  const white = fur(0xfbfaf4), orange = mat(0xf2a020, { roughness: 0.5 });
  const red = mat(0xe0242c, { roughness: 0.35, clearcoat: 0.7 });
  const root = new THREE.Group();
  const rig = {};
  const body = rig.body = group(root, [0, 0, 0]);

  // skinny legs (funny against the puffed chest)
  rig.legs = [-1, 1].map(side => {
    const hip = group(body, [side * 0.07, 0.24, 0]);
    mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 12), orange, hip, [0, -0.11, 0]);
    for (const a of [-0.5, 0, 0.5]) mesh(CAP(0.012, 0.07), orange, hip, [Math.sin(a) * 0.04, -0.22, 0.04], [1, 1, 1], [Math.PI / 2, 0, a]);
    return hip;
  });
  const torso = rig.torso = group(body, [0, 0.38, 0]);
  mesh(S(0.22), white, torso, [0, 0, 0], [1, 0.95, 1.2]);
  mesh(S(0.15), white, torso, [0, 0.06, 0.15], [1.1, 1, 0.9]);  // puffed chest
  rig.wings = [-1, 1].map(side => {
    const w = group(torso, [side * 0.2, 0.04, -0.03]);
    mesh(S(0.13), fur(0xefeadc), w, [0, 0, -0.04], [0.35, 0.75, 1.2]);
    return w;
  });
  rig.tail = group(torso, [0, 0.08, -0.22]);
  [0x1f6f48, 0xc8282c, 0x1c1c26, 0xf2a020, 0x1f6f48, 0xc8282c].forEach((col, i) => {
    const f = group(rig.tail, [0, 0, 0]);
    f.rotation.set(-0.6, 0, -0.85 + i * 0.34);
    mesh(S(0.08), mat(col, { roughness: 0.25, clearcoat: 1 }), f, [0, 0.24, -0.02], [0.45, 2.6, 0.3]);
  });
  rig.neck = group(torso, [0, 0.14, 0.15]);
  mesh(CAP(0.095, 0.05), white, rig.neck, [0, 0.04, 0], [1, 1, 1], [0.3, 0, 0]);
  const head = rig.head = group(rig.neck, [0, 0.15, 0.04]);
  mesh(S(0.12), white, head);
  // huge crown comb
  for (let i = 0; i < 5; i++) mesh(S(0.055), red, head, [0, 0.13 + Math.sin(i / 4 * Math.PI) * 0.06, -0.1 + i * 0.05], [0.5, 1.2, 0.8]);
  rig.beak = group(head, [0, -0.01, 0.12]);
  mesh(new THREE.ConeGeometry(0.05, 0.13, 24), mat(0xffbe2e, { roughness: 0.3, clearcoat: 0.6 }), rig.beak, [0, 0, 0.04], [1, 0.7, 1], [Math.PI / 2, 0, 0]);
  mesh(S(0.04), red, head, [0, -0.11, 0.08], [0.8, 1.4, 0.7]);
  // big googly eyes sitting on top of the head
  rig.eyes = [-1, 1].map(side => {
    const e = group(head, [side * 0.055, 0.06, 0.09]);
    mesh(S(0.05), mat(0xffffff, { roughness: 0.1, clearcoat: 1 }), e);
    const look = group(e, [0, 0, 0]);
    mesh(S(0.024), mat(0x111111, { roughness: 0.1, clearcoat: 1 }), look, [0, -0.005, 0.038]);
    mesh(S(0.008), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), look, [0.008, 0.008, 0.058]);
    return { eye: e, look };
  });
  rig.shades = group(head, [0, 0.06, 0.13]);
  for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(0.09, 0.05, 0.02), mat(0x111111, { roughness: 0.05, clearcoat: 1 }), rig.shades, [side * 0.055, 0, 0]);
  mesh(new THREE.BoxGeometry(0.22, 0.012, 0.012), mat(0x111111), rig.shades, [0, 0.018, 0]);
  rig.shades.visible = false;
  return { root, rig };
}
