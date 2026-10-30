# Pie Duel — assets

All 3D models come from **Tripo Studio** (https://studio.tripo3d.ai), driven through the UI in the user's own Chrome (signed-in "Browser 2" profile) on 2026-10-30. No Tripo API, tokens, paid upgrades or other generators were used. Raw downloads live in `assets-src/` (gitignored). Optimized files live in `public/models/`, and `public/models/manifest.json` lists clip names, native height, suggested height and forward axis for each.

Gameplay mockups (gpt-image via ChatGPT in Chrome) are in `docs/visual-targets/`; prompts are in `docs/visual-targets/PROMPTS.md`.

## Budget and credits

- **New generations: 8 of 8** (Bubu, Rina, Robo-Clown, Pie-o-Matic, cream pie, prize shelf, spinner wheel, booth stall). Displayed cost: **30 credits each** (H3.1 "Best Quality" HD model, text-to-model, Private).
- **Rig jobs: 3 of 3** (Bubu, Rina, Robo-Clown). Displayed cost: **20 credits each** (Auto Rig, Humanoid, Mixamo preset).
- **Animations:** Tripo **preset** animations only (no AI animations, no Multi-stage Motion). The preset cards show no price. All clips for one character came out of that character's single rig job and one export.
- **Exports:** GLB, 2k textures, "Export Skeleton" on, "Animation stay in Place" on. No price shown.
- **Credit balance:** **4075** before the first task, **3230** at the end. The displayed costs of my tasks add up to 8 × 30 + 3 × 20 = **300**. The rest of the 845-credit drop came from **two other game crews using the same Tripo account at the same time**, so balance deltas can't be attributed exactly. Spot checks: three generations queued back to back moved the balance 3370 → 3280 (exactly 90). Grandma Rina's generation moved it 4040 → 4010. Bubu's rig moved it 3920 → 3900. During preset clicks the balance sometimes jumped by 20–90 and sometimes not at all (e.g. cheer on Bubu: 3720 → 3720), which fits other crews spending in parallel rather than per-preset charges, but I couldn't prove it.

## Processing (all models)

```
npx -y @gltf-transform/cli@4.5.1 optimize assets-src/<name>.raw.glb public/models/<name>.glb --texture-compress webp --compress false
```

- `--texture-compress webp` re-encodes the 2048² PNG/JPEG maps as WebP at the same resolution.
- `--compress false` skips meshopt/quantization on purpose. A first pass with the default (meshopt + `KHR_mesh_quantization`) worked but made the skinned rivals depend on `MeshoptDecoder` and quantized skinned positions. Without it, the files are 0.7–2.0 MB, under the 3 MB target, and only need `EXT_texture_webp`. (`src/models.ts` sets the meshopt and draco decoders anyway, so either form loads.)
- The default optimize pipeline also does dedup/weld/simplify (very low error)/resample/prune. Animation clips were checked after optimizing with `npx -y @gltf-transform/cli@4.5.1 inspect`: all clips are present with 195 channels each.
- **Forward axis:** for rivals, read from bind-pose joints (`mixamorig:LeftToe_End` sits at +z of `mixamorig:LeftFoot` in every rig, and LeftFoot is at +x, so the characters face **+z**). For the Pie-o-Matic, read from the mesh shape: the round horn bell is at **−x**, the tall lever at +x.

## Models

| File | Source | Rig | Clips inside the GLB (exact names) | Size | sha256 |
|---|---|---|---|---|---|
| `rival-bubu.glb` | generated | Humanoid / Mixamo (65 joints) | `hit_to_head`, `laugh_01`, `defeat_02`, `cheer`, `idle` | 1,805,796 B | `df3c5b8c343c4e9422aa77e619fdfc3fe6df960ae9bf84f0740dc820fdbf0c4c` |
| `rival-rina.glb` | generated | Humanoid / Mixamo (65 joints) | `hit_to_head`, `laugh_02`, `defeat_02`, `cheer`, `idle` | 1,953,256 B | `bbcf440e1a424014b754560e0f004f14fd07652147d1307123c5f37fcf0ec23e` |
| `rival-robo.glb` | generated | Humanoid / Mixamo (65 joints) | `laugh_01`, `hit_to_head`, `defeat_02`, `cheer`, `idle` | 1,828,740 B | `a363fff249be882127a1eee7de9e429202163232efba30753249c24884dd163a` |
| `rival-twin.glb` | **reused** from the user's Tripo assets | Humanoid / Mixamo (65 joints), rigged earlier by another crew | `idle`, `cheer`, `laugh_01`, `hit_to_head` | 1,812,208 B | `93afea261ffbc7e97fbbdf6aaec147f40ea627c31fd4c1a577bab3d819baf0d4` |
| `pie-o-matic.glb` | generated | none | — | 874,280 B | `9dd102798ca8bfd2bd5c9a0dbb34b8ad976ba5efc845b2f6c53109cb2e29495f` |
| `cream-pie.glb` | generated | none | — | 687,052 B | `080aa2c8f2234965a756f8739f9457ddeeb014043bcefa6dcfdc469c42c541aa` |
| `prize-shelf.glb` | generated | none | — | 840,228 B | `e9d401dc4eccd159728480d2e8204ad0822f044f7da425a6bba005a3f25f6733` |
| `spinner-wheel.glb` | generated | none | — | 778,540 B | `580e080d4c6217f8e94f06469e970e4e3ad852c4bb1084995f22a3b3d4e65c95` |
| `booth-stall.glb` | generated | none | — | 691,964 B | `9b5bff328034dbbfc846498a0d6569ea0f2874c5b719553d63914e7f405e0a6f` |
| `rival-mo.glb` | **missing**, see below | | | | |

Raw downloads (`assets-src/`, gitignored): `rival-bubu.raw.glb` 3,733,588 B `6ba35990…d182`; `rival-rina.raw.glb` 4,801,604 B `a93793ef…032b`; `rival-robo.raw.glb` 3,779,940 B `1f9fb643…70d2`; `rival-twin.raw.glb` 4,401,476 B `9256277c…a18c`; `pie-o-matic.raw.glb` 2,950,800 B `0a147b10…a03f`; `cream-pie.raw.glb` 2,579,104 B `7571154d…cc4f`; `prize-shelf.raw.glb` 3,092,084 B `1bc455f5…e84a`; `spinner-wheel.raw.glb` 3,313,864 B `80e65b14…d59a`; `booth-stall.raw.glb` 2,738,232 B `562e1cea…744c`.

### Per-model details

**rival-bubu.glb: Chef Bubu.** Generated, text-to-model, T-Pose on.
Task: https://studio.tripo3d.ai/workspace/generate/30e765cd-1a68-4043-ab74-687ca52359a3 (rig/animate: `/workspace/rigging/…` and `/workspace/animate/…` with the same id).
Prompt: "Full body stylized cartoon game character, Chef Bubu: a short, very round, chubby, sweaty and goofy pastry chef with a big belly, rosy cheeks, bushy brown mustache, big friendly eyes and a nervous grin, a very tall puffy white chef toque with a small pink cupcake logo, white double-breasted chef jacket, red neckerchief, white apron with cream and frosting stains, dark trousers, brown shoes. Pixar / Overcooked style, clean bright colors, smooth toy-like materials, game-ready, symmetrical."
Generation 30 (balance 4075 → 4040; another crew also spent during it). Rig 20 (3920 → 3900). Presets: idle, laugh_01, hit_to_head, cheer, defeat (exported as `defeat_02`). 19,917 faces.
Looks: cute and on-model (toque with cupcake logo, mustache, cream-stained apron), but less round and sweaty than the mockup. No wipe-face preset exists, and I didn't spend an AI-animation job on one.

**rival-rina.glb: Grandma Rina.** Generated, text-to-model, T-Pose on.
Task: https://studio.tripo3d.ai/workspace/generate/6ce9b027-8ffa-4153-b429-95482fcf2366
Prompt: "Full body stylized cartoon game character, Grandma Rina: a small, sly, cheeky card-shark grandmother with a confident smirk, silver hair in a bun, big pointy cat-eye glasses with rhinestones, a translucent green poker dealer visor, cozy purple knitted cardigan over a pink blouse, pearl necklace, a few playing cards peeking from the cardigan pocket, knee-length plaid skirt, comfy shoes. Pixar / Overcooked style, clean bright colors, smooth toy-like materials, game-ready, symmetrical."
Generation 30 (4040 → 4010). Rig 20 (3630 → 3610). Presets: idle, laugh_02, hit_to_head, cheer, defeat (exported as `defeat_02`). 19,416 faces. Strong match: purple cat-eye glasses, green visor, playing cards.

**rival-robo.glb: Robo-Clown.** Generated, text-to-model, T-Pose on.
Task: https://studio.tripo3d.ai/workspace/generate/b4607fb9-09f9-47ab-bf3f-ba49efc84c79
Prompt: "Full body stylized cartoon game character, Robo-Clown: a goofy, slightly glitchy wind-up tin clown robot, humanoid with two arms and two legs, rounded retro tin body painted in red, cream and teal stripes with rivets, ruffled metal clown collar, round head with a big red light-bulb nose, painted clown smile, one antenna spring, little pointy party hat, a large brass wind-up key sticking out of its back, white-gloved hands, big clown shoes. Pixar / Overcooked style, clean bright colors, smooth toy-like materials, game-ready, symmetrical."
Generation 30 (4010 → 3980). Rig 20 (3450 → 3430). Presets: idle, laugh_01, hit_to_head, cheer, defeat (exported as `defeat_02`). 18,946 faces. Note: the wind-up key sits on the side of the head, not the back. Thin limbs, so the humanoid rig deforms them rigidly (fine for a robot).

**rival-twin.glb: The Twins (reused).** Source: the user's own Tripo assets ("stylized kid 3d model", a mischievous 13-year-old rival kid with a headband, teal T-shirt, cargo shorts and red sneakers), already rigged and animated by an earlier crew. https://studio.tripo3d.ai/3d-model/a-mischievous-13-year-old-rival-summer-camp-kid-stylized-toon-game-ch-7a77e90b-0b47-461a-8180-5a1ac7c6112f. The page showed no separate license line; it's the account owner's own generated asset. Exported 4 of its 6 existing presets (idle, cheer, laugh_01, hit_to_head; skipped jump and pitch_baseball). No new credits spent. 19,716 faces. For identical twins, load it twice; for the "carnival vest", tint the shirt per seat or add a procedural vest/bowtie.

**pie-o-matic.glb.** Generated, text-to-model, T-Pose off.
Task: https://studio.tripo3d.ai/workspace/generate/c3bc6bdf-d6c1-43e7-8ed9-bc8bcc38b939
Prompt: "Stylized cartoon carnival tabletop contraption prop, the Pie-o-Matic: a chunky funfair cream-pie launcher machine. Rounded red-and-cream lacquered body box with gold trim and a small oval brass nameplate, a wide polished brass horn shaped like a trumpet bell sticking out forward, a big clear glass dome hopper on top filled with little cream pies and colorful confetti balls, a row of round glowing amber light bulbs along the side, a big red ball-topped lever on the right side, sitting on a round brass swivel turntable base. Whimsical, toy-like, circus machine, clearly a fun funfair gadget and not a weapon. Pixar style, clean bright colors, game-ready."
Generation 30 (3980 → 3950). 18,778 faces. Reads clearly as a fun contraption: cream/gold body, red trim, trumpet horn, glass dome, red ball lever, round turntable base. The bulbs are small gold studs, so add emissive procedural bulbs. **The dome has about 10 pies baked into the mesh**, which contradicts "you see the count, not the order". Frost or tint the dome, or overlay a procedural hopper. One fused mesh (no separate lever or swivel), so animate the whole prop or add a procedural lever.

**cream-pie.glb.** Generated. Task: https://studio.tripo3d.ai/workspace/generate/10e70617-10b2-4b83-8852-d19b8a597942
Prompt: "Stylized cartoon cream pie prop for a slapstick game: a round shallow golden crimped pie crust in a silver foil tin, piled high with a huge fluffy swirl of white whipped cream, a red cherry on top and a few rainbow sprinkles. Pixar style, clean bright colors, smooth toy-like materials, low clutter, game-ready."
Generation 30 (balance read 3950 just after, then 3920; it updated late). 19,370 faces. The cream swirl is tall, more sundae than pie; squash it on y for the projectile.

**prize-shelf.glb.** Generated. Task: https://studio.tripo3d.ai/workspace/generate/8bcc876c-7eb9-4366-a9a4-20292a98d69d
Prompt: "Stylized cartoon carnival prize shelf prop: a wide three-tier wooden prize shelf painted red and cream with gold trim, packed with colorful plush toys (teddy bears, a unicorn, a yellow duck, a penguin, a pink bunny, small plush pies), a little row of amber light bulbs along the top edge and a scalloped pennant trim. Front view friendly, Pixar style, clean bright colors, smooth toy-like materials, game-ready."
Generation 30 (the three set pieces together: 3370 → 3280). 18,605 faces. Very good match to the mockups.

**spinner-wheel.glb.** Generated. Task: https://studio.tripo3d.ai/workspace/generate/09ed3cc3-6bca-485d-8564-48be063c5c4e
Prompt: "Stylized cartoon carnival prize spinner wheel prop: a big upright wooden wheel of fortune on a sturdy painted stand, the wheel divided into 8 bright alternating colored wedges (neon pink, cyan, amber, cream) with simple pie and confetti star icons, gold rim studded with round amber light bulbs, a red flapper pointer at the top, center brass hub. Front facing, Pixar style, clean bright colors, smooth toy-like materials, game-ready."
Generation 30. 18,541 faces. **Decorative only:** 10 uneven wedges and one fused mesh. The real ¼-pie spinner must be procedural (and exact).

**booth-stall.glb.** Generated. Task: https://studio.tripo3d.ai/workspace/generate/22031e3c-83b9-45fb-84b7-9061c3032c36
Prompt: "Stylized cartoon carnival game booth stall set piece, seen from the front: an open wooden booth with a red-and-cream striped scalloped canopy roof, a big blank arched sign board on top with gold trim, string lights with round amber bulbs along the canopy edge, two striped corner posts, a low wooden counter in front, small pennant flags. Empty interior. Pixar style, warm cozy, clean bright colors, smooth toy-like materials, game-ready."
Generation 30. 18,026 faces. Blank sign board for a procedural Hebrew booth name. Useful for the level-select midway (4 booths with different tints). Not yet in `src/models.ts` `MODEL_FILES`.

## Library search (search before generating)

- **User's own assets** (https://studio.tripo3d.ai/assets, "Rigged" filter): many characters from earlier crews (Halloween set, kids, a bearded construction worker, a police officer, a plump pizza-chef-style chef, a straw-hat grandma, robots). Reused only the rival kid for the Twins. Rejected: the existing chefs (one slim, one already part of the Pizza Pi look, and we need a distinct Bubu), the straw-hat grandma (no visor or cat-eye glasses, so not a card shark), the police officer (holds an object near the holster, and the brief says no weapons), and the construction worker (hard hat and wrench, not a showman).
- **Featured/community gallery** (https://studio.tripo3d.ai/?category=featured…, searched "ringmaster"): realistic, untextured or statue-like models from other users, none rigged, none in our toy style. The free plan's banner also advertises "Unlimited Model Downloads" as an upgrade, so downloads may be limited. Nothing reused.

## Gaps / not done

- **`rival-mo.glb` (Big Mo) is missing.** The 8-generation and 3-rig budgets were spent on Bubu, Rina, Robo, the hero props and set pieces, and no rigged asset in the account fits a huge sequined showman. `src/models.ts` already falls back to a stand-in. Options for the lead: (a) with approval, spend 1 generation (30) + 1 rig (20) on this ready prompt: "Full body stylized cartoon game character, Big Mo: a huge, broad, barrel-chested carnival champion showman with a big confident grin, slicked-back black hair and a curly mustache, sparkly gold-and-purple sequined tailcoat jacket with tails, red bow tie, white shirt, black trousers, shiny shoes, big gloved hands. Pixar / Overcooked style, clean bright colors, smooth toy-like materials, game-ready, symmetrical." with T-Pose on, presets idle / laugh_01 / hit_to_head / cheer / defeat; or (b) reuse `rival-bubu.glb` scaled ~1.3× with the jacket recolored to sequined purple/gold (weak, since Bubu is booth 1's rival).
- No face rig and no wipe-face clip (no preset; an AI animation would have been a 4th animation job).
- Tripo meshes are single fused meshes (lever, dome and wheel are not separate parts). Anything that moves independently or shows math state should be procedural.

## How the models are used in the game (lead, integration)

- **Rivals** (`rival-bubu`, `rival-rina`, `rival-robo`, `rival-twin`): loaded with `SkeletonUtils.clone`, scaled with `fitHeight`, driven by `THREE.AnimationMixer`. Clips are mapped by name: `idle` (loop), `laugh_*` (taunts, counter-pies, the gambler's "it's due!" moment), `hit_to_head` (every pie in the face), `cheer` (rival wins the match), `defeat_02` (rival loses). Cream blobs stick to the `mixamorig:Head` bone. The Twins load the same GLB twice; the second seat is tinted blue.
- **Big Mo** (`rival-mo`): no model (generation budget spent). In game he is `rival-bubu` tinted lavender ("sequined") and scaled to 1.85 m, with the same rig and clips. A dedicated model needs one more Tripo generation + rig (prompt below in this file).
- **Pie-o-Matic**: rotated +90° so the horn faces the swivel's forward axis, scaled to 0.74 m. Its dome has pies baked in, so the real mix is shown procedurally in a clear loading jar on top of the dome (and in the HUD counter). Procedural fallback exists in `src/scene.ts`.
- **Cream pie**: squashed to 0.6 on y and used for every projectile and counter-pie.
- **Prize shelf**: behind the rival. **Spinner wheel** and **booth stall**: moved to `assets-unused/` (not shipped) — not used in gameplay (the probability wheels must be exact and are procedural canvas textures); kept for a future midway scene.
- Procedural (exact math state, never models): the shell counter, odds meter, probability scale, spinner wheels, coin, area model, tree diagram, two-way table and test-fire bar chart.
