# Character: Dex

## Now (v6, rider.js)

- **Jackson's own VRoid model**, three outfits by time of day (from `buddyContext().mode`):
  - **Ski** (default): the code-built ski kit (see Plan below). Skis downhill non-stop:
    carved turns (lean into the turn, skis yawed, upper body counter-rotated and more
    upright, inside leg bent more, pole plant at each transition), snow spray off the
    outside ski, fading tracks, pines and snowfall streaming past on a night slope.
    Tuck runs on training days; a 360 when the list is clear.
  - **Work** (clocked in): `Work.vrm`, standing easy, breathing, eyes follow your finger.
  - **Sleep** (11pm to 6am): `Sleep.vrm`, sitting in the snow with legs out, leaning back
    on his hands, eyes closed, z's. Tapping wakes him for a minute.
- Tap: hop (ski) or wave (standing) and say the next useful line. Double-tap: a 360.
  Drag sideways: swing the camera round (springs back).
- Feet are pinned to the snow each frame (the lowest foot, or the seat when sitting).
- If the models can't load, the old code-built Dex (`buddy.js`) takes over.

## Where we want to go

- **Art style:** Naruto / Demon Slayer. A code-built model won't get there.
- **Motion:** constantly skiing downhill, not walking on skis. Carving, snow spray,
  a moving slope or speed lines.
- **Skis:** Armada powder skis or Atomic Bents, with recognisable topsheet graphics.
- **Customisation:** colours, jacket and pant variants, maybe whole outfits beyond
  skiing. Idea: outfits follow the day (ski gear by default, gym fit on training,
  a suit on the clock).

## Options

### A. VRoid Studio (recommended)

- Free anime character maker. Jackson designs Dex and exports a `.vrm` file.
- Loaded with `@pixiv/three-vrm`. Expressions and eye movement come built in.
- Animations: Mixamo clips (skiing, carving, idle, wave) retargeted to the model.
- Outfits: VRoid clothing variants exported as separate models, or colours
  swapped at runtime.
- Skis, poles, goggles and snow effects stay code-built and attach to the model.
- Cost: a one-off design session in VRoid; a bigger download than today.

### B. Keep code-building

- Push the current model further. Cheapest, but the ceiling is low.

**Decision (2026-09-30): VRoid.** Jackson made the model: `Jackson.vrm` (kept outside
the repo, see below).

### The model

- VRM 1.0, 14MB, 1.82m tall. 54 humanoid bones, spring-bone hair, MToon shading.
- Expressions: happy, angry, sad, relaxed, surprised, blink (both / left / right),
  mouth shapes (aa, ih, ou, ee, oh), neutral.
- Current clothes are VRoid defaults: oversized white tee, black knee shorts, sneakers.
- Loads with `@pixiv/three-vrm` 3.5.5 on our three.js r169 (tested). Clothing colours
  can be changed live through each material's `litFactor` / `shadeColorFactor`
  (tested), which is the basis for in-app colour customisation.
- Meta: avatar use "only author", redistribution not allowed. It's Jackson's own model,
  but **the GitHub repo is public**, so the file must not be committed.

### Plan

- **Soft clothing is generated in code from the body** (VRoid can't add ski clothes).
  Prototype: `dress.js` in the scratchpad test page. It takes the body's triangles by
  which bone moves them, subdivides them, reshapes them, and binds the result to the
  same skeleton, so the clothes bend exactly like the body. Colours live in materials,
  so recolouring is free.
  - Jacket: **shell jacket** (Jackson rejected a Nuptse puffer as "terrible").
    Reference: an Armada 3L shell (boxy, crotch length, tall funnel collar with the hood
    rolled behind the neck, straight roomy sleeves, chest seam, vertical chest-pocket
    zip, pit zips). Hangs straight down from the chest instead of hugging the waist;
    extra room over the seat at the back hem. Zip, seam and pit zips are thin skinned
    strips, not painted triangles (that came out as a sawtooth).
  - Sleeves are rigged ring by ring (shoulder → upper arm → forearm, blended across
    the joints) instead of copying nearby body weights, which tore at the armpit.
    The torso tube ignores leg bones (they ragged the hem). Normals are averaged with
    neighbours so the toon shading follows big shapes, not small bumps.
  - Pants: **wide, straight shell snow pants** (his reference photo), long enough to
    stack in loose, uneven folds over the boots. Legs are pushed out from each leg's
    centre line to a minimum radius, not just inflated.
  - **No logos** (his call).
  - Boots khaki. Gloves black gauntlets that tuck inside the sleeve cuffs, so **no
    skin shows at the wrists**.
  - Garment materials are double-sided so looking into a hem shows lining, not the
    black outline layer.
  - Jacket colour is measured from his photo of the real jacket: **#b8863b** (golden
    brown-yellow, not tobacco). He approved the render at that value.
- **Hard gear: made in code and attached to bones** (`gear.js`, prototype in the
  scratchpad test page). Everything is measured in the bind pose and parented to the
  bone that carries it.
  - **Ski mask** (his call, no beanie): rings round the head sized from the face mesh,
    knit rib texture, a rounded slot for the eyes, skinned to head and neck. Hair meshes
    are hidden while it's on.
  - **Goggles**: styled on his **Smith Squads** (colours measured from his photo): bone
    frame #d5d0c1, black-gold mirror lens (#e6d3a2 → #9b7c47 → #3b2c12), taupe strap
    #8e857c, no text. Real goggle outline (arched top, tapered sides, round lower
    corners, nose arch), lens mounted in front of a solid frame and bulging slightly.
    He rejected a squared-off rectangle ("not how goggles look"). Fixed to the head bone.
    Small parts use a finer outline (`INK_FINE`) than the body.
  - **Skis**: 1.84m twin tips with sidecut and rocker, bindings under each boot, fixed
    to the foot bones. Topsheet is **drawn in code** in the spirit of his **Atomic
    Bents**: hot pink tip → purple → blue, dark peaks, curling cyan waves to the tail,
    **no logos**. (Using his product photo as a texture looked bad: too low-res, and it
    carried the wordmark.)
  - **Poles**: in closed fists (`fists()` curls the finger bones), leaving the
    little-finger side. Pose tip: twist the hands (`hand.rotation.x ≈ -.3`) so poles
    hang straight instead of splaying.
  - Jacket front hem takes a little upper-leg weight so it rides on the thighs in a
    ski stance (otherwise the pants poke through).

## Outfits (decision 2026-09-30: VRoid + code mix)

- **Everyday outfits** (gym, suit, casual): Jackson makes them in VRoid Studio, where
  normal clothes are easy, and exports one `.vrm` per outfit from the same body. The
  app swaps the whole model; each file is compressed and loaded only when needed.
- **Ski and technical gear stays in code** as a kit: `dress.js` (soft garments) and
  `gear.js` (hard gear). A new jacket or pants variant should be a short settings list
  (length, fit, collar, colour, trims), not a rebuild. Refactor into that shape when
  the second variant is needed.
- Photos of real gear he owns are the best spec: measure colours from the photo, but
  redraw graphics in code rather than pasting product photos.
- **Models he has made (2026-09-30)**, all the same body, all kept out of the repo:
  - `Jackson.vrm`: base (tee, shorts, sneakers); the ski kit is built on it.
  - `Work.vrm`: beige blazer, white shirt, striped tie, navy trousers, tan loafers.
  - `Sleep.vrm`: black hoodie, black sweats, sandals.
- Motion reference he sent (used for the carving): Candide Thovex "Swiss Trees" (deep carve in powder,
  low and angulated, inside hand forward, spray off the tails).
- **Hosting:** serve the file from Cloudflare (KV or R2) through the Worker instead of
  the repo. Compress textures first (target 3–5MB).
- **Motion:** procedural skiing on the humanoid bones (downhill stance, carving,
  tuck), plus Mixamo clips if useful. Hair springs will react to the speed.

## Constraints

- Must run smoothly on an iPhone home-screen app.
- Pause rendering when the stage is off-screen or the app is hidden (already done).
- Keep `window.Buddy` (`mount`, `update`, `say`, `play`) so `index.html` doesn't
  care which model is loaded.
