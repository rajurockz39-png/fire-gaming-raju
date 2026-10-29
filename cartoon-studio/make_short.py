#!/usr/bin/env python3
"""
Fire Cartoon Studio - "Robot Drop" action short (no voices, only action + SFX).

Renders a 13 second vertical (1080x1920, 30fps) cartoon video for
YouTube Shorts / Instagram Reels, with synthesized music and sound effects.

Usage:
    python3 make_short.py                 # writes robot_drop_short.mp4
    python3 make_short.py -o my_video.mp4

Requires: Python 3, Pillow, numpy, ffmpeg.
"""
import argparse
import math
import os
import random
import subprocess
import tempfile
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
FPS = 30
DURATION = 13.0
SR = 44100
GROUND = 1480
INK = (25, 20, 35)

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size):
    try:
        return ImageFont.truetype(FONT_PATH, size)
    except OSError:
        return ImageFont.load_default()


# ---------------------------------------------------------------- helpers
def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def lerp(a, b, k):
    return a + (b - a) * k


def prog(t, t0, t1):
    """0..1 progress of t inside [t0, t1]."""
    return clamp((t - t0) / (t1 - t0))


def ease_out(k):
    return 1 - (1 - k) ** 3


def ease_in(k):
    return k ** 3


def ease_back(k):
    c = 1.70158
    return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2


def ell(d, cx, cy, rx, ry, fill, outline=INK, width=8):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill, outline=outline, width=width)


def star_points(cx, cy, r_out, r_in, n=5, rot=0.0):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = rot + math.pi * i / n - math.pi / 2
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def outlined_text(d, xy, text, size, fill, outline=INK, stroke=10, anchor="mm"):
    d.text(xy, text, font=font(size), fill=fill, anchor=anchor,
           stroke_width=stroke, stroke_fill=outline)


# ---------------------------------------------------------------- background
def make_background():
    bg = Image.new("RGB", (W, H))
    px = bg.load()
    top, mid, bot = (60, 40, 120), (255, 120, 90), (255, 200, 120)
    for y in range(GROUND):
        k = y / GROUND
        if k < 0.6:
            c = tuple(int(lerp(top[i], mid[i], k / 0.6)) for i in range(3))
        else:
            c = tuple(int(lerp(mid[i], bot[i], (k - 0.6) / 0.4)) for i in range(3))
        for x in range(W):
            px[x, y] = c
    d = ImageDraw.Draw(bg)
    # sun
    d.ellipse([620, 760, 920, 1060], fill=(255, 230, 140))
    # far buildings
    rnd = random.Random(7)
    x = -20
    while x < W:
        bw = rnd.randint(90, 170)
        bh = rnd.randint(250, 520)
        d.rectangle([x, GROUND - bh, x + bw, GROUND], fill=(120, 60, 120))
        x += bw + rnd.randint(0, 20)
    # near buildings with windows
    x = -40
    while x < W:
        bw = rnd.randint(140, 220)
        bh = rnd.randint(160, 360)
        d.rectangle([x, GROUND - bh, x + bw, GROUND], fill=(70, 35, 85))
        for wy in range(GROUND - bh + 30, GROUND - 40, 60):
            for wx in range(x + 20, x + bw - 30, 50):
                if rnd.random() < 0.55:
                    d.rectangle([wx, wy, wx + 22, wy + 30], fill=(255, 210, 110))
        x += bw + rnd.randint(10, 40)
    # ground
    d.rectangle([0, GROUND, W, H], fill=(70, 160, 90))
    d.rectangle([0, GROUND, W, GROUND + 14], fill=INK)
    d.rectangle([0, GROUND + 120, W, H], fill=(60, 60, 70))
    for sx in range(0, W, 160):
        d.rectangle([sx, GROUND + 230, sx + 90, GROUND + 250], fill=(240, 220, 120))
    return bg


def draw_clouds(d, t):
    for i, (y, sp, s) in enumerate([(300, 25, 1.0), (520, 15, 0.7), (180, 35, 0.8)]):
        cx = (i * 420 + t * sp) % (W + 400) - 200
        for ox, oy, r in [(-70, 10, 55), (0, -15, 75), (75, 10, 55)]:
            d.ellipse([cx + ox * s - r * s, y + oy * s - r * s,
                       cx + ox * s + r * s, y + oy * s + r * s], fill=(255, 235, 230))


# ---------------------------------------------------------------- characters
def draw_hero(d, x, y, t, facing=1, squash=1.0, mood="happy", walk=0.0,
              punch=0.0, arms_up=0.0):
    """Orange cat hero. (x, y) = feet centre on ground."""
    s = 1.0
    bw, bh = 120 * s / squash ** 0.5, 135 * s * squash
    cy = y - 60 - bh
    f = facing
    # legs / feet
    for side in (-1, 1):
        sw = math.sin(walk * math.pi * 2 + (0 if side < 0 else math.pi)) * 30
        fx = x + side * 45 + sw * f
        d.line([x + side * 40, y - 70, fx, y - 20], fill=INK, width=14)
        ell(d, fx + 12 * f, y - 18, 38, 20, (230, 90, 40))
    # back arm
    ax, ay = x - 95 * f, cy + 40
    hx = ax - 40 * f + arms_up * 20 * f
    hy = ay + 60 - arms_up * 170
    d.line([ax, ay, hx, hy], fill=INK, width=14)
    ell(d, hx, hy, 26, 26, (255, 150, 60))
    # tail
    tx = x - 120 * f
    wag = math.sin(t * 6) * 25
    d.line([x - 80 * f, cy + 90, tx, cy + 20 + wag, tx - 30 * f, cy - 30 + wag],
           fill=INK, width=22, joint="curve")
    d.line([x - 80 * f, cy + 90, tx, cy + 20 + wag, tx - 30 * f, cy - 30 + wag],
           fill=(255, 140, 50), width=10, joint="curve")
    # body
    ell(d, x, cy + 30, bw, bh, (255, 140, 50))
    ell(d, x + 10 * f, cy + 70, bw * 0.55, bh * 0.5, (255, 220, 170), outline=None)
    # ears
    for side in (-1, 1):
        ex = x + side * 60
        d.polygon([(ex - 35, cy - 70), (ex + 35, cy - 70), (ex + side * 25, cy - 165)],
                  fill=(255, 140, 50), outline=INK, width=8)
        d.polygon([(ex - 15, cy - 80), (ex + 15, cy - 80), (ex + side * 18, cy - 135)],
                  fill=(255, 170, 170))
    # head (merged with body top)
    ell(d, x, cy - 40, 115, 95, (255, 140, 50))
    # scarf
    d.polygon([(x - 100, cy + 25), (x + 100, cy + 25), (x + 90, cy + 60), (x - 90, cy + 60)],
              fill=(220, 30, 50), outline=INK, width=6)
    flap = math.sin(t * 10) * 15
    d.polygon([(x - 70 * f, cy + 40), (x - 170 * f, cy + 20 + flap),
               (x - 160 * f, cy + 75 + flap), (x - 60 * f, cy + 60)],
              fill=(220, 30, 50), outline=INK, width=6)
    # eyes
    blink = (t % 3.1) < 0.1 and mood == "happy"
    eye_r = 40 if mood == "shock" else 32
    for side in (-1, 1):
        ex = x + side * 42 + 15 * f
        ey = cy - 50
        if blink:
            d.line([ex - 25, ey, ex + 25, ey], fill=INK, width=8)
            continue
        ell(d, ex, ey, eye_r * 0.8, eye_r, (255, 255, 255), width=6)
        pr = 10 if mood == "shock" else 15
        ell(d, ex + 10 * f, ey + 5, pr, pr * 1.3, INK, outline=None)
        ell(d, ex + 10 * f - 5, ey - 4, 5, 5, (255, 255, 255), outline=None)
        if mood == "angry":
            d.line([ex - 32, ey - 48 - side * f * 12, ex + 32, ey - 48 + side * f * 12],
                   fill=INK, width=12)
    # mouth
    mx, my = x + 20 * f, cy + 5
    if mood == "happy":
        d.arc([mx - 30, my - 25, mx + 30, my + 15], 20, 160, fill=INK, width=7)
    elif mood == "shock":
        ell(d, mx, my + 2, 16, 22, (120, 20, 30), width=6)
    else:
        d.line([mx - 25, my + 5, mx + 25, my - 2], fill=INK, width=8)
    # whiskers
    for side in (-1, 1):
        for k in (-1, 1):
            d.line([x + side * 70 + 15 * f, cy - 5 + k * 8,
                    x + side * 130 + 15 * f, cy - 15 + k * 18], fill=INK, width=4)
    # front arm (punch extends it)
    ax, ay = x + 85 * f, cy + 45
    reach = 60 + punch * 170
    hx = ax + reach * f * (0.4 + 0.6 * punch) + (1 - punch) * 0
    hy = ay + 55 * (1 - punch) - arms_up * 220 * (1 - punch)
    d.line([ax, ay, hx, hy], fill=INK, width=16)
    r = 30 + punch * 18
    ell(d, hx, hy, r, r, (255, 150, 60))


def draw_robot(d, x, y, t, angle=0.0, scale=1.0, eye_glow=0.0, squash=1.0, arms_up=0.0):
    """Purple robot villain. (x, y) = feet centre. angle in radians (spin)."""
    def P(px, py):
        # local coords (origin at body centre) -> rotate/scale -> world
        px *= scale
        py *= scale * squash
        ca, sa = math.cos(angle), math.sin(angle)
        return (cx + px * ca - py * sa, cy + px * sa + py * ca)

    cx, cy = x, y - 200 * scale * squash

    def rect(x0, y0, x1, y1, fill, width=8):
        d.polygon([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], fill=fill,
                  outline=INK, width=width)

    def circ(px, py, r, fill, outline=INK, width=8):
        c = P(px, py)
        rr = r * scale
        d.ellipse([c[0] - rr, c[1] - rr, c[0] + rr, c[1] + rr], fill=fill,
                  outline=outline, width=width)

    # legs
    rect(-90, 90, -40, 200, (90, 80, 110))
    rect(40, 90, 90, 200, (90, 80, 110))
    rect(-110, 180, -20, 210, (60, 50, 80))
    rect(20, 180, 110, 210, (60, 50, 80))
    # arms
    lift = arms_up * 120
    rect(-190, -60 - lift, -130, 70 - lift, (130, 70, 180))
    rect(130, -60 - lift, 190, 70 - lift, (130, 70, 180))
    circ(-160, 85 - lift, 38, (90, 80, 110))
    circ(160, 85 - lift, 38, (90, 80, 110))
    # body
    rect(-130, -90, 130, 110, (150, 80, 200))
    rect(-70, -20, 70, 70, (100, 50, 150), width=6)
    for i in range(3):
        on = int(t * 6 + i) % 3 == 0
        circ(-40 + i * 40, 25, 13, (255, 230, 80) if on else (80, 60, 90), width=4)
    # head
    rect(-100, -250, 100, -90, (170, 100, 220))
    # antenna
    a0, a1 = P(0, -250), P(0, -320)
    d.line([a0, a1], fill=INK, width=10)
    circ(0, -330, 22, (255, 60, 60))
    # eye
    g = int(eye_glow * 120)
    circ(0, -170, 50, (255, 255, 255))
    circ(0, -170, 32, (255, 40 + g, 40 + g // 2), outline=None)
    if eye_glow > 0.2:
        c = P(0, -170)
        rr = 50 * scale + eye_glow * 40
        d.ellipse([c[0] - rr, c[1] - rr, c[0] + rr, c[1] + rr],
                  outline=(255, 80, 80), width=6)
    # angry brow
    d.line([P(-75, -235), P(60, -215)], fill=INK, width=12)


# ---------------------------------------------------------------- effects
def burst(d, cx, cy, r, color, n=14, rot=0.0):
    pts = []
    for i in range(n * 2):
        rr = r if i % 2 == 0 else r * 0.6
        a = rot + math.pi * i / n
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=color, outline=INK, width=10)


def speed_lines(d, t, y0, y1, direction=1):
    rnd = random.Random(int(t * 30))
    for _ in range(18):
        y = rnd.randint(y0, y1)
        x = rnd.randint(-200, W)
        ln = rnd.randint(150, 400)
        d.line([x, y, x - ln * direction, y], fill=(255, 255, 255), width=rnd.randint(4, 10))


def dust(d, cx, gy, k, seed=1):
    rnd = random.Random(seed)
    for _ in range(14):
        ang = rnd.uniform(math.pi, 2 * math.pi)
        sp = rnd.uniform(150, 420)
        r = rnd.uniform(30, 70) * (1 - k * 0.7)
        px = cx + math.cos(ang) * sp * ease_out(k) * 1.6
        py = gy + math.sin(ang) * sp * ease_out(k) * 0.5
        c = int(lerp(230, 180, k))
        d.ellipse([px - r, py - r, px + r, py + r], fill=(c, c - 20, c - 40))


# ---------------------------------------------------------------- one frame
def render_frame(t, bg):
    img = bg.copy()
    d = ImageDraw.Draw(img)
    draw_clouds(d, t)

    shake = 0.0
    zoom, zc = 1.0, (W / 2, H / 2)
    flash = 0.0

    # ---- hero position / state
    hero_x, hero_y = 350.0, float(GROUND)
    mood, walk, punch, arms_up, h_squash = "happy", 0.0, 0.0, 0.0, 1.0

    if t < 3.0:
        k = prog(t, 0, 3.0)
        hero_x = lerp(-180, 350, k)
        walk = t * 2.0
        hero_y -= abs(math.sin(t * 2 * math.pi * 2)) * 12
    elif t < 4.9:
        mood = "shock" if t > 3.35 else "happy"
        if 3.35 < t < 3.75:  # startled hop
            k = prog(t, 3.35, 3.75)
            hero_y -= math.sin(k * math.pi) * 90
    elif t < 5.8:  # jump over laser
        mood = "shock"
        k = prog(t, 4.9, 5.8)
        hero_y -= math.sin(k * math.pi) * 430
        h_squash = 1.15 if k < 0.5 else 0.95
    elif t < 6.2:
        mood = "angry"
        k = prog(t, 5.8, 5.95)
        h_squash = lerp(0.8, 1.0, k)
    elif t < 6.8:  # dash
        mood = "angry"
        k = ease_in(prog(t, 6.2, 6.8))
        hero_x = lerp(350, 600, k)
        walk = t * 6
        punch = prog(t, 6.55, 6.8)
    elif t < 8.8:
        mood = "angry" if t < 7.6 else "happy"
        hero_x = 600
        punch = 1.0 if t < 7.4 else 1 - prog(t, 7.4, 7.7)
    else:  # victory
        hero_x = lerp(600, 540, prog(t, 8.8, 9.3))
        k = (t - 8.8) % 0.7 / 0.7
        hero_y -= math.sin(k * math.pi) * 160 if t < 10.9 else 0
        arms_up = 1.0
        mood = "happy"

    # ---- robot state
    rob_x, rob_y, rob_ang, rob_scale, glow, r_squash, r_arms = 820.0, float(GROUND), 0.0, 1.0, 0.0, 1.0, 0.0
    rob_visible = t >= 2.4

    if 2.4 <= t < 3.2:  # falling with shadow
        k = prog(t, 2.4, 3.2)
        rob_y = lerp(-500, GROUND, ease_in(k))
        sh = 40 + 120 * k
        d.ellipse([rob_x - sh, GROUND + 10 - sh * 0.15, rob_x + sh, GROUND + 10 + sh * 0.15],
                  fill=(40, 90, 50))
    elif 3.2 <= t < 3.6:
        k = prog(t, 3.2, 3.6)
        r_squash = lerp(0.6, 1.0, ease_back(k))
    if 3.2 <= t < 4.0:
        shake = 28 * (1 - prog(t, 3.2, 4.0))
        dust(d, rob_x, GROUND, prog(t, 3.2, 4.0), seed=3)
    if 4.0 <= t < 5.4:  # charge laser
        glow = prog(t, 4.0, 4.9)
        r_arms = ease_out(prog(t, 4.0, 4.4))
    if 6.2 <= t < 6.8:
        glow = 0.3
    if t >= 6.8:  # knocked away
        k = prog(t, 6.8, 8.8)
        kk = ease_out(prog(t, 7.3, 8.8))
        rob_x = lerp(820, 1000, kk) + (0 if t < 7.3 else 0)
        rob_y = lerp(GROUND, 260, kk)
        rob_ang = kk * math.pi * 6
        rob_scale = lerp(1.0, 0.05, kk)
        if t < 7.3:  # slow-mo stretch on impact
            rob_x = 820 + prog(t, 6.8, 7.3) * 30
            rob_ang = -0.3 * prog(t, 6.8, 7.3)
        rob_visible = t < 8.75

    # laser beam
    if 4.95 <= t < 5.45:
        k = prog(t, 4.95, 5.45)
        ex, ey = rob_x - 10, GROUND - 200 - 170
        beam_y = GROUND - 120
        wob = math.sin(t * 80) * 8
        d.polygon([(ex, ey - 20), (ex, ey + 20), (-50, beam_y + 30 + wob), (-50, beam_y - 30 + wob)],
                  fill=(255, 60, 60))
        d.polygon([(ex, ey - 8), (ex, ey + 8), (-50, beam_y + 10 + wob), (-50, beam_y - 10 + wob)],
                  fill=(255, 240, 240))
        burst(d, ex, ey, 70 + 15 * math.sin(t * 60), (255, 120, 120), n=10, rot=t * 8)
        shake = max(shake, 8)

    # draw characters (robot behind hero when flying)
    if rob_visible:
        draw_robot(d, rob_x, rob_y, t, angle=rob_ang, scale=rob_scale, eye_glow=glow,
                   squash=r_squash, arms_up=r_arms)
    if 6.2 <= t < 6.8:
        speed_lines(d, t, GROUND - 450, GROUND - 50, direction=1)
    draw_hero(d, hero_x, hero_y, t, squash=h_squash, mood=mood, walk=walk,
              punch=punch, arms_up=arms_up)

    # ---- comic texts & fx
    if 3.2 <= t < 4.2:
        k = prog(t, 3.2, 3.5)
        sz = int(lerp(40, 190, ease_back(k)))
        outlined_text(d, (W / 2, 560), "BOOM!", sz, (255, 220, 60), stroke=12)
    if 3.4 <= t < 4.6:
        bob = math.sin(t * 20) * 10
        outlined_text(d, (hero_x, GROUND - 560 + bob), "!", 170, (255, 60, 60), stroke=10)
    if 4.95 <= t < 5.45:
        outlined_text(d, (W / 2, 520), "ZAP!", 170, (120, 230, 255), stroke=12)
    if 6.8 <= t < 7.6:
        k = prog(t, 6.8, 7.0)
        burst(d, 720, GROUND - 280, lerp(80, 330, ease_back(k)), (255, 230, 50), n=12, rot=0.2)
        outlined_text(d, (720, GROUND - 280), "POW!", int(lerp(50, 170, ease_back(k))),
                      (230, 30, 50), stroke=10)
        flash = 1 - prog(t, 6.8, 6.92)
        shake = max(shake, 30 * (1 - prog(t, 6.8, 7.6)))
        zoom = 1 + 0.25 * (1 - ease_out(prog(t, 6.8, 7.6)))
        zc = (700, GROUND - 300)
    if 8.75 <= t < 9.6:  # twinkle where robot vanished
        k = prog(t, 8.75, 9.6)
        r = math.sin(k * math.pi) * 70
        d.polygon(star_points(1000, 260, r, r * 0.35, n=4, rot=t * 3), fill=(255, 255, 255))
    if t >= 8.9:  # confetti / stars
        rnd = random.Random(11)
        for i in range(40):
            sx = rnd.uniform(0, W)
            sp = rnd.uniform(250, 520)
            sy = -50 + ((t - 8.9) * sp + rnd.uniform(0, 600)) % (H + 100)
            col = rnd.choice([(255, 220, 60), (255, 90, 120), (120, 220, 255), (150, 255, 140)])
            sr = rnd.uniform(14, 26)
            d.polygon(star_points(sx, sy, sr, sr * 0.45, rot=t * rnd.uniform(1, 4)), fill=col)
    if 9.2 <= t < 11.0:
        k = prog(t, 9.2, 9.6)
        outlined_text(d, (W / 2, 520), "YEAH!", int(lerp(40, 180, ease_back(k))),
                      (150, 255, 120), stroke=12)

    # ---- end card
    if t >= 11.0:
        k = ease_out(prog(t, 11.0, 11.5))
        ov = Image.new("RGB", (W, H), (20, 10, 40))
        img = Image.blend(img, ov, 0.75 * k)
        d = ImageDraw.Draw(img)
        y = lerp(-200, 700, k)
        outlined_text(d, (W / 2, y), "FIRE", 200, (255, 140, 50), stroke=14)
        outlined_text(d, (W / 2, y + 210), "CARTOONS", 140, (255, 220, 60), stroke=12)
        k2 = ease_back(prog(t, 11.6, 12.0))
        if k2 > 0:
            bw, bh = 340 * k2, 70 * k2
            by = 1300
            pulse = 1 + 0.05 * math.sin(t * 10)
            d.rounded_rectangle([W / 2 - bw * pulse, by - bh * pulse, W / 2 + bw * pulse, by + bh * pulse],
                                radius=30, fill=(230, 20, 30), outline=(255, 255, 255), width=8)
            if k2 > 0.5:
                outlined_text(d, (W / 2, by), "SUBSCRIBE", int(90 * k2), (255, 255, 255),
                              stroke=4)
        if t > 12.0:
            outlined_text(d, (W / 2, 1560), "Next episode soon...", 60, (255, 255, 255), stroke=5)

    # ---- camera: zoom, shake, flash, fade in
    if zoom > 1.001:
        cw, ch = W / zoom, H / zoom
        x0 = clamp(zc[0] - cw / 2, 0, W - cw)
        y0 = clamp(zc[1] - ch / 2, 0, H - ch)
        img = img.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, H), Image.BILINEAR)
    if shake > 0.5:
        rnd = random.Random(int(t * 1000))
        dx, dy = rnd.uniform(-shake, shake), rnd.uniform(-shake, shake)
        shaken = Image.new("RGB", (W, H), INK)
        shaken.paste(img, (int(dx), int(dy)))
        img = shaken
    if flash > 0:
        img = Image.blend(img, Image.new("RGB", (W, H), (255, 255, 255)), flash * 0.85)
    if t < 0.4:
        img = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), img, t / 0.4)
    return img


# ---------------------------------------------------------------- audio
def make_audio(path):
    n = int(SR * DURATION)
    out = np.zeros(n)
    rng = np.random.default_rng(5)

    def add(sig, at, gain=1.0):
        i = int(at * SR)
        j = min(n, i + len(sig))
        if i < n:
            out[i:j] += sig[: j - i] * gain

    def tt(sec):
        return np.arange(int(sec * SR)) / SR

    def env(x, attack=0.005, decay=0.2):
        e = np.minimum(1, x / attack) * np.exp(-x / decay)
        return e

    def lowpass(sig, a):
        y = np.zeros_like(sig)
        acc = 0.0
        for i, v in enumerate(sig):
            acc += a * (v - acc)
            y[i] = acc
        return y

    # --- music: 120 bpm groove, quiet under the action
    bpm, beat = 120, 0.5
    notes = [55, 55, 65.4, 49]  # A, A, C, G bass
    for b in range(int(11.0 / beat)):
        at = b * beat
        x = tt(0.25)
        kick = np.sin(2 * np.pi * (50 + 120 * np.exp(-x * 30)) * x) * env(x, 0.002, 0.08)
        add(kick, at, 0.5)
        hat = rng.uniform(-1, 1, int(0.04 * SR)) * env(tt(0.04), 0.001, 0.01)
        add(hat, at + beat / 2, 0.12)
        f = notes[(b // 4) % 4]
        bx = tt(0.45)
        bass = np.sign(np.sin(2 * np.pi * f * bx)) * env(bx, 0.01, 0.2)
        add(bass, at, 0.08)
    # victory jingle
    for i, f in enumerate([523, 659, 784, 1046, 784, 1046]):
        x = tt(0.3)
        tone = (np.sin(2 * np.pi * f * x) + 0.4 * np.sin(4 * np.pi * f * x)) * env(x, 0.005, 0.15)
        add(tone, 9.0 + i * 0.15, 0.3)
    # end card chord
    x = tt(2.0)
    chord = sum(np.sin(2 * np.pi * f * x) for f in (261.6, 329.6, 392.0, 523.2)) * env(x, 0.05, 0.8)
    add(chord, 11.0, 0.15)

    # --- footsteps while walking
    for k in range(12):
        x = tt(0.08)
        step = rng.uniform(-1, 1, len(x)) * env(x, 0.001, 0.015) + np.sin(2 * np.pi * 120 * x) * env(x, 0.001, 0.03)
        add(step, 0.1 + k * 0.25, 0.25)

    # --- falling whistle
    x = tt(0.8)
    freq = np.linspace(1800, 400, len(x))
    whistle = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.linspace(0.2, 1, len(x))
    add(whistle, 2.4, 0.18)

    # --- BOOM landing
    x = tt(1.2)
    boom = np.sin(2 * np.pi * (40 + 80 * np.exp(-x * 8)) * x) * env(x, 0.002, 0.4)
    noise = lowpass(rng.uniform(-1, 1, len(x)), 0.08) * env(x, 0.002, 0.3) * 3
    add(boom + noise, 3.2, 0.9)

    # --- surprise "boing"
    x = tt(0.35)
    boing = np.sin(2 * np.pi * np.cumsum(300 + 200 * np.sin(x * 40)) / SR) * env(x, 0.005, 0.12)
    add(boing, 3.35, 0.3)

    # --- laser charge (rising) and zap
    x = tt(0.9)
    charge = np.sin(2 * np.pi * np.cumsum(np.linspace(200, 1200, len(x))) / SR) * np.linspace(0, 1, len(x))
    add(charge, 4.0, 0.12)
    x = tt(0.5)
    zap = np.sign(np.sin(2 * np.pi * np.cumsum(900 + 400 * np.sin(x * 90)) / SR)) * env(x, 0.002, 0.3)
    add(zap, 4.95, 0.18)

    # --- jump swoosh & dash whoosh
    for at, dur, g in [(4.9, 0.4, 0.35), (6.2, 0.6, 0.5)]:
        x = tt(dur)
        wn = rng.uniform(-1, 1, len(x))
        sweep = lowpass(wn, 0.15) * np.sin(np.pi * x / dur) * 2.5
        add(sweep, at, g)

    # --- POW punch
    x = tt(0.6)
    thump = np.sin(2 * np.pi * (60 + 200 * np.exp(-x * 25)) * x) * env(x, 0.001, 0.15)
    crack = rng.uniform(-1, 1, len(x)) * env(x, 0.0005, 0.03)
    add(thump + crack, 6.8, 1.0)

    # --- fly away whistle (rising) & twinkle
    x = tt(1.4)
    up = np.sin(2 * np.pi * np.cumsum(np.linspace(300, 1500, len(x))) / SR) * np.linspace(1, 0.2, len(x))
    add(up, 7.3, 0.15)
    for i, f in enumerate([1568, 2093, 2637]):
        x = tt(0.4)
        add(np.sin(2 * np.pi * f * x) * env(x, 0.002, 0.12), 8.75 + i * 0.07, 0.25)

    # --- victory hops
    for k in range(3):
        x = tt(0.2)
        hop = np.sin(2 * np.pi * np.cumsum(np.linspace(300, 700, len(x))) / SR) * env(x, 0.005, 0.08)
        add(hop, 8.8 + k * 0.7, 0.25)

    # --- subscribe "pop"
    x = tt(0.15)
    add(np.sin(2 * np.pi * np.cumsum(np.linspace(400, 1200, len(x))) / SR) * env(x, 0.002, 0.05), 11.6, 0.4)

    out /= max(1e-9, np.max(np.abs(out))) / 0.9
    pcm = (out * 32767).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--output", default="robot_drop_short.mp4")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "audio.wav")
        print("Making sound effects + music...")
        make_audio(wav)

        print("Rendering frames...")
        bg = make_background()
        cmd = ["ffmpeg", "-y", "-loglevel", "error",
               "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
               "-i", wav,
               "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
               args.output]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        total = int(DURATION * FPS)
        for i in range(total):
            frame = render_frame(i / FPS, bg)
            ff.stdin.write(frame.tobytes())
            if i % 60 == 0:
                print(f"  frame {i}/{total}")
        ff.stdin.close()
        ff.wait()
    print("Done ->", args.output)


if __name__ == "__main__":
    main()
