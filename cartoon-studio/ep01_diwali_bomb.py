#!/usr/bin/env python3
"""
Naa Idea - EP-1 "దీపావళి బాంబు" (Diwali Bomb). 38 s, no voices, action only.

Story (told only through action, sound effects and symbols):
  Bujji plans to scare sleeping Peddayya with a big Diwali bomb. He lights it under
  the chair and hides behind the neem tree... but Kodi King the rooster carries the
  bomb right back to Bujji. BOOM! Sooty Bujji. Peddayya laughs, then they light a
  flowerpot cracker together. Kodi King struts past in sunglasses.

Usage:  python3 ep01_diwali_bomb.py [-o ep01_diwali_bomb.mp4]
"""
import argparse
import math
import random

import numpy as np
from PIL import Image, ImageDraw

from engine import (CHANNEL_HANDLE, CHANNEL_TE, H, INK, SR, W, Track, boom, bubble, burst,
                    camera, clamp, drum, dust_puffs, ease_back, ease_in, ease_io, ease_out,
                    env, fade_black, firework_sfx, flash, flute, highpass, lerp, lowpass, mix,
                    note_hz, pluck, pop, prog, render, shake, speed_lines, star_points, sweep,
                    text, tt, watermark)
from characters import (draw_bomb, draw_bujji, draw_chair, draw_flowerpot, draw_kodi,
                        draw_peddayya)

DURATION = 38.5
GROUND = 1420
CHAIR_X = 420
BOMB_X = CHAIR_X - 40   # bomb under the chair
BEAK = 116               # kodi x -> hanging bomb x
TREE_X = 885
HIDE_X = 960         # where Bujji hides behind the tree
DROP_X = 905         # where Kodi drops the bomb
BOOM_T = 23.0

# sky fireworks: (launch time, burst time, x, y, colour)
FIREWORKS = [(0.0, 0.7, 760, 420, (255, 90, 120)), (0.8, 1.6, 300, 330, (120, 220, 255)),
             (1.7, 2.5, 620, 260, (255, 220, 80)), (5.0, 5.8, 180, 520, (160, 255, 140)),
             (9.6, 10.4, 820, 300, (255, 140, 60)), (15.5, 16.3, 260, 380, (230, 120, 255)),
             (26.5, 27.3, 700, 330, (255, 90, 120)), (28.5, 29.3, 240, 300, (255, 220, 80)),
             (30.5, 31.3, 820, 460, (120, 220, 255)),
             (34.3, 35.0, 270, 420, (255, 90, 120)), (34.9, 35.6, 810, 350, (255, 220, 80)),
             (35.6, 36.3, 540, 250, (120, 220, 255)), (36.4, 37.1, 260, 620, (160, 255, 140)),
             (37.0, 37.7, 820, 640, (230, 120, 255))]


# ------------------------------------------------------------------ background
def make_background():
    bg = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(bg)
    top, bot = (12, 14, 45), (70, 45, 110)
    for y in range(GROUND):
        d.line([0, y, W, y], fill=mix(top, bot, (y / GROUND) ** 1.4))
    rnd = random.Random(4)
    for _ in range(90):
        sx, sy, r = rnd.uniform(0, W), rnd.uniform(0, 900), rnd.uniform(1.5, 3.5)
        d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(255, 255, 230))
    # moon
    d.ellipse([110, 180, 290, 360], fill=(255, 245, 200))
    d.ellipse([150, 160, 330, 340], fill=mix(top, bot, 0.08))
    # distant village silhouettes
    for i, hx in enumerate(range(-40, W, 210)):
        hh = 120 + (i * 37) % 70
        d.rectangle([hx, GROUND - 40 - hh, hx + 160, GROUND - 40], fill=(40, 30, 70))
        d.polygon([(hx - 20, GROUND - 40 - hh), (hx + 80, GROUND - 110 - hh), (hx + 180, GROUND - 40 - hh)],
                  fill=(40, 30, 70))
        d.rectangle([hx + 60, GROUND - 90 - hh // 2, hx + 90, GROUND - 60 - hh // 2], fill=(255, 200, 90))
    # house (left)
    d.rectangle([0, GROUND - 470, 620, GROUND], fill=(225, 170, 110), outline=INK, width=8)
    d.rectangle([0, GROUND - 60, 640, GROUND + 10], fill=(150, 140, 135), outline=INK, width=6)
    d.polygon([(-60, GROUND - 450), (680, GROUND - 450), (560, GROUND - 640), (40, GROUND - 640)],
              fill=(190, 70, 50), outline=INK, width=8)
    for i in range(1, 9):
        x0 = lerp(-60, 680, i / 9)
        x1 = lerp(40, 560, i / 9)
        d.line([x0, GROUND - 450, x1, GROUND - 640], fill=(150, 50, 40), width=6)
    # door + window
    d.rectangle([60, GROUND - 330, 190, GROUND - 60], fill=(120, 70, 35), outline=INK, width=7)
    d.ellipse([160, GROUND - 210, 176, GROUND - 194], fill=(230, 190, 60))
    d.rectangle([420, GROUND - 360, 560, GROUND - 230], fill=(255, 210, 100), outline=INK, width=7)
    d.line([490, GROUND - 360, 490, GROUND - 230], fill=INK, width=6)
    # mango leaf toran over the door
    for i in range(7):
        lx = 70 + i * 18
        d.polygon([(lx, GROUND - 335), (lx + 9, GROUND - 300), (lx + 18, GROUND - 335)],
                  fill=(60, 150, 60), outline=INK, width=2)
    # ground / road
    d.rectangle([0, GROUND, W, H], fill=(95, 70, 55))
    d.rectangle([0, GROUND, W, GROUND + 12], fill=INK)
    for i in range(30):
        px, py = rnd.uniform(0, W), rnd.uniform(GROUND + 40, H)
        d.ellipse([px - 6, py - 3, px + 6, py + 3], fill=(80, 58, 45))
    # rangoli
    cx, cy = 540, 1700
    for r, col in [(150, (240, 60, 120)), (115, (255, 210, 60)), (80, (60, 190, 230)), (45, (255, 255, 255))]:
        d.ellipse([cx - r, cy - r * 0.45, cx + r, cy + r * 0.45], fill=col, outline=INK, width=4)
    for i in range(8):
        a = i * math.pi / 4
        px, py = cx + math.cos(a) * 135, cy + math.sin(a) * 135 * 0.45
        d.ellipse([px - 22, py - 10, px + 22, py + 10], fill=(150, 60, 220), outline=INK, width=3)
    return bg


def draw_tree_trunk(d):
    d.polygon([(TREE_X - 55, GROUND), (TREE_X + 55, GROUND), (TREE_X + 35, GROUND - 520),
               (TREE_X - 35, GROUND - 520)], fill=(105, 70, 45), outline=INK, width=8)
    d.line([TREE_X - 10, GROUND - 120, TREE_X + 5, GROUND - 260], fill=(80, 50, 30), width=6)


def draw_tree_canopy(d, t):
    for ox, oy, r in [(-160, -560, 150), (150, -580, 150), (0, -700, 190), (-90, -470, 120),
                      (100, -470, 130)]:
        sway = math.sin(t * 1.3 + ox) * 4
        d.ellipse([TREE_X + ox - r + sway, GROUND + oy - r, TREE_X + ox + r + sway, GROUND + oy + r],
                  fill=(35, 95, 55), outline=INK, width=8)


def draw_lights(d, t):
    """Blinking serial lights along the roof edge."""
    cols = [(255, 80, 80), (255, 220, 60), (80, 220, 255), (120, 255, 120)]
    for i in range(16):
        x = -20 + i * 44
        sag = math.sin((i % 4) / 4 * math.pi) * 22
        y = GROUND - 445 + sag
        on = (int(t * 4) + i) % 4 != 0
        col = cols[i % 4] if on else (70, 60, 70)
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=col, outline=INK, width=2)


def draw_diyas(d, t):
    for i in range(10):
        a = i * 2 * math.pi / 10
        x, y = 540 + math.cos(a) * 210, 1700 + math.sin(a) * 95
        d.chord([x - 26, y - 18, x + 26, y + 18], 0, 180, fill=(190, 100, 50), outline=INK, width=4)
        fl = 1 + 0.25 * math.sin(t * 17 + i * 1.7)
        d.ellipse([x - 18 * fl, y - 46 * fl, x + 18 * fl, y], fill=(255, 170, 40))
        d.polygon([(x - 9, y - 4), (x, y - 40 * fl), (x + 9, y - 4)], fill=(255, 240, 150))


def draw_firework(d, t, launch, at, x, y, col):
    if launch <= t < at:
        k = prog(t, launch, at)
        ry = lerp(GROUND - 300, y, ease_out(k))
        d.line([x, ry, x, ry + 60], fill=(255, 220, 160), width=5)
        d.ellipse([x - 6, ry - 6, x + 6, ry + 6], fill=(255, 255, 220))
    elif at <= t < at + 1.4:
        k = prog(t, at, at + 1.4)
        fade = mix(col, (40, 30, 80), k ** 1.5)
        for i in range(22):
            a = i * 2 * math.pi / 22
            r = ease_out(k) * 170
            px, py = x + math.cos(a) * r, y + math.sin(a) * r + k * k * 90
            tail = 22 * (1 - k)
            d.line([px, py, px - math.cos(a) * tail, py - math.sin(a) * tail], fill=fade, width=6)
            d.ellipse([px - 5, py - 5, px + 5, py + 5], fill=mix((255, 255, 255), fade, k))


def smoke(d, cx, cy, k, seed=9):
    rnd = random.Random(seed)
    for _ in range(18):
        a = rnd.uniform(0, 2 * math.pi)
        dist = rnd.uniform(20, 220) * ease_out(min(1, k * 1.6))
        r = rnd.uniform(70, 140) * (1 - max(0, k - 0.55) * 2.0)
        if r <= 2:
            continue
        g = rnd.randint(150, 200)
        px, py = cx + math.cos(a) * dist, cy + math.sin(a) * dist * 0.8 - k * 120
        d.ellipse([px - r, py - r, px + r, py + r], fill=(g, g, g + 8), outline=(110, 110, 120), width=4)


# ------------------------------------------------------------------ frame
def frame(t, bg):
    img = bg.copy()
    d = ImageDraw.Draw(img)

    for fw in FIREWORKS:
        if fw[0] < 34.0:
            draw_firework(d, t, *fw)
    draw_lights(d, t)
    draw_tree_canopy(d, t)

    # ---------------- Peddayya
    p = dict(x=CHAIR_X, mood="sleep", sitting=True, facing=1, walk=0.0, laugh=0.0, hold=None)
    if BOOM_T <= t < 24.6:
        p["mood"] = "shock"
    elif 24.6 <= t < 26.0:
        p["mood"] = "smile"
    elif 26.0 <= t < 28.0:
        p.update(sitting=False, mood="smile", walk=t * 1.6,
                 x=lerp(CHAIR_X, 740, ease_io(prog(t, 26.0, 28.0))))
    elif 28.0 <= t < 29.2:
        p.update(sitting=False, mood="laugh", laugh=1.0, x=740)
    elif 29.2 <= t < 29.7:
        p.update(sitting=False, mood="smile", x=740, hold="flowerpot")
    elif t >= 29.7:
        p.update(sitting=False, mood="laugh" if t > 30.2 else "smile", x=740,
                 laugh=0.3 if t > 30.2 else 0)
    draw_chair(d, CHAIR_X, GROUND)
    draw_peddayya(d, p["x"], GROUND, t, mood=p["mood"], sitting=p["sitting"], facing=p["facing"],
                  walk=p["walk"], laugh=p["laugh"], hold=p["hold"])
    head_peddayya = (p["x"], GROUND - 640 if p["sitting"] else GROUND - 690)

    # ---------------- Bujji
    b = dict(x=-150.0, facing=1, mood="normal", walk=0.0, step_h=0.0, crouch=0.0, hold=None,
             look=(1, 0), hidden=False, visible=True, arm_up=0.0)
    if t < 4.0:
        b["visible"] = False
    elif t < 6.4:
        b.update(x=lerp(-150, 140, prog(t, 4.0, 6.4)), walk=t * 1.8, hold="bomb")
    elif t < 8.0:
        b.update(x=140, hold="bomb", mood="evil" if t > 6.9 else "normal", look=(1, -0.3))
    elif t < 10.4:  # tiptoe
        b.update(x=lerp(140, 250, prog(t, 8.0, 10.4)), walk=t * 1.2, step_h=36, hold="bomb",
                 mood="evil", crouch=0.3)
    elif t < 11.0:  # bend down & place
        b.update(x=250, crouch=lerp(0.3, 1.0, prog(t, 10.4, 10.8)), hold="bomb", mood="evil",
                 look=(1, 1))
    elif t < 12.8:  # match
        b.update(x=250, crouch=0.6, hold="match", mood="evil", look=(1, 1))
    elif t < 13.2:
        b.update(x=250, crouch=0.4, mood="shock" if t > 12.95 else "evil", look=(1, 1))
    elif t < 14.6:  # run to the tree
        k = ease_in(prog(t, 13.2, 14.6))
        b.update(x=lerp(250, HIDE_X, k), walk=t * 4, mood="shock")
    elif t < BOOM_T:  # hiding behind the tree, peeking left
        b.update(x=HIDE_X, facing=-1, hidden=True, mood="evil", look=(-1, 0))
        if t >= 21.4:
            b.update(mood="shock", look=(0, 1) if t < 21.9 else (-1, 0.3))
    elif t < 24.3:
        b["visible"] = False      # inside the smoke
    elif t < 29.7:
        b.update(x=990, facing=-1, mood="sooty", look=(-1, 0))
    else:
        b.update(x=990, facing=-1, mood="happy", arm_up=0.6 if t > 30.4 else 0)

    def bujji():
        draw_bujji(d, b["x"], GROUND, t, facing=b["facing"], mood=b["mood"], walk=b["walk"],
                   step_h=b["step_h"], crouch=b["crouch"], hold=b["hold"], look=b["look"],
                   arm_up=b["arm_up"])

    if b["visible"] and b["hidden"]:
        bujji()
    draw_tree_trunk(d)
    if b["visible"] and not b["hidden"]:
        if 13.4 <= t < 14.6:
            speed_lines(d, t, GROUND - 400, GROUND - 40, direction=1)
            dust_puffs(d, b["x"] - 80, GROUND, prog(t, 13.4, 14.6), seed=int(t * 5))
        bujji()

    # ---------------- the bomb (placed under chair, then carried by Kodi)
    fuse_left = 1.0 - prog(t, 12.8, BOOM_T)
    bomb_lit = 12.8 <= t < BOOM_T
    if 11.0 <= t < 18.5:
        draw_bomb(d, BOMB_X, GROUND - 42, t, fuse=fuse_left, lit=bomb_lit)
    elif 21.0 <= t < BOOM_T:
        k = prog(t, 21.0, 21.25)
        draw_bomb(d, DROP_X, lerp(GROUND - 120, GROUND - 42, ease_in(k)), t, fuse=fuse_left, lit=True)

    # ---------------- Kodi King
    if 15.0 <= t < 17.2:
        draw_kodi(d, lerp(-120, BOMB_X - 150, prog(t, 15.0, 17.2)), GROUND, t, walk=t * 1.6)
    elif 17.2 <= t < 18.5:
        peck = ease_io(prog(t, 17.9, 18.3)) - ease_io(prog(t, 18.3, 18.5))
        draw_kodi(d, BOMB_X - 150, GROUND, t, peck=peck)
    elif 18.5 <= t < 21.0:
        kx = lerp(BOMB_X - BEAK, DROP_X - BEAK, prog(t, 18.5, 21.0))
        draw_kodi(d, kx, GROUND, t, walk=t * 1.6, carry_bomb={"lit": True})
    elif 21.0 <= t < 22.8:
        kx = lerp(DROP_X - BEAK, -150, ease_in(prog(t, 21.3, 22.8)))
        draw_kodi(d, kx, GROUND, t, facing=-1, walk=t * 2.2)
    elif 31.0 <= t < 34.2:
        kx = lerp(-150, 360, ease_out(prog(t, 31.0, 32.8)))
        draw_kodi(d, kx, GROUND, t, walk=t * 1.3 if t < 32.8 else 0, shades=True)
        if t > 33.0:
            k = math.sin(prog(t, 33.0, 33.6) * math.pi)
            d.polygon(star_points(kx + 95, GROUND - 200, 40 * k + 1, 12 * k + 1, n=4, rot=0.3),
                      fill=(255, 255, 255))

    # ---------------- flowerpot
    if 29.7 <= t:
        lit = t >= 30.0
        power = clamp(prog(t, 30.0, 30.3)) * (1 - prog(t, 33.4, 34.2))
        draw_flowerpot(d, 865, GROUND, t, lit=lit, power=power)

    draw_diyas(d, t)

    # ---------------- bubbles
    if t < 12.5:
        bubble(d, CHAIR_X + 60, GROUND - 820, "zzz", 1.0, t)
    elif 15.0 <= t < BOOM_T:
        bubble(d, CHAIR_X + 60, GROUND - 820, "zzz", 1.0, t)
    if 6.9 <= t < 8.0:
        bubble(d, 220, GROUND - 640, "idea", pop(t, 6.9), t)
    if 17.3 <= t < 18.0:
        bubble(d, BOMB_X - 120, GROUND - 400, "?", pop(t, 17.3), t)
    if 21.9 <= t < BOOM_T:
        bubble(d, HIDE_X + 80, GROUND - 620, "!!", pop(t, 21.9), t)
    if BOOM_T + 0.2 <= t < 24.6:
        bubble(d, head_peddayya[0] + 90, head_peddayya[1] - 120, "!", pop(t, BOOM_T + 0.2), t)
    if 31.0 <= t < 33.6:
        bubble(d, 865, GROUND - 860, "heart", pop(t, 31.0), t)

    # ---------------- explosion
    if BOOM_T <= t < 24.6:
        k = prog(t, BOOM_T, 24.6)
        if k < 0.25:
            burst(d, DROP_X, GROUND - 160, lerp(80, 360, ease_out(k / 0.25)), (255, 200, 40), n=13, rot=0.3)
            burst(d, DROP_X, GROUND - 160, lerp(40, 220, ease_out(k / 0.25)), (255, 90, 40), n=11,
                  rot=0.6, outline=None)
        smoke(d, DROP_X, GROUND - 180, k)

    # ---------------- camera (world space -> screen)
    zoom, zx, zy = 1.0, W / 2, H / 2
    if 6.6 <= t < 8.2:   # push in on Bujji's evil idea
        k = ease_io(prog(t, 6.6, 7.1)) * (1 - ease_io(prog(t, 7.8, 8.2)))
        zoom, zx, zy = 1 + 0.45 * k, lerp(W / 2, 260, k), lerp(H / 2, GROUND - 330, k)
    if 21.6 <= t < BOOM_T:  # crash zoom on Bujji's face
        k = ease_out(prog(t, 21.6, 22.0))
        zoom, zx, zy = 1 + 0.9 * k, lerp(W / 2, HIDE_X - 20, k), lerp(H / 2, GROUND - 380, k)
    if 24.4 <= t < 26.0:  # reveal sooty Bujji
        k = ease_io(prog(t, 24.4, 24.8)) * (1 - ease_io(prog(t, 25.6, 26.0)))
        zoom, zx, zy = 1 + 0.6 * k, lerp(W / 2, 990, k), lerp(H / 2, GROUND - 330, k)
    img = camera(img, zoom, zx, zy)
    d = ImageDraw.Draw(img)

    # ---------------- motion-graphic texts (screen space)
    if 0.4 <= t < 3.9:
        k = pop(t, 0.5, 0.5)
        out = ease_in(prog(t, 3.4, 3.9))
        y = lerp(560, -200, out)
        d.rounded_rectangle([W / 2 - 110 * k, y - 190 - 45 * k, W / 2 + 110 * k, y - 190 + 45 * k],
                            radius=40, fill=(230, 30, 60), outline=INK, width=6)
        text(d, (W / 2, y - 190), "EP-1", int(60 * k), (255, 255, 255), stroke=4)
        text(d, (W / 2, y), "దీపావళి", int(150 * pop(t, 0.8)), (255, 220, 60), stroke=12, telugu=True)
        text(d, (W / 2, y + 170), "బాంబు", int(170 * pop(t, 1.1)), (255, 90, 60), stroke=12, telugu=True)
    if BOOM_T <= t < 24.2:
        k = pop(t, BOOM_T, 0.3)
        text(d, (W / 2, 560), "BOOM!", int(220 * k), (255, 220, 60), stroke=14)
    if 28.0 <= t < 29.2:
        for i, (dx, t0) in enumerate([(-120, 28.0), (110, 28.3), (-40, 28.6)]):
            k = pop(t, t0, 0.25)
            bounce = abs(math.sin((t - t0) * 9)) * 25
            text(d, (W / 2 + dx, 520 + i * 120 - bounce), "HA!", int(110 * k), (255, 255, 255), stroke=10)
    if 30.4 <= t < 34.0:
        k = pop(t, 30.4)
        text(d, (W / 2, 440), "WOW!", int(150 * k), (120, 230, 255), stroke=12)

    # ---------------- end card
    if t >= 34.0:
        k = ease_out(prog(t, 34.0, 34.6))
        img = Image.blend(img, Image.new("RGB", (W, H), (25, 10, 45)), 0.82 * k)
        d = ImageDraw.Draw(img)
        for fw in FIREWORKS:
            if fw[0] >= 34.0:
                draw_firework(d, t, *fw)
        text(d, (W / 2, 820), "దీపావళి", int(160 * pop(t, 34.3)), (255, 200, 60), stroke=12, telugu=True)
        text(d, (W / 2, 1010), "శుభాకాంక్షలు", int(115 * pop(t, 34.6)), (255, 120, 80), stroke=10, telugu=True)
        for i in range(5):  # row of diyas
            x, y = W / 2 - 300 + i * 150, 1180
            kk = pop(t, 34.8 + i * 0.1)
            if kk > 0:
                d.chord([x - 40 * kk, y - 26 * kk, x + 40 * kk, y + 26 * kk], 0, 180,
                        fill=(200, 100, 50), outline=INK, width=4)
                fl = 1 + 0.25 * math.sin(t * 17 + i)
                d.ellipse([x - 22 * kk * fl, y - 64 * kk * fl, x + 22 * kk * fl, y], fill=(255, 170, 40))
        k2 = pop(t, 35.6)
        if k2 > 0:
            pulse = 1 + 0.05 * math.sin(t * 9)
            bw, bh, by = 330 * k2 * pulse, 70 * k2 * pulse, 1400
            d.rounded_rectangle([W / 2 - bw, by - bh, W / 2 + bw, by + bh], radius=34,
                                fill=(230, 20, 30), outline=(255, 255, 255), width=8)
            text(d, (W / 2, by), "SUBSCRIBE", int(84 * k2), (255, 255, 255), stroke=4)
        k3 = pop(t, 36.0)
        if k3 > 0:
            text(d, (W / 2, 1560), CHANNEL_TE, int(90 * k3), (255, 140, 40), stroke=8, telugu=True)
            text(d, (W / 2, 1660), CHANNEL_HANDLE, int(50 * k3), (255, 255, 255), stroke=4)

    if t < 34.0:
        watermark(d)

    # ---------------- post: shake, flash, fades
    amt = 0.0
    if BOOM_T <= t < 24.4:
        amt = 34 * (1 - prog(t, BOOM_T, 24.4))
    if 12.6 <= t < 12.8:
        amt = 4
    img = shake(img, amt, t)
    if BOOM_T <= t < BOOM_T + 0.18:
        img = flash(img, 1 - prog(t, BOOM_T, BOOM_T + 0.18))
    img = fade_black(img, prog(t, 0, 0.5) * (1 - prog(t, DURATION - 0.4, DURATION)))
    return img


# ------------------------------------------------------------------ sound
def soundtrack(path):
    tr = Track(DURATION)
    n = tr.n

    # ambient crickets (night)
    x = np.arange(n) / SR
    chirp = np.sin(2 * np.pi * 4300 * x) * (np.sin(2 * np.pi * 28 * x) > 0.3) * \
        (np.sin(2 * np.pi * 0.8 * x) > 0)
    amb = chirp * 0.025
    amb[int(BOOM_T * SR):int(25.5 * SR)] = 0
    amb[int(34.0 * SR):] = 0
    tr.add(amb, 0)

    # playful intro tune (pentatonic flute + tabla)
    scale = [0, 2, 4, 7, 9, 12, 14]  # semitones over C5
    c5 = note_hz(3)
    melody = [(0, 0.25), (2, 0.25), (4, 0.5), (3, 0.25), (4, 0.25), (5, 0.5), (4, 0.25), (2, 0.25),
              (3, 0.5), (1, 0.25), (2, 0.25), (0, 1.0)]
    at = 0.5
    for _ in range(2):
        for deg, dur in melody:
            tr.add(flute(c5 * 2 ** (scale[deg] / 12), dur * 0.95), at, 0.16)
            at += dur
    for b in range(int(7.5 / 0.25)):
        tt0 = 0.5 + b * 0.25
        if b % 4 == 0:
            tr.add(drum(110, 0.3, 1.5), tt0, 0.35)
        elif b % 4 == 2:
            tr.add(drum(330, 0.2, 0.6), tt0, 0.18)
        else:
            tr.add(drum(520, 0.1, 0.3), tt0, 0.08)

    # sneaky tiptoe pizzicato (8.0 - 10.4)
    sneaky = [-12, -9, -7, -9, -12, -9, -7, -5, -4, -5]
    for i, s in enumerate(sneaky):
        tr.add(pluck(note_hz(s)), 8.0 + i * 0.24, 0.35)

    # snores while sleeping
    for s0 in np.arange(0.6, 22.8, 2.4):
        if 12.5 < s0 < 15.0:
            continue
        x = tt(1.1)
        inhale = lowpass(tr.noise(1.1), 30) * np.sin(np.pi * x / 1.1) * \
            (1 + 0.6 * np.sin(2 * np.pi * 38 * x))
        tr.add(inhale * 2.0, s0, 0.10)
        x = tt(0.7)
        exhale = highpass(tr.noise(0.7), 6) * np.sin(np.pi * x / 0.7)
        tr.add(exhale, s0 + 1.15, 0.03)

    # footsteps
    for i in range(10):
        tr.add(drum(90, 0.1, 0.5), 4.0 + i * 0.27, 0.10)
    # idea "ding"
    for i, f in enumerate([1318, 1760]):
        x = tt(0.6)
        tr.add(np.sin(2 * np.pi * f * x) * env(x, 0.002, 0.25), 6.9 + i * 0.08, 0.22)
    # place bomb "tok"
    tr.add(drum(200, 0.15, 0.3), 10.9, 0.3)
    # match strike + fuse hiss
    x = tt(0.25)
    tr.add(highpass(tr.noise(0.25), 4) * env(x, 0.005, 0.08), 12.6, 0.5)
    hiss_len = BOOM_T - 12.8
    x = tt(hiss_len)
    hiss = highpass(tr.noise(hiss_len), 3) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * x))
    tr.add(hiss, 12.8, 0.035)
    # running whoosh + fast steps
    x = tt(1.3)
    tr.add(lowpass(tr.noise(1.3), 12) * np.sin(np.pi * x / 1.3) * 2.5, 13.2, 0.4)
    for i in range(8):
        tr.add(drum(140, 0.08, 0.5), 13.3 + i * 0.16, 0.12)

    # suspense: tick-tock + rising low drone (15 - 22.6)
    for i in range(int((22.6 - 15.0) / 0.5)):
        x = tt(0.05)
        tr.add(np.sin(2 * np.pi * (1800 if i % 2 else 1400) * x) * env(x, 0.001, 0.015), 15.0 + i * 0.5, 0.25)
    x = tt(7.6)
    drone = sweep(55, 110, 7.6) + 0.5 * sweep(82, 165, 7.6)
    tr.add(drone * np.linspace(0, 1, len(x)), 15.0, 0.06)

    # rooster: clucks (bawk) when it walks / picks / drops
    def cluck(at, pitch=1.0):
        x = tt(0.12)
        f = (700 + 500 * np.sin(np.pi * x / 0.12)) * pitch
        saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        tr.add(lowpass(saw, 4) * env(x, 0.004, 0.05), at, 0.22)
    for at in [15.3, 15.7, 16.4, 16.8, 18.6, 19.4, 20.2, 21.4, 21.8, 22.2]:
        cluck(at, 1.0 + 0.1 * math.sin(at * 7))
    # "?" boing
    x = tt(0.4)
    tr.add(np.sin(2 * np.pi * np.cumsum(300 + 150 * np.sin(x * 35)) / SR) * env(x, 0.005, 0.15), 17.3, 0.3)
    # bomb dropped "tonk"
    tr.add(drum(160, 0.2, 0.4), 21.2, 0.35)
    # shock sting (dissonant stab)
    x = tt(0.9)
    sting = sum(np.sign(np.sin(2 * np.pi * f * x)) for f in (466, 494, 523)) * env(x, 0.003, 0.3)
    tr.add(lowpass(sting, 3), 21.9, 0.12)
    # silence beat before the boom is natural: nothing else scheduled 22.6-23.0

    # BOOM
    boom(tr, BOOM_T, 1.0)
    # coughs (sooty Bujji) - noise puffs, not a voice
    for at in (25.0, 25.35):
        x = tt(0.18)
        tr.add(lowpass(tr.noise(0.18), 8) * env(x, 0.005, 0.06), at, 0.35)
    # blink "plink plink"
    for i, f in enumerate([1200, 1500]):
        tr.add(pluck(f, 0.2), 25.8 + i * 0.25, 0.25)

    # laugh: bouncy bassoon-like notes (instrument, not voice)
    for i in range(8):
        f = note_hz(-17 + (4 if i % 2 == 0 else 0) - i // 2)
        x = tt(0.14)
        saw = 2 * ((np.cumsum(np.full(len(x), f)) / SR) % 1) - 1
        tr.add(lowpass(saw, 6) * env(x, 0.01, 0.08), 28.0 + i * 0.15, 0.3)

    # festive happy tune from 26.0
    happy = [(0, 0.25), (2, 0.25), (4, 0.25), (5, 0.25), (4, 0.5), (2, 0.5), (3, 0.25), (4, 0.25),
             (5, 0.5), (6, 0.5), (5, 0.25), (4, 0.25), (2, 0.5)]
    at = 26.0
    while at < 33.8:
        for deg, dur in happy:
            if at >= 33.8:
                break
            tr.add(flute(c5 * 2 ** (scale[deg] / 12), dur * 0.95), at, 0.14)
            at += dur
    for b in range(int((33.8 - 26.0) / 0.25)):
        t0 = 26.0 + b * 0.25
        tr.add(drum(110 if b % 4 == 0 else (330 if b % 2 == 0 else 520), 0.2, 1.0), t0,
               0.3 if b % 4 == 0 else 0.1)

    # flowerpot fountain hiss + sparkle chimes
    x = tt(3.6)
    fountain = highpass(tr.noise(3.6), 2) * np.minimum(1, x / 0.2) * np.minimum(1, (3.6 - x) / 0.8)
    tr.add(fountain, 30.0, 0.12)
    for i in range(12):
        f = c5 * 2 ** (scale[i % 7] / 12) * 2
        x = tt(0.3)
        tr.add(np.sin(2 * np.pi * f * x) * env(x, 0.002, 0.1), 30.1 + i * 0.27, 0.12)

    # cool rooster: funky bass riff + glint
    for i, s in enumerate([-21, -21, -14, -16, -21]):
        tr.add(pluck(note_hz(s), 0.3), 31.0 + i * 0.3, 0.6)
    for i, f in enumerate([2093, 2637, 3136]):
        x = tt(0.3)
        tr.add(np.sin(2 * np.pi * f * x) * env(x, 0.002, 0.1), 33.0 + i * 0.06, 0.2)

    # fireworks
    for launch, at, *_ in FIREWORKS:
        firework_sfx(tr, launch, at, gain=0.22 if at < 34 else 0.3)

    # end card jingle
    for i, deg in enumerate([0, 2, 4, 5, 6]):
        tr.add(flute(c5 * 2 ** (scale[deg] / 12), 0.22), 34.3 + i * 0.14, 0.2)
    x = tt(2.5)
    chord = sum(np.sin(2 * np.pi * f * x) for f in (261.6, 329.6, 392.0, 523.2)) * env(x, 0.05, 1.0)
    tr.add(chord, 35.1, 0.12)
    x = tt(0.15)
    tr.add(sweep(400, 1300, 0.15) * env(x, 0.002, 0.05), 35.6, 0.35)   # subscribe pop

    tr.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--output", default="ep01_diwali_bomb.mp4")
    args = ap.parse_args()
    bg = make_background()
    render(lambda t: frame(t, bg), DURATION, soundtrack, args.output)


if __name__ == "__main__":
    main()
