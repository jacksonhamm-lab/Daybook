# A Tripo-rigged FBX (mixamorig skeleton already in it): scale to the app's height, re-bake its texture onto a
# padded 2K atlas, run the same pose tests as rig.py, and export a GLB.
# usage: blender -b --factory-startup --python tripo.py -- <name> [A] [nopose]
import bpy, sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector
import dexlib as D

args = sys.argv[sys.argv.index('--') + 1:]
name = args[0]; arms = 'A' if 'A' in args[1:] else 'T'
SRC = D.SRC
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=glob.glob(f'{SRC}/{name}/*.fbx')[0])
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.update()
def world_verts():
    n = len(ob.data.vertices); a = np.empty(n * 3); ob.data.vertices.foreach_get('co', a); a = a.reshape(n, 3)
    M = np.array(ob.matrix_world); return a @ M[:3, :3].T + M[:3, 3]
V = world_verts(); h = V[:, 2].max() - V[:, 2].min(); s = D.HEIGHT / h
rig.scale = rig.scale * s; rig.location = Vector((0, 0, 0))
for o in bpy.context.scene.objects: o.select_set(o in (rig, ob))
bpy.context.view_layer.objects.active = rig
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
V = world_verts(); print('SIZE', (V.max(0) - V.min(0)).round(3), 'MINZ', V[:, 2].min().round(3), 'front toes y', V[V[:, 2] < .05][:, 1].min().round(3))
ob.name = name
tex = glob.glob(f'{SRC}/{name}/*.fbm/*.jpg')[0]; img = bpy.data.images.load(tex)

# ---------- re-bake the texture ----------
# Tripo's 8K atlas packs thousands of little colour patches edge to edge. Shrunk to 2K, neighbouring patches bleed
# into each other and show as pale speckles along every seam (worst on the navy suit). So: a fresh UV layout with
# room between the islands (the head's get more texels: that's where the detail is), and the old texture baked
# onto it with a margin that carries each island's colour out past its edge.
SIZE = 2048
me = ob.data
old = me.uv_layers.active; old.name = 'old'
new = me.uv_layers.new(name='bake'); me.uv_layers.active = new
for o in bpy.context.scene.objects: o.select_set(o == ob)
bpy.context.view_layer.objects.active = ob
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=.002, area_weight=0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.object.mode_set(mode='OBJECT')
# head faces (mostly weighted to the head bone) get 1.8x the texel density, then everything is packed again
hg = ob.vertex_groups.get('mixamorig:Head')
if hg:
    headv = set()
    for v in me.vertices:
        for g in v.groups:
            if g.group == hg.index and g.weight > .5: headv.add(v.index)
    uv = me.uv_layers['bake'].data
    for p in me.polygons:
        if all(vi in headv for vi in p.vertices):
            c = Vector((0, 0))
            for li in p.loop_indices: c += uv[li].uv
            c /= len(p.loop_indices)
            p.select = True
        else: p.select = False
    # scale selected islands about their own centres (edit mode, UV operators need a UV editor context; do it by hand per island)
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv['bake']; bm.faces.ensure_lookup_table()
    seen = set()
    for f in bm.faces:
        if f.index in seen or not f.select: continue
        isl = []; stack = [f]
        while stack:   # an island: faces joined through edges whose UVs match on both sides
            x = stack.pop()
            if x.index in seen: continue
            seen.add(x.index); isl.append(x)
            for l in x.loops:
                for l2 in l.link_loops:
                    y = l2.face
                    if y.index in seen or not y.select: continue
                    if (l[uvl].uv - l2.link_loop_next[uvl].uv).length < 1e-5 and (l.link_loop_next[uvl].uv - l2[uvl].uv).length < 1e-5: stack.append(y)
        pts = [l[uvl].uv for x in isl for l in x.loops]; c = sum(pts, Vector((0, 0))) / len(pts)
        for x in isl:
            for l in x.loops: l[uvl].uv = c + (l[uvl].uv - c) * 1.8
    bm.to_mesh(me); bm.free()
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.pack_islands(margin=.004, rotate=True)
bpy.ops.object.mode_set(mode='OBJECT')
baked = bpy.data.images.new(name + '_baked', SIZE, SIZE, alpha=False)
for m in me.materials:
    if not m: continue
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    uvn = nt.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'old'
    src = nt.nodes.new('ShaderNodeTexImage'); src.image = img; nt.links.new(uvn.outputs['UV'], src.inputs['Vector'])
    em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(src.outputs['Color'], em.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    dst = nt.nodes.new('ShaderNodeTexImage'); dst.image = baked; nt.nodes.active = dst; dst.select = True
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
sc.render.bake.margin = 12; sc.render.bake.margin_type = 'EXTEND'; sc.render.bake.use_clear = True
ob.modifiers[0].show_viewport = ob.modifiers[0].show_render = False   # bake the rest pose
bpy.ops.object.bake(type='EMIT')
ob.modifiers[0].show_viewport = ob.modifiers[0].show_render = True
me.uv_layers.remove(me.uv_layers['old'])
for m in me.materials:
    if not m: continue
    nt = m.node_tree; nt.nodes.clear()
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = baked
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled'); bsdf.inputs['Roughness'].default_value = 1
    nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface']); nt.nodes.active = t
bpy.data.images.remove(img)
baked.filepath_raw = f'{D.OUT}/{name}_baked.png'; baked.file_format = 'PNG'; baked.save()
print('BAKED', SIZE)

tag = name + '_t'
if 'nopose' not in args: D.pose_tests(rig, 'mixamorig:', tag, arms=arms)
else: D.render(f'{D.OUT}/{tag}_front.jpg', (0, -3.6, 1.0), (0, 0, .92)); D.render(f'{D.OUT}/{tag}_face.jpg', (.25, -1.0, 1.62), (0, 0, 1.58), lens=85, res=(700, 700))
for o in bpy.context.scene.objects: o.select_set(o in (rig, ob))
bpy.ops.export_scene.gltf(filepath=f'{D.OUT}/{tag}.glb', export_format='GLB', use_selection=True, export_yup=True, export_skins=True, export_animations=False,
                          export_image_format='JPEG', export_jpeg_quality=90, export_apply=False, export_tangents=False, export_morph=False)
print('EXPORTED', os.path.getsize(f'{D.OUT}/{tag}.glb'))
