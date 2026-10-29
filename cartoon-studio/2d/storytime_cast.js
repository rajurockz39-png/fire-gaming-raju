// Naa Idea "storytime" cast – simple flat 2D (thick outlines, flat colours, dot eyes),
// made for fast narrated comedy videos. Raju (red hoodie boy from the logo) + Pilli the cat.
export const TAU = Math.PI * 2;
const INK = '#1b1b22', LW = 7;

function blob(ctx, fill, path) {
  ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); path(); ctx.fill(); ctx.stroke();
}

// expression: happy | shocked | cry | angry | laugh | think | smug
export function drawRaju(ctx, x, y, s, o = {}) {
  const { expr = 'happy', armL = 0, armR = 0, t = 0, look = 0, bounce = 0 } = o;
  ctx.save(); ctx.translate(x, y - bounce); ctx.scale(s, s);
  const skin = '#c98b5e', hood = '#e3342f', hoodDark = '#b8231f';
  // legs + shoes
  for (const sd of [-1, 1]) {
    blob(ctx, '#2c2f3a', () => ctx.roundRect(sd * 22 - 14, -70, 28, 64, 12));
    blob(ctx, '#ffffff', () => ctx.ellipse(sd * 24 + 6, -6, 26, 13, 0, 0, TAU));
    ctx.fillStyle = '#e3342f'; ctx.beginPath(); ctx.ellipse(sd * 24 + 6, -12, 20, 6, 0, Math.PI, TAU); ctx.fill();
  }
  // arms (rotate at the shoulder; positive = raise)
  const arm = (sd, ang) => {
    ctx.save(); ctx.translate(sd * 58, -175); ctx.rotate(sd * (0.25 - ang));
    blob(ctx, hood, () => ctx.roundRect(-14, 0, 28, 82, 14));
    blob(ctx, skin, () => ctx.arc(0, 88, 15, 0, TAU));
    ctx.restore();
  };
  arm(-1, armL); arm(1, armR);
  // hoodie body
  blob(ctx, hood, () => ctx.roundRect(-62, -200, 124, 140, 34));
  ctx.strokeStyle = hoodDark; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-34, -112); ctx.lineTo(34, -112); ctx.stroke();      // pocket
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-14, -196); ctx.lineTo(-18, -160); ctx.moveTo(14, -196); ctx.lineTo(18, -160); ctx.stroke();
  // head
  const hy = -282;
  blob(ctx, skin, () => ctx.ellipse(0, hy, 84, 80, 0, 0, TAU));
  blob(ctx, skin, () => ctx.ellipse(-84, hy + 6, 14, 20, 0, 0, TAU));
  blob(ctx, skin, () => ctx.ellipse(84, hy + 6, 14, 20, 0, 0, TAU));
  // messy hair
  blob(ctx, '#2a1a12', () => {
    ctx.moveTo(-88, hy - 4);
    const spikes = [[-92, -60], [-70, -92], [-40, -108], [-8, -118], [26, -112], [58, -98], [86, -66], [90, -20]];
    let px = -88, py = hy - 4;
    for (const [sx, sy] of spikes) { ctx.quadraticCurveTo((px + sx) / 2 - 10, hy + (py - hy + sy) / 2 - 22, sx, hy + sy); px = sx; py = hy + sy; }
    ctx.quadraticCurveTo(40, hy - 40, 0, hy - 44); ctx.quadraticCurveTo(-50, hy - 40, -88, hy - 4);
  });
  // eyes
  const ex = look * 8;
  for (const sd of [-1, 1]) {
    const cx = sd * 32 + ex, cy = hy + 4;
    if (expr === 'laugh') { ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy + 6, 13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); continue; }
    if (expr === 'angry') { ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx - 20 * sd * -1 - 0, cy - 30 + 0); ctx.lineTo(cx + 18 * -sd, cy - 18); ctx.stroke(); }
    const r = expr === 'shocked' ? 22 : 16;
    blob(ctx, '#ffffff', () => ctx.arc(cx, cy, r, 0, TAU));
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx + ex * 0.4, cy + 2, expr === 'shocked' ? 6 : 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + ex * 0.4 + 3, cy - 2, 3, 0, TAU); ctx.fill();
    if (expr === 'cry') {          // comic tear streams
      ctx.fillStyle = '#5ec8ff'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      const wob = Math.sin(t * 12) * 3;
      ctx.beginPath(); ctx.roundRect(cx - 7, cy + 14, 14, 70 + wob, 7); ctx.fill(); ctx.stroke();
    }
    if (expr === 'think' && sd < 0) { ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 18, cy - 28); ctx.lineTo(cx + 16, cy - 34); ctx.stroke(); }
  }
  // mouth
  const my = hy + 44;
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.fillStyle = '#7a1e22';
  ctx.beginPath();
  if (expr === 'happy' || expr === 'smug') ctx.arc(ex + (expr === 'smug' ? 10 : 0), my - 14, 22, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (expr === 'laugh') { ctx.moveTo(ex - 30, my - 10); ctx.quadraticCurveTo(ex, my + 40, ex + 30, my - 10); ctx.closePath(); ctx.fill(); }
  else if (expr === 'shocked') { ctx.ellipse(ex, my, 16, 22, 0, 0, TAU); ctx.fill(); }
  else if (expr === 'cry') { ctx.moveTo(ex - 28, my + 10); ctx.quadraticCurveTo(ex, my - 22, ex + 28, my + 10); ctx.closePath(); ctx.fill(); }
  else if (expr === 'angry') { ctx.moveTo(ex - 22, my + 4); ctx.quadraticCurveTo(ex, my - 10, ex + 22, my + 4); }
  else ctx.moveTo(ex - 16, my), ctx.lineTo(ex + 16, my - 4);
  ctx.stroke();
  ctx.restore();
}

export function drawPilli(ctx, x, y, s, o = {}) {
  const { expr = 'happy', tail = 0, t = 0 } = o;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const fur = '#8e8f9c', white = '#ffffff';
  // tail
  ctx.strokeStyle = INK; ctx.lineWidth = 26; ctx.lineCap = 'round';
  const tw = Math.sin(t * 4 + tail) * 18;
  ctx.beginPath(); ctx.moveTo(50, -30); ctx.quadraticCurveTo(110, -40 + tw, 100, -110 + tw); ctx.stroke();
  ctx.strokeStyle = fur; ctx.lineWidth = 14; ctx.stroke();
  // body
  blob(ctx, fur, () => ctx.ellipse(0, -48, 66, 50, 0, 0, TAU));
  blob(ctx, white, () => ctx.ellipse(-6, -36, 34, 30, 0, 0, TAU));
  for (const sd of [-1, 1]) blob(ctx, white, () => ctx.ellipse(sd * 30, -6, 18, 11, 0, 0, TAU));
  // head
  const hy = -122;
  for (const sd of [-1, 1]) {
    blob(ctx, fur, () => { ctx.moveTo(sd * 22, hy - 40); ctx.lineTo(sd * 58, hy - 86); ctx.lineTo(sd * 62, hy - 26); ctx.closePath(); });
    ctx.fillStyle = '#f2a7b8'; ctx.beginPath(); ctx.moveTo(sd * 30, hy - 44); ctx.lineTo(sd * 54, hy - 74); ctx.lineTo(sd * 54, hy - 38); ctx.fill();
  }
  blob(ctx, fur, () => ctx.ellipse(0, hy, 66, 56, 0, 0, TAU));
  blob(ctx, white, () => ctx.ellipse(0, hy + 22, 36, 26, 0, 0, TAU));
  for (const sd of [-1, 1]) {
    const cx = sd * 26, cy = hy - 8;
    if (expr === 'laugh') { ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy + 6, 11, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); continue; }
    blob(ctx, '#ffffff', () => ctx.arc(cx, cy, expr === 'shocked' ? 18 : 14, 0, TAU));
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 5, expr === 'shocked' ? 5 : 10, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#f2a7b8'; ctx.beginPath(); ctx.moveTo(-7, hy + 10); ctx.lineTo(7, hy + 10); ctx.lineTo(0, hy + 18); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, hy + 18); ctx.quadraticCurveTo(-10, hy + 30, -18, hy + 24); ctx.moveTo(0, hy + 18); ctx.quadraticCurveTo(10, hy + 30, 18, hy + 24); ctx.stroke();
  for (const sd of [-1, 1]) for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 40, hy + 14 + k * 6); ctx.lineTo(sd * 80, hy + 8 + k * 14); ctx.stroke(); }
  ctx.restore();
}
