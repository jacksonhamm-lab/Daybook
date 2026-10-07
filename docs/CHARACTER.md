# Character: Dex

## Now (v6, rider.js)

- **Jackson's own VRoid model**, four outfits by time of day (from `buddyContext().mode`):
  - **Ski** (default): the code-built ski kit (see Plan below). Skis downhill non-stop:
    carved turns (lean into the turn, skis yawed, upper body counter-rotated and more
    upright, inside leg bent more, pole plant at each transition), snow spray off the
    outside ski, fading tracks, pines and snowfall streaming past on a night slope.
    Tuck runs on training days; a 360 when the list is clear.
  - **Gym** (training day, until the session is marked done; on purpose, it's his reminder to train): `Gym.vrm` (shirtless, black
    sweats), made leaner and more defined by `physique.js` (his ask: "more muscular, like
    Luffy"; reference was Wano-era Luffy). Bigger delts, arms and forearms, broad flat pecs,
    lats and traps; painted cel shadows under the pecs and ab rows, down the midline, outside
    the six-pack, on the flanks and the delt V, with thin ink lines on the top edges; skin
    shadow tone deepened. Athletic stance with fists; tap for a double-biceps flex.
  - **Work** (clocked in): `Work.vrm`, standing easy, breathing, eyes follow your finger.
  - **Sleep** (11pm to 6am): `Sleep.vrm`, asleep on his back on a plaid blanket
    (head on a rolled pillow, one knee up, hands on his stomach) by a campfire, with a tent,
    lantern and mug of cocoa. He rejected a legs-out lean-back (stiff) and a log seat (he
    didn't read as sitting on it); asked for cozy + blanket. Tapping wakes him for a minute.
- **Each outfit has its own setting** (`SETTINGS` / `setEnv` in rider.js): ski = night slope;
  gym = his home workout room (sunny painted wall, honey wood floor, his mat, kettlebell, dumbbells, water bottle);
  work = menswear shop floor (wood planks, rail of jackets, table of folded shirts, mirror);
  sleep = cozy snowy camp at night: painted pine forest, mountains, moon and aurora; plaid blanket, pillow,
  a painted tent glowing inside, lantern, cocoa on a stump, a woodpile, and a campfire of soft painted flames.
  Lighting and the sky behind (a gradient layer under the canvas) change with it.
- **Routines so the standing looks stay busy** (`TASKS` / `stepTask` in rider.js, one after another):
  gym = alternating dumbbell curls (dumbbells appear in his fists), squats, jumping jacks, a flex;
  work = checks his watch, straightens his tie, looks round the shop, walks to the jacket rail
  and back. Asleep he breathes deeply, shifts every ~16s (head rolls, the other knee comes up),
  nods now and then, and the cocoa steams. Folded arms / hands in pockets read badly (hands
  ended up at his face or held out), so they were dropped.
- **Awake at the night camp** (tap him while he sleeps): yawns and stretches first, then warms his
  hands at the fire (walks over and crouches), walks to the cocoa, bends to pick it up, drinks with the cup at his lips, bends to put it back, walks back, looks up
  at the stars, until he dozes off again after a minute. The camera follows him when he walks.
- **Hands** (`hands(vrm, L, R)` in gear.js): relaxed natural curl by default (never flat), fists on
  poles/dumbbells/flex, a grip on the mug, open cupped palms at the fire, an open hand to wave, soft
  curls asleep. He said the flat hands looked "stiff as boards".
- Trips (fire, mug, jacket rail) walk forwards both ways (`trip()`), then turn to face you.
- **Motion feel** (his note: it can look animated, just not stiff and robotic):
  - every joint eases to its new angle (`smoothPose`), legs quickly, head and hands trailing
    (`LAG`), so changes blend and extremities overlap;
  - a real walk cycle (`gait`): knee bend in the swing, heel-to-toe roll, pelvis twist and drop,
    chest counter-rotation, arms swinging opposite with soft elbows, fading in and out;
  - idle life: visible breath in chest and shoulders, weight that settles on one foot then
    shifts, drifting head and loose arms;
  - anticipation: a dip before hops and 360s. At the fire he leans in (no squat, his call).
- **Camera:** drag sideways to walk it round him; it stays where you leave it (remembered per
  device; Reset camera is in Customise). Left alone for 6s it slowly circles him (~90s a turn),
  pausing while you touch the scene or have the wardrobe open.
- Tap: hop (ski) or wave (standing) and say the next useful line. Double-tap: a 360.
  Drag sideways: swing the camera round (it stays; see Camera below).
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

## Models v5 (2026-10-06: what's live now)

The four looks were regenerated in **Tripo Smart Mesh** and rigged by Tripo. This replaced the Concept B models below.
- **Why:** the old meshes had lighting painted into their textures (it stayed put while he moved, so he always looked
  "off"), dense messy geometry, and Mixamo auto-rigs that stretched at the shoulders and ballooned the trousers.
- **What they are:** about 10,000 triangles each, flat colours with no painted shading, a 65-bone `mixamorig:` skeleton
  with real fingers, T-pose (ski is an A-pose; `wrapPlain()` straightens it). About 0.9 MB each with a 2K texture.
- **Outfits:** work is a double-breasted navy suit; ski, gym and camp as before. He wants a relaxed, drapey fit everywhere.
- **Pipeline** (`tools/blender/`, run with Blender headless: `blender --background --factory-startup --python <script> -- <name>`):
  - `tripo.py <name> [A]`: a Tripo-rigged FBX in, scaled to 1.75 m, texture wired up, pose-test renders out, GLB out.
  - `rig.py <name>`: rigs an *unrigged* Smart Mesh FBX from scratch (measures the mesh, builds the skeleton, skins it
    through a voxel-remesh proxy). About as good as Tripo's rig; kept as a fallback and repair tool.
  - `dexlib.py`: shared loading, rendering and the pose tests (arms down, arms up, elbows, squat, lunge, bend, fist).
  - Then gzip, `wrangler kv key put model:<name>.glb`, and bump `MODELS` (`?v=`) in rider.js.
- **Known:** the work model's face doesn't match the others (black eyes, paler skin).

### His skis
- The pair he generated in Tripo is the default ski choice, "Painted" (`skis: 'art'`). `tools/blender/skis.py` splits the
  one mesh into `ski_l` and `ski_r`, lays them flat (tip forward, topsheet up, top surface at the boot), takes the
  wobble out of their length while keeping the upturned tips, scales them to 1.84 m, and paints out a brand-like
  mark near one tip (the skis have always been logo-free). Output: `models/skis.glb`, in KV as `model:skis.glb`.
- `plainSkiKit()` (gear.js) still builds the bindings and poles in code. For 'art' it loads the model once
  (`loadArtSkis`) and shows it in place of the code-drawn ski; the other choices (Bents, Midnight, Glacier, Lava) are
  the code-drawn topsheets. If the model can't load, the code-drawn skis stand in.
- index.html moved him onto the painted pair once (`settings.skisV`).

### Props in his hands
- `holdInFist(vrm, side, obj, { r })` (rider.js) seats a prop of handle radius `r` from the palm itself: `palmOf()`
  finds the knuckle row and the palm's underside on the skin at the T-pose rest, and the prop sits tucked under the
  knuckles, touching both. Props are built around that grip point, axis along the knuckle row, thumb side +z.
- The clips' hands are open, so motion.js closes his fingers round whatever is showing in a hand (`r.held`):
  `gripApply()` after the mixer, `gripRestore()` before it (the mixer only rewrites a bone that changed).
  How far they close comes from the handle's radius (`curlFor`): a fist on a dumbbell, a clasp on the mug.
- The bottle is held near its top with the cap just above his thumb; the mug with its rim there. The drink is a
  cup clip, so the bottle is an approximation.
- **Carried between his palms** (`{ across: true }`): the log and the shoe box sit with one end flat against his palm,
  their length along the palm's normal.
- **Pen** (`{ pen: true }`): under his index finger on the thumb's side, leaning back toward the wrist. It shows while
  the `writing` clip plays.
- **Ski poles** use the same palm measurement (`palmOf`, now in gear.js), so the grips sit in his fists.

### Hands that reach (motion.js, `corrections()`)
The clips were made for other bodies and props, so two things are corrected on top of them with a two-bone reach
(`reach()`: the elbow opens or closes for the distance, the shoulder swings the arm onto the target, the hand keeps
the clip's angle):
- **A sip.** Each cup has a sip point (the mug's rim, the bottle's cap). As it nears his face in the `drinking` clip,
  his hand is drawn in until that point meets his lips. `mouthOf()` (rider.js) finds his lips from the profile of his
  face: the chin is where the profile jumps forward above the neck, and the lips are just under 3 cm above it.
  (The head joint is in the middle of the head, so the lips are *below* it. The first version assumed above, and the
  mug went to his eye.)
- **Writing.** The `writing` clip writes in his lap. Both hands are lifted onto the desk top (`world.deskTop`), which
  is now a desk's height over the stool (seat + 29 cm).
- Anything changed after the mixer runs goes through `touch()` and is put back by `untouch()` before the next mixer
  update (the mixer only rewrites a bone whose value changed). The finger grips use this too.

### Fixed along the way (2026-10-06)
- **The stool was 33 cm too tall.** Its height came from his hips at the end of the `sitting` clip, but sampling a
  looping clip at exactly its duration gives its first frame (standing). It's sampled just short of the end now.
- **Pale speckles on the suit.** Tripo's 8K atlas packs thousands of colour patches edge to edge; shrunk to 2K they
  bled into each other along every seam. `tools/blender/tripo.py` now re-bakes each texture onto a fresh UV layout
  with padding between islands (the head gets 1.8x the texel density). Models are at `?v=3`.
- **Boots crooked on the skis.** The ski model stands toes-out (about 15 degrees). The skis are now built along his
  boots (`footYaw`), and `skiPose` turns each ankle in by the same angle, so boots and skis both point straight.
- **The shop was drawn for a giant.** Painted jackets on the back wall came out 1.7 m tall. The painting was extended
  upward and outward (a ceiling, more room) and is shown so a painted jacket is about .85 m; the rail's jackets and
  the mirror were scaled to match.

### Cleanup (2026-10-06)
Everything that only served the VRoid .vrm models is gone: `physique.js`, the code-built clothes (`dress()`),
the mask, goggles and beanie (`gear()`), skin tone and gym build. `dress.js` is now just the cel materials;
`gear.js` is skis, poles and finger poses. Customise offers only what still does something: look, slope time,
skis and poles. Sections further down that describe the VRoid pipeline are history.

## Concept B (2026-10-02: superseded by Models v5)

- **What B is:** One Piece Wano-style, with his messy black hair and magenta eyes, an athletic build, and Zoro-style ink-line muscles. The reference is `Documents/Dex/Dex concept B (target look).png`.
- **Gym look:** B, as `models/gym.glb`, uploaded to KV as `model:gym.glb`.
  - Built with Tripo image-to-3D from B. Tripo's own rig was broken (every vertex was weighted to the hips).
  - Re-rigged in Mixamo with the light skeleton (thumb and index fingers only), then exported in the browser to an indexed GLB with a 1024px JPEG texture, scaled to 1.75m.
- **wrapPlain() in rider.js** puts three-vrm's VRMHumanoid over the mixamorig bones, so clips, props and the camera treat it like a VRM.
  - No face shapes, so no blinking.
  - Material: toon plus a self-lit painted texture (emissive .42), with an INK outline mesh sharing the skeleton.
  - physique.js is skipped for it.
- **All four looks are concept B now (2026-10-03):** gym, work, ski and camp (key `sleep`) are Tripo models rigged in Mixamo.
  - **Pipeline per outfit:**
    1. Reference sheet, then front/back/right views generated one at a time, with left mirrored, into `Documents/Dex/<Look>/`.
    2. Tripo multiview.
    3. Tripo's rig is always broken, so the mesh goes through Mixamo (light skeleton: thumb and index fingers only).
    4. Convert in the browser (scratchpad make.html): the original Tripo textures go back on (2048 colour + 1024 normal map), the
       hard dark strip Tripo paints under the jaw is repainted to a soft skin shade, the result is scaled to 1.75m, and exported to
       `models/<look>.glb` and KV.
  - **Ski kit:** the jacket, mask and goggles are part of the model; `plainSkiKit()` (gear.js) adds the skis and poles, built at
    the T-pose rest and attached in place. Customising colours only reaches the skis and poles now.
  - **Props in the fist** (holdInFist) on plain models are placed at the T-pose rest too. Their bind pose hangs the arms, so bind
    matrices would tilt the props.
  - The VRoid .vrm files, dress.js, physique.js and the rest of gear() are no longer loaded. They're kept for the record.

## Motion (2026-10-02: motion capture, motion.js)

He kept asking for movement that isn't stiff or robotic. Hand-coded joint angles never got there, so
every look except skiing now runs on **Mixamo motion capture**.

- **Pipeline:**
  - Jackson downloads clips from mixamo.com (FBX Binary, Without Skin, 30fps, In Place where offered)
    into `Downloads/Animations`.
  - `node tools/convert-clips.mjs <dir> out.json` (needs `npm i three@0.169.0`) retargets each one onto
    the VRM humanoid bones, using the same maths as three-vrm's loadMixamoAnimation.
  - The clips we use are trimmed into `models/anims.json`, gzipped, and uploaded to KV as
    `model:anims.json`. Bump `URL_` in motion.js after an upload.
  - **Never commit the clips:** Mixamo's licence doesn't allow sharing the raw files, and the repo is public.
- **Routines:**
  - `ROUTINES` in motion.js is a script per look: `go` (walk to a spot), `face`, `play` (a clip,
    n times or `cut` seconds) and `idle`.
  - Every trip is home -> spot -> home along clear straight lines. The spots in `S` must match the props in
    `buildSettings()`; the shop mirror moved to the left wall for this.
  - **Work:** browses the jacket rail, sorts at the shirt table, then checks the fit in the mirror.
  - **Gym:** walks to the dumbbell cradle, takes the bells, curls, puts them back, then squats and jumping jacks,
    wipes his brow, drinks from his water bottle, does push-ups on his mat, and finishes with a flex.
  - **Camp (awake):** a tap gets him up out of bed (`stand_up`). He carries a log from the woodpile to the fire, kneels to warm up,
    drinks his cocoa, and sits on the blanket (`standing_up` backwards). At bedtime (the minute is up) he finishes what's in his
    hands, gets up if he's sitting, walks back and lies down (`stand_up` backwards), then the hand-posed sleeping pose takes over.
    - Steps can play backwards (`rate: -1`); a travel clip played backwards first steps back by its travel.
    - `WAKE` and `BED` are queued ahead of the routine (`mo.queue`); rider.js keeps him awake (`camping`) until `mo.inBed`.
    - Clips are measured with him upright: `stage()` used to run while he was still rotated flat from sleeping, which threw
      off the floor offsets and the stump height.
- **Mechanics:**
  - **Feet don't slide:** walking travels at the clip's own stride speed (taken from its root motion,
    which is then removed).
  - **Floor contact:** each clip gets a floor offset from its lowest point (feet, knees, seat or back).
  - **Props:** dumbbells and the mug appear in his hands only during their steps.
  - **Taps:** a tap plays a reaction (wave, cheer, nod, flex) and then he resumes the step he was on.
- **Still hand-posed (rider.js):** skiing, and asleep at camp. A fresh mixer is made when coming back
  from those, because the mixer only writes a bone whose value changed. For the same reason, clip mode
  never calls `resetNormalizedPose()`: a reset would leave every still bone in T-pose.
- **Grabbing things (2026-10-03):** `picking_up` and `putting_down` are one-handed, right-hand clips; a name ending in
  `~m` plays the mirror image (left hand). `grab()` finds when and where his hand is lowest, and `stage()` lays the props
  out under that point for the current model:
  - **Gym:** a low oak cradle with a dumbbell under each hand.
  - **Camp:** a log stump with the cocoa.
  - **Cups are left-handed:** the drinking clip drinks with the left hand, so the cocoa and the water bottle are picked up and
    put down with the mirrored clips (`picking_up~m`) and held in the left fist.
  - A step's `fx` swaps the prop between the world and his hand at the moment of the grab, so nothing pops in or out.
  - The old waist-high dumbbell rack is gone.
- **Custom-rig rest pose:** Tripo/Mixamo models (and clips downloaded on them) can rest with the arms hanging.
  - Everything assumes a T-pose rest, so `wrapPlain()` in rider.js and convert-clips straighten the arms first.
  - Without this the gym arms bent backwards, about 70 degrees off.
- **Clips that would help next:** a sit-down / stand-up pair for the blanket (a crossfade to the floor
  kicks his legs up), and a pick-up-from-floor clip (for now a crouch clip is cut short).

## Scenes (2026-10-03: lofi 2.5D sets)

Lots of detail at almost no cost: paint what he doesn't touch, model only what he does.
- **Back wall:** one painted lofi image per scene (`scenes/<look>.jpg`), generated in the style of his lofi reference and outpainted wide.
  - `backdrop()` in rider.js puts it on a plane facing the camera's resting angle (CAM_YAW), drawn first without depth,
    with the painted floor line on y = 0.
  - The 3D floor is solid and stops exactly at the wall (`floor(..., { wall })`).
- **Painted cut-outs** (`sprite()`) for detailed props he stands at: the shop's jackets and mirror (`scenes/work-*.webp`).
- **3D only for what he touches:** cel-shaded and ink-outlined. `stage()` in motion.js lays out the desk, stool, shoe stack and
  bench from where his body actually goes in the clips.
- **Depth for free:**
  - per-look haze (`SETTINGS[look].fog`);
  - soft contact shadows (`blob()`) under him and the props.
- **Camera:** sways ±25° instead of circling, and dragging is clamped to that arc, so the painted walls always read.
- **Shop routine:**
  1. Browse the rail.
  2. Sit back onto the stool (`sitting` keeps its travel; TRAVEL clips hand it to his position).
  3. Write in the ledger.
  4. Get up (`stand_up2`).
  5. Carry a shoe box from the stack to the bench (lifting, then putting_down).
  6. Check the mirror.
- **Not walking through things:**
  - Every prop has a footprint (`OBST` fixed, `STAGED` laid out per model) in motion.js.
  - `plan()` routes each walk over the footprint corners, grown by his body radius (shrunk only as far as needed when he's starting or stopping right next to one).
  - At the desk he stands clear, sits back, then scoots in to write (`world.deskShift`), like pulling a chair in, and scoots out before getting up.
  - Shoe boxes and the bench sit just past his hand so his feet stay out of them.
- **Gym (his real home setup: 10kg dumbbells, a kettlebell, a mat, no bench or bar):**
  - Painted wall `scenes/gym.jpg`: a sunny home workout room (window, plants, shelves, ski poster, string lights).
  - 3D: the kettlebell (fixed), and from `stage()`: the dumbbell cradle, a wooden crate with his water bottle (front left,
    so he turns three-quarters to the camera to drink), and the mat, sized to his hands and feet in `push_up`.
  - Routine adds `wiping_sweat` after the jumping jacks, then the water bottle, then push-ups on the mat.
- **Camp:**
  - Painted night wall `scenes/camp.jpg` (snowy pines, mountains, moon, aurora) and a painted tent cut-out (`scenes/camp-tent.webp`).
    The 3D moon, star field and ski-slope trees are off here; a solid snow floor runs to the wall, with blue night haze.
  - Flames are soft painted teardrops (sprites, additive) that flicker, instead of cones.
  - 3D for what he touches: the woodpile (top log under his hand in `lifting`, cut ends to the camera), the log he lays on the
    fire (he feeds it from behind, facing the camera), the cocoa stump (in front of him, so he drinks facing the camera).
- **Ski (2026-10-06):**
  - One painted ski run (chairlift, hut, pines), repainted for each slope time: `scenes/ski-night.jpg`, `ski-sunset.jpg`,
    `ski-day.jpg`. `SKY[time].back` names the image; `setEnv` swaps it onto `world.skiBack`.
  - It stands `SKI_D` (30 m) up the run, facing the ski camera's resting angle (`SKI_YAW`, .5).
  - The snow is solid up to it (it used to fade into a plain sky). The plane is turned to meet the painting, and the
    texture is counter-rotated (`snow.rotation = -SKI_YAW`) so it still scrolls the way he skis.
  - The pines streaming past are one painted cut-out (`scenes/ski-tree.webp`) reused sixteen times, scaled and
    mirrored, tinted per time (`SKY[time].tree`). They replaced the green cones.
  - Haze per time (`SKY[time].fog`) is the painted snow's colour at the horizon, so the 3D snow meets the painting.
    Sunset's light and snow colours were measured against the painting for the same reason.
  - `SKY[time].bg` is a plain sky behind the canvas for the rare gap at the painting's edges on very wide screens.
- All four scenes are painted now.

## Customise (the hanger button on the scene)

Saved as `settings.dex` (synced); defaults = his real kit (`DEX_DEFAULTS`, in both index.html and
rider.js). The sheet keeps Dex in view: no blur, shorter sheet on phones with the camera
lifting him into the top half, docked right on desktop.

- **Look:** follows your day (auto) or pin Ski / Gym / Work / Night camp. **Ski slope:** night,
  sunset or day (sky, light, snow tint).
- **Ski kit:** jacket, pants, boots, gloves, poles (colours, live via `recolor` / materials).
- **Head:** ski mask, or mask + beanie (built from the mask's rings with a folded cuff); mask,
  beanie and goggle-frame colours; lens tint (gold, ice, rose, smoke, emerald).
- **Skis:** Bents, Midnight, Glacier, Lava (palettes in `SKIS`, gear.js).
- **Body:** skin tone (default, warm, tan, deep; tints the MToon skin of every look) and gym
  build (lean / athletic / jacked = physique amount .55 / 1 / 1.45; changing it reloads the
  gym model).

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
  - `Gym.vrm`: shirtless, black sweatpants, sandals.
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
