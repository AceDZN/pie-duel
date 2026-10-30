# Pie Duel — curriculum map

Source of truth: Workbook (the Israeli Ministry of Education curriculum as published in Workbook), grade 8 chapter 5
(אחוזים, סטטיסטיקה והסתברות) and grade 9 chapter 6 (הסתברות מותנית ומאורעות). Saved snapshots:
`/Users/acedzn/idea-plotter/reports/math-games-2026-10-30/curriculum/grade-8_chapter-5_*.md` and `grade-9_chapter-6_*.md`.

Every URL below was checked on 30 Oct 2026: each module is listed in https://www.workbook.co.il/llms-full.txt and in the
snapshot header, and `https://www.workbook.co.il/math/<grade>/<chapter>/<module>` answers 200 (it redirects to the
canonical `https://math.workbook.co.il/<grade>/<chapter>/<module>` shown in the snapshots). A made-up module id answers 404.
The level data carries the same routes in `modules` (`/math/grade-…`), and `tests/levels.test.ts` checks that every level
uses only these twelve routes and that all twelve are practiced.

| Module | Workbook title | URL |
|---|---|---|
| probability-scale | סולם ההסתברות | https://www.workbook.co.il/math/grade-8/chapter-5/probability-scale |
| classical-probability | הסתברות במצבים סימטריים | https://www.workbook.co.il/math/grade-8/chapter-5/classical-probability |
| complementary-events | המאורע המשלים ואיחוד מאורעות | https://www.workbook.co.il/math/grade-8/chapter-5/complementary-events |
| experimental-probability | שכיחות יחסית והסתברות ניסויית | https://www.workbook.co.il/math/grade-8/chapter-5/experimental-probability |
| conditional-probability-intuition | האם מידע חדש משנה הסתברות? | https://www.workbook.co.il/math/grade-9/chapter-6/conditional-probability-intuition |
| relative-frequency-to-probability | שכיחות יחסית כהערכה להסתברות | https://www.workbook.co.il/math/grade-9/chapter-6/relative-frequency-to-probability |
| tree-diagrams-two-stage | דיאגרמת עץ לניסוי דו-שלבי | https://www.workbook.co.il/math/grade-9/chapter-6/tree-diagrams-two-stage |
| two-way-tables-probability | טבלה דו-ממדית והסתברות מותנית | https://www.workbook.co.il/math/grade-9/chapter-6/two-way-tables-probability |
| area-model-probability | מודל שטח להסתברות של שני מאורעות | https://www.workbook.co.il/math/grade-9/chapter-6/area-model-probability |
| dependent-and-independent-events | תלות ואי תלות | https://www.workbook.co.il/math/grade-9/chapter-6/dependent-and-independent-events |
| mutually-exclusive-events | מאורעות זרים ואיחוד מאורעות | https://www.workbook.co.il/math/grade-9/chapter-6/mutually-exclusive-events |
| repeated-independent-trials | ניסויים חוזרים בלתי תלויים | https://www.workbook.co.il/math/grade-9/chapter-6/repeated-independent-trials |

## Why the table rule differs from the handoff

The handoff used Buckshot Roulette's rule: a dud at yourself keeps your turn, otherwise the turn passes. An exact DP
showed that under that rule **always firing at the rival is optimal in every state**, so the handoff's "> ½" rule would
have taught a losing strategy and rewarded a constant one. The game instead uses: **every shot is a call and the turn
always passes.** At a rival: a pie creams the rival, a dud brings the rival's counter-pie on you. At yourself (a dare): a
pie creams you, a dud sends the dare-bonus pie at a rival. Now the shell used, the information revealed and the next
shooter are the same whichever target you pick; only who loses the point differs. So "aim at the rival iff P(pie) > ½, at
yourself iff P(pie) < ½, either at exactly ½" is exactly optimal: the probability comparison *is* the winning strategy.
`tests/prob.test.ts` proves this with an exact game DP (six mixes, every score up to 5–5, against a perfect rival).

The decision a student makes every turn is the Workbook comparison of an event with its complement: P(pie) vs
P(dud) = 1 − P(pie), on the scale from בלתי אפשרי (0) to ודאי (1).

## Level → modules, skill, misconception

| Level | Modules | Skill practiced | Misconception it checks |
|---|---|---|---|
| 1 עוגה אחת, שני ריקים | probability-scale, classical-probability | P(pie) = pies ÷ shells (1/3); compare with P(dud) = 2/3 and act | "two outcomes, so 50-50" (Workbook: הזנחת מרחב המדגם); "aiming at yourself is always bad" |
| 2 ודאי ובלתי אפשרי | probability-scale, classical-probability | recognize 0 (בלתי אפשרי) and 1 (ודאי) as they happen; call-it tokens on the scale | "very unlikely" vs "impossible" (Workbook FAQ: ההבדל בין 'לא סביר' לבין 'בלתי אפשרי') |
| 3 המאורע המשלים | complementary-events, classical-probability | from "3 pies of 8" compute P(dud) = 1 − 3/8 = 5/8 | comparing pies to duds (3/5) instead of to the whole (3/8); forgetting the complement |
| 4 מבחן: הנקמה של בובו | classical-probability, complementary-events, probability-scale | no meter: count 2/5, 3/6, 4/7 yourself; ½ is a genuine tie | needing the meter; treating ½ as "must pick right" |
| 5 ספירה לאחור | dependent-and-independent-events, conditional-probability-intuition | הוצאה בלי החזרה: 3/6 → 3/5 → 3/4 after two duds | "the mix is still 3 and 3" — forgetting the mix changed after a shot |
| 6 הצצה | conditional-probability-intuition, dependent-and-independent-events | new information (Peek, Magnifier) shrinks the sample space: P(pie \| first was a dud) = 2/3 | "after a dud the next is still ½" |
| 7 פליטה | conditional-probability-intuition, dependent-and-independent-events | at exactly ½, a revealed shell tips the odds to 1/3 or 2/3 | "½ means nothing can be done"; information has no value |
| 8 המשחק של סבתא | dependent-and-independent-events, conditional-probability-intuition, complementary-events | all of booth 2 with a limited meter (3 uses) and the card shop | relying on the meter instead of counting |
| 9 מבחן: משחק הלילה של סבתא | dependent-and-independent-events, conditional-probability-intuition | transfer: 4/5, 1/5, 3/6 with no meter in a dim booth | same as 5–8, unaided |
| 10 ירייה כפולה | tree-diagrams-two-stage, mutually-exclusive-events | tree for two shots without replacement: P(pie,pie) = 3/5·2/4 = 3/10; P(at least one) = 1 − 2/5·1/4 = 9/10 (the three disjoint branches pp, pd, dp, or the complement of dd) | P(A and B) = P(A) + P(B); forgetting the second stage changed |
| 11 פנס הטעמים | two-way-tables-probability, conditional-probability-intuition | read the row of the lit flavor in a טבלה דו־ממדית: P(pie \| chocolate) = 4/5, P(pie \| vanilla) = 1/5; the second table flips | using the whole-table ratio (5/10) instead of the condition's row; memorizing "chocolate = pie" |
| 12 מודל השטח | area-model-probability, tree-diagrams-two-stage | P(pie) = P(A)·a + P(B)·b as shaded area: ½·¾ + ½·¼ = ½; ¾·1 + ¼·¼ = 13/16 | averaging the two wheels when the coin is unfair; adding instead of multiplying along a path |
| 13 מבחן: הגמר של התאומים | tree-diagrams-two-stage, two-way-tables-probability, conditional-probability-intuition | transfer: Double and Flavor with new tables, no meter | memory instead of the table; sum for "and" |
| 14 הסביבון | repeated-independent-trials, dependent-and-independent-events | עם החזרה: P stays ¼ every spin; exploit a rival who believes in streaks | the gambler's fallacy ("after two pies a dud is due") |
| 15 פעמיים ברצף | repeated-independent-trials, tree-diagrams-two-stage | multiply along a sequence: (¼)² = 1/16 vs (¾)² = 9/16; "exactly one" = 2·p·q counts two orders; "at least one" = 1 − q² | P(A and B) = P(A) + P(B); ignoring order (pie-then-dud ¼ vs exactly one ½) |
| 16 התותח המסתורי | experimental-probability, relative-frequency-to-probability | estimate an unknown wheel by שכיחות יחסית; 20 trials are far more reliable than 4 | treating a 4-trial relative frequency as exact (Workbook FAQ: למה מדגם קטן יכול להטעות) |
| 17 מבחן הגמר: האלוף | conditional-probability-intuition, tree-diagrams-two-stage, repeated-independent-trials, complementary-events | final transfer: magazines, a spinner, a flavored magazine, Double; no hints, a rival who plays perfectly by the odds | every misconception above, unaided |

## Hebrew terms (as Workbook uses them)

הסתברות; סולם ההסתברות, בלתי אפשרי (0), ודאי (1); המאורע המשלים / מאורע משלים; הוצאה בלי החזרה, עם החזרה;
מאורעות תלויים / בלתי תלויים; הסתברות מותנית; דיאגרמת עץ; טבלה דו-ממדית; מודל שטח; שכיחות יחסית; ניסויים חוזרים
(בלתי תלויים); מאורעות זרים, איחוד מאורעות; "לפחות אחד".

Note: the handoff lists "מקרים אפשריים / רצויים". The saved classical-probability module says **תוצאות אפשריות /
תוצאות רצויות** and also **מקרים נוחים מתוך כלל המקרים האפשריים**; it never says "מקרים רצויים". Use one of Workbook's
pairs in the HUD and explanations (e.g. "תוצאות רצויות ÷ תוצאות אפשריות").

Game words (not Workbook terms): עוגה (pie), ריק (dud), פגז (shell), תותח (the Pie-o-Matic), ירייה כפולה, הצצה, פליטה,
זכוכית מגדלת, פנס טעמים, סביבון.
