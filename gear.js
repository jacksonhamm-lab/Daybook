// Hard ski gear for the VRoid model, made in code and fixed to its bones: a knit ski
// mask (built from the head's shape, with an opening for the eyes), goggles styled on
// his Smith Squads (bone frame, black-gold mirror lens), skis drawn in the colours of his
// Atomic Bents (no logos), and poles in closed fists. Everything is measured in the
// model's bind (T) pose, then parented to the bone that carries it.
import * as THREE from 'three';
import { toon, INK } from './dress.js';

const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
// a thinner outline for small parts (the body's .006 swamps something goggle-sized)
const INK_FINE = (() => { const m = new THREE.MeshBasicMaterial({ color: 0x0b0c12, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.0022;'); }; return m; })();
const inked = (geo, mat, ink = INK) => { const g = new THREE.Group(); g.add(new THREE.Mesh(geo, mat)); if (ink) g.add(new THREE.Mesh(geo, ink)); return g; };

// Goggle outline seen from the front: a softly arched top, sides that taper in, round
// lower corners and a deep arch for the nose. Smooth closed curve, half width w, half height h.
function goggleOutline(w, h, n = 200) {
  const R = [[0, 1], [.45, .985], [.8, .93], [.97, .7], [1, .2], [.96, -.35], [.85, -.8], [.62, -.98], [.36, -.9], [.2, -.62], [.1, -.38], [0, -.3]];
  const all = R.concat(R.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
  const c = new THREE.CatmullRomCurve3(all.map(([x, y]) => new THREE.Vector3(x * w, y * h, 0)), true, 'centripetal');
  return c.getSpacedPoints(n).slice(0, n).map(p => new THREE.Vector2(p.x, p.y));
}
// Wrap round a vertical cylinder so the goggles follow the face, with a little outward
// bulge from top to bottom like a real lens.
function bend(geo, R, H, bulge = .006) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = x / R, rr = R + z + bulge * Math.max(0, 1 - (y / (H / 2)) ** 2); p.setXYZ(i, Math.sin(a) * rr, y, Math.cos(a) * rr); }
  geo.computeVertexNormals(); return geo;
}
// black-gold mirror (colours measured from his Squad photo): pale gold falling to dark
// bronze across the lens, darker toward the bottom, one soft glint; clipped to the lens outline
// Lens tints you can pick for him (gold is his real Squad lens)
export const LENSES = {
  gold: ['#e6d3a2', '#cdae6c', '#9b7c47', '#5a4420', '#3b2c12'],
  ice: ['#dff4ff', '#94d3f5', '#3f8fcf', '#1f4f86', '#12284a'],
  rose: ['#ffe0e8', '#f39bb3', '#c7577c', '#7d2c4a', '#3d1426'],
  smoke: ['#cfd2d9', '#8d929c', '#5a5f69', '#353941', '#1d1f24'],
  emerald: ['#dcf7e6', '#8fdcb0', '#3e9e6f', '#1f5c40', '#0f2f21'],
};
const lensTex = (pts, w, h, tint = 'gold') => canvasTex(512, Math.round(512 * h / w), (x, W, H) => {
  x.beginPath(); pts.forEach((p, i) => { const px = (p.x / w + .5) * W, py = (.5 - p.y / h) * H; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.clip();
  const L = LENSES[tint] || LENSES.gold, g = x.createLinearGradient(0, 0, W, H * .4); [0, .3, .6, .88, 1].forEach((o, i) => g.addColorStop(o, L[i]));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const v = x.createLinearGradient(0, 0, 0, H); v.addColorStop(0, 'rgba(255,250,230,.22)'); v.addColorStop(.45, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(20,10,0,.35)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  const s = x.createRadialGradient(W * .26, H * .28, 0, W * .26, H * .28, W * .22); s.addColorStop(0, 'rgba(255,255,240,.45)'); s.addColorStop(1, 'rgba(255,255,240,0)'); x.fillStyle = s; x.fillRect(0, 0, W, H);
});
// vertical knit ribs
const ribTex = (base, dark, n) => { const t = canvasTex(1024, 8, (x, W, H) => { x.fillStyle = base; x.fillRect(0, 0, W, H); x.fillStyle = dark; for (let i = 0; i < n; i++) x.fillRect(i * W / n, 0, W / n * .42, H); }); t.wrapS = THREE.RepeatWrapping; return t; };
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
  const skis = {};
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
    const ski = new THREE.Mesh(skiGeo, [topFor(s), toon(0x2a2b30)]); g.add(ski); g.add(new THREE.Mesh(skiGeo, INK));
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
  return { skis, poles, poleMat, skiTops };
}
export function gear(vrm, outfit = {}, colors = {}, { skiTex, lens: lensTint = 'gold', skis: skiName = 'bent' } = {}) {
  const C = { mask: 0x15161b, frame: 0xd5d0c1, strap: 0x8e857c, pole: 0x1a1b20, grip: 0x0e0f12, binding: 0x15161b, accent: 0xd9a441, ...colors };
  let skin, face; const hair = [];
  vrm.scene.traverse(o => { if (!o.isMesh) return; const mats = [].concat(o.material).map(m => m.name).join(); if (o.name === 'Body_(merged)') skin = o; if (/Face_00_SKIN/.test(mats)) face = o; if (/_HAIR/.test(mats)) hair.push(o); });
  const bones = skin.skeleton.bones, bi = n => bones.indexOf(vrm.humanoid.getRawBoneNode(n));
  const bindPos = n => new THREE.Vector3().setFromMatrixPosition(skin.skeleton.boneInverses[bi(n)].clone().invert());
  // parent an object built in bind-pose coordinates to a bone, keeping where it sits
  const attach = (obj, n) => { const m = skin.skeleton.boneInverses[bi(n)].clone().multiply(new THREE.Matrix4().compose(obj.position, obj.quaternion, obj.scale)); m.decompose(obj.position, obj.quaternion, obj.scale); bones[bi(n)].add(obj); return obj; };
  const neckY = bindPos('neck').y, eyeY = (bindPos('leftEye').y + bindPos('rightEye').y) / 2;

  // ── ski mask: rings round the head, each sized from the head at that height ──
  hair.forEach(m => { m.visible = false; });   // the mask covers the hair
  const hp = [], FP = face.geometry.attributes.position, fi = face.geometry.index.array, seen = new Set();
  for (const v of fi) if (!seen.has(v)) { seen.add(v); hp.push([FP.getX(v), FP.getY(v), FP.getZ(v)]); }
  { const P = skin.geometry.attributes.position; for (let v = 0; v < P.count; v++) { const y = P.getY(v); if (y > neckY - .04 && Math.abs(P.getX(v)) < .075) hp.push([P.getX(v), y, P.getZ(v)]); } }
  const topY = Math.max(...hp.map(p => p[1])), band = hp.filter(p => Math.abs(p[1] - eyeY) < .06), cz = (Math.min(...band.map(p => p[2])) + Math.max(...band.map(p => p[2]))) / 2, cx = bindPos('head').x;
  const SEG = 72, rows = []; for (let y = neckY - .015; y < topY - .004; y += .006) rows.push(y);
  let rad = rows.map(y => {
    const e = new Array(SEG).fill(0), bw = y > topY - .03 ? .01 : .005;
    for (const [x, py, z] of hp) { if (Math.abs(py - y) > bw) continue; const b = Math.floor(((Math.atan2(x - cx, z - cz) + Math.PI) / (2 * Math.PI)) * SEG) % SEG; e[b] = Math.max(e[b], Math.hypot(x - cx, z - cz)); }
    for (let pass = 0; pass < 8; pass++) for (let b = 0; b < SEG; b++) { const l = e[(b + SEG - 1) % SEG], r = e[(b + 1) % SEG]; if (!e[b]) e[b] = Math.max(l, r); else e[b] = Math.max(e[b], (l + r) / 2 * .97); }
    return e;
  });
  for (let pass = 0; pass < 3; pass++) rad = rad.map(row => row.map((r, b) => (row[(b + SEG - 1) % SEG] + row[(b + 1) % SEG] + r * 2) / 4));
  for (let pass = 0; pass < 2; pass++) rad = rad.map((row, i) => row.map((r, b) => (rad[Math.max(0, i - 1)][b] + rad[Math.min(rad.length - 1, i + 1)][b] + r * 2) / 4));
  rad = rad.map(row => row.map(r => r + .008));   // knit thickness
  const maskR = (a, y) => { const fi = clamp01((y - rows[0]) / (rows[rows.length - 1] - rows[0])) * (rows.length - 1), i = Math.min(rows.length - 2, Math.floor(fi)), fy = fi - i, fb = ((a + Math.PI) / (2 * Math.PI)) * SEG - .5, b0 = ((Math.floor(fb) % SEG) + SEG) % SEG, b1 = (b0 + 1) % SEG, fr = fb - Math.floor(fb);
    return (rad[i][b0] * (1 - fr) + rad[i][b1] * fr) * (1 - fy) + (rad[i + 1][b0] * (1 - fr) + rad[i + 1][b1] * fr) * fy; };
  const mask = (() => {
    const pos = [], uv = [], idx = [], si = [], sw = [], H = bi('head'), N = bi('neck');
    const vert = (x, y, z, u, v) => { pos.push(x, y, z); uv.push(u, v); const w = smooth(neckY - .01, neckY + .045, y); si.push(H, N, 0, 0); sw.push(w, 1 - w, 0, 0); return pos.length / 3 - 1; };
    rows.forEach((y, i) => { for (let b = 0; b <= SEG; b++) { const a = (b + .5) / SEG * 2 * Math.PI - Math.PI, R = rad[i][b % SEG]; vert(cx + Math.sin(a) * R, y, cz + Math.cos(a) * R, b / SEG, y * 4); } });
    // eye opening: a rounded slot across both eyes
    const open = (x, y, z) => z > cz && (Math.abs(x - cx) / .064) ** 4 + (Math.abs(y - eyeY - .003) / .027) ** 4 < 1 && !(Math.abs(x - cx) < .03 && y < eyeY - .006);   // the mask stays over the nose bridge
    const W = SEG + 1;
    for (let i = 0; i < rows.length - 1; i++) for (let b = 0; b < SEG; b++) {
      const p = i * W + b, q = p + 1, mx = (pos[p * 3] + pos[(q + W) * 3]) / 2, my = (pos[p * 3 + 1] + pos[(q + W) * 3 + 1]) / 2, mz = (pos[p * 3 + 2] + pos[(q + W) * 3 + 2]) / 2;
      if (!open(mx, my, mz)) idx.push(p, p + W, q, q, p + W, q + W);
    }
    // close the crown
    const last = (rows.length - 1) * W, top = vert(cx, topY + .006, cz + (rad[rows.length - 1][SEG / 2] - rad[rows.length - 1][0]) * -.1, .5, topY * 4);
    for (let b = 0; b < SEG; b++) idx.push(last + b, last + b + 1, top);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    geo.setIndex(idx); geo.computeVertexNormals();
    const tex = ribTex('#1a1b21', '#0f1014', 140), mat = toon(0xffffff); mat.map = tex;
    const m = new THREE.SkinnedMesh(geo, mat); m.name = 'mask'; m.frustumCulled = false; skin.parent.add(m); m.bind(skin.skeleton, skin.bindMatrix);
    const ink = new THREE.SkinnedMesh(geo, INK); ink.frustumCulled = false; skin.parent.add(ink); ink.bind(skin.skeleton, skin.bindMatrix);
    return m;
  })();

  // ── optional beanie over the mask: the mask's rings above the brow, pushed out, with a folded cuff ──
  const beanie = (() => {
    const y0 = eyeY + .036, first = rows.findIndex(y => y >= y0), pos = [], uv = [], idx = [], W = SEG + 1, H = bi('head');
    const ring = (y, i, extra) => { for (let b = 0; b <= SEG; b++) { const a = (b + .5) / SEG * 2 * Math.PI - Math.PI, R = rad[i][b % SEG] + extra; pos.push(cx + Math.sin(a) * R, y, cz + Math.cos(a) * R); uv.push(b / SEG, y * 4); } };
    ring(rows[first] - .004, first, .006);                                   // tucked edge
    for (let i = first; i < rows.length; i++) ring(rows[i], i, rows[i] < y0 + .034 ? .021 : .012 + .004 * (rows.length - i) / rows.length);
    const nR = pos.length / 3 / W;
    for (let i = 0; i < nR - 1; i++) for (let b = 0; b < SEG; b++) { const p = i * W + b, q = p + 1; idx.push(p, p + W, q, q, p + W, q + W); }
    const top = pos.length / 3; pos.push(cx, topY + .026, cz); uv.push(.5, 1);
    for (let b = 0; b < SEG; b++) idx.push((nR - 1) * W + b, (nR - 1) * W + b + 1, top);
    const n = pos.length / 3, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n).fill(0).flatMap(() => [H, 0, 0, 0]), 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(n).fill(0).flatMap(() => [1, 0, 0, 0]), 4));
    geo.setIndex(idx); geo.computeVertexNormals();
    const mat = toon(0xffffff); mat.map = ribTex('#17181d', '#0c0d10', 110);
    const m = new THREE.SkinnedMesh(geo, mat); m.name = 'beanie'; m.frustumCulled = false; skin.parent.add(m); m.bind(skin.skeleton, skin.bindMatrix);
    const ink = new THREE.SkinnedMesh(geo, INK); ink.frustumCulled = false; skin.parent.add(ink); ink.bind(skin.skeleton, skin.bindMatrix);
    m.visible = ink.visible = false; m.userData.ink = ink; return m;
  })();
  // the goggles sit a touch proud when there's a beanie under the strap
  // ── goggles: styled on his Squads. A solid bone frame with the mirror lens mounted in
  // front of it (so the frame shows as a rim, heavier along the bottom), strap round the mask ──
  const goggles = new THREE.Group(); goggles.name = 'goggles'; const strapMat = toon(C.strap);
  const gy = eyeY + .003, Rg = maskR(0, gy) + .006, GW = .198, GH = .084;
  goggles.position.set(cx, gy, cz);
  const frameShape = new THREE.Shape(goggleOutline(GW / 2, GH / 2));
  const frameMat = toon(C.frame);
  goggles.add(inked(bend(new THREE.ExtrudeGeometry(frameShape, { depth: .01, bevelEnabled: true, bevelThickness: .0025, bevelSize: .002, bevelSegments: 4, curveSegments: 8 }), Rg, GH), frameMat, INK_FINE));
  const LW = GW * .955, LH = GH * .86, lensPts = goggleOutline(LW / 2, LH / 2), lensGeo = new THREE.PlaneGeometry(LW, LH, 80, 16);
  lensGeo.translate(0, GH * .035, 0);
  const lens = new THREE.Mesh(bend(lensGeo, Rg + .0135, GH), new THREE.MeshBasicMaterial({ map: lensTex(lensPts, LW, LH, lensTint), transparent: true, alphaTest: .5, side: THREE.DoubleSide }));
  goggles.add(lens);
  const sa = GW / 2 / Rg;
  { // strap: a wide band that follows the mask round the back of the head
    const pos = [], idx = [], n = 60, sh = .019;
    for (let k = 0; k <= n; k++) { const a = sa - .06 + (2 * Math.PI - 2 * sa + .12) * k / n, R = Math.max(maskR(a, gy - sh), maskR(a, gy + sh)) + .003; [-sh, sh].forEach(dy => pos.push(Math.sin(a) * R, dy + GH * .06, Math.cos(a) * R)); }
    for (let k = 0; k < n; k++) { const p = k * 2; idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    goggles.add(inked(geo, strapMat, INK_FINE));
  }
  attach(goggles, 'head');

  const { skis, poles, poleMat, skiTops } = skisAndPoles({ bindPos, attach, hasBone: n => bi(n) >= 0, boots: outfit.boots && outfit.boots.userData.bind, C, skiTex, skiName });
  // live restyling from the customise sheet
  const setLens = t => { const old = lens.material.map; lens.material.map = lensTex(lensPts, LW, LH, t); lens.material.needsUpdate = true; old && old.dispose(); };
  const setSkis = n => Object.entries(skiTops).forEach(([s, m]) => { const old = m.map; m.map = bentTex(s === 'l' ? 1234567 : 7654321, n); m.needsUpdate = true; old && old.dispose(); });
  const shadeOf = c => '#' + new THREE.Color(c).multiplyScalar(.62).getHexString();
  const retex = (m, c, n) => { const old = m.material.map; m.material.map = ribTex(c, shadeOf(c), n); m.material.needsUpdate = true; old && old.dispose(); };
  const setMask = c => retex(mask, c, 140);
  const setBeanie = (on, c) => { beanie.visible = beanie.userData.ink.visible = !!on; if (on && c) retex(beanie, c, 110); };
  const setFrame = c => frameMat.color.set(c), setStrap = c => strapMat.color.set(c), setPoles = c => poleMat.color.set(c);
  return { mask, beanie, goggles, skis, poles, hair, setLens, setSkis, setMask, setBeanie, setFrame, setStrap, setPoles };
}

// Close both hands into fists round the pole grips (normalized bones: fingers point
// along ±x in the rest pose, so curling is a turn about z).
// Hands. 0 = relaxed (a natural curl, looser at the index, tighter at the little finger,
// thumb resting in), 1 = a closed fist, negative = opening toward flat (-1). One value per hand.
// Called every frame, so the bone list is looked up once per model and reused.
// Skis and poles for a plain (Tripo/Mixamo) model, built in world space at its T-pose rest and attached
// in place. Their bind pose has the arms hanging, so bind matrices would point the poles the wrong way.
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
  const setSkis = n => Object.entries(kit.skiTops).forEach(([s, m]) => { const old = m.map; m.map = bentTex(s === 'l' ? 1234567 : 7654321, n); m.needsUpdate = true; old && old.dispose(); });
  const setPoles = c => kit.poleMat.color.set(c);
  return { skis: kit.skis, poles: kit.poles, setSkis, setPoles };
}
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
