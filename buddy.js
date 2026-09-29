/* Dex — the Daybook buddy.
   A small 3D toy that lives on the Today stage. It idles, strolls, looks at your
   finger, and reacts to your day: lifts on training days, walks while you're on
   the clock, celebrates when the list is clear, and sits down to sleep at night.
   Tap it to make it jump and say something useful. Tap the floor and it walks
   there. Drag it to spin it. The page feeds it context through window.buddyContext(). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SMALL = innerWidth < 700;
const COL = { body: 0xf2ece2, limb: 0x39436a, hand: 0xf2ece2, shoe: 0xff5b4f, sole: 0xf7f7f7, bezel: 0x141a2b, steel: 0x5b6378, iron: 0x23283a };
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
  const hips = rig.hips = new THREE.Group(); hips.position.y = .5; root.add(hips);
  const body = rig.body = new THREE.Group(); body.position.y = .62; hips.add(body);
  const bodyMat = mat(COL.body), limbMat = mat(COL.limb, { roughness: .5, clearcoat: .2 });
  rig.shell = mesh(new RoundedBoxGeometry(1, 1.22, .68, 6, .17), bodyMat, body);
  // face screen
  mesh(new RoundedBoxGeometry(.8, .58, .05, 4, .08), new THREE.MeshStandardMaterial({ color: COL.bezel, roughness: .35, metalness: .2 }), body, 0, .2, .335);
  face.canvas = document.createElement('canvas'); face.canvas.width = 512; face.canvas.height = 352;
  face.ctx = face.canvas.getContext('2d'); face.tex = new THREE.CanvasTexture(face.canvas); face.tex.colorSpace = THREE.SRGBColorSpace; face.tex.anisotropy = 4;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.74, .51), new THREE.MeshBasicMaterial({ map: face.tex, transparent: true, toneMapped: false }));
  scr.position.set(0, .2, .362); body.add(scr); rig.screen = scr;
  // three status lights: hours, training, applications
  rig.leds = [0x64d2ff, 0xff9f0a, 0x30d158].map((c, i) => {
    const m = new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    const led = mesh(new THREE.CylinderGeometry(.05, .05, .03, 20), m, body, -.2 + i * .2, -.2, .34); led.rotation.x = Math.PI / 2; led.castShadow = false;
    led.userData = { base: new THREE.Color(c), dim: new THREE.Color(c).multiplyScalar(.18) };
    return led;
  });
  mesh(new RoundedBoxGeometry(.34, .05, .03, 2, .02), new THREE.MeshStandardMaterial({ color: 0x7c7f8c, roughness: .6 }), body, 0, -.4, .34);
  // antenna on a spring
  const ant = rig.antenna = new THREE.Group(); ant.position.set(.24, .61, 0); body.add(ant);
  mesh(new THREE.CylinderGeometry(.022, .026, .3, 10), mat(COL.limb), ant, 0, .15, 0);
  rig.tipMat = new THREE.MeshBasicMaterial({ color: 0xffd60a, toneMapped: false });
  rig.tip = mesh(new THREE.SphereGeometry(.072, 20, 16), rig.tipMat, ant, 0, .33, 0); rig.tip.castShadow = false;
  // arms
  const arm = side => {
    const piv = new THREE.Group(); piv.position.set(side * .52, .16, 0); body.add(piv);
    mesh(new THREE.CapsuleGeometry(.068, .36, 6, 14), limbMat, piv, 0, -.24, 0);
    const hand = mesh(new THREE.SphereGeometry(.105, 22, 18), bodyMat, piv, 0, -.5, 0);
    const bell = new THREE.Group(); bell.visible = false; hand.add(bell);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .34, 10), new THREE.MeshStandardMaterial({ color: COL.steel, metalness: .8, roughness: .3 })); bar.rotation.x = Math.PI / 2; bell.add(bar);
    [-.15, .15].forEach(z => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .07, 20), new THREE.MeshStandardMaterial({ color: COL.iron, roughness: .5, metalness: .4 })); w.rotation.x = Math.PI / 2; w.position.z = z; w.castShadow = true; bell.add(w); });
    return { piv, hand, bell };
  };
  rig.armL = arm(-1); rig.armR = arm(1);
  // legs + sneakers
  const leg = side => {
    const piv = new THREE.Group(); piv.position.set(side * .21, .02, 0); hips.add(piv);
    mesh(new THREE.CapsuleGeometry(.078, .24, 6, 14), limbMat, piv, 0, -.17, 0);
    const shoe = new THREE.Group(); shoe.position.set(0, -.4, .04); piv.add(shoe);
    mesh(new RoundedBoxGeometry(.25, .07, .38, 3, .03), mat(COL.sole, { roughness: .7, clearcoat: 0 }), shoe, 0, -.045, .02);
    mesh(new RoundedBoxGeometry(.23, .13, .31, 4, .06), mat(COL.shoe), shoe, 0, .045, 0);
    mesh(new RoundedBoxGeometry(.235, .03, .2, 2, .012), mat(0xffffff, { clearcoat: 0 }), shoe, 0, .03, -.02);
    return piv;
  };
  rig.legL = leg(-1); rig.legR = leg(1);
  rig.hit = [rig.shell, scr, rig.armL.hand, rig.armR.hand];
}

/* ---------- the face ---------- */
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * .35); c.bezierCurveTo(x - s, y - s * .35, x - s * .45, y - s, x, y - s * .45); c.bezierCurveTo(x + s * .45, y - s, x + s, y - s * .35, x, y + s * .35); c.fill(); }
let faceKey = '';
function drawFace(expr, lx, ly, blink, t) {
  const key = `${expr}|${lx.toFixed(2)}|${ly.toFixed(2)}|${blink.toFixed(2)}|${expr === 'sleep' ? Math.floor(t * 2) : ''}`;
  if (key === faceKey) return; faceKey = key;
  const c = face.ctx, W = 512, H = 352;
  c.clearRect(0, 0, W, H);
  roundRect(c, 0, 0, W, H, 64); c.save(); c.clip();
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0e1b36'); g.addColorStop(1, '#07101f'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(120,200,255,.05)'; for (let y = 0; y < H; y += 6) c.fillRect(0, y, W, 2);
  const glow = '#8ff6ff'; c.fillStyle = c.strokeStyle = glow; c.shadowColor = glow; c.shadowBlur = 28; c.lineCap = 'round'; c.lineWidth = 20;
  const ex = 92, cx = W / 2 + lx * 26, cy = 150 + ly * 16;
  const eye = (x) => {
    if (expr === 'happy' || expr === 'stretch') { c.beginPath(); c.arc(x, cy + 18, 40, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); return; }
    if (expr === 'sleep') { c.beginPath(); c.arc(x, cy - 8, 38, Math.PI * .15, Math.PI * .85); c.stroke(); return; }
    if (expr === 'love') { c.shadowColor = '#ff6b9a'; c.fillStyle = '#ff7aa8'; heart(c, x, cy + 6, 50); c.fillStyle = glow; c.shadowColor = glow; return; }
    let w = 58, h = 96;
    if (expr === 'surprised') { w = 78; h = 84; }
    if (expr === 'focus') h = 58;
    if (expr === 'tired') h = 42;
    h = Math.max(8, h * (1 - blink));
    roundRect(c, x - w / 2, cy - h / 2, w, h, Math.min(w, h) / 2); c.fill();
    if (expr !== 'tired' && h > 30) { c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(x - w * .16 + lx * 4, cy - h * .22, 9, 0, 7); c.fill(); c.fillStyle = glow; c.shadowBlur = 28; }
  };
  eye(cx - ex); eye(cx + ex);
  c.lineWidth = 12; const my = cy + 92;
  c.beginPath();
  if (expr === 'surprised') { c.arc(cx, my, 16, 0, 7); c.stroke(); }
  else if (expr === 'happy' || expr === 'love' || expr === 'stretch') { c.moveTo(cx - 40, my - 8); c.quadraticCurveTo(cx, my + 34, cx + 40, my - 8); c.closePath(); c.fill(); }
  else if (expr === 'focus') { c.moveTo(cx - 22, my); c.lineTo(cx + 22, my); c.stroke(); }
  else if (expr === 'sleep' || expr === 'tired') { c.moveTo(cx - 14, my); c.quadraticCurveTo(cx, my + 8, cx + 14, my); c.stroke(); }
  else { c.moveTo(cx - 26, my - 4); c.quadraticCurveTo(cx, my + 16, cx + 26, my - 4); c.stroke(); }
  if (expr === 'love' || expr === 'happy') { c.shadowBlur = 0; c.fillStyle = 'rgba(255,110,150,.35)'; c.beginPath(); c.ellipse(cx - 150, cy + 58, 30, 14, 0, 0, 7); c.ellipse(cx + 150, cy + 58, 30, 14, 0, 0, 7); c.fill(); }
  c.restore();
  face.tex.needsUpdate = true;
}

/* ---------- behaviour ---------- */
const ACTS = {
  wave: 2.4, jump: .95, dance: 3.4, lift: 4.2, look: 2.2, stretch: 2.6, boing: 1.2, stroll: 99,
};
function play(name) {
  if (REDUCED && name !== 'jump') return;
  state.act = name; state.actT = 0;
  if (rig.armL) { const on = name === 'lift'; rig.armL.bell.visible = on; rig.armR.bell.visible = on; }
}
function strollTo(x, z) { state.tx = clamp(x, -1.15, 1.15); state.tz = clamp(z, -.5, .9); play('stroll'); }
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

// Joint targets for this frame.
function computePose(t, dt) {
  const P = { hipY: .5, tiltZ: 0, tiltX: 0, sq: 1, aLx: 0, aLz: -.1, aRx: 0, aRz: .1, lLx: 0, lRx: 0, lLz: 0, lRz: 0, yaw: 0, expr: baseExpr(), lift: 0 };
  const br = Math.sin(t * 2.1);
  P.hipY += br * .012; P.sq = 1 + br * .012; P.aLz -= br * .03; P.aRz += br * .03;
  if (state.mode === 'sleep') {
    P.hipY = .16 + Math.sin(t * .9) * .01; P.lLx = P.lRx = -1.45; P.lLz = .12; P.lRz = -.12; P.tiltX = .12; P.aLz = -.45; P.aRz = .45; P.aLx = P.aRx = -.3; P.sq = 1 + Math.sin(t * .9) * .018;
  }
  if (state.mode === 'work' && !state.act) {
    const w = t * 6.5; P.lLx = Math.sin(w) * .55; P.lRx = -Math.sin(w) * .55; P.aLx = -Math.sin(w) * .45; P.aRx = Math.sin(w) * .45;
    P.hipY += Math.abs(Math.cos(w)) * .05; P.tiltZ = Math.sin(w) * .04; P.yaw = .55;
  }
  const a = state.act, k = state.actT;
  if (a) {
    const d = ACTS[a], u = clamp(k / d, 0, 1), inW = clamp(k / .25, 0, 1), outW = a === 'stroll' ? 1 : clamp((d - k) / .3, 0, 1), W = ease(Math.min(inW, outW));
    const mix = (key, v) => { P[key] = lerp(P[key], v, W); };
    if (a === 'wave') { mix('aRz', 2.55 + Math.sin(k * 11) * .32); mix('aRx', -.2); mix('tiltZ', -.06); P.expr = 'happy'; }
    if (a === 'stretch') { mix('aLz', -2.9); mix('aRz', 2.9); mix('sq', 1.06); mix('hipY', .55); P.expr = 'stretch'; }
    if (a === 'look') { const s = Math.sin(u * Math.PI * 2); mix('yaw', s * .7); state.lookT.x = s; }
    if (a === 'lift') {
      const c = Math.sin(k * 4.2); mix('aLx', -.9 - c * .7); mix('aRx', -.9 + c * .7); mix('aLz', -.25); mix('aRz', .25); mix('hipY', .47 + Math.abs(c) * .02); P.expr = 'focus';
    }
    if (a === 'jump') {
      let y = .5, s = 1;
      if (u < .16) { const q = u / .16; y = .5 - .09 * q; s = 1 - .12 * q; }
      else if (u < .66) { const q = (u - .16) / .5; y = .41 + Math.sin(q * Math.PI) * .55; s = 1.08 - .08 * q; P.aLz = -2.2; P.aRz = 2.2; P.lLx = -.35; P.lRx = .2; }
      else if (u < .82) { const q = (u - .66) / .16; y = .41 + .09 * q; s = .9 + .1 * q; }
      P.hipY = y; P.sq = s; P.expr = u < .3 ? 'surprised' : 'happy';
    }
    if (a === 'boing') { P.expr = 'surprised'; mix('tiltZ', Math.sin(k * 14) * .12 * (1 - u)); }
    if (a === 'dance') {
      const b = k * 7.5; mix('hipY', .5 + Math.abs(Math.sin(b)) * .14); mix('tiltZ', Math.sin(b) * .22); mix('aLz', -1.6 - Math.sin(b) * 1.1); mix('aRz', 1.6 - Math.sin(b) * 1.1);
      mix('lLx', Math.sin(b) * .4); mix('lRx', -Math.sin(b) * .4);
      if (u > .72) P.yaw += ease((u - .72) / .28) * Math.PI * 2;
      P.expr = 'love';
    }
    if (a === 'stroll') {
      const dx = state.tx - state.x, dz = state.tz - state.z, dist = Math.hypot(dx, dz);
      if (dist < .03) { state.act = null; state.lookT.x = 0; }
      else {
        const sp = Math.min(dist, .85 * dt); state.x += dx / dist * sp; state.z += dz / dist * sp;
        const w = t * 8; P.lLx = Math.sin(w) * .6; P.lRx = -Math.sin(w) * .6; P.aLx = -Math.sin(w) * .5; P.aRx = Math.sin(w) * .5;
        P.hipY += Math.abs(Math.cos(w)) * .055; P.yaw = Math.atan2(dx, dz); P.tiltZ = Math.sin(w) * .04;
      }
    }
    state.actT += dt;
    if (state.act && a !== 'stroll' && state.actT > d) { state.act = null; rig.armL.bell.visible = rig.armR.bell.visible = false; }
  }
  return P;
}

function applyPose(P, dt, t) {
  const k = 14;
  pose.hipY = damp(pose.hipY ?? P.hipY, P.hipY, k, dt);
  rig.hips.position.y = pose.hipY;
  state.hipV = (pose.hipY - state.lastHip) / Math.max(dt, .001); state.lastHip = pose.hipY;
  for (const key of ['tiltZ', 'tiltX', 'sq', 'aLx', 'aLz', 'aRx', 'aRz', 'lLx', 'lRx', 'lLz', 'lRz']) pose[key] = damp(pose[key] ?? P[key], P[key], k, dt);
  // yaw: action/walk direction + look at your finger + a spin you gave it
  const lookYaw = state.act === 'stroll' || state.mode === 'work' ? 0 : state.look.x * .35;
  pose.yaw = damp(pose.yaw ?? 0, P.yaw + lookYaw, 7, dt);
  if (!state.drag) { state.spin += state.spinV * dt; state.spinV *= Math.exp(-dt * 2.2); if (Math.abs(state.spinV) < .4) state.spin = damp(state.spin, Math.round(state.spin / (Math.PI * 2)) * Math.PI * 2, 3, dt); }
  rig.root.rotation.y = pose.yaw + state.spin;
  rig.root.position.set(state.x, 0, state.z);
  rig.body.rotation.z = pose.tiltZ; rig.body.rotation.x = pose.tiltX + state.look.y * .08;
  rig.body.scale.set(1 + (1 - pose.sq) * .6, pose.sq, 1 + (1 - pose.sq) * .6);
  rig.armL.piv.rotation.set(pose.aLx, 0, pose.aLz); rig.armR.piv.rotation.set(pose.aRx, 0, pose.aRz);
  rig.legL.rotation.set(pose.lLx, 0, pose.lLz); rig.legR.rotation.set(pose.lRx, 0, pose.lRz);
  // antenna: a damped spring kicked by the body's movement
  const A = state.antenna, acc = -state.hipV * 2.2;
  A.v += (-60 * A.a - 5 * A.v + acc) * dt; A.a += A.v * dt;
  A.w += (-50 * A.b - 4.5 * A.w + (state.act === 'stroll' ? Math.sin(t * 8) * 4 : 0) - pose.tiltZ * 10) * dt; A.b += A.w * dt;
  rig.antenna.rotation.x = clamp(A.a, -.8, .8); rig.antenna.rotation.z = clamp(A.b, -.8, .8);
  // status lights and antenna tip
  const leds = state.ctx.leds || [0, 0, 0];
  rig.leds.forEach((l, i) => { const v = clamp(leds[i] || 0, 0, 1), p = .55 + .45 * Math.sin(t * 2.4 + i); l.material.color.copy(l.userData.dim).lerp(l.userData.base, v >= 1 ? 1 : v * p); });
  rig.tipMat.color.setHSL(state.mode === 'sleep' ? .6 : .13, 1, state.mode === 'sleep' ? .25 + .1 * Math.sin(t) : .55 + .1 * Math.sin(t * 3));
  // blink + eyes
  state.blinkAt -= dt;
  if (state.blinkAt < 0) { state.blink = 1; state.blinkAt = 2.2 + Math.random() * 3.5; }
  state.blink = Math.max(0, state.blink - dt * 7);
  const bl = state.blink > .5 ? (1 - state.blink) * 2 : state.blink * 2;
  if (performance.now() - state.pointerAt > 2600 && state.act !== 'look') { state.lookT.x = Math.sin(t * .35) * .25; state.lookT.y = 0; }
  state.look.x = damp(state.look.x, state.lookT.x, 6, dt); state.look.y = damp(state.look.y, state.lookT.y, 6, dt);
  drawFace(P.expr, state.look.x, state.look.y, P.expr === 'idle' || P.expr === 'focus' ? bl : 0, t);
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
