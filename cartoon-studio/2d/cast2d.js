// Naa Idea 2D cast (canvas): fluffy Duckling, Mother Duck, Butterfly.
// Everything is drawn with soft gradients, a scalloped "fluffy" silhouette and
// thin warm outlines. Positions are in canvas pixels; (x, y) is the ground point
// between the feet, s is the scale (1 = ~330 px tall duckling).

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;

// Fluffy closed shape: perimeter(u) -> [x, y] for u in 0..1, scalloped outward.
function fluffyPath(ctx, perim, n, bump, seed = 1) {
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const [x, y] = perim(u);
    if (i === 0) { ctx.moveTo(x, y); continue; }
    const [px, py] = perim((i - 0.5) / n);
    const [cx, cy] = perim(u - 0.5 / n);
    // push the control point outward from the shape centre
    const [ox, oy] = perim.center;
    const dx = px - ox, dy = py - oy, l = Math.hypot(dx, dy) || 1;
    const b = bump * (0.75 + 0.5 * Math.abs(Math.sin(i * 12.9898 + seed * 78.233)));
    ctx.quadraticCurveTo(cx + dx / l * b, cy + dy / l * b, x, y);
  }
  ctx.closePath();
}

function ellipsePerim(cx, cy, rx, ry) {
  const f = (u) => [cx + Math.cos(u * TAU) * rx, cy + Math.sin(u * TAU) * ry];
  f.center = [cx, cy];
  return f;
}

// Egg (wider at the bottom) perimeter.
function eggPerim(cx, cy, rx, ry) {
  const f = (u) => {
    const a = u * TAU, sy = Math.sin(a);
    const w = rx * (1 + 0.16 * sy);           // fatter below
    return [cx + Math.cos(a) * w, cy + sy * ry];
  };
  f.center = [cx, cy];
  return f;
}

function softShadow(ctx, x, y, rx, ry, alpha = 0.28) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(40,30,10,${alpha})`);
  g.addColorStop(1, 'rgba(40,30,10,0)');
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, TAU); ctx.fill();
  ctx.restore();
}

function furFill(ctx, cx, cy, r, light, mid, dark) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r * 1.25);
  g.addColorStop(0, light); g.addColorStop(0.55, mid); g.addColorStop(1, dark);
  return g;
}

function bigEye(ctx, x, y, r, iris, look, blink, mood, sideScale = 1) {
  // white
  ctx.save();
  ctx.translate(x, y); ctx.scale(sideScale, 1);
  const wg = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.2, 0, 0, r * 1.25);
  wg.addColorStop(0, '#ffffff'); wg.addColorStop(1, '#d9dde8');
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.86, r, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.clip();
  // iris
  const ix = look[0] * r * 0.28, iy = look[1] * r * 0.25 + r * 0.05;
  const ir = r * 0.66;
  const ig = ctx.createRadialGradient(ix, iy + ir * 0.35, ir * 0.1, ix, iy, ir);
  ig.addColorStop(0, iris[0]); ig.addColorStop(0.6, iris[1]); ig.addColorStop(1, iris[2]);
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0b0b16'; ctx.beginPath(); ctx.arc(ix, iy, ir * (mood === 'surprised' ? 0.36 : 0.5), 0, TAU); ctx.fill();
  // highlights
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.ellipse(ix + ir * 0.35, iy - ir * 0.4, ir * 0.3, ir * 0.24, -0.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(ix - ir * 0.38, iy + ir * 0.42, ir * 0.12, 0, TAU); ctx.fill();
  // sad: watery lower rim
  if (mood === 'sad') {
    ctx.fillStyle = 'rgba(200,235,255,0.55)';
    ctx.beginPath(); ctx.ellipse(0, r * 0.75, r * 0.85, r * 0.32, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(-r * 0.2, r * 0.62, r * 0.25, r * 0.06, 0, 0, TAU); ctx.fill();
  }
  // eyelid (blink / sleepy / sad droop)
  const lid = clamp(blink + (mood === 'sad' ? 0.28 : 0));
  if (lid > 0.01) {
    ctx.fillStyle = '#f4c21c';
    ctx.beginPath(); ctx.rect(-r, -r * 1.1, r * 2, r * 2.1 * lid); ctx.fill();
    ctx.strokeStyle = '#b97c00'; ctx.lineWidth = r * 0.09;
    ctx.beginPath(); ctx.moveTo(-r, -r * 1.1 + r * 2.1 * lid); ctx.lineTo(r, -r * 1.1 + r * 2.1 * lid); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(120,80,20,0.55)'; ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.86, r, 0, 0, TAU); ctx.stroke();
  ctx.restore();
}

function webFoot(ctx, x, y, s, lift = 0, dir = 1) {
  ctx.save(); ctx.translate(x, y - lift); ctx.scale(s * dir, s);
  const g = ctx.createLinearGradient(0, -10, 0, 12);
  g.addColorStop(0, '#ffb23e'); g.addColorStop(1, '#f07a12');
  ctx.fillStyle = g; ctx.strokeStyle = '#c45a08'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.quadraticCurveTo(-30, 2, -26, 12);
  ctx.quadraticCurveTo(-16, 8, -12, 14);
  ctx.quadraticCurveTo(-2, 8, 2, 15);
  ctx.quadraticCurveTo(10, 8, 18, 13);
  ctx.quadraticCurveTo(26, 4, 8, -8);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ Duckling
export function drawDuckling(ctx, x, y, s, o = {}) {
  const {
    facing = 1, look = [0.3, 0.1], blink = 0, mood = 'happy', tear = 0, squash = 1,
    walk = 0, hop = 0, wing = 0, mouth = 0, tilt = 0, tint = null, t = 0,
  } = o;
  const bob = Math.abs(Math.sin(walk * Math.PI)) * 10;
  ctx.save();
  ctx.translate(x, y);
  softShadow(ctx, 0, 0, 92 * s * (1 - hop * 0.003), 18 * s);
  ctx.translate(0, -hop);
  ctx.scale(s / Math.sqrt(squash), s * squash);
  const L = tint ? tint[0] : '#fff6b8', M = tint ? tint[1] : '#ffd43b', D = tint ? tint[2] : '#eba300';
  const OUT = 'rgba(176,112,0,0.85)';

  // feet (alternate lift when walking)
  const lA = Math.max(0, Math.sin(walk * Math.PI)) * 14, lB = Math.max(0, -Math.sin(walk * Math.PI)) * 14;
  webFoot(ctx, -30, -4, 1.15, lA, facing);
  webFoot(ctx, 30, -4, 1.15, lB, facing);

  ctx.translate(0, -bob);
  ctx.rotate(Math.sin(walk * Math.PI) * 0.05);

  // body
  const bodyP = eggPerim(0, -98, 88, 80);
  ctx.fillStyle = furFill(ctx, 0, -98, 95, L, M, D);
  fluffyPath(ctx, bodyP, 34, 8, 1);
  ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3.5; ctx.stroke();
  // belly highlight
  const bg = ctx.createRadialGradient(10 * facing, -80, 5, 10 * facing, -80, 60);
  bg.addColorStop(0, 'rgba(255,255,240,0.55)'); bg.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(10 * facing, -80, 60, 0, TAU); ctx.fill();

  // wing (near side) – flaps upward
  ctx.save();
  ctx.translate(-40 * facing, -110);
  ctx.rotate((-0.25 - wing * 0.9) * facing);
  ctx.fillStyle = furFill(ctx, 0, 0, 45, M, '#f7c42a', D);
  fluffyPath(ctx, eggPerim(-8 * facing, 18, 26, 40), 12, 5, 7);
  ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();

  // head
  ctx.save();
  ctx.translate(6 * facing, -205);
  ctx.rotate(tilt);
  // contact shadow under the head
  softShadow(ctx, 0, 70, 70, 18, 0.18);
  ctx.fillStyle = furFill(ctx, 0, 0, 95, L, M, D);
  fluffyPath(ctx, ellipsePerim(0, 0, 86, 80), 30, 8, 2);
  ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 3.5; ctx.stroke();
  // tuft
  ctx.strokeStyle = D; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const sw = Math.sin(t * 3 + i) * 4;
    ctx.lineWidth = 9 - Math.abs(i) * 2;
    ctx.beginPath(); ctx.moveTo(i * 10, -76);
    ctx.quadraticCurveTo(i * 22 + sw, -112, i * 6 + 14 + sw, -122 + Math.abs(i) * 10);
    ctx.stroke();
  }
  // cheeks
  for (const side of [-1, 1]) {
    const cg = ctx.createRadialGradient(side * 50 + 8 * facing, 28, 2, side * 50 + 8 * facing, 28, 24);
    cg.addColorStop(0, 'rgba(255,130,110,0.55)'); cg.addColorStop(1, 'rgba(255,130,110,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(side * 50 + 8 * facing, 28, 24, 0, TAU); ctx.fill();
  }
  // eyes (the far eye is narrower to suggest 3/4 view)
  const iris = ['#9fe0ff', '#3a9ef0', '#13408f'];
  const ex = 14 * facing;
  bigEye(ctx, ex - 33, -8, 30, iris, look, blink, mood, facing > 0 ? 0.88 : 1);
  bigEye(ctx, ex + 33, -8, 30, iris, look, blink, mood, facing > 0 ? 1 : 0.88);
  // brows
  ctx.strokeStyle = '#c98500'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const inner = mood === 'sad' ? -10 : mood === 'surprised' ? -8 : 0;
    ctx.beginPath();
    ctx.moveTo(ex + side * 18, -50 + inner);
    ctx.quadraticCurveTo(ex + side * 34, -58 + (mood === 'surprised' ? -8 : 0), ex + side * 48, -50 - inner * 0.3);
    ctx.stroke();
  }
  // bill
  ctx.save();
  ctx.translate(ex + 6 * facing, 26);
  const bgr = ctx.createLinearGradient(0, -14, 0, 20);
  bgr.addColorStop(0, '#ffb547'); bgr.addColorStop(1, '#f2771a');
  ctx.fillStyle = bgr; ctx.strokeStyle = '#c4560a'; ctx.lineWidth = 3;
  // lower bill (opens downwards)
  ctx.beginPath(); ctx.ellipse(0, 8 + mouth * 12, 30, 11 + mouth * 4, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
  if (mouth > 0.05) { ctx.fillStyle = '#8c2a1e'; ctx.beginPath(); ctx.ellipse(0, 7, 24, mouth * 10, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = bgr; }
  // upper bill
  ctx.beginPath(); ctx.ellipse(0, 0, 38, 15, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,200,0.6)';
  ctx.beginPath(); ctx.ellipse(-10, -6, 16, 4, -0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#b5470c';
  ctx.beginPath(); ctx.ellipse(-8, -3, 2.5, 1.6, 0, 0, TAU); ctx.ellipse(8, -3, 2.5, 1.6, 0, 0, TAU); ctx.fill();
  // smile / frown line
  ctx.strokeStyle = '#b5470c'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (mood === 'sad') ctx.arc(0, 18, 18, 1.25 * Math.PI, 1.75 * Math.PI);
  else ctx.arc(0, -2, 22, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.restore();
  // tear
  if (tear > 0) {
    const ty = lerp(14, 70, clamp(tear)), tx = ex - 30;
    const a = clamp(tear * 4) * (1 - clamp((tear - 0.85) / 0.15));
    ctx.fillStyle = `rgba(190,232,255,${0.9 * a})`;
    ctx.beginPath();
    ctx.moveTo(tx, ty - 16);
    ctx.quadraticCurveTo(tx + 10, ty, tx, ty + 6);
    ctx.quadraticCurveTo(tx - 10, ty, tx, ty - 16);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.9 * a})`;
    ctx.beginPath(); ctx.arc(tx - 2, ty - 2, 2.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------ Mother duck (side view)
export function drawMother(ctx, x, y, s, o = {}) {
  const { facing = 1, swim = false, walk = 0, blink = 0, mouth = 0, wing = 0, t = 0, look = [0.4, 0] } = o;
  ctx.save();
  ctx.translate(x, y);
  if (!swim) softShadow(ctx, 0, 0, 150 * s, 24 * s);
  ctx.scale(s * facing, s);
  const bob = swim ? Math.sin(t * 2.2) * 4 : Math.abs(Math.sin(walk * Math.PI)) * 8;
  if (!swim) {
    const lA = Math.max(0, Math.sin(walk * Math.PI)) * 16, lB = Math.max(0, -Math.sin(walk * Math.PI)) * 16;
    ctx.strokeStyle = '#e27b16'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-15, -60); ctx.lineTo(-20, -10 - lA); ctx.moveTo(25, -60); ctx.lineTo(30, -10 - lB); ctx.stroke();
    webFoot(ctx, -16, -6 - lA, 1.6, 0, 1); webFoot(ctx, 34, -6 - lB, 1.6, 0, 1);
  }
  ctx.translate(0, (swim ? 10 : -50) - bob);
  const OUT = 'rgba(70,40,15,0.8)';
  // body: boat shape
  const bodyG = ctx.createLinearGradient(0, -150, 0, 30);
  bodyG.addColorStop(0, '#b88a5a'); bodyG.addColorStop(0.55, '#8c6236'); bodyG.addColorStop(1, '#5e3d1e');
  ctx.fillStyle = bodyG; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-170, -95);                             // tail tip
  ctx.quadraticCurveTo(-120, -70, -100, -110);
  ctx.bezierCurveTo(-40, -160, 90, -150, 130, -100); // back to chest
  ctx.bezierCurveTo(165, -60, 140, 10, 60, 18);      // chest/belly
  ctx.bezierCurveTo(-20, 26, -110, 10, -140, -40);
  ctx.quadraticCurveTo(-155, -70, -170, -95);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // feather scallops
  ctx.save(); ctx.clip();
  for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
    const fx = -120 + c * 32 + (r % 2) * 16, fy = -120 + r * 26;
    ctx.fillStyle = `rgba(${60 + r * 8},${38 + r * 5},${18},0.35)`;
    ctx.beginPath(); ctx.ellipse(fx, fy, 15, 20, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(240,215,170,0.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(fx, fy, 15, 20, 0, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  ctx.restore();
  // wing with blue speculum
  ctx.save(); ctx.translate(-20, -95); ctx.rotate(-0.08 - wing * 0.7);
  const wg = ctx.createLinearGradient(0, -30, 0, 40);
  wg.addColorStop(0, '#9a7046'); wg.addColorStop(1, '#5a3a1c');
  ctx.fillStyle = wg; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(90, -20); ctx.bezierCurveTo(40, -50, -80, -30, -110, 10);
  ctx.bezierCurveTo(-40, 40, 60, 30, 90, -20); ctx.fill(); ctx.stroke();
  const sg = ctx.createLinearGradient(-60, 0, 0, 20);
  sg.addColorStop(0, '#2f5fd8'); sg.addColorStop(1, '#5f2fd0');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(-35, 6, 30, 9, -0.25, 0, TAU); ctx.fill();
  ctx.restore();
  // neck + head (thick curved neck drawn as an outlined stroke)
  const hx = 150, hy = -215;
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT; ctx.lineWidth = 74;
  ctx.beginPath(); ctx.moveTo(105, -115); ctx.quadraticCurveTo(140, -150, hx - 5, hy + 15); ctx.stroke();
  ctx.strokeStyle = '#94693f'; ctx.lineWidth = 66;
  ctx.beginPath(); ctx.moveTo(105, -115); ctx.quadraticCurveTo(140, -150, hx - 5, hy + 15); ctx.stroke();
  const hg = ctx.createRadialGradient(hx - 18, hy - 28, 5, hx, hy, 80);
  hg.addColorStop(0, '#d2a678'); hg.addColorStop(1, '#7c5530');
  ctx.fillStyle = hg; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(hx, hy, 70, 62, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // dark crown + eye stripe
  ctx.fillStyle = 'rgba(60,35,15,0.5)';
  ctx.beginPath(); ctx.ellipse(hx - 8, hy - 44, 56, 18, -0.1, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(60,35,15,0.55)'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(hx - 50, hy + 4); ctx.quadraticCurveTo(hx - 10, hy - 8, hx + 30, hy - 2); ctx.stroke();
  // cheek blush
  const cg = ctx.createRadialGradient(hx + 30, hy + 22, 2, hx + 30, hy + 22, 22);
  cg.addColorStop(0, 'rgba(255,140,110,0.45)'); cg.addColorStop(1, 'rgba(255,140,110,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(hx + 30, hy + 22, 22, 0, TAU); ctx.fill();
  bigEye(ctx, hx + 26, hy - 10, 22, ['#f0c080', '#8a4a18', '#3a1a08'], look, blink, 'happy', 0.9);
  // short rounded bill
  const bgr = ctx.createLinearGradient(0, hy, 0, hy + 34);
  bgr.addColorStop(0, '#ffa63a'); bgr.addColorStop(1, '#e06a10');
  ctx.fillStyle = bgr; ctx.strokeStyle = '#a84a08'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(hx + 76, hy + 28 + mouth * 10, 30, 9, 0.12 + mouth * 0.3, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(hx + 74, hy + 18, 36, 14, 0.06, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,235,190,0.6)'; ctx.beginPath(); ctx.ellipse(hx + 70, hy + 11, 16, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#a84a08'; ctx.beginPath(); ctx.ellipse(hx + 84, hy + 12, 3, 2, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ Butterfly
export function drawButterfly(ctx, x, y, s, t, rot = 0) {
  const flap = Math.abs(Math.sin(t * 14));
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  // glow
  const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
  gl.addColorStop(0, 'rgba(255,220,140,0.35)'); gl.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fill();
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side * (0.25 + 0.75 * flap), 1);
    const g = ctx.createRadialGradient(18, -10, 2, 18, -6, 46);
    g.addColorStop(0, '#ffd27a'); g.addColorStop(0.6, '#ff8a1c'); g.addColorStop(1, '#c4400a');
    ctx.fillStyle = g; ctx.strokeStyle = '#1e1208'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(10, -50, 60, -46, 50, -10); ctx.bezierCurveTo(46, 0, 20, 2, 0, 0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.bezierCurveTo(30, 10, 44, 34, 24, 40); ctx.bezierCurveTo(10, 42, 4, 20, 0, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const [dx, dy] of [[40, -30], [48, -18], [30, 34]]) { ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  ctx.fillStyle = '#1e1208'; ctx.beginPath(); ctx.ellipse(0, 4, 4, 20, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#1e1208'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-2, -14); ctx.quadraticCurveTo(-8, -28, -12, -30); ctx.moveTo(2, -14); ctx.quadraticCurveTo(8, -28, 12, -30); ctx.stroke();
  ctx.restore();
}
