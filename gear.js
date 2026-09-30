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
const lensTex = (pts, w, h) => canvasTex(512, Math.round(512 * h / w), (x, W, H) => {
  x.beginPath(); pts.forEach((p, i) => { const px = (p.x / w + .5) * W, py = (.5 - p.y / h) * H; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.clip();
  const g = x.createLinearGradient(0, 0, W, H * .4); g.addColorStop(0, '#e6d3a2'); g.addColorStop(.3, '#cdae6c'); g.addColorStop(.6, '#9b7c47'); g.addColorStop(.88, '#5a4420'); g.addColorStop(1, '#3b2c12');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const v = x.createLinearGradient(0, 0, 0, H); v.addColorStop(0, 'rgba(255,250,230,.22)'); v.addColorStop(.45, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(20,10,0,.35)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  const s = x.createRadialGradient(W * .26, H * .28, 0, W * .26, H * .28, W * .22); s.addColorStop(0, 'rgba(255,255,240,.45)'); s.addColorStop(1, 'rgba(255,255,240,0)'); x.fillStyle = s; x.fillRect(0, 0, W, H);
});
// vertical knit ribs
const ribTex = (base, dark, n) => { const t = canvasTex(1024, 8, (x, W, H) => { x.fillStyle = base; x.fillRect(0, 0, W, H); x.fillStyle = dark; for (let i = 0; i < n; i++) x.fillRect(i * W / n, 0, W / n * .42, H); }); t.wrapS = THREE.RepeatWrapping; return t; };
// Topsheet in the spirit of his Atomic Bents, no lettering: hot pink at the tip bleeding
// through purple into blue, a dark ridge of peaks, then curling cyan waves down to the tail.
// Tip is the top of the canvas.
const bentTex = seed => canvasTex(256, 2048, (x, W, H) => {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const g = x.createLinearGradient(0, 0, 0, H);
  [[0, '#f0406a'], [.12, '#e8336e'], [.24, '#b43c8e'], [.33, '#6c4fb2'], [.4, '#3a5cc0'], [.5, '#2376c8'], [.75, '#1d62b8'], [1, '#27438f']].forEach(([o, c]) => g.addColorStop(o, c));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // soft cloud streaks in the pink sky
  for (let i = 0; i < 14; i++) { const y = H * (.03 + rnd() * .28); x.fillStyle = `rgba(255,${120 + rnd() * 80 | 0},${150 + rnd() * 60 | 0},${.12 + rnd() * .12})`; x.beginPath(); x.ellipse(rnd() * W, y, W * (.3 + rnd() * .5), H * (.004 + rnd() * .008), 0, 0, Math.PI * 2); x.fill(); }
  // a ridge of dark peaks where the sky meets the sea
  x.fillStyle = '#1b2a6a'; x.beginPath(); x.moveTo(0, H * .44);
  for (let k = 0; k <= 8; k++) x.lineTo(W * k / 8, H * (.36 + (k % 2 ? 0 : .035) + rnd() * .02));
  x.lineTo(W, H * .46); x.lineTo(0, H * .46); x.closePath(); x.fill();
  // waves: deep blue swells, then layered curls in cyan, white and blue
  const curl = (cx, cy, r, turns, col, lw) => { x.strokeStyle = col; x.lineWidth = lw; x.lineCap = 'round'; x.beginPath(); for (let t = 0; t <= 1; t += .01) { const a = t * turns * Math.PI * 2, rr = r * (1 - t * .85), px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 1.6; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); };
  for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${10 + rnd() * 20 | 0},${40 + rnd() * 40 | 0},${110 + rnd() * 60 | 0},.55)`; x.beginPath(); x.ellipse(rnd() * W, H * (.46 + rnd() * .54), W * (.25 + rnd() * .35), H * (.02 + rnd() * .03), rnd() * .6 - .3, 0, Math.PI * 2); x.fill(); }
  for (let i = 0; i < 46; i++) { const cy = H * (.47 + rnd() * .52), r = W * (.12 + rnd() * .3); curl(rnd() * W, cy, r, .8 + rnd() * 1.2, ['#8fe6ff', '#46c3f2', '#ffffff', '#2b8fdc', '#b8f1ff'][i % 5], 3 + rnd() * 7); }
  for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(190,110,60,.8)'; x.beginPath(); x.ellipse(rnd() * W, H * (.55 + rnd() * .4), W * .05, H * .012, rnd() * 3, 0, Math.PI * 2); x.fill(); }
  // dark sidewall lines
  x.fillStyle = '#10131f'; x.fillRect(0, 0, 6, H); x.fillRect(W - 6, 0, 6, H);
});

export function gear(vrm, outfit = {}, colors = {}, { skiTex } = {}) {
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

  // ── goggles: styled on his Squads. A solid bone frame with the mirror lens mounted in
  // front of it (so the frame shows as a rim, heavier along the bottom), strap round the mask ──
  const goggles = new THREE.Group(); goggles.name = 'goggles';
  const gy = eyeY + .003, Rg = maskR(0, gy) + .006, GW = .198, GH = .084;
  goggles.position.set(cx, gy, cz);
  const frameShape = new THREE.Shape(goggleOutline(GW / 2, GH / 2));
  goggles.add(inked(bend(new THREE.ExtrudeGeometry(frameShape, { depth: .01, bevelEnabled: true, bevelThickness: .0025, bevelSize: .002, bevelSegments: 4, curveSegments: 8 }), Rg, GH), toon(C.frame), INK_FINE));
  const LW = GW * .955, LH = GH * .86, lensPts = goggleOutline(LW / 2, LH / 2), lensGeo = new THREE.PlaneGeometry(LW, LH, 80, 16);
  lensGeo.translate(0, GH * .035, 0);
  const lens = new THREE.Mesh(bend(lensGeo, Rg + .0135, GH), new THREE.MeshBasicMaterial({ map: lensTex(lensPts, LW, LH), transparent: true, alphaTest: .5, side: THREE.DoubleSide }));
  goggles.add(lens);
  const sa = GW / 2 / Rg;
  { // strap: a wide band that follows the mask round the back of the head
    const pos = [], idx = [], n = 60, sh = .019;
    for (let k = 0; k <= n; k++) { const a = sa - .06 + (2 * Math.PI - 2 * sa + .12) * k / n, R = Math.max(maskR(a, gy - sh), maskR(a, gy + sh)) + .003; [-sh, sh].forEach(dy => pos.push(Math.sin(a) * R, dy + GH * .06, Math.cos(a) * R)); }
    for (let k = 0; k < n; k++) { const p = k * 2; idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    goggles.add(inked(geo, toon(C.strap), INK_FINE));
  }
  attach(goggles, 'head');

  // ── skis: twin tips with a sidecut and rocker, bindings under each boot ──
  const skis = {}, boots = outfit.boots && outfit.boots.userData.bind;
  const skiGeo = (() => {
    const L = 1.84, tipW = .068, waist = .052, tailW = .065, hw = t => { const w = t > 0 ? waist + (tipW - waist) * t * t : waist + (tailW - waist) * t * t, e = Math.abs(t); return e > .93 ? w * Math.sqrt(Math.max(0, 1 - ((e - .93) / .07) ** 2)) : w; };
    const sh = new THREE.Shape(), N = 90; for (let k = 0; k <= N; k++) { const t = -1 + 2 * k / N; k ? sh.lineTo(hw(t), -t * L / 2) : sh.moveTo(hw(t), -t * L / 2); } for (let k = N; k >= 0; k--) { const t = -1 + 2 * k / N; sh.lineTo(-hw(t), -t * L / 2); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: .014, bevelEnabled: false, curveSegments: 4 }); g.rotateX(-Math.PI / 2);   // length now runs along +z (tip forward), thickness up
    const P = g.attributes.position, uv = new Float32Array(P.count * 2), rock = .3;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), e = Math.max(0, Math.abs(z) - (L / 2 - rock)) / rock; P.setY(i, P.getY(i) - .014 + .075 * e * e); uv[i * 2] = .5 - x / (2 * tipW); uv[i * 2 + 1] = z / L + .5; }   // photo: tip at the top, skier's left on the left
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  })();
  const loader = new THREE.TextureLoader();
  const topFor = s => { const m = toon(0xffffff); m.side = THREE.FrontSide; if (skiTex && skiTex[s]) { const t = loader.load(skiTex[s]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; m.map = t; } else m.map = bentTex(s === 'l' ? 1234567 : 7654321); return m; };
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
  const poles = {};
  [['l', 'left'], ['r', 'right']].forEach(([s, side]) => {
    const hand = bindPos(side + 'Hand'), mid = bindPos(side + 'MiddleProximal'), grip = hand.clone().lerp(mid, .95); grip.y -= .022;
    const g = new THREE.Group(); g.name = 'pole_' + s; g.position.copy(grip);
    const L = 1.22, part = (geo, c, y) => { const m = inked(geo, toon(c), INK_FINE); m.position.y = y; g.add(m); };
    part(new THREE.CylinderGeometry(.0085, .0085, L, 10), C.pole, -L / 2 + .02);
    part(new THREE.CylinderGeometry(.015, .013, .16, 14), C.grip, -.03);
    part(new THREE.CylinderGeometry(.018, .018, .012, 14), C.grip, .054);
    part(new THREE.CylinderGeometry(.05, .05, .006, 20), C.grip, -L + .1);
    part(new THREE.ConeGeometry(.007, .03, 8).rotateX(Math.PI), C.accent, -L + .005);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1));   // shaft leaves the fist toward the back (the little-finger side)
    poles[s] = attach(g, side + 'Hand');
  });
  return { mask, goggles, skis, poles, hair };
}

// Close both hands into fists round the pole grips (normalized bones: fingers point
// along ±x in the rest pose, so curling is a turn about z).
export function fists(vrm, amount = 1) {
  const h = vrm.humanoid;
  ['left', 'right'].forEach(side => {
    const k = side === 'left' ? -1 : 1;
    ['Index', 'Middle', 'Ring', 'Little'].forEach(f => ['Proximal', 'Intermediate', 'Distal'].forEach((j, n) => { const b = h.getNormalizedBoneNode(side + f + j); if (b) b.rotation.z = k * amount * [1.35, 1.55, 1.1][n]; }));
    const t = h.getNormalizedBoneNode(side + 'ThumbProximal'), t2 = h.getNormalizedBoneNode(side + 'ThumbDistal'); if (t) t.rotation.y = k * -.5 * amount; if (t2) t2.rotation.z = k * .6 * amount;
  });
}
