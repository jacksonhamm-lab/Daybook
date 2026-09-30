/* Dex — the Daybook buddy: an anime-style skier.
   Cel-shaded with ink outlines. Yellow jacket, baggy black snowpants, khaki boots,
   black beanie and mask, gold goggles. It idles, skates around, looks at your finger
   and reacts to your day: ski-prep squats with goggles down on training days, skates
   in place while you're on the clock, a 360 when the list is clear, and sits in the
   snow to sleep at night. Tap it to hop and hear something useful, tap its head to
   bonk it, tap the snow and it skates there, drag to spin. Context comes from
   window.buddyContext(). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SMALL = innerWidth < 700;
const COL = { jacket: 0xffc81a, trim: 0x16171d, pants: 0x1b1c22, skin: 0xf3cdb0, mask: 0x121318, beanie: 0x15161b, hair: 0x2b1d17, glove: 0x16171d, boot: 0xb8a276, sole: 0x3a3228, ski: 0x17181e, gold: 0xd9a92b, frame: 0xe7e1d2 };
const HIP = 1.0;
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
// Cel shading: three flat tones instead of smooth light, plus an ink outline, for the anime look.
const TONES = (() => { const t = new THREE.DataTexture(new Uint8Array([95, 95, 95, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: TONES, ...o });
const INK = (() => { const m = new THREE.MeshBasicMaterial({ color: 0x0a0b10, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.0085;'); }; return m; })();
function mesh(geo, m, parent, x = 0, y = 0, z = 0, ink = true) {
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; parent.add(me);
  if (ink) { const o = new THREE.Mesh(geo, INK); o.castShadow = false; me.add(o); }
  return me;
}
// A smooth turned shape from a handful of [radius, height] points.
function turned(pts, seg = 28, n = 24) { const c = new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))); return new THREE.LatheGeometry(c.getPoints(n), seg); }
// Vertical ribs for the knit.
function ribTex(base, dark, n = 72) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 8; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 512, 8); x.fillStyle = dark;
  for (let i = 0; i < n; i++) x.fillRect(i * 512 / n, 0, 512 / n * .42, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
// Goggle outline: a wide rounded lens with an arched cut for the nose.
function gogglePts(w, h, r, notch, n = 160) {
  const sh = new THREE.Shape(), x0 = -w / 2, y0 = -h / 2;
  sh.moveTo(x0 + r, y0); sh.lineTo(-notch * 1.25, y0); sh.quadraticCurveTo(0, y0 + notch * 1.5, notch * 1.25, y0);
  sh.lineTo(w / 2 - r, y0); sh.quadraticCurveTo(w / 2, y0, w / 2, y0 + r); sh.lineTo(w / 2, h / 2 - r * .6); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  sh.lineTo(x0 + r, h / 2); sh.quadraticCurveTo(x0, h / 2, x0, h / 2 - r * .6); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  return sh.getSpacedPoints(n);
}
// Wrap a flat shape round a vertical cylinder so the goggles follow the face.
function bend(geo, R) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = x / R, rr = R + z; p.setXYZ(i, Math.sin(a) * rr, p.getY(i), Math.cos(a) * rr); }
  geo.computeVertexNormals(); return geo;
}
function lensTex(w, h) {
  // gold mirror: bright at the top left falling to bronze, with two glints, clipped to the goggle outline
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext('2d'), W = c.width, H = c.height;
  x.beginPath(); gogglePts(w, h, .032, .031, 200).forEach((p, i) => { const px = (p.x / w + .5) * W, py = (.5 - p.y / h) * H; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.clip();
  const g = x.createLinearGradient(0, 0, W * .8, H); g.addColorStop(0, '#ffe79a'); g.addColorStop(.28, '#f0b53a'); g.addColorStop(.6, '#b3701c'); g.addColorStop(1, '#4a2a08');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const v = x.createLinearGradient(0, 0, 0, H); v.addColorStop(0, 'rgba(255,255,255,.25)'); v.addColorStop(.45, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.moveTo(W * .12, 0); x.lineTo(W * .2, 0); x.lineTo(W * .1, H); x.lineTo(W * .02, H); x.fill();
  x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.moveTo(W * .24, 0); x.lineTo(W * .27, 0); x.lineTo(W * .17, H); x.lineTo(W * .14, H); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function strapTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#8d8474'; x.fillRect(0, 0, 1024, 64);
  x.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 64; i += 4) x.fillRect(0, i, 1024, 1);
  x.font = '800 34px Inter, sans-serif'; x.textBaseline = 'middle'; x.fillStyle = '#b3aa98';
  [140, 820].forEach(px => x.fillText('DAYBOOK', px, 34));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function capOf(r, from, to, seg = 36) { return new THREE.SphereGeometry(r, seg, 24, 0, Math.PI * 2, from, to - from); }

function buildScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  cv = renderer.domElement;
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  camera = new THREE.PerspectiveCamera(26, 1, .1, 60);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2f48, 1.25));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.6); key.position.set(2.4, 5, 3.2); key.castShadow = true;
  key.shadow.mapSize.set(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048); key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -3; key.shadow.bias = -.0005; key.shadow.normalBias = .02;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9cc2ff, 1.8); rim.position.set(-3.5, 3, -3); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: .34 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  buildBuddy();
}

const L1 = .42, L2 = .40, FOOT = .215; // thigh, shin, ankle-to-snow
function buildBuddy() {
  const M = {
    jacket: toon(COL.jacket), trim: toon(COL.trim), pants: toon(COL.pants), skin: toon(COL.skin), mask: toon(COL.mask), beanie: toon(COL.beanie),
    hair: toon(COL.hair), glove: toon(COL.glove), boot: toon(COL.boot), sole: toon(COL.sole), ski: toon(COL.ski),
    gold: new THREE.MeshPhysicalMaterial({ color: COL.gold, metalness: 1, roughness: .18, clearcoat: 1 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0xf0c048, metalness: 1, roughness: .12, iridescence: .25, iridescenceIOR: 1.3, clearcoat: 1, emissive: 0x3a2a00 }),
  };
  const root = rig.root = new THREE.Group(); scene.add(root);
  const hips = rig.hips = new THREE.Group(); hips.position.y = HIP; root.add(hips);
  // baggy snowpants: a seat and two wide legs with a knee joint
  mesh(turned([[.001, .1], [.16, .08], [.2, 0], [.19, -.09], [.12, -.15], [.001, -.16]]), M.pants, hips).scale.set(1.08, 1, .92);
  const leg = side => {
    const thigh = new THREE.Group(); thigh.position.set(side * .11, -.02, 0); hips.add(thigh);
    mesh(turned([[.132, 0], [.148, -.14], [.145, -.3], [.136, -.44]]), M.pants, thigh);
    const knee = new THREE.Group(); knee.position.y = -L1; thigh.add(knee);
    mesh(turned([[.136, .03], [.142, -.12], [.158, -.27], [.172, -.35], [.166, -.405]]), M.pants, knee);
    [-.24, -.3, -.355].forEach(y => { const f = mesh(new THREE.TorusGeometry(y > -.26 ? .156 : .166, .016, 8, 28), M.pants, knee, 0, y, 0, false); f.rotation.x = Math.PI / 2 + (y > -.33 ? .12 : -.08); });
    const ankle = new THREE.Group(); ankle.position.y = -L2; knee.add(ankle);
    mesh(new THREE.CylinderGeometry(.085, .095, .14, 20), M.boot, ankle, 0, -.03, 0);
    mesh(new RoundedBoxGeometry(.17, .12, .31, 4, .05), M.boot, ankle, 0, -.12, .05);
    mesh(new RoundedBoxGeometry(.18, .03, .32, 2, .012), M.sole, ankle, 0, -.18, .05, false);
    [.0, .09].forEach(z => mesh(new RoundedBoxGeometry(.18, .022, .035, 2, .008), M.sole, ankle, 0, -.07 + z * .3, .12 + z, false));
    const ski = new THREE.Group(); ski.position.set(0, -.2, .1); ankle.add(ski);
    mesh(new RoundedBoxGeometry(.15, .03, 1.3, 2, .012), M.ski, ski);
    const tip = mesh(new RoundedBoxGeometry(.15, .03, .26, 2, .012), M.ski, ski, 0, .05, .72); tip.rotation.x = -.45;
    mesh(new RoundedBoxGeometry(.05, .006, 1.1, 1, .002), M.gold, ski, 0, .017, 0, false);
    return { thigh, knee, ski };
  };
  rig.legL = leg(-1); rig.legR = leg(1);
  // yellow jacket
  const spine = rig.body = new THREE.Group(); spine.position.y = .08; hips.add(spine);
  rig.shell = mesh(turned([[.001, -.15], [.205, -.14], [.215, -.06], [.19, .08], [.21, .26], [.205, .4], [.17, .49], [.1, .55], [.001, .56]], 32, 30), M.jacket, spine);
  rig.shell.scale.set(1.14, 1, .84);
  const hem = mesh(new THREE.TorusGeometry(.205, .022, 8, 36), M.trim, spine, 0, -.135, 0, false); hem.rotation.x = Math.PI / 2; hem.scale.set(1.14, .84, 1);
  mesh(new RoundedBoxGeometry(.018, .62, .02, 1, .008), M.trim, spine, 0, .2, .178, false);
  mesh(new THREE.CylinderGeometry(.105, .12, .12, 24, 1, true), M.jacket, spine, 0, .59, 0).material.side = THREE.DoubleSide;
  const hood = mesh(new THREE.SphereGeometry(.13, 20, 14), M.jacket, spine, 0, .54, -.13); hood.scale.set(1.35, .72, .8);
  // lift pass on the zip: three lights for hours, training and applications
  const pass = new THREE.Group(); pass.position.set(.1, .3, .185); pass.rotation.set(-.08, .18, .06); spine.add(pass);
  mesh(new RoundedBoxGeometry(.085, .11, .008, 2, .01), toon(0xf6f4ee), pass, 0, 0, 0);
  rig.leds = [0x64d2ff, 0xff9f0a, 0x30d158].map((c, i) => {
    const led = new THREE.Mesh(new THREE.CircleGeometry(.012, 16), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    led.position.set(-.024 + i * .024, -.03, .006); pass.add(led);
    led.userData = { base: new THREE.Color(c), dim: new THREE.Color(c).multiplyScalar(.25) };
    return led;
  });
  // head: mask over the lower face, beanie, hair, gold goggles
  const neck = rig.neck = new THREE.Group(); neck.position.y = .6; spine.add(neck);
  mesh(new THREE.CylinderGeometry(.075, .085, .14, 18), M.mask, neck, 0, .02, 0, false);
  const head = rig.head = new THREE.Group(); head.position.y = .19; head.scale.setScalar(1.17); neck.add(head);
  const skull = mesh(new THREE.SphereGeometry(.2, 40, 30), M.skin, head); skull.scale.set(1, 1.08, 1.02); rig.skull = skull;
  face.canvas = document.createElement('canvas'); face.canvas.width = 512; face.canvas.height = 256;
  face.ctx = face.canvas.getContext('2d'); face.tex = new THREE.CanvasTexture(face.canvas); face.tex.colorSpace = THREE.SRGBColorSpace; face.tex.anisotropy = 4;
  const decal = new THREE.Mesh(new THREE.SphereGeometry(.2012, 40, 16, Math.PI / 2 - .8, 1.6, 1.12, .76), new THREE.MeshBasicMaterial({ map: face.tex, transparent: true, depthWrite: false }));
  skull.add(decal); rig.screen = decal;
  mesh(capOf(.207, 1.86, Math.PI), M.mask, skull);
  mesh(new THREE.SphereGeometry(.035, 12, 10), M.mask, skull, 0, -.07, .185, false).scale.set(1, .9, 1.1);
  const knit = toon(0xffffff, { map: ribTex('#1a1b21', '#0e0f13') });
  mesh(turned([[.001, .272], [.1, .262], [.166, .226], [.205, .172], [.219, .124]], 44, 20), knit, skull);
  const cuffKnit = toon(0xffffff, { map: ribTex('#1d1e25', '#0c0d11', 96) });
  mesh(turned([[.214, .127], [.225, .118], [.227, .09], [.224, .07], [.206, .063]], 44, 10), cuffKnit, skull);
  const spike = (x, y, z, rx, rz, r = .036, h = .12) => { const s = mesh(new THREE.ConeGeometry(r, h, 8), M.hair, skull, x, y, z); s.rotation.set(rx, 0, rz); };
  [[-.1, .2, .6], [-.035, .205, .15], [.035, .205, -.15], [.1, .2, -.6]].forEach(([x, z, rz]) => spike(x, .07, z - .025, Math.PI - .55, rz * .5, .034, .09));
  [-1, 1].forEach(s => { spike(s * .19, .0, .05, Math.PI + .1, s * .25, .03, .11); spike(s * .12, .0, -.16, Math.PI + .6, s * .3, .035, .1); });
  const gog = rig.goggles = new THREE.Group(); skull.add(gog);
  gog.position.y = .018;
  const R = .222, W = .4, H = .135;
  const outer = new THREE.Shape(gogglePts(W, H, .04, .034)), hole = new THREE.Path(gogglePts(W - .026, H - .026, .03, .03));
  outer.holes.push(hole);
  const frameGeo = bend(new THREE.ExtrudeGeometry(outer, { depth: .026, bevelEnabled: true, bevelThickness: .005, bevelSize: .004, bevelSegments: 2, curveSegments: 4 }), R);
  mesh(frameGeo, toon(COL.frame), gog, 0, 0, 0);
  const foam = bend(new THREE.ExtrudeGeometry(new THREE.Shape(gogglePts(W - .012, H - .012, .036, .032)), { depth: .012, bevelEnabled: false }), R - .006);
  mesh(foam, toon(0x101114), gog, 0, 0, 0, false);
  // the lens is a finely divided sheet cut to the goggle shape by its texture, so it curves smoothly
  const lensGeo = bend(new THREE.PlaneGeometry(W - .02, H - .02, 64, 10), R + .021);
  const lm = new THREE.MeshBasicMaterial({ map: lensTex(W - .02, H - .02), transparent: true, alphaTest: .5, side: THREE.DoubleSide });
  mesh(lensGeo, lm, gog, 0, 0, 0, false).castShadow = false;
  const sa = W / 2 / R;
  // the strap hugs the beanie and only tilts a little when the goggles go up
  const gs = rig.gogStrap = new THREE.Group(); gs.position.y = .018; skull.add(gs);
  mesh(new THREE.CylinderGeometry(R + .012, R + .012, .07, 48, 1, true, sa - .05, Math.PI * 2 - 2 * sa + .1), toon(0xffffff, { map: strapTex(), side: THREE.DoubleSide }), gs, 0, 0, 0, false);
  [-1, 1].forEach(k => { const clip = mesh(new RoundedBoxGeometry(.03, .082, .03, 2, .01), toon(COL.frame), gog, Math.sin(sa) * (R + .012) * k, 0, Math.cos(sa) * (R + .012), false); clip.rotation.y = sa * k; });
  rig.tip = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); rig.tip.position.set(0, .3, 0); skull.add(rig.tip);
  // arms with elbows, gloves, poles
  const arm = side => {
    const sh = new THREE.Group(); sh.position.set(side * .235, .44, 0); spine.add(sh);
    mesh(new THREE.SphereGeometry(.088, 20, 14), M.jacket, sh, 0, -.01, 0);
    mesh(turned([[.084, 0], [.08, -.15], [.07, -.3]]), M.jacket, sh);
    const el = new THREE.Group(); el.position.y = -.3; sh.add(el);
    mesh(turned([[.07, .02], [.066, -.12], [.06, -.24]]), M.jacket, el);
    const cuffA = mesh(new THREE.TorusGeometry(.058, .016, 8, 20), M.trim, el, 0, -.24, 0, false); cuffA.rotation.x = Math.PI / 2;
    const hand = mesh(new THREE.SphereGeometry(.062, 18, 14), M.glove, el, 0, -.3, .01); hand.scale.set(.95, 1.15, 1.15);
    mesh(new THREE.SphereGeometry(.026, 10, 8), M.glove, el, -side * .045, -.28, .045, false);
    const pole = new THREE.Group(); pole.position.set(0, -.3, .01); el.add(pole);
    mesh(new THREE.CylinderGeometry(.024, .02, .13, 12), M.glove, pole, 0, .03, 0, false);
    mesh(new THREE.CylinderGeometry(.01, .009, 1.02, 8), M.glove, pole, 0, -.5, 0, false);
    const b = mesh(new THREE.TorusGeometry(.045, .008, 6, 18), M.gold, pole, 0, -.9, 0, false); b.rotation.x = Math.PI / 2;
    return { sh, el, hand, pole };
  };
  rig.armL = arm(-1); rig.armR = arm(1);
  rig.hit = [rig.shell, skull, decal, rig.armL.hand, rig.armR.hand];
}

/* ---------- the face: anime eyes above the mask ---------- */
function heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * .35); c.bezierCurveTo(x - s, y - s * .35, x - s * .45, y - s, x, y - s * .45); c.bezierCurveTo(x + s * .45, y - s, x + s, y - s * .35, x, y + s * .35); c.fill(); }
let faceKey = '';
function drawFace(expr, lx, ly, blink) {
  const key = `${expr}|${lx.toFixed(2)}|${ly.toFixed(2)}|${blink.toFixed(2)}`;
  if (key === faceKey) return; faceKey = key;
  const c = face.ctx, W = 512, H = 256, ink = '#140d0a';
  c.clearRect(0, 0, W, H);
  c.save(); c.translate(W / 2, 0); c.scale(.92, 1);
  const ey = 124 + ly * 6, closed = blink > .7 || expr === 'happy' || expr === 'stretch' || expr === 'sleep';
  if (expr === 'happy' || expr === 'love' || expr === 'stretch') { c.fillStyle = 'rgba(255,110,120,.45)'; c.beginPath(); c.ellipse(-168, 200, 46, 18, 0, 0, 7); c.ellipse(168, 200, 46, 18, 0, 0, 7); c.fill(); }
  const brow = (s) => {
    const x = s * 104, lift = expr === 'surprised' ? -16 : 0, tilt = expr === 'focus' ? 14 : expr === 'tired' ? -8 : expr === 'surprised' ? -4 : 2;
    c.strokeStyle = '#2a1a12'; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - s * 38, 50 + lift + tilt); c.quadraticCurveTo(x, 38 + lift, x + s * 40, 48 + lift - tilt * .4); c.stroke();
  };
  brow(-1); brow(1);
  const eye = s => {
    const x = s * 104 + lx * 12;
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = ink;
    if (closed) {
      const up = expr === 'happy' || expr === 'stretch';
      c.lineWidth = 12; c.beginPath();
      if (up) { c.moveTo(x - 46, ey + 16); c.quadraticCurveTo(x, ey - 30, x + 46, ey + 16); }
      else { c.moveTo(x - 46, ey); c.quadraticCurveTo(x, ey + 24, x + 46, ey); c.moveTo(x + s * 46, ey); c.lineTo(x + s * 58, ey - 9); }
      c.stroke(); return;
    }
    const w = expr === 'surprised' ? 86 : 78, h = expr === 'surprised' ? 106 : 98, lid = expr === 'tired' ? .45 : expr === 'focus' ? .2 : 0;
    c.save();
    c.beginPath(); c.ellipse(x, ey, w / 2, h / 2, 0, 0, 7); c.clip();
    if (lid) { c.beginPath(); c.rect(x - w, ey - h / 2 + h * lid, w * 2, h); c.clip(); }
    c.fillStyle = '#fff'; c.fillRect(x - w, ey - h, w * 2, h * 2);
    const ix = x + lx * 9 - s * 2, iy = ey + 6 + ly * 5, iw = expr === 'surprised' ? 46 : 62, ih = expr === 'surprised' ? 64 : 86;
    if (expr === 'love') { c.fillStyle = '#ff4f7a'; heart(c, ix, iy, 42); }
    else {
      const g = c.createLinearGradient(0, iy - ih / 2, 0, iy + ih / 2); g.addColorStop(0, '#1e120c'); g.addColorStop(.55, '#5a3418'); g.addColorStop(1, '#d6923c');
      c.fillStyle = g; c.beginPath(); c.ellipse(ix, iy, iw / 2, ih / 2, 0, 0, 7); c.fill();
      c.fillStyle = '#0d0705'; c.beginPath(); c.ellipse(ix, iy - 2, iw * .22, ih * .26, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,220,160,.55)'; c.beginPath(); c.ellipse(ix, iy + ih * .28, iw * .3, ih * .1, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ix - iw * .2, iy - ih * .2, 11, 14, -.3, 0, 7); c.fill();
      c.beginPath(); c.arc(ix + iw * .2, iy + ih * .16, 5, 0, 7); c.fill();
    }
    c.restore();
    // lashes: a heavy top line with a flick at the outer corner
    const top = ey - h / 2 + h * lid;
    c.lineWidth = 16; c.beginPath(); c.moveTo(x - s * w * .52, ey - h * .1 + h * lid * .6); c.quadraticCurveTo(x - s * w * .1, top - 12, x + s * w * .5, top + 4); c.lineTo(x + s * (w * .5 + 14), top - 6); c.stroke();
    c.lineWidth = 5; c.beginPath(); c.moveTo(x + s * w * .15, ey + h * .5 - 2); c.quadraticCurveTo(x + s * w * .42, ey + h * .42, x + s * w * .5, ey + h * .28); c.stroke();
  };
  eye(-1); eye(1);
  c.restore();
  face.tex.needsUpdate = true;
}

/* ---------- behaviour ---------- */
const ACTS = { wave: 2.4, jump: 1.05, dance: 3.6, lift: 5, look: 2.2, stretch: 2.6, boing: 1.2, stroll: 99 };
function play(name) { if (REDUCED && name !== 'jump') return; state.act = name; state.actT = 0; }
function strollTo(x, z) { state.tx = clamp(x, -1.1, 1.1); state.tz = clamp(z, -.5, .7); play('stroll'); }
function autonomous(dt) {
  if (REDUCED || state.act || state.drag || state.mode !== 'idle') return;
  state.next -= dt; if (state.next > 0) return;
  state.next = 4 + Math.random() * 5;
  const c = state.ctx, r = Math.random();
  if (c.training && r < .3) return play('lift');
  if (r < .45) return strollTo((Math.random() * 2 - 1) * 1.0, Math.random() * .5 - .2);
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
// Two-bone leg: given how high the hip is and how far forward the foot sits, bend the knee so the ski stays on the snow.
function legIK(hipH, fz) {
  const dy = Math.max(.05, hipH - .02 - FOOT), d = clamp(Math.hypot(dy, fz), .22, L1 + L2 - .0005);
  const knee = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  return [-(Math.atan2(fz, dy) + a), knee];
}
// A skating stride: one ski pushes out, the poles swing, the body leans in.
function skate(P, w) {
  const s = Math.sin(w);
  P.tLz = -(.05 + .3 * Math.max(0, s)); P.tRz = .05 + .3 * Math.max(0, -s);
  P.sLx = -.25 - s * .6; P.sRx = -.25 + s * .6; P.eL = -.6 + s * .2; P.eR = -.6 - s * .2;
  P.tiltZ = s * .1; P.tiltX = .28; P.hipY = HIP - .09 + Math.abs(Math.cos(w)) * .03; P.headX = -.18;
}
function computePose(t, dt) {
  const P = { hipY: HIP, fz: .02, air: 0, tiltZ: 0, tiltX: .04, sq: 1, sLx: .05, sLz: -.2, sRx: .05, sRz: .2, eL: -.35, eR: -.35, eLz: 0, eRz: 0, tLz: -.04, tRz: .04, yaw: .38, headX: 0, headZ: 0, gog: 0, expr: baseExpr() };
  const br = Math.sin(t * 2), sway = Math.sin(t * .8);
  P.sq = 1 + br * .012; P.hipY += br * .006; P.sLz -= br * .02; P.sRz += br * .02; P.tiltZ = sway * .02; P.headZ = -sway * .03;
  if (state.mode === 'sleep') {
    // sitting back on the snow, hands behind, skis out front
    Object.assign(P, { hipY: .36 + br * .006, fz: .58, tiltX: -.32, sLx: .55, sRx: .55, sLz: -.35, sRz: .35, eL: .1, eR: .1, headX: .3, headZ: .12, gog: 0 });
  }
  if (state.mode === 'work' && !state.act) { skate(P, t * 4.2); P.yaw = .6; P.gog = 1; }
  const a = state.act, k = state.actT;
  if (a) {
    const d = ACTS[a], u = clamp(k / d, 0, 1), W = ease(Math.min(clamp(k / .25, 0, 1), a === 'stroll' ? 1 : clamp((d - k) / .3, 0, 1)));
    const mix = (key, v) => { P[key] = lerp(P[key], v, W); };
    if (a === 'wave') { mix('sRz', 2.5); mix('sRx', -.15); mix('eR', -.9); P.eRz = Math.sin(k * 10) * .45 * W; mix('tiltZ', -.05); mix('headZ', .08); P.expr = 'happy'; }
    if (a === 'stretch') { mix('sLz', -2.95); mix('sRz', 2.95); mix('eL', 0); mix('eR', 0); mix('sq', 1.04); mix('hipY', HIP + .03); mix('tiltX', -.08); mix('headX', -.15); P.expr = 'stretch'; }
    if (a === 'look') { const s = Math.sin(u * Math.PI * 2); mix('yaw', .38 + s * .8); state.lookT.x = s; }
    if (a === 'lift') {
      // ski-prep squats: sit back into a tuck and stand up again, goggles down
      const q = (1 - Math.cos(k * 2.6)) / 2;
      mix('hipY', HIP - .04 - q * .34); mix('fz', .06); mix('tiltX', .3 + q * .5); mix('headX', -.25 - q * .4);
      mix('sLx', -1.05 - q * .25); mix('sRx', -1.05 - q * .25); mix('sLz', -.12); mix('sRz', .12); mix('eL', -.7); mix('eR', -.7); mix('gog', 1); P.expr = 'focus';
    }
    if (a === 'jump') {
      if (u < .18) { const q = ease(u / .18); P.hipY = HIP - .26 * q; P.tiltX = .04 + .3 * q; P.sLx = P.sRx = .4 * q; }
      else if (u < .7) { const q = (u - .18) / .52; P.air = Math.sin(q * Math.PI) * .62; P.hipY = HIP - .2 * Math.sin(q * Math.PI); P.sLz = -2.4; P.sRz = 2.4; P.eL = P.eR = -.2; P.tiltX = -.05; }
      else if (u < .86) { const q = (u - .7) / .16; P.hipY = HIP - .22 * (1 - q); P.tiltX = .2 * (1 - q); }
      P.expr = u < .3 ? 'surprised' : 'happy';
    }
    if (a === 'boing') { P.expr = 'surprised'; P.headZ += Math.sin(k * 16) * .25 * (1 - u); P.headX += Math.sin(k * 11) * .12 * (1 - u); }
    if (a === 'dance') {
      const b = k * 7; mix('hipY', HIP - .08 + Math.abs(Math.sin(b)) * .06); P.air = Math.max(0, Math.sin(b)) * .08 * W; mix('tiltZ', Math.sin(b / 2) * .18);
      mix('sLz', -1.8 - Math.sin(b) * .9); mix('sRz', 1.8 - Math.sin(b) * .9); mix('eL', -.5); mix('eR', -.5);
      if (u > .62) P.yaw += ease((u - .62) / .38) * Math.PI * 2;
      P.expr = 'love';
    }
    if (a === 'stroll') {
      const dx = state.tx - state.x, dz = state.tz - state.z, dist = Math.hypot(dx, dz);
      if (dist < .03) { state.act = null; state.lookT.x = 0; }
      else { const sp = Math.min(dist, .9 * dt); state.x += dx / dist * sp; state.z += dz / dist * sp; skate(P, t * 5.2); P.yaw = Math.atan2(dx, dz); P.gog = 1; }
    }
    state.actT += dt;
    if (state.act && a !== 'stroll' && state.actT > d) state.act = null;
  }
  return P;
}

const POSE_KEYS = ['hipY', 'fz', 'air', 'tiltZ', 'tiltX', 'sq', 'sLx', 'sLz', 'sRx', 'sRz', 'eL', 'eR', 'eLz', 'eRz', 'tLz', 'tRz', 'headX', 'headZ'];
function applyPose(P, dt, t) {
  for (const key of POSE_KEYS) pose[key] = damp(pose[key] ?? P[key], P[key], key === 'air' ? 30 : 11, dt);
  pose.gog = damp(pose.gog ?? P.gog, P.gog, 6, dt);
  rig.hips.position.y = pose.hipY;
  state.hipV = (pose.hipY + pose.air - state.lastHip) / Math.max(dt, .001); state.lastHip = pose.hipY + pose.air;
  const lookYaw = state.act === 'stroll' || state.mode === 'work' ? 0 : state.look.x * .15;
  pose.yaw = damp(pose.yaw ?? P.yaw, P.yaw + lookYaw, 6, dt);
  if (!state.drag) { state.spin += state.spinV * dt; state.spinV *= Math.exp(-dt * 2.2); if (Math.abs(state.spinV) < .4) state.spin = damp(state.spin, Math.round(state.spin / (Math.PI * 2)) * Math.PI * 2, 3, dt); }
  rig.root.rotation.y = pose.yaw + state.spin;
  rig.root.position.set(state.x, pose.air, state.z);
  rig.body.rotation.set(pose.tiltX, 0, pose.tiltZ);
  rig.body.scale.set(1 + (1 - pose.sq) * .5, pose.sq, 1 + (1 - pose.sq) * .5);
  // head leads the look, the goggles bounce a little when they're up
  const A = state.antenna; A.v += (-70 * A.a - 6 * A.v - state.hipV * 1.6) * dt; A.a += A.v * dt;
  rig.head.rotation.set(pose.headX - pose.tiltX * .6 + state.look.y * .18, state.look.x * .55, pose.headZ - pose.tiltZ * .5);
  rig.goggles.rotation.x = lerp(-.56, 0, pose.gog) + clamp(A.a, -.25, .25) * (1 - pose.gog);
  rig.gogStrap.rotation.x = rig.goggles.rotation.x * .45;
  // legs: solved so the skis stay planted, spread for skating
  const [tx, kx] = legIK(pose.hipY, pose.fz);
  [[rig.legL, pose.tLz], [rig.legR, pose.tRz]].forEach(([l, tz]) => { l.thigh.rotation.set(tx, 0, tz); l.knee.rotation.x = kx; l.ski.rotation.set(-(tx + kx), 0, -tz); });
  // arms, and poles kept pointing at the snow
  const arms = [[rig.armL, pose.sLx, pose.sLz, pose.eL, pose.eLz, -1], [rig.armR, pose.sRx, pose.sRz, pose.eR, pose.eRz, 1]];
  arms.forEach(([ar, sx, sz, ex, ez, s]) => {
    ar.sh.rotation.set(sx, 0, sz); ar.el.rotation.set(ex, 0, ez);
    ar.pole.rotation.set(.12 - (sx + ex + pose.tiltX), 0, -(sz + ez) * .85 - pose.tiltZ + s * .06);
  });
  const leds = state.ctx.leds || [0, 0, 0];
  rig.leds.forEach((l, i) => { const v = clamp(leds[i] || 0, 0, 1), p = .55 + .45 * Math.sin(t * 2.4 + i); l.material.color.copy(l.userData.dim).lerp(l.userData.base, v >= 1 ? 1 : v * p); });
  state.blinkAt -= dt;
  if (state.blinkAt < 0) { state.blink = 1; state.blinkAt = 2.2 + Math.random() * 3.5; }
  state.blink = Math.max(0, state.blink - dt * 7);
  const bl = state.blink > .5 ? (1 - state.blink) * 2 : state.blink * 2;
  if (performance.now() - state.pointerAt > 2600 && state.act !== 'look') { state.lookT.x = Math.sin(t * .35) * .25; state.lookT.y = 0; }
  state.look.x = damp(state.look.x, state.lookT.x, 6, dt); state.look.y = damp(state.look.y, state.lookT.y, 6, dt);
  drawFace(P.expr, state.look.x, state.look.y, P.expr === 'idle' || P.expr === 'focus' || P.expr === 'tired' ? bl : 0);
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
    if (d.onTip) { state.antenna.v += 6; play('boing'); say('Hey! Watch the beanie.', 1600); }
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
  const narrow = camera.aspect < 1, fitH = narrow ? 3.3 : 2.85, fitW = 2.05 / camera.aspect, need = Math.max(fitH, fitW), dist = need / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
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
  const dist = state.camDist || camera.userData.dist || 6;
  const px = state.pointerAt ? state.lookT.x * .12 : Math.sin(t * .2) * .08;
  const ly = state.camY || (camera.aspect < 1 ? 1.0 : 1.06); camera.position.set(damp(camera.position.x, px, 3, dt), ly + .28, dist); camera.lookAt(0, ly, 0);
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
window.Buddy = { mount, update, say, play, get _() { return { camera, rig, state, pose }; } };
const pending = document.querySelector('#buddySlot'); if (pending) mount(pending);
