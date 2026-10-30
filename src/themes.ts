// Per-booth art direction: every booth has its own palette, tablecloth, lights, signs and signature props,
// so each new subject also *looks* like a new place on the midway.

export type PropSet = 'bakery' | 'parlor' | 'toys' | 'spinners' | 'rooftop';

export interface Theme {
  props: PropSet;
  stripeA: string; // canopy stripe colours
  stripeB: string;
  wall: number;
  cloth: { kind: 'rays'; a: string; b: string; rim: string } | { kind: 'felt'; color: string; rim: string };
  neon: [number, number, number]; // left, right, overhead point lights
  keyLight: number; // key light colour
  rim: number; // spotlight behind the rival
  fog: number;
  sky: [string, string, string];
  sign: string;
  signColor: string;
  boards: [string[], string[]];
  exposure: number;
}

export const THEMES: Record<1 | 2 | 3 | 4 | 5, Theme> = {
  1: {
    props: 'bakery',
    stripeA: '#d9343b',
    stripeB: '#f8efe0',
    wall: 0x4b1f3e,
    cloth: { kind: 'rays', a: '#d7313f', b: '#f6e3c6', rim: '#7b1a2a' },
    neon: [0xff4fa3, 0x3ee6ff, 0xffb45a],
    keyLight: 0xffe2b8,
    rim: 0xffc27a,
    fog: 0x24113f,
    sky: ['#120828', '#3a1660', '#7a2a6e'],
    sign: 'PIE DUEL',
    signColor: '#ff4fa3',
    boards: [['עוגות', 'מגישות', 'עולם טוב', 'יותר!'], ['תמיד', 'יש מקום', 'לעוגה', 'נוספת!']],
    exposure: 1.05,
  },
  2: {
    props: 'parlor',
    stripeA: '#5b2a9e',
    stripeB: '#e9dcff',
    wall: 0x2a1240,
    cloth: { kind: 'felt', color: '#1f6b46', rim: '#3a1c10' },
    neon: [0xb36bff, 0x7ee07a, 0xffd27a],
    keyLight: 0xfff0d0,
    rim: 0xb36bff,
    fog: 0x160a28,
    sky: ['#0a0418', '#24104a', '#4a1a5e'],
    sign: 'GRANDMA RINA',
    signColor: '#7ee07a',
    boards: [['ספרו', 'מה נשאר', 'בתותח!'], ['בלי', 'החזרה —', 'הכול', 'משתנה']],
    exposure: 1.0,
  },
  3: {
    props: 'toys',
    stripeA: '#169c8a',
    stripeB: '#f2fff8',
    wall: 0x0d2a34,
    cloth: { kind: 'rays', a: '#17a58f', b: '#f3efe0', rim: '#0d4a42' },
    neon: [0x3ee6ff, 0xffd166, 0xff8ac8],
    keyLight: 0xf2fff4,
    rim: 0x6ff0ff,
    fog: 0x0c2230,
    sky: ['#06121e', '#0f3048', '#1f5a6a'],
    sign: 'TWINS TOYS',
    signColor: '#3ee6ff',
    boards: [['עץ:', 'כופלים', 'לאורך', 'הענף'], ['טבלה:', 'מסתכלים', 'רק על', 'השורה']],
    exposure: 0.95,
  },
  4: {
    props: 'spinners',
    stripeA: '#ff7a1a',
    stripeB: '#1a1030',
    wall: 0x24102a,
    cloth: { kind: 'rays', a: '#ff8a2a', b: '#2a1650', rim: '#5a2a08' },
    neon: [0xff7a1a, 0x3ee6ff, 0xff4fa3],
    keyLight: 0xffe0c0,
    rim: 0xff9a3a,
    fog: 0x1c0a1c,
    sky: ['#100418', '#3a0a3a', '#7a2a2a'],
    sign: 'SPIN!',
    signColor: '#ff9a3a',
    boards: [['הגלגל', 'לא זוכר', 'מה יצא', 'קודם'], ['אחרי', 'רצף —', 'אותו', 'סיכוי!']],
    exposure: 1.05,
  },
  5: {
    props: 'rooftop',
    stripeA: '#ffc35a',
    stripeB: '#2a1650',
    wall: 0x1a1030,
    cloth: { kind: 'rays', a: '#c8913a', b: '#2a1650', rim: '#5a3a10' },
    neon: [0xffc35a, 0xb36bff, 0xff4fa3],
    keyLight: 0xfff0d8,
    rim: 0xffd27a,
    fog: 0x120a26,
    sky: ['#05030f', '#1a0f3a', '#3a1a5a'],
    sign: 'CHAMPION',
    signColor: '#ffc35a',
    boards: [['האלוף', 'לא מנחש.', 'הוא', 'סופר.'], ['בלי', 'רמזים.', 'בהצלחה!']],
    exposure: 1.0,
  },
};

/** Subject cards shown when a booth begins (Workbook terms). */
export const BOOTH_SUBJECTS: Record<1 | 2 | 3 | 4 | 5, { subject: string; grade: string; points: string[] }> = {
  1: {
    subject: 'הסתברות, סולם ההסתברות ומאורע משלים',
    grade: 'כיתה ח׳',
    points: ['הסתברות = מספר התוצאות הרצויות ÷ מספר התוצאות האפשריות', 'בלתי אפשרי = 0, ודאי = 1', 'הסתברות לריק = 1 − הסתברות לעוגה'],
  },
  2: {
    subject: 'הוצאה בלי החזרה ומאורעות תלויים',
    grade: 'כיתה ט׳',
    points: ['אחרי כל ירייה התערובת משתנה', 'הצצה משנה את מה שאתם יודעים — הסתברות מותנית', 'בדיוק חצי? מידע שווה זהב'],
  },
  3: {
    subject: 'דיאגרמת עץ, טבלה דו־ממדית ומודל שטח',
    grade: 'כיתה ט׳',
    points: ['שני שלבים: כופלים לאורך הענף', 'לפחות עוגה אחת = 1 − אף עוגה', 'הסתברות מותנית מטבלה: רק השורה המתאימה'],
  },
  4: {
    subject: 'ניסויים חוזרים, מאורעות בלתי תלויים ושכיחות יחסית',
    grade: 'כיתות ח׳–ט׳',
    points: ['גלגל עם החזרה: הסיכוי לא משתנה אחרי רצף', 'שני סיבובים: כופלים הסתברויות', 'שכיחות יחסית מעריכה הסתברות — יותר ניסויים, הערכה טובה יותר'],
  },
  5: {
    subject: 'מבחן הגמר: הכול ביחד',
    grade: 'כיתות ח׳–ט׳',
    points: ['בלי מד ובלי רמזים', 'ביג מו מציץ ומשתמש בכפולה', 'רק ספירה וחשבון'],
  },
};
