# A Tripo-rigged FBX (mixamorig skeleton already in it): scale to the app's height, wire up the texture,
# run the same pose tests as rig.py, and export a GLB with a 2K texture.
# usage: blender -b --factory-startup --python tripo.py -- <name> [A]
import bpy, sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector
import dexlib as D

args = sys.argv[sys.argv.index('--') + 1:]
name = args[0]; arms = 'A' if 'A' in args[1:] else 'T'
SRC = D.SRC.replace('/v4', '/v5')
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
for m in ob.data.materials:
    if not m: continue
    m.use_nodes = True
    bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    t = next((n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE'), None) or m.node_tree.nodes.new('ShaderNodeTexImage')
    t.image = img
    if bsdf and not bsdf.inputs['Base Color'].is_linked: m.node_tree.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    m.node_tree.nodes.active = t
tag = name + '_t'
D.pose_tests(rig, 'mixamorig:', tag, arms=arms)
for im in bpy.data.images:
    if im.size[0] > 2048: im.scale(2048, 2048)
for o in bpy.context.scene.objects: o.select_set(o in (rig, ob))
bpy.ops.export_scene.gltf(filepath=f'{D.OUT}/{tag}.glb', export_format='GLB', use_selection=True, export_yup=True, export_skins=True, export_animations=False,
                          export_image_format='JPEG', export_jpeg_quality=88, export_apply=False, export_tangents=False, export_morph=False)
print('EXPORTED', os.path.getsize(f'{D.OUT}/{tag}.glb'))
