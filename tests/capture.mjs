// Real gameplay captures at the same viewport and moments as the mockups in docs/visual-targets/.
// Inputs are real clicks/keys; game time is stepped with window.advanceTime.  Needs a server (default :4216 preview).
// Usage: BASE=http://localhost:4216/ node tests/capture.mjs [outDir]   (BROWSER=firefox|webkit for another engine)
import { chromium, firefox, webkit } from 'playwright';
import { toGoal } from './helpers-browser.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'docs/captures';
mkdirSync(out, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4216/';
const engine = process.env.BROWSER ?? 'chrome';
const browser =
  engine === 'firefox' ? await firefox.launch() : engine === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];

async function open(viewport, mobile = false) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile && engine !== 'firefox' });
  const p = await ctx.newPage();
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(BASE);
  await p.waitForFunction(() => window.__game && typeof window.render_game_to_text === 'function');
  await p.evaluate(() => localStorage.clear());
  return p;
}
const state = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const adv = (p, ms) => p.evaluate((m) => window.advanceTime(m), ms);
const shot = async (p, name) => {
  await adv(p, 34); // let the compositor catch the last frame
  await p.waitForTimeout(500); // CSS entrance animations run in real time
  await p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 86 });
  console.log('captured', name);
};
async function untilMyMove(p, maxMs = 30000) {
  for (let t = 0; t < maxMs; t += 250) {
    const s = await state(p);
    if (s.result) return s;
    if (await p.isVisible('#explain:not(.hidden)')) await p.click('#explain-ok');
    if (s.yourMove || s.screen === 'shop') return s;
    await adv(p, 250);
  }
  return state(p);
}
async function startLevel(p, id) {
  await p.evaluate((id) => window.__game.startLevel(id), id);
  await toGoal(p);
  await p.click('#goal-go');
}

const W = { width: 1672, height: 941 };

// 01 — first 30 seconds: level 1, your first call on 1 pie + 2 duds, token placed on the probability scale
{
  const p = await open(W);
  await p.click('#btn-play');
  await adv(p, 300);
  await shot(p, '00a-booth-card');
  await p.click('#booth-go');
  await adv(p, 400);
  await shot(p, '00b-versus');
  await toGoal(p);
  await shot(p, '00-goal-card');
  await p.click('#goal-go');
  await untilMyMove(p);
  const box = await p.locator('#scale-track').boundingBox();
  await p.mouse.click(box.x + box.width / 3, box.y + box.height / 2);
  await adv(p, 300);
  await shot(p, '01-first-30s');

  // 02 — the splat: fire at yourself on 1/3 (dud → dare bonus), then splat Bubu on the certain pie
  await p.keyboard.press('2');
  for (let t = 0; t < 12000; t += 100) {
    await adv(p, 100);
    const s = await state(p);
    if (s.stage.rivals[0].creamBlobs > 0) break;
  }
  await shot(p, '02a-dare-bonus-splat');
  let s = await untilMyMove(p);
  if (s.pNextPie === '1/1') {
    await p.keyboard.press('1');
    // step to the moment just after impact (comic burst on screen)
    for (let t = 0; t < 8000; t += 50) {
      await adv(p, 50);
      if (await p.isVisible('#comic:not(.hidden)')) break;
    }
    await adv(p, 120);
    await shot(p, '02-core-splat');
  }
  await p.context().close();
}

// 03 — failure: aim at yourself when pies are likelier (≥ 3/4) and get creamed, with the worked explanation
{
  const p = await open(W);
  let done = false;
  for (let attempt = 0; attempt < 8 && !done; attempt++) {
    await startLevel(p, 1);
    for (let k = 0; k < 30 && !done; k++) {
      const s = await untilMyMove(p);
      if (s.result) break;
      const [n, d] = (s.pNextPie ?? '0/1').split('/').map(Number);
      if (d > 1 && n / d >= 0.74 && n < d) {
        await p.keyboard.press('2');
        for (let t = 0; t < 9000; t += 100) {
          await adv(p, 100);
          if (await p.isVisible('#explain:not(.hidden)')) {
            const st2 = await state(p);
            if (st2.lastExplain === 'selfOnPies') {
              await adv(p, 400);
              await shot(p, '03-fail-self-cream');
              done = true;
            }
            break;
          }
        }
      } else await p.keyboard.press(n / d > 0.5 ? '1' : '2');
      await adv(p, 400);
    }
  }
  if (!done) console.log('03: no 3/4 self-cream found in 8 attempts');
  await p.context().close();
}

// 04 — the midway (level select) with some progress
{
  const p = await open(W);
  await p.evaluate(() => {
    const g = window.__game;
    Object.assign(g.save.passed, { 1: true, 2: true, 3: true, 4: true, 5: true });
    Object.assign(g.save.stars, { 1: 3, 2: 3, 3: 2, 4: 3, 5: 1 });
    g.showSelect();
  });
  await adv(p, 300);
  await shot(p, '04-booth-select');
  await p.context().close();
}

// 05 — card shop between rounds (level 6: Grandma Rina)
{
  const p = await open(W);
  await startLevel(p, 6);
  for (let k = 0; k < 40; k++) {
    const s = await untilMyMove(p);
    if (s.screen === 'shop' || s.result) break;
    await p.keyboard.press(s.best?.[0] === 'self' ? '2' : '1');
    await adv(p, 300);
  }
  await adv(p, 600);
  await shot(p, '05-card-shop');
  await p.context().close();
}

// extra gameplay: flavor light + two-way table (L11), area model (L12), spinner vs Robo-Clown (L14), mystery cannon (L16), rooftop final (L17)
for (const [id, name] of [
  [11, '06-flavor-table'],
  [12, '07-area-model'],
  [14, '08-spinner-robo'],
  [16, '09-mystery-tests'],
  [17, '10-rooftop-final'],
]) {
  const p = await open(W);
  await startLevel(p, id);
  if (id === 16) {
    await adv(p, 2500);
    for (let i = 0; i < 3; i++) {
      await p.click('#t4');
      await adv(p, 3200);
    }
  } else await untilMyMove(p);
  await shot(p, name);
  await p.context().close();
}

// phone width
{
  const p = await open({ width: 390, height: 844 }, true);
  await startLevel(p, 1);
  await untilMyMove(p);
  await shot(p, '11-mobile-390');
  await p.context().close();
}

console.log(errors.length ? 'console errors:\n' + [...new Set(errors)].join('\n') : 'no console errors');
await browser.close();
