#!/usr/bin/env python3
"""
Naa Idea story-video editor: narration lines + pictures/clips -> finished Shorts video.

Put everything for one story in a folder:

    story.txt          one line per scene:  NN | mood | sfx,sfx | subtitle text
    01.mp3  01.png     narration + visual for scene 01 (audio: mp3/wav/m4a/aac/ogg,
    02.mp3  02.mp4     visual: png/jpg/jpeg/webp image or mp4/mov/webm clip)
    ...

mood  : happy | sad | tense | excited | calm      (picks the background music)
sfx   : birds, water, wind, rain (ambience for the whole scene)
        whoosh, chime, pop, quack, heartbeat, thunder, footsteps (one-shots)
        leave empty or "-" for none.

The editor cleans the voice (high-pass, de-noise, compression), trims silences,
times each scene to its narration, animates still images (slow zoom / pan),
cross-fades scenes, burns in Telugu subtitles, scores music that ducks under the
voice, adds the sound effects, and loudness-normalises the mix for YouTube.

Usage:  python3 make_story_video.py stories/duckling -o duckling.mp4
"""
import argparse
import math
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw

import engine
from engine import (FPS, SR, H, W, Track, clamp, drum, ease_back, ease_out, env, flute, font,
                    highpass, lowpass, note_hz, pluck, prog, sweep, tt)

AUDIO_EXT = (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac")
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")
VIDEO_EXT = (".mp4", ".mov", ".webm", ".mkv")
LEAD_IN = 0.4          # silence before the first line
PAD = 0.45             # breathing room after each line
XFADE = 0.5            # cross-fade between scenes
SUB_Y = 1290           # subtitle centre (kept above the Shorts/Reels UI)


# ------------------------------------------------------------------ story parsing
def parse_story(folder):
    path = os.path.join(folder, "story.txt")
    if not os.path.exists(path):
        sys.exit(f"Missing {path}")
    scenes, missing = [], []
    for raw in open(path, encoding="utf-8"):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 4:
            sys.exit(f"Bad line in story.txt (need 4 parts separated by |): {line}")
        num, mood, sfx, text = parts[0], parts[1].lower(), parts[2], "|".join(parts[3:])
        files = os.listdir(folder)
        audio = next((f for f in files if os.path.splitext(f)[0] == num and f.lower().endswith(AUDIO_EXT)), None)
        visual = next((f for f in files if os.path.splitext(f)[0] == num and f.lower().endswith(IMAGE_EXT + VIDEO_EXT)), None)
        if not audio:
            missing.append(f"{num}.mp3 (narration)")
        if not visual:
            missing.append(f"{num}.png or {num}.mp4 (picture/clip)")
        scenes.append(dict(num=num, mood=mood, text=text,
                           sfx=[s.strip().lower() for s in sfx.split(",") if s.strip() not in ("", "-")],
                           audio=audio and os.path.join(folder, audio),
                           visual=visual and os.path.join(folder, visual)))
    if missing:
        sys.exit("Missing files:\n  " + "\n  ".join(missing))
    return scenes


# ------------------------------------------------------------------ audio
VOICE_FILTER = ("highpass=f=80,afftdn=nf=-25,"
                "acompressor=threshold=-20dB:ratio=3:attack=5:release=80,"
                "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
                "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse")


def load_voice(path):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-af", VOICE_FILTER,
                          "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).astype(np.float64)


CHORDS = {   # semitones from A4 for each mood's 4-chord loop
    "happy": [[-9, -5, -2], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]],        # C  F  Am G-ish
    "calm": [[-9, -5, -2], [-12, -9, -5], [-4, 0, 3], [-7, -3, 0]],
    "excited": [[-9, -5, -2], [-2, 2, 5], [-7, -3, 0], [-4, 0, 3]],
    "sad": [[-12, -9, -5], [-16, -12, -9], [-7, -4, 0], [-14, -10, -7]],  # Am F C G (low)
    "tense": [[-21, -18, -14], [-20, -17, -13], [-21, -18, -14], [-22, -19, -15]],
}


def pad_chord(notes, sec, bright=0.3):
    x = tt(sec)
    s = sum(np.sin(2 * np.pi * note_hz(n) * x) + bright * np.sin(4 * np.pi * note_hz(n) * x) for n in notes)
    fade = np.minimum(1, x / 0.6) * np.minimum(1, (sec - x) / 0.6)
    return s * fade / len(notes)


def music_for(mood, sec):
    """Background score for one scene, `sec` long."""
    tr = Track(sec + 0.01)
    chords = CHORDS.get(mood, CHORDS["calm"])
    bar = {"happy": 2.0, "calm": 3.0, "excited": 1.6, "sad": 3.2, "tense": 2.4}.get(mood, 2.5)
    t, i = 0.0, 0
    while t < sec:
        ch = chords[i % len(chords)]
        tr.add(pad_chord(ch, bar + 0.6, 0.15 if mood in ("sad", "tense") else 0.3), t, 0.18)
        if mood in ("happy", "excited", "calm"):
            step = bar / (8 if mood == "excited" else 4)
            for k in range(int(bar / step)):
                n = ch[k % 3] + 12 + (12 if k % 4 == 3 else 0)
                tr.add(pluck(note_hz(n), 0.5), t + k * step, 0.22 if mood != "calm" else 0.14)
            if mood == "excited":
                for k in range(4):
                    tr.add(drum(110 if k % 2 == 0 else 300, 0.25, 1.2), t + k * bar / 4, 0.3)
        elif mood == "sad":
            for k, n in enumerate([ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12]):
                tr.add(pluck(note_hz(n), 1.2) * 0.8, t + k * bar / 4, 0.2)
        elif mood == "tense":
            for k in range(2):  # heartbeat-like pulse
                tr.add(drum(60, 0.3, 0.5), t + k * bar / 2, 0.35)
                tr.add(drum(55, 0.3, 0.5), t + k * bar / 2 + 0.22, 0.25)
        t += bar
        i += 1
    return tr.buf[: int(sec * SR)]


def sfx_ambience(kind, sec, rng):
    n = int(sec * SR)
    x = np.arange(n) / SR
    if kind == "birds":
        out = np.zeros(n)
        t = 0.2
        while t < sec - 0.5:
            f0 = rng.uniform(2500, 4500)
            for k in range(rng.integers(2, 5)):
                s = sweep(f0, f0 * rng.uniform(1.1, 1.5), 0.07) * env(tt(0.07), 0.005, 0.03)
                i = int((t + k * 0.1) * SR)
                out[i:i + len(s)] += s[: max(0, min(len(s), n - i))]
            t += rng.uniform(0.6, 1.8)
        return out * 0.35
    if kind == "water":
        noise = rng.uniform(-1, 1, n)
        return lowpass(noise, 18) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * x)) * 1.6
    if kind == "wind":
        noise = rng.uniform(-1, 1, n)
        return lowpass(noise, 60) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.15 * x) ** 2) * 4
    if kind == "rain":
        noise = rng.uniform(-1, 1, n)
        return highpass(noise, 4) * 0.25
    return None


def sfx_oneshot(kind, rng):
    if kind == "whoosh":
        d = 0.6
        return lowpass(rng.uniform(-1, 1, int(d * SR)), 12) * np.sin(np.pi * tt(d) / d) * 2.5
    if kind == "chime":
        out = np.zeros(int(1.2 * SR))
        for i, f in enumerate([1568, 2093, 2637, 3136]):
            s = np.sin(2 * np.pi * f * tt(0.6)) * env(tt(0.6), 0.002, 0.2)
            out[int(i * 0.08 * SR):int(i * 0.08 * SR) + len(s)] += s
        return out * 0.5
    if kind == "pop":
        return sweep(400, 1200, 0.12) * env(tt(0.12), 0.002, 0.04)
    if kind == "quack":
        out = np.zeros(int(0.7 * SR))
        for k in range(2):
            x = tt(0.18)
            f = 520 * (1 - 0.25 * x / 0.18)
            saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
            s = lowpass(saw, 3) * env(x, 0.01, 0.09)
            out[int(k * 0.25 * SR):int(k * 0.25 * SR) + len(s)] += s
        return out * 0.6
    if kind == "heartbeat":
        out = np.zeros(int(2.0 * SR))
        for k in range(2):
            for off, f in ((0, 60), (0.22, 52)):
                s = drum(f, 0.3, 0.4)
                i = int((k * 0.9 + off) * SR)
                out[i:i + len(s)] += s
        return out
    if kind == "thunder":
        d = 2.5
        return lowpass(rng.uniform(-1, 1, int(d * SR)), 80) * env(tt(d), 0.05, 0.9) * 6
    if kind == "footsteps":
        out = np.zeros(int(1.6 * SR))
        for k in range(6):
            s = drum(140, 0.08, 0.4) + rng.uniform(-1, 1, int(0.08 * SR)) * env(tt(0.08), 0.001, 0.01) * 0.3
            i = int(k * 0.25 * SR)
            out[i:i + len(s)] += s
        return out * 0.5
    return None


def build_audio(scenes, total, wav_path):
    n = int(total * SR) + SR
    voice, music, fx = np.zeros(n), np.zeros(n), np.zeros(n)
    rng = np.random.default_rng(11)
    for sc in scenes:
        i = int(sc["v_start"] * SR)
        v = sc["voice"]
        voice[i:i + len(v)] += v
        a, b = sc["start"] - XFADE / 2, sc["end"] + XFADE / 2
        a = max(0.0, a)
        m = music_for(sc["mood"], b - a)
        fade = np.minimum(1, np.arange(len(m)) / (XFADE * SR)) * np.minimum(1, (len(m) - np.arange(len(m))) / (XFADE * SR))
        j = int(a * SR)
        music[j:j + len(m)] += (m * fade)[: n - j]
        for kind in sc["sfx"]:
            amb = sfx_ambience(kind, b - a, rng)
            if amb is not None:
                L = min(len(amb), len(fade), n - j)
                fx[j:j + L] += amb[:L] * fade[:L] * 0.12
                continue
            shot = sfx_oneshot(kind, rng)
            if shot is None:
                print(f"  (unknown sound effect '{kind}' in scene {sc['num']} - skipped)")
                continue
            k = int((sc["start"] + 0.1) * SR)
            fx[k:k + len(shot)] += shot[: n - k] * 0.3
    # duck music + ambience under the narration
    level = np.convolve(np.abs(voice), np.ones(int(0.05 * SR)) / int(0.05 * SR), mode="same")
    speaking = np.convolve((level > 0.01).astype(float), np.ones(int(0.4 * SR)) / int(0.4 * SR), mode="same")
    duck = 1 - 0.55 * np.clip(speaking * 1.5, 0, 1)
    vpeak = max(1e-6, np.max(np.abs(voice)))
    mix = voice / vpeak * 0.9 + music * 0.5 * duck + fx * duck
    t = Track(n / SR)
    t.buf = mix
    t.save(wav_path)


# ------------------------------------------------------------------ visuals
def cover(img, w, h):
    k = max(w / img.width, h / img.height)
    img = img.resize((math.ceil(img.width * k), math.ceil(img.height * k)), Image.LANCZOS)
    x, y = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))


class StillShot:
    """Slow Ken-Burns move over a picture (zoom in / zoom out / pan, by scene index)."""
    OVER = 1.18

    def __init__(self, path, idx, dur):
        self.big = cover(Image.open(path).convert("RGB"), int(W * self.OVER), int(H * self.OVER))
        self.idx, self.dur = idx, dur

    def frame(self, t):
        k = ease_out(clamp(t / self.dur)) * 0.85 + clamp(t / self.dur) * 0.15
        mode = self.idx % 4
        z = {0: 1 + 0.15 * k, 1: 1.15 - 0.15 * k, 2: 1.1, 3: 1.1}[mode]
        cw, ch = W * self.OVER / z, H * self.OVER / z
        bw, bh = self.big.width, self.big.height
        cx = bw / 2 + (((k - 0.5) * 2) * (bw - cw) / 2 * (1 if mode == 2 else -1) if mode >= 2 else 0)
        cy = bh / 2
        box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
        return self.big.resize((W, H), Image.BILINEAR, box=box)


class ClipShot:
    """Video clip scaled to fill 9:16, looped if shorter than the scene."""

    def __init__(self, path, dur):
        self.proc = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-stream_loop", "-1", "-i", path, "-t", f"{dur + 1:.2f}",
             "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}",
             "-an", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.last, self.n = None, -1

    def __del__(self):
        self.proc.kill()

    def frame(self, t):
        want = int(t * FPS)
        while self.n < want:
            buf = self.proc.stdout.read(W * H * 3)
            if len(buf) < W * H * 3:
                break
            self.last = Image.frombuffer("RGB", (W, H), buf)
            self.n += 1
        return self.last if self.last is not None else Image.new("RGB", (W, H))


# ------------------------------------------------------------------ subtitles
def is_telugu(ch):
    return "ఀ" <= ch <= "౿" or ch in "‌‍"


def runs(text):
    out = []
    for ch in text:
        tel = is_telugu(ch)
        if out and out[-1][0] == tel:
            out[-1][1] += ch
        else:
            out.append([tel, ch])
    return out


def draw_mixed(d, text, cx, cy, size, fill=(255, 255, 255), stroke=9):
    """Telugu + punctuation/Latin in one line (the Telugu font has only Telugu glyphs)."""
    parts = [(font(size, tel), s) for tel, s in runs(text)]
    widths = [d.textlength(s, font=f) for f, s in parts]
    x = cx - sum(widths) / 2
    for (f, s), w in zip(parts, widths):
        d.text((x, cy), s, font=f, fill=fill, anchor="lm", stroke_width=stroke, stroke_fill=(10, 8, 12))
        x += w


def chunks(text, max_chars=22):
    words = text.replace("...", "… ").split()
    out, cur = [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > max_chars:
            out.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        out.append(cur)
    return out


def subtitle_timeline(sc):
    parts = chunks(sc["text"])
    total = sum(len(p) for p in parts) or 1
    t, dur, out = sc["v_start"], sc["v_dur"], []
    for p in parts:
        d = dur * len(p) / total
        out.append((t, t + d, p))
        t += d
    return out


def draw_subscribe(d, k, t):
    if k <= 0:
        return
    s = ease_back(clamp(k)) * (1 + 0.04 * math.sin(t * 8))
    bw, bh, cy = 300 * s, 62 * s, 1500
    d.rounded_rectangle([W / 2 - bw, cy - bh, W / 2 + bw, cy + bh], radius=int(30 * s) + 1,
                        fill=(225, 20, 30), outline=(255, 255, 255), width=6)
    d.text((W / 2, cy), "SUBSCRIBE", font=font(int(64 * s)), fill=(255, 255, 255), anchor="mm")


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder")
    ap.add_argument("-o", "--output", default="story.mp4")
    ap.add_argument("--no-subtitles", action="store_true")
    ap.add_argument("--no-subscribe", action="store_true")
    args = ap.parse_args()

    scenes = parse_story(args.folder)
    t = LEAD_IN
    for sc in scenes:
        sc["voice"] = load_voice(sc["audio"])
        sc["v_dur"] = len(sc["voice"]) / SR
        sc["start"] = t - (LEAD_IN if sc is scenes[0] else 0)
        sc["v_start"] = t
        t += sc["v_dur"] + PAD
        sc["end"] = t
    total = t + 0.6
    scenes[-1]["end"] = total
    print(f"{len(scenes)} scenes, {total:.1f} s")
    for i, sc in enumerate(scenes):
        sc["subs"] = subtitle_timeline(sc)
        sc["shot_dur"] = sc["end"] - sc["start"] + XFADE

    shots = {}

    def shot(i):
        if i not in shots:
            sc = scenes[i]
            ext = os.path.splitext(sc["visual"])[1].lower()
            shots[i] = (ClipShot(sc["visual"], sc["shot_dur"]) if ext in VIDEO_EXT
                        else StillShot(sc["visual"], i, sc["shot_dur"]))
            for old in [k for k in shots if k < i - 1]:
                del shots[old]
        return shots[i]

    def frame(tf):
        i = next((k for k, sc in enumerate(scenes) if tf < sc["end"]), len(scenes) - 1)
        sc = scenes[i]
        img = shot(i).frame(tf - sc["start"] + XFADE / 2)
        if i + 1 < len(scenes) and tf > sc["end"] - XFADE / 2:          # cross-fade into next
            k = prog(tf, sc["end"] - XFADE / 2, sc["end"] + XFADE / 2)
            nxt = scenes[i + 1]
            img = Image.blend(img, shot(i + 1).frame(tf - nxt["start"] + XFADE / 2), k)
        elif i > 0 and tf < sc["start"] + XFADE / 2:                       # tail of the fade in
            k = prog(tf, sc["start"] - XFADE / 2, sc["start"] + XFADE / 2)
            prev = scenes[i - 1]
            img = Image.blend(shot(i - 1).frame(tf - prev["start"] + XFADE / 2), img, k)
        d = ImageDraw.Draw(img)
        if not args.no_subtitles:
            for s in sc["subs"]:
                if s[0] <= tf < s[1] + 0.15:
                    pk = ease_back(prog(tf, s[0], s[0] + 0.15))
                    draw_mixed(d, s[2], W / 2, SUB_Y, int(66 * (0.85 + 0.15 * pk)))
        if not args.no_subscribe and i == len(scenes) - 1:
            draw_subscribe(d, prog(tf, sc["start"] + 0.3, sc["start"] + 0.7), tf)
        if tf < 0.3:
            img = engine.fade_black(img, tf / 0.3)
        if tf > total - 0.5:
            img = engine.fade_black(img, (total - tf) / 0.5)
        return img

    engine.render(frame, total, lambda p: build_audio(scenes, total, p), args.output)


if __name__ == "__main__":
    main()
