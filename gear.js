// Ski gear made in code and fixed to his bones: skis drawn in the colours of his Atomic Bents (no logos)
// with bindings under each boot, and poles in closed fists. Also the finger poses (hands, fists).
import * as THREE from 'three';
import { GLTFLoader } from './vendor/jsm/loaders/GLTFLoader.js';
import { toon, INK } from './dress.js';

const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
// a thinner outline for small parts (the body's .006 swamps something goggle-sized)
const INK_FINE = (() => { const m = new THREE.MeshBasicMaterial({ color: 0x0b0c12, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.0022;'); }; return m; })();
const inked = (geo, mat, ink = INK) => { const g = new THREE.Group(); g.add(new THREE.Mesh(geo, mat)); if (ink) g.add(new THREE.Mesh(geo, ink)); return g; };

// Topsheet in the spirit of his Atomic Bents, no lettering: hot pink at the tip bleeding
// through purple into blue, a dark ridge of peaks, then curling cyan waves down to the tail.
// Tip is the top of the canvas.
// Topsheets you can pick: his Bents (sky to sea), plus a few other colourways
export const SKIS = {
  bent: { sky: [[0, '#f0406a'], [.12, '#e8336e'], [.24, '#b43c8e'], [.33, '#6c4fb2'], [.4, '#3a5cc0'], [.5, '#2376c8'], [.75, '#1d62b8'], [1, '#27438f']], ridge: '#1b2a6a', deep: [10, 40, 110], curls: ['#8fe6ff', '#46c3f2', '#ffffff', '#2b8fdc', '#b8f1ff'], cloud: [255, 150, 170] },
  midnight: { sky: [[0, '#1b1f3a'], [.3, '#2a2f5e'], [.45, '#1a2350'], [1, '#0d1330']], ridge: '#0a0e22', deep: [8, 12, 40], curls: ['#d9a441', '#f0c96a', '#ffffff', '#b8862f', '#ffe3a1'], cloud: [120, 130, 200] },
  glacier: { sky: [[0, '#f4f8fb'], [.25, '#d6ecf5'], [.45, '#9fd4e6'], [1, '#3f93b8']], ridge: '#5d7f99', deep: [30, 110, 150], curls: ['#ffffff', '#c9f0ff', '#1e6f96', '#7fd0ec', '#e8fbff'], cloud: [255, 255, 255] },
  lava: { sky: [[0, '#ffcf5a'], [.18, '#ff8a2a'], [.35, '#e0421f'], [.5, '#7a1616'], [1, '#1a0b0b']], ridge: '#2a0d0d', deep: [60, 12, 10], curls: ['#ffb347', '#ff6a2a', '#ffe08a', '#c7361b', '#ffd0a0'], cloud: [255, 200, 120] },
};
const bentTex = (seed, name = 'bent') => canvasTex(256, 2048, (x, W, H) => {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647), K = SKIS[name] || SKIS.bent;
  const g = x.createLinearGradient(0, 0, 0, H);
  K.sky.forEach(([o, c]) => g.addColorStop(o, c));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // soft cloud streaks in the pink sky
  for (let i = 0; i < 14; i++) { const y = H * (.03 + rnd() * .28); x.fillStyle = `rgba(${K.cloud[0]},${K.cloud[1] - 30 + rnd() * 80 | 0},${K.cloud[2] - 20 + rnd() * 60 | 0},${.12 + rnd() * .12})`; x.beginPath(); x.ellipse(rnd() * W, y, W * (.3 + rnd() * .5), H * (.004 + rnd() * .008), 0, 0, Math.PI * 2); x.fill(); }
  // a ridge of dark peaks where the sky meets the sea
  x.fillStyle = K.ridge; x.beginPath(); x.moveTo(0, H * .44);
  for (let k = 0; k <= 8; k++) x.lineTo(W * k / 8, H * (.36 + (k % 2 ? 0 : .035) + rnd() * .02));
  x.lineTo(W, H * .46); x.lineTo(0, H * .46); x.closePath(); x.fill();
  // waves: deep blue swells, then layered curls in cyan, white and blue
  const curl = (cx, cy, r, turns, col, lw) => { x.strokeStyle = col; x.lineWidth = lw; x.lineCap = 'round'; x.beginPath(); for (let t = 0; t <= 1; t += .01) { const a = t * turns * Math.PI * 2, rr = r * (1 - t * .85), px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 1.6; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); };
  for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${K.deep[0] + rnd() * 20 | 0},${K.deep[1] + rnd() * 40 | 0},${K.deep[2] + rnd() * 60 | 0},.55)`; x.beginPath(); x.ellipse(rnd() * W, H * (.46 + rnd() * .54), W * (.25 + rnd() * .35), H * (.02 + rnd() * .03), rnd() * .6 - .3, 0, Math.PI * 2); x.fill(); }
  for (let i = 0; i < 46; i++) { const cy = H * (.47 + rnd() * .52), r = W * (.12 + rnd() * .3); curl(rnd() * W, cy, r, .8 + rnd() * 1.2, K.curls[i % 5], 3 + rnd() * 7); }
  for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(190,110,60,.8)'; x.beginPath(); x.ellipse(rnd() * W, H * (.55 + rnd() * .4), W * .05, H * .012, rnd() * 3, 0, Math.PI * 2); x.fill(); }
  // dark sidewall lines
  x.fillStyle = '#10131f'; x.fillRect(0, 0, 6, H); x.fillRect(W - 6, 0, 6, H);
});

// Skis under each boot and poles in each fist. Works on any rig: positions come from bindPos (bind or
// rest pose, in the same space attach expects) and boots is the boot vertices' bounds source.
function skisAndPoles({ bindPos, attach, hasBone, boots, C, skiTex, skiName }) {
  // ── skis: twin tips with a sidecut and rocker, bindings under each boot ──
  const skis = {}, built = {};   // built: the code-drawn ski and its outline, per side (hidden while the painted skis show)
  const skiGeo = (() => {
    const L = 1.84, tipW = .068, waist = .052, tailW = .065, hw = t => { const w = t > 0 ? waist + (tipW - waist) * t * t : waist + (tailW - waist) * t * t, e = Math.abs(t); return e > .93 ? w * Math.sqrt(Math.max(0, 1 - ((e - .93) / .07) ** 2)) : w; };
    const sh = new THREE.Shape(), N = 90; for (let k = 0; k <= N; k++) { const t = -1 + 2 * k / N; k ? sh.lineTo(hw(t), -t * L / 2) : sh.moveTo(hw(t), -t * L / 2); } for (let k = N; k >= 0; k--) { const t = -1 + 2 * k / N; sh.lineTo(-hw(t), -t * L / 2); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: .014, bevelEnabled: false, curveSegments: 4 }); g.rotateX(-Math.PI / 2);   // length now runs along +z (tip forward), thickness up
    const P = g.attributes.position, uv = new Float32Array(P.count * 2), rock = .3;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), e = Math.max(0, Math.abs(z) - (L / 2 - rock)) / rock; P.setY(i, P.getY(i) - .014 + .075 * e * e); uv[i * 2] = .5 - x / (2 * tipW); uv[i * 2 + 1] = z / L + .5; }   // photo: tip at the top, skier's left on the left
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  })();
  const loader = new THREE.TextureLoader();
  const topFor = s => { const m = toon(0xffffff); m.side = THREE.FrontSide; if (skiTex && skiTex[s]) { const t = loader.load(skiTex[s]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; m.map = t; } else m.map = bentTex(s === 'l' ? 1234567 : 7654321, skiName); skiTops[s] = m; return m; };
  const skiTops = {};
  [['l', 'leftFoot'], ['r', 'rightFoot']].forEach(([s, bone]) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, z0 = Infinity, z1 = -Infinity;
    if (boots) for (let v = 0; v < boots.n; v++) { const x = boots.pos[v * 3], y = boots.pos[v * 3 + 1], z = boots.pos[v * 3 + 2]; if ((x > 0) !== (s === 'l')) continue; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    else { const f = bindPos(bone); x0 = f.x - .05; x1 = f.x + .05; y0 = 0; z0 = f.z - .1; z1 = f.z + .18; }
    const g = new THREE.Group(); g.name = 'ski_' + s;
    const bh = .022, cxs = (x0 + x1) / 2, czs = (z0 + z1) / 2;
    g.position.set(cxs, y0 - bh, czs + .03);
    const ski = new THREE.Mesh(skiGeo, [topFor(s), toon(0x2a2b30)]), skiInk = new THREE.Mesh(skiGeo, INK); g.add(ski, skiInk); built[s] = [ski, skiInk];
    const blk = (w, h, d, x, y, z, c) => { const b = inked(new THREE.BoxGeometry(w, h, d), toon(c), INK_FINE); b.position.set(x, y, z); g.add(b); };
    const bl = z1 - z0;
    blk(.07, bh, bl * .9, 0, bh / 2, -.03, C.binding);                  // plate
    blk(.075, .03, .06, 0, bh + .012, bl / 2 - .03 + .01, C.binding);    // toe piece
    blk(.075, .045, .07, 0, bh + .02, -bl / 2 - .03 - .01, C.binding);   // heel piece
    blk(.077, .008, .02, 0, bh + .034, -bl / 2 - .03 - .01, C.accent);   // heel accent
    skis[s] = attach(g, bone);
  });

  // ── poles: in a closed fist, running out of the little-finger side ──
  const poles = {}, poleMat = toon(C.pole);
  [['l', 'left'], ['r', 'right']].forEach(([s, side]) => {
    const hand = bindPos(side + 'Hand'), mid = bindPos(hasBone(side + 'MiddleProximal') ? side + 'MiddleProximal' : side + 'IndexProximal'), grip = hand.clone().lerp(mid, .95); grip.y -= .022;
    const g = new THREE.Group(); g.name = 'pole_' + s; g.position.copy(grip);
    const L = 1.22, part = (geo, c, y) => { const m = inked(geo, c.isMaterial ? c : toon(c), INK_FINE); m.position.y = y; g.add(m); };
    part(new THREE.CylinderGeometry(.0085, .0085, L, 10), poleMat, -L / 2 + .02);
    part(new THREE.CylinderGeometry(.015, .013, .16, 14), C.grip, -.03);
    part(new THREE.CylinderGeometry(.018, .018, .012, 14), C.grip, .054);
    part(new THREE.CylinderGeometry(.05, .05, .006, 20), C.grip, -L + .1);
    part(new THREE.ConeGeometry(.007, .03, 8).rotateX(Math.PI), C.accent, -L + .005);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1));   // shaft leaves the fist toward the back (the little-finger side)
    poles[s] = attach(g, side + 'Hand');
  });
  return { skis, poles, poleMat, skiTops, built };
}
let ART_SKIS = null;   // loaded once and shared; private like the other models (KV, model:skis.glb)
const loadArtSkis = () => ART_SKIS || (ART_SKIS = new GLTFLoader().loadAsync('models/skis.glb?v=1').then(g => { const out = {}; g.scene.traverse(o => { const m = o.isMesh && /^ski_([lr])/.exec(o.name); if (m) out[m[1]] = o; }); return out; }));
// Skis and poles, built in world space at the model's T-pose rest and attached in place.
export function plainSkiKit(vrm, { skis: skiName = 'bent', pole } = {}) {
  const C = { pole: 0x1a1b20, grip: 0x0e0f12, binding: 0x15161b, accent: 0xd9a441, ...(pole ? { pole } : {}) };
  vrm.scene.updateMatrixWorld(true);
  const R = n => vrm.humanoid.getRawBoneNode(n), bindPos = n => R(n).getWorldPosition(new THREE.Vector3());
  const attach = (obj, n) => { R(n).attach(obj); return obj; };
  // boot bounds: the body's vertices below the ankle, in world space at rest (the legs aren't re-posed)
  let skin; vrm.scene.traverse(o => { if (!skin && o.isSkinnedMesh && o.name !== 'ink') skin = o; });
  const P = skin.geometry.attributes.position, footY = Math.max(bindPos('leftFoot').y, bindPos('rightFoot').y) + .03, v = new THREE.Vector3(), pos = [];
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(skin.matrixWorld); if (v.y < footY) pos.push(v.x, v.y, v.z); }
  const kit = skisAndPoles({ bindPos, attach, hasBone: n => !!R(n), boots: { n: pos.length / 3, pos }, C, skiName });
  // 'art' is the pair he generated in Tripo (tools/blender/skis.py lays them flat): the same bindings and poles,
  // with the model in place of the code-drawn ski. The other names are code-drawn topsheets.
  const art = {}; let want = skiName, failed = false;
  const show = () => { const on = want === 'art' && !failed; for (const s of ['l', 'r']) { kit.built[s].forEach(m => { m.visible = !on; }); if (art[s]) art[s].visible = on; } };
  const setSkis = n => {
    want = n;
    if (n !== 'art') Object.entries(kit.skiTops).forEach(([s, m]) => { const old = m.map; m.map = bentTex(s === 'l' ? 1234567 : 7654321, n); m.needsUpdate = true; old && old.dispose(); });
    show();
  };
  show();   // nothing under his boots for the moment it takes the painted pair to arrive, rather than the wrong skis
  loadArtSkis().then(A => {
    for (const s of ['l', 'r']) {
      if (!A[s]) throw new Error('skis model: no ski_' + s);
      const mat = toon(0xffffff); mat.map = A[s].material.map; mat.side = THREE.FrontSide;
      const grp = new THREE.Group(); grp.add(new THREE.Mesh(A[s].geometry, mat), new THREE.Mesh(A[s].geometry, INK)); kit.skis[s].add(grp); art[s] = grp;
    }
    show();
  }).catch(() => { failed = true; show(); });   // no model: the code-drawn skis stand in
  const setPoles = c => kit.poleMat.color.set(c);
  return { skis: kit.skis, poles: kit.poles, setSkis, setPoles };
}
// Hands. 0 = relaxed (a natural curl, looser at the index, tighter at the little finger,
// thumb resting in), 1 = a closed fist, negative = opening toward flat (-1). One value per hand.
// Called every frame, so the bone list is looked up once per model and reused.
// (normalized bones: fingers point along ±x in the rest pose, so curling is a turn about z)
const FIST = [1.35, 1.55, 1.1], RELAX = { Index: [.2, .3, .2], Middle: [.3, .4, .26], Ring: [.4, .46, .3], Little: [.5, .5, .36] }, FINGER_BONES = new WeakMap();
export function hands(vrm, L = 0, R = 0) {
  let F = FINGER_BONES.get(vrm);
  if (!F) {
    const h = vrm.humanoid; F = [];
    ['left', 'right'].forEach(side => {
      const k = side === 'left' ? -1 : 1, l = side === 'left';
      ['Index', 'Middle', 'Ring', 'Little'].forEach(f => ['Proximal', 'Intermediate', 'Distal'].forEach((j, n) => { const bn = h.getNormalizedBoneNode(side + f + j); if (bn) F.push([bn, 'z', k, RELAX[f][n], FIST[n], l]); }));
      const t = h.getNormalizedBoneNode(side + 'ThumbProximal'), t2 = h.getNormalizedBoneNode(side + 'ThumbDistal');
      if (t) F.push([t, 'y', k, -.2, -.5, l]); if (t2) F.push([t2, 'z', k, .25, .6, l]);
    });
    FINGER_BONES.set(vrm, F);
  }
  for (const [bn, axis, k, relax, fist, l] of F) { const s = l ? L : R; bn.rotation[axis] = k * (s >= 0 ? relax + (fist - relax) * Math.min(1, s) : relax * (1 + Math.max(-1, s))); }
}
export function fists(vrm, amount = 1) { hands(vrm, amount, amount); }
