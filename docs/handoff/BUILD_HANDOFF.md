# Pie Duel — דו־קרב העוגות — build handoff

Read `../COMMON.md` first. Repo `/Users/acedzn/dev/AceDZN-exp/pie-duel` → public `AceDZN/pie-duel`, port 5216 (preview 4216).

## Promise

A neon carnival booth at midnight. Across a little round table sits your rival — a sweaty pastry chef, a grandma card shark, a glitchy clown robot — and between you sits the **Pie-o-Matic**, a brass cannon loaded with a known mix of cream pies and confetti duds in hidden order. Each turn you fire at your rival or at **yourself**: a dud on yourself keeps your turn, a pie on yourself means cream in your face. Between rounds, spend chips on Balatro-style trick cards that bend the odds. The tension is in the pause before the trigger; the payoff is the slow-motion *SPLAT* on your rival's face because you knew it was 3-in-4. Slapstick, no weapons, no gore.

Map evidence: Buckshot Roulette × Balatro passes relatedness (density 0.742, crowded on purpose): Buckshot Roulette (95k reviews) proves the "known shells, hidden order" tension loop, and that loop *is* drawing without replacement. Balatro (153k reviews) proves the between-rounds card shop. Balatro × Dicey Dungeons (0.816) is more crowded; Buckshot Roulette × Peglin failed relatedness.

## Curriculum (Workbook grade 8, chapter 5 probability; grade 9, chapter 6)

Grade 8 ch. 5: [probability-scale](https://math.workbook.co.il/grade-8/chapter-5/probability-scale), [classical-probability](https://math.workbook.co.il/grade-8/chapter-5/classical-probability), [complementary-events](https://math.workbook.co.il/grade-8/chapter-5/complementary-events), [experimental-probability](https://math.workbook.co.il/grade-8/chapter-5/experimental-probability).
Grade 9 ch. 6: [conditional-probability-intuition](https://math.workbook.co.il/grade-9/chapter-6/conditional-probability-intuition), [relative-frequency-to-probability](https://math.workbook.co.il/grade-9/chapter-6/relative-frequency-to-probability), [tree-diagrams-two-stage](https://math.workbook.co.il/grade-9/chapter-6/tree-diagrams-two-stage), [two-way-tables-probability](https://math.workbook.co.il/grade-9/chapter-6/two-way-tables-probability), [area-model-probability](https://math.workbook.co.il/grade-9/chapter-6/area-model-probability), [dependent-and-independent-events](https://math.workbook.co.il/grade-9/chapter-6/dependent-and-independent-events), [mutually-exclusive-events](https://math.workbook.co.il/grade-9/chapter-6/mutually-exclusive-events), [repeated-independent-trials](https://math.workbook.co.il/grade-9/chapter-6/repeated-independent-trials).
Snapshots in `/Users/acedzn/idea-plotter/reports/math-games-2026-10-30/curriculum/`.

Rules:
- **Table rules (game, state them in-game):** each round the cannon is loaded with p pies and d duds, shown as icons, then shuffled. On your turn fire at the rival or at yourself. Pie hits → that player loses 1 cream point (3–4 per match). Dud at yourself → you go again; otherwise the turn passes. Empty cannon → reload with the next mix. First to 0 loses the match.
- P(next is a pie) = pies left ÷ shells left; P(dud) = 1 − P(pie). After each shot the mix changes (**without replacement → dependent**). The **spinner** rounds are with replacement (**independent**), and their probability doesn't change after a streak.
- Two-stage events by tree / area model: P(pie then pie) = p/n · (p−1)/(n−1). Two-way tables: P(pie | chocolate light).
- Decision quality: shooting yourself is favorable when P(dud) > ½, the rival when P(pie) > ½; at exactly ½ either is fine. Card choices have solver-computed better/worse options.
- Hebrew terms: הסתברות, סולם ההסתברות (בלתי אפשרי, ודאי), מאורע משלים, מקרים אפשריים / רצויים, הוצאה בלי החזרה, מאורעות תלויים / בלתי תלויים, הסתברות מותנית, דיאגרמת עץ, טבלה דו-ממדית, מודל שטח, שכיחות יחסית, ניסויים חוזרים.

Misconceptions to catch (embodied by rivals you can exploit): the gambler's fallacy ("after two pies a dud is due" — on the independent spinner it isn't); "it's 50-50 because there are two outcomes"; forgetting the mix changed after a shot; P(A and B) = P(A) + P(B); treating relative frequency from 4 trials as exact.

## Loop, luck and fairness

- Turn-based, first-person seat at the table, camera leans in on the trigger. Choose target (two big buttons / keys / tap the rival or yourself). Shot resolves in slow motion with a cream splat (decal on the face, a rigged reaction: shock, lick, wipe) or a confetti pop.
- **Odds meter** (pies-left bar and fraction) is available early, becomes a limited hint later (logged), and is gone in transfer levels. The shell counter (icons of what's left) is always visible — the student must count, not guess.
- **Call it:** before a shot you may place a token on the probability scale (snapped to fractions with the current denominator, 0 = בלתי אפשרי … 1 = ודאי). An exact call earns chips. Optional, never a gate.
- **Card shop** between rounds (Balatro-style, 3 offers, chips): הצצה Peek (see the next shell), פליטה Eject (the next shell flies out and is revealed), כפולה Double (fire two shells at once at the rival — a two-stage event), סביבון Spinner (switch this round to the with-replacement wheel), זכוכית מגדלת Magnifier (reveal what shell #k is), פנס טעמים Flavor Light (shows the next shell's flavor color).
- **Luck must not block progress.** A booth is passed by **winning the match OR making ≥ 80 % odds-correct decisions** (scored by the solver against the state you actually saw). Stars for decision quality, not for winning. Seeded RNG; tests run deterministic seeds and Monte Carlo strategy comparisons.

## Levels (author exactly; tests prove each; 17 total)

**Booth 1 — The Fair Booth · הדוכן ההוגן** vs Chef Bubu (always fires at you — naive) (probability-scale, classical-probability, complementary-events)
1. **One pie, two duds** — P(pie) = 1/3 → fire at yourself (P(dud) = 2/3). Tutorial with the meter.
2. **Certain and impossible** — rounds that reach 0 pies left (fire at yourself, it's impossible to get hit) and only pies left (certain: fire at the rival). Call-it tokens introduced.
3. **Complement** — the loading card shows only "3 pies of 8"; you compute 5/8 duds and choose. 
4. **Transfer: Bubu's rematch** — no meter, mixes 2/5, 4/7, 3/6 (½ — both choices count as correct).

**Booth 2 — The Countdown · הספירה לאחור** vs Grandma Rina (plays odds-optimally) (dependent-and-independent-events, conditional-probability-intuition)
5. **Counting down** — 3 pies, 3 duds; after each reveal the odds move (e.g., after two duds: 3/4 pies → fire at the rival).
6. **Peek** — Peek shows the next shell is a dud; now what about the one after? With 2 pies, 2 duds total: P(2nd is pie | 1st is dud) = 2/3.
7. **Eject** — use Eject when P(pie) is exactly ½ to gain information; the solver marks "eject when unsure" as the better choice.
8. **Grandma's match** — full match, all of the above, meter as a limited hint (3 uses).
9. **Transfer: Grandma's night game** — dim lights, no meter, new mixes (4 pies / 1 dud, 1 pie / 4 duds, 3 / 3).

**Booth 3 — Trees and Tables · עצים וטבלאות** vs the Twins (two rivals, two seats) (tree-diagrams-two-stage, two-way-tables-probability, area-model-probability, mutually-exclusive-events)
10. **Double shot** — 3 pies, 2 duds. P(both pies) = 3/5 · 2/4 = 3/10; P(at least one pie) = 1 − P(both duds) = 1 − 2/5 · 1/4 = 9/10. Use Double when "at least one pie" lands the KO. A tree diagram assembles on the table as you think.
11. **Flavor light** — 10 shells: chocolate 4 pies + 1 dud, vanilla 1 pie + 4 duds. The light shows chocolate → P(pie | chocolate) = 4/5 → fire at a rival; vanilla → 1/5 → fire at yourself. A two-way table builds on the tablecloth.
12. **Area model** — a stage-two cannon picked by a coin (two cannons, 3/4 and 1/4 pies): P(pie) = ½ · 3/4 + ½ · 1/4 = ½, shown as a split square.
13. **Transfer: Twins' finale** — mixed Double + Flavor rounds, no meter.

**Booth 4 — The Spinner Carnival · קרנבל הסביבון** vs Robo-Clown (gambler's fallacy built in) (repeated-independent-trials, experimental-probability, relative-frequency-to-probability)
14. **The spinner** — a ¼-pie wheel, with replacement. Robo-Clown fires at itself after two pies "because a dud is due"; P is still ¼ every spin. Exploit it.
15. **Two in a row** — bet chips on "two pies in a row" at 1/16 vs "no pie in two spins" at 9/16; choose the better bet.
16. **Mystery cannon** — unknown mix: run test shots at a dummy (20 trials, relative frequency shown as a growing bar chart), estimate, then duel; a 4-trial estimate is visibly unreliable.

**Final — The Champion · האלוף** vs Big Mo (optimal, all cards)
17. **Transfer (no hints, no meter):** a full match mixing without-replacement rounds, a spinner round, Double and Flavor cards; new booth look (rooftop, fireworks).

After the authored booths work: endless "carnival night" mode with generated mixes and card offers, verified by the solver, and Monte Carlo tests showing an odds-following strategy beats "always fire at the rival" and "always fire at yourself" against Grandma Rina and Big Mo by a clear, measured margin.

## 3D and art

Warm neon carnival at night, string lights, a striped booth canopy, a brass-and-glass Pie-o-Matic with counter lights, cream splats with particles and face decals, confetti bursts, slow-motion shot camera. Procedural: shell counter, probability scale, tree diagrams, two-way table and bar charts (exact). Tripo (search the library/assets first, then generate): **three or four rigged rivals with expressive reactions** (Mixamo idle, taunt, flinch, celebrate; use a richer face rig for one hero rival if credits allow), the **Pie-o-Matic** hero prop, cream pie, booth set pieces (prize shelf, spinner wheel).

## Acceptance

In the first 30 seconds: see 1 pie + 2 duds, fire at yourself, hear the dud pop, go again, then splat Chef Bubu when only the pie is left. Fire at yourself on a 3/4-pie shell on purpose and get creamed, with a one-line worked explanation. All probabilities, decision scoring and rival AI come from pure modules; tests cover all 17 levels, the fairness rule (bad luck with good decisions still passes), the gambler's-fallacy rival and the strategy comparisons.
