"""
Naa Idea cartoon engine: shared helpers for drawing, motion, audio and encoding.

Every episode script imports this module, draws its frames with Pillow,
builds its soundtrack with numpy, and calls `render()` to get an MP4.
"""
import math
import os
import random
import subprocess
import tempfile
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920          # vertical 9:16 for Shorts / Reels
FPS = 30
SR = 44100
INK = (25, 20, 35)

HERE = os.path.dirname(os.path.abspath(__file__))
LATIN_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TELUGU_FONT = os.path.join(HERE, "fonts", "NotoSansTelugu-ExtraBold.ttf")

CHANNEL_TE = "నా ఐడియా"
CHANNEL_HANDLE = "@naaidea39"

_font_cache = {}


def font(size, telugu=False):
    key = (int(size), telugu)
    if key not in _font_cache:
        path = TELUGU_FONT if telugu else LATIN_FONT
        try:
            _font_cache[key] = ImageFont.truetype(path, max(4, int(size)))
        except OSError:
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


# ------------------------------------------------------------------ motion
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


def ease_io(k):
    return 3 * k * k - 2 * k * k * k


def ease_back(k):
    c = 1.70158
    return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2


def pop(t, t0, dur=0.35):
    """Scale 0 -> overshoot -> 1 starting at t0."""
    return ease_back(prog(t, t0, t0 + dur)) if t >= t0 else 0.0


def mix(c1, c2, k):
    return tuple(int(lerp(a, b, clamp(k))) for a, b in zip(c1, c2))


# ------------------------------------------------------------------ drawing
def ell(d, cx, cy, rx, ry, fill, outline=INK, width=7):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill, outline=outline,
              width=width if outline else 0)


def star_points(cx, cy, r_out, r_in, n=5, rot=0.0):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = rot + math.pi * i / n - math.pi / 2
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def burst(d, cx, cy, r, color, n=14, rot=0.0, outline=INK):
    pts = []
    for i in range(n * 2):
        rr = r if i % 2 == 0 else r * 0.62
        a = rot + math.pi * i / n
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=color, outline=outline, width=10 if outline else 0)


def heart(d, cx, cy, s, fill=(240, 50, 80)):
    pts = []
    for i in range(40):
        a = 2 * math.pi * i / 40
        x = 16 * math.sin(a) ** 3
        y = -(13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a))
        pts.append((cx + x * s, cy + y * s))
    d.polygon(pts, fill=fill, outline=INK, width=5)


def text(d, xy, s, size, fill, outline=INK, stroke=10, telugu=False, anchor="mm"):
    if size < 6:
        return
    d.text(xy, s, font=font(size, telugu), fill=fill, anchor=anchor,
           stroke_width=stroke if outline else 0, stroke_fill=outline)


def bubble(d, x, y, kind, k=1.0, t=0.0):
    """Thought bubble above a character. kind: '!', '!!', '?', 'zzz', 'idea', 'heart'."""
    if k <= 0.01:
        return
    r = 70 * k
    ell(d, x, y, r * 1.15, r, (255, 255, 255), width=6)
    ell(d, x - 40 * k, y + r + 18 * k, 14 * k, 12 * k, (255, 255, 255), width=5)
    ell(d, x - 60 * k, y + r + 48 * k, 8 * k, 7 * k, (255, 255, 255), width=4)
    if kind in ("!", "!!", "?"):
        col = (230, 40, 50) if kind != "?" else (60, 120, 230)
        text(d, (x, y + 4 * k), kind, int(100 * k), col, stroke=0)
    elif kind == "zzz":
        for i, ch in enumerate("zZZ"):
            text(d, (x - 35 * k + i * 32 * k, y + 20 * k - i * 18 * k), ch,
                 int((34 + i * 10) * k), (70, 90, 200), stroke=0)
    elif kind == "idea":
        glow = 8 * math.sin(t * 20)
        for i in range(8):
            a = i * math.pi / 4
            d.line([x + math.cos(a) * (38 + glow) * k, y - 8 * k + math.sin(a) * (38 + glow) * k,
                    x + math.cos(a) * (52 + glow) * k, y - 8 * k + math.sin(a) * (52 + glow) * k],
                   fill=(255, 190, 0), width=int(5 * k) + 1)
        ell(d, x, y - 10 * k, 26 * k, 28 * k, (255, 230, 60), width=5)
        d.rectangle([x - 12 * k, y + 16 * k, x + 12 * k, y + 32 * k], fill=(150, 150, 160),
                    outline=INK, width=4)
    elif kind == "heart":
        heart(d, x, y + 4 * k, 2.6 * k * (1 + 0.08 * math.sin(t * 12)))


def speed_lines(d, t, y0, y1, direction=1, color=(255, 255, 255)):
    rnd = random.Random(int(t * 30))
    for _ in range(16):
        y = rnd.randint(int(y0), int(y1))
        x = rnd.randint(-200, W)
        ln = rnd.randint(150, 380)
        d.line([x, y, x - ln * direction, y], fill=color, width=rnd.randint(4, 9))


def dust_puffs(d, cx, gy, k, seed=1, n=10, spread=1.0):
    rnd = random.Random(seed)
    for _ in range(n):
        ang = rnd.uniform(math.pi * 1.05, math.pi * 1.95)
        sp = rnd.uniform(80, 260) * spread
        r = rnd.uniform(20, 50) * (1 - k * 0.8)
        px = cx + math.cos(ang) * sp * ease_out(k) * 1.5
        py = gy + math.sin(ang) * sp * ease_out(k) * 0.4
        c = int(lerp(200, 140, k))
        d.ellipse([px - r, py - r, px + r, py + r], fill=(c, c - 10, c - 25))


def camera(img, zoom, cx, cy):
    if zoom <= 1.001:
        return img
    cw, ch = W / zoom, H / zoom
    x0 = clamp(cx - cw / 2, 0, W - cw)
    y0 = clamp(cy - ch / 2, 0, H - ch)
    return img.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, H), Image.BILINEAR)


def shake(img, amount, t):
    if amount < 0.5:
        return img
    rnd = random.Random(int(t * 1000))
    out = Image.new("RGB", (W, H), INK)
    out.paste(img, (int(rnd.uniform(-amount, amount)), int(rnd.uniform(-amount, amount))))
    return out


def flash(img, k, color=(255, 255, 255)):
    if k <= 0:
        return img
    return Image.blend(img, Image.new("RGB", (W, H), color), clamp(k))


def fade_black(img, k):
    if k >= 1:
        return img
    return Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), img, clamp(k))


def watermark(d):
    d.rounded_rectangle([W - 330, 70, W - 40, 150], radius=40, fill=(255, 140, 40),
                        outline=INK, width=5)
    text(d, (W - 185, 108), CHANNEL_TE, 40, (255, 255, 255), stroke=4, telugu=True)


# ------------------------------------------------------------------ audio
class Track:
    def __init__(self, duration):
        self.n = int(SR * duration)
        self.buf = np.zeros(self.n)
        self.rng = np.random.default_rng(7)

    def add(self, sig, at, gain=1.0):
        i = int(at * SR)
        if i >= self.n or i + len(sig) <= 0:
            return
        s = sig
        if i < 0:
            s, i = s[-i:], 0
        j = min(self.n, i + len(s))
        self.buf[i:j] += s[: j - i] * gain

    def noise(self, sec):
        return self.rng.uniform(-1, 1, int(sec * SR))

    def save(self, path, peak=0.9):
        out = self.buf / max(1e-9, np.max(np.abs(self.buf))) * peak
        pcm = (out * 32767).astype(np.int16)
        with wave.open(path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SR)
            wf.writeframes(pcm.tobytes())


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def env(x, attack=0.005, decay=0.2):
    return np.minimum(1, x / attack) * np.exp(-x / decay)


def lowpass(sig, width):
    """Cheap low-pass: moving average over `width` samples."""
    if width <= 1:
        return sig
    k = np.ones(int(width)) / int(width)
    return np.convolve(sig, k, mode="same")


def highpass(sig, width):
    return sig - lowpass(sig, width)


def sweep(f0, f1, sec, shape=np.sin):
    x = tt(sec)
    f = np.linspace(f0, f1, len(x))
    return shape(2 * np.pi * np.cumsum(f) / SR)


def note_hz(semitones_from_a4):
    return 440.0 * 2 ** (semitones_from_a4 / 12)


def flute(freq, sec):
    x = tt(sec)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * x)
    ph = 2 * np.pi * np.cumsum(freq * vib) / SR
    tone = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    e = np.minimum(1, x / 0.04) * np.minimum(1, np.maximum(0, (sec - x) / 0.08))
    return tone * e


def pluck(freq, sec=0.35):
    x = tt(sec)
    return (np.sin(2 * np.pi * freq * x) + 0.5 * np.sin(4 * np.pi * freq * x)) * env(x, 0.002, 0.07)


def drum(freq=170, sec=0.3, drop=2.0):
    """Tabla-like pitched drum."""
    x = tt(sec)
    f = freq * (1 + drop * np.exp(-x * 40))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(x, 0.001, 0.09)


def boom(track, at, gain=1.0):
    x = tt(1.6)
    low = np.sin(2 * np.pi * np.cumsum(35 + 90 * np.exp(-x * 7)) / SR) * env(x, 0.002, 0.5)
    rumble = lowpass(track.noise(1.6), 60) * env(x, 0.002, 0.45) * 6
    crack = track.noise(1.6) * env(x, 0.0005, 0.04)
    track.add(low + rumble + crack, at, gain)


def firework_sfx(track, launch_at, burst_at, gain=0.3):
    up = burst_at - launch_at
    whistle = sweep(700, 2200, up) * np.linspace(0.2, 1, int(up * SR))
    track.add(whistle, launch_at, gain * 0.35)
    x = tt(1.2)
    bang = lowpass(track.noise(1.2), 20) * env(x, 0.001, 0.25) * 3
    track.add(bang, burst_at, gain)
    for i in range(14):  # crackle
        c = track.noise(0.03) * env(tt(0.03), 0.0005, 0.006)
        track.add(c, burst_at + 0.25 + i * 0.05 + track.rng.uniform(0, 0.04), gain * 0.5)


# ------------------------------------------------------------------ encode
def render(frame_fn, duration, audio_fn, output, progress_every=90):
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "audio.wav")
        print("Making music + sound effects...")
        audio_fn(wav)
        print("Rendering frames...")
        cmd = ["ffmpeg", "-y", "-loglevel", "error",
               "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
               "-i", wav,
               "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
               # even out loud hits vs. quiet ambience, then match YouTube loudness (-14 LUFS)
               "-af", "acompressor=threshold=-24dB:ratio=4:attack=5:release=120,"
                      "loudnorm=I=-14:TP=-1.5:LRA=11",
               "-c:a", "aac", "-b:a", "192k", "-ar", str(SR), "-shortest", "-movflags", "+faststart", output]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        total = int(duration * FPS)
        for i in range(total):
            ff.stdin.write(frame_fn(i / FPS).tobytes())
            if i % progress_every == 0:
                print(f"  frame {i}/{total}")
        ff.stdin.close()
        if ff.wait() != 0:
            raise SystemExit("ffmpeg failed")
    print("Done ->", output)
