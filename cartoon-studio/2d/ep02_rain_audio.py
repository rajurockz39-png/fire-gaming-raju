#!/usr/bin/env python3
"""Soundtrack for EP2 "Chinni & the Rain" (no voice). Usage: python3 ep02_rain_audio.py out.wav"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from engine import SR, Track, env, highpass, lowpass, note_hz, pluck, sweep, tt  # noqa: E402
from make_story_video import music_for, sfx_ambience, sfx_oneshot  # noqa: E402

DURATION = 30.0
MUSIC = [(0.0, 5.6, "happy"), (5.4, 10.4, "tense"), (10.2, 15.2, "tense"), (15.0, 18.0, "calm"),
         (17.8, 21.6, "happy"), (21.4, 27.2, "excited"), (27.0, 30.0, "calm")]


def faded(sig, f=0.3):
    x = np.arange(len(sig))
    return sig * np.minimum(1, x / (f * SR)) * np.minimum(1, (len(sig) - x) / (f * SR))


def splash(rng):
    d = 0.35
    body = lowpass(rng.uniform(-1, 1, int(d * SR)), 6) * env(tt(d), 0.002, 0.08) * 2
    for k in range(4):
        i = int(rng.uniform(0.02, 0.2) * SR)
        b = sweep(1800, 900, 0.03) * env(tt(0.03), 0.001, 0.01)
        body[i:i + len(b)] += b * 0.5
    return body


def ribbit():
    out = np.zeros(int(0.4 * SR))
    for k in range(2):
        x = tt(0.12)
        saw = 2 * ((np.cumsum(np.full(len(x), 260.0)) / SR) % 1) - 1
        s = lowpass(saw, 3) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 45 * x))) * env(x, 0.01, 0.06)
        i = int(k * 0.16 * SR)
        out[i:i + len(s)] += s
    return out


def main(out):
    tr = Track(DURATION)
    rng = np.random.default_rng(5)
    for a, b, mood in MUSIC:
        tr.add(faded(music_for(mood, b - a)), a, 0.5)
    # ambience
    tr.add(faded(sfx_ambience("birds", 7.0, rng), 0.6), 0.0, 0.12)
    tr.add(faded(sfx_ambience("water", 7.0, rng), 0.6), 0.0, 0.08)
    rain_len = 23.0 - 6.8
    r = sfx_ambience("rain", rain_len, rng) + lowpass(rng.uniform(-1, 1, int(rain_len * SR)), 8) * 0.6
    x = np.arange(len(r)) / SR
    r *= np.clip((x - 0.2) / 3.5, 0, 1) * np.clip((rain_len - x) / 1.5, 0, 1)   # builds up, fades out
    tr.add(r, 6.8, 0.35)
    tr.add(faded(sfx_ambience("birds", 7.5, rng), 0.8), 22.5, 0.12)
    # events
    tr.add(sfx_oneshot("whoosh", rng), 0.6, 0.5)
    tr.add(sfx_oneshot("chime", rng), 1.0, 0.6)
    for n in range(7):
        tr.add(splash(rng), 0.74 + n * 0.8, 0.35)
    tr.add(sweep(1500, 700, 0.08) * env(tt(0.08), 0.002, 0.03), 7.6, 0.5)      # "plip" on her head
    tr.add(sfx_oneshot("thunder", rng), 11.0, 0.9)
    tr.add(sfx_oneshot("thunder", rng), 13.6, 0.5)
    tr.add(sfx_oneshot("heartbeat", rng), 11.5, 0.5)
    for k in range(10):                                                              # running pitter-patter
        tr.add(splash(rng) * 0.5, 12.3 + k * 0.27, 0.25)
    tr.add(sfx_oneshot("pop", rng), 15.4, 0.7)
    tr.add(sfx_oneshot("pop", rng), 15.55, 0.6)
    for at in (16.6, 17.25, 18.3, 23.8, 26.6):
        tr.add(ribbit(), at, 0.45)
    tr.add(sweep(250, 800, 0.25) * env(tt(0.25), 0.005, 0.12), 17.7, 0.35)          # frog hop boing
    tr.add(splash(rng), 18.65, 0.5)
    for k in range(6):                                                               # giggles (peeps)
        tr.add(sweep(2400, 3200, 0.07) * env(tt(0.07), 0.003, 0.03), 18.3 + k * 0.22, 0.2)
    for i, n in enumerate([3, 7, 10, 15, 19, 22]):                                   # rainbow arpeggio
        tr.add(pluck(note_hz(n), 0.9), 22.6 + i * 0.13, 0.3)
    for n in range(3):
        tr.add(splash(rng), 23.5 + 0.83 + n * 0.9, 0.55)
    tr.add(sfx_oneshot("quack", rng), 25.6, 0.55)
    tr.add(sfx_oneshot("chime", rng), 27.3, 0.6)
    tr.add(sfx_oneshot("pop", rng), 27.8, 0.8)
    tr.save(out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ep02_rain.wav")
