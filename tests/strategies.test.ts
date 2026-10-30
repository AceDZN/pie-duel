// Monte Carlo strategy comparisons: reading the odds beats constant strategies by a clear measured margin, and no
// constant or random strategy reliably passes a level.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monteCarlo, type Strategy } from '../src/core/sim';
import { LEVELS, levelById } from '../src/levels';

const pct = (x: number) => `${(x * 100).toFixed(0)} %`;

// one Monte Carlo table (300 seeds per level and strategy), shared by the tests below
const cache = new Map<string, ReturnType<typeof monteCarlo>>();
const mc = (id: number, s: Strategy, n = 300) => {
  const k = `${id}:${s}:${n}`;
  if (!cache.has(k)) cache.set(k, monteCarlo(levelById(id), s, n));
  return cache.get(k)!;
};

test('odds beats "always at the rival" and "always at yourself" against Grandma Rina (5, 8) and Big Mo (17) by ≥ 20 points of win rate', () => {
  for (const id of [5, 8, 17]) {
    const odds = mc(id, 'odds', 400);
    const rival = mc(id, 'alwaysRival', 400);
    const self = mc(id, 'alwaysSelf', 400);
    assert.ok(odds.winRate - rival.winRate >= 0.2, `L${id} odds ${pct(odds.winRate)} vs alwaysRival ${pct(rival.winRate)}`);
    assert.ok(odds.winRate - self.winRate >= 0.2, `L${id} odds ${pct(odds.winRate)} vs alwaysSelf ${pct(self.winRate)}`);
    assert.ok(odds.passRate >= 0.9, `L${id} odds passes ${pct(odds.passRate)}`);
  }
});

test('constant and random strategies do not reliably pass: ≤ 50 % in one attempt (booth 1), ≤ 35 % after booth 1', () => {
  const naive: Strategy[] = ['alwaysRival', 'alwaysSelf', 'random'];
  for (const L of LEVELS)
    for (const s of naive) {
      const r = mc(L.id, s);
      const cap = L.booth === 1 ? 0.5 : 0.35;
      assert.ok(r.passRate <= cap, `L${L.id} ${s} passes ${pct(r.passRate)} (cap ${pct(cap)})`);
    }
});

test('reading the odds passes more often than every naive strategy on every level', () => {
  for (const L of LEVELS) {
    const odds = mc(L.id, 'odds').passRate;
    for (const s of ['alwaysRival', 'alwaysSelf', 'random'] as Strategy[]) {
      const r = mc(L.id, s).passRate;
      assert.ok(odds - r >= 0.4, `L${L.id} odds ${pct(odds)} vs ${s} ${pct(r)}`);
    }
  }
});

test("booth 4: the gambler's-fallacy strategy underperforms the odds on Robo-Clown's spinners", () => {
  for (const id of [14, 15, 16]) {
    const odds = mc(id, 'odds', 400);
    const gambler = mc(id, 'gambler', 400);
    assert.ok(odds.winRate - gambler.winRate >= 0.15, `L${id} win: odds ${pct(odds.winRate)} vs gambler ${pct(gambler.winRate)}`);
    assert.ok(odds.passRate - gambler.passRate >= 0.25, `L${id} pass: odds ${pct(odds.passRate)} vs gambler ${pct(gambler.passRate)}`);
  }
});
