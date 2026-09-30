# Character: Dex

## Now

- Code-built in three.js (`buddy.js`): cel-shaded with ink outlines, jointed knees and
  elbows, leg IK so the skis stay planted, arm IK for pulling the goggles down.
- Outfit: yellow jacket, baggy black snowpants, khaki boots, black knit ski mask with
  an eye opening, cream Smith-style goggles with a gold mirror lens and taupe strap.
- Anime eyes are drawn on a canvas texture inside the mask opening.
- Behaviours: idles, skates to where you tap the snow, hops and talks when tapped,
  squats in a tuck on training days (goggles down by hand), skates in place while
  clocked in, does a 360 when the list is clear, sits in the snow at night.
- Six attributes around him on the Today stage, one per section: Focus, Grind,
  Strength, Stamina, Hustle, Fuel.
- Context comes from `window.buddyContext()` in `index.html`: mode, mood, lines to
  say, status lights.

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
  - Jacket: **The North Face shell jacket** (Jackson rejected a Nuptse puffer as
    "terrible"): smooth, a little loose, covers the top of the pants, black zip and
    cuff tabs, white chest logo.
  - Pants: **TNF shell snow pants**, wide and straight from thigh to ankle (his
    reference photo), falling over the boots, logo on the wearer's right thigh. Legs
    are pushed out from each leg's centre line to a minimum radius, not just inflated.
  - Boots khaki, gloves black.
  - Still to clean up: a gap at the front of the hem, the zip's end, jagged colour
    edges.
- **Hard gear: made in code and attached to bones.** Skis (Armada / Atomic Bent style
  topsheets), poles, goggles, beanie or mask.
- **Hosting:** serve the file from Cloudflare (KV or R2) through the Worker instead of
  the repo. Compress textures first (target 3–5MB).
- **Motion:** procedural skiing on the humanoid bones (downhill stance, carving,
  tuck), plus Mixamo clips if useful. Hair springs will react to the speed.

## Constraints

- Must run smoothly on an iPhone home-screen app.
- Pause rendering when the stage is off-screen or the app is hidden (already done).
- Keep `window.Buddy` (`mount`, `update`, `say`, `play`) so `index.html` doesn't
  care which model is loaded.
