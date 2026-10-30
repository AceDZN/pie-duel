// The fairness rule: a level is passed by winning OR by reading the odds (≥ 80 % solver-correct over ≥ 3 decisions,
// the match asked both a pie-likely and a dud-likely question, and you answered both correctly at least once).
// Good calls carry into the rematch. Bad luck with good decisions still passes; a constant strategy never passes by odds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Duel, evaluate, type Choice, type Decision } from '../src/core/duel';
import { HALF, cmp, complement } from '../src/core/frac';
import { playMatch, type Strategy } from '../src/core/sim';
import { LEVELS, levelById } from '../src/levels';
import { F } from './helpers';

/** A hand-made decision: P(pie) = p, you chose `choice`, scored against the ½ rule (or `best` if given). */
function dec(p: [number, number], choice: Choice, best?: Choice[]): Decision {
  const pf = F(...p);
  const b: Choice[] = best ?? (2 * p[0] > p[1] ? ['rival'] : 2 * p[0] < p[1] ? ['self'] : ['rival', 'self']);
  return { level: 1, load: 0, kind: choice === 'double' || choice === 'eject' ? 'card' : 'fire', choice, p: pf, pSeen: pf, values: { rival: pf, self: complement(pf) }, best: b, correct: b.includes(choice), hinted: false };
}

test('bad luck with good decisions still passes: the odds player loses the match but passes by reading the odds', () => {
  let found = 0;
  for (const id of [5, 8, 9, 17])
    for (let seed = 1; seed <= 400 && found < 4; seed++) {
      const r = playMatch(levelById(id), 'odds', seed);
      if (!r.won && r.over) {
        assert.equal(r.accuracy, 1);
        if (r.oddsRead) {
          assert.equal(r.passed, true);
          assert.ok(r.stars >= 2, 'stars measure decisions, not luck');
          found++;
          break;
        }
      }
    }
  assert.ok(found >= 3, `found ${found} levels with a lost-but-passed odds match`);
});

test('a constant strategy never passes by reading the odds (300 seeds, every level, with the rematch carry)', () => {
  for (const L of LEVELS)
    for (const s of ['alwaysRival', 'alwaysSelf'] as Strategy[])
      for (let i = 0; i < 300; i++) {
        const seed = 1 + i * 7919;
        const a = playMatch(L, s, seed);
        assert.equal(a.oddsRead, false, `L${L.id} ${s} seed ${seed}`);
        const b = playMatch(L, s, seed + 1, a.duel.decisions);
        assert.equal(b.oddsRead, false, `L${L.id} ${s} rematch seed ${seed}`);
      }
});

test('evaluate: the thresholds', () => {
  // judged on uncertain, informative calls: certain/impossible shots and exact-½ shots don't count
  const five = [dec([3, 4], 'rival'), dec([1, 4], 'self'), dec([2, 3], 'rival'), dec([1, 3], 'self'), dec([3, 5], 'rival')];
  let r = evaluate(five, false, true);
  assert.deepEqual([r.oddsRead, r.passed, r.won, r.stars], [true, true, false, 3]);
  // four informative decisions are not enough, even with free certain and ½ shots added
  r = evaluate([...five.slice(0, 4), dec([1, 1], 'rival'), dec([0, 2], 'self'), dec([1, 2], 'self')], false, true);
  assert.equal(r.oddsRead, false);
  // only one side ever asked (all pie-likely) → no odds pass, however accurate
  r = evaluate([dec([3, 4], 'rival'), dec([2, 3], 'rival'), dec([4, 5], 'rival'), dec([3, 5], 'rival'), dec([5, 6], 'rival')], false, true);
  assert.equal(r.oddsRead, false);
  // a near-constant player who only gets the certain dud right doesn't count as reading the dud side
  r = evaluate([dec([3, 4], 'rival'), dec([2, 3], 'rival'), dec([4, 5], 'rival'), dec([3, 5], 'rival'), dec([1, 4], 'rival'), dec([0, 2], 'self')], false, true);
  assert.equal(r.oddsRead, false);
  // 80 % with both sides answered → pass with 2 stars; 4 of 6 → no
  r = evaluate([...five.slice(0, 4), dec([3, 5], 'self')], false, true);
  assert.deepEqual([r.accuracy, r.oddsRead, r.stars], [0.8, true, 2]);
  r = evaluate([...five, dec([1, 5], 'rival'), dec([4, 5], 'self')], false, true);
  assert.deepEqual([+r.accuracy.toFixed(2), r.oddsRead], [0.71, false]);
  // winning always passes, with 1 star when the calls were poor
  r = evaluate([dec([3, 4], 'self'), dec([1, 4], 'rival'), dec([2, 3], 'self')], true, true);
  assert.deepEqual([r.passed, r.stars], [true, 1]);
});

test('good calls carry into the rematch', () => {
  const first = [dec([3, 4], 'rival'), dec([1, 4], 'self'), dec([2, 3], 'rival')]; // unpassed: only 3 decisions
  assert.equal(evaluate(first, false, true).passed, false);
  const second = [dec([1, 3], 'self'), dec([3, 5], 'rival')];
  const r = evaluate([...first, ...second], false, true, second);
  assert.deepEqual([r.total, r.oddsRead, r.matchDecisions], [5, true, 2]);
  // and in the engine: a rematch Duel built with the carry counts the earlier decisions
  const L = levelById(9);
  for (let seed = 1; seed <= 200; seed++) {
    const a = playMatch(L, 'odds', seed);
    if (a.passed) continue;
    const b = playMatch(L, 'odds', seed + 1, a.duel.decisions);
    assert.equal(b.total, Math.min(16, a.duel.decisions.length) + b.duel.decisions.length);
  }
});

test(
  'Double is a pie-side answer: using Double when pies are likely and firing at yourself when duds are passes by odds',
  () => {
    const r = evaluate(
      [dec([3, 5], 'double', ['double']), dec([1, 3], 'self'), dec([1, 4], 'self'), dec([2, 3], 'double', ['double']), dec([1, 5], 'self')],
      false,
      true,
    );
    assert.equal(r.accuracy, 1);
    assert.equal(r.oddsRead, true);
  },
);

test(
  'holding a Double card does not make the ½-rule shot wrong (Double is optional)',
  () => {
    const d = new Duel(levelById(10)); // 3 pies 2 duds with Double in hand: P(pie) = 3/5 > ½
    assert.equal(cmp(d.pYou(), HALF), 1);
    assert.ok(d.options().best.includes('rival'), `best = ${d.options().best}`);
    assert.ok(d.options().best.includes('double'));
  },
);
