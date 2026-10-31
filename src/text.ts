// Hebrew strings and the small HTML builders the HUD uses. Numbers and fractions always go in LTR isolates.
import type { CardId, BetEvent } from './core/types';

export const ltr = (s: string | number) => `<bdi dir="ltr">${s}</bdi>`;
export const fr = (n: number, d: number) => ltr(`${n}/${d}`);

/** Painted card art (public/cards); the emoji stays as the alt text and the fallback. */
export const cardArt = (id: CardId, cls = 'art') => `<img class="${cls}" src="${import.meta.env.BASE_URL}cards/${id}.jpg" alt="${CARD_INFO[id].icon}" draggable="false">`;

export const CARD_INFO: Record<CardId, { name: string; icon: string; desc: string; c1: string; c2: string }> = {
  peek: { name: 'הצצה', icon: '👀', desc: 'רואים מה המנה הבאה — רק אתם.', c1: '#7a3cd6', c2: '#36146e' },
  eject: { name: 'פליטה', icon: '🌀', desc: 'המנה הבאה עף החוצה ונחשף לכולם. התור נשאר שלך.', c1: '#e8a628', c2: '#8a4a08' },
  double: { name: 'כפולה', icon: '✌️', desc: 'שני מנות ביריב בבת אחת. מספיקה עוגה אחת כדי לפגוע.', c1: '#2d6fd8', c2: '#0f2a66' },
  spinner: { name: 'גלגל', icon: '🎡', desc: 'מכאן והלאה: גלגל עם החזרה באותו סיכוי.', c1: '#d83d8a', c2: '#5e0b38' },
  magnifier: { name: 'זכוכית מגדלת', icon: '🔍', desc: 'רואים מה המנה השנייה בתור.', c1: '#2aa58a', c2: '#0b4a3c' },
  flavor: { name: 'פנס טעמים', icon: '🔦', desc: 'מגלה את הטעם של המנה הבאה: שוקולד או וניל.', c1: '#8a5a2b', c2: '#3a2008' },
};

export const BET_NAME: Record<BetEvent, string> = {
  twoPies: 'שתי עוגות ברצף',
  noPie: 'אף עוגה בשני סיבובים',
  exactlyOne: 'בדיוק עוגה אחת',
  atLeastOne: 'לפחות עוגה אחת',
  pieThenDud: 'קודם עוגה ואז ריק',
};

export const PIE_SVG = `<svg viewBox="0 0 64 52"><path d="M6 26h52l-6 18H12z" fill="#c98a3c" stroke="#7a4a14" stroke-width="2"/><path d="M8 26c2-14 46-14 48 0z" fill="#fffaf0" stroke="#e8d9c0" stroke-width="2"/><circle cx="32" cy="12" r="5" fill="#e0202c"/></svg>`;
export const DUD_SVG = `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#ffffff22" stroke="#fff" stroke-width="3"/><g><rect x="18" y="20" width="8" height="5" fill="#ff4fa3" transform="rotate(20 22 22)"/><rect x="34" y="16" width="8" height="5" fill="#3ee6ff" transform="rotate(-25 38 18)"/><rect x="24" y="34" width="8" height="5" fill="#ffc35a" transform="rotate(40 28 36)"/><rect x="38" y="36" width="8" height="5" fill="#7ee07a" transform="rotate(-10 42 38)"/><rect x="28" y="26" width="7" height="4" fill="#b36bff"/><rect x="16" y="38" width="6" height="4" fill="#3ee6ff"/><rect x="42" y="26" width="6" height="4" fill="#ff4fa3"/></g></svg>`;
export const MYSTERY_SVG = `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#5a4a7a" stroke="#cbb8ff" stroke-width="3"/><text x="32" y="43" text-anchor="middle" font-size="32" font-weight="900" fill="#fff">?</text></svg>`;
export const FACE_YOU = '🙂';

export const RIVAL_FACE: Record<string, string> = {
  'rival-bubu': '👨‍🍳',
  'rival-rina': '👵',
  'rival-twin': '🧒',
  'rival-robo': '🤖',
  'rival-mo': '🎩',
};

export const RULES_HTML = `
<ul class="rules">
  <li>במכונה יש עוגות קצפת וכדורי קונפטי (ריקים). רואים <b>כמה</b> יש מכל סוג — לא את הסדר.</li>
  <li><b>זריקה ליריב:</b> עוגה — ישר לפרצוף שלו. ריק — הוא מחזיר לך עוגת נגד!</li>
  <li><b>זריקה על עצמך (אומץ!):</b> ריק — הקהל משגר עוגת בונוס על היריב. עוגה — הקצפת עליך.</li>
  <li>אחרי כל זריקה התור עובר. מי שנגמרות לו נקודות הקצפת — מפסיד.</li>
  <li>הסתברות לעוגה גדולה מ־${ltr('1/2')}? זרקו על היריב. הסתברות לריק גדולה יותר? כוונו לעצמכם.</li>
  <li>עוברים שלב בניצחון — <b>או</b> ב־${ltr('80%')} החלטות נכונות לפי הסיכויים. מזל רע לא עוצר אתכם.</li>
</ul>`;

/** "עוגה אחת" / "3 עוגות": Hebrew counts with the number in an LTR isolate. */
export const count = (n: number, one: string, many: string) => (n === 1 ? one : `${ltr(n)} ${many}`);

const GENDER: Record<string, 'm' | 'f' | 'pl'> = { 'rival-bubu': 'm', 'rival-rina': 'f', 'rival-twin': 'pl', 'rival-robo': 'm', 'rival-mo': 'm' };
/** Pick the verb form that agrees with the rival (Grandma Rina is feminine, the Twins plural). */
export const rivalVerb = (model: string, m: string, f: string, pl: string) => ({ m, f, pl })[GENDER[model] ?? 'm'];

/** What's new in each level (shown on its goal card). */
export const NEW_IN_LEVEL: Record<number, string> = {
  1: 'מכונת העוגות, מד הסיכויים וסולם ההסתברות',
  2: 'אסימון "נחשו": הניחו אותו על הסולם לפני הזריקה (ניחוש מדויק בלי מד = ז׳יטונים)',
  3: 'רואים רק כמה עוגות — את הריקים מחשבים: המאורע המשלים',
  4: 'בלי מד הסיכויים',
  5: 'בלי החזרה: אחרי כל זריקה סופרים מחדש. המד — רק 3 פעמים',
  6: 'קלפי מידע: הצצה וזכוכית מגדלת (בצד שמאל למטה)',
  7: 'קלף פליטה: בדיוק חצי? פלטו מנה וקבלו מידע',
  8: 'חנות קלפים בין סבבים',
  9: 'אורות עמומים, בלי מד',
  10: 'קלף כפולה ודיאגרמת עץ: לפחות עוגה אחת משתיים',
  11: 'פנס טעמים וטבלה דו־ממדית: הסתברות מותנית',
  12: 'מטבע ושני גלגלים: מודל שטח',
  13: 'מבחן: כפולה, פנס וטבלה — בלי מד',
  14: 'גלגל עם החזרה: הסיכוי לא זוכר רצפים',
  15: 'הימורים על שני סיבובים: כופלים הסתברויות',
  16: 'מכונה מסתורית: זריקות ניסיון ושכיחות יחסית',
  17: 'ביג מו: מציץ, משתמש בכפולה — ובלי רמזים',
};
