# Pie Duel — progress

## 2026-10-30 / 31

- Repo created locally with the handoff docs (`docs/handoff/`). **Creating the public GitHub repo `AceDZN/pie-duel` was blocked** by the Claude Code auto-mode permission classifier ("Create Public Surface") on both attempts, so nothing is pushed yet. All work is committed on local `main`. To publish: `gh repo create AceDZN/pie-duel --public --source . --push` from the repo folder (or allow that command for the session).
- Gameplay mockups: 5 images via ChatGPT in the user's Chrome (`docs/visual-targets/`, prompts in `PROMPTS.md`). `OPENAI_API_KEY` isn't set, so the imagegen CLI route wasn't used.
- Tripo (user's Chrome, Browser 2): 8 generations + 3 rigs used (budget cap). Rigged with Mixamo presets: Chef Bubu, Grandma Rina, Robo-Clown; the Twin is a rigged character reused from the user's own Tripo assets. Props: Pie-o-Matic, cream pie, prize shelf (+ spinner wheel and booth stall, unused). **No Big Mo model** (budget spent): he's the Bubu rig recoloured and scaled. Details in `ASSETS.md`.
- **Rule change from the handoff (important):** an exact DP showed that with Buckshot-style rules (dud at yourself → go again) *always firing at the rival* is optimal in every state, so the "> ½" rule would have taught a losing strategy. The table rule is now "every shot is a call, the turn always passes": at the rival, pie → rival creamed, dud → their counter-pie creams you; at yourself, dud → dare-bonus pie creams the rival, pie → you. Under this rule the probability rule is exactly optimal (proof in `GAME_IDENTITY.md`, tests in `tests/strategies.test.ts`).
- Pure core (`src/core/`): exact fractions, probability helpers (conditional with peeked/magnified positions and the flavor light, P(at least one of two), area model, bets), the duel state machine, rival AI (naive / odds / gambler's fallacy / champion with Peek), scoring and the fairness rule (win OR ≥ 80 % odds-correct calls with both kinds of question answered; good calls carry into the rematch). Endless "carnival night" generator with solver checks.
- All 17 levels authored, tuned with Monte Carlo and verified (`LEVELS.md`, `CURRICULUM.md`). 65 unit tests pass (`npm test`): probability math, every level solvable, teaching moments, constant strategies don't pass, fairness, rivals, consequences, endless nights.
- 3D game (`src/scene.ts`, `src/game.ts`): booth, Tripo rivals with idle / laugh / hit / cheer / defeat clips, Pie-o-Matic swivel + lever + slow-motion flight, cream and confetti particles, counter-pies and dare-bonus pies, spinner wheels, coin, test dummy, rooftop final with fireworks; Hebrew RTL HUD after the mockups; card shop; midway level select with rival portraits rendered from the models; title, pause, mute, reduced motion, saved progress, learning log in localStorage.
- Headless smoke run (`tests/smoke.mjs`) plays all 17 levels through the HUD buttons with the solver's moves: all complete, no console errors. Captures (`tests/capture.mjs`) at mockup size → `docs/captures/`; comparison in `docs/VISUAL_REVIEW.md`.
- Measured: 120 fps in headed Chrome at 1280×720 (DPR 1, Apple M2 Max). JS bundle 789 kB (208 kB gzip); models 7 GLBs ≈ 11 MB total.

- Independent playtest (separate agent, ~110 matches): 1 blocker (mystery wheel leaked through Robo's bubble) and several bypasses / fairness gaps found; all fixed and re-verified (details in `PLAYTEST.md`). Odds reading now needs 4 informative calls, both questions answered; near-constant strategies added to the Monte Carlo tests; replays are fresh shuffles; call-it pays only without the meter; ×2 speed toggle; Big Mo plays a Double card.
- 66 tests pass. Headless UI: constant strategies fail all 17 first plays; odds autoplay passes 15/17 first plays and the other two on the rematch.

## Open

- Publish to GitHub (blocked, see above). Vercel deploy not done (not requested).
- Big Mo model and a face rig (needs Tripo credits beyond the agreed budget).
- Human playtest with students: fun and learning can't be measured by automation.
