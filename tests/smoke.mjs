// Headless real-browser smoke run: every level played through the HUD buttons with the solver's best moves
// (and optionally a constant strategy). Needs the dev server on :5216.  Usage: node tests/smoke.mjs [strategy] [ids]
// BROWSER=firefox|webkit runs it in that engine instead of Chrome.
import { chromium, firefox, webkit } from 'playwright';
import { toGoal } from './helpers-browser.mjs';

const strategy = process.argv[2] ?? 'odds';
const ids = (process.argv[3] ?? '1-17').split(',').flatMap((r) => {
  const [a, b] = r.split('-').map(Number);
  return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
});
const engine = process.env.BROWSER ?? 'chrome';
const browser =
  engine === 'firefox' ? await firefox.launch() : engine === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(process.env.BASE ?? 'http://localhost:5216/');
await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && window.__game);
await page.addScriptTag({ path: new URL('./autoplay.js', import.meta.url).pathname, type: 'module' });
await page.waitForFunction(() => window.autoplayLevel);
let bad = 0;
for (const id of ids) {
  const t0 = Date.now();
  const r = await page.evaluate(([id, strategy, expert]) => window.autoplayLevel(id, { strategy, expert }), [id, strategy, !!process.env.EXPERT]);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.result) {
    console.log(`L${id} ${strategy}: won=${r.result.won} passed=${r.result.passed} stars=${r.result.stars} calls=${r.result.matchCorrect}/${r.result.matchDecisions} steps=${r.steps} (${secs}s)`);
  } else {
    bad++;
    console.log(`L${id} ${strategy}: ${r.stuck ? 'STUCK' : 'TIMEOUT'} (${secs}s)`, JSON.stringify(r.state).slice(0, 600), r.log.slice(-6).join(' '));
  }
}
console.log(errors.length ? `console errors (${errors.length}):\n` + [...new Set(errors)].slice(0, 10).join('\n') : 'no console errors');
await browser.close();
process.exit(bad || errors.length ? 1 : 0);
