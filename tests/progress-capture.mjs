// Captures the end-of-match card (decision timeline, stickers) and the progress notebook, desktop and phone.
// Needs the dev server on :5216.  Usage: node tests/progress-capture.mjs <outDir>
import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [w, h, tag] of [[1280, 720, 'd'], [390, 844, 'm']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:5216/');
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && window.__game);
  await page.evaluate(() => localStorage.clear());
  await page.addScriptTag({ path: new URL('./autoplay.js', import.meta.url).pathname, type: 'module' });
  await page.waitForFunction(() => window.autoplayLevel);
  for (const [id, s] of [[1, 'odds'], [2, 'odds'], [5, 'alwaysRival'], [3, 'odds']]) {
    const r = await page.evaluate(([id, s]) => window.autoplayLevel(id, { strategy: s }), [id, s]);
    console.log(tag, id, s, JSON.stringify(r.result && { passed: r.result.passed, c: r.result.matchCorrect + '/' + r.result.matchDecisions }));
  }
  await page.evaluate(() => window.advanceTime(1500));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/13-result-${tag}.jpg`, quality: 85 });
  await page.click('#ov-select');
  await page.evaluate(() => window.advanceTime(300));
  await page.click('#btn-notebook');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/14-notebook-${tag}.jpg`, quality: 85 });
  await page.evaluate(() => (document.getElementById('panel-box').scrollTop = 9999));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/14b-stickers-${tag}.jpg`, quality: 85 });
  console.log(tag, errors.length ? errors : 'no errors');
}
await browser.close();
