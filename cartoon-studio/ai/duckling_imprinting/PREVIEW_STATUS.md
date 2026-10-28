# Duckling Imprinting – AI Preview Status

**Status: BLOCKED – the MuAPI account has no credits.** No images were generated, and nothing was charged.

## What happened (2026-10-28)
- `MUAPI_API_KEY` is set in the environment and the API accepted it.
- Pipeline cloned: `Anil-matcha/zack-d-films-ai-video-generator`. `beats.json` was copied in as-is; no field changes were needed.
- First paid call: character sheet `chinni_duckling_turnaround` on model `nano-banana-2` (16:9).
  Response:
  ```
  HTTP 402 {"error":{"code":"INSUFFICIENT_CREDITS","message":"Insufficient credit balance","topup_url":"https://muapi.ai/topup"}}
  ```
- `GET /api/v1/account/balance` → `"balance": 0.0` USD.
- I stopped there, as instructed, and did not retry. The mother duck sheet, the boy sheet and the two keyframes (beat_1_b, beat_3_b) were **not** attempted. Video and audio stages were not run.

## To unblock
1. Top up the MuAPI account at https://muapi.ai/topup. A few USD covers 3 sheets + 2 keyframes.
2. Re-run the preview. Planned calls:
   - Sheets: `nano-banana-2`, 16:9. Each prompt uses the full character description from `beats.json`, not just the sheet name.
   - Keyframes: `nano-banana-2-edit` with the character-sheet images as references, 9:16, falling back to text-only `nano-banana-2`.
   - Style: Pixar-like stylized 3D, soft fluffy feathers, big glossy expressive eyes, warm golden cinematic light, shallow depth of field.

## Notes on the upstream scripts
- `character_sheets.py` builds its prompt from the sheet *name* only (e.g. "chinni duckling turnaround") and ignores the `characters` descriptions.
- `provider.generate_image` always adds "Zack D Films… plasticine clay" to the prompt. That conflicts with the fluffy Pixar look we want.
- `keyframes.py` renders every shot and can't be limited to selected ones. It never sends the reference images.
- When a call fails, the scripts quietly write fake "MOCK" image files instead of reporting the error.

For these reasons the preview uses a small custom driver that calls the same MuAPI endpoints.
