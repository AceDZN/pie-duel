// Booth tour: one screenshot per level at its first decision (art review). Usage: BASE=... node tests/tour.mjs [ids] [outDir]
import { chromium } from 'playwright';
import { toGoal } from './helpers-browser.mjs';
import { mkdirSync } from 'node:fs';
const ids = (process.argv[2] ?? '1,5,10,14,17').split(',').map(Number);
const out = process.argv[3] ?? 'docs/captures/tour';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(process.env.BASE ?? 'http://localhost:5216/');
await p.waitForFunction(() => window.__game);
for (const id of ids) {
  await p.evaluate((id) => window.__game.startLevel(id), id);
  await toGoal(p);
  await p.click('#goal-go');
  for (let i = 0; i < 60; i++) {
    await p.evaluate(() => window.advanceTime(250));
    const s = await p.evaluate(() => JSON.parse(window.render_game_to_text()));
    if (s.yourMove || s.phase === 'test' || s.phase === 'bet') break;
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/L${String(id).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 84 });
}
console.log(errs.length ? errs.join('\n') : 'no console errors');
await b.close();
