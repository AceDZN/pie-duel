# Pie Duel — playtest record

Automation can't tell us whether 13-year-olds find this fun or learn from it. Everything below is what was run, observed or measured, and how. A session with real students is still needed.

## Verified by the lead (2026-10-30/31)

**Unit tests** (`npm test`, 66 tests, all pass): exact fraction math and every probability helper against hand-computed handoff cases; brute-force enumeration over shell orders for P(next pie) with peeks, magnifier and flavor light and for P(at least one of two); every one of the 17 levels is solvable (the odds player passes within two attempts on ≥ 99 % of seeds) and its scripted teaching moment happens; wrong choices produce the advertised consequence (aim at yourself on 3/4 → creamed with the `selfOnPies` explanation); the fairness rule (an odds player who loses on luck still passes; constant strategies never pass by odds); rival behaviours (Bubu always aims at you, Rina follows the odds, Robo-Clown flips after two equal results on a spinner, Big Mo peeks when 1/3 ≤ P ≤ 2/3 and fires his Double when two shells beat one); the endless nights pass the same checks.

**Monte Carlo strategy comparison** (`npm run mc`, 300–400 seeds per cell; full table in `LEVELS.md`): odds play passes every level within two attempts (≥ 99 %); always-fire-at-the-rival / always-at-yourself / random pass at most 44 % in one attempt in booth 1 and at most 39 % after; against Grandma Rina and Big Mo the odds player wins clearly more often than either constant strategy (e.g. L17: 48 % vs 8 % and 6 %).

**Exact optimality** (dynamic programming over every magazine state up to 8 + 8 shells): under the as-built table rule the ½ rule is optimal in every state, against both a naive and an odds-playing rival. Under the handoff's Buckshot-style rule it was the opposite (always firing at the rival was optimal everywhere), which is why the rule changed.

**Real browser, real inputs** (headless Chrome via Playwright, `tests/smoke.mjs`): all 17 levels played through the HUD buttons (fire buttons, shop cards and "next round", test-fire, bet buttons, cards in hand, explanation "continue") with the solver's moves: every level reaches its result screen, no console errors. Three endless nights played the same way.

**Captures** (`tests/capture.mjs`, 1672 × 941 and 390 × 844 touch): first decision, dare bonus, splat, self-cream with the worked 3/4 explanation, midway, card shop, flavor light + two-way table, area model, spinner vs Robo-Clown, mystery test fire, rooftop final, phone width. Compared with the mockups in `docs/VISUAL_REVIEW.md`.

**Built-in browser** (dev server, desktop app pane): title → level 1 → full match won with 5/5 odds calls and 3 stars, including the dud dare, the certain 1/1 splat and an "unlucky" explanation after a correct call that went wrong.

**Measured:** 120 fps in headed Chrome at 1280 × 720 (DPR 1, Apple M2 Max); JS 789 kB (208 kB gzip); 7 GLBs ≈ 11 MB.

## Independent playtest (separate agent, ~110 matches through real inputs) and what we did

Full report: `docs/PLAYTEST_RAW.md`, screenshots in `docs/captures/playtest/`. No console errors in any of its runs. Its findings, ranked, and the response:

| # | Finding | Status |
|---|---|---|
| 1 | **Blocker:** L16 — Robo-Clown's thought bubble printed the hidden wheel (e.g. 4/5) | **Fixed.** Both sides now reason from the public test shots; bubbles never print fractions on the mystery cannon or on no-meter levels. |
| 2 | L16 — decisions scored against the hidden wheel but explained with the estimate | **Fixed.** Scored and explained with the relative frequency you saw; wheel/mystery-specific retry hints. |
| 3 | L6 — a perfect reader who skips the cards couldn't pass (no dud-likely question came up) | **Fixed.** A rematch whose history lacks one of the two questions opens with a load that asks it; L6's loads skewed. Card-free perfect play now passes L6 59 % / 92 % / 100 % by attempt 1 / 2 / 3 (simulated, 300 runs). |
| 4 | Hidden order repeated after a page load → memorize and replay | **Fixed.** Only a level's very first play uses its authored seed; every replay is a fresh shuffle. |
| 5 | Near-constant play ("always rival unless no pies left", "self unless only pies", alternate) passed far too often | **Fixed.** Odds reading is judged on informative calls only (certain, impossible and exact-½ don't count), needs 4, both questions answered; these strategies are now in the Monte Carlo tests (≤ 40 % in one attempt, all of it luck-wins). Tutorial loads balanced so leaning one way doesn't beat naive Bubu. |
| 6 | Call-it chips farmable by copying the meter | **Fixed.** An exact call pays only when the meter is hidden (the toast says so). |
| 7 | Result screen praised constant play | **Fixed.** Separate texts for "one kind of question still missing" and "too few decisions". Stars now measure accuracy only. |
| 8 | Explanation card paired P(dud) with a pie icon; card washed out by the cream overlay; lucky wrong moves got no feedback | **Fixed.** Caption says which probability is shown, icon matches, card waits for the cream; lucky wrong calls get a short note. |
| — | L7: firing at ½ while holding Eject scored wrong with no explanation | **Fixed:** a note says Eject would have given information first. |
| — | Rival bubbles worked as a delayed meter on transfer levels | **Fixed** (see 1). |
| — | Meter showed the old value during shots | **Fixed:** hidden while it isn't your move. |
| — | Phone width on Twins levels: action row overflow, hp pies spilling, overlaps | **Fixed** in the portrait container query; re-checked at 390 × 844 on L11 (`docs/captures/12-mobile-twins-390.jpg`): action row inside the screen, hp pies inside their card. The toast still slightly overlaps the magazine title there. |
| — | Hebrew agreement and counts ("התאומים העז", "נשארו 1 יריות", "0 עוגות מתוך 0") | **Fixed** with count/gender helpers. |
| — | Pacing: 10–21 s between decisions | **Improved:** shorter waits, slow motion only for your own pie on a rival, and a ×2 speed toggle (F). Not re-measured by the playtester. |

After the fixes: 66 unit tests pass; the headless UI run passes 15/17 first plays for the odds autoplayer (it doesn't use info cards; L6 and L8 were lost on luck) and **both L6 and L8 pass on the rematch through the real buttons**; **always-rival and always-self fail all 17 first plays**.

## AAA audit (separate agent, all 17 levels + nights + phone) and what we did — 31 Oct

Full report: `docs/AUDIT.md`. All 17 levels passed with 3★ on its frozen build, no console errors. Its top issues and status:

| # | Finding | Status |
|---|---|---|
| 1 | Panels/meter printed the new math's answer (L10–L12) | **Fixed:** limited meters; panels show inputs, bottom line "?" until you decide; Hebrew formulas |
| 2 | One generic wrong-move card, sometimes misleading (L11 counts, L16 "1", L1 1/1) | **Fixed:** context-aware (flavor row, peek, wheel, area model, test estimate; ודאי / בלתי אפשרי named); wrong bets get a worked tree. Verified with `tests/wrong-moves.mjs` on 10 levels |
| 3 | L16 test dummy visible in later levels | **Fixed** |
| 4 | Small rivals, no cream on the face, Big Mo = red Bubu | **Fixed/improved:** rivals reframed and enlarged, face anchor at the face, cream stays on; Mo sequins + crown (still the Bubu rig) |
| 5 | No finale, no booth intros, goal cards don't say what's new | **Fixed:** champion finale, booth subject cards, versus intro, "חדש:" line |
| 6 | Peek turns calls "certain" and they don't count | **Fixed:** informed decisions count |
| 7 | hp pies spill at 8+ points; meter under hp card | **Fixed:** compact pies; meter placed under the card |
| 8 | Call token stays after Eject; meter "0/1" after Peek | **Fixed** |
| 9 | English in formulas, awkward values, dreidel, weapon words, wrapping titles | **Fixed** |
| 10 | Pacing 7–13 s between decisions | **Improved:** base speed ×1.3, ×2.4 toggle; not re-measured by the auditor |
| 11 | Frame-edge boards/sign, dome blow-out, stray lever, wheels under panels, black rooftop | **Fixed** (rooftop skyline, moon, lit windows) |
| 12 | Flat shop with duplicate offers; unusable hand cards clickable | **Partly:** unique offers, "buy cards" wording, unusable cards greyed out; card art is still emoji |
| 13 | Endless: wrong "saved" text, rival/theme mismatch | **Fixed** |
| 14 | L9 dim not visible; comic under banner; flat confetti; no hit-stop | **Fixed** (darker night game, comic on top, hit-stop); confetti still flat quads |
| 15 | Phone: ×4 wrapping, toasts/panels covering | **Improved:** panel folds on phones, toasts cleared between levels |

After the fixes (UI runs through the real buttons, headless Chrome): all 17 levels pass on first play in normal mode and in expert mode; always-rival and always-self pass 0 of 17; three of four endless nights won, no console errors. 68 unit tests pass.

## Known limits

- Not tested on a real phone or tablet, only Chrome's mobile emulation at 390 × 844.
- Not tested in Safari or Firefox.
- No student has played it yet.
