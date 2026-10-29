#!/usr/bin/env python3
"""Music + sound effects for storytime Short #1 "అమ్మ చెప్పు". Usage: python3 st01_amma_chappal_audio.py out.wav"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from engine import SR, Track, boom, drum, env, highpass, lowpass, note_hz, pluck, sweep, tt  # noqa: E402
from make_story_video import music_for, sfx_oneshot  # noqa: E402

D = 31.0
MUSIC = [(0.0, 8.2, "happy"), (10.3, 15.6, "tense"), (15.4, 21.5, "excited"), (25.4, 31.0, "happy")]


def faded(sig, f=0.25):
    x = np.arange(len(sig))
    return sig * np.minimum(1, x / (f * SR)) * np.minimum(1, (len(sig) - x) / (f * SR))


def buzzer():
    x = tt(0.45)
    saw = 2 * ((np.cumsum(np.full(len(x), 110.0)) / SR) % 1) - 1
    return lowpass(saw, 3) * np.minimum(1, (0.45 - x) / 0.05)


def wahwah():
    out = np.zeros(int(2.4 * SR))
    for i, n in enumerate([-14, -15, -16, -17.5]):
        d = 0.38 if i < 3 else 0.9
        x = tt(d)
        f = note_hz(n) * (1 + 0.03 * np.sin(2 * np.pi * 6 * x))
        saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        s = lowpass(saw, 6) * np.minimum(1, x / 0.03) * np.minimum(1, (d - x) / 0.08)
        j = int(i * 0.4 * SR)
        out[j:j + len(s)] += s
    return out


def main(out):
    tr, rng = Track(D), np.random.default_rng(4)
    for a, b, mood in MUSIC:
        tr.add(faded(music_for(mood, b - a)), a, 0.45)
    oneshot = lambda k, at, g: tr.add(sfx_oneshot(k, rng), at, g)
    oneshot("whoosh", 0.2, 0.5); oneshot("pop", 1.0, 0.7)
    oneshot("pop", 4.3, 0.7); tr.add(buzzer(), 5.0, 0.35)
    oneshot("pop", 5.6, 0.7); tr.add(buzzer(), 6.2, 0.35)
    # drum roll riser + dramatic hit for "AMMA'S CHAPPAL!"
    for k in range(18):
        tr.add(drum(180 + k * 8, 0.08, 0.5), 8.0 + k * 0.033, 0.25 + k * 0.02)
    boom(tr, 8.6, 0.8); oneshot("chime", 8.65, 0.5)
    # sneaky tiptoes, the grab, the "!"
    for i, n in enumerate([-12, -9, -12, -9, -7, -9]):
        tr.add(pluck(note_hz(n)), 10.6 + i * 0.36, 0.4)
    oneshot("pop", 12.9, 0.8); oneshot("chime", 13.0, 0.3)
    tr.add(sweep(900, 1400, 0.15) * env(tt(0.15), 0.002, 0.06), 13.3, 0.4)
    # running away, distance "ding", aiming tension
    for k in range(8):
        tr.add(drum(150, 0.08, 0.4), 15.5 + k * 0.2, 0.2)
    tr.add(pluck(note_hz(15), 0.8), 17.3, 0.4)
    oneshot("heartbeat", 20.0, 0.5)
    # slow-motion throw: long deep whoosh
    d = 1.9
    x = tt(d)
    tr.add(lowpass(rng.uniform(-1, 1, len(x)), 30) * np.sin(np.pi * x / d) * 3, 21.6, 0.6)
    tr.add(sweep(160, 90, d) * np.sin(np.pi * x / d), 21.6, 0.2)
    # BONK
    tr.add(drum(90, 0.4, 3.0), 23.4, 1.0)
    tr.add(highpass(rng.uniform(-1, 1, int(0.12 * SR)), 2) * env(tt(0.12), 0.001, 0.03), 23.4, 0.6)
    tr.add(sweep(250, 900, 0.35) * env(tt(0.35), 0.005, 0.2), 23.5, 0.4)
    for k in range(6):                                   # dizzy birdies
        tr.add(sweep(2600, 3400, 0.08) * env(tt(0.08), 0.003, 0.03), 23.9 + k * 0.18, 0.2)
    for k in range(4):                                   # Pilli munching
        tr.add(lowpass(rng.uniform(-1, 1, int(0.07 * SR)), 3) * env(tt(0.07), 0.002, 0.02), 25.1 + k * 0.14, 0.35)
    tr.add(wahwah(), 25.6, 0.35)
    oneshot("chime", 29.6, 0.6); oneshot("pop", 30.3, 0.8)
    tr.save(out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "st01.wav")
