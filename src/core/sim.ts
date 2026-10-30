// Headless players for tests and Monte Carlo strategy comparisons.
import { HALF, cmp } from './frac';
import { Duel } from './duel';
import type { LevelDef } from './types';

export type Strategy = 'odds' | 'alwaysRival' | 'alwaysSelf' | 'random' | 'gambler';

/** Play one of your moves. Returns false when it's not your move. */
export function playMove(duel: Duel, strategy: Strategy, coin: () => number): boolean {
  const target = () => duel.aliveRivals()[0].id;
  switch (duel.phase) {
    case 'shop': {
      if (strategy === 'odds') for (const c of [...duel.offers]) duel.buy(c);
      duel.leaveShop();
      return true;
    }
    case 'test': {
      if (strategy === 'odds') while (duel.testFire(4));
      else duel.testFire(4);
      duel.startDuel();
      return true;
    }
    case 'bet': {
      const L = duel.load;
      if (L.type !== 'bet') return false;
      if (strategy === 'odds') {
        duel.bet(bestBet(duel) ?? L.options[0]);
      } else if (strategy === 'random') duel.bet(L.options[Math.floor(coin() * L.options.length)]);
      else duel.bet(L.options[strategy === 'alwaysSelf' ? L.options.length - 1 : 0]);
      return true;
    }
    case 'decide': {
      if (strategy === 'odds') {
        const o = duel.options();
        const pick = o.best[0];
        if (pick === 'eject') return duel.useCard('eject');
        if (pick === 'double') return duel.useCard('double', { target: target() });
        const p = duel.pYou();
        if (duel.hand.includes('peek') && cmp(p, HALF) === 0 && duel.load.type === 'mag' && !duel.load.known[0]) return duel.useCard('peek');
        if (duel.hand.includes('magnifier') && cmp(p, HALF) === 0 && duel.load.type === 'mag' && duel.load.shells.length >= 2 && !duel.load.known[1]) return duel.useCard('magnifier', { index: 1 });
        if (duel.hand.includes('flavor') && duel.load.type === 'mag' && duel.load.shells[0]?.flavor && !duel.load.nextFlavor) return duel.useCard('flavor');
        return duel.fire(pick === 'self' ? 'self' : target());
      }
      if (strategy === 'alwaysRival') return duel.fire(target());
      if (strategy === 'alwaysSelf') return duel.fire('self');
      if (strategy === 'gambler') {
        const L = duel.load;
        if ('history' in L && L.history.length >= 2) {
          const [x, y] = L.history.slice(-2);
          if (x === y) return duel.fire(x === 'pie' ? 'self' : target());
        }
        return duel.fire(cmp(duel.pYou(), HALF) < 0 ? 'self' : target());
      }
      return duel.fire(coin() < 0.5 ? 'self' : target());
    }
    default:
      return false;
  }
}

function bestBet(duel: Duel) {
  const L = duel.load;
  if (L.type !== 'bet') return undefined;
  let best = L.options[0];
  let bestV = -1;
  for (const e of L.options) {
    const v = betValue(e, L.pie.n / L.pie.d);
    if (v > bestV) [best, bestV] = [e, v];
  }
  return best;
}

function betValue(e: string, p: number) {
  const q = 1 - p;
  return e === 'twoPies' ? p * p : e === 'noPie' ? q * q : e === 'exactlyOne' ? 2 * p * q : e === 'atLeastOne' ? 1 - q * q : p * q;
}

export function playMatch(level: LevelDef, strategy: Strategy, seed: number) {
  const duel = new Duel(level, seed);
  let r = (seed * 2654435761) >>> 0;
  const coin = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  let guard = 0;
  while (duel.phase !== 'over' && guard++ < 2000) {
    if (duel.phase === 'rival') duel.rivalStep();
    else if (!playMove(duel, strategy, coin)) break;
  }
  return { duel, ...duel.result() };
}

export function monteCarlo(level: LevelDef, strategy: Strategy, n = 400, seed0 = 1) {
  let won = 0;
  let passed = 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const r = playMatch(level, strategy, seed0 + i * 7919);
    if (r.won) won++;
    if (r.passed) passed++;
    acc += r.accuracy;
  }
  return { winRate: won / n, passRate: passed / n, accuracy: acc / n };
}
