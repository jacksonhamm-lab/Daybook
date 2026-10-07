# Shared helpers for rigging the Tripo smart-mesh exports in Blender (headless).
import bpy, os, math, glob
import numpy as np
from mathutils import Vector

# where the unzipped Tripo exports are: <SRC>/<name>/<anything>.fbx with its .fbm texture folder beside it
SRC = os.environ.get('DEX_SRC') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('DEX_OUT') or os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
HEIGHT = 1.75   # metres, like the app's other models


def load(name):
    """Import <name>.fbx, apply transforms, scale to HEIGHT, feet on z = 0, centred on x. Returns the mesh object."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=glob.glob(f'{SRC}/{name}/*.fbx')[0])
    ob = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
    for o in bpy.context.scene.objects: o.select_set(o == ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    V = verts(ob); h = V[:, 2].max() - V[:, 2].min(); s = HEIGHT / h
    cx = (V[:, 0].max() + V[:, 0].min()) / 2
    for v in ob.data.vertices: v.co = Vector(((v.co.x - cx) * s, v.co.y * s, (v.co.z - V[:, 2].min()) * s))
    ob.data.update(); ob.name = name
    # the texture (FBX points at <name>.fbm/<name>_basecolor.jpg)
    tex = next(iter(glob.glob(f'{SRC}/{name}/*.fbm/*.jpg')), None)
    if tex:
        img = bpy.data.images.load(tex, check_existing=True)
        for m in ob.data.materials:
            if not m: continue
            m.use_nodes = True
            bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            t = next((n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE'), None) or m.node_tree.nodes.new('ShaderNodeTexImage')
            t.image = img
            if bsdf and not bsdf.inputs['Base Color'].is_linked: m.node_tree.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
            m.node_tree.nodes.active = t
    return ob


def verts(ob):
    n = len(ob.data.vertices); a = np.empty(n * 3); ob.data.vertices.foreach_get('co', a); return a.reshape(n, 3)


def render(path, eye, target, lens=50, res=(700, 900), ortho=None, wire=False):
    """Workbench render with the texture, flat lit, from eye looking at target (z up)."""
    sc = bpy.context.scene
    cam = bpy.data.objects.get('snapcam')
    if not cam:
        cam = bpy.data.objects.new('snapcam', bpy.data.cameras.new('snapcam')); sc.collection.objects.link(cam)
    sc.camera = cam
    cam.location = Vector(eye)
    d = Vector(target) - Vector(eye); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if ortho: cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    else: cam.data.type = 'PERSP'; cam.data.lens = lens
    cam.data.clip_start = .01; cam.data.clip_end = 100
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'FLAT'; sh.color_type = 'TEXTURE'; sh.show_object_outline = False; sh.show_backface_culling = False
    sc.display.render_aa = '8'
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    if not sc.world: sc.world = bpy.data.worlds.new('w')
    sc.world.color = (1, 1, 1)
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 90
    for o in sc.objects:
        if o.type == 'MESH': o.display_type = 'WIRE' if wire else 'TEXTURED'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ---------- pose tests shared by both rigs ----------
from mathutils import Matrix
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))   # x: his left, -y: forward, z: up

def pose_tests(rig, P, name, which=None, arms='T'):
    """Render the stress poses. arms='A' for a model whose rest pose has the arms hanging (they're raised to a T first)."""
    def turn(bone, axis, deg):
        pb = rig.pose.bones[P + bone]; bpy.context.view_layer.update()
        h = (rig.matrix_world @ pb.matrix).to_translation()
        M = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-h)
        pb.matrix = rig.matrix_world.inverted() @ M @ rig.matrix_world @ pb.matrix
        bpy.context.view_layer.update()
    def reset():
        for pb in rig.pose.bones: pb.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()
        if arms == 'A':   # straighten to a T so every pose starts the same
            for s, k in (('Left', 1), ('Right', -1)):
                for b, c in ((s + 'Arm', s + 'ForeArm'), (s + 'ForeArm', s + 'Hand')):
                    pb, pc = rig.pose.bones[P + b], rig.pose.bones[P + c]
                    d = (pc.matrix.to_translation() - pb.matrix.to_translation()).normalized()
                    q = d.rotation_difference(Vector((k, 0, 0))); ax, an = q.to_axis_angle()
                    if an > 1e-4: turn(b, ax, math.degrees(an))
    def both(fn):
        fn('Left', 1); fn('Right', -1)
    POSES = {
        'a_down': lambda: both(lambda s, k: turn(s + 'Arm', Y, 75 * k)),
        'b_up': lambda: both(lambda s, k: turn(s + 'Arm', Y, -78 * k)),
        'c_elbows': lambda: both(lambda s, k: (turn(s + 'Arm', Z, -70 * k), turn(s + 'ForeArm', Z, -110 * k))),
        'd_squat': lambda: (both(lambda s, k: (turn(s + 'UpLeg', X, -97), turn(s + 'Leg', X, 115))), turn('Spine', X, 20), both(lambda s, k: turn(s + 'Arm', Z, -75 * k))),
        'e_step': lambda: (turn('LeftUpLeg', X, -86), turn('LeftLeg', X, 86), turn('RightUpLeg', X, 28), turn('Spine1', Z, 34), both(lambda s, k: turn(s + 'Arm', Y, 70 * k))),
        'f_bend': lambda: (turn('Spine', X, 40), turn('Spine1', X, 28), turn('Neck', X, -28), both(lambda s, k: turn(s + 'Arm', Y, 70 * k))),
        'g_fist': lambda: both(lambda s, k: [turn(s + f'Hand{f}{i}', Y, 70 * k) for f in ['Index', 'Middle', 'Ring', 'Pinky'] for i in (1, 2, 3)]),
    }
    CAM = {'a_down': ((0, -3.6, 1.0), (0, 0, .92)), 'b_up': ((0, -4.2, 1.2), (0, 0, 1.1)), 'c_elbows': ((1.6, -2.2, 1.5), (0, -.2, 1.25)), 'd_squat': ((2.0, -2.6, 1.0), (0, -.2, .7)),
           'e_step': ((-2.3, -2.6, 1.0), (0, -.2, .85)), 'f_bend': ((2.6, -2.1, 1.1), (0, -.3, .95)), 'g_fist': ((1.0, -.7, 1.75), (.78, 0, 1.33))}
    for pn in (which or list(POSES)):
        reset(); POSES[pn](); eye, tgt = CAM[pn]
        render(f'{OUT}/{name}_{pn}.jpg', eye, tgt, lens=85 if pn == 'g_fist' else 50, res=(700, 600) if pn == 'g_fist' else (700, 900))
    reset()
