// Expert variants: harder (no meter, smarter rival), still fair — reading the odds passes, constant play doesn't.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monteCarlo } from '../src/core/sim';
import { LEVELS, expertLevel } from '../src/levels';

test('every expert level: odds play passes within two attempts on ≥ 90 %, constant play ≤ 40 % in one', () => {
  for (const L of LEVELS) {
    const X = expertLevel(L);
    assert.equal(X.meter.kind, 'off');
    const odds = monteCarlo(X, 'odds', 200, 3);
    assert.ok(odds.passWithin2 >= 0.9, `expert L${L.id}: odds passes within 2 = ${odds.passWithin2}`);
    for (const s of ['alwaysRival', 'alwaysSelf'] as const) {
      const r = monteCarlo(X, s, 200, 3);
      assert.ok(r.passRate <= 0.4, `expert L${L.id}: ${s} passes ${r.passRate}`);
    }
  }
});

test('expert is harder: the odds player wins less often than on the normal level (summed over all levels)', () => {
  let normal = 0;
  let expert = 0;
  for (const L of LEVELS) {
    normal += monteCarlo(L, 'odds', 150, 9).winRate;
    expert += monteCarlo(expertLevel(L), 'odds', 150, 9).winRate;
  }
  assert.ok(expert < normal, `win rate sum normal ${normal.toFixed(2)} vs expert ${expert.toFixed(2)}`);
});
