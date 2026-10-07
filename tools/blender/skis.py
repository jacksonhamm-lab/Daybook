# The generated skis (one Tripo mesh: a pair standing on their tails, topsheets facing forward) -> two skis lying
# flat, each centred on its own origin: length along -Y (tip forward; +Z in the app), topsheet up, top surface at
# z = 0 under the boot. Scaled to 1.84 m like the code-built skis, 1K texture, one GLB with ski_l and ski_r.
# Also: the wavy length is flattened (the upturned tips are kept), and a brand-like mark at one tip is painted out.
# usage: blender --background --factory-startup --python skis.py   (input: <DEX_SRC>/skis/*.fbx)
import bpy, bmesh, sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector, Matrix
import dexlib as D

LENGTH = 1.84
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=glob.glob(f'{D.SRC}/skis/*.fbx')[0])
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
for o in bpy.context.scene.objects: o.select_set(o == ob)
bpy.context.view_layer.objects.active = ob
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
img = bpy.data.images.load(glob.glob(f'{D.SRC}/skis/*.fbm/*.jpg')[0])
img.scale(2048, 2048)
for m in ob.data.materials:
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    t = next((n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE'), None) or m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = img
    if not bsdf.inputs['Base Color'].is_linked: m.node_tree.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
# split the pair
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
parts = [o for o in bpy.context.scene.objects if o.type == 'MESH']
side = {1: [], -1: []}
for o in parts:
    cx = np.mean([v.co.x for v in o.data.vertices]); side[1 if cx > 0 else -1].append(o)
# tips up (+z) -> forward (-y); topsheet (-y) -> up (+z); which makes x -> -x (a proper rotation, so the art isn't mirrored)
R = Matrix(((-1, 0, 0, 0), (0, 0, -1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
W = img.size[0]; px = np.array(img.pixels[:], dtype=np.float32).reshape(W, W, 4)   # rows from the bottom, like v
out = []; painted = 0
for k, obs in side.items():
    if not obs: continue
    for o in bpy.context.scene.objects: o.select_set(o in obs)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1: bpy.ops.object.join()
    o = bpy.context.active_object
    o.data.transform(R)
    V = np.array([v.co[:] for v in o.data.vertices]); s = LENGTH / (V[:, 1].max() - V[:, 1].min())
    cx, cy = (V[:, 0].max() + V[:, 0].min()) / 2, (V[:, 1].max() + V[:, 1].min()) / 2
    V = (V - [cx, cy, 0]) * s
    # flatten: take out the wobble along its length, keep the rise at each end
    half = LENGTH / 2; bins = np.linspace(-half, half, 41); mids = (bins[:-1] + bins[1:]) / 2
    zc = np.full(len(mids), np.nan)
    for i, (a, b) in enumerate(zip(bins[:-1], bins[1:])):
        z = V[(V[:, 1] >= a) & (V[:, 1] <= b)][:, 2]
        if len(z): zc[i] = (z.max() + z.min()) / 2
    ok = ~np.isnan(zc); zc = np.interp(mids, mids[ok], zc[ok])   # the mesh is coarse: some slices have no vertex
    zc = np.convolve(np.pad(zc, 1, mode='edge'), np.ones(3) / 3, mode='valid')
    flat = .70 * half   # between these it lies flat
    def rise(y):
        e = np.sign(y) * flat; base = np.interp(e, mids, zc); return np.maximum(0, np.interp(y, mids, zc) - base) * (np.abs(y) > flat)
    V[:, 2] = V[:, 2] - np.interp(V[:, 1], mids, zc) + rise(V[:, 1])
    top = V[np.abs(V[:, 1]) < .1][:, 2].max(); V[:, 2] -= top
    for v, c in zip(o.data.vertices, V): v.co = Vector(c)
    o.data.update()
    o.name = 'ski_l' if (-k) > 0 else 'ski_r'   # x was flipped by R: the ski that was at -x is now his left (+x)
    print(o.name, 'size', (V.max(0) - V.min(0)).round(3), 'z', V[:, 2].min().round(3), V[:, 2].max().round(3))
    # paint out a pale brand-like mark on the topsheet near the tip: pale yellow texels inside the tip's top faces
    bm = bmesh.new(); bm.from_mesh(o.data); uvl = bm.loops.layers.uv.active
    for f in bm.faces:
        c = f.calc_center_median()
        if o.name != 'ski_r' or c.y > -.70 or c.y < -.88 or f.normal.z < .5: continue   # the mark sits on the right ski's topsheet, about 19 cm back from the tip
        uv = np.array([l[uvl].uv[:] for l in f.loops]) * W
        x0, x1 = int(max(0, uv[:, 0].min() - 2)), int(min(W - 1, uv[:, 0].max() + 2)); y0, y1 = int(max(0, uv[:, 1].min() - 2)), int(min(W - 1, uv[:, 1].max() + 2))
        if x1 <= x0 or y1 <= y0 or (x1 - x0) * (y1 - y0) > 400000: continue
        blk = px[y0:y1 + 1, x0:x1 + 1, :3]
        r, g, b = blk[..., 0], blk[..., 1], blk[..., 2]
        logo = (r > .72) & (g > .6) & (b > .28) & (b < .75) & (r - b > .12) & (g - b > .08) & ((r - g) < .22)   # pale straw yellow, not the orange art
        keep = ~logo & (r + g + b > .12)
        if logo.sum() > 200 and keep.sum():   # the mark fills most of a face; stray highlights in the art don't
            # its soft edges too: grow the mask a few texels, but only over warm texels (the purple around it stays)
            grown = logo.copy()
            for _ in range(9):
                g2 = grown.copy(); g2[1:] |= grown[:-1]; g2[:-1] |= grown[1:]; g2[:, 1:] |= grown[:, :-1]; g2[:, :-1] |= grown[:, 1:]; grown = g2
            grown &= (r > b + .05) & (r > .3)
            cool = ~grown & (r < b + .05) & (r + g + b > .1)
            if cool.sum(): blk[grown] = np.median(blk[cool], axis=0); painted += int(grown.sum())
    bm.free(); out.append(o)
print('PAINTED OUT', painted, 'texels')
img.pixels = px.reshape(-1).tolist(); img.update(); img.scale(1024, 1024)
# previews: from above (tips at the top of the picture) and from the side
for o in out: o.location.x = .12 if o.name == 'ski_l' else -.12
D.render(f'{D.OUT}/skis_top.jpg', (0, 0, 3.2), (0, 0, 0), ortho=2.0, res=(500, 1000))
D.render(f'{D.OUT}/skis_side.jpg', (3, 0, .05), (0, 0, .02), ortho=2.0, res=(1000, 200))
for o in out: o.location.x = 0
for o in bpy.context.scene.objects: o.select_set(o in out)
bpy.ops.export_scene.gltf(filepath=f'{D.OUT}/skis.glb', export_format='GLB', use_selection=True, export_yup=True, export_image_format='JPEG', export_jpeg_quality=88, export_apply=False, export_tangents=False)
print('EXPORTED', os.path.getsize(f'{D.OUT}/skis.glb'))
