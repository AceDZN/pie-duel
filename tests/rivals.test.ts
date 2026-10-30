// Rival AI: Bubu always aims at you; Grandma Rina (and the Twins) follow the odds they can see; Robo-Clown
// follows the odds but flips after two equal results on a spinner (the gambler's fallacy); Big Mo peeks when unsure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Duel } from '../src/core/duel';
import { monteCarlo } from '../src/core/sim';
import { HALF, cmp, frac } from '../src/core/frac';
import type { ShellKind } from '../src/core/types';
import { levelById } from '../src/levels';
import { S, mag, script, testLevel } from './helpers';

/** Walk a duel with random-ish player moves and hand every rival decision to `check`. */
function rivalTurns(d: Duel, check: (d: Duel) => void, seed = 1) {
  let r = seed;
  const coin = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296) < 0.5;
  let g = 0;
  while (d.phase !== 'over' && g++ < 300) {
    if (d.phase === 'rival') {
      check(d);
      d.rivalStep();
    } else if (d.phase === 'decide') d.fire(coin() ? 'self' : d.aliveRivals()[0].id);
    else if (d.phase === 'shop') d.leaveShop();
    else if (d.phase === 'test') {
      d.testFire(4);
      d.startDuel();
    } else if (d.phase === 'bet') {
      const L = d.load;
      if (L.type === 'bet') d.bet(L.options[0]);
    }
  }
}

test('Chef Bubu always aims at you, whatever the odds', () => {
  let n = 0;
  for (const id of [1, 2, 3, 4])
    for (let seed = 1; seed <= 30; seed++)
      rivalTurns(
        new Duel(levelById(id), seed),
        (d) => {
          const plan = d.rivalPlan();
          assert.equal(plan.target, 'you');
          assert.equal(plan.thought.key, 'always');
          n++;
        },
        seed,
      );
  assert.ok(n > 300);
});

test('Grandma Rina follows the odds she can see: at you when P(pie) ≥ ½, at herself when P(pie) < ½', () => {
  let below = 0;
  let above = 0;
  for (const id of [5, 6, 7, 8, 9])
    for (let seed = 1; seed <= 30; seed++)
      rivalTurns(
        new Duel(levelById(id), seed),
        (d) => {
          const plan = d.rivalPlan();
          const L = d.load;
          assert.equal(L.type, 'mag');
          if (L.type !== 'mag') return;
          // her view: everything left is unknown to her (she doesn't see your peeks)
          const p = frac(L.shells.filter((s) => s.kind === 'pie').length, L.shells.length);
          assert.equal(S(plan.thought.p!), S(p));
          if (cmp(p, HALF) < 0) {
            below++;
            assert.equal(plan.target, d.turn, `self at ${S(p)}`);
          } else {
            above++;
            assert.equal(plan.target, 'you', `you at ${S(p)}`);
          }
        },
        seed,
      );
  assert.ok(below > 50 && above > 50, `both sides seen (${below}, ${above})`);
});

test('the Twins play the odds too, and only ever aim at you or themselves', () => {
  for (let seed = 1; seed <= 30; seed++)
    rivalTurns(
      new Duel(levelById(12), seed),
      (d) => {
        const plan = d.rivalPlan();
        const p = plan.thought.p!;
        assert.equal(plan.target, cmp(p, HALF) < 0 ? d.turn : 'you');
      },
      seed,
    );
});

test('Robo-Clown on a spinner: after two pies "a dud is due" → fires at itself; after two duds "a pie is due" → at you', () => {
  const at = (pie: [number, number], history: ShellKind[]) => {
    const d = new Duel(testLevel([{ type: 'spin', pie: frac(...pie), spins: 9 }], { style: 'gambler' }));
    const L = d.load;
    if (L.type !== 'spin') throw new Error('spin');
    L.history = history;
    d.turn = 'r1';
    d.phase = 'rival';
    return d.rivalPlan();
  };
  // the fallacy where it costs Robo: on a 3/4 wheel after two pies it dares itself (3/4 to cream itself)
  let p = at([3, 4], ['pie', 'pie']);
  assert.deepEqual([p.target, p.thought.key], ['r1', 'dudDue']);
  // on a 1/4 wheel after two duds it fires at you (3/4 it eats your counter-pie)
  p = at([1, 4], ['dud', 'dud']);
  assert.deepEqual([p.target, p.thought.key], ['you', 'pieDue']);
  // mixed recent results: back to the odds
  p = at([3, 4], ['dud', 'pie']);
  assert.deepEqual([p.target, p.thought.key], ['you', 'odds']);
  p = at([1, 4], ['pie', 'dud']);
  assert.deepEqual([p.target, p.thought.key], ['r1', 'odds']);
  // only the last two count
  p = at([1, 4], ['pie', 'dud', 'dud']);
  assert.equal(p.thought.key, 'pieDue');
  // and P never changed: the thought carries the true 1/4
  assert.equal(S(p.thought.p!), '1/4');
});

test('Robo-Clown on a magazine (no streak logic there) follows the odds', () => {
  const d = new Duel(testLevel([script('pie', 'pie', 'pie', 'dud', 'dud')], { style: 'gambler' }));
  d.fire('r1'); // pie
  const plan = d.rivalPlan();
  assert.equal(plan.thought.key, 'odds');
  assert.equal(S(plan.thought.p!), '1/2');
  assert.equal(plan.target, 'you');
});

test("Robo-Clown's fallacy is exploitable: the same odds player wins clearly more often against Robo than against an odds-playing Robo", () => {
  for (const id of [14, 16]) {
    const robo = levelById(id);
    const honest = { ...robo, rival: { ...robo.rival, style: 'odds' as const } };
    const vsRobo = monteCarlo(robo, 'odds', 400).winRate;
    const vsHonest = monteCarlo(honest, 'odds', 400).winRate;
    assert.ok(vsRobo - vsHonest >= 0.1, `L${id}: ${(vsRobo * 100).toFixed(0)} % vs ${(vsHonest * 100).toFixed(0)} %`);
  }
  // and he really does make streak moves in level 14
  let fallacyMoves = 0;
  for (let seed = 1; seed <= 100; seed++)
    rivalTurns(
      new Duel(levelById(14), seed),
      (x) => {
        if (['dudDue', 'pieDue'].includes(x.rivalPlan().thought.key)) fallacyMoves++;
      },
      seed,
    );
  assert.ok(fallacyMoves > 50, `streak moves: ${fallacyMoves}`);
});

test('Big Mo peeks when 1/3 ≤ P(pie) ≤ 2/3, then acts on what he saw', () => {
  const mo = (order: ShellKind[], peeks = 2) => {
    const d = new Duel(testLevel([script(...order)], { style: 'champion', rivalPeeks: peeks }));
    d.turn = 'r1';
    d.phase = 'rival';
    return d;
  };
  // 1 pie 2 duds: P = 1/3 → peek
  let d = mo(['pie', 'dud', 'dud']);
  let plan = d.rivalPlan();
  assert.equal(plan.peek, true);
  d.rivalStep(); // peeks, doesn't shoot yet
  assert.equal(d.rivalPeeks, 1);
  assert.equal(d.phase, 'rival');
  plan = d.rivalPlan(); // he saw a pie: certain → at you
  assert.deepEqual([plan.peek, plan.target, S(plan.thought.p!)], [false, 'you', '1']);
  // 2/3 → peek; he sees a dud → dares himself
  d = mo(['dud', 'pie', 'pie']);
  d.rivalStep();
  plan = d.rivalPlan();
  assert.deepEqual([plan.target, S(plan.thought.p!)], ['r1', '0']);
  // outside [1/3, 2/3] no peek: 3/4 → at you, 1/4 → himself
  plan = mo(['pie', 'pie', 'dud', 'pie']).rivalPlan();
  assert.deepEqual([plan.peek, plan.target], [false, 'you']);
  plan = mo(['dud', 'pie', 'dud', 'dud']).rivalPlan();
  assert.deepEqual([plan.peek, plan.target], [false, 'r1']);
  // no peeks left → plain odds even at ½
  plan = mo(['dud', 'pie'], 0).rivalPlan();
  assert.deepEqual([plan.peek, plan.target], [false, 'you']);
  // spinner rounds: nothing to peek at
  const s = new Duel(testLevel([{ type: 'spin', pie: frac(1, 2), spins: 4 }, mag(1, 1)], { style: 'champion', rivalPeeks: 2 }));
  s.turn = 'r1';
  s.phase = 'rival';
  assert.equal(s.rivalPlan().peek, false);
});

test('Big Mo in the final uses at most his two peeks', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const d = new Duel(levelById(17), seed);
    let peeks = 0;
    rivalTurns(d, (x) => {
      if (x.rivalPlan().peek) peeks++;
    });
    assert.ok(peeks <= 2);
  }
});

test(
  'two seats: when a twin creams itself out on its own turn, the other twin still gets its turn',
  () => {
    // r1 has 1 point and fires at you with a dud → the counter-pie creams r1 out. Next should be r2, not you.
    const lv = testLevel([script('pie', 'dud', 'pie', 'pie')], { seats: 2, hp: { you: 9, rival: 1 } });
    const d = new Duel(lv);
    d.fire('self'); // a pie on you; turn → r1
    assert.equal(d.turn, 'r1');
    assert.equal(d.rivalPlan().target, 'you'); // r1 sees 2 pies of 3 and fires at you… the dud
    d.rivalStep();
    const r1 = d.player('r1');
    assert.equal(r1.hp, 0, 'r1 is out');
    assert.equal(d.turn, 'r2');
  },
);

test('Big Mo fires his Double when "at least one pie in two" beats his best single shot, and only once', () => {
  let used = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const d = new Duel(levelById(17), seed);
    let guard = 0;
    while (d.phase !== 'over' && guard++ < 400) {
      if (d.phase === 'rival') {
        const before = d.rivalDoubles;
        const plan = d.rivalPlan();
        d.rivalStep();
        const ev = d.drain();
        if (plan.double) {
          assert.equal(d.rivalDoubles, before - 1);
          assert.ok(ev.some((e) => e.t === 'card' && e.card === 'double' && e.who === 'r1'));
          assert.equal(ev.filter((e) => e.t === 'shot').length, 2);
          used++;
        }
      } else if (d.phase === 'shop') d.leaveShop();
      else d.fire(d.options().best.includes('self') && !d.options().best.includes('rival') ? 'self' : 'r1');
      d.drain();
    }
    assert.ok(d.rivalDoubles >= 0);
  }
  assert.ok(used > 20, `Big Mo used Double in ${used} of 200 matches`);
});
