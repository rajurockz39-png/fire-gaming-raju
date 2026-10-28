const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('err', e.message));
  await p.goto('file://' + path.resolve('story.html') + '?ep=' + process.argv[2]); await p.waitForFunction('window.ready===true');
  console.log(await p.evaluate(() => ({ dur: window.DURATION, bounces: EVENTS.filter(e => e.type === 'bounce').length, breaks: EVENTS.filter(e => e.type === 'break').map(e => e.t.toFixed(1)).join(' ') })));
  if (process.argv[3]) require('fs').writeFileSync(process.argv[3], JSON.stringify(await p.evaluate(() => EVENTS)));
  await b.close();
})();
