/* Dex — the Daybook buddy, a little skier.
   A 3D toy that lives on the Today stage. It idles, skates around, looks at your
   finger and reacts to your day: ski-prep squats in a tuck on training days,
   skates in place with goggles down while you're on the clock, does a 360 when
   the list is clear, and sits back on its skis to sleep at night. Tap it to make
   it hop and say something useful, tap the pompom to boing it, tap the snow and it
   skates there, drag it to spin it. The page feeds it context via window.buddyContext(). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SMALL = innerWidth < 700;
const COL = { jacket: 0xff3d1f, pants: 0x27305a, skin: 0xf2c3a0, beanie: 0x12a88a, cuff: 0xf4f1ea, pom: 0xfdfbf6, mitt: 0x12a88a, collar: 0xf4f1ea, hair: 0x5a3a26, strap: 0x1c2033, lens: 0xff8a3d, boot: 0xf5f5f7, buckle: 0x21b89a, ski: 0xffd23f, grip: 0x1c2033 };
const HIP = .56;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

let renderer, scene, camera, wrap, cv, sayEl, zEl, raf = 0, last = 0, inView = true, ok = true;
const rig = {}, face = {}, pose = {}, state = {
  mode: 'idle', act: null, actT: 0, next: 3, yaw: 0, spin: 0, spinV: 0, x: 0, z: 0, tx: null, tz: 0,
  look: { x: 0, y: 0 }, lookT: { x: 0, y: 0 }, pointerAt: 0, blink: 0, blinkAt: 2, antenna: { a: 0, v: 0, b: 0, w: 0 }, hipV: 0, lastHip: 0,
  lineI: 0, sayUntil: 0, drag: null, taps: [], ctx: {},
};

/* ---------- build ---------- */
function mat(color, o = {}) { return new THREE.MeshPhysicalMaterial({ color, roughness: .38, clearcoat: .55, clearcoatRoughness: .3, ...o }); }
function mesh(geo, m, parent, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me; }

function buildScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  cv = renderer.domElement;
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  camera = new THREE.PerspectiveCamera(28, 1, .1, 60);

  scene.add(new THREE.HemisphereLight(0xc8dcff, 0x1a2036, .55));
  const key = new THREE.DirectionalLight(0xfff1e0, 2.4); key.position.set(2.6, 5.2, 3.6); key.castShadow = true;
  key.shadow.mapSize.set(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048); key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -3; key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fb0ff, 1.6); rim.position.set(-3.5, 2.8, -3); scene.add(rim);
  const warm = new THREE.PointLight(0xff9a6a, 3, 6); warm.position.set(1.8, .6, 1.6); scene.add(warm);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: .38 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor); rig.floor = floor;

  buildBuddy();
}

function buildBuddy() {
  const root = rig.root = new THREE.Group(); scene.add(root);
  const hips = rig.hips = new THREE.Group(); hips.position.y = HIP; root.add(hips);
  const jacket = mat(COL.jacket, { roughness: .5, clearcoat: .35 });
  const pants = mat(COL.pants, { roughness: .6, clearcoat: .15 });
  const skin = mat(COL.skin, { roughness: .55, clearcoat: .1 });
  const knit = mat(COL.beanie, { roughness: .8, clearcoat: 0 });
  const mitt = mat(COL.mitt, { roughness: .7, clearcoat: .1 });
  // pants
  mesh(new RoundedBoxGeometry(.62, .28, .48, 5, .13), pants, hips, 0, .05, 0);
  // legs, boots, skis
  const leg = side => {
    const piv = new THREE.Group(); piv.position.set(side * .16, -.02, 0); hips.add(piv);
    mesh(new THREE.CapsuleGeometry(.105, .16, 6, 14), pants, piv, 0, -.17, 0);
    const boot = mesh(new RoundedBoxGeometry(.22, .23, .32, 4, .07), mat(COL.boot, { roughness: .3, clearcoat: .8 }), piv, 0, -.42, .02);
    mesh(new RoundedBoxGeometry(.235, .04, .12, 2, .015), mat(COL.buckle, { metalness: .3 }), piv, 0, -.36, .06);
    const ski = new THREE.Group(); ski.position.set(0, -.545, .1); piv.add(ski);
    const skiMat = mat(COL.ski, { roughness: .25, clearcoat: 1 });
    mesh(new RoundedBoxGeometry(.16, .035, 1.25, 2, .015), skiMat, ski, 0, 0, 0);
    const tip = mesh(new RoundedBoxGeometry(.16, .035, .26, 2, .015), skiMat, ski, 0, .05, .7); tip.rotation.x = -.45;
    mesh(new RoundedBoxGeometry(.165, .012, 1.2, 1, .005), mat(0x1c2033, { clearcoat: 0 }), ski, 0, -.018, 0);
    return { piv, boot, ski };
  };
  rig.legL = leg(-1); rig.legR = leg(1);
  // puffy jacket
  const body = rig.body = new THREE.Group(); body.position.y = .42; hips.add(body);
  rig.shell = mesh(new RoundedBoxGeometry(.74, .64, .56, 7, .25), jacket, body);
  [-.1, .1].forEach(y => { const r = mesh(new THREE.TorusGeometry(.33, .018, 8, 40), jacket, body, 0, y, 0); r.rotation.x = Math.PI / 2; r.scale.set(1.08, .82, 1); });
  mesh(new RoundedBoxGeometry(.03, .5, .02, 1, .01), mat(0x2a2f45, { clearcoat: 0 }), body, 0, -.02, .28);
  const collar = mesh(new THREE.TorusGeometry(.2, .07, 12, 32), mat(COL.collar, { roughness: .8, clearcoat: 0 }), body, 0, .3, 0); collar.rotation.x = Math.PI / 2;
  // three patches on the jacket: hours, training, applications
  rig.leds = [0x64d2ff, 0xff9f0a, 0x30d158].map((c, i) => {
    const m = new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    const led = mesh(new THREE.CylinderGeometry(.038, .038, .02, 18), m, body, .12 + i * .075, .1 - i * .018, .275); led.rotation.x = Math.PI / 2 - .12; led.castShadow = false;
    led.userData = { base: new THREE.Color(c), dim: new THREE.Color(c).multiplyScalar(.2) };
    return led;
  });
  // head
  const head = rig.head = new THREE.Group(); head.position.y = .64; body.add(head);
  mesh(new THREE.SphereGeometry(.36, 40, 30), skin, head);
  [-1, 1].forEach(s => mesh(new THREE.SphereGeometry(.07, 16, 12), skin, head, s * .35, -.02, 0));
  face.canvas = document.createElement('canvas'); face.canvas.width = 512; face.canvas.height = 256;
  face.ctx = face.canvas.getContext('2d'); face.tex = new THREE.CanvasTexture(face.canvas); face.tex.colorSpace = THREE.SRGBColorSpace; face.tex.anisotropy = 4;
  const decal = new THREE.Mesh(new THREE.SphereGeometry(.362, 40, 20, Math.PI / 2 - .8, 1.6, .95, 1.05), new THREE.MeshStandardMaterial({ map: face.tex, transparent: true, roughness: .6, depthWrite: false }));
  head.add(decal); rig.screen = decal;
  // hair poking out under the beanie
  const hair = mat(COL.hair, { roughness: .8, clearcoat: 0 });
  [[-.31, .06, .12, .9], [.31, .06, .12, -.9], [-.2, .07, -.27, .4], [.2, .07, -.27, -.4], [0, .08, -.33, 0]].forEach(([x, y, z, r]) => { const h = mesh(new THREE.SphereGeometry(.08, 12, 10), hair, head, x, y, z); h.scale.set(1.2, .6, .7); h.rotation.z = r; });
  // beanie, cuff, pompom on a spring
  mesh(new THREE.SphereGeometry(.38, 40, 20, 0, Math.PI * 2, 0, Math.PI * .44), knit, head, 0, .04, 0);
  const cuff = mesh(new THREE.TorusGeometry(.365, .06, 12, 48), mat(COL.cuff, { roughness: .9, clearcoat: 0 }), head, 0, .15, 0); cuff.rotation.x = Math.PI / 2;
  const pom = rig.antenna = new THREE.Group(); pom.position.set(0, .41, 0); head.add(pom);
  rig.tipMat = mat(COL.pom, { roughness: 1, clearcoat: 0 });
  rig.tip = mesh(new THREE.IcosahedronGeometry(.11, 2), rig.tipMat, pom, 0, .08, 0);
  // goggles: they sit on the beanie and drop over the eyes when it's time to focus
  const gog = rig.goggles = new THREE.Group(); head.add(gog);
  const strap = mesh(new THREE.TorusGeometry(.395, .03, 8, 48), mat(COL.strap, { roughness: .6, clearcoat: 0 }), gog, 0, .03, 0); strap.rotation.x = Math.PI / 2;
  mesh(new RoundedBoxGeometry(.5, .19, .1, 4, .07), mat(0xffffff, { roughness: .2 }), gog, 0, .03, .375);
  const lens = mesh(new RoundedBoxGeometry(.46, .15, .06, 4, .06), new THREE.MeshPhysicalMaterial({ color: COL.lens, metalness: .9, roughness: .08, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1 }), gog, 0, .03, .415);
  lens.castShadow = false;
  // puffy arms, mittens, poles
  const arm = side => {
    const piv = new THREE.Group(); piv.position.set(side * .37, .15, 0); body.add(piv);
    mesh(new THREE.CapsuleGeometry(.095, .2, 6, 14), jacket, piv, 0, -.18, 0);
    const hand = mesh(new THREE.SphereGeometry(.105, 20, 16), mitt, piv, 0, -.38, .02);
    const pole = new THREE.Group(); pole.position.set(0, -.38, .02); pole.rotation.x = .08; piv.add(pole);
    const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced9, metalness: .85, roughness: .25 });
    mesh(new THREE.CylinderGeometry(.045, .04, .16, 12), mat(COL.grip), pole, 0, .02, 0);
    mesh(new THREE.CylinderGeometry(.014, .012, 1.0, 8), steel, pole, 0, -.5, 0);
    const basket = mesh(new THREE.TorusGeometry(.06, .012, 6, 18), mat(COL.grip), pole, 0, -.9, 0); basket.rotation.x = Math.PI / 2;
    return { piv, hand, pole };
  };
  rig.armL = arm(-1); rig.armR = arm(1);
  rig.hit = [rig.shell, rig.head.children[0], decal, rig.armL.hand, rig.armR.hand];
}

/* ---------- the face ---------- */
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * .35); c.bezierCurveTo(x - s, y - s * .35, x - s * .45, y - s, x, y - s * .45); c.bezierCurveTo(x + s * .45, y - s, x + s, y - s * .35, x, y + s * .35); c.fill(); }
let faceKey = '';
// The decal is wider on the canvas than on the head, so everything is drawn squeezed sideways.
function drawFace(expr, lx, ly, blink) {
  const key = `${expr}|${lx.toFixed(2)}|${ly.toFixed(2)}|${blink.toFixed(2)}`;
  if (key === faceKey) return; faceKey = key;
  const c = face.ctx, W = 512, H = 256;
  c.clearRect(0, 0, W, H);
  c.save(); c.translate(W / 2, 0); c.scale(.76, 1);
  const ink = '#1b1f2e', ex = 92, cx = lx * 24, cy = 128 + ly * 10;
  c.fillStyle = c.strokeStyle = ink; c.lineCap = 'round'; c.lineJoin = 'round';
  // cheeks
  c.fillStyle = expr === 'happy' || expr === 'love' || expr === 'stretch' ? 'rgba(255,110,120,.55)' : 'rgba(255,120,120,.28)';
  c.beginPath(); c.ellipse(cx - 170, cy + 52, 38, 22, 0, 0, 7); c.ellipse(cx + 170, cy + 52, 38, 22, 0, 0, 7); c.fill();
  c.fillStyle = ink; c.lineWidth = 13;
  const eye = x => {
    if (expr === 'happy' || expr === 'stretch') { c.beginPath(); c.arc(x, cy + 18, 38, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); return; }
    if (expr === 'sleep') { c.beginPath(); c.arc(x, cy - 8, 36, Math.PI * .15, Math.PI * .85); c.stroke(); return; }
    if (expr === 'love') { c.fillStyle = '#ff4f7a'; heart(c, x, cy + 8, 52); c.fillStyle = ink; return; }
    let w = 58, h = 80;
    if (expr === 'surprised') { w = 72; h = 84; }
    if (expr === 'tired') h = 34;
    h = Math.max(6, h * (1 - blink));
    roundRect(c, x - w / 2, cy - h / 2, w, h, Math.min(w, h) / 2); c.fill();
    if (h > 22) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x - w * .18 + lx * 3, cy - h * .2, 11, 0, 7); c.fill(); c.beginPath(); c.arc(x + w * .15, cy + h * .18, 5, 0, 7); c.fill(); c.fillStyle = ink; }
    if (expr === 'tired') { c.lineWidth = 8; c.beginPath(); c.moveTo(x - 28, cy - 18); c.lineTo(x + 28, cy - 18); c.stroke(); c.lineWidth = 13; }
  };
  eye(cx - ex); eye(cx + ex);
  const my = cy + 76; c.lineWidth = 11; c.beginPath();
  if (expr === 'surprised') { c.ellipse(cx, my, 14, 17, 0, 0, 7); c.fill(); }
  else if (expr === 'happy' || expr === 'love' || expr === 'stretch') { c.moveTo(cx - 34, my - 8); c.quadraticCurveTo(cx, my + 32, cx + 34, my - 8); c.closePath(); c.fill(); c.fillStyle = '#ff7b8a'; c.beginPath(); c.ellipse(cx, my + 8, 12, 6, 0, 0, 7); c.fill(); }
  else if (expr === 'focus') { c.moveTo(cx - 20, my); c.quadraticCurveTo(cx, my - 5, cx + 20, my); c.stroke(); }
  else if (expr === 'sleep' || expr === 'tired') { c.moveTo(cx - 12, my); c.quadraticCurveTo(cx, my + 6, cx + 12, my); c.stroke(); }
  else { c.moveTo(cx - 24, my - 4); c.quadraticCurveTo(cx, my + 14, cx + 24, my - 4); c.stroke(); }
  c.restore();
  face.tex.needsUpdate = true;
}

/* ---------- behaviour ---------- */
const ACTS = {
  wave: 2.4, jump: 1, dance: 3.4, lift: 4.6, look: 2.2, stretch: 2.6, boing: 1.2, stroll: 99,
};
function play(name) {
  if (REDUCED && name !== 'jump') return;
  state.act = name; state.actT = 0;
}
function strollTo(x, z) { state.tx = clamp(x, -1.15, 1.15); state.tz = clamp(z, -.5, .8); play('stroll'); }
function autonomous(dt) {
  if (REDUCED || state.act || state.drag || state.mode !== 'idle') return;
  state.next -= dt; if (state.next > 0) return;
  state.next = 4 + Math.random() * 5;
  const c = state.ctx, r = Math.random();
  if (c.training && r < .3) return play('lift');
  if (r < .45) return strollTo((Math.random() * 2 - 1) * 1.05, Math.random() * .6 - .2);
  if (r < .65) return play('look');
  if (r < .8) return play('stretch');
  if (r < .9) return play('wave');
  play(c.allDone ? 'dance' : 'look');
}

function baseExpr() {
  const c = state.ctx;
  if (state.mode === 'sleep') return 'sleep';
  if (state.mode === 'work') return 'focus';
  if (c.allDone) return 'happy';
  if (c.late) return 'tired';
  return 'idle';
}

// A skating stride: one ski pushes out while the poles swing.
function skate(P, w, amt = 1) {
  const s = Math.sin(w);
  P.lLz = -(.06 + .28 * Math.max(0, s)) * amt; P.lRz = (.06 + .28 * Math.max(0, -s)) * amt;
  P.aLx = (-.2 - s * .55) * amt; P.aRx = (-.2 + s * .55) * amt;
  P.tiltZ = s * .12 * amt; P.hipY += Math.abs(Math.cos(w)) * .03 * amt - .03 * amt; P.tiltX = .12 * amt;
}

function computePose(t, dt) {
  const P = { hipY: HIP, tiltZ: 0, tiltX: 0, sq: 1, aLx: 0, aLz: -.28, aRx: 0, aRz: .28, lLx: 0, lRx: 0, lLz: -.04, lRz: .04, yaw: .42, headX: 0, gog: 0, expr: baseExpr() };
  const br = Math.sin(t * 2.1);
  P.hipY += br * .01; P.sq = 1 + br * .014; P.aLz -= br * .03; P.aRz += br * .03;
  if (state.mode === 'sleep') {
    // sitting back on the skis, tips in the air
    P.hipY = .2 + Math.sin(t * .9) * .01; P.lLx = P.lRx = -1.35; P.tiltX = -.18; P.headX = .22; P.aLz = -.6; P.aRz = .6; P.aLx = P.aRx = .3; P.sq = 1 + Math.sin(t * .9) * .02;
  }
  if (state.mode === 'work' && !state.act) { skate(P, t * 4.6); P.yaw = .55; P.gog = 1; }
  const a = state.act, k = state.actT;
  if (a) {
    const d = ACTS[a], u = clamp(k / d, 0, 1), inW = clamp(k / .25, 0, 1), outW = a === 'stroll' ? 1 : clamp((d - k) / .3, 0, 1), W = ease(Math.min(inW, outW));
    const mix = (key, v) => { P[key] = lerp(P[key], v, W); };
    if (a === 'wave') { mix('aRz', 2.55 + Math.sin(k * 11) * .3); mix('aRx', -.2); mix('tiltZ', -.06); P.expr = 'happy'; }
    if (a === 'stretch') { mix('aLz', -2.9); mix('aRz', 2.9); mix('sq', 1.06); mix('hipY', HIP + .04); P.expr = 'stretch'; }
    if (a === 'look') { const s = Math.sin(u * Math.PI * 2); mix('yaw', s * .7); state.lookT.x = s; }
    if (a === 'lift') {
      // ski-prep squats in a racer's tuck
      const q = (1 - Math.cos(k * 3)) / 2;
      const lx = -.3 - q * .5; mix('hipY', .545 * Math.cos(lx) + .02); mix('tiltX', .3 + q * .35); mix('lLx', lx); mix('lRx', lx);
      mix('aLx', -1.1 - q * .3); mix('aRx', -1.1 - q * .3); mix('aLz', -.15); mix('aRz', .15); mix('headX', -.2 - q * .2); mix('gog', 1); P.expr = 'focus';
    }
    if (a === 'jump') {
      let y = HIP, s = 1;
      if (u < .16) { const q = u / .16; y = HIP - .1 * q; s = 1 - .1 * q; }
      else if (u < .68) { const q = (u - .16) / .52; y = HIP - .1 + Math.sin(q * Math.PI) * .6; s = 1.06 - .06 * q; P.aLz = -2.3; P.aRz = 2.3; P.lLx = P.lRx = -.35 * Math.sin(q * Math.PI); }
      else if (u < .84) { const q = (u - .68) / .16; y = HIP - .1 + .1 * q; s = .9 + .1 * q; }
      P.hipY = y; P.sq = s; P.expr = u < .3 ? 'surprised' : 'happy';
    }
    if (a === 'boing') { P.expr = 'surprised'; mix('tiltZ', Math.sin(k * 14) * .12 * (1 - u)); }
    if (a === 'dance') {
      const b = k * 7.5; mix('hipY', HIP + Math.abs(Math.sin(b)) * .16); mix('tiltZ', Math.sin(b) * .2); mix('aLz', -1.6 - Math.sin(b) * 1.1); mix('aRz', 1.6 - Math.sin(b) * 1.1);
      if (u > .6) P.yaw += ease((u - .6) / .4) * Math.PI * 2; // a 360 on the skis
      P.expr = 'love';
    }
    if (a === 'stroll') {
      const dx = state.tx - state.x, dz = state.tz - state.z, dist = Math.hypot(dx, dz);
      if (dist < .03) { state.act = null; state.lookT.x = 0; }
      else {
        const sp = Math.min(dist, .95 * dt); state.x += dx / dist * sp; state.z += dz / dist * sp;
        skate(P, t * 5.5); P.yaw = Math.atan2(dx, dz); P.gog = 1;
      }
    }
    state.actT += dt;
    if (state.act && a !== 'stroll' && state.actT > d) state.act = null;
  }
  return P;
}

function applyPose(P, dt, t) {
  const k = 12;
  pose.hipY = damp(pose.hipY ?? P.hipY, P.hipY, k, dt);
  rig.hips.position.y = pose.hipY;
  state.hipV = (pose.hipY - state.lastHip) / Math.max(dt, .001); state.lastHip = pose.hipY;
  for (const key of ['tiltZ', 'tiltX', 'sq', 'aLx', 'aLz', 'aRx', 'aRz', 'lLx', 'lRx', 'lLz', 'lRz', 'headX']) pose[key] = damp(pose[key] ?? P[key], P[key], k, dt);
  pose.gog = damp(pose.gog ?? P.gog, P.gog, 6, dt);
  const lookYaw = state.act === 'stroll' || state.mode === 'work' ? 0 : state.look.x * .3;
  pose.yaw = damp(pose.yaw ?? 0, P.yaw + lookYaw * .4, 7, dt);
  if (!state.drag) { state.spin += state.spinV * dt; state.spinV *= Math.exp(-dt * 2.2); if (Math.abs(state.spinV) < .4) state.spin = damp(state.spin, Math.round(state.spin / (Math.PI * 2)) * Math.PI * 2, 3, dt); }
  rig.root.rotation.y = pose.yaw + state.spin;
  rig.root.position.set(state.x, 0, state.z);
  rig.body.rotation.z = pose.tiltZ; rig.body.rotation.x = pose.tiltX;
  rig.body.scale.set(1 + (1 - pose.sq) * .6, pose.sq, 1 + (1 - pose.sq) * .6);
  // the head turns toward your finger more than the body does
  rig.head.rotation.set(pose.headX + state.look.y * .15, state.look.x * .45, -pose.tiltZ * .4);
  rig.goggles.rotation.x = lerp(-.62, 0, pose.gog);
  rig.armL.piv.rotation.set(pose.aLx, 0, pose.aLz); rig.armR.piv.rotation.set(pose.aRx, 0, pose.aRz);
  // keep the poles pointing at the snow whatever the arms are doing
  rig.armL.pole.rotation.x = .1 - pose.aLx * .75; rig.armR.pole.rotation.x = .1 - pose.aRx * .75;
  rig.armL.pole.rotation.z = -pose.aLz * .6; rig.armR.pole.rotation.z = -pose.aRz * .6;
  rig.legL.piv.rotation.set(pose.lLx, 0, pose.lLz); rig.legR.piv.rotation.set(pose.lRx, 0, pose.lRz);
  // skis stay flat on the snow when a leg swings out
  rig.legL.ski.rotation.set(-pose.lLx, 0, -pose.lLz); rig.legR.ski.rotation.set(-pose.lRx, 0, -pose.lRz);
  // pompom: a damped spring kicked by movement
  const A = state.antenna, acc = -state.hipV * 2.4;
  A.v += (-55 * A.a - 4.5 * A.v + acc) * dt; A.a += A.v * dt;
  A.w += (-45 * A.b - 4 * A.w + (state.act === 'stroll' ? Math.sin(t * 5.5) * 5 : 0) - pose.tiltZ * 12) * dt; A.b += A.w * dt;
  rig.antenna.rotation.x = clamp(A.a, -.9, .9); rig.antenna.rotation.z = clamp(A.b, -.9, .9);
  const leds = state.ctx.leds || [0, 0, 0];
  rig.leds.forEach((l, i) => { const v = clamp(leds[i] || 0, 0, 1), p = .55 + .45 * Math.sin(t * 2.4 + i); l.material.color.copy(l.userData.dim).lerp(l.userData.base, v >= 1 ? 1 : v * p); });
  state.blinkAt -= dt;
  if (state.blinkAt < 0) { state.blink = 1; state.blinkAt = 2.2 + Math.random() * 3.5; }
  state.blink = Math.max(0, state.blink - dt * 7);
  const bl = state.blink > .5 ? (1 - state.blink) * 2 : state.blink * 2;
  if (performance.now() - state.pointerAt > 2600 && state.act !== 'look') { state.lookT.x = Math.sin(t * .35) * .25; state.lookT.y = 0; }
  state.look.x = damp(state.look.x, state.lookT.x, 6, dt); state.look.y = damp(state.look.y, state.lookT.y, 6, dt);
  drawFace(P.expr, state.look.x, state.look.y, P.expr === 'idle' || P.expr === 'focus' ? bl : 0);
}

/* ---------- speech ---------- */
function say(text, ms = 4200) {
  if (!sayEl || !text) return;
  sayEl.innerHTML = `<span>${text}</span>`;
  sayEl.classList.remove('on'); void sayEl.offsetWidth; sayEl.classList.add('on');
  state.sayUntil = performance.now() + ms;
}
function nextLine() {
  const lines = state.ctx.lines || [];
  if (!lines.length) return;
  say(lines[state.lineI % lines.length]); state.lineI++;
}
const headPos = new THREE.Vector3();
function placeBubble() {
  if (!sayEl) return;
  if (state.sayUntil && performance.now() > state.sayUntil) { sayEl.classList.remove('on'); state.sayUntil = 0; }
  if (!sayEl.classList.contains('on') && !zEl.classList.contains('on')) return;
  rig.tip.getWorldPosition(headPos); headPos.y += .12; headPos.project(camera);
  const W = wrap.clientWidth, x = Math.min(W - 118, Math.max(118, (headPos.x * .5 + .5) * W)), y = Math.max(128, (-headPos.y * .5 + .5) * wrap.clientHeight);
  sayEl.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  zEl.style.transform = `translate(${(x + 14).toFixed(1)}px,${(y + 10).toFixed(1)}px)`;
}

/* ---------- input ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPt = new THREE.Vector3(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function toNdc(e) { const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); return r; }
function bind() {
  cv.addEventListener('pointermove', e => {
    const r = toNdc(e); state.pointerAt = performance.now();
    // eyes follow the finger, measured from the face
    rig.screen.getWorldPosition(headPos); headPos.project(camera);
    state.lookT.x = clamp((ndc.x - headPos.x) * 2.2, -1, 1); state.lookT.y = clamp(-(ndc.y - headPos.y) * 1.6, -1, 1);
    const d = state.drag;
    if (d) { const dx = e.clientX - d.x; d.moved = Math.max(d.moved, Math.abs(dx), Math.abs(e.clientY - d.y)); if (d.onBody && d.moved > 8) { state.spin = d.spin + dx * .018; state.spinV = (e.clientX - d.lx) / Math.max(1, performance.now() - d.lt) * 18; d.lx = e.clientX; d.lt = performance.now(); } }
    wake();
  });
  cv.addEventListener('pointerdown', e => {
    toNdc(e); ray.setFromCamera(ndc, camera);
    const onBody = ray.intersectObjects(rig.hit, false).length > 0, onTip = ray.intersectObject(rig.tip, false).length > 0;
    state.drag = { x: e.clientX, y: e.clientY, lx: e.clientX, lt: performance.now(), spin: state.spin, moved: 0, onBody: onBody || onTip, onTip };
    wake();
  });
  const up = (e, cancel) => {
    const d = state.drag; state.drag = null; if (!d || cancel || d.moved > 8) return wake();
    const now = performance.now();
    state.taps = state.taps.filter(x => now - x < 380); state.taps.push(now);
    if (state.mode === 'sleep') { state.mode = 'idle'; state.wokeAt = now; play('jump'); say('Oh! Still up? Get some sleep.'); return wake(); }
    if (d.onTip) { state.antenna.v += 14; state.antenna.w -= 10; play('boing'); say('Boing.', 1400); }
    else if (d.onBody) { if (state.taps.length >= 2) { play('dance'); say(state.ctx.allDone ? 'Everything done. Party.' : 'Dance break!', 2600); } else { play('jump'); nextLine(); } navigator.vibrate && navigator.vibrate(8); }
    else { toNdc(e); ray.setFromCamera(ndc, camera); if (ray.ray.intersectPlane(floorPlane, floorPt)) strollTo(floorPt.x, floorPt.z); }
    wake();
  };
  cv.addEventListener('pointerup', e => up(e));
  cv.addEventListener('pointercancel', e => up(e, true));
  cv.addEventListener('pointerleave', () => { state.pointerAt = 0; });
}

/* ---------- lifecycle ---------- */
function size() {
  if (!wrap || !wrap.isConnected) return;
  const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  // keep the whole buddy in frame on a narrow phone stage
  const narrow = camera.aspect < 1, fitH = narrow ? 3.25 : 2.9, fitW = 2.3 / camera.aspect, need = Math.max(fitH, fitW), dist = need / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.userData.dist = dist; camera.updateProjectionMatrix(); frame(performance.now());
}
const live = () => ok && wrap && wrap.isConnected && !document.hidden && inView;
function wake() { if (!raf && live()) { last = 0; raf = requestAnimationFrame(frame); } }
function frame(now) {
  raf = 0; if (!renderer) return;
  const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now;
  const t = now / 1000;
  // mode follows the day, unless you just woke it up
  const want = state.ctx.mode || 'idle';
  if (want !== 'sleep' || !state.wokeAt || now - state.wokeAt > 60000) state.mode = want;
  autonomous(dt);
  applyPose(computePose(t, dt), dt, t);
  const dist = camera.userData.dist || 6;
  const px = state.pointerAt ? state.lookT.x * .12 : Math.sin(t * .2) * .08;
  const ly = camera.aspect < 1 ? .86 : .98; camera.position.set(damp(camera.position.x, px, 3, dt), ly + .3, dist); camera.lookAt(0, ly, 0);
  renderer.render(scene, camera);
  placeBubble();
  zEl.classList.toggle('on', state.mode === 'sleep');
  if (live() && !REDUCED) raf = requestAnimationFrame(frame);
  else if (live() && (state.act || state.drag || Math.abs(state.spinV) > .05)) raf = requestAnimationFrame(frame);
}

function mount(slot) {
  if (!ok || !slot) return;
  if (!wrap) {
    try { buildScene(); } catch (e) { ok = false; slot.classList.add('no3d'); console.warn('3D unavailable', e); return; }
    wrap = document.createElement('div'); wrap.className = 'bd';
    wrap.append(cv);
    sayEl = document.createElement('div'); sayEl.className = 'bd-say'; wrap.append(sayEl);
    zEl = document.createElement('div'); zEl.className = 'bd-z'; zEl.innerHTML = '<i>z</i><i>z</i><i>Z</i>'; wrap.append(zEl);
    bind();
    new ResizeObserver(size).observe(wrap);
    new IntersectionObserver(es => { inView = es[0].isIntersecting; wake(); }).observe(wrap);
    document.addEventListener('visibilitychange', wake);
    setTimeout(() => { if (state.mode !== 'sleep') { play('wave'); say(state.ctx.greet || 'Hey!'); } }, 700);
  }
  slot.append(wrap);
  update(window.buddyContext ? window.buddyContext() : {});
  size(); wake();
}
function update(ctx) {
  const prev = state.ctx; state.ctx = ctx || {};
  if (prev.allDone === false && ctx.allDone) { play('dance'); say('That’s everything. Nice work.'); }
  else if (prev.sessionDone === false && ctx.sessionDone) { play('stretch'); say('Session done. Big.'); }
  else if (prev.mode && prev.mode !== ctx.mode && ctx.mode === 'work') say('Clocked in. Let’s get it.');
  wake();
}
window.Buddy = { mount, update, say, play };
const pending = document.querySelector('#buddySlot'); if (pending) mount(pending);
