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
import { dress, toon, INK } from './dress.js';
import { gear, fists, hands } from './gear.js';
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
  phase: 0, x: 0, tuck: 0, tuckT: 0, orbit: (() => { try { return +localStorage.getItem('daybook_orbit') || 0; } catch (e) { return 0; } })(), drag: null, taps: [], touchAt: performance.now(),
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
  world.hemi = new THREE.HemisphereLight(0xdfe8ff, 0x2a2f48, 1.2); scene.add(world.hemi);
  const key = world.key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1.5, 3, 2.5); scene.add(key);
  world.outdoor = new THREE.Group(); scene.add(world.outdoor);

  // groomed snow with faint old tracks; it scrolls away under him, and fades out at the edges
  const snow = canvasTex(512, 512, (x, W, H) => {
    x.fillStyle = '#e6edf8'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${150 + Math.random() * 40 | 0},${170 + Math.random() * 40 | 0},${215 + Math.random() * 30 | 0},${.12 + Math.random() * .18})`; x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    for (let i = 0; i < 12; i++) { let px = Math.random() * W; x.strokeStyle = `rgba(140,160,205,${.1 + Math.random() * .12})`; x.lineWidth = 2 + Math.random() * 3; x.beginPath(); x.moveTo(px, 0); for (let y = 0; y <= H; y += 32) { px += (Math.random() - .5) * 6; x.lineTo(px, y); } x.stroke(); }
  });
  snow.wrapS = snow.wrapT = THREE.RepeatWrapping; snow.repeat.set(5, 5); snow.anisotropy = 8;
  const fade = canvasTex(256, 256, (x, W, H) => { const g = x.createRadialGradient(W / 2, H * .56, 0, W / 2, H * .56, W / 2); g.addColorStop(0, '#fff'); g.addColorStop(.3, '#ddd'); g.addColorStop(.75, '#333'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshLambertMaterial({ color: 0x9aabc8, map: snow, alphaMap: fade, transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.003, -3); ground.renderOrder = -1; world.outdoor.add(ground); world.fade = fade; world.ground = ground;
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
    const m = new THREE.Mesh(pine, mats); world.outdoor.add(m);
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
  world.pool = pool;
  buildSettings();

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
/* ---------- settings for the other outfits ---------- */
const box = (parent, w, h, d, color, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d), m = new THREE.Group(); m.add(new THREE.Mesh(g, toon(color)), new THREE.Mesh(g, INK)); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; };
const cyl = (parent, r, len, color, x, y, z, rot = [0, 0, 0], seg = 16) => { const g = new THREE.CylinderGeometry(r, r, len, seg), m = new THREE.Group(); m.add(new THREE.Mesh(g, toon(color)), new THREE.Mesh(g, INK)); m.position.set(x, y, z); m.rotation.set(...rot); parent.add(m); return m; };
function floor(parent, draw) {
  const t = canvasTex(512, 512, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshLambertMaterial({ map: t, alphaMap: world.fade, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, -.003, -2); m.renderOrder = -1; parent.add(m);
}
function buildSettings() {
  // gym: rubber floor, a power rack with a loaded bar, a dumbbell rack, plates, dust in the light
  const gym = world.gym = new THREE.Group(); scene.add(gym);
  floor(gym, (x, W, H) => { x.fillStyle = '#2c2d31'; x.fillRect(0, 0, W, H); for (let i = 0; i < 4000; i++) { x.fillStyle = ['#3a3b40', '#232428', '#4a3f35'][i % 3]; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); } x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 3; x.strokeRect(0, 0, W, H); });
  const rack = new THREE.Group(); rack.position.set(-2.2, 0, -2.3); rack.rotation.y = .45; gym.add(rack);
  [[-.6, -.5], [.6, -.5], [-.6, .5], [.6, .5]].forEach(([x, z]) => box(rack, .07, 2.3, .07, 0x1c1d22, x, 1.15, z));
  [-.5, .5].forEach(z => box(rack, 1.27, .07, .07, 0x1c1d22, 0, 2.28, z)); [-.6, .6].forEach(x => box(rack, .07, .07, 1.07, 0x1c1d22, x, 2.28, 0));
  cyl(rack, .015, 2.1, 0x9a9ca3, 0, 1.38, .5, [0, 0, Math.PI / 2]);
  [-1, 1].forEach(k => { cyl(rack, .225, .05, 0x17181c, k * .82, 1.38, .5, [0, 0, Math.PI / 2], 28); cyl(rack, .17, .04, 0xc0392b, k * .87, 1.38, .5, [0, 0, Math.PI / 2], 24); });
  const dbr = new THREE.Group(); dbr.position.set(1.8, 0, -1.2); dbr.rotation.y = -.55; gym.add(dbr);
  box(dbr, 1.5, .06, .36, 0x1c1d22, 0, .55, 0); box(dbr, 1.5, .06, .36, 0x1c1d22, 0, .3, .12);
  [-.72, .72].forEach(x => box(dbr, .06, .6, .4, 0x1c1d22, x, .3, .05));
  for (let i = 0; i < 5; i++) { const x = -.56 + i * .28, s = .8 + i * .07; cyl(dbr, .012, .2, 0x9a9ca3, x, .63, 0, [Math.PI / 2, 0, 0]); [-1, 1].forEach(k => box(dbr, .09 * s, .09 * s, .06, 0x17181c, x, .63, k * .1)); }
  [0, .05, .1].forEach((y, i) => cyl(gym, .225 - i * .03, .045, 0x17181c, 1.2, .025 + y, .75, [0, 0, 0], 28));
  // shop: wood floor, a rail of jackets and a table of folded shirts (Thomas Jeffery vibes)
  const shop = world.shop = new THREE.Group(); scene.add(shop);
  floor(shop, (x, W, H) => { for (let i = 0; i < 8; i++) { const c = ['#7a5a3c', '#6f5135', '#836243', '#74553a'][i % 4]; x.fillStyle = c; x.fillRect(i * W / 8, 0, W / 8, H); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(i * W / 8, 0, 2, H); const cut = Math.random() * H; x.fillRect(i * W / 8, cut, W / 8, 2); } for (let i = 0; i < 90; i++) { x.strokeStyle = 'rgba(40,24,12,.18)'; x.lineWidth = 1; x.beginPath(); const px = Math.random() * W; x.moveTo(px, Math.random() * H); x.lineTo(px + (Math.random() - .5) * 4, Math.random() * H); x.stroke(); } });
  const rail = new THREE.Group(); rail.position.set(-1.25, 0, -1.55); rail.rotation.y = .25; shop.add(rail);
  [-.85, .85].forEach(x => cyl(rail, .018, 1.7, 0xb08d57, x, .85, 0)); cyl(rail, .016, 1.75, 0xb08d57, 0, 1.68, 0, [0, 0, Math.PI / 2]);
  [0x1f2a44, 0x3a3d42, 0xb8864e, 0x2f3b2f, 0x6b2b2b, 0x1f2a44, 0x8a8f96].forEach((c, i) => { const j = box(rail, .44, .74, .07, c, -.72 + i * .24, 1.26, .02 * (i % 2), .9); j.rotation.z = (i % 3 - 1) * .03; });
  box(shop, 1.2, .72, .62, 0x4a3322, 1.55, .36, -.75, -.4);
  [[0xf2efe8, -.35], [0xbcd3ea, 0], [0x9aa0a8, .35]].forEach(([c, dx]) => { for (let k = 0; k < 3; k++) box(shop, .3, .045, .24, c, 1.55 + dx * Math.cos(.4), .745 + k * .048, -.75 + dx * Math.sin(.4), -.4); });
  box(shop, .72, 1.9, .05, 0xb08d57, 2.15, .95, -1.7, -.6); box(shop, .6, 1.76, .02, 0x9fb3c8, 2.15, .95, -1.67, -.6);
  // camp: stars, a moon and a small fire in the snow for the late-night look
  const camp = world.camp = new THREE.Group(); scene.add(camp);
  const fire = world.fire = new THREE.Group(); fire.position.set(.95, 0, -1.05); camp.add(fire);
  // where he sleeps: a plaid blanket on the snow, a rolled pillow, cocoa and a lantern within reach
  const bed = new THREE.Group(); bed.rotation.y = SLEEP_YAW; camp.add(bed);   // bed space: +z runs toward his feet
  const plaid = canvasTex(256, 256, (x, W, H) => {
    x.fillStyle = '#9e2a2b'; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(25,18,20,.55)'; for (let i = 0; i < 4; i++) { x.fillRect(i * 64 + 20, 0, 26, H); x.fillRect(0, i * 64 + 20, W, 26); }
    x.fillStyle = 'rgba(230,200,150,.35)'; for (let i = 0; i < 4; i++) { x.fillRect(i * 64 + 52, 0, 4, H); x.fillRect(0, i * 64 + 52, W, 4); }
  }); plaid.wrapS = plaid.wrapT = THREE.RepeatWrapping; plaid.repeat.set(3, 5);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.25, .025, 2.05, 8, 1, 12), toon(0xffffff)); blanket.material.map = plaid;
  { const P = blanket.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); P.setY(i, P.getY(i) + .012 * Math.sin(x * 9 + z * 3) * Math.cos(z * 5)); } blanket.geometry.computeVertexNormals(); }
  blanket.position.set(0, .013, -.05); bed.add(blanket);
  cyl(bed, .09, .5, 0xe9e1d0, 0, .09, -.98, [0, 0, Math.PI / 2], 16);                                   // pillow
  const mug = new THREE.Group(); mug.position.set(.78, 0, -.35); bed.add(mug); world.campMug = mug;
  cyl(mug, .045, .1, 0xd9573b, 0, .05, 0); { const h = new THREE.Mesh(new THREE.TorusGeometry(.028, .008, 6, 14), toon(0xd9573b)); h.position.set(.05, .05, 0); mug.add(h); }
  { const top = new THREE.Mesh(new THREE.CircleGeometry(.04, 16), toon(0x5a3420)); top.rotation.x = -Math.PI / 2; top.position.y = .098; mug.add(top); }
  const lantern = new THREE.Group(); lantern.position.set(-.8, 0, -.85); bed.add(lantern);
  cyl(lantern, .07, .03, 0x2a2b30, 0, .015, 0); cyl(lantern, .07, .03, 0x2a2b30, 0, .2, 0); cyl(lantern, .03, .03, 0x2a2b30, 0, .235, 0);
  { const glass = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .16, 14), new THREE.MeshBasicMaterial({ color: 0xffd08a })); glass.position.y = .108; lantern.add(glass); }
  world.lanternLight = new THREE.PointLight(0xffc27a, 1.1, 2.5, 1.8); world.lanternLight.position.y = .25; lantern.add(world.lanternLight);
  // a small A-frame tent glowing from inside
  const tent = new THREE.Group(); tent.position.set(-1.5, 0, -2.6); tent.rotation.y = .35; camp.add(tent);
  { const W = 1.5, Hh = 1.2, D = 1.8, shape = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, Hh)]);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false }), toon(0x3f6b5a)); body.position.z = -D / 2; tent.add(body); { const ink = new THREE.Mesh(body.geometry, INK); ink.position.copy(body.position); tent.add(ink); }
    const door = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-.32, 0), new THREE.Vector2(.32, 0), new THREE.Vector2(0, .78)])), new THREE.MeshBasicMaterial({ color: 0xffc37a })); door.position.z = D / 2 + .005; tent.add(door); }
  // the fire's warm pool of light on the snow
  { const glowTex = canvasTex(128, 128, (x, W, H) => { const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2); g.addColorStop(0, 'rgba(255,170,90,.9)'); g.addColorStop(.4, 'rgba(255,130,60,.35)'); g.addColorStop(1, 'rgba(255,120,50,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.rotation.x = -Math.PI / 2; glow.position.set(.95, .006, -1.05); camp.add(glow); world.glow = glow; }
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(.07 + (i % 3) * .015), toon(0x6d7280)); st.position.set(Math.cos(a) * .3, .04, Math.sin(a) * .3); fire.add(st); }
  [0, .8, 1.6, 2.4].forEach(a => cyl(fire, .05, .6, 0x5b3a22, 0, .12, 0, [Math.PI / 2 - .5, a, 0], 8));
  world.flames = [[.22, .62, 0xff7a1a], [.15, .5, 0xffb347], [.08, .32, 0xffe7a0]].map(([r, h, c]) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .92, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.y = .1 + h / 2; m.userData.h = h; fire.add(m); return m; });
  world.fireLight = new THREE.PointLight(0xff9a4a, 4, 8, 1.5); world.fireLight.position.set(0, .5, 0); fire.add(world.fireLight);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), new THREE.MeshBasicMaterial({ color: 0xf4f1e2, fog: false })); moon.position.set(3.2, 7.2, -30); camp.add(moon);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: 0xbfd0ff, transparent: true, opacity: .12, depthWrite: false })); halo.position.set(3.2, 7.2, -30.1); camp.add(halo);
  world.stars = world.pool(160, 0xffffff);
  { const f = world.stars, P = f.g.attributes.position.array; for (let i = 0; i < f.n; i++) { P[i * 3] = (Math.random() - .5) * 60; P[i * 3 + 1] = 3 + Math.random() * 16; P[i * 3 + 2] = -34 + Math.random() * 10; f.g.attributes.size.array[i] = .08 + Math.random() * .14; f.max[i] = Math.random() * 6; } }
  world.sparks = world.pool(50, 0xffa04a);
  world.dust = world.pool(70, 0xffe2b8);
  world.steam = world.pool(26, 0xf4f1ea);
  bed.updateMatrixWorld(true); world.mugTop = mug.getWorldPosition(new THREE.Vector3()); world.mugTop.y = .11;
  { const f = world.dust, P = f.g.attributes.position.array; for (let i = 0; i < f.n; i++) { P[i * 3] = (Math.random() - .5) * 6; P[i * 3 + 1] = Math.random() * 2.8; P[i * 3 + 2] = -2 + Math.random() * 4; f.g.attributes.size.array[i] = .012 + Math.random() * .02; f.g.attributes.alpha.array[i] = .2 + Math.random() * .3; } }
}
// what each outfit's world looks like: which props show, the light, and the sky behind
const SETTINGS = {
  ski: { sky: 0xdfe8ff, ground: 0x2a2f48, hemi: 1.2, key: 0xffffff, keyI: 2.2, bg: '' },
  sleep: { sky: 0x8fa6d8, ground: 0x241a1c, hemi: .7, key: 0xa9bcff, keyI: .9, bg: 'radial-gradient(90% 70% at 50% 30%,#1c2645 0%,#0e1427 55%,#070a13 100%)' },
  gym: { sky: 0xffe2c4, ground: 0x2a2018, hemi: 1.05, key: 0xffd9a8, keyI: 2.3, bg: 'radial-gradient(80% 70% at 50% 28%,#5e4837 0%,#34281f 45%,#16110d 100%)' },
  work: { sky: 0xfff0dc, ground: 0x3a2e22, hemi: 1.15, key: 0xfff1de, keyI: 2.0, bg: 'radial-gradient(80% 70% at 50% 28%,#7d6852 0%,#473b2f 45%,#1c1611 100%)' },
};
const SKY = {
  night: { ...SETTINGS.ski, snow: 0x9aabc8 },
  sunset: { sky: 0xffc9a8, ground: 0x3a2440, hemi: 1.15, key: 0xffb27a, keyI: 2.1, snow: 0xe6c3c6, bg: 'radial-gradient(90% 75% at 50% 25%,#ffb07a 0%,#c8607a 38%,#4a2a5c 72%,#1c1430 100%)' },
  day: { sky: 0xeaf4ff, ground: 0x6d7f99, hemi: 1.35, key: 0xffffff, keyI: 2.4, snow: 0xeef3fb, bg: 'radial-gradient(90% 75% at 50% 20%,#dff1ff 0%,#8cc4ef 40%,#4a86c7 75%,#2b5a93 100%)' },
};
let bgEl = null, envKey = '';
function setEnv(key) {
  if (key === envKey) return; envKey = key;
  const S = key === 'ski' ? (SKY[dexPrefs().time] || SKY.night) : SETTINGS[key], outdoor = key === 'ski' || key === 'sleep';
  world.ground.material.color.set(key === 'ski' ? S.snow : 0x9aabc8);
  world.outdoor.visible = outdoor; world.flakes.p.visible = outdoor;
  world.gym.visible = key === 'gym'; world.shop.visible = key === 'work'; world.camp.visible = key === 'sleep';
  world.stars.p.visible = world.sparks.p.visible = world.steam.p.visible = key === 'sleep'; world.dust.p.visible = key === 'gym' || key === 'work';
  world.hemi.color.set(S.sky); world.hemi.groundColor.set(S.ground); world.hemi.intensity = S.hemi; world.key.color.set(S.key); world.key.intensity = S.keyI;
  if (bgEl) { bgEl.style.opacity = S.bg ? 1 : 0; if (S.bg) bgEl.style.background = S.bg; }
}
function stepSettings(dt, t) {
  if (envKey === 'sleep') {
    world.flames.forEach((m, i) => { const k = 1 + .18 * Math.sin(t * (9 + i * 3)) + .1 * Math.sin(t * (23 + i * 5)); m.scale.set(1 + .08 * Math.sin(t * 13 + i), k, 1 + .08 * Math.cos(t * 11 + i)); m.position.y = .1 + m.userData.h * k / 2; });
    world.fireLight.intensity = 3.6 + .7 * Math.sin(t * 11) + .5 * Math.sin(t * 27);
    world.glow.material.opacity = .85 + .12 * Math.sin(t * 9); world.lanternLight.intensity = 1.05 + .08 * Math.sin(t * 5);
    const f = world.sparks, P = f.g.attributes.position.array, A = f.g.attributes.alpha.array, S = f.g.attributes.size.array, o = world.fire.position;
    for (let i = 0; i < f.n; i++) {
      if (f.life[i] <= 0) { if (Math.random() < dt * 2.5) { f.max[i] = f.life[i] = .8 + Math.random() * 1.2; P[i * 3] = o.x + (Math.random() - .5) * .15; P[i * 3 + 1] = .25; P[i * 3 + 2] = o.z + (Math.random() - .5) * .15; f.v[i * 3] = (Math.random() - .5) * .3; f.v[i * 3 + 1] = .6 + Math.random() * .7; f.v[i * 3 + 2] = (Math.random() - .5) * .3; } else { A[i] = 0; continue; } }
      f.life[i] -= dt; const u = 1 - f.life[i] / f.max[i];
      P[i * 3] += f.v[i * 3] * dt + Math.sin(t * 3 + i) * dt * .15; P[i * 3 + 1] += f.v[i * 3 + 1] * dt; P[i * 3 + 2] += f.v[i * 3 + 2] * dt;
      S[i] = .02 + .015 * (1 - u); A[i] = (1 - u) * (.6 + .4 * Math.sin(t * 20 + i));
    }
    ['position', 'size', 'alpha'].forEach(k => { f.g.attributes[k].needsUpdate = true; });
    { // steam curling up off the cocoa
      const f = world.steam, P = f.g.attributes.position.array, A = f.g.attributes.alpha.array, S = f.g.attributes.size.array, o = world.mugTop;
      for (let i = 0; i < f.n; i++) {
        if (f.life[i] <= 0) { if (Math.random() < dt * 1.2) { f.max[i] = f.life[i] = 1.6 + Math.random(); P[i * 3] = o.x; P[i * 3 + 1] = o.y; P[i * 3 + 2] = o.z; } else { A[i] = 0; continue; } }
        f.life[i] -= dt; const u = 1 - f.life[i] / f.max[i];
        P[i * 3 + 1] += dt * .16; P[i * 3] += Math.sin(t * 2 + i) * dt * .03; P[i * 3 + 2] += Math.cos(t * 1.7 + i) * dt * .02;
        S[i] = .025 + .06 * u; A[i] = .32 * Math.sin(Math.PI * u);
      }
      ['position', 'size', 'alpha'].forEach(k => { f.g.attributes[k].needsUpdate = true; });
    }
    const st = world.stars; for (let i = 0; i < st.n; i++) st.g.attributes.alpha.array[i] = .45 + .4 * Math.sin(t * (.8 + st.max[i] * .3) + st.max[i] * 7); st.g.attributes.alpha.needsUpdate = true;
  }
  if (envKey === 'gym' || envKey === 'work') {
    const f = world.dust, P = f.g.attributes.position.array;
    for (let i = 0; i < f.n; i++) { P[i * 3] += Math.sin(t * .3 + i) * dt * .04; P[i * 3 + 1] += (Math.cos(t * .25 + i * 1.7) * .03 + .01) * dt; if (P[i * 3 + 1] > 2.9) P[i * 3 + 1] = 0; }
    f.g.attributes.position.needsUpdate = true;
  }
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
    if (envKey === 'sleep') {
      // at the camp: big soft flakes falling slowly and swaying, gathered round him so you see them
      const now = performance.now() / 1000;
      if (!f.camp) { f.camp = true; for (let i = 0; i < f.n; i++) { P[i * 3] = (Math.random() - .5) * 6; P[i * 3 + 1] = Math.random() * 3.6; P[i * 3 + 2] = -3.5 + Math.random() * 5.5; f.g.attributes.size.array[i] = .03 + Math.random() * .035; } f.g.attributes.size.needsUpdate = true; }
      for (let i = 0; i < f.n; i++) {
        P[i * 3 + 1] -= dt * (.16 + (i % 5) * .025);
        P[i * 3] += Math.sin(now * .7 + i * 1.3) * dt * .12; P[i * 3 + 2] += Math.cos(now * .5 + i) * dt * .05;
        if (P[i * 3 + 1] < 0) { P[i * 3] = (Math.random() - .5) * 6; P[i * 3 + 1] = 3.6; P[i * 3 + 2] = -3.5 + Math.random() * 5.5; }
      }
      f.g.attributes.position.needsUpdate = true;
    } else {
    if (f.camp) { f.camp = false; for (let i = 0; i < f.n; i++) f.g.attributes.size.array[i] = .02 + Math.random() * .03; f.g.attributes.size.needsUpdate = true; }
    for (let i = 0; i < f.n; i++) {
      P[i * 3 + 1] -= dt * (.5 + (i % 7) * .08); P[i * 3 + 2] -= d * .9; P[i * 3] += Math.sin(i + performance.now() / 900) * dt * .1;
      if (P[i * 3 + 1] < 0 || P[i * 3 + 2] < -14) { P[i * 3] = (Math.random() - .5) * 11; P[i * 3 + 1] = sp ? Math.random() * 5 : 5; P[i * 3 + 2] = sp ? 6 : -14 + Math.random() * 20; }
    }
    f.g.attributes.position.needsUpdate = true;
    }
  }
  { // spray: short-lived puffs that fly out, fall and get left behind
    const f = world.spray, P = f.g.attributes.position.array, S = f.g.attributes.size.array, A = f.g.attributes.alpha.array, drag = Math.exp(-1.8 * dt);
    for (let i = 0; i < f.n; i++) {
      if (f.life[i] <= 0) { A[i] = 0; continue; }
      f.life[i] -= dt; const u = 1 - f.life[i] / f.max[i];
      f.v[i * 3 + 1] -= 6 * dt; for (let k = 0; k < 3; k++) { f.v[i * 3 + k] *= drag; P[i * 3 + k] += f.v[i * 3 + k] * dt; }
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
  if (key === 'sleep') r.mug = holdInFist(vrm, 'right', cocoaMug());
  if (key === 'gym') { r.build = dexPrefs().build; physique(vrm, { amount: BUILD[r.build] || 1 }); r.dumbbells = ['left', 'right'].map(side => holdInFist(vrm, side, dumbbell())); }   // leaner and more defined, Luffy-style
  if (key === 'ski') {
    const D = dexPrefs();
    r.outfit = dress(vrm, { jacket: D.jacket, pants: D.pants, boots: D.boots, gloves: D.gloves }); r.kit = gear(vrm, r.outfit, { frame: D.frame, pole: D.poles }, { lens: D.lens, skis: D.skis });
    r.kit.setMask(D.mask); r.kit.setBeanie(D.head === 'beanie', D.beanie); r.dexWas = { ...D };
    r.tails = ['l', 'r'].map(s => { const o = new THREE.Object3D(); o.position.set(0, .01, -.8); r.kit.skis[s].add(o); return o; });
  }
  return r;
}
// a dumbbell: knurled handle along the fist's axis, a hex head each end
function dumbbell() {
  const g = new THREE.Group(), head = new THREE.CylinderGeometry(.05, .05, .075, 6).rotateX(Math.PI / 2), bar = new THREE.CylinderGeometry(.014, .014, .2, 10).rotateX(Math.PI / 2);
  g.add(new THREE.Mesh(bar, toon(0x9a9ca3)));
  [-1, 1].forEach(k => { const h = new THREE.Mesh(head, toon(0x1b1c21)); h.position.z = k * .12; g.add(h, Object.assign(new THREE.Mesh(head, INK), {})); g.children[g.children.length - 1].position.z = k * .12; });
  g.visible = false; return g;
}
// the cocoa mug, standing up along the fist (thumb side up)
function cocoaMug() {
  const g = new THREE.Group(), body = new THREE.CylinderGeometry(.045, .042, .1, 16).rotateX(Math.PI / 2), m = new THREE.Mesh(body, toon(0xd9573b));
  m.position.set(-.035, 0, .02); g.add(m, Object.assign(new THREE.Mesh(body, INK))); g.children[1].position.copy(m.position);
  const top = new THREE.Mesh(new THREE.CircleGeometry(.04, 16), toon(0x5a3420)); top.position.set(-.035, 0, .071); g.add(top);
  g.visible = false; return g;
}
// parent a prop to a hand so it sits in the closed fist (built in the bind pose, like the ski poles)
function holdInFist(vrm, side, obj) {
  let skin; vrm.scene.traverse(o => { if (o.isSkinnedMesh && o.name === 'Body_(merged)') skin = o; });
  const bones = skin.skeleton.bones, bi = n => bones.indexOf(vrm.humanoid.getRawBoneNode(n)), bind = n => skin.skeleton.boneInverses[bi(n)].clone().invert();
  const hand = new THREE.Vector3().setFromMatrixPosition(bind(side + 'Hand')), mid = new THREE.Vector3().setFromMatrixPosition(bind(side + 'MiddleProximal'));
  obj.position.copy(hand.lerp(mid, .95)); obj.position.y -= .022;
  const m = skin.skeleton.boneInverses[bi(side + 'Hand')].clone().multiply(new THREE.Matrix4().compose(obj.position, obj.quaternion, obj.scale));
  m.decompose(obj.position, obj.quaternion, obj.scale); bones[bi(side + 'Hand')].add(obj); return obj;
}
// his look, chosen in the Customise sheet (settings.dex); the defaults are Jackson's real kit
export const DEX_DEFAULTS = { look: 'auto', time: 'night', jacket: '#b8863b', pants: '#1c1d22', boots: '#b8a276', gloves: '#16171d', poles: '#1a1b20', head: 'mask', mask: '#1a1b21', beanie: '#16171d', frame: '#d5d0c1', lens: 'gold', skis: 'bent', skin: 'default', build: 'athletic' };
const dexPrefs = () => ({ ...DEX_DEFAULTS, ...(state.ctx.dex || {}) });
const SKIN = { default: '#ffffff', warm: '#f6dcc6', tan: '#e2b08a', deep: '#b98460' }, BUILD = { lean: .55, athletic: 1, jacked: 1.45 };
// skin tone tints the skin materials of whichever model is showing
function applySkin(r, tone) {
  const c = new THREE.Color(SKIN[tone] || SKIN.default);
  r.vrm.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => {
    if (!m || !/SKIN/.test(m.name) || /Outline/.test(m.name) || !m.color) return;
    if (!m.userData.baseShade && m.shadeColorFactor) m.userData.baseShade = m.shadeColorFactor.clone();
    m.color.copy(c); if (m.userData.baseShade) m.shadeColorFactor.copy(m.userData.baseShade).multiply(c);
  }); });
}
function applyDex() {
  const D = dexPrefs();
  if (!rider) return;
  applySkin(rider, D.skin);
  if (envKey) { const k = envKey; envKey = ''; setEnv(k); }   // slope time may have changed
  if (rider.key === 'gym' && rider.build !== D.build) { delete cache.gym; state.reload = true; }
  if (rider.key !== 'ski') return;
  ['jacket', 'pants', 'boots', 'gloves'].forEach(k => rider.outfit.recolor(k, D[k]));
  const K = rider.kit, was = rider.dexWas || {};
  if (was.lens !== D.lens) K.setLens(D.lens);
  if (was.skis !== D.skis) K.setSkis(D.skis);
  if (was.mask !== D.mask) K.setMask(D.mask);
  if (was.head !== D.head || was.beanie !== D.beanie) K.setBeanie(D.head === 'beanie', D.beanie);
  K.setFrame(D.frame); K.setPoles(D.poles);
  rider.dexWas = { ...D };
}
function want() {
  const look = dexPrefs().look;
  if (look && look !== 'auto') return look;   // he picked a look to keep
  if (state.mode === 'sleep' && state.wokeAt && performance.now() - state.wokeAt < 60000) return 'sleep';
  // night beats work beats training; otherwise he's skiing
  return state.mode === 'sleep' ? 'sleep' : state.mode === 'work' ? 'work' : state.ctx.training ? 'gym' : 'ski';
}
const failedAt = {};   // outfit -> don't retry before this time
function ensureRider() {
  const k = want();
  if ((rider && rider.key === k && !state.reload) || loading === k || failed || performance.now() < (failedAt[k] || 0)) return;
  state.reload = false;
  loading = k;
  load(k).then(r => {
    if (loading !== k) return;
    loading = null;
    const swap = () => {
      if (rider && rider !== r) { scene.remove(rider.vrm.scene); const old = rider; if (old.key !== r.key) delete cache[old.key]; VRMUtils.deepDispose(old.vrm.scene); }
      rider = r; scene.add(r.vrm.scene); setEnv(r.key); applyDex(); world.tracks.forEach(t => { t.pts = []; });
      cv.style.opacity = 1; wake();
    };
    if (rider) { cv.style.opacity = 0; setTimeout(swap, 280); } else swap();
  }).catch(e => { loading = null; failedAt[k] = performance.now() + 60000; console.warn('Dex model failed to load', e); if (!rider) fallback(); });
}
// the models aren't reachable (offline first run, or not uploaded): hand over to the old code-built Dex
function fallback() {
  failed = true; ok = false;
  const slot = wrap && wrap.parentNode; if (wrap) wrap.remove();
  window.Buddy = undefined;
  import('./buddy.js').then(() => { if (slot && window.Buddy) window.Buddy.mount(slot); }).catch(() => slot && slot.classList.add('no3d'));
}

/* ---------- poses ---------- */
const SLEEP_YAW = .35;   // lying with his feet toward the camera, head back on the pillow, so his face stays in view
const ACTS = { hop: .9, spin: 1.5, wave: 2.4, flex: 2.6 };
// What he gets up to when he isn't skiing: a workout in the gym, bits of business on the shop floor.
const TASKS = { gym: ['curl', 'squat', 'jacks', 'curl', 'squat', 'flex'], work: ['watch', 'tie', 'look', 'browse'], sleep: ['warm', 'cocoa', 'stars', 'warm', 'cocoa'] };
const TASK_LEN = { curl: 7.5, squat: 6.5, jacks: 5.5, watch: 3.6, tie: 3.2, look: 6, browse: 8, warm: 9.5, cocoa: 10.5, stretch: 3.6, stars: 6 };
function stepTask(kind, dt) {
  if (REDUCED || !TASKS[kind]) { state.task = null; return; }
  if (state.task && state.task.kind !== kind) state.task = null;
  if (state.act) return;   // a tap reaction plays first
  if (state.task) { state.task.t += dt; if (state.task.t > TASK_LEN[state.task.name]) { state.task = null; state.taskNext = 1.2 + Math.random() * 2.5; } return; }
  state.taskNext = (state.taskNext ?? 2) - dt; if (state.taskNext > 0) return;
  const list = TASKS[kind]; let name; do name = list[Math.floor(Math.random() * list.length)]; while (name === state.lastTask);
  state.lastTask = name;
  if (name === 'flex') { play('flex'); state.taskNext = 2 + Math.random() * 2; return; }
  state.task = { kind, name, t: 0 };
}
function play(name) { if (REDUCED && name !== 'hop') return; if (!ACTS[name]) name = want() === 'ski' ? 'hop' : want() === 'gym' ? 'flex' : 'wave'; state.act = name; state.actT = 0; state.task = null; }
function autonomous(dt) {
  if (REDUCED || state.act || (want() !== 'ski' && want() !== 'gym')) return;
  state.next -= dt; if (state.next > 0) return;
  state.next = 7 + Math.random() * 6;
  const r = Math.random();
  if (want() === 'gym') { if (r < .5) play('flex'); return; }
  if (state.ctx.allDone && r < .45) play('spin'); else if (r < .25) play('hop');
}
function expr(vrm, v) { const E = vrm.expressionManager; if (!E) return; ['happy', 'blink', 'surprised', 'relaxed', 'aa'].forEach(n => E.setValue(n, v[n] || 0)); }
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
  if (a === 'hop') { const dip = u < .22 ? Math.sin(Math.PI * u / .22) : 0, v = clamp((u - .16) / .84, 0, 1); air = .42 * Math.sin(Math.PI * v); flexAir = .45 * Math.sin(Math.PI * v) + .35 * dip; }
  if (a === 'spin') { const dip = u < .18 ? Math.sin(Math.PI * u / .18) : 0, v = clamp((u - .12) / .88, 0, 1); air = .62 * Math.sin(Math.PI * v); flexAir = .6 * Math.sin(Math.PI * v) + .4 * dip; spin = Math.PI * 2 * ease(clamp((u - .08) / .84, 0, 1)); }
  const lean = .42 * s * amp * (1 - smooth(0, .15, air)), yaw = .38 * c * amp;
  r.vrm.scene.rotation.order = 'XYZ'; r.vrm.scene.rotation.set(0, yaw + spin, lean);
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
// A walk: legs swing with the knee bending through the swing and the foot rolling heel to
// toe, the pelvis twists and drops a little each step, the chest counter-rotates, arms
// swing opposite the legs with a soft elbow. a = 0..1 fades it in and out at the ends.
function gait(B, p, a) {
  const s = Math.sin(p), c = Math.cos(p), swingL = Math.max(0, Math.sin(p - .9)), swingR = Math.max(0, -Math.sin(p - .9));
  const R = (n, x, y, z) => { const o = B(n).rotation; o.x += x * a; o.y += y * a; o.z += z * a; };
  R('leftUpperLeg', -.44 * s, 0, 0); R('rightUpperLeg', .44 * s, 0, 0);
  R('leftLowerLeg', .12 + .62 * swingL, 0, 0); R('rightLowerLeg', .12 + .62 * swingR, 0, 0);
  R('leftFoot', .22 * Math.sin(p + .7), 0, 0); R('rightFoot', -.22 * Math.sin(p + .7), 0, 0);
  R('hips', 0, .09 * s, .035 * c); R('spine', .04, -.1 * s, -.02 * c); R('chest', 0, -.05 * s, 0);
  R('leftUpperArm', .3 * s, 0, 0); R('rightUpperArm', -.3 * s, 0, 0);
  R('leftLowerArm', 0, -(.18 + .16 * Math.max(0, s)), 0); R('rightLowerArm', 0, .18 + .16 * Math.max(0, -s), 0);
  R('head', 0, .04 * s, 0);
}
const ramp = (k, a, b, e = .35) => clamp(Math.min((k - a) / e, (b - k) / e), 0, 1);   // 0 → 1 → 0 over [a, b]
function standPose(r, t, dt, sleepy, gym) {
  const { B } = r, a = state.act, u = a ? clamp(state.actT / ACTS[a], 0, 1) : 0, br = Math.sin(t * 1.35);
  // weight settles on one foot, holds, then shifts to the other (not a constant sway)
  const sw = Math.tanh(2.2 * Math.sin(t * .42)), n1 = Math.sin(t * .71) + .5 * Math.sin(t * 1.93), n2 = Math.sin(t * .53 + 1) + .5 * Math.sin(t * 1.47);
  r.vrm.scene.rotation.order = 'XYZ'; r.vrm.scene.rotation.set(0, state.look.x * .12, 0); r.vrm.scene.position.x = 0; r.vrm.scene.position.z = 0;
  B('hips').rotation.z = sw * .045; B('leftUpperLeg').rotation.z = -sw * .045; B('rightUpperLeg').rotation.z = -sw * .045;
  B(sw > 0 ? 'rightLowerLeg' : 'leftLowerLeg').rotation.x = .12 * Math.abs(sw);   // the relaxed leg softens at the knee
  B('spine').rotation.set(.03 * br, .025 * n1, -sw * .035); B('chest').rotation.set(.025 * br, .015 * n2, 0);
  B('leftShoulder') && (B('leftShoulder').rotation.z = .025 * br); B('rightShoulder') && (B('rightShoulder').rotation.z = -.025 * br);
  B('leftUpperArm').rotation.set(-.08 + .045 * n2, 0, -1.4 - .03 * br - .03 * sw); B('rightUpperArm').rotation.set(-.08 - .045 * n1, 0, 1.4 + .03 * br - .03 * sw);   // loose arms
  B('leftLowerArm').rotation.set(0, -.3 - .08 * n1, 0); B('rightLowerArm').rotation.set(0, .3 + .08 * n2, 0);
  B('leftHand').rotation.z = -.15; B('rightHand').rotation.z = .15;
  B('head').rotation.set(-state.look.y * .18 + .03 * n2, state.look.x * .4 + .06 * n1, sw * .04 + .02 * n2);
  if (a === 'wave') {
    const W = ease(Math.min(clamp(state.actT / .3, 0, 1), clamp((ACTS.wave - state.actT) / .35, 0, 1)));
    B('rightUpperArm').rotation.set(-.08 * (1 - W), 0, lerp(1.4, -1.1, W)); hr = lerp(hr, -.85, W); B('rightLowerArm').rotation.set(0, lerp(.12, 0, W), lerp(0, -.5 + .45 * Math.sin(state.actT * 11), W));
  }
  if (gym) {
    // athletic stance: feet wider, fists, shoulders back
    B('leftUpperLeg').rotation.z = .07 - sw * .02; B('rightUpperLeg').rotation.z = -.07 - sw * .02;
    B('chest').rotation.x = -.04 + .015 * br;
    if (a === 'flex') {
      // double biceps: upper arms out level with the shoulders, forearms up, a grin
      const W = ease(Math.min(clamp(state.actT / .35, 0, 1), clamp((ACTS.flex - state.actT) / .4, 0, 1))), pump = Math.sin(state.actT * 7) * .05;
      B('leftUpperArm').rotation.set(-.15 * W - .08 * (1 - W), 0, lerp(-1.4, -.12, W)); B('rightUpperArm').rotation.set(-.15 * W - .08 * (1 - W), 0, lerp(1.4, .12, W));
      B('leftLowerArm').rotation.set(0, lerp(-.3, -.25, W), lerp(0, 1.95 + pump, W)); B('rightLowerArm').rotation.set(0, lerp(.3, .25, W), lerp(0, -1.95 - pump, W));
      B('head').rotation.y += .35 * W; B('spine').rotation.x -= .05 * W; hl = hr = lerp(.85, 1, W);
    }
  }
  let air = 0, hl = gym ? .85 : .06 * Math.sin(t * .8), hr = gym ? .85 : .06 * Math.sin(t * .8 + 1.3);   // hands: relaxed, or fists in the gym
  const T = !a && state.task, k = T ? T.t : 0, W = T ? ease(Math.min(clamp(k / .5, 0, 1), clamp((TASK_LEN[T.name] - k) / .5, 0, 1))) : 0;
  const mixR = (n, x, y, z) => { const R = B(n).rotation; R.set(lerp(R.x, x, W), lerp(R.y, y, W), lerp(R.z, z, W)); };
  if (r.dumbbells) r.dumbbells.forEach(d => { d.visible = !!T && T.name === 'curl' && W > .05; });
  if (T && T.name === 'curl') {
    // alternating dumbbell curls, elbows pinned to his sides
    const ph = k * 2.3, cl = Math.max(0, Math.sin(ph)), cr = Math.max(0, -Math.sin(ph));
    mixR('leftUpperArm', -.1, 0, -1.42); mixR('rightUpperArm', -.1, 0, 1.42);
    mixR('leftLowerArm', 0, -.25 - 2.05 * cl, 0); mixR('rightLowerArm', 0, .25 + 2.05 * cr, 0);
    B('head').rotation.y = lerp(B('head').rotation.y, (cl - cr) * .25, W);
  }
  if (T && T.name === 'squat') {
    // bodyweight squats, arms out front for balance
    const d = (1 - Math.cos(k * 2.1)) / 2;
    mixR('leftUpperLeg', -1.35 * d, 0, .09); mixR('rightUpperLeg', -1.35 * d, 0, -.09);
    mixR('leftLowerLeg', 2.05 * d, 0, 0); mixR('rightLowerLeg', 2.05 * d, 0, 0);
    mixR('leftFoot', -.7 * d, 0, 0); mixR('rightFoot', -.7 * d, 0, 0);
    mixR('spine', .4 * d, 0, 0); mixR('head', -.3 * d, 0, 0);
    mixR('leftUpperArm', -1.45, 0, -1.4); mixR('rightUpperArm', -1.45, 0, 1.4); mixR('leftLowerArm', 0, -.1, 0); mixR('rightLowerArm', 0, .1, 0);
  }
  if (T && T.name === 'jacks') {
    // jumping jacks: arms over his head and feet apart on every hop
    const p = k * 3.3, o = (1 - Math.cos(p)) / 2;
    mixR('leftUpperArm', 0, 0, lerp(-1.42, 1.2, o)); mixR('rightUpperArm', 0, 0, lerp(1.42, -1.2, o));
    mixR('leftLowerArm', 0, 0, .15 * o); mixR('rightLowerArm', 0, 0, -.15 * o);
    mixR('leftUpperLeg', 0, 0, .03 + .24 * o); mixR('rightUpperLeg', 0, 0, -.03 - .24 * o);
    air = .07 * Math.abs(Math.sin(p)) * W;
  }
  if (T && T.name === 'watch') {
    // a glance at his watch
    mixR('leftUpperArm', -.3, 0, -1.3); mixR('leftLowerArm', 0, -1.35, 0); mixR('leftHand', 0, 0, .3);
    mixR('head', .45, .22, 0);
  }
  if (T && T.name === 'tie') {
    // straightens his tie
    const wig = Math.sin(k * 7) * .08;
    mixR('leftUpperArm', -.45, 0, -1.25); mixR('rightUpperArm', -.45, 0, 1.25);
    mixR('leftLowerArm', 0, -1.78, wig); mixR('rightLowerArm', 0, 1.78, wig);
    mixR('head', .1 - .1 * Math.sin(k * 3.5), 0, 0); hl = hr = lerp(hl, .45, W);
  }
  if (T && T.name === 'look') {
    // weight on one hip, looking round the shop
    mixR('hips', 0, 0, .05); mixR('head', 0, Math.sin(k * .9) * .45, 0);
  }
  if (T && T.name === 'browse') {
    // walks over to the jacket rail, looks through it, walks back
    const to = { x: -.6, z: -.55 }, walk = (u, from, dest) => { r.vrm.scene.position.x = lerp(from.x, dest.x, u); r.vrm.scene.position.z = lerp(from.z, dest.z, u); };
    let g = 0, face = 0;
    if (k < 2.2) { const u = ease(k / 2.2); walk(u, { x: 0, z: 0 }, to); g = k; face = Math.atan2(to.x, to.z) * Math.min(1, k / .4); }
    else if (k < 5.6) { walk(1, to, to); face = lerp(Math.atan2(to.x, to.z), Math.PI + .25, ease(clamp((k - 2.2) / .6, 0, 1))); const reach = Math.sin(clamp((k - 3) / 2, 0, 1) * Math.PI); mixR('rightUpperArm', -1.1 * reach, 0, 1.4 - .25 * reach); mixR('head', -.05, .2 * Math.sin(k * 1.5), 0); }
    else { const u = ease((k - 5.6) / 2.4); walk(u, to, { x: 0, z: 0 }); g = k; face = lerp(Math.atan2(-to.x, -to.z), 0, ease(clamp((k - 7.4) / .6, 0, 1))); }
    r.vrm.scene.rotation.y = face;
    if (g) gait(B, g * 5.8, k < 2.2 ? ramp(k, 0, 2.2) : ramp(k, 5.6, 8));
  }
  // a trip somewhere and back: face where you're going, walk forwards both ways, turn to camera at the end
  const trip = (to, k, len, stay0, stay1) => {
    const out = Math.atan2(to.x, to.z), home = Math.atan2(-to.x, -to.z), P = r.vrm.scene.position;
    if (k < stay0) { const u = ease(clamp((k - .25) / (stay0 - .25), 0, 1)); P.x = to.x * u; P.z = to.z * u; r.vrm.scene.rotation.y = out; if (k > .25) gait(B, k * 5.8, ramp(k, .25, stay0)); return 'out'; }
    if (k < stay1) { P.x = to.x; P.z = to.z; return 'there'; }
    const u = ease(clamp((k - stay1 - .35) / (len - stay1 - .95), 0, 1)); P.x = to.x * (1 - u); P.z = to.z * (1 - u);
    if (k < len - .6) { r.vrm.scene.rotation.y = home; if (k > stay1 + .35) gait(B, k * 5.8, ramp(k, stay1 + .35, len - .6)); } else r.vrm.scene.rotation.y = 0;
    return 'back';
  };
  // bending down to the ground (to the mug), right arm reaching for it
  const bend = (b) => {
    const R = n => B(n).rotation, mixB = (n, x, y, z) => { const o = R(n); o.set(lerp(o.x, x, b), lerp(o.y, y, b), lerp(o.z, z, b)); };
    mixB('leftUpperLeg', -.75, 0, .1); mixB('rightUpperLeg', -.75, 0, -.1); mixB('leftLowerLeg', 1.2, 0, 0); mixB('rightLowerLeg', 1.2, 0, 0); mixB('leftFoot', -.45, 0, 0); mixB('rightFoot', -.45, 0, 0);
    mixB('spine', .7, 0, 0); mixB('chest', .2, 0, 0); mixB('head', .15, 0, 0);
    mixB('rightUpperArm', -.55, 0, 1.4); mixB('rightLowerArm', 0, .15, 0);
  };
  if (r.mug) { const has = !!T && T.name === 'cocoa' && k > 2.2 && k < 7.55; r.mug.visible = has; world.campMug.visible = !has; }
  let yawn = 0;
  if (T && T.name === 'warm') {
    // walks over to the fire, leans in and warms his hands, then turns and walks back to the blanket
    const f = world.fire.position, to = { x: f.x - .62, z: f.z + .12 }, len = TASK_LEN.warm, face = Math.atan2(f.x - to.x, f.z - to.z);
    const leg = trip(to, k, len, 1.9, len - 2.1);
    let c = 0;
    if (leg === 'there') { r.vrm.scene.rotation.y = face; c = Math.min(1, (k - 1.9) / .6, (len - 2.1 - k) / .6); }
    if (c > 0) {
      const rub = Math.sin(k * 9) * .12, R = n => B(n).rotation, mixC = (n, x, y, z) => { const o = R(n); o.set(lerp(o.x, x, c), lerp(o.y, y, c), lerp(o.z, z, c)); };
      // standing, leaning in over the fire with his hands out (no squat)
      mixC('leftUpperLeg', -.12, 0, .08); mixC('rightUpperLeg', -.12, 0, -.08); mixC('leftLowerLeg', .18, 0, 0); mixC('rightLowerLeg', .18, 0, 0); mixC('leftFoot', -.06, 0, 0); mixC('rightFoot', -.06, 0, 0);
      mixC('spine', .38, 0, 0); mixC('chest', .12, 0, 0); mixC('head', .05, 0, 0);
      mixC('leftUpperArm', -1.05, 0, -1.28); mixC('rightUpperArm', -1.05, 0, 1.28); hl = lerp(hl, -.55 + .1 * Math.sin(k * 3), c); hr = lerp(hr, -.55 + .1 * Math.sin(k * 3 + 1), c); mixC('leftLowerArm', 0, -.55 + rub, 0); mixC('rightLowerArm', 0, .55 + rub, 0);
    }
  }
  if (T && T.name === 'cocoa') {
    // walks to the mug, bends and picks it up, drinks (cup right at his mouth, head tipping
    // into each sip), bends and puts it back on the snow, then walks back to the blanket
    const m = world.mugTop, d = Math.hypot(m.x, m.z) || 1, to = { x: m.x * (1 - .4 / d), z: m.z * (1 - .4 / d) }, len = TASK_LEN.cocoa, toMug = Math.atan2(m.x - to.x, m.z - to.z);
    const leg = trip(to, k, len, 1.6, 8.3);
    if (leg === 'there') {
      const down1 = Math.min(ramp(k, 1.6, 2.8, .45), 1), down2 = Math.min(ramp(k, 7.1, 8.3, .45), 1), drink = ramp(k, 2.8, 7.1, .5);
      r.vrm.scene.rotation.y = lerp(toMug, toMug - .9, drink);   // turns toward you while he drinks
      bend(Math.max(down1, down2));
      hr = lerp(hr, 1, Math.max(ramp(k, 1.9, 7.8, .3), 0));
      if (drink > 0) {
        const sip = Math.max(0, Math.sin((k - 2.8) * 1.5)), R = n => B(n).rotation, mixD = (n, x, y, z) => { const o = R(n); o.set(lerp(o.x, x, drink), lerp(o.y, y, drink), lerp(o.z, z, drink)); };
        mixD('rightUpperArm', -.9, 0, .76 - .06 * sip); mixD('rightLowerArm', 0, 2.3 + .17 * sip, 0);   // measured: rim at his lips on each sip mixD('rightHand', -.25 * sip, 0, 0);
        mixD('head', .12 - .22 * sip, -.12, 0); mixD('neck', .05, 0, 0);
      }
    }
  }
  if (T && T.name === 'stretch') {
    // a big yawn and a stretch, arms over his head
    const s = Math.sin(Math.PI * clamp(k / TASK_LEN.stretch, 0, 1));
    mixR('leftUpperArm', -.2, 0, lerp(-1.4, 1.15, s)); mixR('rightUpperArm', -.2, 0, lerp(1.4, -1.15, s));
    mixR('leftLowerArm', 0, 0, .3 * s); mixR('rightLowerArm', 0, 0, -.3 * s);
    mixR('spine', -.12 * s, 0, 0); mixR('head', -.35 * s, 0, 0); yawn = s;
  }
  if (T && T.name === 'stars') {
    // looks up at the stars, swaying a little
    mixR('head', -.5, Math.sin(k * .5) * .3, 0); mixR('spine', -.08, 0, Math.sin(k * .7) * .03);
  }
  hands(r.vrm, hl, hr);
  const bl = blinkAmount(dt);
  expr(r.vrm, { aa: yawn * .8, blink: sleepy ? Math.max(bl, .35) : bl, happy: a === 'wave' || a === 'flex' ? .8 : state.ctx.allDone ? .35 : 0, relaxed: sleepy ? .4 : 0 });
  return { air };
}
function sleepPose(r, t) {
  const { B } = r, br = Math.sin(t * 1.05);
  // every 16s or so he shifts: head rolls to the other side and the other knee comes up
  const cyc = (t / 16) % 2, v = REDUCED ? 0 : smooth(.0, .12, cyc) * (1 - smooth(1, 1.12, cyc)), nod = REDUCED ? 0 : Math.exp(-(((t % 23) - 11) ** 2) * 8) * .12;
  // asleep on his back on the blanket: one knee up, hands folded on his stomach, head turned to the fire
  r.vrm.scene.rotation.order = 'YXZ'; r.vrm.scene.rotation.set(-Math.PI / 2, SLEEP_YAW, 0);
  B('rightUpperLeg').rotation.set(lerp(-.75, -.1, v), 0, -.05); B('rightLowerLeg').rotation.x = lerp(1.35, .2, v); B('rightFoot').rotation.x = lerp(-.55, .3, v);
  B('leftUpperLeg').rotation.set(lerp(-.08, -.72, v), 0, .08); B('leftLowerLeg').rotation.x = lerp(.15, 1.3, v); B('leftFoot').rotation.x = lerp(.35, -.55, v);
  B('spine').rotation.x = -.03 + .035 * br; B('chest').rotation.x = .04 * br;   // slow, deep breaths
  B('head').rotation.set(-.15 + nod, lerp(-.35, .35, v), 0);   // turned toward the fire, then away when he shifts
  B('leftUpperArm').rotation.set(-.18, 0, -1.32); B('rightUpperArm').rotation.set(-.18, 0, 1.32);
  B('leftLowerArm').rotation.set(0, -.55, -1.25); B('rightLowerArm').rotation.set(0, .55, 1.25);   // forearms across his stomach
  B('leftHand').rotation.z = -.2; B('rightHand').rotation.z = .2; hands(r.vrm, .15, .2);
  expr(r.vrm, { blink: 1, relaxed: .7 });
  return { air: 0 };
}
// Follow-through: each joint (and his heading) moves toward this frame's pose at a rate
// instead of jumping to it, which blends every change of move and softens the mechanical look.
// how quickly each part catches up: legs are quick (no sliding feet), head and hands trail
const LAG = { hips: 1.3, leftUpperLeg: 1.6, rightUpperLeg: 1.6, leftLowerLeg: 1.6, rightLowerLeg: 1.6, leftFoot: 1.6, rightFoot: 1.6, neck: .8, head: .65, leftUpperArm: .85, rightUpperArm: .85, leftLowerArm: .7, rightLowerArm: .7, leftHand: .5, rightHand: .5 };
const SMOOTH = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head', 'leftShoulder', 'rightShoulder', 'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot'];
function smoothPose(r, dt, k) {
  if (REDUCED) return;
  r.prevQ = r.prevQ || new Map();
  for (const n of SMOOTH) {
    const b = r.B(n); if (!b) continue;
    const a = 1 - Math.exp(-k * (LAG[n] || 1) * dt);
    const p = r.prevQ.get(n);
    if (!p) { r.prevQ.set(n, b.quaternion.clone()); continue; }
    p.slerp(b.quaternion, a); b.quaternion.copy(p);
  }
  if (r.key !== 'ski' && r.vrm.scene.rotation.order === 'XYZ') {   // his heading turns, it doesn't snap
    const y = r.vrm.scene.rotation.y; r.yawS = r.yawS ?? y;
    r.yawS += Math.atan2(Math.sin(y - r.yawS), Math.cos(y - r.yawS)) * (1 - Math.exp(-7 * dt)); r.vrm.scene.rotation.y = r.yawS;
  }
}
// sit the lowest foot (or the seat, when sitting) on the snow
function ground(r, air, sit) {
  r.vrm.scene.position.y = 0;
  if (sit) {
    r.vrm.scene.position.x = r.vrm.scene.position.z = 0; r.vrm.scene.updateMatrixWorld(true);
    const hp = r.R('hips').getWorldPosition(_v);
    r.vrm.scene.position.x = -hp.x; r.vrm.scene.position.z = -hp.z; r.vrm.scene.updateMatrixWorld(true);
    const y = ['hips', 'chest', 'upperChest', 'head'].map(n => r.R(n) ? r.R(n).getWorldPosition(_w).y - (n === 'head' ? .1 : .11) : 9);
    r.vrm.scene.position.y = .03 - Math.min(...y);   // on top of the blanket (and the pillow under his head)
    return;
  }
  r.vrm.scene.updateMatrixWorld(true);
  let low = Math.min(r.R('leftFoot').getWorldPosition(_v).y, r.R('rightFoot').getWorldPosition(_w).y) - r.footRest;
  
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
  if ((state.mode === 'sleep' || dexPrefs().look === 'sleep') && !(state.wokeAt && now - state.wokeAt < 60000)) { state.wokeAt = now; state.task = { kind: 'sleep', name: 'stretch', t: 0 }; state.lastTask = 'stretch'; say(state.mode === 'sleep' ? 'Oh! Still up? Get some sleep.' : 'Mm… cocoa?'); return; }
  if (want() === 'ski') { if (state.taps.length >= 2) { play('spin'); say(state.ctx.allDone ? 'Everything done. Send it.' : 'Send it!', 2400); } else { play('hop'); nextLine(); } }
  else { play(want() === 'gym' ? 'flex' : 'wave'); nextLine(); }
  navigator.vibrate && navigator.vibrate(8);
}
function bind() {
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect(); state.pointerAt = performance.now();
    state.lookT.x = clamp(((e.clientX - r.left) / r.width - .5) * 2.2, -1, 1); state.lookT.y = clamp(((e.clientY - r.top) / r.height - .35) * 2, -1, 1);
    const d = state.drag;
    if (d) { state.touchAt = performance.now(); const dx = e.clientX - d.x; d.moved = Math.max(d.moved, Math.abs(dx), Math.abs(e.clientY - d.y)); if (d.moved > 8) state.orbit = d.orbit - dx * .008; }   // all the way round if you like
    wake();
  });
  cv.addEventListener('pointerdown', e => { state.touchAt = performance.now(); state.drag = { x: e.clientX, y: e.clientY, orbit: state.orbit, moved: 0 }; wake(); });
  const up = cancel => { const d = state.drag; state.drag = null; if (d && d.moved > 8) { state.orbit = Math.atan2(Math.sin(state.orbit), Math.cos(state.orbit)); try { localStorage.setItem('daybook_orbit', String(state.orbit)); } catch (e) {} } if (d && !cancel && d.moved <= 8) tap(); wake(); };
  cv.addEventListener('pointerup', () => up(false));
  cv.addEventListener('pointercancel', () => up(true));
  cv.addEventListener('pointerleave', () => { state.pointerAt = 0; });
}

/* ---------- lifecycle ---------- */
function size() {
  if (!wrap || !wrap.isConnected) return;
  const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  const need = camera.aspect < 1 ? Math.max(3.0, 1.6 / camera.aspect) : Math.max(3.6, 2.3 / camera.aspect);   // phones: fit his height, let the scene run off the sides   // metres of scene to fit top to bottom
  camera.userData.dist = need / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.userData.small = h < 260;   // the floating window on a page: frame him, not the scene
  camera.updateProjectionMatrix();
  pointScale = h * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  // every particle pool is sized to the canvas (the floating window is much smaller than the stage)
  [world.flakes, world.spray, world.stars, world.sparks, world.dust, world.steam].forEach(f => { if (f) f.p.material.uniforms.scale.value = pointScale; });
  // draw once now, replacing any pending frame so there's never more than one loop running
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
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
  const sit = !!rider && rider.key === 'sleep' && (state.mode === 'sleep' || dexPrefs().look === 'sleep') && !woke;
  if (performance.now() - state.pointerAt > 2600) { state.lookT.x = Math.sin(t * .35) * .25; state.lookT.y = 0; }
  state.look.x = damp(state.look.x, state.lookT.x, 6, dt); state.look.y = damp(state.look.y, state.lookT.y, 6, dt);
  stepWorld(dt, skiing);
  stepSettings(dt, t);
  if (rider) {
    const r = rider; r.vrm.humanoid.resetNormalizedPose();
    autonomous(dt);
    let res;
    if (r.key === 'ski') res = skiPose(r, t, dt);
    else if (sit) res = sleepPose(r, t);
    else { stepTask(r.key, dt); res = standPose(r, t, dt, r.key === 'sleep', r.key === 'gym'); }
    if (state.act) { state.actT += dt; if (state.actT > ACTS[state.act]) state.act = null; }
    smoothPose(r, dt, r.key === 'ski' ? 16 : state.act || (state.task && state.task.name === 'jacks') ? 18 : sit ? 5 : 9);
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
  // left alone for a few seconds, the camera slowly walks round him (a turn every ~90s)
  if (!REDUCED && !state.drag && !state.wardrobe && !camera.userData.small && now - state.touchAt > 6000) state.orbit += dt * .07;
  const dist = (state.camDist || camera.userData.dist || 7) * (sit ? (camera.aspect < 1 ? 1.05 : .78) : 1) * (camera.userData.small ? .62 : 1), a = (skiing ? .5 : sit ? .95 : .32) + state.orbit, el = skiing ? .17 : sit ? .5 : .1;
  const lift = state.wardrobe && innerWidth <= 760 ? .62 : 0;   // wardrobe open: frame him in the top half, above the sheet
  const ty = -lift + (state.camY || (sit ? .25 : skiing ? 1.02 : .92)), tx0 = rider ? rider.vrm.scene.position.x : 0, tz0 = rider && !sit ? rider.vrm.scene.position.z : 0;
  // the camera drifts after him when he walks somewhere (the fire, the jacket rail) or carves
  state.fx = damp(state.fx ?? tx0, tx0, 2.5, dt); state.fz = damp(state.fz ?? tz0, tz0, 2.5, dt);
  const tx = skiing ? state.fx * .55 : state.fx * .8;
  const tz = sit ? -.4 : state.fz * .8;
  // a slow handheld drift, for the lofi feel
  const da = REDUCED ? 0 : .035 * Math.sin(t * .13) + .015 * Math.sin(t * .31), de = REDUCED ? 0 : .012 * Math.sin(t * .09);
  camera.position.set(tx + Math.sin(a + da) * Math.cos(el + de) * dist, ty + Math.sin(el + de) * dist, tz + Math.cos(a + da) * Math.cos(el + de) * dist);
  camera.lookAt(tx, ty - .05, tz);
  renderer.render(scene, camera);
  placeBubble();
  zEl.classList.toggle('on', sit);
  if (live() && (!REDUCED || state.act || state.drag || loading)) raf = requestAnimationFrame(frame);
}

function mount(slot) {
  if (!ok || !slot) return;
  if (!wrap) {
    try { buildScene(); setEnv(want()); } catch (e) { ok = false; slot.classList.add('no3d'); console.warn('3D unavailable', e); return; }
    wrap = document.createElement('div'); wrap.className = 'bd';
    cv.style.transition = 'opacity .28s ease';
    bgEl = document.createElement('div'); bgEl.style.cssText = 'position:absolute;inset:0;opacity:0;transition:opacity .6s ease;pointer-events:none';
    wrap.append(bgEl, cv); cv.style.position = 'relative';
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
  if (JSON.stringify(prev.dex || {}) !== JSON.stringify(state.ctx.dex || {})) applyDex();
  if (renderer && ok) ensureRider();   // start fetching the right outfit now, not on the next frame
  wake();
}
function wardrobe(on) { state.wardrobe = !!on; wake(); }
function resetView() { state.orbit = 0; try { localStorage.removeItem('daybook_orbit'); } catch (e) {} wake(); }
window.Buddy = { mount, update, say, play, wardrobe, resetView, get _() { return { camera, scene, state, world, rider: () => rider, frame }; } };
const slot0 = document.querySelector('#buddySlot'); if (slot0) mount(slot0);
