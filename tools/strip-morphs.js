// Strip face blendshapes no VRM expression uses, and repack the GLB so the data is gone too.
// usage: node tools/strip-morphs.js in.vrm out.vrm   (VRoid ships 57 face shapes; the 14 the expressions use are kept)
const fs = require('fs');
const [,, inp, outp] = process.argv;
const b = fs.readFileSync(inp);
const jl = b.readUInt32LE(12);
const j = JSON.parse(b.slice(20, 20 + jl).toString());
const binStart = 20 + jl + 8, binLen = b.readUInt32LE(20 + jl);
const bin = b.slice(binStart, binStart + binLen);

// 1. which morph indices each mesh needs
const vrm = j.extensions.VRMC_vrm, ex = vrm.expressions || {};
const allEx = [...Object.values(ex.preset || {}), ...Object.values(ex.custom || {})];
const used = new Map();   // mesh -> Set(old index)
allEx.forEach(e => (e.morphTargetBinds || []).forEach(bd => { const m = j.nodes[bd.node].mesh; if (!used.has(m)) used.set(m, new Set()); used.get(m).add(bd.index); }));
const remap = new Map();  // mesh -> Map(old -> new)
j.meshes.forEach((mesh, mi) => {
  const n = (mesh.primitives[0].targets || []).length; if (!n) return;
  const keep = [...(used.get(mi) || [])].sort((a, z) => a - z);
  const mp = new Map(keep.map((o, i) => [o, i])); remap.set(mi, mp);
  mesh.primitives.forEach(p => { p.targets = keep.map(i => p.targets[i]); if (!p.targets.length) delete p.targets; });
  if (mesh.weights) mesh.weights = keep.map(i => mesh.weights[i]);
  if (mesh.extras && mesh.extras.targetNames) mesh.extras.targetNames = keep.map(i => mesh.extras.targetNames[i]);
  mesh.primitives.forEach(p => { if (p.extras && p.extras.targetNames) p.extras.targetNames = keep.map(i => p.extras.targetNames[i]); });
  console.log(`mesh ${mi}: ${n} -> ${keep.length} blendshapes`);
});
allEx.forEach(e => (e.morphTargetBinds || []).forEach(bd => { bd.index = remap.get(j.nodes[bd.node].mesh).get(bd.index); }));

// 2. which accessors are still referenced
const accUsed = new Set();
j.meshes.forEach(m => m.primitives.forEach(p => {
  Object.values(p.attributes).forEach(a => accUsed.add(a));
  if (p.indices != null) accUsed.add(p.indices);
  (p.targets || []).forEach(t => Object.values(t).forEach(a => accUsed.add(a)));
}));
(j.skins || []).forEach(s => s.inverseBindMatrices != null && accUsed.add(s.inverseBindMatrices));
(j.animations || []).forEach(a => a.samplers.forEach(s => { accUsed.add(s.input); accUsed.add(s.output); }));
const accOld = [...accUsed].sort((a, z) => a - z), accMap = new Map(accOld.map((o, i) => [o, i]));
j.accessors = accOld.map(i => j.accessors[i]);
j.meshes.forEach(m => m.primitives.forEach(p => {
  for (const k in p.attributes) p.attributes[k] = accMap.get(p.attributes[k]);
  if (p.indices != null) p.indices = accMap.get(p.indices);
  (p.targets || []).forEach(t => { for (const k in t) t[k] = accMap.get(t[k]); });
}));
(j.skins || []).forEach(s => { if (s.inverseBindMatrices != null) s.inverseBindMatrices = accMap.get(s.inverseBindMatrices); });
(j.animations || []).forEach(a => a.samplers.forEach(s => { s.input = accMap.get(s.input); s.output = accMap.get(s.output); }));

// 3. which bufferViews, then repack the binary chunk
const bvUsed = new Set();
j.accessors.forEach(a => { if (a.bufferView != null) bvUsed.add(a.bufferView); if (a.sparse) { bvUsed.add(a.sparse.indices.bufferView); bvUsed.add(a.sparse.values.bufferView); } });
(j.images || []).forEach(im => im.bufferView != null && bvUsed.add(im.bufferView));
const bvOld = [...bvUsed].sort((a, z) => a - z), bvMap = new Map(bvOld.map((o, i) => [o, i]));
const parts = []; let off = 0;
j.bufferViews = bvOld.map(i => {
  const v = j.bufferViews[i], data = bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
  parts.push(data); const nv = { ...v, byteOffset: off }; off += data.length; return nv;
});
j.accessors.forEach(a => { if (a.bufferView != null) a.bufferView = bvMap.get(a.bufferView); if (a.sparse) { a.sparse.indices.bufferView = bvMap.get(a.sparse.indices.bufferView); a.sparse.values.bufferView = bvMap.get(a.sparse.values.bufferView); } });
(j.images || []).forEach(im => { if (im.bufferView != null) im.bufferView = bvMap.get(im.bufferView); });
let newBin = Buffer.concat(parts); const binPad = (4 - (newBin.length % 4)) % 4; if (binPad) newBin = Buffer.concat([newBin, Buffer.alloc(binPad)]);
j.buffers = [{ byteLength: newBin.length }];

// 4. write the GLB
let js = Buffer.from(JSON.stringify(j)); const jp = (4 - (js.length % 4)) % 4; if (jp) js = Buffer.concat([js, Buffer.alloc(jp, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + newBin.length, 8);
const ch = (len, type) => { const c = Buffer.alloc(8); c.writeUInt32LE(len, 0); c.writeUInt32LE(type, 4); return c; };
fs.writeFileSync(outp, Buffer.concat([head, ch(js.length, 0x4E4F534A), js, ch(newBin.length, 0x004E4942), newBin]));
console.log(`${inp}: ${(b.length / 1e6).toFixed(2)}MB -> ${(fs.statSync(outp).size / 1e6).toFixed(2)}MB`);
