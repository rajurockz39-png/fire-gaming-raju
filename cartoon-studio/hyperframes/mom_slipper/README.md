# Mom's Slipper – HyperFrames finishing pass

The base Short is rendered by the 2D canvas pipeline (`cartoon-studio/2d/st01_amma_chappal.js`).
HyperFrames adds the polish layer on top: a "WAIT FOR THE TWIST" hook pill (0–3 s) and a
retention progress bar along the top.

```bash
cp ../../2d/amma_chappal_preview.mp4 .
npx -y hyperframes@0.8.214 check     # lint + layout + contrast
npx -y hyperframes@0.8.214 render    # -> renders/*.mp4
```
