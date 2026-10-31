import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stickers, subjectRows } from '../src/progress';
import type { LearnEvent, Save } from '../src/save';

const ev = (level: number, correct: boolean, kind = 'fire'): LearnEvent => ({ t: 0, level, kind, correct, attempt: 1, firstTry: true });
const save = (over: Partial<Save> = {}): Save => ({ stars: {}, passed: {}, carry: {}, settings: { muted: false, reduced: false }, ...over });

test('notebook: accuracy per subject comes from that booth only, recent decisions only', () => {
  const log = [...Array(40).fill(0).map(() => ev(1, false)), ...Array(30).fill(0).map(() => ev(2, true)), ev(5, false), ev(5, true)];
  const rows = subjectRows(log);
  assert.equal(rows[0].decisions, 70);
  assert.equal(rows[0].recent, 1, 'the last 30 booth-1 decisions were all right');
  assert.equal(rows[0].replay, null);
  assert.equal(rows[1].recent, 0.5);
  assert.equal(rows[2].recent, null);
});

test('notebook: suggests the weakest level in a booth, ignores hints and endless nights', () => {
  const log = [ev(10, true), ev(10, true), ev(10, true), ev(11, false), ev(11, false), ev(11, true), { ...ev(11, false), kind: 'hint' }, ev(101, false)];
  const rows = subjectRows(log);
  assert.equal(rows[2].replay, 11);
  assert.equal(rows[2].decisions, 6);
  assert.equal(rows.reduce((a, r) => a + r.decisions, 0), 6);
});

test('stickers: booths, streaks, crowns and lucky losses', () => {
  const s = save({ passed: { 1: true, 2: true, 3: true, 4: true }, stars: { 1: 3, 2: 3, 3: 3, 4: 3 }, expert: { 2: 1 } });
  const log = [...Array(10).fill(0).map(() => ev(5, true)), { ...ev(6, true), kind: 'match', outcome: 'lost/passed' }];
  const got = new Set(stickers(s, log).filter((x) => x.earned).map((x) => x.id));
  for (const id of ['b1', 'perfect', 'streak10', 'unlucky', 'crown']) assert.ok(got.has(id), id);
  for (const id of ['b2', 'champ', 'crown5', 'night3']) assert.ok(!got.has(id), id);
  assert.equal(stickers(save(), []).filter((x) => x.earned).length, 0);
});
