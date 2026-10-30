// Endless "carnival night": generated matches, each accepted only if the solver-based checks pass
// (odds play passes reliably within two attempts; constant strategies don't).
import { frac } from './frac';
import { Rng } from './rng';
import { monteCarlo } from './sim';
import type { CardId, LevelDef, Load } from './types';

const RIVALS = [
  { name: 'סבתא רינה', style: 'odds', model: 'rival-rina', seats: 1 },
  { name: 'רובו־ליצן', style: 'gambler', model: 'rival-robo', seats: 1 },
  { name: 'ביג מו', style: 'champion', model: 'rival-mo', seats: 1 },
  { name: 'התאומים', style: 'odds', model: 'rival-twin', seats: 2 },
] as const;

function draft(night: number, seed: number): LevelDef {
  const r = new Rng(seed);
  const rival = RIVALS[r.int(RIVALS.length)];
  const loads: Load[] = [];
  const n = 5 + r.int(3);
  for (let i = 0; i < n; i++) {
    const kind = r.next();
    if (kind < 0.62 || rival.style === 'odds') {
      // magazines that lean clearly one way or the other, alternating sides
      const total = 3 + r.int(5);
      const lean = i % 2 === 0 ? 0.68 + r.next() * 0.25 : 0.07 + r.next() * 0.25;
      const pies = Math.min(total - 1, Math.max(1, Math.round(total * lean)));
      if (night > 2 && r.next() < 0.3) {
        const cp = Math.max(1, pies - 1);
        loads.push({ type: 'mag', pies, duds: total - pies + 1, flavors: { choc: { pies: cp, duds: 1 }, van: { pies: pies - cp, duds: total - pies } } });
        continue;
      }
      loads.push({ type: 'mag', pies, duds: total - pies });
    } else {
      const wheels = [frac(1, 4), frac(3, 4), frac(1, 5), frac(4, 5), frac(1, 3), frac(2, 3)];
      loads.push({ type: 'spin', pie: wheels[r.int(wheels.length)], spins: 3 + r.int(2) });
    }
  }
  const offers: CardId[] = ['peek', 'eject', 'double', 'magnifier', 'flavor'];
  const shop = night > 1 ? { offers: r.shuffle([...offers]).slice(0, 3 + r.int(2)) } : undefined;
  const hp = rival.seats === 2 ? { you: 7, rival: 3 } : { you: 6, rival: 6 };
  return {
    id: 100 + night,
    booth: 5,
    title: `לילה בקרנבל #${night}`,
    goal: 'תערובות חדשות כל לילה. ספרו, חשבו — וירו.',
    rival: { ...rival },
    hp,
    loads,
    meter: night <= 2 ? { kind: 'limited', uses: 3 } : { kind: 'off' },
    callIt: true,
    startChips: 3,
    shop,
    rivalPeeks: rival.style === 'champion' ? 2 : 0,
    autoFlavor: loads.some((l) => l.type === 'mag' && !!l.flavors),
    stage: night % 3 === 0 ? 'rooftop' : 'booth',
    seed,
    modules: ['/math/grade-8/chapter-5/classical-probability', '/math/grade-9/chapter-6/dependent-and-independent-events'],
  };
}

/** Generate night `night`: try seeds until a draft passes the checks (bounded). */
export function generateNight(night: number, baseSeed: number, samples = 40) {
  let best: LevelDef | null = null;
  for (let k = 0; k < 24; k++) {
    const def = draft(night, (baseSeed + k * 104729) >>> 0);
    const odds = monteCarlo(def, 'odds', samples, 7);
    const rivalOnly = monteCarlo(def, 'alwaysRival', samples, 7);
    const selfOnly = monteCarlo(def, 'alwaysSelf', samples, 7);
    const ok = odds.passWithin2 >= 0.9 && rivalOnly.passRate <= 0.5 && selfOnly.passRate <= 0.5;
    best = def;
    if (ok) return { def, checks: { odds: odds.passWithin2, alwaysRival: rivalOnly.passRate, alwaysSelf: selfOnly.passRate }, verified: true };
  }
  return { def: best!, checks: null, verified: false };
}
