// Fraction math and every probability helper, with hand-computed cases from the handoff and a brute-force
// check that the conditional probabilities equal counting over all equally likely orders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HALF, ONE, ZERO, add, cmp, complement, div, eq, frac, fromRaw, maxFrac, mul, rawStr, str, sub, toNum, type Frac } from '../src/core/frac';
import { Rng } from '../src/core/rng';
import { betHappened, counts, pAtLeastOneOfTwo, pBet, pCoin, pNextPie, pSpin, tree2, type MagView } from '../src/core/prob';
import type { BetEvent, Flavor, Shell } from '../src/core/types';
import { F, S } from './helpers';

const same = (a: Frac, b: Frac, msg?: string) => assert.equal(str(a), str(b), msg);
const shells = (s: string): Shell[] => [...s].map((c) => ({ kind: c === 'p' ? 'pie' : 'dud' }));
const view = (s: string, known: number[] = []): MagView => {
  const sh = shells(s);
  return { shells: sh, known: sh.map((_, i) => known.includes(i)) };
};

// ---------------- fractions ----------------

test('frac reduces, normalizes the sign and rejects bad input', () => {
  assert.deepEqual(frac(2, 4), { n: 1, d: 2 });
  assert.deepEqual(frac(3, -6), { n: -1, d: 2 });
  assert.deepEqual(frac(0, 5), { n: 0, d: 1 });
  assert.deepEqual(frac(6, 3), { n: 2, d: 1 });
  assert.throws(() => frac(1, 0));
  assert.throws(() => frac(0.5, 1));
});

test('fraction arithmetic is exact', () => {
  same(add(F(1, 3), F(1, 6)), F(1, 2));
  same(sub(F(3, 4), F(1, 4)), F(1, 2));
  same(mul(F(3, 5), F(2, 4)), F(3, 10));
  same(div(F(3, 4), F(3, 8)), F(2));
  same(complement(F(3, 8)), F(5, 8));
  same(complement(ZERO), ONE);
  assert.equal(cmp(F(4, 7), HALF), 1);
  assert.equal(cmp(F(3, 6), HALF), 0);
  assert.equal(cmp(F(2, 5), HALF), -1);
  assert.ok(eq(F(2, 4), HALF));
  same(maxFrac(F(1, 3), F(3, 8), F(2, 7)), F(3, 8));
  assert.equal(toNum(F(3, 4)), 0.75);
  assert.equal(str(F(5, 1)), '5');
  assert.equal(rawStr({ n: 2, d: 4 }), '2/4');
  same(fromRaw({ n: 2, d: 4 }), HALF);
});

// ---------------- RNG ----------------

test('the seeded RNG replays exactly and chance(n, d) is fair on integers', () => {
  const a = new Rng(42);
  const b = new Rng(42);
  for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next());
  const r = new Rng(7);
  let hits = 0;
  for (let i = 0; i < 40000; i++) if (r.chance(1, 4)) hits++;
  assert.ok(Math.abs(hits / 40000 - 0.25) < 0.01, `chance(1,4) rate ${hits / 40000}`);
  const xs = r.shuffle([1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...xs].sort(), [1, 2, 3, 4, 5, 6]);
});

// ---------------- classical probability (grade 8) ----------------

test('counts and P(next is a pie) = pies left ÷ shells left', () => {
  assert.deepEqual(counts(shells('pdd')), { pies: 1, duds: 2, total: 3 });
  same(pNextPie(view('ddp')), F(1, 3)); // level 1: 1 pie, 2 duds
  same(complement(pNextPie(view('ddp'))), F(2, 3)); // so a dud is 2/3
  same(pNextPie(view('pppddddd')), F(3, 8)); // level 3: "3 pies of 8"
  same(complement(pNextPie(view('pppddddd'))), F(5, 8)); // the complement: 5/8 duds
  same(pNextPie(view('ppddd')), F(2, 5)); // level 4 mixes
  same(pNextPie(view('ppppddd')), F(4, 7));
  same(pNextPie(view('pppddd')), HALF); // 3/6 = ½
  same(pNextPie(view('ddd')), ZERO); // impossible
  same(pNextPie(view('pp')), ONE); // certain
  same(pNextPie(view('')), ZERO);
});

test('without replacement the odds move: 3 pies 3 duds, after two duds → 3/4', () => {
  // the shells already fired are gone from the magazine: what is left is pppd
  same(pNextPie(view('pppd')), F(3, 4));
  // and after a pie and a dud from 3/3: 2 pies 2 duds → ½
  same(pNextPie(view('ppdd')), HALF);
});

// ---------------- conditional probability: peek, magnifier, flavor light ----------------

test('peek: a known next shell is certain', () => {
  same(pNextPie(view('dppd', [0])), ZERO);
  same(pNextPie(view('pdpd', [0])), ONE);
});

test('level 6: 2 pies 2 duds, the first is a dud → P(second is a pie | first is a dud) = 2/3', () => {
  // after the peeked dud is fired, the rival faces p p d: 2/3
  same(pNextPie(view('ppd')), F(2, 3));
  // magnifier on shell #2 shows a dud → the next shell is a pie with 2/3 (unknown pool p p d)
  same(pNextPie(view('pdpd', [1])), F(2, 3));
  // magnifier shows a pie at #2 → 1/3
  same(pNextPie(view('dpdp', [1])), F(1, 3));
});

test('level 11: flavor light = P(pie | flavor), from the two-way table', () => {
  const mk = (first: Flavor): MagView => {
    const sh: Shell[] = [];
    const add1 = (kind: 'pie' | 'dud', flavor: Flavor, n: number) => {
      for (let i = 0; i < n; i++) sh.push({ kind, flavor });
    };
    add1('pie', 'choc', 4);
    add1('dud', 'choc', 1);
    add1('pie', 'van', 1);
    add1('dud', 'van', 4);
    // put a shell of the lit flavor first (the light shows shells[0].flavor)
    const i = sh.findIndex((s) => s.flavor === first);
    [sh[0], sh[i]] = [sh[i], sh[0]];
    return { shells: sh, known: sh.map(() => false), nextFlavor: first };
  };
  same(pNextPie(mk('choc')), F(4, 5));
  same(pNextPie(mk('van')), F(1, 5));
  // without the light it is just 5 of 10
  same(pNextPie({ ...mk('choc'), nextFlavor: undefined }), HALF);
});

// ---------------- two-stage events (Double card) ----------------

test('level 10: 3 pies 2 duds — tree: P(pie,pie) = 3/10, P(at least one pie in two) = 1 − 2/5·1/4 = 9/10', () => {
  const t = tree2(3, 5);
  same(t.pp, F(3, 10));
  same(t.pd, F(3, 10));
  same(t.dp, F(3, 10));
  same(t.dd, F(1, 10));
  same(add(add(t.pp, t.pd), add(t.dp, t.dd)), ONE); // the four branches cover everything
  same(pAtLeastOneOfTwo(view('ppddp')), F(9, 10));
  same(complement(t.dd), F(9, 10));
  // P(A and B) is not P(A) + P(B): 3/5 + 2/4 ≠ 3/10
  assert.ok(!eq(add(F(3, 5), F(2, 4)), t.pp));
});

test('P(at least one of two) uses what you know', () => {
  same(pAtLeastOneOfTwo(view('dd')), ZERO);
  same(pAtLeastOneOfTwo(view('dp', [0])), ONE); // known dud, then 1 pie left of 1
  same(pAtLeastOneOfTwo(view('dpdd', [1])), ONE); // the magnifier saw a pie at #2
  same(pAtLeastOneOfTwo(view('pddd', [1])), F(1, 3)); // #2 is a dud: only shell #1 can be a pie, 1 pie in the 3 unknowns
  same(pAtLeastOneOfTwo(view('p')), ONE); // one shell left: just P(pie)
});

// ---------------- brute force: the helpers equal counting over all orders ----------------

function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}

test('pNextPie and pAtLeastOneOfTwo equal exact counting over every order consistent with what the seat saw', () => {
  const rng = new Rng(2026);
  const perms: Record<number, number[][]> = {};
  for (let trial = 0; trial < 300; trial++) {
    const n = 2 + rng.int(6); // 2..7 shells
    const flavored = rng.chance(1, 2);
    const actual: Shell[] = Array.from({ length: n }, () => ({
      kind: rng.chance(1, 2) ? 'pie' : 'dud',
      ...(flavored ? { flavor: rng.chance(1, 2) ? 'choc' : 'van' } : {}),
    })) as Shell[];
    const known = actual.map(() => rng.chance(1, 4));
    const light = flavored && !known[0] && rng.chance(1, 2);
    const v: MagView = { shells: actual, known, nextFlavor: light ? actual[0].flavor : undefined };
    perms[n] ??= permutations(n);
    let consistent = 0;
    let firstPie = 0;
    let oneOfTwo = 0;
    for (const p of perms[n]) {
      const order = p.map((i) => actual[i]);
      if (known.some((k, i) => k && (order[i].kind !== actual[i].kind || order[i].flavor !== actual[i].flavor))) continue;
      if (light && order[0].flavor !== actual[0].flavor) continue;
      consistent++;
      if (order[0].kind === 'pie') firstPie++;
      if (order[0].kind === 'pie' || order[1].kind === 'pie') oneOfTwo++;
    }
    same(pNextPie(v), frac(firstPie, consistent), `pNextPie trial ${trial}`);
    same(pAtLeastOneOfTwo(v), frac(oneOfTwo, consistent), `pAtLeastOneOfTwo trial ${trial}`);
  }
});

// ---------------- with replacement, area model, bets ----------------

test('spinner (with replacement): the chance never depends on history', () => {
  same(pSpin(F(1, 4)), F(1, 4));
});

test('level 12 area model: P(pie) = ½·3/4 + ½·1/4 = ½', () => {
  same(pCoin(HALF, F(3, 4), F(1, 4)), HALF);
  same(pCoin(HALF, ONE, HALF), F(3, 4));
  same(pCoin(HALF, ZERO, HALF), F(1, 4));
  same(pCoin(F(3, 4), ONE, F(1, 4)), F(13, 16));
  same(pCoin(F(1, 3), F(3, 4), ZERO), F(1, 4));
});

test('level 15 bets on two independent spins', () => {
  same(pBet('twoPies', F(1, 4)), F(1, 16));
  same(pBet('noPie', F(1, 4)), F(9, 16));
  same(pBet('atLeastOne', HALF), F(3, 4));
  same(pBet('twoPies', HALF), F(1, 4));
  same(pBet('exactlyOne', F(3, 4)), F(3, 8));
  same(pBet('noPie', F(3, 4)), F(1, 16));
  same(pBet('atLeastOne', F(1, 3)), F(5, 9));
  same(pBet('noPie', F(1, 3)), F(4, 9));
  same(pBet('twoPies', F(2, 3)), F(4, 9));
  same(pBet('pieThenDud', HALF), F(1, 4)); // order matters: pie-then-dud is half of "exactly one"
  same(pBet('exactlyOne', HALF), HALF);
  // the four sequences of two spins add up to 1 for any p
  for (const p of [F(1, 4), F(1, 3), HALF, F(4, 5)]) {
    same(add(add(pBet('twoPies', p), pBet('noPie', p)), pBet('exactlyOne', p)), ONE);
    same(add(pBet('noPie', p), pBet('atLeastOne', p)), ONE); // complement
  }
});

test('betHappened matches each event on all four spin pairs', () => {
  const table: Record<BetEvent, boolean[]> = {
    // pairs: (pie,pie) (pie,dud) (dud,pie) (dud,dud)
    twoPies: [true, false, false, false],
    noPie: [false, false, false, true],
    exactlyOne: [false, true, true, false],
    atLeastOne: [true, true, true, false],
    pieThenDud: [false, true, false, false],
  };
  const pairs: [boolean, boolean][] = [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ];
  for (const e of Object.keys(table) as BetEvent[]) pairs.forEach(([a, b], i) => assert.equal(betHappened(e, a, b), table[e][i], `${e} ${a} ${b}`));
  // and pBet equals the sum over the sequences where the event happens
  const p = F(1, 3);
  const q = complement(p);
  const seqP = [mul(p, p), mul(p, q), mul(q, p), mul(q, q)];
  for (const e of Object.keys(table) as BetEvent[]) {
    const sum = seqP.filter((_, i) => table[e][i]).reduce(add, ZERO);
    same(pBet(e, p), sum, e);
  }
});

// ---------------- why Eject is scored only at exactly ½ ----------------

test('eject is a martingale: it only raises your next-shot chance when P(pie) is exactly ½', () => {
  for (let n = 2; n <= 12; n++)
    for (let pies = 0; pies <= n; pies++) {
      const p = frac(pies, n);
      const now = maxFrac(p, complement(p));
      // eject reveals a pie (p) or a dud (1 − p); then you fire the next shell knowing the new mix
      let after = ZERO;
      if (pies > 0) {
        const p1 = frac(pies - 1, n - 1);
        after = add(after, mul(p, maxFrac(p1, complement(p1))));
      }
      if (pies < n) {
        const p1 = frac(pies, n - 1);
        after = add(after, mul(complement(p), maxFrac(p1, complement(p1))));
      }
      if (eq(p, HALF)) assert.equal(cmp(after, now), 1, `${pies}/${n}: eject helps at ½`);
      else same(after, now, `${pies}/${n}: eject changes nothing off ½`);
    }
  assert.equal(S(F(2, 4)), '1/2');
});

// ---------------- the table rule makes the ½ rule exactly optimal ----------------

test('under "every shot creams exactly one player, the turn always passes", aiming by the ½ rule is optimal in every state', () => {
  // Exact game DP over one magazine mix (reloaded when empty). Each shot costs someone 1 point, so there are no cycles.
  // Both players choose a target; we check that for both the maximizing player and a minimizing (optimal) rival
  // the best target is the rival's/your face iff P(pie) > ½, with exact ties only at ½.
  for (const [P0, D0] of [
    [1, 2],
    [3, 1],
    [2, 2],
    [3, 5],
    [4, 3],
    [2, 3],
  ]) {
    const memo = new Map<string, number>();
    const V = (you: boolean, p: number, d: number, hy: number, hr: number): number => {
      if (hy <= 0) return 0;
      if (hr <= 0) return 1;
      if (p + d === 0) return V(true, P0, D0, hy, hr);
      const key = `${+you}${p},${d},${hy},${hr}`;
      const hit = memo.get(key);
      if (hit !== undefined) return hit;
      const n = p + d;
      // value of each target for the player whose turn it is (pie at the other side ⇒ the other side loses a point)
      const atOther = you
        ? (p / n) * (p ? V(false, p - 1, d, hy, hr - 1) : 0) + (d / n) * (d ? V(false, p, d - 1, hy - 1, hr) : 0)
        : (p / n) * (p ? V(true, p - 1, d, hy - 1, hr) : 0) + (d / n) * (d ? V(true, p, d - 1, hy, hr - 1) : 0);
      const atSelf = you
        ? (p / n) * (p ? V(false, p - 1, d, hy - 1, hr) : 0) + (d / n) * (d ? V(false, p, d - 1, hy, hr - 1) : 0)
        : (p / n) * (p ? V(true, p - 1, d, hy, hr - 1) : 0) + (d / n) * (d ? V(true, p, d - 1, hy - 1, hr) : 0);
      const v = you ? Math.max(atOther, atSelf) : Math.min(atOther, atSelf);
      // the ½ rule: aim at the other side iff P(pie) > ½; at exactly ½ both are equal
      const ruleOther = 2 * p > n;
      if (2 * p === n) assert.ok(Math.abs(atOther - atSelf) < 1e-12, `tie at ½ ${key}`);
      else assert.ok(Math.abs((ruleOther ? atOther : atSelf) - v) < 1e-12, `rule optimal at ${key} mix ${P0}/${D0}`);
      memo.set(key, v);
      return v;
    };
    for (let hy = 1; hy <= 5; hy++) for (let hr = 1; hr <= 5; hr++) V(true, P0, D0, hy, hr);
  }
});
