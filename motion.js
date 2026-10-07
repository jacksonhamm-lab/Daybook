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
  bells: spot(1.8, -1.2, -.55, .58),         // dumbbell cradle
  bottle: spot(-1.3, .3, 2.53, .61),         // water bottle on a crate, front left: he turns three-quarters to the camera
  blanket: { x: -.02, z: -.05, yaw: .8 },    // sitting on the plaid, the fire off to his right
  fire: { x: .3, z: -1.2, yaw: Math.atan2(.95 - .3, -1.05 + 1.2) },    // kneeling at the fire's left, three-quarters to the camera
  mug: { x: .95, z: -.15, yaw: .5 },         // the cocoa stump is in front of him, so he faces the camera
  wood: { x: 1.2, z: -1.5, yaw: 1.88 },      // side-on to the woodpile
  feed: { x: 1, z: -1.75, yaw: -.1 },        // behind the fire, facing the camera over it (set by stage())
  sit: { x: -.15, z: .3, yaw: .7 },          // sitting on the blanket
  bed: { x: .26, z: .7, yaw: .35 },          // where he stands to lie back down (set by stage())
  till: { x: 1.35, z: -.3, yaw: Math.PI / 2 },   // stands at the desk side-on to the camera; sits back onto the stool
  shoes: { x: .15, z: -1.4, yaw: Math.PI },      // the stack of shoe boxes on the floor
  bench: { x: .95, z: -1.25, yaw: Math.PI * .82 }, // the low display bench
};
/* ---------- not walking through things ----------
   Every prop has a footprint (a box or a circle, world metres; boxes rotate like three's rotation.y).
   A walk plans a path over the corners of the footprints, grown by his body's radius, so he steps round
   the stool instead of through it. Footprints that contain his start or the spot he's walking to are
   ignored (he's meant to be right up against those: the desk he writes at, the cradle he lifts from). */
const BODY = .2;
const box_ = (x, z, hw, hd, yaw = 0) => ({ x, z, hw, hd, yaw });
const disc = (x, z, r) => ({ x, z, r });
const OBST = {   // fixed props (rider.js buildSettings)
  work: [box_(-1.25, -1.55, .9, .16, .25), box_(-2.3, -.2, .46, .16, .9)],          // rail, mirror
  gym: [disc(.8, .5, .15)],                                                           // kettlebell
  sleep: [disc(.95, -1.05, .38), box_(-1.5, -2.6, .85, .7, .32), disc(-1.04, -.52, .1)],    // fire, tent, lantern
};
const STAGED = {};   // laid out by stage() for the current model
function poly(o, grow) {   // the footprint as a convex polygon, grown by `grow`
  if (o.r != null) { const R = (o.r + grow) / Math.cos(Math.PI / 8); return Array.from({ length: 8 }, (_, k) => { const a = k * Math.PI / 4 + Math.PI / 8; return [o.x + Math.cos(a) * R, o.z + Math.sin(a) * R]; }); }
  const c = Math.cos(o.yaw), s = Math.sin(o.yaw), hw = o.hw + grow, hd = o.hd + grow;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => [o.x + x * c + z * s, o.z - x * s + z * c]);
}
const inside = (P, p) => { let sign = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (Math.abs(cr) < 1e-9) continue; if (!sign) sign = Math.sign(cr); else if (Math.sign(cr) !== sign) return false; } return true; };
const cross = (a, b, c, d) => { const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
function clear(a, b, polys) {
  for (const P of polys) {
    if (inside(P, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])) return false;
    for (let i = 0; i < P.length; i++) if (cross(a, b, P[i], P[(i + 1) % P.length])) return false;
  }
  return true;
}
function plan(kind, from, to) {
  const a = [from.x, from.z], b = [to.x, to.z];
  // grow each footprint by his body radius, less if he's already standing closer than that (so he can still
  // step out of it); a footprint that holds his start or goal even at its true size is the thing he's at: skip it
  const polys = [...(OBST[kind] || []), ...(STAGED[kind] || [])].map(o => { for (const g of [BODY, .14, .08, .03]) { const P = poly(o, g); if (!inside(P, a) && !inside(P, b)) return P; } return null; }).filter(Boolean);
  if (clear(a, b, polys)) return [to];
  // shortest path over the (slightly pushed-out) corners: a tiny visibility graph
  const nodes = [a, b, ...polys.flatMap(P => { const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cz = P.reduce((s, p) => s + p[1], 0) / P.length; return P.map(p => [cx + (p[0] - cx) * 1.04, cz + (p[1] - cz) * 1.04]); })]
    .filter((p, i) => i < 2 || !polys.some(P => inside(P, p)));
  const n = nodes.length, dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false); dist[0] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break; done[u] = true; if (u === 1) break;
    for (let v = 0; v < n; v++) { if (done[v] || v === u) continue; const d = dist[u] + Math.hypot(nodes[v][0] - nodes[u][0], nodes[v][1] - nodes[u][1]); if (d < dist[v] && clear(nodes[u], nodes[v], polys)) { dist[v] = d; prev[v] = u; } }
  }
  if (prev[1] < 0) return [to];   // boxed in: walk straight (better than standing still)
  const path = []; for (let v = 1; v !== 0; v = prev[v]) path.unshift(v === 1 ? to : { x: nodes[v][0], z: nodes[v][1] });
  return path;
}
// clips that move him (sitting back onto a stool, getting up): their travel is kept, then handed to his position
const TRAVEL = new Set(['sitting', 'stand_up2', 'stand_up', 'standing_up']);   // (played backwards too: lying and sitting back down)

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
    { go: 'till' }, { face: 'till' }, { play: 'sitting' }, { play: 'writing', n: 3, seated: true }, { play: 'writing', cut: 1.6 }, { play: 'stand_up2' },
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
    { play: 'start_jumping_jacks' }, { play: 'jumping_jacks', n: 6 }, { play: 'stop_jumping_jacks' }, { play: 'wiping_sweat' },
    { go: 'bottle' }, { face: 'bottle' }, { play: 'picking_up~m', from: 1, cut: 3.2, fx: 'bottle+' }, { play: 'drinking' }, { play: 'putting_down~m', from: 3.8, cut: 3.4, fx: 'bottle-' },
    { go: 'home' }, { face: 'home' }, { idle: 2 },
    { play: 'idle_to_push_up' }, { play: 'push_up', n: 4 }, { play: 'push_up_to_idle' }, { play: 'being_cocky' },
  ],
  sleep: [   // up at camp (asleep is procedural; WAKE and BED get him up and back down): a log on the fire, warm up, cocoa, sit
    { go: 'wood' }, { face: 'wood' }, { play: 'lifting', cut: 4.4, fx: 'log+' },
    { go: 'feed' }, { face: 'feed' }, { play: 'putting_down', from: 3.8, cut: 3.4, fx: 'log-' },
    { go: 'fire' }, { face: 'fire' }, { play: 'kneel', cut: 9, fade: .7 },
    { go: 'mug' }, { face: 'mug' }, { play: 'picking_up~m', from: 1, cut: 3.2, fx: 'mug+' }, { play: 'drinking' }, { play: 'putting_down~m', from: 3.8, cut: 3.4, fx: 'mug-' },   // left hand: drinking is left-handed
    { go: 'sit' }, { face: 'sit' }, { play: 'standing_up', rate: -1, still: true }, { play: 'sitting_idle', n: 3, still: true, sitting: true }, { play: 'standing_up', still: true },
  ],
};
// getting up out of bed when he's woken, and lying back down when it's bedtime (stand_up played backwards)
const WAKE = [{ play: 'stand_up', still: true }];
const BED = [{ go: 'bed' }, { face: 'bed' }, { play: 'stand_up', rate: -1, still: true, bed: true }];
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
  if (fx === 'log+') { if (r.log) r.log.visible = true; if (world.pileTop) world.pileTop.visible = false; }
  if (fx === 'log-') { if (r.log) r.log.visible = false; if (world.fireLog) world.fireLog.visible = true; }
  if (fx === 'log-reset') { if (r.log) r.log.visible = false; if (world.pileTop) world.pileTop.visible = true; if (world.fireLog) world.fireLog.visible = false; }
  if (r.mo) { if (/^(log|mug)\+$/.test(fx)) r.mo.holding = true; if (/^(log|mug)-$/.test(fx)) r.mo.holding = false; }
  if (fx === 'bottle+' || fx === 'bottle-') { if (r.bottle) r.bottle.visible = fx === 'bottle+'; if (world.gymBottle) world.gymBottle.visible = fx === 'bottle-'; }
  if (fx === 'mug+' || fx === 'mug-') { if (r.mug) r.mug.visible = fx === 'mug+'; if (world.campMug) world.campMug.visible = fx === 'mug-'; }
  if (fx === 'box+') { if (r.carry) r.carry.visible = true; if (world.stackTop) world.stackTop.visible = false; }
  if (fx === 'box-') { if (r.carry) r.carry.visible = false; if (world.benchBox) world.benchBox.visible = true; }
  if (fx === 'box-reset') { if (r.carry) r.carry.visible = false; if (world.stackTop) world.stackTop.visible = true; if (world.benchBox) world.benchBox.visible = false; }
}
// The clips' hands are open. Whatever is showing in a hand (r.held, from rider.js), its fingers close round it,
// eased in and out. The clip's own finger pose is put back before each mixer update (the mixer only rewrites a
// bone whose value changed, so an override would otherwise stick).
const FINGERS = ['Index', 'Middle', 'Ring', 'Little'], JOINTS = ['Proximal', 'Intermediate', 'Distal'];
function gripBones(r) {
  if (r.mo.fingers) return r.mo.fingers;
  const F = { left: [], right: [] };
  for (const side of ['left', 'right']) {
    const k = side === 'left' ? -1 : 1;
    FINGERS.forEach(f => JOINTS.forEach((j, n) => { const bn = r.B(side + f + j); if (bn) F[side].push({ bn, axis: 'z', k, n, base: new THREE.Quaternion() }); }));
    const t = r.B(side + 'ThumbProximal'), t2 = r.B(side + 'ThumbDistal');
    if (t) F[side].push({ bn: t, axis: 'y', k, thumb: -.45, base: new THREE.Quaternion() }); if (t2) F[side].push({ bn: t2, axis: 'z', k, thumb: .55, base: new THREE.Quaternion() });
  }
  return r.mo.fingers = F;
}
function gripRestore(r) { const mo = r.mo; if (!mo.gripOn) return; const F = gripBones(r); for (const side of ['left', 'right']) if (mo.gripOn[side]) for (const f of F[side]) f.bn.quaternion.copy(f.base); }
function gripApply(r, dt) {
  const mo = r.mo, F = gripBones(r); mo.gripW = mo.gripW || { left: 0, right: 0 }; mo.gripOn = mo.gripOn || {}; mo.gripCurl = mo.gripCurl || {};
  for (const side of ['left', 'right']) {
    const h = (r.held || []).find(x => x.side === side && x.obj.visible);
    if (h) mo.gripCurl[side] = h.curl;
    const w = mo.gripW[side] = damp(mo.gripW[side], h ? 1 : 0, 16, dt), c = mo.gripCurl[side];
    mo.gripOn[side] = w > .003 && !!c; if (!mo.gripOn[side]) continue;
    for (const f of F[side]) {
      f.base.copy(f.bn.quaternion);
      _e.set(0, 0, 0); _e[f.axis] = f.k * (f.thumb != null ? f.thumb : c[f.n]);
      f.bn.quaternion.slerp(_q.setFromEuler(_e), w);
    }
  }
}
// Lay the scene out around his reach: the dumbbells rest on a low cradle exactly where his hands land
// in picking_up (both sides), and the cocoa on a stump where his right hand lands. Redone per model.
function stage(r, kind, world) {
  const at = (spotName, local) => { const s = S[spotName], c = Math.cos(s.yaw), n = Math.sin(s.yaw); return new THREE.Vector3(s.x + local.x * c + local.z * n, local.y, s.z - local.x * n + local.z * c); };
  if (kind === 'gym' && world.gym && world.makeDumbbell && world.stagedFor !== r) {
    build(r, 'picking_up'); build(r, 'picking_up~m');
    const R = r.mo.contact.picking_up, L = r.mo.contact['picking_up~m']; if (!R || !L) return;
    if (world.cradle) world.restBells.forEach(b => world.gym.remove(b));
    const pr = at('bells', R.pos), pl = at('bells', L.pos), top = Math.max(.06, Math.min(pr.y, pl.y) - .07), yaw = S.bells.yaw;
    const cradle = world.cradle = new THREE.Group(); cradle.position.set((pr.x + pl.x) / 2, 0, (pr.z + pl.z) / 2); cradle.rotation.y = yaw; world.gym.add(cradle);
    const w = pr.distanceTo(pl) + .34, mat = world.toon(0x9a7048);   // light oak, so the dark dumbbells read on it
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, .04, .26), mat); slab.position.y = top - .02; cradle.add(slab);
    [-1, 1].forEach(k => { const leg = new THREE.Mesh(new THREE.BoxGeometry(.05, top - .04, .22), mat); leg.position.set(k * (w / 2 - .06), (top - .04) / 2, 0); cradle.add(leg); });
    STAGED.gym = [box_(cradle.position.x, cradle.position.z, w / 2, .13, yaw)];
    world.restBells = [pl, pr].map(p => { const b = world.makeDumbbell(); b.visible = true; b.position.set(p.x, top + .05, p.z); b.rotation.y = yaw; world.gym.add(b); return b; });
    (world.gymProps || []).forEach(o => world.gym.remove(o)); const mk = world.gymProps = [cradle, world.blob(world.gym, cradle.position.x, cradle.position.z, w + .2, .45, -yaw, .3)];
    // the water bottle stands on a wooden crate where his left hand closes on it (he drinks left-handed)
    const bp = at('bottle', L.pos), cTop = Math.max(.1, bp.y - .1), crate = new THREE.Group(); crate.position.set(bp.x, 0, bp.z); crate.rotation.y = S.bottle.yaw; world.gym.add(crate); mk.push(crate);
    world.box(crate, .36, cTop, .28, 0xa8794a, 0, cTop / 2, 0); [-.1, .1].forEach(y => world.box(crate, .365, .012, .285, 0x7a5434, 0, cTop / 2 + y * cTop, 0));
    if (!world.gymBottle) { world.gymBottle = world.makeBottle(false); world.gym.add(world.gymBottle); }
    world.gymBottle.position.set(bp.x, cTop, bp.z); mk.push(world.blob(world.gym, bp.x, bp.z, .5, .42, -S.bottle.yaw, .3));
    STAGED.gym.push(box_(bp.x, bp.z, .18, .14, S.bottle.yaw));
    // his mat, under his hands and feet in a push-up
    build(r, 'push_up');
    if (r.mo.clips.push_up) {
      const pts = sample(r, r.mo.clips.push_up, 0, ['leftHand', 'rightHand', 'leftFoot', 'rightFoot']).map(p => at('home', p));
      const z0 = Math.min(...pts.map(p => p.z)) - .22, z1 = Math.max(...pts.map(p => p.z)) + .22, x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x));
      mk.push(world.box(world.gym, Math.max(.62, x1 - x0 + .2), .008, z1 - z0, 0x6f8f7a, (x0 + x1) / 2, .004, (z0 + z1) / 2));
    }
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
    // He stands just clear of the desk's front edge. Seated, his hands only reach ~0.3m ahead of his hips,
    // so for writing he scoots in (mo.shift, eased) and back out before standing up, like pulling a chair in.
    // The stool sits halfway between his landing spot and the scooted-in spot so he's on it throughout.
    const handZ = (lh.z + rh.z) / 2, edge = .06, need = edge + .1 - handZ, shift = Math.max(0, need - T.z);
    world.deskShift = shift;
    const seat = at('till', { x: T.x, y: 0, z: T.z + shift / 2 - .04 }), seatTop = Math.max(.35, hips.y - .12);
    const stool = keep(new THREE.Group()); stool.position.set(seat.x, 0, seat.z); stool.rotation.y = rot; shop.add(stool);
    world.cyl(stool, .17, .05, 0x6b4630, 0, seatTop - .025, 0, [0, 0, 0], 20);
    [0, 1, 2, 3].forEach(k => { const a = k * Math.PI / 2 + Math.PI / 4; world.cyl(stool, .016, seatTop - .05, 0x2a1d14, Math.cos(a) * .115, (seatTop - .05) / 2, Math.sin(a) * .115); });
    keep(world.blob(shop, seat.x, seat.z, .5, .5, 0, .3));
    const topY = Math.max(.62, Math.min(lh.y, rh.y) - .03);
    const deskC = at('till', { x: T.x + (lh.x + rh.x) / 2, y: 0, z: edge + .31 }), desk = keep(new THREE.Group());
    desk.position.set(deskC.x, 0, deskC.z); desk.rotation.y = rot; shop.add(desk);
    world.box(desk, 1.25, .05, .62, 0x5b3a26, 0, topY - .025, 0);                       // walnut top
    [[-.56, -.25], [.56, -.25], [-.56, .25], [.56, .25]].forEach(([x, z]) => world.box(desk, .05, topY - .05, .05, 0x3a2618, x, (topY - .05) / 2, z));
    world.box(desk, .42, .012, .3, 0xf1e6cf, 0, topY + .006, -.17, .05);                 // the open ledger, under his hands
    world.box(desk, .006, .014, .3, 0x8a6a48, 0, topY + .008, -.17, .05);                 // its spine
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
      const out = (c, k) => { const l = Math.hypot(c.pos.x, c.pos.z) || 1; return { x: c.pos.x + c.pos.x / l * k, y: c.pos.y, z: c.pos.z + c.pos.z / l * k }; };   // pushed away from him
      const sp = at('shoes', out(L, .11)), bp = at('bench', out(P, .15)), boxH = .12;
      const n = Math.max(1, Math.round((L.pos.y - .06) / boxH));
      for (let k = 0; k < n; k++) { const b = keep(world.makeShoeBox(true)); b.position.set(sp.x, boxH / 2 + k * boxH, sp.z); b.rotation.y = S.shoes.yaw + (k % 2) * .08; shop.add(b); if (k === n - 1) world.stackTop = b; }
      keep(world.blob(shop, sp.x, sp.z, .5, .4, -S.shoes.yaw, .3));
      const bench = keep(new THREE.Group()), bTop = Math.max(.12, P.pos.y - .07); bench.position.set(bp.x, 0, bp.z); bench.rotation.y = S.bench.yaw; shop.add(bench);
      world.box(bench, .9, .05, .36, 0x6b4630, 0, bTop - .025, 0); [-.38, .38].forEach(x => world.box(bench, .05, bTop - .05, .32, 0x3a2618, x, (bTop - .05) / 2, 0));
      world.benchBox = keep(world.makeShoeBox(false)); world.benchBox.position.set(bp.x, bTop + .06, bp.z); world.benchBox.rotation.y = S.bench.yaw; shop.add(world.benchBox);
      keep(world.blob(shop, bp.x, bp.z, 1.1, .5, -S.bench.yaw, .3));
    }
    STAGED.work = [box_(deskC.x, deskC.z, .63, .31, rot), disc(seat.x, seat.z, .18)];
    if (L && P) { const sp = world.stackTop ? world.stackTop.position : at('shoes', L.pos), bp = world.benchBox ? world.benchBox.position : at('bench', P.pos); STAGED.work.push(disc(sp.x, sp.z, .2), box_(bp.x, bp.z, .45, .18, S.bench.yaw)); }
    world.workProps = mk; world.stagedFor = r;
  }
  if (kind === 'sleep' && world.camp && world.campMug && world.stagedFor !== r) {
    build(r, 'picking_up~m'); const L = r.mo.contact['picking_up~m']; if (!L) return;
    const p = at('mug', L.pos), top = Math.max(.08, p.y - .06);
    if (!world.stump) { world.stump = new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, 1, 12), world.toon(0x6b4a2f)); world.camp.add(world.stump); }
    world.stump.scale.y = top; world.stump.position.set(p.x, top / 2, p.z); STAGED.sleep = [disc(p.x, p.z, .16)];
    const mp = world.campMug.parent.worldToLocal(new THREE.Vector3(p.x, top, p.z)); world.campMug.position.copy(mp);
    world.mugTop.set(p.x, top + .11, p.z);   // the steam follows the cup
    const camp = world.camp; (world.campProps || []).forEach(o => camp.remove(o)); const mk = world.campProps = [];
    // the woodpile: a little pyramid of logs whose top log is right under his hand in lifting
    build(r, 'lifting'); build(r, 'putting_down'); build(r, 'stand_up');
    const Lf = r.mo.contact.lifting, Pd = r.mo.contact.putting_down;
    if (Lf && world.makeLog) {
      const wp = at('wood', { x: Lf.pos.x, y: 0, z: Lf.pos.z + .06 }), topY = Math.max(.055, Lf.pos.y - .03), rows = Math.max(3, Math.round((topY - .055) / .1) + 1);
      const pile = new THREE.Group(); pile.position.set(wp.x, 0, wp.z); pile.rotation.y = S.wood.yaw; camp.add(pile); mk.push(pile);
      for (let k = 0; k < rows; k++) for (let j = 0; j < rows - k + (k === rows - 1 ? 0 : 1); j++) {
        const n = rows - k + (k === rows - 1 ? 0 : 1), lg = world.makeLog(false, .46, .055); lg.rotation.set((Math.random() - .5) * 2, (Math.random() - .5) * .2, 0);   // logs run across in front of him (cut ends to the camera), a little uneven
        lg.position.set(k === rows - 1 ? 0 : (Math.random() - .5) * .06, .055 + k * (topY - .055) / Math.max(1, rows - 1), (j - (n - 1) / 2) * .112); pile.add(lg);
        if (k === rows - 1) world.pileTop = lg;
      }
      mk.push(world.blob(camp, wp.x, wp.z, .7, .6, -S.wood.yaw, .35));
      STAGED.sleep.push(box_(wp.x, wp.z, .26, .28, S.wood.yaw));
    }
    // feeding the fire: he stands behind it so the hand he puts the log down with lands on its near edge
    if (Pd && world.makeLog) {
      const y = S.feed.yaw, n = Math.sin(y), c = Math.cos(y), f = world.fire.position, k = .2;
      S.feed.x = f.x - n * k - (Pd.pos.x * c + Pd.pos.z * n); S.feed.z = f.z - c * k - (-Pd.pos.x * n + Pd.pos.z * c);
      if (!world.fireLog) { world.fireLog = world.makeLog(false, .44, .05); camp.add(world.fireLog); }
      const lp = at('feed', Pd.pos); world.fireLog.position.set(lp.x, .07, lp.z); world.fireLog.rotation.set(0, y, .25);
    }
    // lying back down: stand where getting up leaves him
    const T = r.mo.travel.stand_up, Y = world.sleepYaw ?? .35;
    if (T) { S.bed.yaw = Y; S.bed.x = T.x * Math.cos(Y) + T.z * Math.sin(Y); S.bed.z = -T.x * Math.sin(Y) + T.z * Math.cos(Y); }
    world.stagedFor = r;
  }
}

function startStep(r, kind, world) {
  const mo = r.mo, list = ROUTINES[kind];
  if (kind === 'sleep' && r.bedtime && !mo.toBed && !mo.holding) { mo.toBed = true; mo.queue = (mo.ground ? [{ play: 'standing_up', still: true }] : []).concat(BED); }
  let next;
  if (mo.queue && mo.queue.length) next = mo.queue.shift();
  else { mo.i = (mo.i + 1) % list.length; next = list[mo.i]; }
  const s = mo.step = { ...next, t: 0, left: 0 };
  if (s.go) { s.path = plan(kind, mo.pos, S[s.go]); s.k = 0; fade(r, WALK, { rate: WALK_RATE, fadeT: .35 }); }
  else if (s.face || s.idle != null) { fade(r, s.clip || IDLE[kind], { fadeT: .45 }); if (s.fx) props(r, s.fx, world); }
  else if (s.play) {
    const d = DATA[s.play.replace(/~m$/, '')];
    if (!d) { s.left = 0; return; }
    const back = (s.rate || 1) < 0; build(r, s.play); const tr = mo.travel[s.play];
    if (back && tr) { const c = Math.cos(mo.yaw), n = Math.sin(mo.yaw); mo.pos.x -= tr.x * c + tr.z * n; mo.pos.z -= -tr.x * n + tr.z * c; mo.cutNext = true; }
    fade(r, s.play, { loop: true, fadeT: s.fade || .35, from: back ? d.dur - .02 : s.from || 0, rate: s.rate || 1 });
    s.left = s.cut || (back ? d.dur - .06 : d.dur * (s.n || 1));
    const c = r.mo.contact[s.play]; s.fxAt = s.fx ? (c ? Math.max(0, c.t - (s.from || 0)) : 0) : null;
  }
}

// One frame of the routine. Returns the expression weights for the face.
export function direct(r, kind, dt, world, look) {
  const mo = r.mo;
  r.vrm.scene.rotation.order = 'XYZ'; r.vrm.scene.rotation.set(0, mo.yaw, 0);   // upright before stage() measures any clip (he may have been lying asleep)
  if (r.mo.kind !== kind) {   // a new look (or a fresh model): start the script from home
    mo.kind = kind; mo.i = -1; mo.step = null; mo.pos = { x: 0, z: 0 }; mo.yaw = 0;
    stage(r, kind, world); props(r, 'bells-', world); props(r, 'mug-', world); props(r, 'bottle-', world); props(r, 'log-reset', world);
    if (kind === 'sleep') { mo.pos = { x: S.blanket.x, z: S.blanket.z }; }
  }
  if (!ROUTINES[kind]) return {};
  if (kind === 'sleep' && !r.bedtime && mo.toBed) { mo.toBed = false; mo.queue = mo.inBed ? [...WAKE] : []; mo.inBed = false; }
  if (kind === 'sleep' && r.bedtime && mo.step && mo.step.sitting && mo.step.t < mo.step.left - .5) mo.step.left = mo.step.t + .5;
  r.vrm.scene.rotation.order = 'XYZ'; r.vrm.scene.rotation.set(0, mo.yaw, 0);   // upright before any clip is measured (he may have been lying down)
  if (r.clipMode === false) {
    mo.mixer.stopAllAction(); mo.mixer.uncacheRoot(r.vrm.scene); mo.mixer = new THREE.AnimationMixer(r.vrm.scene); mo.cur = null; mo.curName = '';
    if (mo.step) { mo.i--; mo.step = null; } mo.headBase = null;
  }
  if (r.asleep) {   // woken at camp: he gets up out of bed, from where he was lying (hips at the origin)
    r.asleep = false; mo.step = null; mo.i = -1; mo.queue = [...WAKE]; mo.pos = { x: 0, z: 0 }; mo.yaw = world.sleepYaw ?? .35; mo.cutNext = true;
    mo.inBed = mo.toBed = mo.holding = mo.ground = false; props(r, 'log-reset', world); props(r, 'mug-', world);
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
      const last = !s.path || s.k >= s.path.length - 1, to = s.path ? s.path[s.k] : S[s.go], dx = to.x - mo.pos.x, dz = to.z - mo.pos.z, dist = Math.hypot(dx, dz);
      const w = mo.cur ? mo.cur.getEffectiveWeight() : 1, v = (mo.speed[WALK] || 1.3) * WALK_RATE * w;
      if (!last && dist < .14) s.k++;   // round a corner without stopping
      else if (dist < .06 || s.t > 16) { mo.pos.x = to.x; mo.pos.z = to.z; mo.step = null; }
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
        if (tr && (s.rate || 1) > 0) { const c = Math.cos(mo.yaw), n = Math.sin(mo.yaw); mo.pos.x += tr.x * c + tr.z * n; mo.pos.z += -tr.x * n + tr.z * c; mo.cutNext = true; }   // he has moved (onto the stool, or back up)
        if (s.play === 'standing_up') mo.ground = (s.rate || 1) < 0;   // sat down on the blanket / got back up
        if (s.bed) mo.inBed = true;   // lying down: rider.js takes over with the sleeping pose
        mo.step = null;
      }
    }
  }
  // he glances toward a finger or the cursor on top of whatever he's doing; the clip's own head
  // pose is put back first (the mixer won't rewrite a value that hasn't changed)
  const head = r.B('head');
  if (head && mo.headBase) head.quaternion.copy(mo.headBase);
  gripRestore(r);
  mo.mixer.update(dt);
  gripApply(r, dt);
  if (head) { mo.headBase = (mo.headBase || new THREE.Quaternion()).copy(head.quaternion); if (look) { _e.set(-look.y * .12, look.x * .3, 0); head.quaternion.multiply(_q.setFromEuler(_e)); } }
  const scene = r.vrm.scene;
  const want = mo.step && mo.step.seated && !mo.react ? (world.deskShift || 0) : 0; mo.shift = damp(mo.shift || 0, want, 2.2, dt);   // scoot in / out
  scene.rotation.order = 'XYZ'; scene.rotation.set(0, mo.yaw, 0); scene.position.x = mo.pos.x + Math.sin(mo.yaw) * mo.shift; scene.position.z = mo.pos.z + Math.cos(mo.yaw) * mo.shift;
  // the floor offset blends with the clips: settles into a kneel instead of dropping
  const fl = mo.floor[mo.curName] ?? 0; mo.y = damp(mo.y, fl, 8, dt); scene.position.y = mo.y;
  return { happy: HAPPY.has(mo.curName) ? .8 : 0, relaxed: mo.curName === 'kneel' || mo.curName === 'sitting_idle' ? .5 : 0 };
}

// A tap reaction (or a celebration) on top of the routine.
export function react(r, name, world) {
  const mo = r.mo; if (!mo) return false;
  const clip = REACT[name] || name; if (!DATA[clip]) return false;
  if (mo.step && (mo.step.seated || mo.step.still || mo.step.play === 'writing' || TRAVEL.has(mo.step.play))) return false;   // not while sitting down, seated, or getting up
  fade(r, clip, { loop: false, fadeT: .25 });
  mo.react = { t: 0, len: DATA[clip].dur };
  return true;
}
export const motionStations = S;
