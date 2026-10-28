#!/usr/bin/env python3
"""Soundtrack for "Can the ball escape?" from the simulation's event list.

Every bounce plays the next note of Ode to Joy (Beethoven, public domain) on a bell;
each ring break adds a shatter + chime and lifts the key one semitone; the escape
gets a fanfare.  Usage: python3 ball_escape_audio.py events.json duration out.wav
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from engine import SR, Track, env, highpass, lowpass, note_hz, sweep, tt  # noqa: E402

MELODY = [7, 7, 8, 10, 10, 8, 7, 5, 3, 3, 5, 7, 7, 5, 5,
          7, 7, 8, 10, 10, 8, 7, 5, 3, 3, 5, 7, 5, 3, 3]


def bell(freq, sec=0.9):
    x = tt(sec)
    s = (np.sin(2 * np.pi * freq * x) + 0.45 * np.sin(2 * np.pi * freq * 2.01 * x)
         + 0.2 * np.sin(2 * np.pi * freq * 3.02 * x) * np.exp(-x * 9))
    return s * env(x, 0.002, 0.35)


def shatter(rng):
    d = 0.6
    glass = highpass(rng.uniform(-1, 1, int(d * SR)), 2) * env(tt(d), 0.001, 0.12)
    thump = np.sin(2 * np.pi * np.cumsum(60 + 120 * np.exp(-tt(d) * 25)) / SR) * env(tt(d), 0.002, 0.15)
    for k in range(8):                                          # tinkling fragments
        f = rng.uniform(2500, 5000)
        b = np.sin(2 * np.pi * f * tt(0.08)) * env(tt(0.08), 0.001, 0.02)
        i = int(rng.uniform(0.05, 0.5) * SR)
        glass[i:i + len(b)] += b * 0.6
    return glass * 0.7 + thump


def main(events_path, duration, out):
    events = json.load(open(events_path))
    tr = Track(duration)
    rng = np.random.default_rng(1)
    end_t = next((e["t"] for e in events if e["type"] == "end"), duration - 4)
    # tension pad: low drone that rises as rings break
    x = np.arange(tr.n) / SR
    breaks = [e["t"] for e in events if e["type"] == "break"]
    shift = np.array([sum(1 for b in breaks if b <= xi) for xi in x[::441]]).repeat(441)[: tr.n]
    f = 55 * 2 ** (shift / 12)
    pad = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    pad *= np.clip(x / 1.0, 0, 1) * np.clip((end_t + 0.3 - x) / 0.3, 0, 1)
    tr.add(lowpass(pad, 20), 0, 0.12)
    key, i = 0, 0
    for e in events:
        if e["type"] == "bounce":
            tr.add(bell(note_hz(MELODY[i % len(MELODY)] + key)), e["t"], 0.32)
            i += 1
        elif e["type"] == "break":
            tr.add(shatter(rng), e["t"], 0.5)
            tr.add(bell(note_hz(19 + key), 1.2), e["t"], 0.35)
            key = min(key + 1, 12)
        elif e["type"] == "end":
            for k, n in enumerate([3, 7, 10, 15, 19, 22, 27]):
                tr.add(bell(note_hz(n), 1.5), e["t"] + 0.1 + k * 0.09, 0.4)
            tr.add(lowpass(rng.uniform(-1, 1, int(1.2 * SR)), 10) * np.sin(np.pi * tt(1.2) / 1.2) * 2, e["t"], 0.4)
    # end card "pop"
    tr.add(sweep(400, 1300, 0.15) * env(tt(0.15), 0.002, 0.05), end_t + 3.1, 0.5)
    tr.save(out)


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]), sys.argv[3])
