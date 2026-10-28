#!/usr/bin/env python3
"""Soundtrack for the 2D "Lost Duckling" demo (no voice): mood music + sound effects.

Usage: python3 duck_story_audio.py out.wav
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from engine import SR, Track, env, note_hz, pluck, sweep, tt  # noqa: E402
from make_story_video import music_for, sfx_ambience, sfx_oneshot  # noqa: E402

DURATION = 27.0
# (start, end, mood) – music segments, cross-faded
MUSIC = [(0.0, 5.7, "happy"), (5.4, 10.2, "excited"), (9.8, 12.6, "calm"), (12.3, 17.4, "sad"),
         (17.2, 19.2, "tense"), (19.0, 24.7, "happy"), (24.4, 27.0, "calm")]
AMBIENCE = [(0.0, 10.1, "birds", 0.5), (0.0, 10.1, "water", 0.35), (10.0, 19.0, "wind", 0.35),
            (19.0, 27.0, "birds", 0.4)]
ONESHOTS = [(0.8, "whoosh", 0.5), (1.2, "chime", 0.6), (5.9, "chime", 0.35), (6.5, "pop", 0.7),
            (15.0, "heartbeat", 0.55), (17.2, "quack", 0.45), (17.6, "pop", 0.5),
            (21.3, "chime", 0.7), (21.4, "quack", 0.6), (25.0, "chime", 0.6), (25.3, "pop", 0.8)]


def main(out):
    tr = Track(DURATION)
    rng = np.random.default_rng(3)
    fade = 0.3
    for a, b, mood in MUSIC:
        m = music_for(mood, b - a)
        x = np.arange(len(m))
        m = m * np.minimum(1, x / (fade * SR)) * np.minimum(1, (len(m) - x) / (fade * SR))
        tr.add(m, a, 0.55)
    for a, b, kind, g in AMBIENCE:
        s = sfx_ambience(kind, b - a, rng)
        x = np.arange(len(s))
        tr.add(s * np.minimum(1, x / (0.5 * SR)) * np.minimum(1, (len(s) - x) / (0.5 * SR)), a, g * 0.25)
    for at, kind, g in ONESHOTS:
        tr.add(sfx_oneshot(kind, rng), at, g)
    # Chinni's hops after the butterfly: little "boing" springs
    for k in range(7):
        tr.add(sweep(300, 700, 0.12) * env(tt(0.12), 0.003, 0.05), 7.9 + k * 0.35, 0.25)
    # cute peeps (duckling chirps) when it notices the butterfly and at the reunion
    for at in (6.6, 6.85, 21.0, 21.2, 21.4):
        tr.add(sweep(2600, 3400, 0.09) * env(tt(0.09), 0.004, 0.04), at, 0.22)
    # sad little piano sting when the tear falls
    for i, n in enumerate([7, 3, 0, -2]):
        tr.add(pluck(note_hz(n), 1.4), 14.6 + i * 0.45, 0.35)
    # reunion sparkle arpeggio
    for i, n in enumerate([3, 7, 10, 15, 19]):
        tr.add(pluck(note_hz(n), 0.8), 21.3 + i * 0.12, 0.3)
    tr.save(out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "duck_story.wav")
