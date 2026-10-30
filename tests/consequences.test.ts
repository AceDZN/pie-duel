// Wrong choices produce the advertised, visible consequence (and a one-line worked explanation); the table rule
// "every shot creams exactly one player, the turn always passes" holds for every kind of shot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Duel } from '../src/core/duel';
import { F, S, eventsOf, mag, script, testLevel } from './helpers';

test('aim at yourself on a 3/4 shell → you are creamed, with an explain event selfOnPies (p = 3/4)', () => {
  const d = new Duel(testLevel([script('pie', 'pie', 'dud', 'pie')]));
  assert.equal(S(d.pYou()), '3/4');
  d.fire('self');
  const ev = d.drain();
  assert.deepEqual(
    eventsOf(ev, 'hit').map((h) => [h.who, h.cause]),
    [['you', 'pie']],
  );
  const ex = eventsOf(ev, 'explain');
  assert.equal(ex.length, 1);
  assert.equal(ex[0].key, 'selfOnPies');
  assert.equal(S(ex[0].p), '3/4');
  assert.equal(d.decisions[0].correct, false);
  assert.equal(d.phase, 'rival'); // the turn passes
});

test('aim at the rival on a 1/4 shell → the dud brings the counter-pie on you, explain rivalOnDuds', () => {
  const d = new Duel(testLevel([script('dud', 'pie', 'dud', 'dud')]));
  assert.equal(S(d.pYou()), '1/4');
  d.fire('r1');
  const ev = d.drain();
  assert.deepEqual(
    eventsOf(ev, 'hit').map((h) => [h.who, h.cause]),
    [['you', 'counter']],
  );
  assert.equal(eventsOf(ev, 'explain')[0].key, 'rivalOnDuds');
  assert.equal(d.decisions[0].correct, false);
});

test('a good call that loses to luck is marked unlucky, not wrong', () => {
  const d = new Duel(testLevel([script('dud', 'pie', 'pie', 'pie')]));
  assert.equal(S(d.pYou()), '3/4');
  d.fire('r1');
  const ev = d.drain();
  assert.equal(eventsOf(ev, 'explain')[0].key, 'unlucky');
  assert.equal(d.decisions[0].correct, true);
});

test('a dare that pops a dud sends the bonus pie at the rival you pick; at a rival a pie creams them', () => {
  const twins = testLevel([script('dud', 'pie', 'dud', 'pie', 'dud', 'pie')], { seats: 2 });
  const d = new Duel(twins);
  d.fire('self', 'r2');
  assert.deepEqual(
    eventsOf(d.drain(), 'hit').map((h) => [h.who, h.cause]),
    [['r2', 'dare']],
  );
  const e = new Duel(testLevel([script('pie', 'dud', 'dud')]));
  e.fire('r1');
  assert.deepEqual(
    eventsOf(e.drain(), 'hit').map((h) => [h.who, h.cause]),
    [['r1', 'pie']],
  );
});

test('every shot creams exactly one player (single shots, any target, any shooter)', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const d = new Duel(testLevel([mag(3, 3), mag(2, 5), mag(5, 2)], { hp: { you: 6, rival: 6 } }), seed);
    let g = 0;
    while (d.phase !== 'over' && g++ < 100) {
      const before = d.players.map((p) => p.hp).reduce((a, b) => a + b);
      if (d.phase === 'rival') d.rivalStep();
      else d.fire(seed % 2 ? 'self' : 'r1');
      const after = d.players.map((p) => p.hp).reduce((a, b) => a + b);
      assert.equal(before - after, 1, `seed ${seed}`);
    }
  }
});

test('Double: each pie creams the rival; only two duds bring the counter-pie on you', () => {
  const both = new Duel(testLevel([script('pie', 'pie', 'dud')], { hand: ['double'] }));
  assert.equal(S(both.pDouble()), '1'); // you can't know the order, but 2 pies of 3 make "at least one" certain
  both.useCard('double', { target: 'r1' });
  assert.deepEqual(
    eventsOf(both.drain(), 'hit').map((h) => [h.who, h.cause]),
    [
      ['r1', 'pie'],
      ['r1', 'pie'],
    ],
  );
  const one = new Duel(testLevel([script('dud', 'pie', 'dud')], { hand: ['double'] }));
  one.useCard('double', { target: 'r1' });
  assert.deepEqual(
    eventsOf(one.drain(), 'hit').map((h) => [h.who, h.cause]),
    [['r1', 'pie']],
  );
  const none = new Duel(testLevel([script('dud', 'dud', 'pie')], { hand: ['double'] }));
  assert.equal(S(none.pDouble()), '2/3'); // 1 − 2/3 · 1/2
  none.useCard('double', { target: 'r1' });
  assert.deepEqual(
    eventsOf(none.drain(), 'hit').map((h) => [h.who, h.cause]),
    [['you', 'counter']],
  );
});

test('an exact call on the probability scale earns chips only with the meter hidden; a wrong one never does', () => {
  const d = new Duel(testLevel([script('dud', 'pie', 'dud', 'dud', 'dud')], { meter: { kind: 'off' } }));
  d.call(F(1, 5));
  d.fire('self');
  const ev = eventsOf(d.drain(), 'call')[0];
  assert.deepEqual([ev.exact, ev.paid], [true, true]);
  assert.equal(d.chips, 2);
  const e = new Duel(testLevel([script('dud', 'pie', 'dud', 'dud', 'dud')], { meter: { kind: 'off' } }));
  e.call(F(1, 4)); // "1 of 4 duds" is the classic slip: it is 1 of 5 shells
  e.fire('self');
  assert.equal(eventsOf(e.drain(), 'call')[0].exact, false);
  assert.equal(e.chips, 0);
  // copying the visible meter isn't estimating: exact, but no chips
  const m = new Duel(testLevel([script('dud', 'pie', 'dud', 'dud', 'dud')]));
  m.call(F(1, 5));
  m.fire('self');
  const mv = eventsOf(m.drain(), 'call')[0];
  assert.deepEqual([mv.exact, mv.paid, m.chips], [true, false, 0]);
});
