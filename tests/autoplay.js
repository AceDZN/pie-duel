// Browser-side autoplayer for smoke tests: plays a level through the real HUD buttons with the solver's best move.
// Dev only: `await import('/tests/autoplay.js')` in the page, then `await autoplayLevel(id)`.
// It reads window.render_game_to_text() and clicks buttons; it never injects state.

const st = () => JSON.parse(window.render_game_to_text());
const q = (sel) => document.querySelector(sel);
// yield a real task so other scripts (and the test driver) can run; MessageChannel isn't throttled like setTimeout
const tick = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });

async function autoplayLevel(id, { strategy = 'odds', maxSteps = 260, stepMs = 700, expert = false } = {}) {
  const g = window.__game;
  if (id >= 100) g.startNight(id - 100);
  else g.startLevel(id, undefined, !!expert);
  for (let i = 0; i < 80 && !q('#goal-go')?.offsetParent; i++) {
    if (q('#booth-go')?.offsetParent) q('#booth-go').click();
    else if (!q('#versus').classList.contains('hidden')) q('#versus').click();
    await window.advanceTime(150);
  }
  q('#goal-go').click();
  const log = [];
  let lastKey = '';
  let stuck = 0;
  for (let i = 0; i < maxSteps; i++) {
    await window.advanceTime(stepMs);
    await tick();
    const s = st();
    if (s.result && s.screen === 'result') return { id, result: s.result, steps: i, log };
    if (!q('#explain').classList.contains('hidden')) {
      log.push('explain:' + s.lastExplain);
      q('#explain-ok').click();
      continue;
    }
    if (s.screen === 'shop') {
      if (strategy === 'odds') document.querySelectorAll('.shop-card:not(:disabled)').forEach((b) => b.click());
      q('#shop-go').click();
      log.push('shop');
      continue;
    }
    if (s.phase === 'test' && !s.animating) {
      const t4 = q('#t4');
      if (strategy === 'odds' && t4 && !t4.disabled) t4.click();
      else if (q('#tgo') && !q('#tgo').disabled) q('#tgo').click();
      else t4?.click();
      continue;
    }
    if (s.phase === 'bet' && !s.animating) {
      const btns = [...document.querySelectorAll('[data-bet]')];
      const pick = strategy === 'odds' ? btns.find((b) => b.dataset.bet === g.duel.load.options[bestBetIndex(g.duel.load)]) : btns[0];
      pick.click();
      log.push('bet:' + pick.dataset.bet);
      continue;
    }
    if (s.yourMove) {
      let b = s.best[0];
      if (strategy === 'alwaysRival') b = 'rival';
      if (strategy === 'alwaysSelf') b = 'self';
      // at exactly ½ a good player uses an info card first (Peek, then Magnifier on the second shell)
      const half = s.best.includes('rival') && s.best.includes('self');
      const info = strategy === 'odds' && half && s.load?.type === 'mag' && !s.load.nextKnown ? ['peek', 'magnifier'].find((c) => g.duel.hand.includes(c)) : null;
      if (info) {
        document.querySelectorAll('#hand .card')[g.duel.hand.indexOf(info)].click();
        log.push(info);
        continue;
      }
      if (b === 'eject' || b === 'double') {
        const idx = g.duel.hand.indexOf(b);
        document.querySelectorAll('#hand .card')[idx].click();
      } else {
        const t = b === 'self' ? 'self' : g.duel.aliveRivals()[0].id;
        q(`[data-t=${t}]`).click();
      }
      log.push(b + '@' + s.pNextPie);
      continue;
    }
    const key = JSON.stringify([s.phase, s.hp, s.load, s.animating, s.screen]);
    stuck = key === lastKey ? stuck + 1 : 0;
    lastKey = key;
    if (stuck > 45) return { id, stuck: true, state: s, log };
  }
  return { id, timeout: true, state: st(), log };
}

function bestBetIndex(load) {
  const p = load.pie.n / load.pie.d;
  const q2 = 1 - p;
  const v = { twoPies: p * p, noPie: q2 * q2, exactlyOne: 2 * p * q2, atLeastOne: 1 - q2 * q2, pieThenDud: p * q2 };
  let best = 0;
  load.options.forEach((o, i) => {
    if (v[o] > v[load.options[best]]) best = i;
  });
  return best;
}

window.autoplayLevel = autoplayLevel;
