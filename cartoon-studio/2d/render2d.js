// Render a 2D canvas episode to frames.
//   node render2d.js story.html stills out_dir 1.5 7 12      -> PNG stills at those times
//   node render2d.js story.html video audio.wav out.mp4      -> full MP4 (30 fps) with audio
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
(async () => {
  const [page_, mode, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.log('pageerror', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
  await page.goto('file://' + path.resolve(page_));
  await page.waitForFunction('window.ready === true', null, { timeout: 60000 });
  const canvas = await page.$('canvas');
  if (mode === 'stills') {
    const [dir, ...times] = rest;
    fs.mkdirSync(dir, { recursive: true });
    for (const t of times) {
      await page.evaluate(tt => window.render(tt), parseFloat(t));
      await canvas.screenshot({ path: path.join(dir, `t${t}.png`) });
    }
  } else {
    const [audio, out] = rest;
    const dur = await page.evaluate('window.DURATION');
    const fps = 30, total = Math.round(dur * fps);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-i', audio, '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
      '-af', 'acompressor=threshold=-24dB:ratio=3:attack=5:release=120,loudnorm=I=-14:TP=-1.5:LRA=11',
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < total; i++) {
      await page.evaluate(tt => window.render(tt), i / fps);
      const buf = await canvas.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 90 === 0) console.log(`frame ${i}/${total}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('Done ->', out);
  }
  await browser.close();
})();
