// Shared helpers for the pure-core tests (not a test file itself).
import type { DuelEvent } from '../src/core/duel';
import { frac, str, type Frac } from '../src/core/frac';
import type { LevelDef, Load, MagLoad, RivalStyle, ShellKind } from '../src/core/types';

export const F = (n: number, d = 1) => frac(n, d);
export const S = (x: Frac) => str(x);

export const mag = (pies: number, duds: number, extra: Partial<MagLoad> = {}): MagLoad => ({ type: 'mag', pies, duds, ...extra });

/** A scripted magazine: shells in this exact order (only for the first pass through the loads). */
export const script = (...kinds: ShellKind[]): MagLoad =>
  mag(kinds.filter((k) => k === 'pie').length, kinds.filter((k) => k === 'dud').length, { order: kinds });

/** A minimal test level. */
export function testLevel(loads: Load[], over: Partial<LevelDef> & { style?: RivalStyle; seats?: 1 | 2 } = {}): LevelDef {
  const { style = 'odds', seats = 1, ...rest } = over;
  return {
    id: 99,
    booth: 1,
    title: 'בדיקה',
    goal: 'בדיקה',
    rival: { name: 'בדיקה', style, model: 'test', seats },
    hp: { you: 9, rival: 9 },
    loads,
    meter: { kind: 'on' },
    callIt: true,
    startChips: 0,
    seed: 1,
    modules: [],
    ...rest,
  };
}

/** Events of one type. */
export function eventsOf<T extends DuelEvent['t']>(events: DuelEvent[], t: T) {
  return events.filter((e) => e.t === t) as Extract<DuelEvent, { t: T }>[];
}

/** The twelve Workbook modules this game practices (all verified routes, see CURRICULUM.md). */
export const WORKBOOK_MODULES = [
  '/math/grade-8/chapter-5/probability-scale',
  '/math/grade-8/chapter-5/classical-probability',
  '/math/grade-8/chapter-5/complementary-events',
  '/math/grade-8/chapter-5/experimental-probability',
  '/math/grade-9/chapter-6/conditional-probability-intuition',
  '/math/grade-9/chapter-6/relative-frequency-to-probability',
  '/math/grade-9/chapter-6/tree-diagrams-two-stage',
  '/math/grade-9/chapter-6/two-way-tables-probability',
  '/math/grade-9/chapter-6/area-model-probability',
  '/math/grade-9/chapter-6/dependent-and-independent-events',
  '/math/grade-9/chapter-6/mutually-exclusive-events',
  '/math/grade-9/chapter-6/repeated-independent-trials',
];
