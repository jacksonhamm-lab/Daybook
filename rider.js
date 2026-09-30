/* Dex v6: Jackson's own VRoid model on the Today stage.
   - Most of the day he skis downhill in his real kit (clothes from dress.js, hard gear from
     gear.js): steady carved turns, snow spraying off the tails, tracks behind him, pines
     and falling snow streaming past. Tuck runs on training days, a 360 when the list is clear.
   - On the clock he's in his Work outfit, standing easy. From 11pm to 6am he's in his Sleep
     outfit, sitting in the snow hugging his knees.
   - Tap him to hop (or wave) and hear something useful; double-tap for a 360; drag sideways
     to swing the camera round.
   Keeps the window.Buddy API (mount, update, say, play) so index.html doesn't care which Dex
   is loaded. If the models can't load, the old code-built Dex in buddy.js takes over.
   The .vrm files are private: served by the Worker from KV, never committed (public repo). */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from './vendor/jsm/utils/BufferGeometryUtils.js';
import { VRMLoaderPlugin, VRMUtils } from './vendor/three-vrm.module.min.js';
import { dress, toon } from './dress.js';
import { gear, fists } from './gear.js';
import { physique } from './physique.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = 1;   // bump to make phones fetch new model files
const MODELS = { ski: `models/ski.vrm?v=${V}`, work: `models/work.vrm?v=${V}`, sleep: `models/sleep.vrm?v=${V}`, gym: `models/gym.vrm?v=${V}` };
const SPEED = REDUCED ? 0 : 7.5;   // metres a second down the hill
const TURN = 1.05;                 // carving rhythm, radians a second (one left+right every ~6s)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const bump = (p, at, w) => { const d = Math.atan2(Math.sin(p - at), Math.cos(p - at)); return Math.exp(-d * d / w); };

let renderer, scene, camera, wrap, cv, sayEl, zEl, raf = 0, last = 0, inView = true, ok = true, failed = false;
let rider = null, loading = null, pointScale = 800;
const state = {
  mode: 'idle', act: null, actT: 0, next: 8, ctx: {}, lineI: 0, sayUntil: 0,
  phase: 0, x: 0, tuck: 0, tuckT: 0, orbit: 0, drag: null, taps: [],
  look: { x: 0, y: 0 }, lookT: { x: 0, y: 0 }, pointerAt: 0, blink: 0, blinkAt: 2, wokeAt: 0,
};
const world = {};

/* ---------- the hill ---------- */
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
function buildScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  cv = renderer.domElement;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, .1, 90);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2f48, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1.5, 3, 2.5); scene.add(key);

  // groomed snow with faint old tracks; it scrolls away under him, and fades out at the edges
  const snow = canvasTex(512, 512, (x, W, H) => {
    x.fillStyle = '#e6edf8'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${150 + Math.random() * 40 | 0},${170 + Math.random() * 40 | 0},${215 + Math.random() * 30 | 0},${.12 + Math.random() * .18})`; x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    for (let i = 0; i < 12; i++) { let px = Math.random() * W; x.strokeStyle = `rgba(140,160,205,${.1 + Math.random() * .12})`; x.lineWidth = 2 + Math.random() * 3; x.beginPath(); x.moveTo(px, 0); for (let y = 0; y <= H; y += 32) { px += (Math.random() - .5) * 6; x.lineTo(px, y); } x.stroke(); }
  });
  snow.wrapS = snow.wrapT = THREE.RepeatWrapping; snow.repeat.set(5, 5); snow.anisotropy = 8;
  const fade = canvasTex(256, 256, (x, W, H) => { const g = x.createRadialGradient(W / 2, H * .56, 0, W / 2, H * .56, W / 2); g.addColorStop(0, '#fff'); g.addColorStop(.3, '#ddd'); g.addColorStop(.75, '#333'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshLambertMaterial({ color: 0x9aabc8, map: snow, alphaMap: fade, transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.003, -3); ground.renderOrder = -1; scene.add(ground);
  world.snow = snow;

  // pines streaming past on both sides
  const pine = (() => {
    const tiers = [[.95, 1.1, .5], [.75, .95, 1.05], [.52, .8, 1.6]];
    const g = tiers.map(([r, h, y]) => new THREE.ConeGeometry(r, h, 9).translate(0, y + h / 2, 0));
    const c = tiers.map(([r, h, y]) => new THREE.ConeGeometry(r * .56, h * .42, 9).translate(0, y + h * .79 + .012, 0));
    const trunk = new THREE.CylinderGeometry(.09, .12, .6, 6).translate(0, .3, 0);
    return mergeGeometries([trunk, mergeGeometries(g), mergeGeometries(c)], true);
  })();
  world.trees = Array.from({ length: 16 }, (_, i) => {
    const mats = [toon(0x3b2c22), toon(0x1f4a3e), toon(0xeef3fb)]; mats.forEach(m => { m.transparent = true; m.side = THREE.FrontSide; });
    const m = new THREE.Mesh(pine, mats); scene.add(m);
    const t = { m, mats }; placeTree(t, -34 + i * 2.6); return t;
  });

  // particles: falling snow, and spray thrown off the skis
  const pointsMat = color => new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, scale: { value: pointScale } }, transparent: true, depthWrite: false,
    vertexShader: 'attribute float size; attribute float alpha; varying float vA; uniform float scale; void main(){ vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 color; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .12, d) * vA; if (a < .01) discard; gl_FragColor = vec4(color, a); }',
  });
  const pool = (n, color) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(n), 1)); g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(n), 1)); const p = new THREE.Points(g, pointsMat(color)); p.frustumCulled = false; scene.add(p); return { p, g, n, v: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), next: 0 }; };
  world.flakes = pool(220, 0xf4f8ff);
  { const f = world.flakes, P = f.g.attributes.position.array; for (let i = 0; i < f.n; i++) { P[i * 3] = (Math.random() - .5) * 11; P[i * 3 + 1] = Math.random() * 5; P[i * 3 + 2] = -14 + Math.random() * 20; f.g.attributes.size.array[i] = .02 + Math.random() * .03; f.g.attributes.alpha.array[i] = .5 + Math.random() * .4; } }
  world.spray = pool(320, 0xf7faff);

  // ski tracks: two fading ribbons laid behind the skis
  world.tracks = ['l', 'r'].map(() => {
    const N = 80, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3)); g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(N * 2), 1));
    const idx = []; for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { color: { value: new THREE.Color(0x8ea4cc) } },
      vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec3 color; varying float vA; void main(){ gl_FragColor = vec4(color, vA); }' }));
    m.frustumCulled = false; m.renderOrder = 0; scene.add(m);
    return { m, g, N, pts: [] };
  });
}
function placeTree(t, z) {
  const side = Math.random() < .5 ? -1 : 1;
  t.x = side < 0 ? -(2.4 + Math.random() * 6) : 4.6 + Math.random() * 5; t.z = z;
  const s = .8 + Math.random() * .9; t.m.scale.set(s, s * (.9 + Math.random() * .35), s); t.m.rotation.y = Math.random() * 6;
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
function stepWorld(dt, skiing) {
  const sp = skiing ? SPEED * (1 + .25 * state.tuck) : 0, d = sp * dt;
  world.snow.offset.y -= d / 5.2;
  world.trees.forEach(t => {
    t.z -= d; if (t.z < -36) placeTree(t, 8 + Math.random() * 3);
    t.m.position.set(t.x, 0, t.z);
    const o = smooth(-36, -24, t.z); t.mats.forEach(m => { m.opacity = o; }); t.m.visible = o > .01;
  });
  { // snowfall drifts down and, while he's moving, streams away up the hill
    const f = world.flakes, P = f.g.attributes.position.array;
    for (let i = 0; i < f.n; i++) {
      P[i * 3 + 1] -= dt * (.5 + (i % 7) * .08); P[i * 3 + 2] -= d * .9; P[i * 3] += Math.sin(i + performance.now() / 900) * dt * .1;
      if (P[i * 3 + 1] < 0 || P[i * 3 + 2] < -14) { P[i * 3] = (Math.random() - .5) * 11; P[i * 3 + 1] = sp ? Math.random() * 5 : 5; P[i * 3 + 2] = sp ? 6 : -14 + Math.random() * 20; }
    }
    f.g.attributes.position.needsUpdate = true;
  }
  { // spray: short-lived puffs that fly out, fall and get left behind
    const f = world.spray, P = f.g.attributes.position.array, S = f.g.attributes.size.array, A = f.g.attributes.alpha.array;
    for (let i = 0; i < f.n; i++) {
      if (f.life[i] <= 0) { A[i] = 0; continue; }
      f.life[i] -= dt; const u = 1 - f.life[i] / f.max[i];
      f.v[i * 3 + 1] -= 6 * dt; [0, 1, 2].forEach(k => { f.v[i * 3 + k] *= Math.exp(-1.8 * dt); P[i * 3 + k] += f.v[i * 3 + k] * dt; });
      P[i * 3 + 2] -= d; if (P[i * 3 + 1] < 0) { P[i * 3 + 1] = 0; f.v[i * 3 + 1] = 0; }
      S[i] = .07 + .34 * Math.sqrt(u); A[i] = .7 * (1 - u) * (1 - u);
    }
    ['position', 'size', 'alpha'].forEach(k => { f.g.attributes[k].needsUpdate = true; });
  }
  world.tracks.forEach(tr => { tr.pts.forEach(p => { p.z -= d; }); });
}
function emitSpray(at, out, n) {
  const f = world.spray;
  for (let k = 0; k < n; k++) {
    const i = f.next; f.next = (f.next + 1) % f.n;
    const P = f.g.attributes.position.array;
    P[i * 3] = at.x + (Math.random() - .5) * .16; P[i * 3 + 1] = .03 + Math.random() * .08; P[i * 3 + 2] = at.z + (Math.random() - .5) * .5;
    f.v[i * 3] = out * (1 + Math.random() * 3.2); f.v[i * 3 + 1] = .8 + Math.random() * 2.4; f.v[i * 3 + 2] = -(1 + Math.random() * 2.5);
    f.max[i] = f.life[i] = .6 + Math.random() * .6;
  }
}
function layTracks(on) {
  rider.tails.forEach((tail, s) => {
    const tr = world.tracks[s]; tail.getWorldPosition(_v);
    const head = { x: _v.x, z: _v.z, on: on && _v.y < .12 };
    if (tr.pts.length < 2 || Math.abs(tr.pts[1].z - head.z) > .22) tr.pts.unshift(head); else tr.pts[0] = head;   // the newest point follows the ski; a new one is laid every 22cm
    if (tr.pts.length > tr.N) tr.pts.length = tr.N;
    while (tr.pts.length && tr.pts[tr.pts.length - 1].z < -22) tr.pts.pop();
    const P = tr.g.attributes.position.array, A = tr.g.attributes.alpha.array;
    for (let i = 0; i < tr.N; i++) {
      const p = tr.pts[Math.min(i, tr.pts.length - 1)] || head, a = i < tr.pts.length && p.on ? .42 * (1 - i / tr.N) * smooth(-22, -12, p.z) : 0;
      P[i * 6] = p.x - .035; P[i * 6 + 1] = .004; P[i * 6 + 2] = p.z; P[i * 6 + 3] = p.x + .035; P[i * 6 + 4] = .004; P[i * 6 + 5] = p.z; A[i * 2] = A[i * 2 + 1] = a;
    }
    tr.g.attributes.position.needsUpdate = true; tr.g.attributes.alpha.needsUpdate = true;
  });
}

/* ---------- models ---------- */
const cache = {};
function load(key) {
  if (cache[key]) return cache[key];
  const loader = new GLTFLoader(); loader.register(p => new VRMLoaderPlugin(p));
  return (cache[key] = loader.loadAsync(MODELS[key]).then(gltf => prepare(key, gltf.userData.vrm)).catch(e => { delete cache[key]; throw e; }));
}
function prepare(key, vrm) {
  vrm.scene.traverse(o => { o.frustumCulled = false; });
  const h = vrm.humanoid, B = n => h.getNormalizedBoneNode(n), R = n => h.getRawBoneNode(n);
  vrm.scene.updateMatrixWorld(true);
  const r = { key, vrm, B, R, footRest: R('leftFoot').getWorldPosition(new THREE.Vector3()).y, hipsRest: B('hips').position.clone(), tails: [] };
  if (key === 'gym') physique(vrm);   // leaner and more defined, Luffy-style
  if (key === 'ski') {
    r.outfit = dress(vrm); r.kit = gear(vrm, r.outfit);
    r.tails = ['l', 'r'].map(s => { const o = new THREE.Object3D(); o.position.set(0, .01, -.8); r.kit.skis[s].add(o); return o; });
  }
  return r;
}
function want() {
  if (state.mode === 'sleep' && state.wokeAt && performance.now() - state.wokeAt < 60000) return 'sleep';
  // night beats work beats training; otherwise he's skiing
  return state.mode === 'sleep' ? 'sleep' : state.mode === 'work' ? 'work' : state.ctx.training ? 'gym' : 'ski';
}
function ensureRider() {
  const k = want();
  if ((rider && rider.key === k) || loading === k || failed) return;
  loading = k;
  load(k).then(r => {
    if (loading !== k) return;
    loading = null;
    const swap = () => {
      if (rider && rider !== r) { scene.remove(rider.vrm.scene); const old = rider; delete cache[old.key]; VRMUtils.deepDispose(old.vrm.scene); }
      rider = r; scene.add(r.vrm.scene); world.tracks.forEach(t => { t.pts = []; });
      cv.style.opacity = 1; wake();
    };
    if (rider) { cv.style.opacity = 0; setTimeout(swap, 280); } else swap();
  }).catch(e => { loading = null; console.warn('Dex model failed to load', e); if (!rider) fallback(); });
}
// the models aren't reachable (offline first run, or not uploaded): hand over to the old code-built Dex
function fallback() {
  failed = true; ok = false;
  const slot = wrap && wrap.parentNode; if (wrap) wrap.remove();
  window.Buddy = undefined;
  import('./buddy.js').then(() => { if (slot && window.Buddy) window.Buddy.mount(slot); }).catch(() => slot && slot.classList.add('no3d'));
}

/* ---------- poses ---------- */
const ACTS = { hop: .9, spin: 1.5, wave: 2.4, flex: 2.6 };
function play(name) { if (REDUCED && name !== 'hop') return; if (!ACTS[name]) name = want() === 'ski' ? 'hop' : want() === 'gym' ? 'flex' : 'wave'; state.act = name; state.actT = 0; }
function autonomous(dt) {
  if (REDUCED || state.act || (want() !== 'ski' && want() !== 'gym')) return;
  state.next -= dt; if (state.next > 0) return;
  state.next = 7 + Math.random() * 6;
  const r = Math.random();
  if (want() === 'gym') { if (r < .5) play('flex'); return; }
  if (state.ctx.allDone && r < .45) play('spin'); else if (r < .25) play('hop');
}
function expr(vrm, v) { const E = vrm.expressionManager; if (!E) return; ['happy', 'blink', 'surprised', 'relaxed'].forEach(n => E.setValue(n, v[n] || 0)); }
function blinkAmount(dt) {
  state.blinkAt -= dt; if (state.blinkAt < 0) { state.blink = 1; state.blinkAt = 2.2 + Math.random() * 3.5; }
  state.blink = Math.max(0, state.blink - dt * 7);
  return state.blink > .5 ? (1 - state.blink) * 2 : state.blink * 2;
}
function skiPose(r, t, dt) {
  const { B } = r, a = state.act, u = a ? clamp(state.actT / ACTS[a], 0, 1) : 0;
  // training days: tuck runs every so often
  state.tuckT += dt; const wantTuck = state.ctx.training && !REDUCED && (state.tuckT % 14) > 9 ? 1 : 0;
  state.tuck = damp(state.tuck, wantTuck, 2.5, dt);
  const tk = state.tuck, amp = 1 - .7 * tk;
  if (!REDUCED) state.phase += dt * TURN * (1 - .4 * tk);
  const p = state.phase, s = Math.sin(p), c = Math.cos(p);
  state.x = .55 * s * amp;
  let air = 0, flexAir = 0, spin = 0;
  if (a === 'hop') { air = .42 * Math.sin(Math.PI * u); flexAir = .45 * Math.sin(Math.PI * u); }
  if (a === 'spin') { air = .62 * Math.sin(Math.PI * u); flexAir = .6 * Math.sin(Math.PI * u); spin = Math.PI * 2 * ease(clamp((u - .08) / .84, 0, 1)); }
  const lean = .42 * s * amp * (1 - smooth(0, .15, air)), yaw = .38 * c * amp;
  r.vrm.scene.rotation.set(0, yaw + spin, lean);
  r.vrm.scene.position.x = state.x;
  // legs: flexed stance, deeper at the apex of each turn, the inside leg bending more
  const f = .85 + .35 * Math.abs(s) * amp + .7 * tk + flexAir, inR = .3 * Math.max(0, s) * amp, inL = .3 * Math.max(0, -s) * amp;
  B('leftUpperLeg').rotation.set(-.55 * (f + inL), 0, .04); B('rightUpperLeg').rotation.set(-.55 * (f + inR), 0, -.04);
  B('leftLowerLeg').rotation.x = .95 * (f + inL); B('rightLowerLeg').rotation.x = .95 * (f + inR);
  B('leftFoot').rotation.x = -.4 * (f + inL); B('rightFoot').rotation.x = -.4 * (f + inR);
  // upper body stays quieter than the skis: counter-rotated and more upright
  B('spine').rotation.set(.18 + .35 * tk, -yaw * .5, -lean * .45);
  B('chest').rotation.set(.04 + .12 * tk, -yaw * .2, -lean * .15);
  B('head').rotation.set(-.1 - .3 * tk, -yaw * .3, -lean * .3);
  // arms: poles ready, the inside hand swinging forward to plant at each turn change
  const plR = REDUCED ? 0 : bump(p, -.35, .18) * amp, plL = REDUCED ? 0 : bump(p, Math.PI - .35, .18) * amp;
  B('leftUpperArm').rotation.set(-.45 - .35 * plL - .55 * tk, 0, -1.2 + .5 * tk); B('rightUpperArm').rotation.set(-.45 - .35 * plR - .55 * tk, 0, 1.2 - .5 * tk);
  B('leftLowerArm').rotation.set(0, -1.1 + .25 * plL - .5 * tk, 0); B('rightLowerArm').rotation.set(0, 1.1 - .25 * plR + .5 * tk, 0);
  B('leftHand').rotation.x = -.3; B('rightHand').rotation.x = -.3;
  if (a === 'spin') { B('leftUpperArm').rotation.z -= .5 * Math.sin(Math.PI * u); B('rightUpperArm').rotation.z += .5 * Math.sin(Math.PI * u); }
  fists(r.vrm);
  expr(r.vrm, { happy: a ? .6 : 0 });
  return { air, lean, s };
}
function standPose(r, t, dt, sleepy, gym) {
  const { B } = r, a = state.act, u = a ? clamp(state.actT / ACTS[a], 0, 1) : 0, br = Math.sin(t * 1.6), sw = Math.sin(t * .5);
  r.vrm.scene.rotation.set(0, state.look.x * .12, 0); r.vrm.scene.position.x = 0;
  B('hips').rotation.z = sw * .025; B('leftUpperLeg').rotation.z = -sw * .025; B('rightUpperLeg').rotation.z = -sw * .025;
  B('spine').rotation.set(.02 * br, 0, -sw * .02); B('chest').rotation.x = .015 * br;
  B('leftUpperArm').rotation.set(-.08, 0, -1.4 - .02 * br); B('rightUpperArm').rotation.set(-.08, 0, 1.4 + .02 * br);
  B('leftLowerArm').rotation.set(0, -.3, 0); B('rightLowerArm').rotation.set(0, .3, 0);
  B('leftHand').rotation.z = -.15; B('rightHand').rotation.z = .15;
  B('head').rotation.set(-state.look.y * .18, state.look.x * .4, sw * .02);
  if (a === 'wave') {
    const W = ease(Math.min(clamp(state.actT / .3, 0, 1), clamp((ACTS.wave - state.actT) / .35, 0, 1)));
    B('rightUpperArm').rotation.set(-.08 * (1 - W), 0, lerp(1.4, -1.1, W)); B('rightLowerArm').rotation.set(0, lerp(.12, 0, W), lerp(0, -.5 + .45 * Math.sin(state.actT * 11), W));
  }
  if (gym) {
    // athletic stance: feet wider, fists, shoulders back
    B('leftUpperLeg').rotation.z = .07 - sw * .02; B('rightUpperLeg').rotation.z = -.07 - sw * .02;
    B('chest').rotation.x = -.04 + .015 * br; fists(r.vrm, .85);
    if (a === 'flex') {
      // double biceps: upper arms out level with the shoulders, forearms up, a grin
      const W = ease(Math.min(clamp(state.actT / .35, 0, 1), clamp((ACTS.flex - state.actT) / .4, 0, 1))), pump = Math.sin(state.actT * 7) * .05;
      B('leftUpperArm').rotation.set(-.15 * W - .08 * (1 - W), 0, lerp(-1.4, -.12, W)); B('rightUpperArm').rotation.set(-.15 * W - .08 * (1 - W), 0, lerp(1.4, .12, W));
      B('leftLowerArm').rotation.set(0, lerp(-.3, -.25, W), lerp(0, 1.95 + pump, W)); B('rightLowerArm').rotation.set(0, lerp(.3, .25, W), lerp(0, -1.95 - pump, W));
      B('head').rotation.y += .35 * W; B('spine').rotation.x -= .05 * W;
    }
  }
  const bl = blinkAmount(dt);
  expr(r.vrm, { blink: sleepy ? Math.max(bl, .35) : bl, happy: a === 'wave' || a === 'flex' ? .8 : state.ctx.allDone ? .35 : 0, relaxed: sleepy ? .4 : 0 });
  return { air: 0 };
}
function sleepPose(r, t) {
  const { B } = r, br = Math.sin(t * 1.1);
  r.vrm.scene.rotation.set(0, -.35, 0); r.vrm.scene.position.x = 0;
  // sitting in the snow, legs out in front, leaning back on his hands, dozed off
  B('leftUpperLeg').rotation.set(-1.62, 0, .1); B('rightUpperLeg').rotation.set(-1.66, 0, -.12);
  B('leftLowerLeg').rotation.x = .12; B('rightLowerLeg').rotation.x = .3;
  B('leftFoot').rotation.x = .25; B('rightFoot').rotation.x = .2;
  B('spine').rotation.x = -.3 + .015 * br; B('chest').rotation.x = -.05 + .015 * br; B('neck').rotation.x = .3; B('head').rotation.set(.45, .1, .22);
  B('leftUpperArm').rotation.set(.55, 0, -1.2); B('rightUpperArm').rotation.set(.55, 0, 1.2);
  B('leftLowerArm').rotation.set(0, .1, 0); B('rightLowerArm').rotation.set(0, -.1, 0);
  B('leftHand').rotation.z = .6; B('rightHand').rotation.z = -.6;
  expr(r.vrm, { blink: 1, relaxed: .6 });
  return { air: 0 };
}
// sit the lowest foot (or the seat, when sitting) on the snow
function ground(r, air, sit) {
  r.vrm.scene.position.y = 0; r.vrm.scene.updateMatrixWorld(true);
  let low = Math.min(r.R('leftFoot').getWorldPosition(_v).y, r.R('rightFoot').getWorldPosition(_w).y) - r.footRest;
  if (sit) low = Math.min(low + .04, r.R('hips').getWorldPosition(_v).y - .1);   // heels rest a little lower than a standing ankle
  r.vrm.scene.position.y = -low + air;
}

/* ---------- speech ---------- */
function say(text, ms = 4200) {
  if (!sayEl || !text) return;
  sayEl.innerHTML = `<span>${text}</span>`;
  sayEl.classList.remove('on'); void sayEl.offsetWidth; sayEl.classList.add('on');
  state.sayUntil = performance.now() + ms;
}
function nextLine() { const lines = state.ctx.lines || []; if (lines.length) { say(lines[state.lineI % lines.length]); state.lineI++; } }
const headPos = new THREE.Vector3();
function placeBubble() {
  if (!sayEl) return;
  if (state.sayUntil && performance.now() > state.sayUntil) { sayEl.classList.remove('on'); state.sayUntil = 0; }
  if (!sayEl.classList.contains('on') && !zEl.classList.contains('on')) return;
  if (rider) { rider.R('head').getWorldPosition(headPos); headPos.y += .3; } else headPos.set(0, 1.9, 0);
  headPos.project(camera);
  const W = wrap.clientWidth, x = Math.min(W - 118, Math.max(118, (headPos.x * .5 + .5) * W)), y = Math.max(128, (-headPos.y * .5 + .5) * wrap.clientHeight);
  sayEl.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  zEl.style.transform = `translate(${(x + 14).toFixed(1)}px,${(y + 10).toFixed(1)}px)`;
}

/* ---------- input ---------- */
function tap() {
  const now = performance.now();
  state.taps = state.taps.filter(x => now - x < 380); state.taps.push(now);
  if (state.mode === 'sleep' && !(state.wokeAt && now - state.wokeAt < 60000)) { state.wokeAt = now; say('Oh! Still up? Get some sleep.'); return; }
  if (want() === 'ski') { if (state.taps.length >= 2) { play('spin'); say(state.ctx.allDone ? 'Everything done. Send it.' : 'Send it!', 2400); } else { play('hop'); nextLine(); } }
  else { play(want() === 'gym' ? 'flex' : 'wave'); nextLine(); }
  navigator.vibrate && navigator.vibrate(8);
}
function bind() {
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect(); state.pointerAt = performance.now();
    state.lookT.x = clamp(((e.clientX - r.left) / r.width - .5) * 2.2, -1, 1); state.lookT.y = clamp(((e.clientY - r.top) / r.height - .35) * 2, -1, 1);
    const d = state.drag;
    if (d) { const dx = e.clientX - d.x; d.moved = Math.max(d.moved, Math.abs(dx), Math.abs(e.clientY - d.y)); if (d.moved > 8) state.orbit = clamp(d.orbit - dx * .006, -1.2, 1.2); }
    wake();
  });
  cv.addEventListener('pointerdown', e => { state.drag = { x: e.clientX, y: e.clientY, orbit: state.orbit, moved: 0 }; wake(); });
  const up = cancel => { const d = state.drag; state.drag = null; if (d && !cancel && d.moved <= 8) tap(); wake(); };
  cv.addEventListener('pointerup', () => up(false));
  cv.addEventListener('pointercancel', () => up(true));
  cv.addEventListener('pointerleave', () => { state.pointerAt = 0; });
}

/* ---------- lifecycle ---------- */
function size() {
  if (!wrap || !wrap.isConnected) return;
  const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  const need = Math.max(camera.aspect < 1 ? 3.2 : 3.6, 2.3 / camera.aspect);   // metres of scene to fit top to bottom
  camera.userData.dist = need / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.updateProjectionMatrix();
  pointScale = h * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  [world.flakes, world.spray].forEach(f => { f.p.material.uniforms.scale.value = pointScale; });
  frame(performance.now());
}
const live = () => ok && wrap && wrap.isConnected && !document.hidden && inView;
function wake() { if (!raf && live()) { last = 0; raf = requestAnimationFrame(frame); } }
function frame(now) {
  raf = 0; if (!renderer || !ok) return;
  const dt = last ? clamp((now - last) / 1000, 0, .05) : 1 / 60; last = Math.max(last, now);
  const t = now / 1000;
  state.mode = state.ctx.mode || 'idle';
  ensureRider();
  const look = want(), skiing = !!rider && rider.key === 'ski', woke = state.wokeAt && now - state.wokeAt < 60000;
  const sit = !!rider && rider.key === 'sleep' && state.mode === 'sleep' && !woke;
  if (performance.now() - state.pointerAt > 2600) { state.lookT.x = Math.sin(t * .35) * .25; state.lookT.y = 0; }
  state.look.x = damp(state.look.x, state.lookT.x, 6, dt); state.look.y = damp(state.look.y, state.lookT.y, 6, dt);
  stepWorld(dt, skiing);
  if (rider) {
    const r = rider; r.vrm.humanoid.resetNormalizedPose();
    autonomous(dt);
    let res;
    if (r.key === 'ski') res = skiPose(r, t, dt);
    else if (sit) res = sleepPose(r, t);
    else res = standPose(r, t, dt, r.key === 'sleep', r.key === 'gym');
    if (state.act) { state.actT += dt; if (state.actT > ACTS[state.act]) state.act = null; }
    r.vrm.update(dt);
    ground(r, res.air, sit);
    if (r.key === 'ski') {
      layTracks(res.air < .02);
      // spray off the outside ski, hardest at the apex of the turn
      const k = Math.abs(res.s) * (1 - smooth(0, .03, res.air)) * (1 - .6 * state.tuck);
      if (SPEED && k > .35) { const out = res.s > 0 ? 1 : -1, tail = rider.tails[out > 0 ? 0 : 1]; tail.getWorldPosition(_v); emitSpray(_v, out, Math.floor((k - .3) * 300 * dt + Math.random())); }
    }
  }
  world.tracks.forEach(tr => { tr.m.visible = skiing; });
  world.spray.p.visible = skiing;
  // camera: three-quarter view from the front, following him a little; drag swings it round
  if (!state.drag) state.orbit = damp(state.orbit, 0, 1.6, dt);
  const dist = (state.camDist || camera.userData.dist || 7) * (sit ? .85 : 1), a = (skiing ? .5 : .32) + state.orbit, el = skiing ? .17 : .1;
  const ty = state.camY || (sit ? .55 : skiing ? 1.02 : .92), tx = skiing ? state.x * .55 : 0;
  camera.position.set(tx + Math.sin(a) * Math.cos(el) * dist, ty + Math.sin(el) * dist, Math.cos(a) * Math.cos(el) * dist);
  camera.lookAt(tx, ty - .05, 0);
  renderer.render(scene, camera);
  placeBubble();
  zEl.classList.toggle('on', sit);
  if (live() && (!REDUCED || state.act || state.drag || loading)) raf = requestAnimationFrame(frame);
}

function mount(slot) {
  if (!ok || !slot) return;
  if (!wrap) {
    try { buildScene(); } catch (e) { ok = false; slot.classList.add('no3d'); console.warn('3D unavailable', e); return; }
    wrap = document.createElement('div'); wrap.className = 'bd';
    cv.style.transition = 'opacity .28s ease';
    wrap.append(cv);
    sayEl = document.createElement('div'); sayEl.className = 'bd-say'; wrap.append(sayEl);
    zEl = document.createElement('div'); zEl.className = 'bd-z'; zEl.innerHTML = '<i>z</i><i>z</i><i>Z</i>'; wrap.append(zEl);
    bind();
    new ResizeObserver(size).observe(wrap);
    new IntersectionObserver(es => { inView = es[0].isIntersecting; wake(); }).observe(wrap);
    document.addEventListener('visibilitychange', wake);
    setTimeout(() => { if (state.mode !== 'sleep') say(state.ctx.greet || 'Hey!'); }, 900);
  }
  slot.append(wrap);
  update(window.buddyContext ? window.buddyContext() : {});
  size(); wake();
}
function update(ctx) {
  const prev = state.ctx; state.ctx = ctx || {};
  if (prev.allDone === false && ctx.allDone) { play('spin'); say('That’s everything. Nice work.'); }
  else if (prev.sessionDone === false && ctx.sessionDone) { play('hop'); say('Session done. Big.'); }
  else if (prev.mode && prev.mode !== ctx.mode && ctx.mode === 'work') say('Clocked in. Let’s get it.');
  state.mode = state.ctx.mode || 'idle';
  if (renderer && ok) ensureRider();   // start fetching the right outfit now, not on the next frame
  wake();
}
window.Buddy = { mount, update, say, play, get _() { return { camera, scene, state, world, rider: () => rider, frame }; } };
const slot0 = document.querySelector('#buddySlot'); if (slot0) mount(slot0);
