// Episode 2 – "Chinni & the Rain" (2D, no voice).
// Chinni plays by the pond, the rain and thunder scare her, she hides under a big
// leaf, meets a little frog, and they splash in the puddles under a rainbow.
import { drawDuckling, drawFrog, drawBigLeaf, TAU, clamp, lerp } from './cast2d.js';
import { pond, bank, camera, vignette, sparkle, heart, endCard, preload as basePreload, prog, ease, back, rand } from './duck_story.js';

export const W = 1080, H = 1920, DURATION = 30;
export const preload = basePreload;
const GROUND = 1700;
const LEAF_X = 850;

function title(ctx, t) {
  const k = back(prog(t, 0.6, 1.2)), out = ease(prog(t, 4.2, 4.8));
  if (k <= 0 || out >= 1) return;
  ctx.save(); ctx.globalAlpha = 1 - out;
  ctx.translate(W / 2, 330 - out * 80); ctx.scale(k, k);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.font = '600 140px Fredoka';
  const g = ctx.createLinearGradient(0, -120, 0, 0);
  g.addColorStop(0, '#fff2a0'); g.addColorStop(0.5, '#ffc21c'); g.addColorStop(1, '#f08a00');
  ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(90,40,0,0.9)'; ctx.strokeText('Chinni', 0, -60);
  ctx.fillStyle = g; ctx.fillText('Chinni', 0, -60);
  ctx.font = '600 96px Fredoka';
  const g2 = ctx.createLinearGradient(0, 40, 0, 120);
  g2.addColorStop(0, '#d8f2ff'); g2.addColorStop(1, '#4aa8f0');
  ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(10,40,90,0.9)'; ctx.strokeText('& the Rain', 0, 70);
  ctx.fillStyle = g2; ctx.fillText('& the Rain', 0, 70);
  ctx.restore();
  for (let i = 0; i < 6; i++) sparkle(ctx, 200 + i * 140, 470 + Math.sin(t * 4 + i) * 30, 18, (1 - out) * clamp(k) * (0.5 + 0.5 * Math.sin(t * 6 + i)));
}

function darkClouds(ctx, k, t) {
  if (k <= 0) return;
  const R = rand(31);
  for (let i = 0; i < 14; i++) {
    const x = R() * W * 1.3 - 120 + Math.sin(t * 0.2 + i) * 20, y = -260 + k * (260 + R() * 260), r = 140 + R() * 120;
    const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, `rgba(150,158,175,${0.95 * k})`); g.addColorStop(1, `rgba(80,88,105,${0.95 * k})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
}

function rain(ctx, t, amount, shelter) {
  if (amount <= 0) return;
  ctx.save();
  if (shelter) {            // no rain under the leaf
    ctx.beginPath(); ctx.rect(-2000, -2000, W + 4000, H + 4000);
    ctx.rect(shelter[0], shelter[1], shelter[2], shelter[3]);
    ctx.clip('evenodd');
  }
  ctx.strokeStyle = `rgba(215,230,255,${0.55 * Math.min(1, amount + 0.3)})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const R = rand(9), n = Math.floor(260 * amount);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = 1400 + R() * 600, x0 = R() * (W + 400) - 200, ph = R();
    const y = ((t * sp / H + ph) % 1) * (H + 200) - 100, x = x0 - y * 0.12;
    ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 48);
  }
  ctx.stroke();
  // ground splashes
  ctx.strokeStyle = `rgba(230,240,255,${0.6 * amount})`; ctx.lineWidth = 2;
  for (let i = 0; i < Math.floor(40 * amount); i++) {
    const p = (t * 2.2 + R()) % 1, x = R() * W, y = 1560 + R() * 340;
    ctx.globalAlpha = 1 - p;
    ctx.beginPath(); ctx.ellipse(x, y, 6 + p * 22, 2 + p * 6, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

function puddles(ctx, t, rainAmt, sunny) {
  for (const [x, y, rx] of [[300, 1780, 150], [700, 1860, 120], [980, 1770, 110]]) {
    const g = ctx.createLinearGradient(0, y - 30, 0, y + 30);
    g.addColorStop(0, sunny > 0.5 ? '#bfe4ff' : '#8a9cb4'); g.addColorStop(1, sunny > 0.5 ? '#7cc0ea' : '#5d6e86');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.22, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,30,0.35)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    for (let k = 0; k < 3 * rainAmt; k++) {
      const p = (t * 1.5 + k * 0.37 + x * 0.001) % 1;
      ctx.globalAlpha = 1 - p;
      ctx.beginPath(); ctx.ellipse(x + Math.sin(k * 7 + x) * rx * 0.5, y, 8 + p * 30, 2 + p * 7, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function bolt(ctx, x, y0, y1, seed, a) {
  const R = rand(seed);
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 9; ctx.lineJoin = 'round';
  ctx.shadowColor = '#fff6a0'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.moveTo(x, y0);
  let cx = x;
  for (let y = y0; y < y1; y += 60) { cx += (R() - 0.5) * 90; ctx.lineTo(cx, y); }
  ctx.stroke(); ctx.restore();
}

function rainbow(ctx, k) {
  if (k <= 0) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, 835); ctx.clip();
  const cols = ['#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#0a84ff', '#5e5ce6', '#bf5af2'];
  cols.forEach((c, i) => {
    ctx.strokeStyle = c; ctx.globalAlpha = 0.5 * k; ctx.lineWidth = 30;
    ctx.beginPath(); ctx.arc(540, 1050, 640 - i * 28, Math.PI, TAU); ctx.stroke();
  });
  ctx.restore();
}

function splash(ctx, x, y, p) {
  if (p <= 0 || p >= 1) return;
  ctx.fillStyle = `rgba(190,225,255,${1 - p})`;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI, d = 30 + p * 110;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 + p * p * 80, 9 * (1 - p) + 2, 0, TAU); ctx.fill();
  }
}

function mark(ctx, x, y, k, ch = '!') {
  if (k <= 0) return;
  const s = back(clamp(k));
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, 42, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.font = '600 66px Fredoka'; ctx.fillStyle = ch === '!' ? '#ff3b30' : '#ff4f86';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, 4);
  ctx.restore();
}

// ------------------------------------------------------------------ frame
export function drawFrame(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const blink = (tt) => ((tt % 3.1) < 0.12 ? 1 : 0);

  // weather over time
  const storm = ease(prog(t, 5.5, 8.0)) * (1 - ease(prog(t, 21.0, 23.0)));
  const rainAmt = ease(prog(t, 7.0, 10.5)) * (1 - ease(prog(t, 21.0, 22.5)));
  const sunny = 1 - storm;
  const flashA = Math.max(0, 1 - Math.abs(t - 11.0) / 0.25) + Math.max(0, 1 - Math.abs(t - 13.6) / 0.2) * 0.6;

  // camera path
  let zoom = 1.12, fx = 540, fy = 1330;
  if (t > 12) { const k = ease(prog(t, 12, 15)); zoom = lerp(1.12, 1.75, k); fx = lerp(540, 840, k); fy = lerp(1330, 1560, k); }
  if (t > 21.5) { const k = ease(prog(t, 21.5, 23.5)); zoom = lerp(1.75, 1.12, k); fx = lerp(840, 620, k); fy = lerp(1560, 1330, k); }
  camera(ctx, zoom, fx, fy);

  pond(ctx, t);
  rainbow(ctx, ease(prog(t, 22.5, 24.5)));
  darkClouds(ctx, storm, t);
  if (storm > 0) { ctx.fillStyle = `rgba(40,50,75,${0.45 * storm})`; ctx.fillRect(-500, -500, W + 1000, H + 1000); }
  if (t > 10.8 && t < 11.3) bolt(ctx, 260, 0, 820, 4, 1 - Math.abs(t - 11.0) / 0.3);
  bank(ctx, t, 1480);
  puddles(ctx, t, rainAmt, sunny);
  if (storm > 0) { ctx.fillStyle = `rgba(40,50,75,${0.25 * storm})`; ctx.fillRect(0, 1480, W, H); }

  drawBigLeaf(ctx, LEAF_X, GROUND + 10, 0.8, t, rainAmt);

  // ---------------- frog (under the leaf from scene 4)
  if (t > 14.5) {
    const lt = t - 14.5;
    let fo = { t, blink: blink(t + 1), look: [-0.7, 0.1], mood: 'happy' };
    let fxp = 960, hop = 0, sq = 1;
    if (lt > 0.9 && lt < 2.0) fo = { ...fo, mood: 'surprised', look: [-0.9, 0] };
    if (lt > 2.0 && lt < 3.2) fo.arm = Math.abs(Math.sin((lt - 2) * 6));          // waves hello
    if (lt > 3.2 && lt < 4.2) { const k = prog(lt, 3.2, 4.2); hop = Math.sin(k * Math.PI) * 170; sq = k > 0.9 ? 0.85 : 1.08; fxp = lerp(960, 900, k); fo.mouth = 0.6; }
    if (lt > 4.2) fxp = 900;
    if (t > 23.5) {                       // jumps in the puddle with Chinni
      const k = ((t - 23.5) % 0.9) / 0.9;
      hop = t < 26 ? Math.sin(k * Math.PI) * 120 : 0; fxp = lerp(900, 1000, prog(t, 23.5, 24.4)); fo.mouth = 0.4;
    }
    if (t > 26.4) fo.arm = Math.abs(Math.sin((t - 26.4) * 6));              // waves bye
    drawFrog(ctx, fxp, GROUND + 60 + (t > 23.5 ? 60 : 0), 0.62, { ...fo, hop, squash: sq });
  }

  // ---------------- Chinni
  let cx = 420, cy = GROUND, o = { t, facing: 1, blink: blink(t), look: [0.5, 0.1], mood: 'happy' };
  if (t < 5.5) {                                     // splashing at the water's edge
    const k = (t % 0.8) / 0.8;
    o.hop = Math.sin(k * Math.PI) * 60; o.wing = Math.sin(k * Math.PI) * 0.8; o.mouth = 0.5; o.look = [0.3, 0.6];
    o.squash = k > 0.92 ? 0.88 : 1;
  } else if (t < 10.4) {                             // the sky darkens, a drop hits her
    o.look = [0.2, -0.9];
    if (t > 7.6) { o.mood = 'surprised'; o.squash = t < 7.8 ? 0.85 : 1; o.mouth = t < 8.2 ? 0.5 : 0; }
    if (t > 8.6) { o.mood = 'sad'; o.look = [0, -0.8]; }
  } else if (t < 12.2) {                             // thunder! trembling
    o.mood = t > 11.0 ? 'surprised' : 'sad'; o.look = [-0.4, -0.6];
    cx += t > 11.0 ? Math.sin(t * 60) * 6 : 0; o.wing = t > 11 ? 0.9 : 0; o.mouth = t > 11 ? 0.8 : 0;
  } else if (t < 15.0) {                             // runs to the leaf
    const k = prog(t, 12.2, 15.0);
    cx = lerp(420, 760, ease(k)); o.walk = t * 5; o.hop = Math.abs(Math.sin(t * 10)) * 25; o.mood = 'sad'; o.look = [0.8, 0];
    o.wing = Math.abs(Math.sin(t * 10)) * 0.6;
  } else if (t < 21.5) {                             // meets the frog
    cx = 760; o.look = [0.9, 0.1];
    if (t < 16.5) o.mood = t > 15.4 ? 'surprised' : 'sad';
    if (t > 18.2 && t < 20) { o.mouth = 0.6; o.squash = 1 + Math.sin(t * 25) * 0.03; }      // giggles
  } else if (t < 23.5) {                             // rain stops, looks at the rainbow
    cx = 760; o.look = [-0.3, -0.9]; o.mouth = t > 22.6 ? 0.4 : 0;
  } else if (t < 26.2) {                             // puddle jumping
    const k = ((t - 23.5) % 0.9) / 0.9;
    cx = lerp(760, 700, prog(t, 23.5, 24.4)); cy = GROUND + 160; o.hop = Math.sin(k * Math.PI) * 110;
    o.wing = Math.sin(k * Math.PI) * 0.9; o.mouth = 0.5; o.look = [0.6, 0.3];
  } else {                                           // mother calls – waves bye to the frog
    cx = 700; cy = GROUND + 160; o.look = [0.9, 0]; o.wing = Math.abs(Math.sin((t - 26.2) * 7)) * 0.9; o.mouth = 0.3;
  }
  if (t > 21.5 || t < 15.0) o.facing = t > 26.2 ? 1 : (t < 15 ? 1 : -1);
  drawDuckling(ctx, cx, cy, t > 14.5 ? 0.7 : 0.8, o);

  // splashes when landing in puddles / the raindrop on her head
  if (t < 5.5) splash(ctx, cx, cy, ((t % 0.8) / 0.8 - 0.85) / 0.15);
  if (t > 23.5 && t < 26.2) { const k = ((t - 23.5) % 0.9) / 0.9; splash(ctx, cx, cy, (k - 0.85) / 0.15); }
  if (t > 7.2 && t < 7.6) {
    const k = prog(t, 7.2, 7.6), dy = lerp(900, cy - 260, k);
    ctx.fillStyle = '#cfe8ff'; ctx.beginPath(); ctx.ellipse(cx, dy, 9, 16, 0, 0, TAU); ctx.fill();
  }
  if (t > 7.6 && t < 8.0) splash(ctx, cx, cy - 250, prog(t, 7.6, 8.0));

  // reactions
  if (t > 15.4 && t < 16.6) { mark(ctx, 700, 1340, prog(t, 15.4, 15.7)); mark(ctx, 980, 1450, prog(t, 15.5, 15.8)); }
  if (t > 19.2 && t < 21.5) for (let i = 0; i < 4; i++) heart(ctx, 830 + Math.sin(t * 2 + i * 1.6) * 90, 1450 - ((t - 19.2) * 120 + i * 60) % 260, 0.8, 0.8);

  rain(ctx, t, rainAmt, t > 14.0 && t < 23 ? [560, 1380, 560, 600] : null);
  if (t > 25.6 && t < 27) {       // "quack" from the pond
    const k = prog(t, 25.6, 27);
    ctx.font = '600 80px Fredoka'; ctx.textAlign = 'center'; ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(90,40,0,0.8)';
    ctx.globalAlpha = clamp((1 - k) * 2); ctx.strokeText('quack!', 330, 1180); ctx.fillStyle = '#ffd34a'; ctx.fillText('quack!', 330, 1180); ctx.globalAlpha = 1;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  vignette(ctx, 0.3 + storm * 0.25);
  if (flashA > 0) { ctx.fillStyle = `rgba(255,255,245,${0.75 * clamp(flashA)})`; ctx.fillRect(0, 0, W, H); }
  title(ctx, t);
  if (t >= 27) endCard(ctx, t - 27, t);
  const a = clamp(Math.max(1 - prog(t, 0, 0.5), prog(t, DURATION - 0.6, DURATION)));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}
