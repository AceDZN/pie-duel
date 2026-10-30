// Plays deliberately wrong moves and records every explanation card / note it gets (text + a screenshot).
// Usage: BASE=... node tests/wrong-moves.mjs [ids] [outDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { toGoal } from './helpers-browser.mjs';
const ids = (process.argv[2] ?? '1,3,5,11,12,14,15,16').split(',').map(Number);
const out = process.argv[3] ?? 'docs/captures/wrong';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(process.env.BASE ?? 'http://localhost:5216/');
await p.waitForFunction(() => window.__game);
const st = () => p.evaluate(() => JSON.parse(window.render_game_to_text()));
for (const id of ids) {
  await p.evaluate((id) => window.__game.startLevel(id), id);
  await toGoal(p);
  await p.click('#goal-go');
  const seen = [];
  for (let i = 0; i < 200 && seen.filter((x) => !x.startsWith('TOAST')).length < (process.env.MAX ? +process.env.MAX : 2); i++) {
    await p.evaluate(() => window.advanceTime(300));
    if (await p.isVisible('#explain:not(.hidden)')) {
      const txt = (await p.innerText('#explain')).replace(/\s+/g, ' ');
      if (!seen.includes(txt)) {
        seen.push(txt);
        await p.waitForTimeout(450);
        await p.screenshot({ path: `${out}/L${String(id).padStart(2, '0')}-${seen.length}.jpg`, type: 'jpeg', quality: 80 });
      }
      await p.click('#explain-ok');
      continue;
    }
    if (await p.isVisible('#toast:not(.hidden)')) {
      const t = (await p.innerText('#toast')).replace(/\s+/g, ' ');
      if (/מזל|פליטה/.test(t) && !seen.includes('TOAST ' + t)) seen.push('TOAST ' + t);
      await p.evaluate(() => document.getElementById('toast').classList.add('hidden'));
    }
    const s = await st();
    if (s.result) break;
    if (s.screen === 'shop') { await p.click('#shop-go'); continue; }
    if (s.phase === 'test' && !s.animating) { if (await p.isEnabled('#tgo')) await p.click('#tgo'); else await p.click('#t1'); continue; }
    if (s.phase === 'bet' && !s.animating) {
      const opts = await p.$$('[data-bet]');
      const best = await p.evaluate(() => { const L = window.__game.duel.load; const pp = L.pie.n / L.pie.d, q = 1 - pp; const v = { twoPies: pp * pp, noPie: q * q, exactlyOne: 2 * pp * q, atLeastOne: 1 - q * q, pieThenDud: pp * q }; return L.options.reduce((a, o) => (v[o] > v[a] ? o : a)); });
      for (const o of opts) if ((await o.getAttribute('data-bet')) !== best) { await o.click(); break; }
      continue;
    }
    if (s.yourMove) {
      // the wrong side: fire at the rival when duds are likelier and vice versa
      const wrong = s.best.includes('rival') && !s.best.includes('self') ? '2' : '1';
      await p.keyboard.press(wrong);
    }
  }
  console.log(`L${id}:`);
  for (const t of seen) console.log('   ' + t);
}
console.log(errs.length ? errs.join('\n') : 'no page errors');
await b.close();
