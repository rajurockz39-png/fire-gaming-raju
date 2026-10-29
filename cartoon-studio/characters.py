"""
Naa Idea cast: Bujji (naughty village boy), Peddayya (his grandfather),
Kodi King (the family rooster) and props (bomb, flowerpot cracker, chair).

Every character is drawn with (x, y) = centre point between the feet on the ground.
"""
import math
import random

from engine import INK, ell, lerp, star_points

SKIN_KID = (196, 128, 84)
SKIN_OLD = (176, 112, 76)
SOOT = (45, 40, 42)


# ------------------------------------------------------------------ props
def draw_bomb(d, x, y, t, r=42, fuse=1.0, lit=False):
    """Round cracker bomb centred at (x, y). fuse = remaining fuse length 0..1."""
    ell(d, x, y, r, r, (200, 30, 40), width=7)
    ell(d, x - r * 0.35, y - r * 0.35, r * 0.22, r * 0.16, (255, 140, 140), outline=None)
    d.rectangle([x - 12, y - r - 14, x + 12, y - r + 4], fill=(120, 110, 100), outline=INK, width=4)
    pts = [(x, y - r - 14)]
    n = max(1, int(10 * fuse))
    for i in range(1, n + 1):
        k = i / 10
        pts.append((x + math.sin(k * 5) * 22 * k + k * 30, y - r - 14 - k * 70))
    if len(pts) > 1:
        d.line(pts, fill=(90, 70, 50), width=6, joint="curve")
    if lit:
        tx, ty = pts[-1]
        fl = 1 + 0.35 * math.sin(t * 50)
        d.polygon(star_points(tx, ty, 22 * fl, 9 * fl, n=6, rot=t * 9), fill=(255, 220, 60))
        ell(d, tx, ty, 7, 7, (255, 255, 230), outline=None)
        rnd = random.Random(int(t * 30))
        for _ in range(7):
            a = rnd.uniform(0, 2 * math.pi)
            rr = rnd.uniform(15, 45)
            d.line([tx, ty, tx + math.cos(a) * rr, ty + math.sin(a) * rr],
                   fill=(255, rnd.randint(150, 240), 60), width=3)


def draw_flowerpot(d, x, y, t, lit=False, power=1.0):
    """Chichubuddi (flowerpot cracker) standing on the ground at (x, y)."""
    if lit and power > 0:
        rnd = random.Random(int(t * 40))
        for _ in range(int(70 * power)):
            a = rnd.uniform(-0.45, 0.45) - math.pi / 2
            sp = rnd.uniform(0.3, 1.0) * 520 * power
            k = rnd.uniform(0, 1)
            px = x + math.cos(a) * sp * k
            py = y - 95 + math.sin(a) * sp * k + (sp * k) ** 2 / 900
            col = rnd.choice([(255, 240, 150), (255, 200, 60), (255, 255, 255), (255, 150, 60)])
            rr = rnd.uniform(3, 8) * (1 - k * 0.5)
            d.ellipse([px - rr, py - rr, px + rr, py + rr], fill=col)
        ell(d, x, y - 100, 30, 22, (255, 250, 200), outline=None)
    d.polygon([(x - 55, y), (x + 55, y), (x + 22, y - 95), (x - 22, y - 95)],
              fill=(240, 180, 40), outline=INK, width=6)
    for k in (0.3, 0.62):
        yy = y - 95 * k
        hw = lerp(55, 22, k)
        d.line([x - hw, yy, x + hw, yy], fill=(210, 40, 60), width=10)


def draw_chair(d, x, y):
    """Wooden easy chair (paduku kurchi); seat at about y - 150."""
    wood, dark = (150, 90, 45), (110, 62, 30)
    d.line([x - 110, y, x - 60, y - 150], fill=INK, width=18)
    d.line([x - 110, y, x - 60, y - 150], fill=wood, width=10)
    d.line([x + 120, y, x + 70, y - 150], fill=INK, width=18)
    d.line([x + 120, y, x + 70, y - 150], fill=wood, width=10)
    d.polygon([(x - 150, y - 360), (x - 110, y - 380), (x + 90, y - 140), (x + 50, y - 120)],
              fill=(230, 90, 60), outline=INK, width=6)
    for i in range(4):
        k = (i + 1) / 5
        d.line([lerp(x - 130, x + 70, k), lerp(y - 370, y - 130, k) - 6,
                lerp(x - 130, x + 70, k) + 20, lerp(y - 370, y - 130, k) + 12],
               fill=(250, 210, 90), width=6)
    d.rectangle([x - 170, y - 205, x + 140, y - 190], fill=dark, outline=INK, width=4)


# ------------------------------------------------------------------ Bujji
def draw_bujji(d, x, y, t, facing=1, mood="normal", walk=0.0, step_h=0.0, crouch=0.0,
               hold=None, look=(1, 0), squash=1.0, arm_up=0.0, blink_ok=True):
    """
    mood: normal | evil | shock | sooty | happy
    hold: None | 'bomb' | 'match'
    walk: phase (increase over time to animate legs). step_h: knee lift (tiptoe).
    """
    f = facing
    sooty = mood == "sooty"
    skin = SOOT if sooty else SKIN_KID
    y0 = y - crouch * 40
    hip = y0 - 85 * squash
    sh_y = hip - 105 * squash
    head_y = sh_y - 95 * squash

    # legs
    for side in (-1, 1):
        ph = walk * 2 * math.pi + (0 if side < 0 else math.pi)
        swing = math.sin(ph) * 28
        lift = max(0, math.cos(ph)) * step_h
        fx = x + side * 26 + swing * f
        fy = y - lift
        d.line([x + side * 26, hip, fx, fy - 10], fill=INK, width=20)
        d.line([x + side * 26, hip, fx, fy - 10], fill=skin, width=12)
        ell(d, fx + 12 * f, fy - 8, 26, 13, (90, 60, 40))
    # shorts + shirt
    d.rounded_rectangle([x - 62, hip - 40, x + 62, hip + 22], radius=16,
                        fill=(50, 90, 200) if not sooty else (40, 55, 90), outline=INK, width=6)
    shirt = (255, 205, 40) if not sooty else (110, 95, 60)
    d.rounded_rectangle([x - 70, sh_y - 10, x + 70, hip - 25], radius=34, fill=shirt,
                        outline=INK, width=6)
    if sooty:  # torn bits
        for i in range(4):
            px = x - 50 + i * 32
            d.polygon([(px, hip - 25), (px + 16, hip - 5), (px + 28, hip - 25)], fill=shirt,
                      outline=INK, width=3)

    # arms
    def arm(sx, sy, hx, hy):
        d.line([sx, sy, hx, hy], fill=INK, width=18)
        d.line([sx, sy, hx, hy], fill=skin, width=10)
        ell(d, hx, hy, 17, 17, skin, width=5)

    lsx, rsx = x - 62, x + 62
    if hold == "bomb":
        bx, by = x + 55 * f, sh_y + 55
        draw_bomb(d, bx, by, t, r=40)
        arm(lsx, sh_y + 15, bx - 38, by + 5)
        arm(rsx, sh_y + 15, bx + 38, by + 5)
    elif hold == "match":
        hx, hy = x + 100 * f, sh_y - 30
        arm(x - 62 * f, sh_y + 15, x - 80 * f, sh_y + 90)
        d.line([hx, hy, hx + 10 * f, hy - 60], fill=(230, 200, 140), width=8)
        ell(d, hx + 10 * f, hy - 66, 9, 11, (200, 40, 40), width=3)
        arm(x + 62 * f, sh_y + 15, hx, hy)
    else:
        for side, sx in ((-1, lsx), (1, rsx)):
            sw = math.sin(walk * 2 * math.pi + (math.pi if side < 0 else 0)) * 30
            up = arm_up * 170
            arm(sx, sh_y + 15, sx + side * 30 + sw * f, sh_y + 95 - up - crouch * 30)

    # head
    hr = 92
    ell(d, x - 88, head_y + 8, 20, 26, skin, width=6)
    ell(d, x + 88, head_y + 8, 20, 26, skin, width=6)
    ell(d, x, head_y, hr, hr * 0.95, skin, width=7)
    # hair
    if sooty:
        rnd = random.Random(3)
        for i in range(11):
            a = math.pi + i * math.pi / 10
            r0, r1 = hr * 0.8, hr * 1.25 + rnd.uniform(0, 30) + 6 * math.sin(t * 25 + i)
            d.line([x + math.cos(a) * r0, head_y + math.sin(a) * r0,
                    x + math.cos(a) * r1, head_y + math.sin(a) * r1], fill=INK, width=12)
    else:
        d.chord([x - hr - 4, head_y - hr - 6, x + hr + 4, head_y + hr * 0.4], 180, 360,
                fill=(30, 25, 30), outline=INK, width=6)
        d.polygon([(x - 10, head_y - hr), (x + 35 * f, head_y - hr - 45), (x + 30 * f, head_y - hr + 10)],
                  fill=(30, 25, 30))
    # eyes
    lx, ly = look
    blink = blink_ok and (t % 2.7) < 0.09 and mood in ("normal", "evil")
    for side in (-1, 1):
        ex, ey = x + side * 36 + 10 * f, head_y + 5
        if mood == "happy":
            d.arc([ex - 22, ey - 14, ex + 22, ey + 22], 200, 340, fill=INK, width=8)
            continue
        if blink:
            d.line([ex - 22, ey, ex + 22, ey], fill=INK, width=7)
            continue
        er = 34 if mood == "shock" else 27
        ell(d, ex, ey, er * 0.8, er, (255, 255, 255), width=5)
        pr = 6 if mood in ("shock", "sooty") else 11
        px, py = ex + lx * 9, ey + ly * 12
        ell(d, px, py, pr, pr * 1.2, INK, outline=None)
        if mood == "evil":
            d.line([ex - 28, ey - 30 - side * f * 10, ex + 28, ey - 30 + side * f * 10],
                   fill=INK, width=10)
            d.rectangle([ex - 30, ey - 40, ex + 30, ey - 10 + side * f * 8 - 6], fill=skin)
            d.line([ex - 28, ey - 22 - side * f * 10, ex + 28, ey - 22 + side * f * 10],
                   fill=INK, width=10)
    # mouth
    mx, my = x + 12 * f, head_y + 50
    if mood == "evil":
        d.chord([mx - 42, my - 30, mx + 42, my + 22], 0, 180, fill=(255, 255, 255), outline=INK, width=6)
        d.line([mx - 40, my - 4, mx + 40, my - 4], fill=INK, width=3)
    elif mood == "shock":
        ell(d, mx, my + 5, 16, 22, (120, 20, 30), width=5)
        sx = x + 85
        d.polygon([(sx, head_y - 60), (sx - 14, head_y - 25), (sx + 14, head_y - 25)], fill=(140, 200, 255))
        ell(d, sx, head_y - 22, 14, 14, (140, 200, 255), outline=None)
    elif mood == "sooty":
        d.line([mx - 18, my + 4, mx + 18, my + 2], fill=(220, 210, 200), width=6)
    elif mood == "happy":
        d.chord([mx - 38, my - 26, mx + 38, my + 26], 0, 180, fill=(150, 30, 40), outline=INK, width=6)
    else:
        d.arc([mx - 28, my - 26, mx + 28, my + 10], 20, 160, fill=INK, width=6)


# ------------------------------------------------------------------ Peddayya
def draw_peddayya(d, x, y, t, mood="smile", sitting=False, facing=1, walk=0.0,
                  laugh=0.0, hold=None, arm_up=0.0):
    """
    Grandfather. mood: sleep | shock | smile | laugh
    sitting: True -> seated pose (use with draw_chair at the same x, y).
    """
    f = facing
    shake_y = math.sin(t * 40) * 6 * laugh
    if sitting:
        hip = y - 175
        # legs out front
        for side in (-1, 1):
            kx = x + 70 * f + side * 18
            d.line([x + side * 20, hip, kx, hip + 20], fill=INK, width=34)
            d.line([kx, hip + 20, kx + 25 * f, y - 15], fill=INK, width=22)
            d.line([kx, hip + 20, kx + 25 * f, y - 15], fill=SKIN_OLD, width=14)
            ell(d, kx + 40 * f, y - 12, 32, 14, (120, 70, 40))
        d.polygon([(x - 70, hip - 50), (x + 60, hip - 50), (x + 120 * f, hip + 30), (x - 40, hip + 40)],
                  fill=(40, 140, 90), outline=INK, width=6)
        body_y = hip - 120
    else:
        bob = abs(math.sin(walk * 2 * math.pi)) * 8
        hip = y - 230 - bob
        for side in (-1, 1):
            ph = walk * 2 * math.pi + (0 if side < 0 else math.pi)
            fx = x + side * 30 + math.sin(ph) * 22 * f
            d.line([x + side * 30, y - 80, fx, y - 12], fill=SKIN_OLD, width=16)
            ell(d, fx + 12 * f, y - 10, 32, 14, (120, 70, 40))
        # lungi (checked)
        d.polygon([(x - 80, hip - 20), (x + 80, hip - 20), (x + 70, y - 70), (x - 70, y - 70)],
                  fill=(40, 140, 90), outline=INK, width=6)
        for i in range(1, 4):
            yy = lerp(hip - 20, y - 70, i / 4)
            d.line([x - 75, yy, x + 75, yy], fill=(30, 100, 65), width=6)
        for i in range(1, 4):
            xx = lerp(x - 75, x + 75, i / 4)
            d.line([xx, hip - 15, xx, y - 75], fill=(30, 100, 65), width=6)
        body_y = hip - 120
    body_y += shake_y
    # kurta body (big belly)
    ell(d, x, body_y + 40, 115, 125, (250, 248, 240), width=7)
    for i in range(3):
        ell(d, x + 5 * f, body_y - 30 + i * 38, 6, 6, (200, 180, 120), width=2)
    # arms
    def arm(sx, sy, hx, hy):
        d.line([sx, sy, hx, hy], fill=INK, width=30)
        d.line([sx, sy, hx, hy], fill=(250, 248, 240), width=22)
        ell(d, hx, hy, 20, 20, SKIN_OLD, width=5)

    if hold == "flowerpot":
        hx, hy = x + 120 * f, body_y + 70
        arm(x + 90 * f, body_y - 30, hx, hy)
        draw_flowerpot(d, hx, hy + 70, t)
        arm(x - 90 * f, body_y - 30, x - 110 * f, body_y + 90)
    elif laugh > 0:
        arm(x - 95, body_y - 20, x - 60, body_y + 95)
        arm(x + 95, body_y - 20, x + 60, body_y + 95)
    elif sitting:
        arm(x - 95, body_y - 20, x - 40, body_y + 90)
        arm(x + 95, body_y - 20, x + 40, body_y + 90)
    else:
        for side in (-1, 1):
            sw = math.sin(walk * 2 * math.pi + (math.pi if side < 0 else 0)) * 25
            up = arm_up * 200 if side == f else 0
            arm(x + side * 95, body_y - 25, x + side * 125 + sw * f, body_y + 90 - up)
    # head
    hy = body_y - 165
    if sitting and mood == "sleep":
        hy += 10 + math.sin(t * 2.6) * 6
    ell(d, x, hy, 88, 92, SKIN_OLD, width=7)
    # white side hair + bald shine
    ell(d, x - 82, hy - 10, 26, 40, (240, 240, 240), width=5)
    ell(d, x + 82, hy - 10, 26, 40, (240, 240, 240), width=5)
    ell(d, x - 25, hy - 60, 22, 10, (215, 150, 110), outline=None)
    # tilak
    d.rectangle([x - 5 + 6 * f, hy - 62, x + 5 + 6 * f, hy - 35], fill=(220, 40, 40))
    # eyes
    for side in (-1, 1):
        ex, ey = x + side * 33 + 8 * f, hy - 5
        if mood in ("sleep", "laugh"):
            if mood == "sleep":
                d.arc([ex - 22, ey - 22, ex + 22, ey + 10], 20, 160, fill=INK, width=7)
            else:
                d.arc([ex - 22, ey - 10, ex + 22, ey + 24], 200, 340, fill=INK, width=8)
        else:
            er = 30 if mood == "shock" else 20
            ell(d, ex, ey, er * 0.85, er, (255, 255, 255), width=5)
            ell(d, ex + 5 * f, ey + 2, 7 if mood == "shock" else 9, 10, INK, outline=None)
        # bushy eyebrows
        lift = 18 if mood == "shock" else 0
        d.line([ex - 17, ey - 30 - lift, ex + 17, ey - 34 - lift], fill=(235, 235, 235), width=9)
    # nose
    ell(d, x + 14 * f, hy + 22, 20, 18, (190, 120, 85), width=5)
    # mouth (under mustache)
    mx, my = x + 8 * f, hy + 62
    if mood == "laugh":
        open_k = 0.5 + 0.5 * abs(math.sin(t * 18))
        d.chord([mx - 34, my - 24 * open_k, mx + 34, my + 30 * open_k], 0, 180,
                fill=(150, 30, 40), outline=INK, width=5)
    elif mood == "shock":
        ell(d, mx, my + 5, 16, 20, (120, 20, 30), width=5)
    elif mood == "sleep":
        ell(d, mx, my + 3, 10, 7 + 4 * abs(math.sin(t * 2.6)), (120, 20, 30), width=4)
    # big white mustache (rises with snores / laughs)
    lift = 8 * math.sin(t * 2.6) if mood == "sleep" else (10 if mood == "laugh" else 0)
    for side in (-1, 1):
        d.polygon([(x + 8 * f, hy + 40), (x + 8 * f + side * 95, hy + 30 - lift),
                   (x + 8 * f + side * 110, hy + 5 - lift), (x + 8 * f + side * 60, hy + 55)],
                  fill=(250, 250, 250), outline=INK, width=5)


# ------------------------------------------------------------------ Kodi King
def draw_kodi(d, x, y, t, facing=1, walk=0.0, carry_bomb=None, shades=False, peck=0.0):
    """
    Rooster. walk: phase. carry_bomb: None or dict(fuse=..., lit=...) to hang a bomb from the beak.
    peck: 0..1 bends the head down to the ground.
    """
    f = facing
    bob = math.sin(walk * 2 * math.pi * 2) * 6
    body_y = y - 110 + bob
    # legs
    for side in (-1, 1):
        ph = walk * 2 * math.pi + (0 if side < 0 else math.pi)
        fx = x + side * 14 + math.sin(ph) * 22 * f
        lift = max(0, math.cos(ph)) * 22
        d.line([x + side * 14, body_y + 40, fx, y - 6 - lift], fill=(240, 150, 30), width=8)
        d.line([fx, y - 6 - lift, fx + 26 * f, y - 4 - lift], fill=(240, 150, 30), width=7)
        d.line([fx, y - 6 - lift, fx - 10 * f, y - 2 - lift], fill=(240, 150, 30), width=6)
    # tail feathers (fan of curved plumes behind the body)
    for i, col in enumerate([(30, 30, 40), (200, 40, 40), (30, 110, 70)]):
        a = math.radians(115 + i * 22)
        sway = math.sin(t * 3 + i) * 0.06
        bx0, by0 = x - 55 * f, body_y - 10
        tip = (bx0 + math.cos(a + sway) * 130 * f, by0 - math.sin(a + sway) * 130)
        mid = (bx0 + math.cos(a + 0.35) * 80 * f, by0 - math.sin(a + 0.35) * 80)
        mid2 = (bx0 + math.cos(a - 0.35) * 70 * f, by0 - math.sin(a - 0.35) * 70)
        d.polygon([(bx0, by0 + 12), mid, tip, mid2, (bx0, by0 - 12)], fill=col, outline=INK, width=5)
    # body
    ell(d, x, body_y, 78, 58, (255, 255, 250), width=6)
    d.arc([x - 40 * f - 35, body_y - 20, x - 40 * f + 35, body_y + 35],
          200 if f > 0 else -20, 340 if f > 0 else 160, fill=(200, 200, 200), width=6)
    # neck + head
    hx = x + 62 * f + math.sin(walk * 2 * math.pi * 2) * 10 * f + peck * 40 * f
    hy = body_y - 70 + peck * 120
    d.line([x + 40 * f, body_y - 20, hx, hy], fill=INK, width=44)
    d.line([x + 40 * f, body_y - 20, hx, hy], fill=(255, 255, 250), width=32)
    # comb
    for i in range(3):
        ell(d, hx - 18 * f + i * 14 * f, hy - 40 + abs(i - 1) * 6, 13, 15, (230, 30, 40), width=4)
    ell(d, hx, hy, 36, 36, (255, 255, 250), width=6)
    # wattle
    ell(d, hx + 18 * f, hy + 40, 10, 16, (230, 30, 40), width=4)
    # beak
    bx = hx + 34 * f
    d.polygon([(bx - 6 * f, hy - 8), (bx + 32 * f, hy + 6), (bx - 6 * f, hy + 18)],
              fill=(255, 190, 40), outline=INK, width=4)
    # eye / shades
    if shades:
        d.rounded_rectangle([hx - 12 if f > 0 else hx - 40, hy - 18, hx + 40 if f > 0 else hx + 12, hy + 6],
                            radius=8, fill=(20, 20, 25), outline=INK, width=3)
        d.line([hx + 4 * f, hy - 16, hx - 36 * f, hy - 10], fill=(20, 20, 25), width=5)
        d.line([hx + 6 * f, hy - 14, hx + 18 * f, hy - 6], fill=(255, 255, 255), width=4)
    else:
        ell(d, hx + 12 * f, hy - 6, 7, 8, INK, outline=None)
    if carry_bomb is not None:
        tipx, tipy = bx + 20 * f, hy + 8
        d.line([tipx, tipy, tipx, tipy + 40], fill=(90, 70, 50), width=6)
        draw_bomb(d, tipx - 4, tipy + 40 + 56, t, r=40, fuse=0.0, lit=False)
        if carry_bomb.get("lit"):
            draw_bomb_spark(d, tipx, tipy + 20, t)


def draw_bomb_spark(d, x, y, t):
    fl = 1 + 0.35 * math.sin(t * 50)
    d.polygon(star_points(x, y, 20 * fl, 8 * fl, n=6, rot=t * 9), fill=(255, 220, 60))
