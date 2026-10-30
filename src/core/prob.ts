// Probability helpers. Exact fractions only.
import { ONE, ZERO, add, complement, frac, mul, type Frac } from './frac';
import type { BetEvent, Flavor, Shell } from './types';

/** What a seat knows about a magazine: the true remaining shells, which positions it has seen, and the next shell's flavor. */
export interface MagView {
  shells: Shell[];
  known: boolean[]; // known[i]: this seat has seen shells[i]
  nextFlavor?: Flavor; // flavor light on shells[0]
}

export function counts(shells: Shell[]) {
  let pies = 0;
  for (const s of shells) if (s.kind === 'pie') pies++;
  return { pies, duds: shells.length - pies, total: shells.length };
}

/** Unknown pool: shells this seat hasn't seen, optionally filtered by flavor. */
function pool(v: MagView, from: number, flavor?: Flavor) {
  let pies = 0;
  let total = 0;
  for (let i = from; i < v.shells.length; i++) {
    if (v.known[i]) continue;
    const s = v.shells[i];
    if (flavor && s.flavor !== flavor) continue;
    total++;
    if (s.kind === 'pie') pies++;
  }
  return { pies, total };
}

/** P(next shell is a pie) from this seat's knowledge. A uniformly shuffled magazine conditioned on seen positions is uniform over the rest. */
export function pNextPie(v: MagView): Frac {
  if (v.shells.length === 0) return ZERO;
  if (v.known[0]) return v.shells[0].kind === 'pie' ? ONE : ZERO;
  // unknown positions all share one pool; position 0 is part of it, so count from 0
  const p = pool(v, 0, v.nextFlavor);
  return p.total ? frac(p.pies, p.total) : ZERO;
}

/** P(at least one pie in the next two shells) from this seat's knowledge (Double card). */
export function pAtLeastOneOfTwo(v: MagView): Frac {
  if (v.shells.length < 2) return pNextPie(v);
  const p0 = pNextPie(v);
  const d0 = complement(p0);
  // P(second is dud | first is dud)
  let d1: Frac;
  if (v.known[1]) d1 = v.shells[1].kind === 'dud' ? ONE : ZERO;
  else {
    const all = pool(v, 0);
    // if shell 0 was unknown, it was a dud from the pool; take it out
    const removed = v.known[0] ? 0 : 1;
    const duds = all.total - all.pies - removed;
    const total = all.total - removed;
    d1 = total > 0 ? frac(Math.max(0, duds), total) : ZERO;
  }
  return complement(mul(d0, d1));
}

/** Spinner / with replacement: the chance doesn't depend on history. */
export const pSpin = (pie: Frac) => pie;

/** Area model: P(pie) = P(A)·a + P(B)·b. */
export const pCoin = (coin: Frac, a: Frac, b: Frac) => add(mul(coin, a), mul(complement(coin), b));

/** Two independent spins with P(pie) = p. */
export function pBet(e: BetEvent, p: Frac): Frac {
  const q = complement(p);
  switch (e) {
    case 'twoPies':
      return mul(p, p);
    case 'noPie':
      return mul(q, q);
    case 'exactlyOne':
      return mul(frac(2), mul(p, q));
    case 'atLeastOne':
      return complement(mul(q, q));
    case 'pieThenDud':
      return mul(p, q);
  }
}

export function betHappened(e: BetEvent, a: boolean, b: boolean): boolean {
  switch (e) {
    case 'twoPies':
      return a && b;
    case 'noPie':
      return !a && !b;
    case 'exactlyOne':
      return a !== b;
    case 'atLeastOne':
      return a || b;
    case 'pieThenDud':
      return a && !b;
  }
}

/** Two-stage tree for a magazine without replacement: P(pie then pie) etc. */
export function tree2(pies: number, total: number) {
  const duds = total - pies;
  return {
    pp: frac(pies * (pies - 1), total * (total - 1)),
    pd: frac(pies * duds, total * (total - 1)),
    dp: frac(duds * pies, total * (total - 1)),
    dd: frac(duds * (duds - 1), total * (total - 1)),
  };
}
