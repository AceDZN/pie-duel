# Pie Duel — דו־קרב העוגות

A real-3D browser duel at a midnight carnival booth, for Hebrew-speaking students in grades 8–9 (Israeli curriculum as published in Workbook: grade 8 probability and complement, grade 9 conditional probability, drawing without replacement, tree diagrams, two-way tables, area model, independent trials, relative frequency).

The **Pie-o-Matic** is loaded with a known mix of cream pies and confetti duds in a hidden order. Each turn you aim it at your rival or at yourself:

- **Aim at the rival:** a pie creams them; a confetti dud lets them smack you with a counter-pie.
- **Aim at yourself (a dare):** a dud pops confetti and the crowd's dare-bonus pie creams the rival; a pie creams you.
- The turn always passes. Whoever runs out of cream points loses.

So the whole game is one question, asked again and again with the mix changing under you: is a pie more likely than a dud *right now*? Count what's left (pies left ÷ shells left), use the complement, update after every shot (without replacement), and later bend the odds with trick cards (Peek, Eject, Double, Magnifier, Flavor Light, Spinner).

Luck can't block progress: a level is passed by winning **or** by making at least 80 % odds-correct decisions (scored by an exact solver on what you could see). Stars measure decisions, not luck. See `GAME_IDENTITY.md` for why the table rules differ from Buckshot Roulette's.

## Run

```bash
npm install
npm run dev      # http://localhost:5216
npm test         # unit tests, solver checks, Monte Carlo strategy comparisons
npm run build    # static build in dist/ (relative base, works offline)
npm run preview  # http://localhost:4216
npm run mc       # Monte Carlo strategy table for all levels
npm run smoke    # headless Chrome plays all 17 levels through the HUD (needs a server; BASE=http://localhost:4216/ for the preview)
npm run capture  # gameplay screenshots at mockup size into docs/captures/
```

## Controls

| Action | Mouse / touch | Keys |
|---|---|---|
| Throw at the rival (first twin) — "זריקה ליריב" | pink button, or tap the rival | `1` |
| Throw at yourself — "זריקה עליי" | cyan button | `2` |
| Throw at the second twin | pink button | `3` |
| Call it (optional bet on P) | tap the probability scale | — |
| Show the odds meter (limited levels) | "הצגת סיכוי" | `H` |
| Use a trick card | card in your hand (bottom left) | — |
| Pause / sound / ×2 speed | top-left buttons | `P` / `Esc`, `M`, `F` |

Settings on the title screen: sound, reduced motion. Progress (stars, unlocks) is saved in `localStorage`.

## What's in it

- 17 authored levels in 5 booths, each booth a new subject and a new look: the bakery (probability, scale, complement · grade 8), Grandma Rina's card parlor (without replacement, dependent events, conditional probability · grade 9), the Twins' toy stall (tree diagrams, two-way tables, area model · grade 9), Robo-Clown's spinner carnival (independent repeated trials, relative frequency · grades 8–9), and the rooftop final vs Big Mo. Each booth opens with a subject card; each match with a versus banner. See `LEVELS.md` and `CURRICULUM.md`.
- Progression and replay: stars per level (decision quality), any passed level can be replayed from the midway, **expert mode** for every passed level (no meter, smarter rival, crowns), and endless **carnival nights** (generated mixes, each checked by the solver before it's served).
- Booth 1 coaches the first decisions (what the fraction means, which button fits) without forcing them.
- A procedural carnival waltz per booth (music toggle on the title screen), synthesized sound effects, hit-stop, slow motion on your own splats.
- Pure math core in `src/core/` (exact fractions, probability helpers, the duel state machine, rival AI, scoring and the fairness rule) with no Three.js imports; tests in `tests/`.
- Three.js scene in `src/scene.ts`: booth, Pie-o-Matic, rigged Tripo rivals (`THREE.AnimationMixer`: idle, laugh, hit, cheer, defeat), slow-motion shots, cream and confetti particles, bloom. Models and their sources are listed in `ASSETS.md`.
- HUD in `index.html` + `src/game.ts` + `src/style.css`, Hebrew RTL with fractions in LTR isolates, laid out after the gameplay mockups in `docs/visual-targets/`.
- Test hooks: `window.render_game_to_text()` and a deterministic `await window.advanceTime(ms)`; `tests/autoplay.js` plays a level through the real buttons.

## Deploy (Vercel, static)

The game is a static Vite build with a relative base, so any static host works. On Vercel: import the GitHub repo, framework preset **Vite**, build command `npm run build`, output directory `dist`. No environment variables, no backend. The canvas sizes itself to its container (CSS container queries), so it can be embedded under a site header/footer in a container of any size.

## Status

See `progress.md` for what's done and what's still open, and `PLAYTEST.md` for what was verified and how.
