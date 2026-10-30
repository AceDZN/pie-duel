// Saved progress (stars, unlocks, carried decisions) and anonymous local learning events. localStorage only.
import type { Decision } from './core/duel';

const KEY = 'pie-duel.v1';
const LOG_KEY = 'pie-duel.log.v1';

export interface Save {
  stars: Record<number, number>;
  passed: Record<number, boolean>;
  /** decisions from unpassed attempts, carried into the next attempt (fairness rule). */
  carry: Record<number, Decision[]>;
  settings: { muted: boolean; reduced: boolean; fast?: boolean; music?: boolean };
  /** longest run of carnival nights passed. */
  nightBest?: number;
  /** how many times each level was started (the first play uses the authored seed). */
  plays?: Record<number, number>;
  /** booths whose subject card was shown. */
  seenBooths?: Record<number, boolean>;
  /** expert-mode results per level (stars). */
  expert?: Record<number, number>;
}

export function loadSave(): Save {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (s && s.stars) return { carry: {}, settings: { muted: false, reduced: false }, ...s };
  } catch {
    /* ignore */
  }
  return { stars: {}, passed: {}, carry: {}, settings: { muted: false, reduced: false } };
}

export function writeSave(s: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage may be unavailable */
  }
}

export interface LearnEvent {
  t: number;
  level: number;
  kind: string;
  choice?: string;
  p?: string;
  correct?: boolean;
  hinted?: boolean;
  attempt: number;
  firstTry: boolean;
  outcome?: string;
}

const memLog: LearnEvent[] = [];

export function logEvent(e: LearnEvent) {
  memLog.push(e);
  try {
    const all: LearnEvent[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
    all.push(e);
    localStorage.setItem(LOG_KEY, JSON.stringify(all.slice(-800)));
  } catch {
    /* ignore */
  }
}

export function sessionLog() {
  return memLog;
}
