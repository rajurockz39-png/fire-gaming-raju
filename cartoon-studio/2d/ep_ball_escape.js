// "Can the ball escape?" – neon physics Short. Balls bounce inside rotating rings;
// a ball that slips through a ring's gap shatters it and a new ball is born.
// Every bounce plays the next note of a melody (sounds are made from EVENTS later).
import { endCard, preload as basePreload, rand } from './duck_story.js';

export const W = 1080, H = 1920;
export const preload = basePreload;
const CX = 540, CY = 960, BALL_R = 16, DT = 1 / 240, GRAVITY = 900;
const RINGS = 16, R0 = 110, DR = 24, THICK = 8, GAP = 0.34;
export const EVENTS = [];               // {t, type: 'bounce' | 'break' | 'end', ring, hue}
globalThis.EVENTS = EVENTS;

let S = null;
function reset() {
  const R = rand(7);
  S = {
    t: 0, rnd: R, shake: 0, endAt: null,
    rings: Array.from({ length: RINGS }, (_, i) => ({
      r: R0 + i * DR, ang: R() * Math.PI * 2, spin: (0.7 + R() * 0.9) * (i % 2 ? -1 : 1),
      hue: (i * 360 / RINGS + 200) % 360, alive: true, broke: -1,
    })),
    balls: [newBall(R, 0)],
    shards: [],
  };
  EVENTS.length = 0;
}
function newBall(R, hue) {
  const a = R() * Math.PI * 2, sp = 650 + R() * 250;
  return { x: CX, y: CY - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hue, trail: [] };
}
const inner = () => S.rings.find((r) => r.alive);

function step() {
  S.t += DT;
  for (const ring of S.rings) ring.ang += ring.spin * DT;
  const ring = inner();
  for (const b of S.balls) {
    b.vy += GRAVITY * DT;
    b.x += b.vx * DT; b.y += b.vy * DT;
    if (!ring) continue;
    const dx = b.x - CX, dy = b.y - CY, d = Math.hypot(dx, dy);
    const wall = ring.r - THICK / 2 - BALL_R;
    if (d > wall) {
      // inside the gap? (angle measured relative to the ring's rotation)
      let rel = (Math.atan2(dy, dx) - ring.ang) % (Math.PI * 2);
      if (rel < 0) rel += Math.PI * 2;
      const inGap = rel < GAP;
      if (inGap) {
        if (d > ring.r + THICK / 2 + BALL_R) breakRing(ring, b);
        continue;
      }
      const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
      if (vn > 0) {
        b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny;
        // tiny kick so motion never settles into a loop; keep energy up
        const sp = Math.hypot(b.vx, b.vy), want = Math.max(sp * 1.01, 700);
        const k = 0.06 * (S.rnd() - 0.5);
        const c = Math.cos(k), s = Math.sin(k);
        [b.vx, b.vy] = [(b.vx * c - b.vy * s) * want / sp, (b.vx * s + b.vy * c) * want / sp];
        const last = EVENTS.length ? EVENTS[EVENTS.length - 1].t : -1;
        if (S.t - last > 0.05) EVENTS.push({ t: S.t, type: 'bounce', ring: S.rings.indexOf(ring), hue: ring.hue });
        ring.flash = 1;
      }
      b.x = CX + nx * Math.min(d, wall); b.y = CY + ny * Math.min(d, wall);
    }
  }
  for (const sh of S.shards) { sh.vy += GRAVITY * DT; sh.x += sh.vx * DT; sh.y += sh.vy * DT; sh.rot += sh.vr * DT; sh.life -= DT; }
  S.shards = S.shards.filter((s) => s.life > 0);
  for (const r of S.rings) if (r.flash) r.flash = Math.max(0, r.flash - DT * 4);
  S.shake = Math.max(0, S.shake - DT * 3);
}

function breakRing(ring, ball) {
  if (!ring.alive) return;
  ring.alive = false; ring.broke = S.t;
  S.shake = 1;
  EVENTS.push({ t: S.t, type: 'break', ring: S.rings.indexOf(ring), hue: ring.hue });
  for (let i = 0; i < 46; i++) {
    const a = ring.ang + GAP + (i / 46) * (Math.PI * 2 - GAP), sp = 250 + S.rnd() * 500;
    S.shards.push({ x: CX + Math.cos(a) * ring.r, y: CY + Math.sin(a) * ring.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200,
      rot: a, vr: (S.rnd() - 0.5) * 12, life: 1.6 + S.rnd(), hue: ring.hue });
  }
  ball.hue = ring.hue;
  if (inner()) S.balls.push(newBall(S.rnd, ring.hue));
  else { S.endAt = S.t; EVENTS.push({ t: S.t, type: 'end' }); }
}

// run the simulation once up front to know how long the video is
reset();
while (inner() && S.t < 60) step();
export const DURATION = Math.min(60, (S.endAt ?? S.t) + 4.5);
const FINAL_EVENTS = EVENTS.slice();
globalThis.EVENTS = FINAL_EVENTS;
reset();

// ------------------------------------------------------------------ drawing
function glowArc(ctx, r, a0, a1, hue, width, glow) {
  ctx.strokeStyle = `hsl(${hue},100%,62%)`; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.shadowColor = `hsl(${hue},100%,55%)`; ctx.shadowBlur = glow;
  ctx.beginPath(); ctx.arc(CX, CY, r, a0, a1); ctx.stroke();
  ctx.shadowBlur = 0;
}

function text(ctx, s, x, y, size, fill, glow = '#ff2bd6') {
  ctx.font = `600 ${size}px Fredoka`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = glow; ctx.shadowBlur = 30; ctx.fillStyle = fill; ctx.fillText(s, x, y); ctx.shadowBlur = 0;
}

export function drawFrame(ctx, t) {
  if (!S || t < S.t - 1e-6) reset();
  while (S.t < t && (inner() || S.t < t)) step();
  // keep EVENTS complete for the soundtrack even if rendering stops early
  globalThis.EVENTS = FINAL_EVENTS;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const bg = ctx.createRadialGradient(CX, CY, 50, CX, CY, 1300);
  bg.addColorStop(0, '#140a2a'); bg.addColorStop(1, '#020107');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const sh = S.shake * 14;
  ctx.translate((S.rnd() - 0.5) * sh, (S.rnd() - 0.5) * sh);

  // rings
  for (const r of S.rings) {
    if (!r.alive) continue;
    glowArc(ctx, r.r, r.ang + GAP, r.ang + Math.PI * 2, r.hue, THICK + (r.flash || 0) * 6, 18 + (r.flash || 0) * 30);
  }
  // shards
  for (const s of S.shards) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.globalAlpha = Math.min(1, s.life);
    ctx.fillStyle = `hsl(${s.hue},100%,65%)`; ctx.shadowColor = `hsl(${s.hue},100%,55%)`; ctx.shadowBlur = 16;
    ctx.fillRect(-9, -3, 18, 6); ctx.restore();
  }
  ctx.globalAlpha = 1;
  // balls with glowing trails
  for (const b of S.balls) {
    b.trail.push([b.x, b.y]); if (b.trail.length > 16) b.trail.shift();
    b.trail.forEach(([x, y], i) => {
      const k = i / b.trail.length;
      ctx.fillStyle = `hsla(${b.hue},100%,70%,${k * 0.5})`;
      ctx.beginPath(); ctx.arc(x, y, BALL_R * k, 0, Math.PI * 2); ctx.fill();
    });
    const g = ctx.createRadialGradient(b.x - 5, b.y - 6, 2, b.x, b.y, BALL_R);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, `hsl(${b.hue},100%,60%)`);
    ctx.fillStyle = g; ctx.shadowColor = `hsl(${b.hue},100%,60%)`; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // HUD
  const left = S.rings.filter((r) => r.alive).length;
  text(ctx, 'Can the ball escape?', W / 2, 230, 92, '#ffffff');
  text(ctx, `Rings left: ${left}`, W / 2, 1600, 70, '#9ef6ff', '#00c8ff');
  text(ctx, `Balls: ${S.balls.length}`, W / 2, 1700, 56, '#ffd6fb');
  if (S.endAt !== null && t > S.endAt) {
    const k = Math.min(1, (t - S.endAt) / 0.4);
    ctx.save(); ctx.translate(W / 2, CY); ctx.scale(0.5 + k * 0.5, 0.5 + k * 0.5);
    text(ctx, 'ESCAPED!', 0, 0, 170, '#fff36b', '#ff8a00');
    ctx.restore();
    if (t > S.endAt + 2.2) endCard(ctx, t - S.endAt - 2.2, t);
  }
  const fade = Math.max(0, 1 - t / 0.4, (t - (DURATION - 0.5)) / 0.5);
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; ctx.fillRect(0, 0, W, H); }
}
