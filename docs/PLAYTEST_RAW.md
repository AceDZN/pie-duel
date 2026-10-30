# Pie Duel: raw playtest notes (independent tester)

Date: 2026-10-31. Build: `dist/` served by `vite preview` on http://localhost:4216/.
Driver: Playwright + Chrome (`--use-angle=metal`), 1280×720 desktop and 390×844 `isMobile`/`hasTouch`. Game time was stepped with
`window.advanceTime`. Every move went through real inputs: keys `1`/`2`/`3`/`P`/`M`/`H`/`Enter`, clicks on `[data-t]`,
`#hand .card`, `.shop-card`, `#shop-go`, `[data-bet]`, `#t1`/`#t4`/`#tgo`, `#explain-ok`, `#goal-go`, `#ov-retry`, `#scale-track`,
title checkboxes, the level-select tokens and touch taps on the canvas. State was read only with `render_game_to_text()`.
To jump to a level I called `window.__game.startLevel(id)` (menu navigation, the same call `tests/capture.mjs` uses); nothing
in a running duel was changed by script. Each test ran in a fresh browser context with `localStorage` cleared.
About 110 matches in all. Scripts are in `/private/tmp/claude-501/pie-duel-playtest/` (not in the repo).
Screenshots: `docs/captures/playtest/`.

Retry seeds: the result screen's "שוב" button gives a new shuffle each attempt, but attempt 1 (and attempt 2) after a
page load always use the same seed, so results for "attempt 1/2 on a fresh page" can be reproduced exactly.

---

## Findings, ranked

### 1. BLOCKER (L16): Robo-Clown's thought bubble shows the true mix of the mystery cannon
- **Repro:** L16 → "יאללה!" → "ירי ניסיון ×4" → "לדו־קרב!" → fire once (either button). On Robo's turn his bubble reads
  `רובו־ליצן: סיכוי לעוגה 4/5. אליך!` (first wheel), `…1/5… אירה בעצמי` (second), `…1/4…` (third). Seen on all 4 runs,
  with 4 tests and with 20. Example: my 20-shot estimate was 14/20 = 7/10, and Robo's bubble said 4/5, the hidden value.
- **Expected:** the mystery mix stays hidden. Robo should state his own estimate, or say nothing.
- **Happened:** after your first duel shot you can stop estimating and read the hidden value from the bubble. The whole lesson
  of this level (relative frequency estimates the probability) can be skipped. Cause: `rivalPlan()` uses `pFor(rival)`,
  which returns `L.pie` (the true wheel) for a mystery load, and the `odds` thought prints it.
- Screens: `c-L16-t4-run1-after-tests.png` (before the leak). The bubble text is in the run log; the bubble is gone too fast
  to catch in a screenshot.

### 2. MAJOR (L16): with fewer than 20 tests, the score and the explanations contradict each other
- **Repro:** L16. Take 4 tests that come out 2 pies of 4, so the HUD shows `שכיחות יחסית מהניסוי: 2/4`. Click "לדו־קרב!" and
  fire at the rival (at ½ "either is fine", as L4 taught). Lose the match.
- **Happened:** the result screen says `טעות לדוגמה: הסיכוי לעוגה היה 1/2 ובחרת לירות ביריב. המהלך הטוב: ירייה בעצמך.`
  The game says the chance was ½ and still calls firing at the rival a mistake. The decision is scored against the hidden
  wheel (1/5), and the text uses the estimate. Nothing in the goal card or the HUD says your estimate only counts after 20
  tests. The general retry hint `נסו שוב: ספרו כמה עוגות נשארו מתוך כמה פגזים` also makes no sense on a wheel level.
  On run 3, 4-test estimates of 2/4 twice led to a loss (3/5, 5/9 overall) without the player doing anything wrong
  by the information shown.
- **Expected:** score against what was shown, or tell the player up front ("20 ניסויים = הערכה שנספרת").
- Screens: `c-L16-t4-run2-result.png`, `c-L16-t4-run2-after-tests.png`.

### 3. MAJOR (L6): a perfect odds reader who doesn't use the optional cards can't pass
- **Repro:** L6. Never touch Peek or Magnifier and never buy anything. Fire at the rival when P ≥ ½, else at yourself.
  Retry with "שוב".
- **Happened:** 6 attempts, **21/21 decisions correct**: 5 fails, then a lucky win on the 6th. Every fail ends with
  `ההחלטות שלך התאימו לסיכויים, אבל המשחק נגמר לפני שנשאלו שני סוגי השאלות … ההחלטות נשמרות — עוד סיבוב אחד!`.
  The promise "one more round" is never kept. The loads (2/2, then 4/2) only ask ½ and pie-likely questions before
  you run out of points, so a dud-likely question never comes.
- **Expected:** "luck can't block progress". Either the level always asks a dud-likely question, or Peek is
  required/prompted, or ½ decisions count toward the "both kinds" rule.
- Screens: `i-L6-odds-noCards-a1.png`.

### 4. MAJOR (bypass): the hidden order repeats after every page load, so memorizing it wins
- **Repro:** fresh page → L4 → play by odds and note your own shell results (`pie,dud,dud,dud,dud,dud,pie,dud`).
  Reload (or play another level, then return) → L4 → fire at the rival exactly when your memorized shell is a pie.
  Same with L9 (`pie,pie,pie,pie,dud,pie,…`).
- **Happened:** identical order every time. The memorized play won L4 and L9 on 2 of 2 fresh pages each.
  `startLevel` resets `attempt` to 1 after a reload or a level switch, so the fixed `seed` comes back, and attempt 2 uses a
  fixed seed too. A class can pass "Grandma's night game" and the other transfer tests by sharing a list.
- Related: on L8, **alternating rival/self** (no reading at all) passes **by odds with 2 stars** on attempt 2 of a fresh
  page, every time (`b-L8-alternate-pass-a2.png`). Over 10 consecutive attempts it passed 3 (2 of them "by odds").
- Screens: `e-L4-memorized-win.png`, `e-L9-memorized-win.png`, `b-L8-alternate-pass-a2.png`.

### 5. MAJOR (bypass): near-constant play that only notices certain shells passes far above the documented ceilings
- Pure constants mostly behave as documented: of 15 three-attempt series on L1/4/8/13/17, only L1 alternate and L4
  alwaysRival (a lucky win on attempt 3) and L8 alternate (finding 4) passed. Two small refinements need no counting, only
  seeing "no pies left" or "no duds left":
  - **L5, "always at the rival unless no pies are left":** won **7/12** consecutive attempts, including the first 6 in a row
    (6/8 decisions correct each time). "Always at yourself unless only pies are left": 4/6.
  - **L4, "always at yourself unless only pies":** 4/8. **L9** (transfer): "rival unless empty" 3/8 (one passed by odds),
    "self unless certain" 4/6 (two passed by odds).
  - L8 2/8, L13 1/6, L14 2/6, L17 1/6, L1 2/8.
- LEVELS.md says constant and random strategies pass ≤ 29 % per attempt from booth 2 on. That is true for pure constants,
  but L5 and L9 don't separate counting from noticing 0 and 1. Suggest adding these two strategies to
  `strategies.test.ts`.

### 6. MAJOR: call-it chips can be farmed by copying the meter
- **Repro:** any level with the meter on and call-it on (L6, L7, L10 tested). Each turn, read the meter (`2/4`), click
  the scale tick with the same label (the ticks are labelled with the same denominator), then fire.
- **Happened:** exact every time: L7 5/5 (+10 chips, all three shop cards affordable at the first shop), L6 5/5, L10 4/4.
  There is never a chip choice to make in the shop, and the token rewards copying, not estimating.
- **Expected:** call-it should only pay when the answer isn't already shown, e.g. hide the meter while the token is
  being placed, or pay only on no-meter levels.
- Screens: `h-L7-farm-shop.png`, `h-L6-farm-shop.png`, `h-L10-farm-shop.png`.

### 7. MAJOR: the result screen praises a constant strategy for reading the odds
- **Repro:** L4, always fire at yourself. Attempt 1 scores 6/7 (½ shots and dud-likely shots are all "correct").
- **Happened:** `ההחלטות שלך התאימו לסיכויים, אבל המשחק נגמר לפני שנשאלו שני סוגי השאלות … עוד סיבוב אחד!`.
  A student who never looked at the cannon is told they read the odds. The same happens on L8 with alternate play, attempt 1
  (4/5). The "both kinds" rule stops the bypass, but the message teaches the opposite.
- **Expected:** when one kind of question was never answered right, say so ("עוד לא ירית ביריב כשעוגה הייתה סבירה").

### 8. MAJOR/MINOR (misconception): the explanation card puts P(dud) next to a pie icon
- **Repro:** L1, first decision (1/3), press `1` (rival). Scripted dud → counter-pie → explanation card.
- **Happened:** the big number is `2/3` with a 🥧 next to it. The body text explains that 2/3 is P(dud), but the headline
  reads as "pie 2/3". The card also opens while the cream overlay is still on screen, so it is washed out and hard to read
  for about 2 s.
- Screen: `l-L1-explain-wrong-rival.png`.

### 9. MINOR (misconception): a wrong move that gets lucky is celebrated with no feedback
- **Repro:** L1, at 3/4 fire at yourself. If it's a dud you get the dare bonus, crowd cheer, "ספלאט!" on Bubu, and no
  explanation. The decision is still logged `self@3/4:x`.
- Only bad outcomes get the worked explanation. The only feedback on lucky wrong moves is the single "טעות לדוגמה" line on
  the result screen. This is gambler-friendly in the moment. Worth a small "מזל! הסיכוי היה נגדך" toast.

### 10. MINOR: L7 scores firing at ½ as wrong while you hold Eject, with no explanation at the time
- **Repro:** L7, never use Eject, fire at the rival at 2/4.
- **Happened:** scored `x` (0/4 and 1/5 over attempts), and no explanation is shown (none fires at ½). The result screen
  says `המהלך הטוב: פליטה`. L4's goal card taught `בדיוק חצי? שתי הבחירות טובות`. This is consistent with L7's goal text,
  but a player who skipped the goal card gets no signal why "either" became "wrong".

### 11. MINOR: rival thought bubbles act as a meter on the no-meter transfer levels
- L9, L13 and L17 have no meter, but every rival turn prints the exact fraction (`סבתא רינה: סיכוי לעוגה 3/5. אליך!`,
  `ביג מו: 2/3? לא בטוח… אציץ.`). With one subtraction after the shot you know your own P. This weakens "ספרו בעצמכם".

### 12. MINOR: the odds meter shows a stale value during animations and the rival's turn
- **Repro:** L3, first decision 3/8 → press `2`. While the shot and the rival's turn play, the meter still says `3/8`
  while the magazine panel says `3 עוגות מתוך 7`. Same on L1 (`1/3` while 2 shells are left).
  Screen: `k-L3-meter-stale-during-turn.png`, `a04-L1-shot1-toast0.png`.

### 13. MINOR (learning design): several "skills" reduce to comparing two counts
- Wherever icons are shown (L1, L2, L4–L9), "P(pie) > ½" is the same as "more pie icons than confetti icons". The panel
  sorts pies first, then duds, so the comparison can be done at a glance without any fraction. On L3 the meter shows
  `3/8` = P(pie) directly, so the complement is never needed to decide. The fraction work (call-it) is optional and
  farmable (finding 6). Only L10–L12, L14–L16 force a computed value, and there the meter or side panel prints it unless
  the level is a transfer level.

### 14. MINOR (phone 390×844): twins levels overflow and overlap
- L1 is fine at phone width: rival, cannon, both buttons, meter and scale are visible, and tapping Bubu on the canvas fires
  (`g-mobile-L1-decision.png`).
- L10/L11/L12 (three action buttons): `#actions` scrollWidth 385 > 374, and the "ירי בעצמי" button is cut at the left edge.
  `#app` is 393 px wide in a 390 viewport. The 7–8 pie HP row overflows the HP card by ~72 px (scrollWidth 247 vs 175).
  The flavor-light toast sits on top of the twins' names. The magazine panel overlaps the HP card by ~10 px. The side panel
  (tree/table) covers part of twin A and the cannon. On L10 the Double card overlaps the action row by 9 px.
  Button labels wrap to two lines ("ירי / בתאום א׳"). Screens: `g-mobile-L11-decision.png`, `g-mobile-L10-decision.png`.

### 15. MINOR (desktop layout)
- An HP row with 7+ pies overflows the HP card to the left (L8 Rina, L11/L12/L13 "את/ה"). On L8 the level name wraps to 2
  lines and the odds meter panel overlaps the bottom of the HP card. `f-L8-meter-exhausted.png`, `d-L11-move1.png`.
- The limited-meter button stays visible as `הצגת סיכוי (0)` after all 3 uses and does nothing when clicked.
- The `-1` damage badge covers a pie icon in the HP row (`a05-L1-second-decision.png`).
- The scale hint text at the bottom (`רוצים לנחש?…`) is very low contrast and runs into the screen edge at 720 px height.

### 16. POLISH (Hebrew)
- `התאומים מכוסה בקצפת.` → `מכוסים` (result screen, L10–L13).
- `התאומים העז — עוגת בונוס אליך!`: plural noun with a singular verb, and only one twin dared. Use `תאום א׳/ב׳ העז`.
- `נשארו 1 יריות` / `נשארו 1 סיבובים` (spinner, coin, mystery panels); `1 עוגות מתוך 5 פגזים`, `0 עוגות מתוך 0 פגזים · כמה ריקים?`
  (L3 panel after the last shell); `1 פגזים`.
- `גלגל A: 1/1 עוגות`, `גלגל B: 0/1` (L12 banner and panel): say `ודאי` / `בלתי אפשרי` or `1` / `0`.
- Explanation on a certain pie: `נשארו 1 עוגות מתוך 1 — סיכוי של 1/1 לעוגה, יותר מחצי.` This misses the L2 vocabulary
  (`ודאי`). Similarly the meter shows `0/1` and `2/2 = 1`, and the latter wraps to two lines.
- Fractions, `P(A) = 1/2`, the tree, `−` and `-1` all render LTR correctly. No flipped fractions seen anywhere.
  The two-way-table caption is English (`P(pie | choc) = 4/5`) inside a Hebrew panel. That may be fine for grade 9,
  but it is the only English formula text besides `P(≥1 pie)`.

### 17. POLISH (pacing): 10–20 s of watching for every 1-second decision
- Game-time per whole level (odds play, desktop, normal motion): L1 50 s (5 decisions), L5 65 s (7), L10 51 s (5), L11 71 s (6),
  **L12 97 s (7)**, L13 81 s (7), L14 47 s (4), L15 55 s (7), L17 79 s (7). One own shot ≈ 6 s, one full round
  (you + Bubu) ≈ 9.6 s, and 6.5 s with reduced motion.
- The gap between two of your decisions is usually 10–13 s, 15–18 s against the twins, and **up to 21.5 s on L12**
  (two twins × coin flip + wheel spin each). Between loads there is a 1–1.7 s banner and then the shuffle.
  There is no tap-to-skip. Mystery test fire is quick (20 shots in 6.3 s).

### 18. POLISH (misc)
- L1 and L15 show the probability scale (looks interactive) although call-it is off. Clicks do nothing and give no hint.
  During L15 bets the meter shows `?` although the level has the meter on.
- L15 bet buttons reuse the pink "rival" and cyan "self" colors for the first and second options, which have nothing to do with
  targets.
- Spinner magazine panel: `[pie] 1/4 [dud] 3/4`. In an RTL reading the number-to-icon pairing is ambiguous.
- Double always fires at twin A (`aliveRivals()[0]`). There's no way to aim it at twin B.
- L15 ¾ bet: the "best" option (exactly one, 3/8) still loses 5/8 of the time. It is scored correct but never explained
  ("the better bet can still be a bad bet"), and the tree panel shows branch probabilities only, never the products.

---

## What I verified works
- **No console errors or warnings** (`console` error/warning, `pageerror`) in ~110 matches on desktop and mobile.
- **Rules and math shown are correct** wherever I checked: magazine counts and meter (L1–L9); complement view (L3); tree and
  `P(≥1 pie) = 1 − 2/5 · 1/4 = 9/10` (L10, also 1/5 → 2/5 and 1/3 → 2/3); the two-way table updates after each shot and
  flips between magazines (L11; lit row and `P(pie | choc) = 4/5` correct); area model drawing and formula, including
  `3/4·1 + 1/4·1/4 = 13/16` (L12); spinner stays at 1/4 and 3/4 after streaks (L14); all six bet option labels match their
  events, and the scored best option really has the higher probability (L15); the 20-test estimate is used for scoring
  (L16, 5/5).
- Robo's gambler's-fallacy line appears on L14 (`שתי עוגות ברצף… עכשיו בטוח יוצא ריק!`). Nothing in the game itself states
  a fallacy as true.
- First 30 s of L1 at 1280×720: the goal card says exactly what to do. The first decision is available 2.1 s after "יאללה!".
  Fire at yourself on 1/3 → dud → "פוף!" + dare-bonus toast + Bubu creamed. Bubu's dud brings your counter-pie, then
  1/1 → splat. Bubu loses 3 points in the first 3 shots, as LEVELS.md describes. Full win 5/5, 3 stars.
- Pause: `P` and the button open the overlay and freeze the game (5 s paused mid-shot: nothing advanced). `1` is ignored
  while paused or on the goal card. Resume, restart (new shuffle, goal card again) and menu all work. `M` toggles mute
  (also while paused).
- Title toggles: reduced motion adds `.reduced`, persists in `localStorage` and survives a reload. The sound checkbox works.
- Level select: 16 of 17 tokens locked on a fresh save. After passing L1: L1 shows ★★★, L2 unlocks, the total reads `3/51`.
- Result screens: win (`ניצחת!`), loss (`הקצפת ניצחה הפעם…` with an example mistake), loss but passed by odds
  (`הפסדת בקרב — אבל עברת!`, L1, L8, L17). Carry-over text `(כולל ניסיונות קודמים: x/y)` is shown.
- Limited meter on L8: 3 uses, the counter decrements, then `?`.
- Pure constant strategies (always rival, always self, alternate) on L1, L4, L8, L13, L17, 3 attempts each with carry:
  12 of 15 series failed. The three that passed: L1 alternate and L4 alwaysRival, each by a lucky win on attempt 3, and L8
  alternate by odds on attempt 2 (finding 4).

## What automation can't tell us
- Whether it's fun: whether the slapstick (splats, Bubu's reactions, slow-mo) carries the 10–20 s waits, and whether players
  want a skip.
- Whether students actually compute probabilities or just compare icon counts (finding 13). Only think-aloud or a pre/post
  test can show learning. I can't claim any learning gain.
- Whether a new player reads the long rules list on the goal card, finds the optional cards (L6, L7) without being told,
  understands the probability scale, or notices the side panels.
- Whether 8th graders understand `P(pie | choc)`, "שכיחות יחסית", and the bet wording on L15.
- Real-touch feel on a phone (thumb reach, accidental taps on the canvas, which fires at the rival), audio levels, and real
  frame rate on low-end devices. My runs used a desktop GPU and stepped time.
- How players react to findings 2, 3 and 7 (being told they did well and failing anyway, or "correct" and "wrong" at the
  same time).
