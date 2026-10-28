#!/usr/bin/env python3
"""Sound for the Naa Idea 3D logo intro (6.5 s). Usage: python3 intro_audio.py out.wav"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from engine import SR, Track, boom, env, highpass, lowpass, note_hz, sweep, tt  # noqa: E402

D = 6.5


def bell(freq, sec=1.2):
    x = tt(sec)
    return (np.sin(2 * np.pi * freq * x) + 0.4 * np.sin(2 * np.pi * freq * 2.01 * x)) * env(x, 0.003, 0.4)


def main(out):
    tr, rng = Track(D), np.random.default_rng(2)
    # riser: noise swelling + rising tone while the galaxy collapses
    r = 1.6
    x = tt(r)
    noise = highpass(rng.uniform(-1, 1, len(x)), 3) * (x / r) ** 2
    tr.add(noise, 0.12, 0.35)
    tr.add(sweep(110, 880, r) * (x / r) ** 1.5, 0.12, 0.25)
    # impact + sparkle when the logo pops
    boom(tr, 1.72, 0.8)
    for i, n in enumerate([15, 19, 22, 27, 31]):
        tr.add(bell(note_hz(n)), 1.75 + i * 0.07, 0.3)
    # warm pad chord under the logo
    x = tt(D - 1.7)
    pad = sum(np.sin(2 * np.pi * note_hz(n) * x) for n in (-9, -5, -2, 3)) / 4
    pad *= np.minimum(1, x / 0.6) * np.minimum(1, (len(x) / SR - x) / 1.0)
    tr.add(pad, 1.7, 0.25)
    # light sweep "shing" + subtitle chime
    x = tt(0.7)
    tr.add(highpass(rng.uniform(-1, 1, len(x)), 2) * np.sin(np.pi * x / 0.7) ** 2, 3.2, 0.25)
    tr.add(bell(note_hz(27), 1.5), 3.25, 0.25)
    tr.add(bell(note_hz(22), 1.5), 3.7, 0.2)
    tr.save(out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "intro.wav")
