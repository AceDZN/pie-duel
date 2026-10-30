// Every authored level loads, is solvable by reading the odds, plays its teaching loads, and its scripted
// teaching moment happens. Numbers measured here are recorded in LEVELS.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Duel, type DuelEvent } from '../src/core/duel';
import { HALF, cmp, complement, str } from '../src/core/frac';
import { monteCarlo, playMatch } from '../src/core/sim';
import type { MagLoad } from '../src/core/types';
import { BOOTHS, LEVELS, levelById } from '../src/levels';
import { F, S, WORKBOOK_MODULES, eventsOf } from './helpers';

const L = levelById;
const mags = (id: number) => L(id).loads.filter((x): x is MagLoad => x.type === 'mag');

// ---------------- structure ----------------

test('17 levels in 5 booths, ids 1..17, the handoff rivals', () => {
  assert.deepEqual(
    LEVELS.map((l) => l.id),
    Array.from({ length: 17 }, (_, i) => i + 1),
  );
  for (const b of BOOTHS) for (const id of b.levels) assert.equal(L(id).booth, b.id, `level ${id} in booth ${b.id}`);
  const style = (id: number) => L(id).rival.style;
  for (const id of [1, 2, 3, 4]) assert.equal(style(id), 'naive');
  for (const id of [5, 6, 7, 8, 9]) assert.equal(style(id), 'odds');
  for (const id of [10, 11, 12, 13]) assert.equal(L(id).rival.seats, 2);
  for (const id of [14, 15, 16]) assert.equal(style(id), 'gambler');
  assert.equal(style(17), 'champion');
  // transfer levels end each booth: no meter
  for (const id of [4, 9, 13, 17]) {
    assert.equal(L(id).transfer, true, `level ${id} is a transfer level`);
    assert.equal(L(id).meter.kind, 'off', `level ${id} has no meter`);
  }
  assert.deepEqual(L(8).meter, { kind: 'limited', uses: 3 });
  assert.equal(L(17).stage, 'rooftop');
  assert.equal(L(9).stage, 'dim');
});

test('loads are consistent: flavor splits and scripted orders match the counts; fractions are proper', () => {
  for (const lv of LEVELS) {
    assert.ok(lv.loads.length > 0);
    for (const ld of lv.loads) {
      if (ld.type === 'mag') {
        assert.ok(ld.pies + ld.duds >= 2, `L${lv.id} mag has at least 2 shells`);
        if (ld.flavors) {
          assert.equal(ld.flavors.choc.pies + ld.flavors.van.pies, ld.pies, `L${lv.id} flavor pies`);
          assert.equal(ld.flavors.choc.duds + ld.flavors.van.duds, ld.duds, `L${lv.id} flavor duds`);
        }
        if (ld.order) {
          assert.equal(ld.order.filter((k) => k === 'pie').length, ld.pies, `L${lv.id} scripted pies`);
          assert.equal(ld.order.length, ld.pies + ld.duds, `L${lv.id} scripted length`);
        }
      } else if (ld.type === 'spin' || ld.type === 'bet' || ld.type === 'mystery') {
        assert.ok(ld.pie.n > 0 && ld.pie.n < ld.pie.d, `L${lv.id} wheel strictly between impossible and certain`);
      } else {
        for (const x of [ld.coin, ld.a, ld.b]) assert.ok(x.n >= 0 && x.n <= x.d);
      }
    }
  }
});

test('Hebrew title and one short goal line; Workbook modules are real routes', () => {
  for (const lv of LEVELS) {
    assert.match(lv.title, /[֐-׿]/, `L${lv.id} title is Hebrew`);
    assert.match(lv.goal, /[֐-׿]/, `L${lv.id} goal is Hebrew`);
    assert.ok(!lv.goal.includes('\n') && lv.goal.length <= 80, `L${lv.id} goal is one short line (${lv.goal.length})`);
    assert.ok(lv.modules.length > 0);
    for (const m of lv.modules) assert.ok(WORKBOOK_MODULES.includes(m), `L${lv.id} module ${m}`);
  }
  // every module the handoff lists is practiced somewhere
  const used = new Set(LEVELS.flatMap((l) => l.modules));
  for (const m of WORKBOOK_MODULES) assert.ok(used.has(m), `module ${m} is practiced`);
});

// ---------------- solvable ----------------

test('every level: reading the odds passes within two attempts on ≥ 95 % of 300 seeds; its first-play seed is won by the odds and lost by constant play', () => {
  for (const lv of LEVELS) {
    const r = monteCarlo(lv, 'odds', 300);
    assert.ok(r.passWithin2 >= 0.95, `L${lv.id} odds passes within 2: ${(r.passWithin2 * 100).toFixed(0)} %`);
    assert.equal(r.accuracy, 1, `L${lv.id} the odds player is always solver-correct`);
    const first = playMatch(lv, 'odds', lv.seed);
    assert.ok(first.won, `L${lv.id} first-play seed ${lv.seed} is won by reading the odds`);
    for (const s of ['alwaysRival', 'alwaysSelf'] as const) assert.equal(playMatch(lv, s, lv.seed).passed, false, `L${lv.id} first-play seed: ${s} does not pass`);
  }
});

test('the teaching loads are actually played (not cut off by the cream points)', () => {
  // [level, load index, minimum share of odds matches that reach it]
  const must: [number, number][] = [
    [1, 1], // after the tutorial, a pie-heavy 3/4
    [2, 1], // "certain" magazine
    [3, 1],
    [4, 2], // 2/5, 3/6 and 4/7 all appear
    [5, 1],
    [6, 1],
    [7, 1],
    [8, 2], // 4/1, 2/2 with the shop, 1/4
    [9, 2], // 4/1, 1/4, 3/3
    [10, 1],
    [11, 1], // the flipped flavors (vanilla is pie-heavy)
    [12, 3],
    [13, 1],
    [14, 1],
    [15, 4],
    [16, 1],
    [17, 2], // magazine, spinner, flavored magazine
  ];
  for (const [id, k] of must) {
    let reached = 0;
    for (let i = 0; i < 300; i++) if (playMatch(L(id), 'odds', 1 + i * 7919).duel.loadIndex >= k) reached++;
    assert.ok(reached / 300 >= 0.75, `L${id} load #${k} reached in ${((100 * reached) / 300).toFixed(0)} % of matches`);
  }
});

// ---------------- scripted teaching moments ----------------

test('L1 tutorial: 1 pie + 2 duds → fire at yourself (dud, dare pie on Bubu), Bubu fires a dud, you splat Bubu with the last pie', () => {
  const d = new Duel(L(1));
  assert.equal(S(d.pYou()), '1/3');
  assert.deepEqual(d.options().best, ['self']);
  d.fire('self');
  let ev = d.drain();
  assert.deepEqual(eventsOf(ev, 'shot')[0], { t: 'shot', shooter: 'you', target: 'you', shell: { kind: 'dud' }, wheel: undefined, slot: 3, of: 3 });
  assert.deepEqual(
    eventsOf(ev, 'hit').map((h) => [h.who, h.cause]),
    [['r1', 'dare']],
  );
  assert.equal(d.phase, 'rival');
  d.rivalStep();
  ev = d.drain();
  assert.equal(eventsOf(ev, 'thought')[0].key, 'always');
  assert.deepEqual(
    eventsOf(ev, 'shot').map((s) => [s.shooter, s.target, s.shell.kind]),
    [['r1', 'you', 'dud']],
  );
  assert.deepEqual(
    eventsOf(ev, 'hit').map((h) => [h.who, h.cause]),
    [['r1', 'counter']],
  );
  assert.equal(S(d.pYou()), '1'); // only the pie is left: certain
  d.fire('r1');
  ev = d.drain();
  assert.deepEqual(
    eventsOf(ev, 'hit').map((h) => [h.who, h.cause, h.hp]),
    [['r1', 'pie', L(1).hp.rival - 3]],
  );
  assert.ok(d.decisions.every((x) => x.correct));
});

test('L2: the scripted rounds reach "impossible" (0 pies left) and "certain" (only pies left)', () => {
  const r = playMatch(L(2), 'odds', L(2).seed);
  const early = r.duel.decisions.filter((x) => x.load <= 1);
  assert.ok(early.some((x) => x.p.n === 0 && x.choice === 'self' && x.correct), 'impossible → fire at yourself');
  assert.ok(early.some((x) => x.p.n === 1 && x.p.d === 1 && x.choice === 'rival' && x.correct), 'certain → fire at Bubu');
});

test('L3: the loading card shows "3 pies of 8"; the dud chance is the complement 5/8', () => {
  const d = new Duel(L(3));
  assert.equal(mags(3)[0].counter, 'piesOfTotal');
  assert.deepEqual(d.magCounts(), { pies: 3, duds: 5, total: 8 });
  assert.equal(S(d.pYou()), '3/8');
  assert.equal(S(d.options().values.self!), '5/8');
  assert.deepEqual(d.options().best, ['self']);
});

test('L4 transfer: the mixes 2/5, 3/6 and 4/7 open the match; at 3/6 both choices count', () => {
  assert.deepEqual(
    mags(4)
      .slice(0, 3)
      .map((m) => `${m.pies}/${m.pies + m.duds}`),
    ['2/5', '3/6', '4/7'],
  );
  const d = new Duel(L(4));
  assert.equal(d.meterVisible(), false);
  assert.equal(S(d.pYou()), '2/5');
  // play to the 3/6 magazine
  let g = 0;
  while (d.loadIndex < 1 && d.phase !== 'over' && g++ < 50) {
    if (d.phase === 'rival') d.rivalStep();
    else d.fire(cmp(d.pYou(), HALF) < 0 ? 'self' : 'r1');
  }
  if (d.phase !== 'over') {
    assert.equal(S(d.pYou()), '1/2');
    assert.deepEqual(d.options().best, ['rival', 'self']);
  }
});

test('L5: 3 pies 3 duds; on the first-play seed two duds come out first and you face 3/4 → fire at Grandma', () => {
  assert.deepEqual([mags(5)[0].pies, mags(5)[0].duds], [3, 3]);
  const r = playMatch(L(5), 'odds', L(5).seed);
  const [first, second] = r.duel.decisions;
  assert.equal(S(first.p), '1/2');
  assert.equal(first.outcome, 'dud');
  assert.equal(S(second.p), '3/4');
  assert.deepEqual(second.best, ['rival']);
  assert.equal(second.load, 0);
});

test('L6: Peek shows a dud; then Grandma faces P(pie | first was a dud) = 2/3 and fires at you', () => {
  const d = new Duel(L(6));
  assert.equal(S(d.pYou()), '1/2');
  assert.ok(d.useCard('peek'));
  const rev = eventsOf(d.drain(), 'reveal')[0];
  assert.equal(rev.shell?.kind, 'dud');
  assert.equal(S(d.pYou()), '0'); // you know it is a dud: impossible to get hit
  d.fire('self');
  d.drain();
  d.rivalStep();
  const th = eventsOf(d.drain(), 'thought')[0];
  assert.equal(th.key, 'odds');
  assert.equal(S(th.p!), '2/3');
  // now you face 1 pie 1 dud: ½ → the Magnifier on the shell after it settles it
  assert.equal(S(d.pYou()), '1/2');
  assert.ok(d.useCard('magnifier', { index: 1 }));
  assert.ok(['0', '1'].includes(S(d.pYou())));
});

test('L7: at exactly ½ with Eject in hand, ejecting is the scored best move; afterwards the odds tip to 1/3 or 2/3', () => {
  const d = new Duel(L(7));
  assert.equal(S(d.pYou()), '1/2');
  assert.deepEqual(d.options().best, ['eject']);
  assert.ok(d.useCard('eject'));
  assert.ok(d.decisions[0].correct);
  assert.ok(['1/3', '2/3'].includes(S(d.pYou())), S(d.pYou()));
});

test('L8: the odds meter can be switched on only 3 times', () => {
  const d = new Duel(L(8));
  assert.equal(d.meterVisible(), false);
  const uses: boolean[] = [];
  let g = 0;
  while (uses.length < 4 && d.phase !== 'over' && g++ < 60) {
    if (d.phase === 'rival') d.rivalStep();
    else if (d.phase === 'shop') d.leaveShop();
    else {
      uses.push(d.useMeter());
      d.fire(cmp(d.pYou(), HALF) < 0 ? 'self' : 'r1');
    }
  }
  assert.deepEqual(uses, [true, true, true, false]);
});

test('L10: Double on 3 pies 2 duds — P(at least one pie) = 9/10 beats 3/5 for a single shot', () => {
  const d = new Duel(L(10));
  const o = d.options();
  assert.equal(S(o.values.rival!), '3/5');
  assert.equal(S(o.values.self!), '2/5');
  assert.equal(S(o.values.double!), '9/10');
  assert.deepEqual(o.best, ['double', 'rival']); // Double is the better move; firing at the rival is still right
});

test('L11: the flavor light — chocolate 4/5 → fire at a twin; vanilla 1/5 → fire at yourself', () => {
  const choc = new Duel(L(11));
  assert.equal((choc.load as { nextFlavor?: string }).nextFlavor, 'choc');
  assert.equal(S(choc.pYou()), '4/5');
  assert.deepEqual(choc.options().best, ['rival']);
  let seed = 1;
  let van = new Duel(L(11), seed);
  while ((van.load as { nextFlavor?: string }).nextFlavor !== 'van') van = new Duel(L(11), ++seed);
  assert.equal(S(van.pYou()), '1/5');
  assert.deepEqual(van.options().best, ['self']);
  // the second magazine flips the table: vanilla is the pie-heavy flavor (3 of 4)
  const second = mags(11)[1].flavors!;
  assert.deepEqual([second.van.pies, second.van.pies + second.van.duds], [3, 4]);
});

test('L12: area model — the first coin round is ½·3/4 + ½·1/4 = ½', () => {
  const d = new Duel(L(12));
  assert.equal(d.load.type, 'coin');
  assert.equal(S(d.pYou()), '1/2');
  assert.deepEqual(d.options().best, ['rival', 'self']);
});

test('L14: the spinner keeps P(pie) = 1/4 whatever came before', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const d = new Duel(L(14), seed);
    while (d.loadIndex === 0 && d.phase === 'decide') {
      assert.equal(S(d.pYou()), '1/4', `seed ${seed} after ${(d.load as { history: string[] }).history.join(',')}`);
      d.fire('self');
      while (d.rivalStep());
    }
  }
});

test('L15: bet "no pie in two spins" (9/16) over "two pies in a row" (1/16)', () => {
  const d = new Duel(L(15));
  assert.equal(d.phase, 'bet');
  assert.ok(d.bet('noPie'));
  const dec = d.decisions[0];
  assert.equal(S(dec.values.noPie!), '9/16');
  assert.equal(S(dec.values.twoPies!), '1/16');
  assert.deepEqual(dec.best, ['noPie']);
  assert.ok(dec.correct);
});

test('L16: relative frequency — 4 test shots often mislead, 20 almost never', () => {
  // first mystery wheel is 4/5 pies; count how often the estimate is on the wrong side of ½ (or exactly ½)
  let wrong4 = 0;
  let wrong20 = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const d = new Duel(L(16), seed);
    assert.equal(d.phase, 'test');
    d.testFire(4);
    if (cmp(d.mysteryEstimate(), HALF) <= 0) wrong4++;
    while (d.testFire(4));
    assert.equal((d.load as { tests: boolean[] }).tests.length, 20);
    if (cmp(d.mysteryEstimate(), HALF) <= 0) wrong20++;
  }
  assert.ok(wrong4 / 300 > 0.1, `4 trials mislead ${wrong4}/300`); // exact: P(X ≤ 2 | n=4, p=4/5) = 0.1808
  assert.ok(wrong20 / 300 < 0.02, `20 trials mislead ${wrong20}/300`); // exact: P(X ≤ 10 | n=20, p=4/5) ≈ 0.0026
});

test('L17 final: no meter, Big Mo peeks, and the match mixes a magazine, a spinner, a flavored magazine and Double', () => {
  const lv = L(17);
  assert.equal(lv.rivalPeeks, 2);
  assert.deepEqual(
    lv.loads.slice(0, 3).map((x) => x.type),
    ['mag', 'spin', 'mag'],
  );
  assert.ok((lv.loads[2] as MagLoad).flavors);
  assert.ok(lv.hand?.includes('double') && lv.hand.includes('flavor'));
  const d = new Duel(lv);
  assert.equal(S(d.pDouble()), '9/10');
  assert.equal(str(complement(F(3, 5))), '2/5');
});

test('every level runs to the end under every strategy without getting stuck', () => {
  for (const lv of LEVELS)
    for (const s of ['odds', 'alwaysRival', 'alwaysSelf', 'random', 'gambler'] as const) {
      const r = playMatch(lv, s, 12345);
      assert.equal(r.over, true, `L${lv.id} ${s} finished`);
      const evs: DuelEvent[] = r.duel.drain();
      assert.ok(evs.some((e) => e.t === 'over'));
    }
});
