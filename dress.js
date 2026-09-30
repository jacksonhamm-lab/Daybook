// Ski clothes made from the avatar's own body: pick the body's triangles by which bone
// moves them, subdivide for detail, reshape them, and bind the result to the same
// skeleton so it bends exactly like the body. The jacket is built fresh as a tube and
// sleeves sized from the body. Styled after Jackson's Armada 3L shell and TNF shell pants.
import * as THREE from 'three';

export const TONES = (() => { const t = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
// double-sided so looking into a hem or cuff shows lining, not the black outline behind it
export const toon = color => new THREE.MeshToonMaterial({ color, gradientMap: TONES, side: THREE.DoubleSide });
export const INK = (() => { const m = new THREE.MeshBasicMaterial({ color: 0x0b0c12, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.006;'); }; return m; })();

// A small editable mesh: bind-pose positions, smooth normals, and up to 4 bone weights per vertex.
function compact(src, keep, nrm) {
  const map = new Map(), P = [], N = [], S = [], idx = [];
  const P0 = src.attributes.position, SI = src.attributes.skinIndex, SW = src.attributes.skinWeight;
  for (const v of keep) {
    if (!map.has(v)) {
      map.set(v, P.length);
      P.push([P0.getX(v), P0.getY(v), P0.getZ(v)]); N.push([nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]]);
      const w = []; for (let k = 0; k < 4; k++) { const ww = SW.getComponent(v, k); if (ww > 0) w.push([SI.getComponent(v, k), ww]); } S.push(w);
    }
    idx.push(map.get(v));
  }
  return { P, N, S, idx };
}
// Split every triangle into four; new points take the average position, normal and bone weights.
function subdivide(m) {
  const mids = new Map(), idx = [];
  const mid = (a, b) => {
    const k = a < b ? a + '_' + b : b + '_' + a; if (mids.has(k)) return mids.get(k);
    const i = m.P.length;
    m.P.push(m.P[a].map((x, j) => (x + m.P[b][j]) / 2));
    const n = m.N[a].map((x, j) => x + m.N[b][j]), l = Math.hypot(...n) || 1; m.N.push(n.map(x => x / l));
    const w = new Map(); [...m.S[a], ...m.S[b]].forEach(([bn, ww]) => w.set(bn, (w.get(bn) || 0) + ww / 2));
    const top = [...w.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4), tot = top.reduce((s, x) => s + x[1], 0) || 1;
    m.S.push(top.map(([bn, ww]) => [bn, ww / tot]));
    mids.set(k, i); return i;
  };
  for (let t = 0; t < m.idx.length; t += 3) {
    const a = m.idx[t], b = m.idx[t + 1], c = m.idx[t + 2], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
    idx.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  m.idx = idx; return m;
}

export function dress(vrm, colors = {}) {
  const C = { jacket: 0xb8863b, yoke: 0x131418, pants: 0x1c1d22, boots: 0xb8a276, gloves: 0x16171d, ...colors };
  const src = {}; vrm.scene.traverse(o => { if (o.isSkinnedMesh && /^Body_\(merged\)/.test(o.name)) src[o.name] = o; });
  const skin = src['Body_(merged)'], tops = src['Body_(merged)_3'], bottoms = src['Body_(merged)_1'], shoes = src['Body_(merged)_2'];
  const g = skin.geometry, P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const bones = skin.skeleton.bones;
  const part = bones.map(b => { let n = b; while (n) { if (/^J_Bip_/.test(n.name)) return n.name.replace('J_Bip_', '').replace(/^[LR]_/, '').replace(/^C_/, ''); n = n.parent; } return 'none'; });
  const domOf = w => (w.reduce((best, x) => x[1] > best[1] ? x : best, [0, -1]))[0];
  const V = P.count, region = new Array(V);
  for (let v = 0; v < V; v++) { let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = SW.getComponent(v, k); if (w > bw) { bw = w; best = SI.getComponent(v, k); } } region[v] = part[best]; }
  // the mesh is stored in its bind (T) pose, so measure everything there
  const bindPos = name => { const i = bones.indexOf(vrm.humanoid.getRawBoneNode(name)); return new THREE.Vector3().setFromMatrixPosition(skin.skeleton.boneInverses[i].clone().invert()); };
  const hipY = bindPos('hips').y, kneeY = bindPos('leftLowerLeg').y, ankleY = bindPos('leftFoot').y, chestY = bindPos('chest').y, neckY = bindPos('neck').y;
  const wristX = Math.abs(bindPos('leftHand').x), shoulderX = Math.abs(bindPos('leftUpperArm').x), armY = bindPos('leftUpperArm').y;
  const legTop = { l: bindPos('leftUpperLeg'), r: bindPos('rightUpperLeg') }, legBot = { l: bindPos('leftFoot'), r: bindPos('rightFoot') };
  // smooth normals across UV seams so the pushed-out surface doesn't crack
  const key = v => `${P.getX(v).toFixed(4)},${P.getY(v).toFixed(4)},${P.getZ(v).toFixed(4)}`, acc = new Map();
  for (let v = 0; v < V; v++) { const k = key(v), n = acc.get(k) || [0, 0, 0]; n[0] += N.getX(v); n[1] += N.getY(v); n[2] += N.getZ(v); acc.set(k, n); }
  const nrm = new Float32Array(V * 3); for (let v = 0; v < V; v++) { const n = acc.get(key(v)), l = Math.hypot(...n) || 1; nrm[v * 3] = n[0] / l; nrm[v * 3 + 1] = n[1] / l; nrm[v * 3 + 2] = n[2] / l; }

  const tris = mesh => { const idx = mesh.geometry.index.array, grp = mesh.geometry.groups[0], s = grp ? grp.start : 0, c = grp ? grp.count : idx.length; return idx.slice(s, s + c); };
  // build a garment: which triangles, how to reshape each point, which colour each triangle gets
  const build = ({ name, sources, pick, offset, move, colors, divide = 0, paint = null, ink = true }) => {
    const keep = [];
    for (const m of sources) { const idx = tris(m); for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; if (pick(a) && pick(b) && pick(c)) keep.push(a, b, c); } }
    const m = compact(g, keep, nrm); for (let i = 0; i < divide; i++) subdivide(m);
    const n = m.P.length, pos = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) {
      const [x, y, z] = m.P[v], [nx, ny, nz] = m.N[v], p = { x, y, z, nx, ny, nz, reg: part[domOf(m.S[v])] };
      let q; if (move) q = move(p); if (!q) { const o = offset(p); q = [x + nx * o, y + ny * o, z + nz * o]; }
      pos[v * 3] = q[0]; pos[v * 3 + 1] = q[1]; pos[v * 3 + 2] = q[2];
      m.S[v].forEach(([bn, ww], k) => { si[v * 4 + k] = bn; sw[v * 4 + k] = ww; });
    }
    const byGroup = colors.map(() => []);
    for (let t = 0; t < m.idx.length; t += 3) {
      const [a, b, c] = [m.idx[t], m.idx[t + 1], m.idx[t + 2]];
      const cx = (m.P[a][0] + m.P[b][0] + m.P[c][0]) / 3, cy = (m.P[a][1] + m.P[b][1] + m.P[c][1]) / 3, cz = (m.P[a][2] + m.P[b][2] + m.P[c][2]) / 3;
      byGroup[paint ? paint({ x: cx, y: cy, z: cz, reg: part[domOf(m.S[a])] }) : 0].push(a, b, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    let start = 0; const all = []; byGroup.forEach((list, i) => { if (list.length) geo.addGroup(start, list.length, i); start += list.length; for (const i of list) all.push(i); });
    geo.setIndex(all); geo.computeVertexNormals();
    const mesh = new THREE.SkinnedMesh(geo, colors.map(toon)); mesh.name = name; mesh.frustumCulled = false;
    skin.parent.add(mesh); mesh.bind(skin.skeleton, skin.bindMatrix);
    if (ink) { const o = new THREE.SkinnedMesh(geo, INK); o.frustumCulled = false; skin.parent.add(o); o.bind(skin.skeleton, skin.bindMatrix); }
    mesh.userData.bind = { pos, n };
    return mesh;
  };

  const JACKET = new Set(['Spine', 'Chest', 'UpperChest', 'Shoulder', 'UpperArm', 'LowerArm']);
  const LEGS = new Set(['UpperLeg', 'LowerLeg']);
  const FEET = new Set(['Foot', 'ToeBase']);
  const HAND = r => r === 'Hand' || /^(Thumb|Index|Middle|Ring|Little)/.test(r);
  const bootTop = ankleY + (kneeY - ankleY) * .32, yokeY = (chestY + neckY) / 2 - .02;
  const onArm = r => r === 'UpperArm' || r === 'LowerArm';
  const baffle = (t, period) => .5 + .5 * Math.cos(2 * Math.PI * t / period);

  const clamp01 = v => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  // Shell pants: wide and straight from thigh to ankle, then long enough to stack in
  // loose folds over the boots. Each leg point is pushed out from the leg's centre line.
  const legR = t => .088 + .02 * t; // radius from hip (t=0) to hem (t=1)
  const pants = build({
    name: 'pants', sources: [skin, bottoms], divide: 1,
    pick: v => (LEGS.has(region[v]) && P.getY(v) > ankleY + .015) || (region[v] === 'Hips' && P.getY(v) < hipY + .02),
    offset: () => .024,
    move: ({ x, y, z, reg }) => {
      if (!LEGS.has(reg)) return null;
      const s = x >= 0 ? 'l' : 'r', a = legTop[s], b = legBot[s], t = clamp01((a.y - y) / (a.y - b.y));
      const ax = a.x + (b.x - a.x) * t, az = a.z + (b.z - a.z) * t, dx = x - ax, dz = z - az, r = Math.hypot(dx, dz) || 1e-4, ang = Math.atan2(dx, dz);
      // bunching: uneven horizontal folds that build toward the hem
      const stack = smooth(.6, 1, t), fold = stack * (.5 + .5 * Math.sin(y * 115 + ang * 1.6 + Math.sin(ang * 3) * 1.4));
      const R = Math.max(r + .018, legR(t) * (t < .08 ? .6 + 5 * t : 1)) * (1 + .17 * fold), nx = ax + dx / r * R;
      const side = Math.sign(ax) || 1, cx = side * nx < .012 ? side * .012 : nx; // legs never cross the middle
      // the extra length: the hem drops down over the top of the boot
      return [cx, y - .07 * Math.pow(stack, 1.3), az + dz / r * R];
    },
    colors: [C.pants],
  });
  // Shell jacket, built as its own clean mesh instead of reusing the body's triangles
  // (VRoid deleted the skin under the tee, so the body has holes). A torso tube and two
  // sleeves are sized from the body at every height, then each point copies its bone
  // weights from the nearest body points so it moves exactly with him.
  const hemY = hipY - .13, collarTop = neckY + .085;
  const BODY = [...new Set([...tris(skin), ...tris(tops), ...tris(bottoms)])];
  const TORSO_R = new Set(['Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Shoulder']), ARM_R = new Set(['Shoulder', 'UpperArm', 'LowerArm']);
  const torsoPts = BODY.filter(v => TORSO_R.has(region[v])), armPts = { l: [], r: [] };
  BODY.forEach(v => { if (ARM_R.has(region[v]) && Math.abs(P.getX(v)) > .06) armPts[P.getX(v) > 0 ? 'l' : 'r'].push(v); });
  const czAt = y => { const a = bindPos('hips'), b = bindPos('chest'), c = bindPos('neck'); return y < b.y ? a.z + (b.z - a.z) * clamp01((y - a.y) / (b.y - a.y)) : b.z + (c.z - b.z) * clamp01((y - b.y) / (c.y - b.y)); };
  // widest body radius around a vertical line, per angle, within a height band
  const ring = (y, band, bins, pts, cx, cz) => {
    const e = new Array(bins).fill(0);
    for (const v of pts) { const q = typeof v === 'number' ? [P.getX(v), P.getY(v), P.getZ(v)] : v, py = q[1]; if (Math.abs(py - y) > band) continue; const dx = q[0] - cx, dz = q[2] - cz, b = Math.floor(((Math.atan2(dx, dz) + Math.PI) / (2 * Math.PI)) * bins) % bins; e[b] = Math.max(e[b], Math.hypot(dx, dz)); }
    for (let pass = 0; pass < 6; pass++) for (let b = 0; b < bins; b++) { const l = e[(b + bins - 1) % bins], r = e[(b + 1) % bins]; if (!e[b]) e[b] = Math.max(l, r); else e[b] = Math.max(e[b], (l + r) / 2 * .97); }
    return e;
  };
  const SEG = 56, rowsY = []; for (let y = hemY; y <= collarTop + 1e-6; y += .012) rowsY.push(Math.min(y, collarTop));
  const chestRing = ring(chestY + .02, .045, SEG, torsoPts, 0, czAt(chestY));
  const seatPts = torsoPts.slice(); { const bp = pants.userData.bind; for (let v = 0; v < bp.n; v++) { const y = bp.pos[v * 3 + 1]; if (y > hemY - .03 && y < hipY + .05) seatPts.push([bp.pos[v * 3], y, bp.pos[v * 3 + 2]]); } }
  const clear = rowsY.map(() => new Array(SEG).fill(0));
  let radii = rowsY.map((y, iy) => {
    const cz = czAt(y), e = ring(Math.max(y, hemY + .02), .025, SEG, y < hipY + .02 ? seatPts : torsoPts, 0, cz), drop = clamp01((chestY - y) / (chestY - hemY));
    return e.map((r, b) => {
      if (y > neckY - .025) return r + .022;                       // stand-up collar, close to the neck
      if (y >= chestY) return r + .03;                             // fitted through the chest and shoulders
      const hang = chestRing[b] + .032 + .026 * drop * drop;       // below the chest it hangs straight, flaring a little
      const bk = Math.max(0, -Math.cos((b + .5) / SEG * 2 * Math.PI - Math.PI)), minR = r + (y < hipY + .02 ? .02 + .025 * bk * smooth(hipY + .02, hemY, y) : .03);             // clear of the pants underneath
      clear[iy][b] = minR;
      return Math.max(minR, hang * smooth(chestY, chestY - .08, y) + (r + .03) * (1 - smooth(chestY, chestY - .08, y)));
    });
  });
  // shoulders: from armpit height the tube slopes smoothly in to the collar, so the
  // shoulder line is clean (sampling the shoulder joints directly left spikes)
  const coreTorso = torsoPts.filter(v => region[v] !== 'Shoulder');
  const iA = rowsY.reduce((best, y, i) => Math.abs(y - (armY + .02)) < Math.abs(rowsY[best] - (armY + .02)) ? i : best, 0);
  const collarR = ring(neckY, .02, SEG, coreTorso, 0, czAt(neckY)).map(r => r + .022);
  radii = radii.map((row, i) => {
    const y = rowsY[i]; if (i <= iA) return row;
    const core = ring(y, .02, SEG, coreTorso, 0, czAt(y)), t = smooth(rowsY[iA], neckY - .02, y);
    return row.map((_, b) => Math.max(radii[iA][b] * (1 - t) + collarR[b] * t, (core[b] || 0) + .015));
  });
  // funnel collar that flares a little toward the chin, and the hood rolled up behind the
  // neck (a thick bunch at the back that sits higher than the front)
  const backness = b => Math.max(0, -Math.cos((b + .5) / SEG * 2 * Math.PI - Math.PI));
  radii = radii.map((row, i) => { const y = rowsY[i], t = smooth(neckY - .03, collarTop, y), roll = Math.sin(Math.PI * clamp01((y - (neckY - .05)) / (collarTop - neckY + .05)));
    return row.map((r, b) => r + .025 * t + .055 * backness(b) ** 1.5 * roll); });
  const lift = (i, b) => .045 * backness(b) ** 2 * smooth(neckY - .03, collarTop, rowsY[i]);
  // smooth around each ring and up and down the tube for an even surface
  for (let pass = 0; pass < 5; pass++) radii = radii.map(row => row.map((r, b) => (row[(b + SEG - 1) % SEG] + row[(b + 1) % SEG] + r * 2) / 4));
  for (let pass = 0; pass < 4; pass++) radii = radii.map((row, i) => row.map((r, b) => { const up = radii[Math.min(radii.length - 1, i + 1)][b], dn = radii[Math.max(0, i - 1)][b]; return (up + dn + r * 2) / 4; }));
  let soft = clear.map(row => row.map((_, b) => Math.max(...[-2, -1, 0, 1, 2].map(o => row[(b + o + SEG) % SEG]))));
  for (let pass = 0; pass < 3; pass++) soft = soft.map(row => row.map((r, b) => (row[(b + SEG - 1) % SEG] + row[(b + 1) % SEG] + r * 2) / 4));
  radii = radii.map((row, i) => row.map((r, b) => Math.max(r, soft[i][b])));
  const G = { pos: [], owner: [], idx: [], w: [] };
  rowsY.forEach((y, i) => { const cz = czAt(y); for (let b = 0; b < SEG; b++) { const a = (b + .5) / SEG * 2 * Math.PI - Math.PI, R = radii[i][b]; G.pos.push([Math.sin(a) * R, y + lift(i, b), cz + Math.cos(a) * R]); G.owner.push('torso'); } });
  for (let i = 0; i < rowsY.length - 1; i++) for (let b = 0; b < SEG; b++) { const p = i * SEG + b, q = i * SEG + (b + 1) % SEG; G.idx.push(p, q, p + SEG, q, q + SEG, p + SEG); }
  // sleeves: rings along the arm from inside the shoulder to the wrist
  const RS = 28, SEGA = 28, SL = {};
  ['l', 'r'].forEach(s => {
    const sh = bindPos(s === 'l' ? 'leftUpperArm' : 'rightUpperArm'), el = bindPos(s === 'l' ? 'leftLowerArm' : 'rightLowerArm'), wr = bindPos(s === 'l' ? 'leftHand' : 'rightHand');
    const start = sh.clone().lerp(new THREE.Vector3(0, sh.y - .015, sh.z), .28), L1 = start.distanceTo(el), L2 = el.distanceTo(wr), base = G.pos.length, dJoint = start.distanceTo(sh), capLen = dJoint + .03;
    SL[s] = { base, dJoint, L1, L2 }; const side = s === 'l' ? 'left' : 'right', bi = n => bones.indexOf(vrm.humanoid.getRawBoneNode(side + n));
    for (let k = 0; k < RS; k++) {
      const u = k / (RS - 1), d = u * (L1 + L2), c = d < L1 ? start.clone().lerp(el, d / L1) : el.clone().lerp(wr, (d - L1) / L2);
      const t = (d < L1 ? el.clone().sub(start) : wr.clone().sub(el)).normalize(), up = new THREE.Vector3(0, 1, 0).addScaledVector(t, -t.y).normalize(), fw = new THREE.Vector3().crossVectors(t, up);
      // body radius around this point of the arm, per angle
      const e = new Array(SEGA).fill(0);
      for (const v of armPts[s]) { const q = new THREE.Vector3(P.getX(v), P.getY(v), P.getZ(v)).sub(c); if (Math.abs(q.dot(t)) > .02) continue; const a = Math.atan2(q.dot(fw), q.dot(up)), b = Math.floor(((a + Math.PI) / (2 * Math.PI)) * SEGA) % SEGA; e[b] = Math.max(e[b], Math.hypot(q.dot(fw), q.dot(up))); }
      for (let pass = 0; pass < 6; pass++) for (let b = 0; b < SEGA; b++) { const l = e[(b + SEGA - 1) % SEGA], r = e[(b + 1) % SEGA]; if (!e[b]) e[b] = Math.max(l, r); else e[b] = Math.max(e[b], (l + r) / 2 * .95); }
      const avg = e.reduce((x, y) => x + y, 0) / SEGA || .045;
      const ease = u > .92 ? .024 : .026 + .004 * smooth(.3, .6, u) + .005 * Math.sin(u * 34) * smooth(.7, .9, u);   // straight roomy sleeve, a little bunching above the cuff
      for (let b = 0; b < SEGA; b++) {
        const a = (b + .5) / SEGA * 2 * Math.PI - Math.PI, cap = d < capLen ? Math.max(.3, Math.sqrt(1 - (1 - d / capLen) ** 2)) : 1, R = (Math.max(e[b] * .3 + avg * .7, .03) + ease) * cap;
        const top = Math.cos(a) > 0 ? .55 + .45 * smooth(0, capLen + .07, d) : 1;
        const wu = smooth(dJoint - .07, dJoint + .12, d), wl = smooth(L1 - .05, L1 + .05, d);
        G.w[G.pos.length] = [[bi('Shoulder'), 1 - wu], [bi('UpperArm'), wu * (1 - wl)], [bi('LowerArm'), wu * wl]].filter(x => x[1] > 1e-4);
        const p = c.clone().addScaledVector(up, Math.cos(a) * R * top).addScaledVector(fw, Math.sin(a) * R); G.pos.push([p.x, p.y, p.z]); G.owner.push(s);
      }
    }
    for (let k = 0; k < RS - 1; k++) for (let b = 0; b < SEGA; b++) { const p = base + k * SEGA + b, q = base + k * SEGA + (b + 1) % SEGA; G.idx.push(p, q, p + SEGA, q, q + SEGA, p + SEGA); }
  });
  // bone weights from the four nearest body points (torso from torso, sleeves from arms)
  const nearWeights = (x, y, z, pts) => {
    const best = [];
    for (const v of pts) { const d = (P.getX(v) - x) ** 2 + (P.getY(v) - y) ** 2 + (P.getZ(v) - z) ** 2; if (best.length < 4 || d < best[3][1]) { best.push([v, d]); best.sort((a, b) => a[1] - b[1]); if (best.length > 4) best.pop(); } }
    const w = new Map(); best.forEach(([v, d]) => { const f = 1 / (d + 1e-6); for (let k = 0; k < 4; k++) { const ww = SW.getComponent(v, k); if (ww > 0) { const bn = SI.getComponent(v, k); w.set(bn, (w.get(bn) || 0) + ww * f); } } });
    const top = [...w.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), tot = top.reduce((s, x) => s + x[1], 0) || 1;
    return top.map(([bn, ww]) => [bn, ww / tot]);
  };
  const LEGB = new Set(['leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg'].map(n => bones.indexOf(vrm.humanoid.getRawBoneNode(n))));
  const UL = { l: bones.indexOf(vrm.humanoid.getRawBoneNode('leftUpperLeg')), r: bones.indexOf(vrm.humanoid.getRawBoneNode('rightUpperLeg')) };
  const torsoWeights = (x, y, z) => {
    const w = nearWeights(x, y, z, torsoPts).filter(([bn]) => !LEGB.has(bn)), t = w.reduce((a, x) => a + x[1], 0) || 1;
    const dz = z - czAt(y), front = Math.max(0, dz / (Math.hypot(x, dz) || 1)), lw = .5 * front * front * smooth(hipY - .02, hemY + .02, y);
    if (!lw) return w.map(([bn, ww]) => [bn, ww / t]);
    const sl = smooth(-.05, .05, x), out = w.map(([bn, ww]) => [bn, ww / t * (1 - lw)]).concat([[UL.l, lw * sl], [UL.r, lw * (1 - sl)]]).filter(x => x[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4), tt = out.reduce((a, x) => a + x[1], 0);
    return out.map(([bn, ww]) => [bn, ww / tt]);
  };
  const skinned = (name, pts3, owners, idx, color, fixed = []) => {
    const n = pts3.length, pos = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    pts3.forEach(([x, y, z], i) => { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; (fixed[i] || (owners[i] === 'torso' ? torsoWeights(x, y, z) : nearWeights(x, y, z, armPts[owners[i]]))).forEach(([bn, ww], k) => { si[i * 4 + k] = bn; sw[i * 4 + k] = ww; }); });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.SkinnedMesh(geo, toon(color)); m.name = name; m.frustumCulled = false; skin.parent.add(m); m.bind(skin.skeleton, skin.bindMatrix);
    return m;
  };
  const jacket = skinned('jacket', G.pos, G.owner, G.idx, C.jacket, G.w);
  jacket.userData.owner = G.owner;
  { const N = jacket.geometry.attributes.normal, n = N.count, nb = Array.from({ length: n }, () => new Set()), I = G.idx;
    for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) { nb[I[t + k]].add(I[t + (k + 1) % 3]); nb[I[t + k]].add(I[t + (k + 2) % 3]); }
    let a = Float32Array.from(N.array);
    for (let pass = 0; pass < 4; pass++) { const b = new Float32Array(a.length); for (let v = 0; v < n; v++) { let x = a[v * 3] * 2, y = a[v * 3 + 1] * 2, z = a[v * 3 + 2] * 2; nb[v].forEach(u => { x += a[u * 3]; y += a[u * 3 + 1]; z += a[u * 3 + 2]; }); const l = Math.hypot(x, y, z) || 1; b[v * 3] = x / l; b[v * 3 + 1] = y / l; b[v * 3 + 2] = z / l; } a = b; }
    N.array.set(a); N.needsUpdate = true; }
  { const o = new THREE.SkinnedMesh(jacket.geometry, INK); o.frustumCulled = false; skin.parent.add(o); o.bind(skin.skeleton, skin.bindMatrix); }
  // the zip: a thin strip straight down the front of the torso tube
  const zip = (() => {
    const pts = [], own = [], idx = [], front = SEG / 2;
    rowsY.forEach((y, i) => { if (y > collarTop - .004) return; const R = (radii[i][front - 1] + radii[i][front]) / 2 + .004, cz = czAt(y); pts.push([-.005, y, cz + R], [.005, y, cz + R]); own.push('torso', 'torso'); });
    for (let i = 1; i < pts.length / 2; i++) { const p = (i - 1) * 2, q = i * 2; idx.push(p, p + 1, q, p + 1, q + 1, q); }
    return skinned('zip', pts, own, idx, C.yoke);
  })();

  // trim: thin dark strips lying on the shell (seam, pocket zip, pit zips)
  const strip = (name, pairs, own, fixedW = []) => { const pts = [], idx = []; pairs.forEach(([a, b]) => pts.push(a, b)); for (let i = 1; i < pairs.length; i++) { const p = (i - 1) * 2, q = i * 2; idx.push(p, p + 1, q, p + 1, q + 1, q); } return skinned(name, pts, own, idx, C.yoke, fixedW); };
  const onTube = (y, a, out) => { const fi = (y - hemY) / .012, i = Math.max(0, Math.min(rowsY.length - 2, Math.floor(fi))), fy = clamp01(fi - i), fb = ((a + Math.PI) / (2 * Math.PI)) * SEG - .5, b0 = ((Math.floor(fb) % SEG) + SEG) % SEG, b1 = (b0 + 1) % SEG, fr = fb - Math.floor(fb);
    const R = (radii[i][b0] * (1 - fr) + radii[i][b1] * fr) * (1 - fy) + (radii[i + 1][b0] * (1 - fr) + radii[i + 1][b1] * fr) * fy + out; return [Math.sin(a) * R, y, czAt(y) + Math.cos(a) * R]; };
  const seamY = chestY - .035, trims = [];
  { const pairs = []; for (let a = -1.25; a <= 1.25 + 1e-6; a += .05) if (Math.abs(a) > .03) pairs.push([onTube(seamY - .003, a, .003), onTube(seamY + .003, a, .003)]);
    // split at the centre zip so the seam doesn't cross it
    const L = pairs.filter((_, k) => -1.25 + k * .05 < 0), Rr = pairs.slice(L.length);
    trims.push(strip('seamL', L, L.flat().map(() => 'torso')), strip('seamR', Rr, Rr.flat().map(() => 'torso'))); }
  { const pairs = []; for (let y = seamY + .025; y <= seamY + .15; y += .01) pairs.push([onTube(y, -.42, .004), onTube(y, -.38, .004)]); trims.push(strip('pocketZip', pairs, pairs.flat().map(() => 'torso'))); }
  ['l', 'r'].forEach(s => { const { base, dJoint, L1, L2 } = SL[s], pairs = [], w = [], k0 = Math.round((dJoint + .06) / (L1 + L2) * 27), k1 = Math.round((L1 - .03) / (L1 + L2) * 27);
    const bA = s === 'l' ? 21 : 6;   // front-underside of the sleeve (angles run from "up" round through "front")
    for (let k = k0; k <= k1; k++) { const p = base + k * SEGA + bA, q = base + k * SEGA + (bA + 1) % SEGA, A = G.pos[p], B = G.pos[q], m = (x, y, f) => x + (y - x) * f, pa = [0, 1, 2].map(j => m(A[j], B[j], .3)), pb = [0, 1, 2].map(j => m(A[j], B[j], .7));
      const push = v => { const c = v.slice(), cen = [0, 1, 2].map(j => (G.pos[base + k * SEGA][j] + G.pos[base + k * SEGA + SEGA / 2][j]) / 2), d = Math.hypot(c[0] - cen[0], c[1] - cen[1], c[2] - cen[2]) || 1; return c.map((x, j) => x + (x - cen[j]) / d * .004); };
      pairs.push([push(pa), push(pb)]); w.push(G.w[p], G.w[p]); }
    trims.push(strip('pitZip' + s, pairs, pairs.flat().map(() => s), w)); });

  const boots = build({ name: 'boots', sources: [skin, shoes], pick: v => FEET.has(region[v]) || (region[v] === 'LowerLeg' && P.getY(v) < bootTop), offset: () => .018, colors: [C.boots] });
  // gauntlet gloves: they run up past the wrist and tuck inside the sleeve cuff, so no skin shows
  const gloves = build({ name: 'gloves', sources: [skin], pick: v => HAND(region[v]) || (region[v] === 'LowerArm' && Math.abs(P.getX(v)) > wristX - .1), offset: ({ reg }) => reg === 'LowerArm' ? .016 : .008, colors: [C.gloves], ink: false });
  [tops, bottoms, shoes].forEach(m => { m.visible = false; });
  const logos = [];
  return { jacket, trims, pants, boots, gloves, logos, recolor(p, color, i = 0) { const m = { jacket, pants, boots, gloves }[p]; if (m) (Array.isArray(m.material) ? m.material[i] : m.material).color.set(color); } };
}
