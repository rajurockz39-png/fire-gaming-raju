// Storytime Short #1 – "Mom's Slipper" (Amma's chappal). Flat 2D, English captions.
// Narration (owner's voice) can be laid over later; captions carry the story for now.
import { drawRaju, drawPilli, drawAmma, drawChappal, drawLaddu, TAU } from './storytime_cast.js';
import { endCard, preload as basePreload } from './duck_story.js';

export const W = 1080, H = 1920, DURATION = 31;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const ease = (k) => k * k * (3 - 2 * k);
const back = (k) => { const c = 2; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const INK = '#1b1b22';
const TE = "800 %spx NotoTelugu, Fredoka, sans-serif";

export async function preload() {
  await basePreload();
  const f = new FontFace('NotoTelugu', 'url(../fonts/NotoSansTelugu-ExtraBold.ttf)', { weight: '800' });
  document.fonts.add(await f.load());
}

// ------------------------------------------------------------------ helpers
function caption(ctx, text, k, y = 1400, size = 64, color = '#ffffff') {
  if (k <= 0) return;
  ctx.save();
  ctx.font = TE.replace('%s', size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > 940 && cur) { lines.push(cur); cur = w; } else cur = test; }
  lines.push(cur);
  const s = 0.85 + 0.15 * back(clamp(k));
  ctx.translate(W / 2, y); ctx.scale(s, s); ctx.globalAlpha = clamp(k * 2);
  lines.forEach((l, i) => {
    const ly = (i - (lines.length - 1) / 2) * size * 1.35;
    ctx.lineWidth = 14; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.strokeText(l, 0, ly);
    ctx.fillStyle = color; ctx.fillText(l, 0, ly);
  });
  ctx.restore();
}

function burstBg(ctx, c1, c2, t) {
  ctx.fillStyle = c1; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.rotate(t * 0.15);
  ctx.fillStyle = c2;
  for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 2000, i / 16 * TAU, (i + 0.5) / 16 * TAU); ctx.fill(); }
  ctx.restore();
}

function bigMark(ctx, ch, x, y, k, color) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); const s = back(clamp(k)); ctx.scale(s, s);
  ctx.font = '600 220px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 18; ctx.strokeStyle = INK; ctx.strokeText(ch, 0, 0); ctx.fillStyle = color; ctx.fillText(ch, 0, 0);
  ctx.restore();
}

function redX(ctx, x, y, k) {
  if (k <= 0) return;
  const s = back(clamp(k)) * 110;
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
  for (const [w, c] of [[44, INK], [30, '#ff3b30']]) {
    ctx.lineWidth = w; ctx.strokeStyle = c;
    ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.moveTo(s, -s); ctx.lineTo(-s, s); ctx.stroke();
  }
  ctx.restore();
}

function missile(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.5);
  ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ctx.fillStyle = '#c9ced8'; ctx.beginPath(); ctx.roundRect(-40, -150, 80, 260, 40); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.moveTo(-40, -110); ctx.quadraticCurveTo(0, -230, 40, -110); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 40, 40); ctx.lineTo(sd * 90, 120); ctx.lineTo(sd * 40, 110); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.moveTo(-26, 110); ctx.lineTo(0, 190); ctx.lineTo(26, 110); ctx.fill();
  ctx.restore();
}

function bullet(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(0.4);
  ctx.lineWidth = 7; ctx.strokeStyle = INK;
  ctx.fillStyle = '#d99a2b'; ctx.beginPath(); ctx.roundRect(-38, -20, 76, 150, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b06b2a'; ctx.beginPath(); ctx.moveTo(-38, -20); ctx.quadraticCurveTo(0, -150, 38, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function stars(ctx, x, y, t, r = 90) {
  for (let i = 0; i < 4; i++) {
    const a = t * 5 + i * TAU / 4, sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.35;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 4);
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 9 : 22, aa = k / 10 * TAU; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
}

function impact(ctx, x, y, k, word, size = 1) {
  if (k <= 0 || k >= 1) return;
  const s = size * back(clamp(k * 3)) * (1 - Math.max(0, k - 0.7) / 0.3 * 0.2);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = 1 - Math.max(0, k - 0.75) * 4;
  ctx.fillStyle = '#ffe14a'; ctx.strokeStyle = INK; ctx.lineWidth = 8;
  ctx.beginPath(); for (let i = 0; i < 28; i++) { const r = i % 2 ? 110 : 190, a = i / 28 * TAU; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.font = '600 120px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 14; ctx.strokeText(word, 0, 6); ctx.fillStyle = '#ff3b30'; ctx.fillText(word, 0, 6);
  ctx.restore();
}

function kitchen(ctx) {
  ctx.fillStyle = '#cfe8f2'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#b4d4e2'; ctx.lineWidth = 4;
  for (let y = 0; y < 1300; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let x = 0; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1300); ctx.stroke(); }
  ctx.fillStyle = '#e9c48a'; ctx.fillRect(0, 1300, W, H);
  ctx.lineWidth = 7; ctx.strokeStyle = INK;
  ctx.fillStyle = '#9b6a3c'; ctx.beginPath(); ctx.rect(560, 950, 520, 350); ctx.fill(); ctx.stroke();      // counter
  ctx.fillStyle = '#7a5230'; ctx.beginPath(); ctx.rect(540, 920, 560, 40); ctx.fill(); ctx.stroke();
  // window
  ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.rect(120, 260, 300, 260); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(270, 260); ctx.lineTo(270, 520); ctx.moveTo(120, 390); ctx.lineTo(420, 390); ctx.stroke();
}

function laddusJar(ctx, x, y, n) {
  ctx.save(); ctx.lineWidth = 7; ctx.strokeStyle = INK;
  for (let i = 0; i < n; i++) drawLaddu(ctx, x - 50 + (i % 3) * 50, y - 40 - Math.floor(i / 3) * 44, 0.75);
  ctx.fillStyle = 'rgba(200,235,255,0.35)';
  ctx.beginPath(); ctx.roundRect(x - 100, y - 190, 200, 200, 30); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e3342f'; ctx.beginPath(); ctx.roundRect(x - 80, y - 215, 160, 34, 10); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function houseWide(ctx) {
  ctx.fillStyle = '#a8dcff'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#7cc56a'; ctx.fillRect(0, 1250, W, H);
  ctx.lineWidth = 7; ctx.strokeStyle = INK;
  // house (cross-section): wall, roof, floor
  ctx.fillStyle = '#f6dfb4'; ctx.beginPath(); ctx.rect(-10, 640, 560, 610); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d0533a'; ctx.beginPath(); ctx.moveTo(-60, 650); ctx.lineTo(270, 430); ctx.lineTo(600, 650); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c99a63'; ctx.fillRect(-10, 1235, 560, 25);
  ctx.fillStyle = '#f6dfb4'; ctx.fillRect(470, 900, 90, 335);                     // open doorway
  ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.rect(466, 880, 12, 360); ctx.fill(); ctx.stroke();
  // photo frame + clock on the wall
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.rect(110, 720, 120, 90); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(390, 760, 40, 0, TAU); ctx.fill(); ctx.stroke();
  // gate + fence on the right
  ctx.fillStyle = '#ffffff';
  for (let x = 720; x < W + 40; x += 46) { ctx.beginPath(); ctx.moveTo(x, 1250); ctx.lineTo(x, 1060); ctx.lineTo(x + 16, 1040); ctx.lineTo(x + 32, 1060); ctx.lineTo(x + 32, 1250); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.rect(700, 1100, 400, 22); ctx.fill(); ctx.stroke();
  // sun + clouds
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(900, 260, 80, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  for (const [x, y] of [[700, 420], [180, 260]]) { ctx.beginPath(); ctx.arc(x, y, 50, 0, TAU); ctx.arc(x + 55, y - 15, 60, 0, TAU); ctx.arc(x + 115, y, 48, 0, TAU); ctx.fill(); }
}

function camera(ctx, zoom, fx, fy, shake = 0, t = 0) {
  fx = clamp(fx, W / (2 * zoom), W - W / (2 * zoom));
  fy = clamp(fy, H / (2 * zoom), H - H / (2 * zoom));
  const sx = shake * Math.sin(t * 90) * 14, sy = shake * Math.cos(t * 77) * 14;
  ctx.setTransform(zoom, 0, 0, zoom, W / 2 - fx * zoom + sx, H / 2 - fy * zoom + sy);
}

// ------------------------------------------------------------------ frame
export function drawFrame(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  if (t < 4) {                                         // 1. the question
    burstBg(ctx, '#ffcf3f', '#ffdd6e', t);
    drawRaju(ctx, 540, 1250, 1.4, { expr: 'think', armR: 1.1, t, look: Math.sin(t * 2) });
    bigMark(ctx, '?', 830, 520, prog(t, 0.8, 1.2), '#ffffff');
    caption(ctx, 'What is the FASTEST weapon in the world?', prog(t, 0.2, 0.6), 330, 72);
  } else if (t < 8) {                                  // 2. not a missile, not a bullet
    const lt = t - 4;
    burstBg(ctx, '#7ec8ff', '#9ad6ff', t);
    missile(ctx, 300, 650, back(prog(lt, 0.2, 0.6)) * 1.2);
    redX(ctx, 300, 650, prog(lt, 0.9, 1.2));
    bullet(ctx, 780, 650, back(prog(lt, 1.6, 2.0)) * 1.2);
    redX(ctx, 780, 650, prog(lt, 2.2, 2.5));
    drawRaju(ctx, 540, 1350, 1.1, { expr: 'smug', t, look: Math.sin(lt * 9) > 0 ? 1 : -1 });
    caption(ctx, lt < 1.6 ? 'Not a missile...' : 'Not a bullet...', 1, 330, 80);
  } else if (t < 10.5) {                               // 3. AMMA'S CHAPPAL!
    const lt = t - 8;
    const k = ease(prog(lt, 0, 0.6));
    ctx.fillStyle = '#1d1030'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 860, 50, 540, 860, 700);
    g.addColorStop(0, 'rgba(255,230,140,0.9)'); g.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const shake = lt > 0.6 && lt < 1.1 ? 1 : 0;
    camera(ctx, 1, 540, 960, shake, t);
    drawChappal(ctx, 540, 860, lerp(0.3, 3.2, k), lerp(-6, 0.25, k));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    caption(ctx, "MOM'S SLIPPER!", prog(lt, 0.6, 0.9), 1450, 120, '#ff3b30');
  } else if (t < 15.5) {                               // 4. the laddu heist
    const lt = t - 10.5;
    kitchen(ctx);
    const jarN = lt < 2.6 ? 9 : 8;
    laddusJar(ctx, 820, 920, jarN);
    const rx = lerp(160, 560, ease(prog(lt, 0, 2.2)));
    const tip = lt < 2.2 ? Math.abs(Math.sin(lt * 6)) * 30 : 0;
    const grab = prog(lt, 2.2, 2.6);
    drawRaju(ctx, rx, 1420, 1.0, { expr: lt > 2.6 ? 'smug' : 'happy', armR: lt > 2.6 ? 1.7 : grab * 1.4, bounce: tip, t, look: 1 });
    if (lt > 2.6) drawLaddu(ctx, rx + 120, 1420 - 340, 1.1);
    drawPilli(ctx, 930, 1500, 0.9, { expr: lt > 2.8 ? 'shocked' : 'happy', t });
    if (lt > 2.8) bigMark(ctx, '!', 930, 1170, prog(lt, 2.8, 3.1), '#ff3b30');
    caption(ctx, 'I stole a laddu from the kitchen...', prog(lt, 0.2, 0.6), 330, 66);
  } else if (t < 29.5) {                               // 5-7. the throw (one continuous wide shot)
    const lt = t - 15.5;
    // camera: wide -> aim close-up -> follow the chappal -> impact on Raju
    let zoom = 1.3, fx = 560, fy = 900;
    if (lt > 4.3 && lt < 6.0) { const k = ease(prog(lt, 4.3, 4.8)); zoom = lerp(1.3, 1.8, k); fx = lerp(560, 340, k); fy = lerp(900, 1000, k); }
    const fly = prog(lt, 6.1, 7.9);
    if (lt >= 6.0 && lt < 7.9) { zoom = 1.45; fx = lerp(340, 860, ease(fly)); fy = 960; }
    if (lt >= 7.9) { const k = ease(prog(lt, 7.9, 8.3)); zoom = lerp(1.45, 1.75, k); fx = 820; fy = 1000; }
    const hit = lt >= 7.9;
    camera(ctx, zoom, fx, fy, hit && lt < 8.6 ? 1 : 0, t);
    houseWide(ctx);
    // Amma: calm -> notices (angry) -> takes chappal -> aims -> throws
    const aiming = lt > 4.0 && lt < 6.1, holding = lt > 3.2 && lt < 6.1;
    drawAmma(ctx, 230, 1250, 0.62, {
      expr: lt < 1.6 ? 'calm' : (aiming ? 'aim' : 'angry'),
      armR: holding ? lerp(0, 1.6, ease(prog(lt, 3.2, 3.8))) : (lt >= 6.1 ? lerp(1.6, -0.3, ease(prog(lt, 6.1, 6.4))) : 0),
      hold: holding, t,
    });
    // Raju escaping with the laddu
    const rjx = lerp(600, 880, ease(prog(lt, 0, 1.6)));
    const run = lt < 1.6 ? Math.abs(Math.sin(lt * 12)) * 20 : 0;
    let rexpr = lt < 1.6 ? 'laugh' : 'smug';
    if (hit) rexpr = lt < 8.8 ? 'shocked' : 'cry';
    drawRaju(ctx, rjx, 1250, 0.6, { expr: rexpr, armR: hit ? 0.2 : 1.6, bounce: run, t, look: -1 });
    if (!hit) drawLaddu(ctx, rjx + 72, 1250 - 205, 0.7);
    // laddu pops out on impact, Pilli catches it
    if (hit) {
      const k = prog(lt, 8.0, 9.6);
      const lx = lerp(rjx + 72, 700, k), ly = 1045 - Math.sin(k * Math.PI) * 220 + k * 120;
      if (k < 1) drawLaddu(ctx, lx, ly, 0.7);
    }
    const pilliX = lt < 8 ? 640 : lerp(640, 700, prog(lt, 8.6, 9.4));
    drawPilli(ctx, pilliX, 1250, 0.55, { expr: lt > 9.6 ? 'laugh' : (hit ? 'shocked' : 'happy'), t });
    if (lt > 9.6) drawLaddu(ctx, pilliX, 1250 - 92, 0.5);
    // distance arrow
    if (lt > 1.8 && lt < 4.2) {
      const k = prog(lt, 1.8, 2.4);
      ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.setLineDash([18, 14]);
      ctx.beginPath(); ctx.moveTo(300, 1300); ctx.lineTo(lerp(300, 860, k), 1300); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '600 70px Fredoka'; ctx.textAlign = 'center'; ctx.lineWidth = 10; ctx.strokeText('20 m', 580, 1380); ctx.fillStyle = '#fff'; ctx.fillText('20 m', 580, 1380);
    }
    // crosshair locks on Raju
    if (lt > 4.6 && lt < 6.1) {
      const k = ease(prog(lt, 4.6, 5.6)), r = lerp(260, 70, k);
      ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(rjx, 1060, r, 0, TAU); ctx.moveTo(rjx - r - 30, 1060); ctx.lineTo(rjx + r + 30, 1060); ctx.moveTo(rjx, 1060 - r - 30); ctx.lineTo(rjx, 1060 + r + 30); ctx.stroke();
    }
    // the chappal in slow motion (parabola + spin + trail)
    if (lt >= 6.1 && lt < 7.95) {
      for (let k = 6; k >= 0; k--) {
        const f = clamp(fly - k * 0.025);
        const cx = lerp(300, rjx, f), cy = lerp(1000, 1060, f) - Math.sin(f * Math.PI) * 260;
        ctx.globalAlpha = k === 0 ? 1 : 0.12;
        drawChappal(ctx, cx, cy, 0.55, f * 14);
      }
      ctx.globalAlpha = 1;
    }
    if (hit) {
      impact(ctx, rjx - 60, 830, prog(lt, 7.9, 8.9), 'BONK!', 0.55);
      if (lt > 8.4) stars(ctx, rjx, 1250 - 330, t, 70);
      if (lt > 8.4 && lt < 9.6) drawChappal(ctx, rjx + 70, 1250 - 20, 0.5, 1.4);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // HUD: slow-motion stopwatch
    if (lt >= 6.1 && lt < 8.6) {
      const secs = Math.min(0.9, fly * 0.9).toFixed(1);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.roundRect(700, 150, 320, 120, 30); ctx.fill(); ctx.stroke();
      ctx.font = '600 76px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ff3b30';
      ctx.fillText(`${secs} sec`, 860, 212);
      ctx.font = '600 40px Fredoka'; ctx.fillStyle = INK; ctx.fillText('SLOW MOTION', 860, 300);
    }
    // captions
    if (lt < 4.2) caption(ctx, 'Mom in the hall... me at the gate. 20 meters away!', prog(lt, 0.3, 0.7), 330, 64);
    else if (lt < 6.1) caption(ctx, 'Mom took off her slipper... and aimed...', prog(lt, 4.2, 4.6), 330, 66);
    else if (lt < 7.9) caption(ctx, 'It took less than ONE second.', prog(lt, 6.1, 6.4), 1500, 66);
    else caption(ctx, 'Mom has no GPS... but she NEVER misses!', prog(lt, 10.0, 10.4), 330, 64, '#ffe14a');
  } else {                                             // 8. end card
    burstBg(ctx, '#ffcf3f', '#ffdd6e', t);
    drawRaju(ctx, 380, 1500, 0.9, { expr: 'laugh', armR: 1.6, t });
    drawPilli(ctx, 760, 1500, 0.9, { expr: 'laugh', t });
    endCard(ctx, t - 29.5, t);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const a = clamp(Math.max(1 - prog(t, 0, 0.3), prog(t, DURATION - 0.4, DURATION)));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}
