// A lean, defined build for the gym look (Jackson's ask: "more muscular, like Luffy").
// Two parts, both measured in the model's bind (T) pose so they move with the body:
//  1. Shape: soft ellipsoid "muscles" push the skin out along its normal (delts, chest,
//     arms, lats, traps, quads). The pants share the same vertex buffer and get the same
//     push, so nothing pokes through.
//  2. Definition: thin anime-style lines for pecs, abs, collarbones and obliques, drawn by
//     the skin shader from the bind-pose position, so they stay put on the skin.
import * as THREE from 'three';

export function physique(vrm, { amount = 1, lines = true } = {}) {
  let skin; vrm.scene.traverse(o => { if (o.isSkinnedMesh && o.name === 'Body_(merged)') skin = o; });
  if (!skin) return;
  const g = skin.geometry, P = g.attributes.position, N = g.attributes.normal, bones = skin.skeleton.bones;
  const bindPos = n => new THREE.Vector3().setFromMatrixPosition(skin.skeleton.boneInverses[bones.indexOf(vrm.humanoid.getRawBoneNode(n))].clone().invert());
  const sh = bindPos('leftUpperArm'), el = bindPos('leftLowerArm'), wr = bindPos('leftHand'), hip = bindPos('leftUpperLeg'), knee = bindPos('leftLowerLeg');
  const uc = bindPos('upperChest'), ch = bindPos('chest'), nk = bindPos('neck'), hips = bindPos('hips');
  const L = (a, b, t) => a.clone().lerp(b, t);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // [centre, radii, push in metres, front-only]  (left side; mirrored for the right)
  const M = [
    [V(sh.x + .02, sh.y + .012, sh.z + .006), V(.085, .09, .09), .03],                // deltoid: a round cap
    [L(sh, el, .52).add(V(0, -.004, .034)), V(.11, .05, .056), .026],                 // biceps
    [L(sh, el, .45).add(V(0, -.01, -.036)), V(.11, .056, .05), .02],                  // triceps
    [L(sh, el, .75).add(V(0, .012, .01)), V(.07, .045, .05), .01],                    // brachialis, above the elbow
    [L(el, wr, .25).add(V(0, .006, .004)), V(.1, .056, .056), .021],                  // forearm, thick near the elbow
    [V(.07, uc.y + .018, .08), V(.1, .05, .12), .015, true],                          // pec: broad and flat
    [V(.11, uc.y + .03, .06), V(.05, .04, .08), .01, true],                           // pec where it meets the delt
    [V(.12, ch.y + .07, -.03), V(.05, .12, .09), .018],                               // lat
    [V(.07, nk.y - .012, nk.z), V(.07, .035, .06), .016],                             // trap
    [V(0, ch.y - .05, .08), V(.07, .11, .1), .006, true],                             // abs (a little fullness)
    [L(hip, knee, .45).add(V(0, 0, .03)), V(.08, .17, .09), .014],                    // quad
  ];
  const blobs = M.flatMap(([c, r, a, f]) => [[c, r, a * amount, f], [V(-c.x, c.y, c.z), r, a * amount, f]]);
  // welded normals: seam duplicates must move together or the skin cracks open
  const key = i => `${Math.round(P.getX(i) * 1e4)},${Math.round(P.getY(i) * 1e4)},${Math.round(P.getZ(i) * 1e4)}`;
  const acc = new Map();
  for (let i = 0; i < P.count; i++) { const k = key(i), s = acc.get(k) || [0, 0, 0]; s[0] += N.getX(i); s[1] += N.getY(i); s[2] += N.getZ(i); acc.set(k, s); }
  const moved = new Uint8Array(P.count), keys = new Array(P.count);
  for (let i = 0; i < P.count; i++) {
    const k = keys[i] = key(i), s = acc.get(k), l = Math.hypot(...s) || 1, nx = s[0] / l, ny = s[1] / l, nz = s[2] / l;
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    let d = 0;
    for (const [c, r, a, front] of blobs) {
      const q = ((x - c.x) / r.x) ** 2 + ((y - c.y) / r.y) ** 2 + ((z - c.z) / r.z) ** 2;
      if (q >= 1) continue;
      d += a * (1 - q) ** 2 * (front ? THREE.MathUtils.smoothstep(nz, .2, .6) : 1);
    }
    if (d > 1e-5) { P.setXYZ(i, x + nx * d, y + ny * d, z + nz * d); moved[i] = 1; }
  }
  P.needsUpdate = true;
  // re-light the new shapes: fresh normals (welded) for everything that moved
  const fn = new Map(), idx = g.index.array, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2];
    if (!moved[i0] && !moved[i1] && !moved[i2]) continue;
    a.fromBufferAttribute(P, i0); b.fromBufferAttribute(P, i1).sub(a); c.fromBufferAttribute(P, i2).sub(a); b.cross(c);
    [i0, i1, i2].forEach(i => { const s = fn.get(keys[i]) || [0, 0, 0]; s[0] += b.x; s[1] += b.y; s[2] += b.z; fn.set(keys[i], s); });
  }
  for (let i = 0; i < P.count; i++) { if (!moved[i]) continue; const s = fn.get(keys[i]); if (!s) continue; const l = Math.hypot(...s) || 1; N.setXYZ(i, s[0] / l, s[1] / l, s[2] / l); }
  N.needsUpdate = true;
  g.computeBoundingSphere();
  if (lines) defineSkin(skin, { uc, ch, nk, hips, sh, el });
}

// Anime muscle definition, drawn in the MToon skin shader from the bind-pose position (so it
// stays on the skin as he moves). Like the Wano-era Luffy reference: hard-edged painted
// shadows under the pecs, below each row of abs, down the centre and outside the six-pack,
// under the collarbones, where the delts meet the arms and in the elbow crook, with a
// thin ink line along the top edge of each shadow. The skin's own shadow colour is
// deepened too, so the new muscle shapes throw real cel shadows.
function defineSkin(skin, { uc, ch, nk, hips, sh, el }) {
  const mat = [].concat(skin.material).find(m => /Body_00_SKIN/.test(m.name) && !/Outline/.test(m.name));
  if (!mat || !mat.fragmentShader) return;
  if (mat.shadeColorFactor) mat.shadeColorFactor.set(0xd89a8c);
  if ('shadingShiftFactor' in mat) mat.shadingShiftFactor = .08;
  if ('giEqualizationFactor' in mat) mat.giEqualizationFactor = .6;
  const f = v => v.toFixed(4);
  const pecY = uc.y - .045, collar = nk.y - .052, abTop = ch.y + .03, navel = hips.y + .05;
  const rows = [0, 1, 2].map(k => f(abTop - .012 - k * ((abTop - navel) / 3.4)));
  mat.vertexShader = 'varying vec3 vBind;\nvarying vec3 vBindN;\n' + mat.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n  vBind = position; vBindN = normal;');
  mat.fragmentShader = `varying vec3 vBind;
varying vec3 vBindN;
float dLine(float d, float w) { float e = fwidth(d) + 1e-5; return 1. - smoothstep(w - e, w + e, abs(d)); }
// a shadow that starts with a hard edge at d = 0 and fades out by d = w
float dShade(float d, float w) { float e = fwidth(d) + 1e-5; return smoothstep(-e, e, d) * (1. - smoothstep(w * .45, w, d)); }
float dSpan(float t, float a, float b) { return smoothstep(a - .008, a + .008, t) * (1. - smoothstep(b - .008, b + .008, t)); }
vec2 definition() {
  vec3 p = vBind; float ax = abs(p.x), front = smoothstep(.25, .6, vBindN.z), sh = 0., ink = 0.;
  // pecs: shadow under the lower edge
  float pec = ${f(pecY)} + 4.6 * (ax - .075) * (ax - .075), pw = dSpan(ax, .01, .13) * front;
  sh += dShade(pec - p.y, .026) * pw; ink += dLine(pec - p.y, .0016) * pw;
  // the groove down the middle, and the six-pack's outer edge
  float mid = dSpan(p.y, ${f(navel)}, ${f(pecY + .045)}) * front;
  sh += (1. - smoothstep(.004, .008, ax)) * mid * .9; ink += dLine(p.x, .0012) * mid * .7;
  float edge = .056 + (${f(abTop)} - p.y) * .09, ew = dSpan(p.y, ${f(navel)}, ${f(abTop - .01)}) * front;
  sh += dShade(ax - edge, .022) * ew * .85; ink += dLine(ax - edge, .0012) * ew * .5;
  // a shadow under each row of abs
  ${rows.map((y, k) => `{ float r = ${y} - .9 * ax * ax, w = dSpan(ax, .009, .05) * front * (1. - ax / .075); sh += dShade(r - p.y, ${k === 2 ? '.009' : '.013'}) * w; ink += dLine(r - p.y, .0012) * w * .8; }`).join('\n  ')}
  // collarbones
  float cb = ${f(collar)} + 2.2 * (ax - .07) * (ax - .07), cw = dSpan(ax, .025, .125) * front;
  sh += dShade(cb - p.y, .014) * cw * .6; ink += dLine(cb - p.y, .0012) * cw * .5;
  // the V into the waistband
  float v = .03 + (p.y - ${f(hips.y - .06)}) * .55, vw = dSpan(p.y, ${f(hips.y - .04)}, ${f(navel + .02)}) * front;
  sh += dShade(v - ax, .016) * vw * .7; ink += dLine(ax - v, .0012) * vw * .6;
  // arms (along x in the bind pose): where the delt cap ends, and the elbow crook
  float arm = smoothstep(${f(sh.x + .03)}, ${f(sh.x + .06)}, ax), notTop = 1. - smoothstep(.35, .8, vBindN.y);
  // the delt ends in a V: furthest down the arm on the outside, close to the shoulder front and back
  float o = clamp(vBindN.y * .5 + .5, 0., 1.), delt = ${f(sh.x + .035)} + .085 * o * o;
  float dw = arm * (1. - smoothstep(.55, .9, vBindN.y)) * smoothstep(-.5, .1, vBindN.y);
  sh += dShade(ax - delt, .022) * dw * .9; ink += dLine(ax - delt, .0012) * dw * .6;
  // the flanks fall into shadow below the pecs, which sells the V-taper
  sh += smoothstep(.45, .8, abs(vBindN.x)) * (1. - arm) * dSpan(p.y, ${f(hips.y - .02)}, ${f(pecY + .03)}) * .55;
  // underside of the arms: the triceps and forearm sit in shadow
  sh += smoothstep(-.25, -.65, vBindN.y) * arm * .55;
  return vec2(clamp(sh, 0., 1.), clamp(ink, 0., 1.));
}
` + mat.fragmentShader.split('gl_FragColor = vec4( col, diffuseColor.a );').join(`#ifndef OUTLINE
    vec2 def = definition();
    col = mix(col, col * vec3(.74, .54, .5), def.x * .9);
    col = mix(col, col * vec3(.5, .34, .32), def.y * .75);
  #endif
  gl_FragColor = vec4( col, diffuseColor.a );`);   // MToon writes its output in more than one place
  mat.needsUpdate = true;
}
