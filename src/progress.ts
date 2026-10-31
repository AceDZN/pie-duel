// The progress notebook: accuracy per subject (booth) from the local learning log, the level most worth
// replaying, and stickers earned. Pure functions over the save and the log; nothing leaves the device.
import { BOOTHS } from './levels';
import type { LearnEvent, Save } from './save';

export interface SubjectRow {
  booth: number;
  decisions: number;
  correct: number;
  /** accuracy over the most recent decisions (current skill, not lifetime). */
  recent: number | null;
  /** the level in this booth with the weakest recent accuracy, if it's worth replaying. */
  replay: number | null;
}

const RECENT = 30;
const DECISION_KINDS = new Set(['fire', 'card', 'bet']);

function boothOf(level: number) {
  return BOOTHS.find((b) => (b.levels as readonly number[]).includes(level))?.id ?? null;
}

export function subjectRows(log: LearnEvent[]): SubjectRow[] {
  return BOOTHS.map((b) => {
    const ev = log.filter((e) => DECISION_KINDS.has(e.kind) && typeof e.correct === 'boolean' && boothOf(e.level) === b.id);
    const recent = ev.slice(-RECENT);
    const byLevel = new Map<number, { n: number; ok: number }>();
    for (const e of recent) {
      const r = byLevel.get(e.level) ?? { n: 0, ok: 0 };
      r.n++;
      if (e.correct) r.ok++;
      byLevel.set(e.level, r);
    }
    let replay: number | null = null;
    let worst = 0.8;
    for (const [lvl, r] of byLevel) {
      if (r.n >= 3 && r.ok / r.n < worst) {
        worst = r.ok / r.n;
        replay = lvl;
      }
    }
    return {
      booth: b.id,
      decisions: ev.length,
      correct: ev.filter((e) => e.correct).length,
      recent: recent.length ? recent.filter((e) => e.correct).length / recent.length : null,
      replay,
    };
  });
}

export interface Sticker {
  id: string;
  icon: string;
  name: string;
  how: string;
  earned: boolean;
}

/** Longest run of decisions made by the odds, in log order. */
function bestStreak(log: LearnEvent[]) {
  let run = 0;
  let best = 0;
  for (const e of log) {
    if (!DECISION_KINDS.has(e.kind) || typeof e.correct !== 'boolean') continue;
    run = e.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function stickers(save: Save, log: LearnEvent[]): Sticker[] {
  const boothDone = (id: number) => BOOTHS.find((b) => b.id === id)!.levels.every((l) => save.passed[l]);
  const boothPerfect = BOOTHS.some((b) => b.levels.every((l) => (save.stars[l] ?? 0) >= 3));
  const crowns = Object.values(save.expert ?? {}).filter((n) => n > 0).length;
  const streak = bestStreak(log);
  const unlucky = log.some((e) => e.kind === 'match' && e.outcome === 'lost/passed');
  return [
    { id: 'b1', icon: '🥧', name: 'סופרי העוגות', how: 'עברו את הדוכן ההוגן', earned: boothDone(1) },
    { id: 'b2', icon: '🃏', name: 'בלי החזרה', how: 'עברו את הדוכן של סבתא רינה', earned: boothDone(2) },
    { id: 'b3', icon: '🌳', name: 'גננים של עצים', how: 'עברו את דוכן העצים והטבלאות', earned: boothDone(3) },
    { id: 'b4', icon: '🎡', name: 'אדוני הגלגלים', how: 'עברו את קרנבל הגלגלים', earned: boothDone(4) },
    { id: 'champ', icon: '🏆', name: 'אלופי הקרנבל', how: 'עברו את ביג מו', earned: !!save.passed[17] },
    { id: 'perfect', icon: '🌟', name: 'דוכן מושלם', how: 'שלושה כוכבים בכל השלבים של דוכן אחד', earned: boothPerfect },
    { id: 'streak10', icon: '🎯', name: 'רצף של 10', how: '10 החלטות נכונות ברצף', earned: streak >= 10 },
    { id: 'unlucky', icon: '🍀', name: 'חזקים מהמזל', how: 'הפסידו בקרב אבל עברו את השלב — ההחלטות היו נכונות', earned: unlucky },
    { id: 'crown', icon: '👑', name: 'כתר ראשון', how: 'עברו שלב במצב מומחה', earned: crowns >= 1 },
    { id: 'crown5', icon: '💎', name: 'חמישה כתרים', how: 'כתרים ב־5 שלבים במצב מומחה', earned: crowns >= 5 },
    { id: 'night3', icon: '🌙', name: 'ינשופי הלילה', how: '3 לילות בקרנבל ברצף', earned: (save.nightBest ?? 0) >= 3 },
  ];
}
