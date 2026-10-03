/* Dex's motion-captured routines (docs/CHARACTER.md, Motion).
   Mixamo clips, converted offline to VRM humanoid bone tracks (tools/convert-clips.mjs) and served
   privately from KV like the models (Mixamo's licence doesn't allow sharing the raw files, and the
   repo is public). Every look except skiing runs on them: a small script per scene walks him to a
   spot, faces the thing, does it, and moves on. Taps play a reaction on top and then he carries on.
   Asleep at camp and skiing stay procedural (rider.js). */
import * as THREE from 'three';

const URL_ = 'models/anims.json?v=3';   // 3: sitting, stand_up(2), standing_up, wiping_sweat, writing
let DATA = null, pending = null;
export function loadAnims() {
  if (!pending) pending = fetch(URL_).then(r => { if (!r.ok) throw new Error('anims ' + r.status); return r.json(); }).then(d => (DATA = d)).catch(e => { pending = null; throw e; });
  return pending;
}
export const animsReady = () => !!DATA;

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

/* ---------- where things are (world metres; must match buildSettings in rider.js) ----------
   Every trip is home -> spot -> home, and each straight line is clear of the props. A spot's yaw
   faces the thing (0 faces the camera, +z). */
const spot = (px, pz, rot, off) => ({ x: px + Math.sin(rot) * off, z: pz + Math.cos(rot) * off, yaw: rot + Math.PI });
const S = {
  home: { x: 0, z: 0, yaw: 0 },
  rail: spot(-1.25, -1.55, .25, .62),        // jacket rail
  table: spot(1.55, -.75, -.4, .7),          // shirt table
  mirror: spot(-2.3, -.2, .9, .75),          // full-length mirror
  bells: spot(1.8, -1.2, -.55, .58),         // dumbbell rack
  blanket: { x: -.02, z: -.05, yaw: .8 },    // sitting on the plaid, the fire off to his right
  fire: { x: 1.6, z: -.55, yaw: Math.atan2(.95 - 1.6, -1.05 + .55) },   // kneeling three-quarters on to the fire, path clear of it
  mug: { x: .42, z: -.24, yaw: 2.7 },        // crouch distance from the cocoa
  till: { x: 1.35, z: -.3, yaw: Math.PI / 2 },   // stands at the desk side-on to the camera; sits back onto the stool
  shoes: { x: .15, z: -1.4, yaw: Math.PI },      // the stack of shoe boxes on the floor
  bench: { x: .95, z: -1.25, yaw: Math.PI * .82 }, // the low display bench
};
// clips that move him (sitting back onto a stool, getting up): their travel is kept, then handed to his position
const TRAVEL = new Set(['sitting', 'stand_up2', 'stand_up', 'standing_up']);

/* ---------- the scripts ----------
   steps: { go: 'spot' } walk there | { face: 'spot' } turn to its yaw | { idle: seconds, clip }
   | { play: clip, n, from, cut, fx }: play n times (or `cut` seconds starting at `from`). A clip name
   ending in ~m is the mirror image (left hand instead of right). fx swaps a prop between the world and
   his hand at the moment his hand is lowest in the clip (the grab): 'bellR+'/'bellR-'/'bellL+'/'bellL-'
   (a dumbbell off / back onto its cradle), 'mug+'/'mug-' (the cocoa off / back onto the stump). */
const IDLE = { work: 'idle', gym: 'warrior_idle', sleep: 'idle' };
const ROUTINES = {
  work: [
    { idle: 4, fx: 'box-reset' }, { go: 'rail' }, { face: 'rail' }, { play: 'rummaging', n: 2 }, { play: 'searching_files_high', cut: 5 },
    { go: 'home' }, { face: 'home' }, { play: 'acknowledging' },
    { go: 'till' }, { face: 'till' }, { play: 'sitting' }, { play: 'writing', n: 3, seated: true }, { play: 'stand_up2' },
    { go: 'home' }, { face: 'home' }, { idle: 3 },
    { go: 'shoes' }, { face: 'shoes' }, { play: 'lifting', cut: 4.4, fx: 'box+' }, { go: 'bench' }, { face: 'bench' }, { play: 'putting_down', from: 3.8, cut: 3.4, fx: 'box-' },
    { go: 'mirror' }, { face: 'mirror' }, { play: 'thoughtful_head_shake' }, { play: 'head_nod_yes' },
    { go: 'home' }, { face: 'home' }, { play: 'searching_pockets' },
  ],
  gym: [
    { idle: 4 }, { go: 'bells' }, { face: 'bells' },
    { play: 'picking_up', from: 1, cut: 3.2, fx: 'bellR+' }, { play: 'picking_up~m', from: 1, cut: 3.2, fx: 'bellL+' },
    { go: 'home' }, { face: 'home' }, { play: 'bicep_curl', n: 2 },
    { go: 'bells' }, { face: 'bells' },
    { play: 'putting_down', from: 3.8, cut: 3.4, fx: 'bellR-' }, { play: 'putting_down~m', from: 3.8, cut: 3.4, fx: 'bellL-' },
    { go: 'home' }, { face: 'home' },
    { play: 'air_squat', n: 3 }, { idle: 3 },
    { play: 'start_jumping_jacks' }, { play: 'jumping_jacks', n: 6 }, { play: 'stop_jumping_jacks' }, { idle: 4 },
    { play: 'idle_to_push_up' }, { play: 'push_up', n: 4 }, { play: 'push_up_to_idle' }, { play: 'being_cocky' },
  ],
  sleep: [   // up at camp (asleep is procedural): sit, stretch, warm up by the fire, cocoa
    { go: 'blanket' }, { face: 'blanket' }, { idle: 3 }, { play: 'neck_stretching' },
    { go: 'fire' }, { face: 'fire' }, { play: 'kneel', cut: 9, fade: .7 },
    { go: 'mug' }, { face: 'mug' }, { play: 'picking_up', from: 1, cut: 3.2, fx: 'mug+' }, { play: 'drinking' }, { play: 'putting_down', from: 3.8, cut: 3.4, fx: 'mug-' },
  ],
};
// tap reactions and celebrations
const REACT = { hop: 'jumping', spin: 'cheering', wave: 'happy_hand_gesture', flex: 'being_cocky', nod: 'head_nod_yes', flip: 'backflip' };
const HAPPY = new Set(['cheering', 'happy_hand_gesture', 'being_cocky', 'acknowledging']);
const WALK = 'walking', WALK_RATE = .85;

/* ---------- clips for one model ---------- */
const MIRROR = n => n.startsWith('left') ? 'right' + n.slice(4) : n.startsWith('right') ? 'left' + n.slice(5) : n;
function build(r, name) {
  const mo = r.mo; if (mo.clips[name]) return mo.clips[name];
  const mirror = name.endsWith('~m'), d = DATA[mirror ? name.slice(0, -2) : name]; if (!d) return null;
  const tracks = [], hipsNode = r.vrm.humanoid.getNormalizedBoneNode('hips');
  let speed = 0;
  for (const [bone, tr] of Object.entries(d.tracks)) {
    if (bone === 'hipsPos') {
      // keep the sway and bob, drop the travel: Dex moves through the scene himself (at the clip's own
      // stride, so the feet don't slide) and every clip starts where he's standing
      const p = tr.p, n = p.length / 3, t = tr.t, x0 = p[0], z0 = p[2], dx = p[(n - 1) * 3] - x0, dz = p[(n - 1) * 3 + 2] - z0, T = t[n - 1] || 1;
      speed = Math.hypot(dx, dz) * mo.hipsH / T;
      const keep = TRAVEL.has(name.replace(/~m$/, ''));
      if (keep) mo.travel[name] = { x: dx * mo.hipsH * (mirror ? -1 : 1), z: dz * mo.hipsH };
      const v = new Float32Array(p.length);
      for (let i = 0; i < n; i++) { const k = keep ? 0 : t[i] / T; v[i * 3] = (p[i * 3] - x0 - dx * k) * mo.hipsH * (mirror ? -1 : 1); v[i * 3 + 1] = p[i * 3 + 1] * mo.hipsH; v[i * 3 + 2] = (p[i * 3 + 2] - z0 - dz * k) * mo.hipsH; }
      tracks.push(new THREE.VectorKeyframeTrack(hipsNode.name + '.position', t, v));
      continue;
    }
    const node = r.vrm.humanoid.getNormalizedBoneNode(mirror ? MIRROR(bone) : bone); if (!node) continue;
    // mirror across his centre line: swap sides, flip the rotation's y and z
    const q = mirror ? tr.q.map((x, i) => i % 4 === 1 || i % 4 === 2 ? -x : x) : tr.q;
    tracks.push(new THREE.QuaternionKeyframeTrack(node.name + '.quaternion', tr.t, q));
  }
  const clip = new THREE.AnimationClip(name, d.dur, tracks);
  mo.clips[name] = clip; mo.speed[name] = speed; mo.floor[name] = measure(r, clip);
  if (/^(picking_up|putting_down|lifting)/.test(name)) mo.contact[name] = grab(r, clip);
  return clip;
}
// How high to lift (or drop) him so the lowest part of his body over the whole clip rests on the
// floor: feet when standing, knees when kneeling, seat when sitting, back when lying.
const PROBES = [['leftFoot', 0], ['rightFoot', 0], ['leftToes', 0], ['rightToes', 0], ['leftLowerLeg', .06], ['rightLowerLeg', .06], ['hips', .1], ['upperChest', .12], ['head', .11], ['leftHand', .03], ['rightHand', .03]];
function measure(r, clip) {
  const scene = r.vrm.scene, y0 = scene.position.y, m = new THREE.AnimationMixer(scene), a = m.clipAction(clip); a.play();
  let low = Infinity;
  for (let k = 0; k <= 10; k++) {
    m.setTime(clip.duration * k / 10); r.vrm.humanoid.update(); scene.updateMatrixWorld(true);
    for (const [b, pad] of PROBES) { const n = r.R(b); if (!n) continue; const y = n.getWorldPosition(_a).y - y0 - (b.endsWith('Foot') ? r.footRest : b.endsWith('Toes') ? r.toesRest : pad); if (y < low) low = y; }
  }
  a.stop(); m.uncacheRoot(scene);
  return Number.isFinite(low) ? -low : 0;
}

function sample(r, clip, t, names) {
  const scene = r.vrm.scene, m = new THREE.AnimationMixer(scene), a = m.clipAction(clip); a.play();
  m.setTime(t); r.vrm.humanoid.update(); scene.updateMatrixWorld(true);
  const out = names.map(n => { const p = scene.worldToLocal(r.R(n).getWorldPosition(_a)).clone(); p.y += r.mo.floor[clip.name] || 0; return p; });
  a.stop(); m.uncacheRoot(scene); return out;
}
function grab(r, clip) {
  const scene = r.vrm.scene, m = new THREE.AnimationMixer(scene), a = m.clipAction(clip); a.play();
  let best = null;
  for (let t = 0; t <= clip.duration; t += .05) {
    m.setTime(t); r.vrm.humanoid.update(); scene.updateMatrixWorld(true);
    for (const side of ['left', 'right']) {
      const p = scene.worldToLocal(r.R(side + 'Hand').getWorldPosition(_a)).clone();
      if (!best || p.y < best.pos.y) best = { t, side, pos: p };
    }
  }
  a.stop(); m.uncacheRoot(scene);
  best.pos.y += r.mo.floor[clip.name] || 0;   // the floor offset this clip gets in play
  return best;
}
export function setupMotion(r) {
  if (r.mo || !DATA) return !!r.mo;
  r.mo = {
    mixer: new THREE.AnimationMixer(r.vrm.scene), clips: {}, speed: {}, floor: {}, contact: {}, travel: {},
    hipsH: r.hipsRest.y,   // measured in bind pose (prepare): he may be lying down right now
    pos: { x: 0, z: 0 }, yaw: 0, y: 0, i: -1, step: null, cur: null, curName: '', react: null,
  };
  return true;
}

function fade(r, name, { loop = true, rate = 1, fadeT = .4, from = 0 } = {}) {
  const mo = r.mo, clip = build(r, name); if (!clip) return null;
  if (mo.cutNext) { mo.cutNext = false; mo.mixer.stopAllAction(); mo.cur = null; }
  const a = mo.mixer.clipAction(clip);
  if (mo.cur === a && a.isRunning()) { a.timeScale = rate; return a; }
  a.reset(); a.time = from; a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !loop; a.timeScale = rate; a.setEffectiveWeight(1); a.play();
  if (mo.cur && mo.cur !== a) a.crossFadeFrom(mo.cur, fadeT, false);
  mo.cur = a; mo.curName = name;
  return a;
}

function props(r, fx, world) {
  const bell = (i, inHand) => { const b = (r.dumbbells || [])[i]; if (b) b.visible = inHand; const s = world.restBells && world.restBells[i]; if (s) s.visible = !inHand; };
  if (fx === 'bells-') { bell(0, false); bell(1, false); }
  if (fx === 'bellL+' || fx === 'bellL-') bell(0, fx === 'bellL+');
  if (fx === 'bellR+' || fx === 'bellR-') bell(1, fx === 'bellR+');
  if (fx === 'mug+' || fx === 'mug-') { if (r.mug) r.mug.visible = fx === 'mug+'; if (world.campMug) world.campMug.visible = fx === 'mug-'; }
  if (fx === 'box+') { if (r.carry) r.carry.visible = true; if (world.stackTop) world.stackTop.visible = false; }
  if (fx === 'box-') { if (r.carry) r.carry.visible = false; if (world.benchBox) world.benchBox.visible = true; }
  if (fx === 'box-reset') { if (r.carry) r.carry.visible = false; if (world.stackTop) world.stackTop.visible = true; if (world.benchBox) world.benchBox.visible = false; }
}
// Lay the scene out around his reach: the dumbbells rest on a low cradle exactly where his hands land
// in picking_up (both sides), and the cocoa on a stump where his right hand lands. Redone per model.
function stage(r, kind, world) {
  const at = (spotName, local) => { const s = S[spotName], c = Math.cos(s.yaw), n = Math.sin(s.yaw); return new THREE.Vector3(s.x + local.x * c + local.z * n, local.y, s.z - local.x * n + local.z * c); };
  if (kind === 'gym' && world.gym && world.makeDumbbell && world.stagedFor !== r) {
    build(r, 'picking_up'); build(r, 'picking_up~m');
    const R = r.mo.contact.picking_up, L = r.mo.contact['picking_up~m']; if (!R || !L) return;
    if (world.cradle) { world.gym.remove(world.cradle); world.restBells.forEach(b => world.gym.remove(b)); }
    const pr = at('bells', R.pos), pl = at('bells', L.pos), top = Math.max(.06, Math.min(pr.y, pl.y) - .07), yaw = S.bells.yaw;
    const cradle = world.cradle = new THREE.Group(); cradle.position.set((pr.x + pl.x) / 2, 0, (pr.z + pl.z) / 2); cradle.rotation.y = yaw; world.gym.add(cradle);
    const w = pr.distanceTo(pl) + .34, mat = world.toon(0x9a7048);   // light oak, so the dark dumbbells read on it
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, .04, .26), mat); slab.position.y = top - .02; cradle.add(slab);
    [-1, 1].forEach(k => { const leg = new THREE.Mesh(new THREE.BoxGeometry(.05, top - .04, .22), mat); leg.position.set(k * (w / 2 - .06), (top - .04) / 2, 0); cradle.add(leg); });
    world.restBells = [pl, pr].map(p => { const b = world.makeDumbbell(); b.visible = true; b.position.set(p.x, top + .05, p.z); b.rotation.y = yaw; world.gym.add(b); return b; });
    world.stagedFor = r;
  }
  if (kind === 'work' && world.shop && world.box && world.stagedFor !== r) {
    const shop = world.shop, s = S.till, rot = s.yaw, mk = [];
    if (world.workProps) world.workProps.forEach(o => shop.remove(o));
    const keep = o => { mk.push(o); return o; };
    // the stool goes where his hips land after sitting back; the desk where his hands are while writing
    build(r, 'sitting'); build(r, 'writing');
    const T = r.mo.travel.sitting || { x: 0, z: -.45 };
    const [hips] = sample(r, r.mo.clips.sitting, r.mo.clips.sitting.duration, ['hips']);
    const [lh, rh] = sample(r, r.mo.clips.writing, r.mo.clips.writing.duration * .5, ['leftHand', 'rightHand']);
    const seat = at('till', { x: T.x, y: 0, z: T.z }), seatTop = Math.max(.35, hips.y - .12);
    const stool = keep(new THREE.Group()); stool.position.set(seat.x, 0, seat.z); stool.rotation.y = rot; shop.add(stool);
    world.cyl(stool, .19, .05, 0x6b4630, 0, seatTop - .025, 0, [0, 0, 0], 20);
    [0, 1, 2, 3].forEach(k => { const a = k * Math.PI / 2 + Math.PI / 4; world.cyl(stool, .016, seatTop - .05, 0x2a1d14, Math.cos(a) * .13, (seatTop - .05) / 2, Math.sin(a) * .13); });
    keep(world.blob(shop, seat.x, seat.z, .5, .5, 0, .3));
    const hand = { x: T.x + (lh.x + rh.x) / 2, z: T.z + (lh.z + rh.z) / 2 }, topY = Math.max(.62, Math.min(lh.y, rh.y) - .03);
    const deskC = at('till', { x: hand.x, y: 0, z: hand.z + .22 }), desk = keep(new THREE.Group());
    desk.position.set(deskC.x, 0, deskC.z); desk.rotation.y = rot; shop.add(desk);
    world.box(desk, 1.25, .05, .62, 0x5b3a26, 0, topY - .025, 0);                       // walnut top
    [[-.56, -.25], [.56, -.25], [-.56, .25], [.56, .25]].forEach(([x, z]) => world.box(desk, .05, topY - .05, .05, 0x3a2618, x, (topY - .05) / 2, z));
    world.box(desk, .42, .012, .3, 0xf1e6cf, 0, topY + .006, -.12, .05);                 // the open ledger
    world.box(desk, .006, .014, .3, 0x8a6a48, 0, topY + .008, -.12, .05);                 // its spine
    world.box(desk, .24, .14, .2, 0x2b2f36, .42, topY + .07, .08);                      // the till
    world.box(desk, .2, .03, .12, 0xc9a24a, .42, topY + .155, .02);                      // brass keys
    world.cyl(desk, .012, .3, 0xc9a24a, -.45, topY + .15, .12);                          // lamp stem
    world.cyl(desk, .09, .08, 0x2f5a3f, -.45, topY + .33, .12);                          // green banker's shade
    [[0xf2efe8, -.2], [0xbcd3ea, -.04]].forEach(([c, x]) => { for (let k = 0; k < 2; k++) world.box(desk, .26, .04, .2, c, x - .2, topY + .02 + k * .042, .2); });   // folded shirts
    keep(world.blob(shop, deskC.x, deskC.z, 1.5, .85, -rot, .3));
    // shoes: a floor stack where his hand lands in lifting, a low bench where it lands in putting_down
    build(r, 'lifting'); build(r, 'putting_down');
    const L = r.mo.contact.lifting, P = r.mo.contact.putting_down;
    if (L && P) {
      const sp = at('shoes', L.pos), bp = at('bench', P.pos), boxH = .12;
      const n = Math.max(1, Math.round((L.pos.y - .06) / boxH));
      for (let k = 0; k < n; k++) { const b = keep(world.makeShoeBox(true)); b.position.set(sp.x, boxH / 2 + k * boxH, sp.z); b.rotation.y = S.shoes.yaw + (k % 2) * .08; shop.add(b); if (k === n - 1) world.stackTop = b; }
      keep(world.blob(shop, sp.x, sp.z, .5, .4, -S.shoes.yaw, .3));
      const bench = keep(new THREE.Group()), bTop = Math.max(.12, P.pos.y - .07); bench.position.set(bp.x, 0, bp.z); bench.rotation.y = S.bench.yaw; shop.add(bench);
      world.box(bench, .9, .05, .36, 0x6b4630, 0, bTop - .025, 0); [-.38, .38].forEach(x => world.box(bench, .05, bTop - .05, .32, 0x3a2618, x, (bTop - .05) / 2, 0));
      world.benchBox = keep(world.makeShoeBox(false)); world.benchBox.position.set(bp.x, bTop + .06, bp.z); world.benchBox.rotation.y = S.bench.yaw; shop.add(world.benchBox);
      keep(world.blob(shop, bp.x, bp.z, 1.1, .5, -S.bench.yaw, .3));
    }
    world.workProps = mk; world.stagedFor = r;
  }
  if (kind === 'sleep' && world.camp && world.campMug && world.stagedFor !== r) {
    build(r, 'picking_up'); const R = r.mo.contact.picking_up; if (!R) return;
    const p = at('mug', R.pos), top = Math.max(.08, p.y - .06);
    if (!world.stump) { world.stump = new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, 1, 12), world.toon(0x6b4a2f)); world.camp.add(world.stump); }
    world.stump.scale.y = top; world.stump.position.set(p.x, top / 2, p.z);
    const mp = world.campMug.parent.worldToLocal(new THREE.Vector3(p.x, top, p.z)); world.campMug.position.copy(mp);
    world.stagedFor = r;
  }
}

function startStep(r, kind, world) {
  const mo = r.mo, list = ROUTINES[kind];
  mo.i = (mo.i + 1) % list.length;
  const s = mo.step = { ...list[mo.i], t: 0, left: 0 };
  if (s.go) fade(r, WALK, { rate: WALK_RATE, fadeT: .35 });
  else if (s.face || s.idle != null) { fade(r, s.clip || IDLE[kind], { fadeT: .45 }); if (s.fx) props(r, s.fx, world); }
  else if (s.play) {
    const d = DATA[s.play.replace(/~m$/, '')];
    if (!d) { s.left = 0; return; }
    fade(r, s.play, { loop: true, fadeT: s.fade || .35, from: s.from || 0 });
    s.left = s.cut || d.dur * (s.n || 1);
    const c = r.mo.contact[s.play]; s.fxAt = s.fx ? (c ? Math.max(0, c.t - (s.from || 0)) : 0) : null;
  }
}

// One frame of the routine. Returns the expression weights for the face.
export function direct(r, kind, dt, world, look) {
  const mo = r.mo;
  if (r.mo.kind !== kind) {   // a new look (or a fresh model): start the script from home
    mo.kind = kind; mo.i = -1; mo.step = null; mo.pos = { x: 0, z: 0 }; mo.yaw = 0;
    stage(r, kind, world); props(r, 'bells-', world); props(r, 'mug-', world);
    if (kind === 'sleep') { mo.pos = { x: S.blanket.x, z: S.blanket.z }; }
  }
  if (!ROUTINES[kind]) return {};
  r.vrm.scene.rotation.order = 'XYZ'; r.vrm.scene.rotation.set(0, mo.yaw, 0);   // upright before any clip is measured (he may have been lying down)
  if (r.clipMode === false) {
    mo.mixer.stopAllAction(); mo.mixer.uncacheRoot(r.vrm.scene); mo.mixer = new THREE.AnimationMixer(r.vrm.scene); mo.cur = null; mo.curName = '';
    if (mo.step) { mo.i--; mo.step = null; } mo.headBase = null;
  }
  let s = mo.step;
  if (mo.react) {
    // a reaction plays once, then he picks the step he was on back up
    mo.react.t += dt;
    if (mo.react.t > mo.react.len - .3) { mo.react = null; if (s) { mo.i--; mo.step = null; s = null; } }
  }
  if (!mo.react) {
    if (!s) { startStep(r, kind, world); s = mo.step; }
    s.t += dt;
    if (s.go) {
      const to = S[s.go], dx = to.x - mo.pos.x, dz = to.z - mo.pos.z, dist = Math.hypot(dx, dz);
      const w = mo.cur ? mo.cur.getEffectiveWeight() : 1, v = (mo.speed[WALK] || 1.3) * WALK_RATE * w;
      if (dist < .06 || s.t > 12) { mo.pos.x = to.x; mo.pos.z = to.z; mo.step = null; }
      else {
        const head = Math.atan2(dx, dz); mo.yaw += ang(head - mo.yaw) * (1 - Math.exp(-9 * dt));
        // only travel once he's roughly facing the way he's going (turns on the spot first)
        const go = Math.max(0, Math.cos(ang(head - mo.yaw))) ** 2, step = Math.min(dist, v * go * dt);
        mo.pos.x += Math.sin(mo.yaw) * step; mo.pos.z += Math.cos(mo.yaw) * step;
      }
    } else if (s.face) {
      const to = S[s.face].yaw, d = ang(to - mo.yaw);
      mo.yaw += d * (1 - Math.exp(-6 * dt));
      if (Math.abs(d) < .04 || s.t > 1.4) mo.step = null;
    } else if (s.idle != null) {
      if (s.t > s.idle) mo.step = null;
    } else if (s.play) {
      if (s.fxAt != null && s.t >= s.fxAt) { props(r, s.fx, world); s.fxAt = null; }
      const tr = mo.travel[s.play];
      if (s.t > s.left - (tr ? .05 : .3)) {
        if (s.fxAt != null) props(r, s.fx, world);
        if (tr) { const c = Math.cos(mo.yaw), n = Math.sin(mo.yaw); mo.pos.x += tr.x * c + tr.z * n; mo.pos.z += -tr.x * n + tr.z * c; mo.cutNext = true; }   // he has moved (onto the stool, or back up)
        mo.step = null;
      }
    }
  }
  // he glances toward a finger or the cursor on top of whatever he's doing; the clip's own head
  // pose is put back first (the mixer won't rewrite a value that hasn't changed)
  const head = r.B('head');
  if (head && mo.headBase) head.quaternion.copy(mo.headBase);
  mo.mixer.update(dt);
  if (head) { mo.headBase = (mo.headBase || new THREE.Quaternion()).copy(head.quaternion); if (look) { _e.set(-look.y * .12, look.x * .3, 0); head.quaternion.multiply(_q.setFromEuler(_e)); } }
  const scene = r.vrm.scene;
  scene.rotation.order = 'XYZ'; scene.rotation.set(0, mo.yaw, 0); scene.position.x = mo.pos.x; scene.position.z = mo.pos.z;
  // the floor offset blends with the clips: settles into a kneel instead of dropping
  const fl = mo.floor[mo.curName] ?? 0; mo.y = damp(mo.y, fl, 8, dt); scene.position.y = mo.y;
  return { happy: HAPPY.has(mo.curName) ? .8 : 0, relaxed: mo.curName === 'kneel' || mo.curName === 'sitting_idle' ? .5 : 0 };
}

// A tap reaction (or a celebration) on top of the routine.
export function react(r, name, world) {
  const mo = r.mo; if (!mo) return false;
  const clip = REACT[name] || name; if (!DATA[clip]) return false;
  if (mo.step && (mo.step.seated || TRAVEL.has(mo.step.play))) return false;   // not while sitting down, seated, or getting up
  fade(r, clip, { loop: false, fadeT: .25 });
  mo.react = { t: 0, len: DATA[clip].dur };
  return true;
}
export const motionStations = S;
