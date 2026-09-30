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

**Decision:** pending. Jackson is looking into VRoid.

## Constraints

- Must run smoothly on an iPhone home-screen app.
- Pause rendering when the stage is off-screen or the app is hidden (already done).
- Keep `window.Buddy` (`mount`, `update`, `say`, `play`) so `index.html` doesn't
  care which model is loaded.
