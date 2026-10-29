// "The Lost Duckling" – 2D demo episode (no voice). drawFrame(t) paints one 1080x1920 frame.
import { drawDuckling, drawMother, drawButterfly, TAU, clamp, lerp } from './cast2d.js';

export const W = 1080, H = 1920, DURATION = 27;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const ease = (k) => k * k * (3 - 2 * k);
export const easeOut = (k) => 1 - (1 - k) ** 3;
export const back = (k) => { const c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
export function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

let logo = null;
export async function preload() {
  const f = new FontFace('Fredoka', 'url(../3d/fonts/Fredoka.woff2)', { weight: '600' });
  document.fonts.add(await f.load());
  logo = new Image();
  logo.src = '../branding/naa_idea_logo.png';
  await logo.decode();
}

// ------------------------------------------------------------------ shared scenery
export function sunGlow(ctx, x, y, t, strength = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {                      // slowly turning rays
    const a = i / 9 * TAU + t * 0.04;
    const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * 1400, y + Math.sin(a) * 1400);
    g.addColorStop(0, `rgba(255,225,160,${0.16 * strength})`); g.addColorStop(1, 'rgba(255,225,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - 0.06) * 1500, y + Math.sin(a - 0.06) * 1500);
    ctx.lineTo(x + Math.cos(a + 0.06) * 1500, y + Math.sin(a + 0.06) * 1500); ctx.fill();
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, 520);
  g.addColorStop(0, `rgba(255,240,200,${0.9 * strength})`); g.addColorStop(0.15, `rgba(255,220,150,${0.5 * strength})`);
  g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 520, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(x, y, 62, 0, TAU); ctx.fill();
}

export function treeBlob(ctx, x, y, r, dark, light, seed) {
  const R = rand(seed);
  for (let i = 0; i < 7; i++) {
    const a = R() * TAU, d = R() * r * 0.55, rr = r * (0.45 + R() * 0.35);
    const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d * 0.7;
    const g = ctx.createRadialGradient(cx + rr * 0.35, cy - rr * 0.4, rr * 0.1, cx, cy, rr);
    g.addColorStop(0, light); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
  }
}

export function grassEdge(ctx, y0, color, seed, t, h = 60, density = 140) {
  const R = rand(seed);
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (let i = 0; i < density; i++) {
    const x = R() * W, hh = h * (0.5 + R()), sway = Math.sin(t * 1.5 + x * 0.02) * 6;
    ctx.lineWidth = 3 + R() * 4;
    ctx.beginPath(); ctx.moveTo(x, y0 + 10);
    ctx.quadraticCurveTo(x + sway * 0.5, y0 - hh * 0.5, x + sway + (R() - 0.5) * 20, y0 - hh); ctx.stroke();
  }
}

export function flowers(ctx, y0, y1, seed, n = 18) {
  const R = rand(seed);
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = lerp(y0, y1, R()), s = 0.6 + R() * 0.8;
    const col = ['#ffffff', '#ffd1e8', '#d8c8ff', '#fff3a0'][Math.floor(R() * 4)];
    ctx.fillStyle = col;
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 9 * s, y + Math.sin(a) * 9 * s, 7 * s, 5 * s, a, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffb81c'; ctx.beginPath(); ctx.arc(x, y, 5 * s, 0, TAU); ctx.fill();
  }
}

export function particles(ctx, t, seed, color = '255,240,190', n = 40) {
  const R = rand(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = (R() * W + t * (10 + R() * 25)) % W, y = (R() * H - t * (8 + R() * 20) + H) % H;
    const r = 3 + R() * 9, a = 0.15 + 0.25 * Math.abs(Math.sin(t * (0.5 + R()) + i));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

export function heart(ctx, x, y, s, a) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(-6, -8, 2, 0, 0, 30);
  g.addColorStop(0, '#ff9ab0'); g.addColorStop(1, '#e8264f');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-30, -8, -18, -34, 0, -18); ctx.bezierCurveTo(18, -34, 30, -8, 0, 12); ctx.fill();
  ctx.restore();
}

export function sparkle(ctx, x, y, r, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  ctx.fillStyle = '#fff6d0';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.25 : r, ang = i / 8 * TAU; ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
  ctx.fill(); ctx.restore();
}

// ------------------------------------------------------------------ pond (scenes 1-2)
const HORIZON = 860;
export function pond(ctx, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, '#7fb6e8'); sky.addColorStop(0.6, '#ffd6a6'); sky.addColorStop(1, '#ffbf86');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON + 5);
  // soft clouds
  ctx.fillStyle = 'rgba(255,245,235,0.7)';
  for (const [cx, cy, s] of [[200, 260, 1], [820, 180, 0.8], [560, 380, 0.6]]) {
    const x = (cx + t * 8 * s) % (W + 300) - 150;
    for (const [dx, dy, r] of [[-60, 10, 50], [0, -10, 70], [65, 8, 50]]) { ctx.beginPath(); ctx.arc(x + dx * s, cy + dy * s, r * s, 0, TAU); ctx.fill(); }
  }
  sunGlow(ctx, 720, 700, t);
  // hills
  ctx.fillStyle = '#b9b7c9';
  ctx.beginPath(); ctx.moveTo(0, 790); ctx.bezierCurveTo(250, 690, 420, 760, 600, 730); ctx.bezierCurveTo(800, 700, 950, 760, W, 720); ctx.lineTo(W, 900); ctx.lineTo(0, 900); ctx.fill();
  ctx.fillStyle = '#93a884';
  ctx.beginPath(); ctx.moveTo(0, 830); ctx.bezierCurveTo(300, 780, 600, 840, W, 800); ctx.lineTo(W, 900); ctx.lineTo(0, 900); ctx.fill();
  // tree line
  for (let i = 0; i < 12; i++) treeBlob(ctx, -40 + i * 100, 845 + (i % 3) * 10, 70 + (i % 4) * 12, '#4e7a45', '#8fbf6a', i + 3);
  // water
  const wg = ctx.createLinearGradient(0, HORIZON, 0, 1500);
  wg.addColorStop(0, '#ffcf9a'); wg.addColorStop(0.25, '#9cc6d8'); wg.addColorStop(1, '#4f8fae');
  ctx.fillStyle = wg; ctx.fillRect(0, HORIZON, W, 700);
  // tree reflection
  ctx.save(); ctx.globalAlpha = 0.25;
  for (let i = 0; i < 12; i++) treeBlob(ctx, -40 + i * 100, 2 * HORIZON - 845 + 30, 60, '#3d6b46', '#5f8f62', i + 3);
  ctx.restore();
  // sun reflection shimmer
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const R = rand(5);
  for (let i = 0; i < 60; i++) {
    const y = HORIZON + 10 + R() * 520, w = (40 + R() * 120) * (1 - (y - HORIZON) / 700);
    const x = 720 + Math.sin(t * 2 + i) * 30 + (R() - 0.5) * 120 * ((y - HORIZON) / 500 + 0.3);
    ctx.fillStyle = `rgba(255,235,190,${0.25 + 0.25 * Math.sin(t * 3 + i * 1.7)})`;
    ctx.fillRect(x - w / 2, y, w, 3);
  }
  ctx.restore();
  // ripple lines
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = HORIZON + 60 + i * 40, x = (i * 173 + t * 20) % W;
    ctx.beginPath(); ctx.ellipse(x, y, 60 + i * 4, 4, 0, 0, TAU); ctx.stroke();
  }
  // lily pads
  for (const [x, y, s] of [[160, 1300, 1], [930, 1260, 0.8], [700, 1420, 1.1], [80, 1080, 0.6]]) {
    ctx.fillStyle = '#4f9a4a'; ctx.beginPath(); ctx.ellipse(x, y, 60 * s, 20 * s, 0, 0.2, TAU - 0.2); ctx.lineTo(x, y); ctx.fill();
    ctx.fillStyle = '#6fbf5f'; ctx.beginPath(); ctx.ellipse(x - 6 * s, y - 3 * s, 46 * s, 13 * s, 0, 0.3, TAU - 0.3); ctx.lineTo(x, y); ctx.fill();
  }
  ctx.fillStyle = '#ffd1e8';
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.beginPath(); ctx.ellipse(700 + Math.cos(a) * 14, 1405 + Math.sin(a) * 5, 12, 6, a, 0, TAU); ctx.fill(); }
  // reeds
  for (const [x0, n] of [[30, 7], [1000, 6]]) {
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 12, h = 260 + (i % 3) * 60, sw = Math.sin(t * 1.2 + i) * 8;
      ctx.strokeStyle = '#5e8a3a'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x, 1500); ctx.quadraticCurveTo(x + sw, 1500 - h / 2, x + sw * 2, 1500 - h); ctx.stroke();
      if (i % 2 === 0) { ctx.fillStyle = '#7a4a24'; ctx.beginPath(); ctx.ellipse(x + sw * 2, 1500 - h + 20, 8, 26, 0, 0, TAU); ctx.fill(); }
    }
  }
}

export function bank(ctx, t, y0 = 1480) {
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, '#8cc45f'); g.addColorStop(1, '#4e8a36');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, y0 + 20); ctx.bezierCurveTo(300, y0 - 30, 700, y0 + 30, W, y0 - 10); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  grassEdge(ctx, y0 + 10, '#6faa45', 9, t, 50, 160);
  flowers(ctx, y0 + 60, H - 60, 4, 22);
}

export function swimmer(ctx, waterY, draw) {
  ctx.save(); ctx.beginPath(); ctx.rect(-5000, -5000, 10000, waterY + 5000); ctx.clip(); draw(); ctx.restore();
}

export function ripple(ctx, x, y, s, t) {
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
  for (let k = 0; k < 2; k++) {
    const p = (t * 0.8 + k * 0.5) % 1;
    ctx.globalAlpha = 1 - p;
    ctx.beginPath(); ctx.ellipse(x, y, (60 + p * 80) * s, (8 + p * 6) * s, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ forest (scenes 3-5)
export function forest(ctx, t, dim, warm) {
  const sky = ctx.createLinearGradient(0, 0, 0, 1100);
  sky.addColorStop(0, '#f7d9a0'); sky.addColorStop(1, '#c9d9a0');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  sunGlow(ctx, 760, 420, t, 0.8 + warm * 0.4);
  // far trunks + canopy (hazy)
  for (let i = 0; i < 8; i++) {
    const x = i * 150 + 30;
    ctx.fillStyle = '#9aa58a'; ctx.fillRect(x - 18, 300, 36, 900);
    treeBlob(ctx, x, 300 + (i % 2) * 60, 160, '#7f9a6e', '#b7c99a', i + 40);
  }
  // light shafts
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = 520 + i * 140 + Math.sin(t * 0.3 + i) * 20;
    const g = ctx.createLinearGradient(x, 300, x - 300, 1500);
    g.addColorStop(0, 'rgba(255,230,170,0)'); g.addColorStop(0.25, `rgba(255,230,170,${0.16 + warm * 0.1})`); g.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x + 70, 300); ctx.lineTo(x - 200, 1500); ctx.lineTo(x - 360, 1500); ctx.fill();
  }
  ctx.restore();
  // near trees (left & right)
  for (const [x, w] of [[90, 120], [990, 140], [300, 70], [830, 80]]) {
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#4a3220'); g.addColorStop(0.6, '#7a5636'); g.addColorStop(1, '#3a2616');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - w / 2, 1300); ctx.lineTo(x - w / 2 + 10, 0); ctx.lineTo(x + w / 2 - 10, 0); ctx.lineTo(x + w / 2, 1300); ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,8,0.35)'; ctx.lineWidth = 4;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x - w / 3 + k * w / 8, 100 + k * 40); ctx.quadraticCurveTo(x - w / 4 + k * w / 7, 600, x - w / 3 + k * w / 8, 1250); ctx.stroke(); }
  }
  for (const [x, y, r, s] of [[60, 120, 260, 51], [1020, 80, 280, 52], [320, 40, 180, 53], [800, 30, 200, 54]]) treeBlob(ctx, x, y, r, '#2f5a2a', '#6f9f4a', s);
  // ground + path
  const gg = ctx.createLinearGradient(0, 1150, 0, H);
  gg.addColorStop(0, '#7aa850'); gg.addColorStop(1, '#3f7a2e');
  ctx.fillStyle = gg; ctx.fillRect(0, 1150, W, H - 1150);
  const pg = ctx.createLinearGradient(0, 1150, 0, H);
  pg.addColorStop(0, '#d8b98a'); pg.addColorStop(1, '#b08356');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.moveTo(470, 1150); ctx.bezierCurveTo(430, 1350, 120, 1600, 60, H); ctx.lineTo(1040, H);
  ctx.bezierCurveTo(900, 1600, 620, 1350, 610, 1150); ctx.closePath(); ctx.fill();
  const R = rand(77);
  for (let i = 0; i < 40; i++) {         // pebbles on the path
    const y = 1200 + R() * 700, k = (y - 1150) / 770, x = lerp(540, lerp(150, 950, R()), k * 0.9);
    ctx.fillStyle = `rgba(${140 + R() * 40},${120 + R() * 30},${95 + R() * 20},0.9)`;
    ctx.beginPath(); ctx.ellipse(x, y, 4 + k * 10, 3 + k * 6, 0, 0, TAU); ctx.fill();
  }
  grassEdge(ctx, 1170, '#5f9a3e', 13, t, 40, 90);
  // ferns at the sides
  for (const [x, y, dir] of [[90, 1700, 1], [990, 1650, -1], [200, 1450, 1], [880, 1420, -1]]) {
    for (let f = 0; f < 5; f++) {
      const a = -Math.PI / 2 + (f - 2) * 0.35 * dir + Math.sin(t + f) * 0.03;
      const len = 220 - Math.abs(f - 2) * 30;
      ctx.strokeStyle = '#3f7a2e'; ctx.lineWidth = 5;
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = '#5a9a3e';
      for (let l = 1; l < 9; l++) {
        const px = lerp(x, ex, l / 9), py = lerp(y, ey, l / 9), ll = 26 * (1 - l / 10);
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(px + Math.cos(a + sd * 1.2) * ll, py + Math.sin(a + sd * 1.2) * ll, ll, 6, a + sd * 1.2, 0, TAU); ctx.fill(); }
      }
    }
  }
  flowers(ctx, 1250, H - 40, 21, 16);
  particles(ctx, t, 3);
  // mood lighting
  if (dim > 0) { ctx.fillStyle = `rgba(25,30,70,${0.45 * dim})`; ctx.fillRect(0, 0, W, H); }
  if (warm > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = `rgba(255,170,80,${0.6 * warm})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}

export function vignette(ctx, k = 0.45) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,10,0,${k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

export function camera(ctx, zoom, fx, fy) {
  // keep the view inside the painted canvas (no black edges when zoomed)
  fx = clamp(fx, W / (2 * zoom), W - W / (2 * zoom));
  fy = clamp(fy, H / (2 * zoom), H - H / (2 * zoom));
  ctx.setTransform(zoom, 0, 0, zoom, W / 2 - fx * zoom, H / 2 - fy * zoom);
}

function titleCard(ctx, t) {
  const k = back(prog(t, 0.8, 1.4)), out = ease(prog(t, 4.4, 5.0));
  if (k <= 0 || out >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - out;
  ctx.translate(W / 2, 330 - out * 80); ctx.scale(k, k);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 70px Fredoka'; ctx.lineJoin = 'round';
  ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(90,40,0,0.85)'; ctx.strokeText('The', 0, -110);
  ctx.fillStyle = '#ffffff'; ctx.fillText('The', 0, -110);
  ctx.font = '600 150px Fredoka';
  const g = ctx.createLinearGradient(0, -70, 0, 70);
  g.addColorStop(0, '#fff2a0'); g.addColorStop(0.5, '#ffc21c'); g.addColorStop(1, '#f08a00');
  ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(90,40,0,0.9)'; ctx.strokeText('Lost Duckling', 0, 10);
  ctx.fillStyle = g; ctx.fillText('Lost Duckling', 0, 10);
  ctx.restore();
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + t, r = 420 + Math.sin(t * 3 + i) * 20;
    sparkle(ctx, W / 2 + Math.cos(a) * r, 320 + Math.sin(a) * 130, 22, (1 - out) * clamp(k) * (0.5 + 0.5 * Math.sin(t * 6 + i)));
  }
}

// ------------------------------------------------------------------ end card (logo + subscribe)
export function endCard(ctx, lt, t) {
    ctx.fillStyle = `rgba(30,15,5,${0.55 * ease(prog(lt, 0, 0.6))})`; ctx.fillRect(0, 0, W, H);
    const k = back(prog(lt, 0.2, 0.8));
    if (k > 0 && logo) { const s = 620 * k; ctx.drawImage(logo, W / 2 - s / 2, 560 - s / 2, s, s); }
    const k2 = back(prog(lt, 0.8, 1.2));
    if (k2 > 0) {
      const pulse = 1 + 0.04 * Math.sin(t * 8);
      ctx.save(); ctx.translate(W / 2, 1060); ctx.scale(k2 * pulse, k2 * pulse);
      ctx.fillStyle = '#e8141e'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.roundRect(-300, -70, 600, 140, 70); ctx.fill(); ctx.stroke();
      ctx.font = '600 76px Fredoka'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('SUBSCRIBE', 0, 4);
      ctx.restore();
    }
}

// ------------------------------------------------------------------ cinematic FX (optional)
export const FX = { on: false };
let bufA = null, bufB = null;
function offscreen(old) {
  if (old) return old;
  const c = document.createElement('canvas'); c.width = W; c.height = H; return c;
}
// paint the far layer into a buffer and lay it down blurred (shallow depth of field)
export function depthOfField(ctx, drawFar, blur) {
  bufA = offscreen(bufA);
  const b = bufA.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, W, H);
  drawFar(b);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(bufA, 0, 0); ctx.restore();
}
// bloom (glow around bright areas) + warm cinematic grade + film grain
export function postFX(ctx, t, warmth = 0.22) {
  bufB = offscreen(bufB);
  const b = bufB.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, W, H);
  b.filter = 'blur(28px) brightness(0.9) contrast(1.6)'; b.drawImage(ctx.canvas, 0, 0); b.filter = 'none';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.32; ctx.drawImage(bufB, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgba(255,190,120,${warmth})`); g.addColorStop(1, `rgba(120,90,160,${warmth * 0.6})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  const R = rand(Math.floor(t * 30));
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let i = 0; i < 1400; i++) ctx.fillRect(R() * W, R() * H, 2, 2);
  ctx.restore();
}

// ------------------------------------------------------------------ frame
export function drawFrame(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const blink = (tt) => ((tt % 3.3) < 0.12 ? 1 : 0);

  if (t < 5.5) {
    // 1. pond at sunrise, the family swims by
    camera(ctx, 1 + 0.06 * ease(prog(t, 0, 5.5)), W / 2, H / 2 + 60);
    pond(ctx, t);
    const mx = lerp(150, 800, ease(prog(t, 0, 5.5))), wy = 1150;
    for (let i = 3; i >= 0; i--) {
      const dx = mx - 230 - i * 105, bob = Math.sin(t * 3 + i) * 5;
      swimmer(ctx, wy + 4, () => drawDuckling(ctx, dx, wy + 70 + bob, 0.42, { facing: 1, t, blink: blink(t + i), look: [0.6, 0] }));
      ripple(ctx, dx, wy + 6, 0.5, t + i * 0.3);
    }
    swimmer(ctx, wy + 4, () => drawMother(ctx, mx, wy, 0.9, { swim: true, t, blink: blink(t + 1) }));
    ripple(ctx, mx, wy + 6, 1.1, t);
    bank(ctx, t, 1560);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    titleCard(ctx, t);
  } else if (t < 10) {
    // 2. Chinni on the bank spots a butterfly and hops after it
    const lt = t - 5.5;
    const far = (c) => {
      camera(c, 1.12, W / 2, H / 2 + 120);
      pond(c, t);
      const wy = 1150;
      for (let i = 0; i < 3; i++) {
        const dx = 300 + i * 130 + Math.sin(t * 0.5) * 20;
        swimmer(c, wy + 4, () => drawDuckling(c, dx, wy + 55 + Math.sin(t * 3 + i) * 4, 0.34, { facing: -1, t, blink: blink(t + i) }));
        ripple(c, dx, wy + 6, 0.4, t + i);
      }
      swimmer(c, wy + 4, () => drawMother(c, 760, wy, 0.75, { swim: true, t, facing: -1 }));
    };
    if (FX.on) depthOfField(ctx, far, 6); else far(ctx);
    camera(ctx, 1.12, W / 2, H / 2 + 120);
    bank(ctx, t, 1480);
    // butterfly path: enters left, loops, exits right
    const bk = prog(lt, 0.3, 4.5);
    const bx = lerp(-80, 1180, ease(bk)) + Math.sin(lt * 4) * 40, by = 1300 - Math.sin(bk * Math.PI) * 220 + Math.sin(lt * 6) * 25;
    // Chinni
    const notice = lt > 1.0, go = prog(lt, 2.4, 4.5);
    const cx = lerp(380, 1250, ease(go) * ease(go));
    const hop = go > 0 ? Math.abs(Math.sin(lt * 9)) * 50 : 0;
    const lookAt = [clamp((bx - cx) / 300, -1, 1), clamp((by - 1450) / 300, -1, 1)];
    drawDuckling(ctx, cx, 1640, 1.0, {
      facing: 1, t, look: lookAt, blink: notice ? 0 : blink(t),
      mood: lt > 1.0 && lt < 2.4 ? 'surprised' : 'happy', mouth: lt > 1.0 && lt < 1.8 ? 0.7 : 0,
      hop, walk: go > 0 ? lt * 4.5 : 0, wing: go > 0 ? Math.abs(Math.sin(lt * 9)) * 0.7 : 0,
      squash: go > 0 ? 1 + Math.sin(lt * 9) * 0.06 : 1,
    });
    if (lt > 1.0 && lt < 2.2) sparkle(ctx, cx + 120, 1250, 30 * back(prog(lt, 1.0, 1.3)), 1);
    drawButterfly(ctx, bx, by, 1.3, t, Math.sin(lt * 3) * 0.3);
  } else if (t < 19) {
    // 3-4. alone in the forest, crying ... a quack in the distance
    const lt = t - 10;
    const dim = ease(prog(lt, 2.5, 5.0)) * (1 - ease(prog(lt, 7.6, 8.6)));
    const zoom = lerp(1, 1.9, ease(prog(lt, 4.0, 6.0)));
    camera(ctx, zoom, lerp(W / 2, 560, ease(prog(lt, 4, 6))), lerp(H / 2, 1390, ease(prog(lt, 4, 6))));
    forest(ctx, t, dim, 0);
    // butterfly leaves up and away
    if (lt < 3) drawButterfly(ctx, lerp(560, 980, prog(lt, 0, 3)) + Math.sin(lt * 5) * 30, lerp(1350, 300, ease(prog(lt, 0, 3))), 1.1 * (1 - prog(lt, 1.5, 3) * 0.6), t);
    const walkIn = prog(lt, 0, 1.6);
    const cx = lerp(200, 560, ease(walkIn));
    let look = [0.3, -0.6], mood = 'happy', tear = 0, squash = 1, tilt = 0;
    if (lt > 1.6) look = [Math.sin((lt - 1.6) * 2.4) > 0 ? 0.8 : -0.8, 0];          // looks left/right
    if (lt > 3.2) { mood = 'sad'; look = [0, 0.4]; }
    if (lt > 4.0) { squash = lerp(1, 0.9, ease(prog(lt, 4.0, 4.5))); tear = prog(lt, 4.6, 6.6); tilt = -0.06; }
    if (lt > 6.8) tear = prog(lt, 6.8, 7.8);
    let mouth = 0;
    if (lt > 7.6) { mood = 'surprised'; look = [0.9, -0.3]; tear = 0; squash = 1; tilt = 0.12; mouth = 0.5; }
    drawDuckling(ctx, cx, 1560, 1.05, {
      facing: lt > 7.6 ? 1 : (lt < 1.6 ? 1 : (look[0] > 0 ? 1 : -1)), t, look, mood, tear, squash, tilt, mouth,
      walk: walkIn < 1 ? lt * 4 : 0, blink: mood === 'happy' ? blink(t) : 0,
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    vignette(ctx, 0.35 + dim * 0.3);
    // "quack" sound waves from the right
    if (lt > 7.2 && lt < 9) {
      const k = prog(lt, 7.2, 9);
      ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 10; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const r = 60 + i * 50 + k * 120;
        ctx.beginPath(); ctx.arc(1120, 900, r, Math.PI * 0.8, Math.PI * 1.2); ctx.stroke();
      }
      ctx.font = '600 90px Fredoka'; ctx.textAlign = 'center'; ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(90,40,0,0.8)';
      ctx.globalAlpha = clamp((1 - k) * 2); ctx.strokeText('quack!', 820, 780); ctx.fillStyle = '#ffd34a'; ctx.fillText('quack!', 820, 780); ctx.globalAlpha = 1;
    }
  } else if (t < 24.5) {
    // 5. mother arrives, they run to each other and hug
    const lt = t - 19;
    camera(ctx, lerp(1.15, 1.3, ease(prog(lt, 2.5, 5.5))), 560, 1320);
    forest(ctx, t, 0, ease(prog(lt, 0, 2.5)));
    const meet = 2.3;
    const mx = lerp(1400, 790, ease(prog(lt, 0, meet)));
    const cx = lerp(470, 560, ease(prog(lt, 0.4, meet)));
    const hug = prog(lt, meet, meet + 0.6);
    drawMother(ctx, mx, 1580, 1.15, { facing: -1, walk: lt < meet ? lt * 3 : 0, t, wing: hug * 0.9, blink: hug > 0.5 ? 1 : 0, look: [-0.6, 0.3] });
    drawDuckling(ctx, cx, 1590, 0.8, {
      facing: 1, t, mood: 'happy', look: [0.8, -0.4], blink: hug > 0.6 ? 1 : 0,
      hop: lt < meet && lt > 0.4 ? Math.abs(Math.sin(lt * 9)) * 40 : 0, walk: lt < meet ? lt * 4 : 0,
      wing: lt < meet ? Math.abs(Math.sin(lt * 9)) * 0.9 : 0.3, tilt: hug * 0.18, squash: 1 - hug * 0.05,
    });
    // hearts + sparkles
    if (lt > meet) {
      for (let i = 0; i < 9; i++) {
        const p = ((lt - meet) * 0.35 + i / 9) % 1;
        heart(ctx, 600 + Math.sin(i * 2.1 + lt) * 180, 1300 - p * 600, 1.2 + (i % 3) * 0.4, Math.sin(p * Math.PI));
      }
      for (let i = 0; i < 6; i++) sparkle(ctx, 450 + i * 70, 1150 + Math.sin(lt * 3 + i) * 80, 18, 0.5 + 0.5 * Math.sin(lt * 5 + i));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    vignette(ctx, 0.3);
  } else {
    // 6. end card
    const lt = t - 24.5;
    camera(ctx, 1.3, 560, 1320);
    forest(ctx, t, 0, 1);
    drawMother(ctx, 790, 1580, 1.15, { facing: -1, t, wing: 0.9, blink: 1 });
    drawDuckling(ctx, 560, 1590, 0.8, { facing: 1, t, blink: 1, tilt: 0.18, wing: 0.3 });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    endCard(ctx, lt, t);
  }
  if (FX.on) postFX(ctx, t);
  // fade in / out
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fade = Math.min(prog(t, 0, 0.5), 1 - prog(t, DURATION - 0.6, DURATION));
  // quick dip-to-black between scenes
  const cuts = [5.5, 10, 19, 24.5];
  let dip = 0;
  for (const c of cuts) dip = Math.max(dip, 1 - Math.abs(t - c) / 0.25);
  const a = clamp(Math.max(1 - fade, dip * 0.85));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}
