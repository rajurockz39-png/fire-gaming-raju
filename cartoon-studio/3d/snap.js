// usage: node snap.js page.html out.png
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.waitForFunction('window.done', null, { timeout: 60000 });
  await p.screenshot({ path: process.argv[3] });
  await b.close();
})();
