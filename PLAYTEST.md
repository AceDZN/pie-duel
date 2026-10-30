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

## Independent playtest

See `docs/PLAYTEST_RAW.md` (written by a separate playtester agent that didn't build the game) and the fixes that followed, below.

## Known limits

- Not tested on a real phone or tablet, only Chrome's mobile emulation at 390 × 844.
- Not tested in Safari or Firefox.
- No student has played it yet.
