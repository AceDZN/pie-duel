# Pie Duel — levels

Every level, its exact math, the verified solution and the Monte Carlo numbers. The data is in `src/levels.ts`;
the proofs are in `tests/levels.test.ts`, `tests/strategies.test.ts`, `tests/fairness.test.ts`, `tests/rivals.test.ts`.
Curriculum links: `CURRICULUM.md`.

## The table rule (and why it changed from the handoff)

Every shot is a call and **the turn always passes**:

| You aim at… | Pie | Dud |
|---|---|---|
| a rival | the rival is creamed | the rival's counter-pie creams **you** |
| yourself (a dare) | **you** are creamed | the dare-bonus pie creams a rival (you pick which) |

So every shot creams exactly one player (`tests/consequences.test.ts` checks this on 60 seeded matches).

The handoff's Buckshot rule ("a dud at yourself keeps your turn, otherwise the turn passes") made "always fire at the
rival" optimal in every state (exact DP by the lead), so the game would have taught the wrong lesson. Under the table
rule above, **aim at the rival iff P(pie) > ½, at yourself iff P(pie) < ½, either at exactly ½** is exactly optimal:
whichever target you pick, the same shell is used up, the same seat fires next and the same shell is revealed; only who
loses the point differs, and losing it is never better. `tests/prob.test.ts` proves it with an exact game DP over six
mixes and every score up to 5–5, against a perfectly playing rival, and checks that ½ is an exact tie.

**Double** fires two shells at one rival: each pie creams them; only two duds bring the counter-pie on you, so it
works with P(at least one pie) = 1 − P(dud, dud). **Eject** throws the next shell out (revealed) without using your turn;
it is the scored best move only at exactly ½, where either reveal tips the next shot off ½ (from ½ to 2/3 at 2 pies 2
duds). Off ½ it does not change your next-shot chance (a martingale: both reveals stay on the same side of ½; checked for
every mix up to 12 shells).

**Passing (fairness):** win the match, *or* read the odds: ≥ 80 % solver-correct over ≥ 3 decisions, the match asked
both a pie-likely and a dud-likely question, and you answered both correctly at least once. Decisions from earlier
unpassed attempts carry into the rematch (last 16). Stars: 3 = odds read at ≥ 95 %, 2 = odds read, 1 = won only.

### Two structural facts every level designer should know

1. **Every shot costs exactly one cream point**, so a match lasts at most `you + rival − 1` shots (two seats:
   `you + 2·rival − 1`). Loads past that are never played. The handoff draft of level 17 (5 v 5, 9 shots max) never
   reached its flavor magazine; levels 4 and 9 never reached their 3/6 mix. All fixed below, and a test now checks that
   each level's teaching loads are reached in ≥ 75 % of odds matches.
2. **You always fire first on a fresh load, and the last shell is always certain.** In an even magazine the rival fires
   that last, certain shell; in an odd one you do. With both sides playing the ½ rule the expected cream difference of
   one magazine is −1 for 2/4, 3/6, 4/8 (rival's favor) and +1 for 3/5, 2/5 (yours). Eject and Double use up an extra
   shell and so flip who gets the last shell: at 3/4 an Eject swings the expected difference from −½ to +1, at 3/5 from
   +1 to −4/5. The scoring only rewards Eject at ½ (where it also helps at the match level, since ½ needs an even
   count); off ½ it is neither rewarded nor punished.

## Monte Carlo table (`npm run mc`, 400 seeds per cell, 31 Oct 2026, after the playtest fixes)

`w` = win %, `p` = pass % in one attempt / within two attempts (the rematch carries the first attempt's decisions),
`a` = solver accuracy. Strategies: `odds` reads the odds (and uses cards when they help); `alwaysRival`, `alwaysSelf`,
`random`; the near-constant ones the independent playtester found — `rivalUnlessNoPies` (always at the rival unless no
pie is left), `selfUnlessAllPies` (always at yourself unless only pies are left), `alternate`; and `gambler` (odds play,
but after two equal spinner results it acts as if the other result is "due").

```
lvl odds                  alwaysRival           alwaysSelf            random                rivalUnlessNoPies     selfUnlessAllPies     alternate             gambler               
1   w54 p78/100 a100      w16 p16/32 a39        w0 p0/0 a67           w13 p14/34 a48        w40 p40/62 a49        w18 p18/22 a55        w19 p19/32 a41        w54 p78/100 a100      
2   w54 p78/100 a100      w16 p16/32 a39        w0 p0/0 a67           w13 p14/34 a48        w40 p40/62 a49        w18 p18/22 a55        w19 p19/32 a41        w54 p78/100 a100      
3   w44 p87/100 a100      w26 p26/47 a39        w0 p0/0 a69           w13 p19/38 a54        w35 p35/60 a43        w3 p3/7 a70           w10 p10/23 a50        w44 p87/100 a100      
4   w50 p83/100 a100      w23 p23/44 a45        w0 p0/0 a46           w25 p28/48 a51        w40 p40/69 a52        w26 p26/34 a46        w21 p22/42 a49        w50 p83/100 a100      
5   w52 p77/100 a100      w5 p5/5 a44           w7 p7/16 a66          w11 p14/25 a58        w32 p32/43 a54        w30 p30/54 a68        w17 p22/48 a68        w52 p77/100 a100      
6   w71 p84/100 a100      w2 p2/2 a42           w19 p19/24 a81        w13 p13/26 a65        w31 p31/38 a60        w29 p29/48 a85        w7 p7/18 a57          w50 p59/93 a100       
7   w75 p90/100 a100      w26 p26/26 a5         w17 p17/33 a5         w28 p28/38 a6         w38 p38/48 a6         w31 p31/48 a6         w30 p30/41 a6         w42 p42/58 a11        
8   w62 p100/100 a100     w10 p10/24 a74        w0 p0/0 a36           w9 p11/22 a61         w25 p25/49 a77        w26 p26/41 a60        w13 p21/37 a68        w45 p59/98 a100       
9   w55 p80/100 a100      w7 p7/7 a51           w5 p5/5 a48           w13 p17/26 a50        w33 p33/47 a56        w37 p37/53 a54        w18 p18/44 a61        w55 p80/100 a100      
10  w82 p93/100 a100      w7 p7/13 a54          w12 p12/12 a59        w13 p14/40 a56        w23 p23/40 a67        w27 p27/51 a66        w11 p11/24 a58        w47 p64/100 a100      
11  w60 p79/100 a100      w17 p17/22 a48        w15 p15/17 a48        w15 p18/32 a49        w37 p37/59 a55        w36 p36/58 a55        w14 p17/31 a47        w60 p79/100 a100      
12  w43 p79/100 a100      w13 p13/27 a56        w20 p20/28 a43        w17 p22/44 a49        w13 p13/27 a56        w20 p20/28 a43        w9 p9/26 a7           w30 p67/90 a87        
13  w78 p90/100 a100      w10 p10/23 a71        w5 p5/12 a57          w14 p22/38 a66        w20 p20/41 a74        w25 p25/42 a58        w15 p36/53 a75        w38 p67/100 a100      
14  w53 p93/100 a100      w14 p14/21 a42        w27 p27/33 a58        w20 p28/41 a48        w14 p14/21 a42        w27 p27/33 a58        w13 p13/27 a47        w35 p60/75 a76        
15  w61 p96/100 a100      w17 p17/25 a45        w8 p8/15 a50          w16 p18/28 a49        w17 p17/25 a45        w16 p16/30 a64        w15 p15/30 a53        w25 p25/44 a69        
16  w59 p95/100 a100      w7 p7/14 a54          w27 p27/36 a61        w18 p19/35 a56        w19 p19/32 a70        w40 p40/56 a78        w14 p14/27 a50        w16 p19/52 a78        
17  w47 p91/100 a100      w8 p8/8 a37           w5 p5/5 a60           w9 p13/23 a50         w12 p12/17 a38        w11 p11/17 a60        w9 p16/26 a64         w25 p56/87 a86
```

How passing works now (see `src/core/duel.ts` `evaluate`): win, **or** read the odds — at least 4 informative calls
(certain, impossible and exact-½ shots don't count), ≥ 80 % of them solver-correct, and both questions asked and
answered right (a pie-likely and a dud-likely moment). Earlier unpassed attempts count, and a rematch whose history
never asked one of the questions opens with a load that asks it.

Targets met: odds play passes every level within two attempts (100 %, tests require ≥ 95 % on 300 seeds); in one
attempt every constant, near-constant or random strategy passes ≤ 40 % (tests: ≤ 40 % for pure constants, ≤ 45 % for
the others) — what's left is luck-wins; through the real UI (`npm run smoke`) always-rival and always-self fail all 17
first plays. Against Grandma Rina and Big Mo the odds player wins clearly more (L5 52 % vs 5 / 7 %, L8 62 % vs 10 / 0 %,
L17 47 % vs 8 / 5 %). In booth 4 the gambler passes 60 / 25 / 19 % in one attempt against 93 / 96 / 95 % for the odds.

"Reach" below = share of odds matches (400 seeds) that get to each load, in order.
Every first-play seed (`seed`) is one the odds player wins and both constant strategies lose (tested).

---

## Booth 1 — הדוכן ההוגן (The Fair Booth) · vs שף בובו (always fires at you)

### 1. עוגה אחת, שני ריקים — One pie, two duds
- **Goal:** עוגה אחת מתוך 3: הסתברות קטנה. ירו בעצמכם — ריק מעיף עוגת בונוס על בובו!
- **Setup:** 4 v 6 points, meter on, seed 103. Loads: **1 pie 2 duds scripted dud, dud, pie**, then 3/1, 1/3, 2/1, 1/2, 3/1, 1/3 (cycle from #2).
- **Math:** P(pie) = 1/3, P(dud) = 1 − 1/3 = 2/3 → aim at yourself.
- **Solution (tested shot by shot):** you dare yourself at 1/3 → dud → bonus pie on Bubu; Bubu fires at you → dud → your counter-pie creams Bubu; you face the last shell, P = 1 (ודאי) → splat Bubu. Bubu loses 3 points in the first 3 shots.
- **Misconception:** "aiming at yourself is always bad / it's 50-50 because there are two outcomes".
- **MC:** odds w78 p100; alwaysRival p45 (Bubu is himself a constant player, so constant-vs-constant is a coin toss); alwaysSelf p0. Reach 100/100/42.

### 2. ודאי ובלתי אפשרי — Certain and impossible
- **Goal:** אין עוגות בתותח? בלתי אפשרי לחטוף. רק עוגות? ודאי שבובו חוטף.
- **Setup:** 4 v 6, meter on, call-it on, seed 202. Loads: **1/3 scripted dud, pie, dud**; **3/4 scripted pie, dud, pie, pie**; then 1/4, 3/4, 1/3, 2/3 (cycle from #3).
- **Math:** load 1 — you at 1/3 (self), Bubu takes the pie, you face 1 dud left: P(pie) = 0 (בלתי אפשרי). Load 2 — you at 3/4 (rival), Bubu's dud, you face 2 pies left: P = 1 (ודאי).
- **Solution:** the ½ rule; both endpoints of the probability scale appear on every attempt (tested). Call-it tokens snap to the current denominator.
- **Misconception:** treating 0 and 1 as "very unlikely / very likely" instead of impossible / certain.
- **MC:** odds w100 p100; alwaysRival and alwaysSelf p0 (the scripted rounds punish both); random p21. Reach 100/100/100.

### 3. המאורע המשלים — The complement
- **Goal:** רואים רק כמה עוגות. ריק הוא המאורע המשלים: 1 פחות ההסתברות לעוגה.
- **Setup:** 5 v 7, meter on, call-it, seed 304. Every load shows only "pies of total" (`counter: 'piesOfTotal'`). Loads: **3 of 8**, 5 of 6, 2 of 7, 4 of 5, 1 of 5, 5 of 7.
- **Math:** P(pie) = 3/8 → P(dud) = 1 − 3/8 = 5/8 > ½ → aim at yourself. Then 5/6 → rival.
- **Misconception:** forgetting the complement and comparing pies to duds wrongly ("3 is less than 8, so…"), or computing 3/5 (pies to duds) instead of 3/8.
- **Change:** points 4 v 6 → 5 v 7 and load order so a pie-heavy load comes second (before, 19 % of good players died in the 3-of-8 load without ever meeting a pie-likely shot).
- **MC:** odds w69 p96/100; alwaysRival p42; alwaysSelf p0; random p44. Reach 100/86.

### 4. מבחן: הנקמה של בובו — Transfer: Bubu's rematch
- **Goal:** בלי מד הסיכויים: ספרו בעצמכם. בדיוק חצי? שתי הבחירות טובות.
- **Setup:** 7 v 9, **no meter**, call-it, transfer, seed 405. Loads: **2/5, 3/6, 4/7**, 1/5, 5/7, 2/7.
- **Math:** 2/5 → self; 3/6 = ½ → either is correct (tested: both scored best); 4/7 → rival.
- **Change:** 3/6 moved to second and points raised from 4 v 6 so the match actually reaches it (before: 0 % reach; your shots in 5- and 7-shell magazines never land on ½).
- **MC:** odds w56 p97/100; alwaysRival p28; alwaysSelf p14; random p40. Reach 100/100/85.

## Booth 2 — הספירה לאחור (The Countdown) · vs סבתא רינה (plays the odds)

### 5. ספירה לאחור — Counting down
- **Goal:** הוצאה בלי החזרה: אחרי כל ירייה ההסתברות זזה. ספרו מה נשאר בתותח.
- **Setup:** 8 v 8, meter on, call-it, seed 519. Loads: **3 pies 3 duds**, 1/5, 4/5, 5/7, 2/7.
- **Math:** 3/6 = ½; after a dud 3/5 (Rina fires at you); after two duds **3/4** → fire at Grandma. Dependent events: each shot changes the mix.
- **First play (tested):** seed 519 opens dud, dud, pie: you at ½, Rina at 3/5, you at 3/4 → aim at Rina → pie.
- **Why 8 v 8:** 3/6 is an even ½ opener, so Rina (second shooter, with the information) is favored in it; with fewer points too many good players lost before meeting a dud-likely question (tested variants: 5 v 5 → 81 % within two attempts).
- **Misconception:** "the mix is still 3 and 3" — forgetting what has already been fired.
- **MC:** odds w52 p95/100; alwaysRival p5; alwaysSelf p7; random p22. Reach 100/100/84.

### 6. הצצה — Peek
- **Goal:** הצצה מראה את הפגז הבא. ומה ההסתברות לעוגה בפגז שאחריו?
- **Setup:** 6 v 6, meter on, call-it, seed 606. Hand: Peek, Magnifier. Shop: peek, magnifier, peek; 4 chips. Loads: **2/4 scripted dud, pie, dud, pie**, 4/6, 2/6, 5/6, 1/5 (cycle from #2).
- **Math:** at ½ Peek shows the next shell is a dud → P = 0 → dare yourself (bonus pie on Rina). Rina then faces P(pie | first was a dud) = **2/3** and fires at you (her thought bubble shows 2/3; tested). You face 1/2 again → Magnifier on the shell after next settles it.
- **Misconception:** "after a dud the next one is still ½"; information changes the probability (conditional probability).
- **MC:** odds w70 p100; alwaysRival p2; alwaysSelf p0. Reach 100/100/43.

### 7. פליטה — Eject
- **Goal:** הסתברות בדיוק חצי? פלטו פגז — המידע החדש מטה את הסיכוי.
- **Setup:** 5 v 5, meter on, call-it, seed 708. Hand: Eject; shop: eject, peek, eject; 6 chips. Loads: **2/4**, 3/6, 2/5, 1/2, 4/8.
- **Math:** at 2/4 = ½ the ejected shell is a pie (½) → 1/3, or a dud → 2/3: your next shot works with 2/3 instead of ½. Eject is the scored best move at exactly ½ (tested); elsewhere it doesn't change your next-shot chance.
- **Misconception:** "½ means nothing can be done"; new information is worth acting on.
- **MC:** odds w75 p92/100; alwaysRival p26; alwaysSelf p17; random p28. Reach 100/100/23.

### 8. המשחק של סבתא — Grandma's match
- **Goal:** משחק מלא נגד סבתא. מד הסיכויים — רק 3 פעמים.
- **Setup:** 6 v 7, **meter limited to 3 uses** (tested), call-it, 5 chips, shop: peek, eject, magnifier. Seed 808. Loads: **4/5, 2/4 (first shop), 1/5**, 3/6, 5/7, 2/7.
- **Math:** 4/5 → rival; 2/4 = ½ → Eject/Peek; 1/5 → self. Mix of everything in booth 2.
- **Change:** a 2/2 load second so the shop's cards meet a ½ moment; points 5 v 5 → 6 v 7 (before: 93 % within two attempts on a second seed set).
- **MC:** odds w62 p100; alwaysRival p10; alwaysSelf p0; random p24. Reach 100/100/89.

### 9. מבחן: משחק הלילה של סבתא — Transfer: Grandma's night game
- **Goal:** אורות עמומים ואין מד. ספרו מה נשאר בתותח.
- **Setup:** 7 v 8, **no meter**, dim stage, transfer, seed 910. Loads: **4/5, 1/5, 3/6**, 2/7, 5/7.
- **Math:** 4/5 → rival, 1/5 → self, 3/6 = ½ either; mixes change after each shot.
- **Change:** points 5 v 5 → 7 v 8 so the 3/6 mix is played (before: 0 % reach; now 88 %).
- **MC:** odds w55 p100; alwaysRival p7; alwaysSelf p5; random p21. Reach 100/100/88.

## Booth 3 — עצים וטבלאות (Trees and Tables) · vs התאומים (two seats, both play the odds)

### 10. ירייה כפולה — Double shot
- **Goal:** כפולה יורה שני פגזים. לפחות עוגה אחת = 1 פחות ההסתברות לשני ריקים.
- **Setup:** 6 v 3+3, meter on, call-it, 4 chips, hand: Double; shop: double, peek, double. Seed 1010. Loads: **3/5**, 1/5, 3/5, 2/5.
- **Math (tree):** P(pie, pie) = 3/5 · 2/4 = 3/10; P(dud, dud) = 2/5 · 1/4 = 1/10; **P(at least one pie) = 1 − 1/10 = 9/10** > 3/5 for one shot (tested). Not 3/5 + 2/4 (P(A and B) ≠ P(A) + P(B)).
- **Misconception:** adding probabilities of a two-stage event; forgetting the second stage is without replacement.
- **MC:** odds w83 p91/99; alwaysRival p7; alwaysSelf p20; random p14. Reach 100/100/33.

### 11. פנס הטעמים — Flavor light
- **Goal:** הפנס מגלה את הטעם. הסתברות מותנית: כמה עוגות יש בטעם הזה?
- **Setup:** 7 v 4+4, meter on, call-it, the light shows the next shell's flavor on each of your turns. Seed 1112. Loads (two-way tables):
  - **10 shells: chocolate 4 pies + 1 dud, vanilla 1 pie + 4 duds** → P(pie | chocolate) = 4/5 → aim at a twin; P(pie | vanilla) = 1/5 → aim at yourself (tested). Without the light it is 5/10 = ½.
  - **8 shells, flipped: chocolate 1 + 3, vanilla 3 + 1** → now vanilla is the pie flavor (3/4).
  - 8 shells: chocolate 3 + 1, vanilla 1 + 3.
- **Change:** the second magazine flips the table so "chocolate = pie" can't be memorized; points 6 v 3 → 7 v 4 so it is played (93 %).
- **Misconception:** using the whole-magazine ratio instead of the row for the lit flavor; memorizing a flavor instead of reading the table.
- **MC:** odds w60 p98/100; alwaysRival p16; alwaysSelf p16; random p28. Reach 100/93.

### 12. מודל השטח — Area model
- **Goal:** מטבע בוחר גלגל. ההסתברות לעוגה = השטח הצבוע בריבוע.
- **Setup:** 8 v 4+4, meter on, call-it, seed 1218. A coin picks wheel A or B for every shot. Loads:
  - ½·3/4 + ½·1/4 = **½** (2 shots) — either choice correct
  - ½·1 + ½·½ = 3/4 → rival
  - ½·0 + ½·½ = 1/4 → self
  - ¾·1 + ¼·¼ = 13/16 → rival
  - ⅓·¾ + ⅔·0 = 1/4 → self
- **Misconception:** averaging the two wheels when the coin isn't fair (¾·1 + ¼·¼ ≠ (1 + ¼)/2); P(A and B) as a sum.
- **Change:** points 6 v 3 → 8 v 4 (alwaysRival passed 35 %).
- **MC:** odds w45 p100; alwaysRival p14; alwaysSelf p22; random p28. Reach 100/100/100/99/68.

### 13. מבחן: הגמר של התאומים — Transfer: Twins' finale
- **Goal:** כפולה, פנס ותערובות חדשות — בלי מד. קראו את הטבלה, לא את הזיכרון.
- **Setup:** 8 v 4+4, **no meter**, transfer, 6 chips, hand: Double; shop: double, flavor, peek. Seed 1313. Loads: **3/5** (Double: 9/10), **8 shells chocolate 1+3 / vanilla 3+1** (flipped, with a bought Flavor card: 1/4 vs 3/4), 1/5, 8 shells chocolate 3+1 / vanilla 1+3.
- **MC:** odds w81 p94/100; alwaysRival p13; alwaysSelf p6; random p16. Reach 100/100/54.
- **Note:** most of the 6 % one-attempt odds failures come from the core scoring bug with Double (see "Open issues"); with the fix it is 99/100.

## Booth 4 — קרנבל הסביבון (The Spinner Carnival) · vs רובו־ליצן (gambler's fallacy built in)

### 14. הסביבון — The spinner
- **Goal:** גלגל עם החזרה: אחרי רצף ההסתברות לא משתנה. רובו־ליצן חושב שכן.
- **Setup:** 5 v 6, meter on, call-it, seed 1411. Spinner loads (with replacement, independent): **¼ × 4 spins**, ¾ × 4, ¼ × 4, 4/5 × 4, 1/5 × 4.
- **Math:** P(pie) = ¼ on every spin, whatever came before (tested over 40 seeds).
- **Robo-Clown:** plays the odds, but after two equal results thinks the other is "due": after two pies it dares itself, after two duds it fires at you. The costly cases are **two pies on the ¾ wheel** (it dares itself into a ¾ pie) and **two duds on the ¼ wheel** (it fires at you and eats a ¾ counter-pie). (After two pies on the ¼ wheel its "dud is due" dare happens to be the right move anyway — the handoff's example is that harmless case.) First-play seed 1411 shows a costly "dud is due" on the ¾ wheel.
- **MC:** odds w53 p100; gambler p63/76; alwaysRival p14; alwaysSelf p27; random p29. Same odds player vs an odds-playing Robo: 38 % wins. Reach 100/100/54.

### 15. פעמיים ברצף — Two in a row
- **Goal:** הימור על שני סיבובים בלתי תלויים: כפלו ובחרו את המאורע הסביר יותר.
- **Setup:** 5 v 6, meter on, seed 1515. Bets alternate with short spinner rounds. A bet is two spins at the rival: if the chosen event happens Robo is creamed, otherwise you are.
  | p | options | values | best |
  |---|---|---|---|
  | ¼ | no pie in two / two pies | 9/16 / 1/16 | no pie |
  | ½ | two pies / at least one | 1/4 / 3/4 | at least one |
  | ¾ | exactly one / no pie | 3/8 / 1/16 | exactly one (still < ½: the "best" bet can be a losing one) |
  | ⅓ | no pie / at least one | 4/9 / 5/9 | at least one |
  | ⅔ | two pies / no pie | 4/9 / 1/9 | two pies |
  | ½ | pie-then-dud / exactly one | 1/4 / 1/2 | exactly one (order matters) |
  The best option is first in three bets and last in three, so "always the first/last button" is right half the time.
- **Misconception:** P(A and B) = P(A) + P(B); "two in a row is as likely as one"; ignoring order.
- **MC:** odds w61 p96/100; gambler p25; alwaysRival p17; alwaysSelf p8; random p18. Reach 100/100/100/100/95/27.

### 16. התותח המסתורי — Mystery cannon
- **Goal:** תערובת לא ידועה: ירו ניסיונות על הבובה. השכיחות היחסית מעריכה את ההסתברות.
- **Setup:** 5 v 6, no meter, seed 1618. Unknown wheels (4/5, 1/5, 1/4, 3/4), at least 4 and at most 20 test shots at the dummy, then 4 duel spins. Decisions are scored against your 20-shot relative frequency when you took all 20, otherwise against the true wheel.
- **Math:** on the 4/5 wheel a 4-shot estimate is ≤ ½ with P(X ≤ 2 | n = 4) = 0.18; a 20-shot estimate with P(X ≤ 10 | n = 20) ≈ 0.003 (tested: 4 shots mislead > 10 % of seeds, 20 shots < 2 %).
- **Misconception:** treating the relative frequency of 4 trials as the exact probability.
- **MC:** odds (takes all 20 tests) w65 p100; gambler p37; alwaysRival p9; alwaysSelf p22; random p27. Odds vs an odds-playing Robo: 35 % wins. Reach 100/100/55.

## Final — האלוף (The Champion) · vs ביג מו (plays the odds, peeks when 1/3 ≤ P ≤ 2/3)

### 17. מבחן הגמר: האלוף — Transfer
- **Goal:** ביג מו משחק לפי ההסתברות ומציץ כשהוא לא בטוח. בלי רמזים.
- **Setup:** 7 v 7, **no meter**, rooftop stage, transfer, call-it, 5 chips, hand: Double + Flavor; shop: flavor, peek, eject, double, spinner, magnifier; Big Mo has 2 peeks and 1 Double (he fires it when P(at least one pie in two) beats his best single shot). Seed 1717. Loads: **3/5** (Double 9/10), **spinner ¼ × 3**, **8 shells chocolate 3+1 / vanilla 1+3** (Flavor card: 3/4 vs 1/4), spinner ¾ × 3, 2/6, 4/6.
- **Change:** the draft (5 v 5, 3/5 then a 5-spin wheel) ended before the flavor magazine in 100 % of matches; shorter spinner rounds and 7 v 7 now reach it in 100 %.
- **MC:** odds w57 p94/100; alwaysRival w10 p10; alwaysSelf w13 p13; random p15. Reach 100/100/100. (With the Double scoring fix: odds p100/100.)

## Core issues found in review — all fixed

1. Double players couldn't pass by odds (Double was grouped with the dud side) — fixed in `evaluate`.
2. Holding Double made the ½-rule shot "wrong" — Double is now optional in scoring.
3. A twin creaming itself out handed the turn to you instead of the other twin — `nextSeat` walks the seats.
4. The mystery wheel leaked its true mix (decision text and Robo's bubble) — both sides now reason from the public test
   shots, decisions are scored against the estimate you saw, and bubbles never print fractions on no-meter levels.
