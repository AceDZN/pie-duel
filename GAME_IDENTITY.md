# Pie Duel — דו־קרב העוגות — game identity

## One line
A midnight neon carnival booth. You and a quirky rival sit at a small round table with the **Pie-o-Matic** between you, a brass-and-glass cream-pie cannon loaded with a known mix of pies and confetti duds in a hidden order. Fire at the rival or at yourself. Knowing the odds is how you win.

## Table rules (as built)
- The Pie-o-Matic is loaded with a known mix of cream pies and confetti duds (shown as icons), shuffled into a hidden order.
- **Every shot is a call, and the turn always passes.** Aim at the rival: a pie creams them; a confetti dud lets them smack you with a counter-pie. Aim at yourself (a dare): a dud pops confetti and the crowd's dare-bonus pie creams the rival; a pie creams you.
- So: aim at the rival when P(pie) > ½, at yourself when P(dud) > ½, either at exactly ½.
- Why not Buckshot's "dud on yourself = go again"? An exact DP over every magazine state showed that under those rules *always firing at the rival* is optimal everywhere, so the curriculum rule would have been a losing strategy. Under the rules above the probability rule is exactly optimal (the shell consumed and the next turn don't depend on your target; only the ±1 does).
- Pass a level by winning **or** by reading the odds (≥ 80 % solver-correct calls, both kinds of question asked and answered right; good calls carry into the rematch). Stars measure decisions, not luck.

## Words (kid-friendly, no weapons)
In Hebrew UI: the Pie-o-Matic is **מכונת העוגות** ("the machine"), loads are **מנות** (servings), and you **throw**: "זריקה ליריב" / "זריקה עליי" — never ירי / פגזים / תותח / מחסנית.

## Booths (art direction, `src/themes.ts`)
1. The bakery (red/cream stripes, pie stand, popcorn cart) — Chef Bubu.
2. Grandma Rina's card parlor (purple velvet, green felt, card lamp) — Grandma Rina.
3. The Twins' toy stall (teal stripes, balloons, blocks, chalk tree diagram) — the Twins.
4. The wheels carnival (orange/night, giant wheel, neon rings) — Robo-Clown.
5. The rooftop (city skyline, moon, searchlights, trophy) — Big Mo with his crown.

## Feel
- Slapstick, kid-friendly: cream pies and confetti. Never a gun, no weapons, no gore. The Pie-o-Matic is a chunky carnival contraption (brass barrel shaped like a trumpet bell, glass hopper on top where you see the shell *count* but not the order, bulb counter lights, a big red lever).
- Tension in the pause before the lever; payoff in a slow-motion SPLAT on a face, or a confetti POP.
- Warm neon at night: string lights, a red-and-cream striped canopy, prize shelf with plush toys behind the rival, purple night sky, steam from a popcorn cart. Late rounds move to a rooftop with fireworks (final).

## Camera
First-person seat at the table, slightly above table height. The rival sits opposite, framed chest-up, about 2.5 m away. The Pie-o-Matic sits in the middle of the table on a swivel. When you pull the lever the camera leans in; the shot plays in slow motion with a short dolly toward the target.

## Rivals (Tripo, rigged)
1. **שף בובו Chef Bubu** — sweaty, round pastry chef with a tall toque and a cream-stained apron. Naive: always fires at you.
2. **סבתא רינה Grandma Rina** — card-shark grandma, cat-eye glasses, cardigan, poker visor. Plays the odds perfectly.
3. **התאומים The Twins** — two identical mischievous kids in matching carnival vests (two seats).
4. **רובו-ליצן Robo-Clown** — glitchy wind-up clown robot with a bulb nose and a "gambler's-fallacy" brain.
5. **ביג מו Big Mo** — the champion, a huge showman in a sequined jacket (final, rooftop).

Reactions: idle, taunt, flinch/shock (pie hit), wipe face, celebrate.

## HUD (Hebrew RTL, numbers in LTR)
- Top right (RTL start): booth name + level name; cream points (pie icons) for you and the rival.
- Top center: **shell counter** — a row of icons for what is left in the cannon (pies vs duds), always visible.
- Right side: **odds meter** — a vertical bar with the fraction `pies left / shells left` (early levels only, limited hint later).
- Bottom: two big buttons — **"ירי ביריב"** (fire at the rival) and **"ירי בעצמי"** (fire at yourself), plus a **probability scale** strip (0 בלתי אפשרי … 1 ודאי) where you may drop a "call it" token.
- Between rounds: the card shop. Three Balatro-like cards on the table under a spotlight, priced in chips.
- Top left: pause, sound, chips.

## Palette
Night purple #1c1033, neon pink #ff4fa3, neon cyan #3ee6ff, warm bulb amber #ffc35a, cream #fff3d6, brass #c8913a, canopy red #d9343b.

## What it is not
Not a worksheet: no typed answers, no "wrong!" popups. Not a copy of Buckshot Roulette (no guns, no dark dread, no items lifted from it): bright, funny, carnival.
