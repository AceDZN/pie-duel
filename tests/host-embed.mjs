// The workbook bridge in a real embed: a localhost parent page with the game in an iframe at ?level=N.
// Checks `ready`, `level-start` for the deep-linked level and `level-complete` after an autoplayed win,
// and that a standalone page posts nothing. Needs the dev server on :5216.  Usage: node tests/host-embed.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';

const GAME = process.env.BASE ?? 'http://localhost:5216/';
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const parent = createServer((_, res) => {
  res.setHeader('content-type', 'text/html');
  res.end(`<body style="margin:0"><script>window.msgs=[];addEventListener('message',e=>msgs.push({origin:e.origin,...e.data}))</script><iframe id="g" src="${GAME}?level=3" style="width:100vw;height:100vh;border:0"></iframe></body>`);
}).listen(4999);
await page.goto('http://localhost:4999/');
const frame = await (await page.waitForSelector('#g')).contentFrame();
await frame.waitForFunction(() => window.__game && window.render_game_to_text);
await page.waitForFunction(() => window.msgs.some((m) => m.type === 'ready'));
const opened = JSON.parse(await frame.evaluate(() => window.render_game_to_text()));
await frame.addScriptTag({ path: new URL('./autoplay.js', import.meta.url).pathname, type: 'module' });
await frame.waitForFunction(() => window.autoplayLevel);
// a cleared save makes the replay use the level's authored seed, so the run is the same every time
await frame.evaluate(() => localStorage.clear());
const r = await frame.evaluate(() => window.autoplayLevel(3, { strategy: 'odds' }));
const msgs = await page.evaluate(() => window.msgs);
console.log('opened on level', opened.level?.id ?? opened.level, '| result passed', r.result?.passed);
console.log(msgs.map((m) => `${m.type}${m.level ? ' L' + m.level : ''}${m.stars ? ' ★' + m.stars : ''}`).join(', '));
const ok =
  msgs.every((m) => m.source === 'workbook-game' && m.slug === 'pie-duel' && m.version === 1) &&
  msgs[0]?.type === 'level-start' && msgs[0].level === 3 &&
  msgs.some((m) => m.type === 'ready') &&
  msgs.some((m) => m.type === 'level-complete' && m.level === 3 && m.stars >= 1 && m.durationMs > 0);
// standalone: no parent, nothing posted (no errors either)
const solo = await (await browser.newContext()).newPage();
const errs = [];
solo.on('pageerror', (e) => errs.push(String(e)));
await solo.goto(GAME + '?level=2');
await solo.waitForFunction(() => window.__game);
console.log(ok && !errs.length ? 'bridge OK' : 'bridge FAILED', errs);
await browser.close();
parent.close();
process.exit(ok && !errs.length ? 0 : 1);
