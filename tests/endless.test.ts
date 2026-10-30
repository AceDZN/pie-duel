// Endless carnival nights: every generated night is checked by the solver before it's served.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateNight } from '../src/core/endless';
import { monteCarlo } from '../src/core/sim';

test('generated nights pass the solver checks: odds play passes, constant strategies mostly do not', () => {
  for (const night of [1, 2, 3, 4, 5, 6]) {
    const g = generateNight(night, 1000 + night * 17);
    assert.ok(g.verified, `night ${night} found a verified draft`);
    // re-measure on fresh seeds, independent of the generator's own sample
    const odds = monteCarlo(g.def, 'odds', 150, 50_000);
    const rival = monteCarlo(g.def, 'alwaysRival', 150, 50_000);
    const self = monteCarlo(g.def, 'alwaysSelf', 150, 50_000);
    assert.ok(odds.passWithin2 >= 0.85, `night ${night}: odds passes ${odds.passWithin2}`);
    assert.ok(rival.passRate <= 0.6 && self.passRate <= 0.6, `night ${night}: constants ${rival.passRate} / ${self.passRate}`);
  }
});
