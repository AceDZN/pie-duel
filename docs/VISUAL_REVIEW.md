# Visual review — mockups vs the real game

Targets: `docs/visual-targets/01–05.png` (ChatGPT image generation, 2026-10-30; design targets only, their Hebrew text is unreliable).
Actual: `docs/captures/*.jpg`, taken by `tests/capture.mjs` in headless Chrome at the mockups' size (1672 × 941), through real clicks and keys, with game time stepped by `window.advanceTime`. Captures are real gameplay, not staged scenes.

| Target | Actual | Moment |
|---|---|---|
| `01-first-30s.png` | `01-first-30s.jpg` (+ `00-goal-card.jpg`) | Level 1, first decision: 1 pie + 2 duds, odds meter 1/3 |
| `02-core-splat.png` | `02-core-splat.jpg`, `02a-dare-bonus-splat.jpg` | The certain pie (1/1) splats Chef Bubu; the dare-bonus pie |
| `03-fail-self-cream.png` | `03-fail-self-cream.jpg` | Aimed at yourself on 3/4 pies, creamed, worked explanation card |
| `04-booth-select.png` | `04-booth-select.jpg` | The midway (level select) with progress |
| `05-card-shop.png` | `05-card-shop.jpg` | Card shop between rounds (level 6) |
| — | `06`–`10`, `11-mobile-390.jpg` | Flavor light + two-way table, area model, spinner vs Robo-Clown, mystery cannon tests, rooftop final, phone width |

## What matches

- **Camera and composition (01–03):** first-person seat at a round red/cream striped table; Pie-o-Matic at left-centre, rival behind the table at right-centre, prize shelf with plush toys behind, string lights, striped canopy, chalkboard signs, chips on the table, hands at the bottom corners. Same framing in all three.
- **HUD hierarchy (01–03):** top-left pause / sound / chips; top-centre "המחסנית הנוכחית" with one icon per shell (pies and confetti balls); top-right booth plaque + level, and cream points as pie icons for the rival and you; right-side vertical odds meter "סיכוי לעוגה" with the fraction; bottom: pink "ירי ביריב" and cyan "ירי בעצמי" buttons over the 0 בלתי אפשרי … 1 ודאי probability scale. Same order and colours as the mockups.
- **Splat (02):** comic "!ספלאט" starburst, cream particles, the rival's rigged `hit_to_head` reaction, camera dolly toward the face, slow motion on the flight.
- **Failure (03):** cream on the screen edges, the rival laughing (rigged `laugh` clip), a cream ticket card with the big fraction 3/4 and one worked line ("נשארו 3 עוגות מתוך 4 — סיכוי של 3/4 לעוגה, יותר מחצי. עדיף היה לירות ביריב."), a "ממשיכים" button.
- **Shop (05):** "חנות הקלפים" plaque, three cards with art, description and chip price, big cyan "לסיבוב הבא" button.
- **Midway (04):** striped stalls with a sign per booth, each rival rendered from its Tripo model, round numbered tokens with stars, the next level highlighted and bobbing, total stars plaque, big pink "!שחקו". Booth 1 is on the right (RTL reading order), unlike the mockup's left-to-right.
- **RTL typography:** Rubik (bundled), Hebrew right-aligned, every fraction and number in an LTR isolate (no flipped 1/3 or minus signs).

## Differences (honest)

1. **Pie-o-Matic silhouette.** The mockup's horn is a large trumpet bell pointing at the camera-left; the Tripo model has a smaller horn and a white dome with pies baked in. We keep the dome (it reads as frosted glass) and show the real mix in a clear loading jar on top; the HUD counter is the authoritative count. The cannon reads as a contraption, not a weapon.
2. **Rival scale.** The mockup's Bubu fills a third of the frame; ours is a little smaller and stands behind the table edge (his body is partly hidden). Moving him closer clipped the HUD's hp card.
3. **Stylisation.** The mockups are painterly with heavy depth of field and dense crowds/Ferris wheel lights; the game uses real-time lighting, bloom and a painted backdrop. The night carnival mood and palette match; the density of background detail doesn't.
4. **Shell counter.** The mockup shows the shells inside the glass; we show them in the HUD and the loading jar. Order is hidden in both (icons are sorted by kind, never by position).
5. **Card art.** Mockup cards have painted illustrations; ours use emoji art on coloured cards.
6. **Big Mo** is the Bubu rig recoloured and scaled (no Tripo budget left for a new model); the mockup shows a sequined showman.
7. **Chip icon:** we use the pink poker chip from mockup 05 everywhere (mockups 01–04 used a gold coin).
8. **Twins:** both seats use the same rigged kid model; the second is tinted, so they read as twins but aren't in matching carnival vests.

## Fixed during the review

- Spinner wheels and the coin moved left of the cannon (they hid the Twins' faces) — `08`, `07`.
- A stale toast from the previous shot showed during the next splat; toasts now clear at every shot.
- The "−1" badge on the cream-points card was clipped off the right edge; it now sits inside the card.
- "סבתא רינה" wrapped onto two lines in the hp card; names no longer wrap.
- Peek card text had a bidi-broken parenthesis; reworded.
- Cannon enlarged (0.6 → 0.74 m) and the bloom softened so the dome stops blowing out.
- Mystery wheel no longer shows confetti on every sector (it suggested "all duds"); it now shows neutral "?" sectors.
- Phone width: the magazine panel moved below the cream-points card.

## Remaining deviations we accept for now

1–8 above. A dedicated Big Mo model and painted card art would close the largest gaps (each needs Tripo credits or more art time).
