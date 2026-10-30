# Pie Duel — gameplay "screenshot" mockups

Design targets only, never evidence of the implemented game.

- **Route:** ChatGPT image generation in the user's Chrome (Claude in Chrome, "Browser 2" profile, signed in). `OPENAI_API_KEY` is not set, so the `$imagegen` CLI route was not used.
- **Chat:** https://chatgpt.com/c/6ae5069a-dc60-83eb-8dc2-9b46b0cc90ab (one chat, five turns, so the style, Chef Bubu, the Pie-o-Matic and the HUD stay consistent).
- **Date:** 2026-10-30.
- **Saving:** each image was read from the page as a blob and saved as PNG through a normal browser download (1672 × 941 px each), then moved here.
- **Hebrew text in these images is unreliable.** Copy the layout, hierarchy, colors and feel, not the text. Known text/logic slips are listed per image.
- Every image came out right on the first try, so there were no rejected versions.

| File | Shows | Read |
|---|---|---|
| `01-first-30s.png` | Level 1 vs Chef Bubu: shell counter (1 pie + 2 duds), odds meter 1/3, two big buttons, probability scale | Strong target |
| `02-core-splat.png` | Slow-motion pie splat on Bubu's face, comic "ספלאט" burst, letterbox, dimmed HUD | Strong target |
| `03-fail-self-cream.png` | Player creamed: cream/sprinkles over the screen edges, Bubu laughing, ticket-style explanation card with 3/4 | Strong target |
| `04-booth-select.png` | Midway map: 4 booths + rooftop final, level tokens 1–17 with stars, pie marker, "שחק!" | Strong target |
| `05-card-shop.png` | Card shop: Peek / Eject / Double cards with chip prices under a spotlight | Strong target |

---

## 01-first-30s.png

Prompt (turn 1):

```
Generate an image (wide 16:9 landscape, 1536x864 style). It must look like a real in-game screenshot of a polished stylized 3D browser game (Unity/Three.js look, like Overcooked / Fall Guys art quality), NOT concept art, NOT a poster, NOT a worksheet. Game: "Pie Duel" - a kid-friendly slapstick probability duel for 13-year-olds. Scene: first-person seat at a small round carnival table at night, camera just above table height. Across the table, framed chest-up about 2.5 m away, sits the rival CHEF BUBU: a round, sweaty, goofy cartoon pastry chef with a very tall white toque and a cream-stained apron, grinning nervously. In the middle of the table on a swivel base stands the PIE-O-MATIC: a chunky brass-and-glass carnival contraption that launches cream pies - a brass trumpet-bell shaped barrel, a glass hopper on top with cream pies and confetti capsules visible inside, round amber bulb lights along its side, a big red lever. It must clearly read as a fun funfair machine, not a weapon. Background: warm neon carnival midway at night, red-and-cream striped booth canopy, string lights with amber bulbs, prize shelf with plush toys behind the rival, purple night sky, steam from a popcorn cart. Palette: night purple #1c1033, neon pink #ff4fa3, neon cyan #3ee6ff, amber #ffc35a, cream #fff3d6, brass. HUD overlay in Hebrew, right-to-left layout: top-right a rounded panel with booth name "הדוכן ההוגן" and level "שלב 1" and small pie-icon health points for both players; top-center a SHELL COUNTER row of 3 big icons: 1 cream pie icon + 2 confetti-dud icons; right side a vertical ODDS METER bar labelled with the fraction 1/3 (numbers left-to-right); bottom-center two big chunky glossy game buttons side by side: pink button "ירי ביריב" and cyan button "ירי בעצמי"; along the very bottom a thin probability scale strip from 0 "בלתי אפשרי" to 1 "ודאי" with a small token. Top-left small pause, sound and chips icons. Bright, funny, juicy, inviting, high-quality game UI with chunky rounded shapes and soft glow. No guns, no weapons, no gore.
```

Notes: the glass hopper shows more pies than the counter says (we show only the count, so the real hopper should be frosted or show icons). The shell-counter title "המוחסנית הנוכחית" is garbled. Chalkboard signs are filler text. The pink "ירי ביריב" button sits on the left. In our RTL HUD, decide the order on purpose.

## 02-core-splat.png

Prompt (turn 2):

```
Great! Keep exactly the same game, art style, characters, Pie-o-Matic and HUD style. Now generate screenshot #2 of the same game (16:9): the CORE PAYOFF moment in slow motion. The Pie-o-Matic has just fired and a big cream pie is SPLATTING right into Chef Bubu's face: cream exploding outward in thick blobs, his toque knocked sideways, eyes squeezed shut, comedic shock. A burst of colorful confetti and sparkles, speed lines, slight motion blur on the flying cream, shallow depth of field. The camera has leaned in and dollied toward the rival (closer framing than before, slight dutch angle). The HUD is dimmed and semi-transparent during slow motion, with a big juicy comic text burst in Hebrew "!ספלאט" (splat) and a small "+1" pie point popping on the score panel; the shell counter at top now shows the pie icon crossed out/used. A thin cinematic letterbox bar top and bottom. Bright, hilarious, slapstick, kid friendly, no weapons.
```

Notes: the comic burst reads "ספלאנ!" (wrong final letter). The HUD isn't actually dimmed. The "+1" sits on Bubu's row, but a hit should cost the rival a point (show −1 on the rival's row).

## 03-fail-self-cream.png

Prompt (turn 3):

```
Awesome. Same game, same style. Screenshot #3 (16:9): the FAILURE moment. The player chose to fire at themself on a risky shell and got creamed: thick white cream and pink frosting is dripping down over the edges of the camera view (the screen itself is splattered, like cream on the lens, framing the image), a few sprinkles stuck to the lens. Through the clean middle of the view we see Chef Bubu across the table laughing and pointing, holding his belly, tears of laughter. The Pie-o-Matic barrel is turned toward the camera (toward the player), a little puff of cream smoke from the trumpet bell. The shell counter at top shows 4 shells: 3 pie icons and 1 confetti dud, one pie icon highlighted as just used. In the center-bottom a short friendly explanation card (rounded, cream colored, slight tilt, like a carnival ticket) with one line of Hebrew text and a big fraction 3/4 written left-to-right with a tiny pie icon, e.g. "נשארו 3 עוגות מתוך 4 - סיכוי של 3/4 לעוגה", and a small button "נמשיך". The player's pie-point health panel shows one point lost with a little -1. Funny, not punishing, bright and slapstick, no weapons.
```

Notes: the "−1" sits on Bubu's row instead of the player's ("אתה") row. The button reads "נמשיך" correctly. The card text is close to the prompt but wraps awkwardly (the real card should be one short line plus the big fraction).

## 04-booth-select.png

Prompt (turn 4):

```
Love it. Same game, same style and HUD language. Screenshot #4 (16:9): the LEVEL / BOOTH SELECT screen, rendered as a 3D scene. A high three-quarter camera looks down a winding carnival midway path at night. Along the path stand four distinct glowing carnival booths, each with its rival mascot cutout on the sign: 1) "הדוכן ההוגן" red-cream striped pie booth with Chef Bubu, 2) "הספירה לאחור" purple card-table booth with Grandma Rina in cat-eye glasses and green poker visor, 3) "עצים וטבלאות" teal booth with two mischievous twin kids in carnival vests, 4) "קרנבל הסביבון" booth with a giant spinner wheel and a wind-up Robo-Clown with a bulb nose. At the far end, up on a rooftop with fireworks bursting, the final champion stage "האלוף" with Big Mo, a huge showman in a sparkly sequined jacket, locked with a padlock. In front of each booth a row of round level tokens (numbered 1-17 in total along the path, numbers left-to-right) with 0-3 gold stars under each token; booth 1 fully starred, booth 2 partly, later booths locked/grey. A small cute pie-shaped player marker stands on the current level token. HUD: top-right title panel "דו-קרב העוגות" with total stars, top-left chips counter and settings, bottom a big glossy pink button "שחק!". Warm neon string lights, purple night sky, Ferris wheel in the distance. Bright, inviting, like a mobile/console game world map.
```

Notes: the booth names came out right. The level tokens run left to right, but in our RTL game the path should probably start on the right. Use this for the look and mood (midway, booths, rooftop, stars), not for the token order. Star total "24/51" is plausible (17 × 3).

## 05-card-shop.png

Prompt (turn 5):

```
Fantastic. Same game, same style. Last one, screenshot #5 (16:9): the CARD SHOP between rounds. Same first-person seat at the round carnival table, lights dimmed, one warm spotlight from above on the table. Laid out on the striped tablecloth are three big Balatro-style trick cards, slightly fanned and tilted toward the camera with a glossy foil shine and chunky illustrated art: card 1 "הצצה" (Peek) showing a big eye peeking into the glass hopper, card 2 "פליטה" (Eject) showing a shell popping out of the machine with a spring, card 3 "כפולה" (Double) showing two pies flying side by side. Each card has a price tag in poker chips below it (3, 4, 6 with chip icons, numbers left-to-right) and the middle card is hovered / lifted with a glow. Stacks of colorful poker chips next to the player's hands. Across the table Chef Bubu leans in curiously, the Pie-o-Matic is pushed aside and idle with its bulbs glowing softly. HUD: top center title banner "חנות הקלפים", top-left chips counter showing 12, bottom a glossy cyan button "לסיבוב הבא" and a small grey "דלג" button. Moody but warm, magical, inviting, no weapons.
```

Notes: the card titles came out right, but the card body text is invented filler. The Eject art shows a brass tube with a spring; in-game, keep it clearly a pie machine part, not a barrel. The chip icon here is a pink poker chip, while screenshots 1–4 use a gold coin. Pick one.
