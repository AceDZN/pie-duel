import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevelParam } from '../src/host';
import { LEVELS } from '../src/levels';

test('?level=N opens level N (1-based); anything else is ignored', () => {
  const n = LEVELS.length;
  assert.equal(parseLevelParam('?level=1', n), 0);
  assert.equal(parseLevelParam('?level=17', n), 16);
  assert.equal(LEVELS[parseLevelParam('?level=10', n)!].id, 10);
  for (const bad of ['', '?level=0', '?level=18', '?level=-2', '?level=2.5', '?level=abc', '?stage=3']) assert.equal(parseLevelParam(bad, n), null, bad);
});
