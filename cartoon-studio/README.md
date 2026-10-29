# Naa Idea Cartoon Studio 🎬 (నా ఐడియా)

No-voice action cartoon shorts for YouTube Shorts / Instagram Reels (@naaidea39).
All animation, motion graphics, music and sound effects are generated in code: nothing copyrighted, no voices.

| File | What it is |
|---|---|
| `engine.py` | Shared engine: easing, camera zoom/shake/flash, bubbles, text (Telugu + English), synth audio, MP4 encoding |
| `characters.py` | Cast: Bujji, Peddayya, Kodi King + props (bomb, flowerpot, chair) |
| `ep01_diwali_bomb.py` | EP-1 "దీపావళి బాంబు" (38 s) → `ep01_diwali_bomb.mp4` |
| `EP01_SCRIPT.md` | EP-1 scene-by-scene script + upload title/description |
| `make_short.py` | First test short "Robot Drop" (13 s) |
| `fonts/` | Noto Sans Telugu (SIL Open Font License) |

## Make a video
```bash
pip install pillow numpy      # ffmpeg is also needed
python3 ep01_diwali_bomb.py -o ep01_diwali_bomb.mp4
```
