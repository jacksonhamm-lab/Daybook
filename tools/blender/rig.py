# Rig a Tripo smart-mesh character in Blender (headless): a Mixamo-named skeleton placed from measurements of
# the mesh, skinned through a watertight proxy (bone-heat weights there, transferred back), then pose tests.
# usage: blender -b --factory-startup --python rig.py -- <name>
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector, Matrix
import dexlib as D

name = sys.argv[sys.argv.index('--') + 1]
ob = D.load(name)
V = D.verts(ob); H = D.HEIGHT
P = 'mixamorig'

# ---------- measure ----------
def band(f, w=.012, side=None, xmax=None):
    m = np.abs(V[:, 2] / H - f) < w
    if side: m &= V[:, 0] * side > 0
    if xmax is not None: m &= np.abs(V[:, 0]) < xmax * H
    return V[m] / H
def mid(a): return (a.max() + a.min()) / 2

arm = V[(V[:, 0] > .15 * H) & (V[:, 0] < .36 * H) & (V[:, 2] > .6 * H)] / H
armZ, armY = float(np.median(arm[:, 2])), float(mid(arm[:, 1]))
tip = float(V[:, 0].max() / H)
# wrist: thinnest slice of the forearm's outer half
best = None
for x in np.arange(.30, tip - .06, .005):
    s = V[(np.abs(V[:, 0] / H - x) < .008) & (V[:, 2] / H > .62)] / H
    if len(s) < 4: continue
    t = (s[:, 2].max() - s[:, 2].min()) + (s[:, 1].max() - s[:, 1].min())
    if best is None or t < best[0]: best = (t, float(x))
wrist = best[1] + .008
# shoulder joint: just outside the chest's half width under the armpit
chest = band(.71, xmax=.2); shoulderX = float(np.abs(chest[:, 0]).max()) + .008
elbow = (shoulderX + wrist) / 2
# fingers: clusters across the hand's width (y) beyond the knuckles
hand = V[(V[:, 0] > wrist * H)] / H
kn = wrist + (tip - wrist) * .47
fv = hand[hand[:, 0] > kn + (tip - kn) * .35]
ys = np.sort(fv[:, 1]); gaps = np.diff(ys); cut = np.sort(np.argsort(gaps)[-3:])
groups = np.split(ys, cut + 1); fingerY = [float(mid(g)) for g in groups]   # front (-y, index) to back (pinky)
tips = []
for g in groups:
    m = (hand[:, 1] >= g.min() - 1e-6) & (hand[:, 1] <= g.max() + 1e-6) & (hand[:, 0] > kn)
    tips.append(float(hand[m, 0].max()))
handZ = float(np.median(fv[:, 2]))
palm = hand[(hand[:, 0] < kn)]
th = palm[np.argmin(palm[:, 1])]   # the thumb tip: the palm's front-most point
print('ARM z', round(armZ, 3), 'y', round(armY, 3), 'shoulder', round(shoulderX, 3), 'elbow', round(elbow, 3), 'wrist', round(wrist, 3), 'knuckles', round(kn, 3), 'tip', round(tip, 3))
print('FINGERS y', [round(v, 3) for v in fingerY], 'tips', [round(v, 3) for v in tips], 'thumb tip', th.round(3))

def legc(f):
    s = band(f, side=1); return float(mid(s[:, 0])), float(mid(s[:, 1]))
# crotch: the highest slice with a gap at the centre
crotch = .42
for f in np.arange(.30, .56, .005):
    s = band(float(f), w=.006)
    if len(s) > 3 and np.abs(s[:, 0]).min() > .004: crotch = float(f)
hipZ = crotch + .055
ankleZ = .058; ax, ay = legc(ankleZ)
kneeZ = ankleZ + (hipZ - ankleZ) * .49; kx, ky = legc(kneeZ)
hx, hy = legc(crotch - .02)
foot = V[(V[:, 2] < .05 * H) & (V[:, 0] > 0)] / H
toe = foot[np.argmin(foot[:, 1])]; ballY = ay + (toe[1] - ay) * .6
print('LEG crotch', round(crotch, 3), 'hip', (round(hx, 3), round(hy, 3), round(hipZ, 3)), 'knee', (round(kx, 3), round(ky, 3), round(kneeZ, 3)), 'ankle', (round(ax, 3), round(ay, 3)), 'toe', toe.round(3))

def trunkY(f): s = band(f, xmax=.06); return float(mid(s[:, 1]))
neckZ = armZ + .045; headZ = neckZ + .05
J = {   # joint -> (x, y, z) in H
    'Hips': (0, trunkY(hipZ + .03), hipZ + .03), 'Spine': (0, trunkY(hipZ + .09), hipZ + .09),
    'Spine1': (0, trunkY(hipZ + .16), hipZ + .16), 'Spine2': (0, trunkY(armZ - .05) * .7, armZ - .055),
    'Neck': (0, trunkY(neckZ) + .008, neckZ), 'Head': (0, trunkY(headZ) + .012, headZ), 'HeadTop_End': (0, trunkY(headZ) + .012, 1.0),
}
S = {   # left side; mirrored for the right
    'Shoulder': (.022, armY, armZ + .012), 'Arm': (shoulderX, armY, armZ), 'ForeArm': (elbow, armY, armZ), 'Hand': (wrist, armY * .7, armZ),
    'UpLeg': (hx, hy, hipZ), 'Leg': (kx, ky, kneeZ), 'Foot': (ax, ay, ankleZ), 'ToeBase': (float(toe[0]) * .5 + ax * .5, ballY, .016), 'Toe_End': (float(toe[0]), float(toe[1]), .012),
}
for i, f in enumerate(['Index', 'Middle', 'Ring', 'Pinky']):
    y, t = fingerY[i], tips[i]
    for k, u in enumerate([0, .42, .72, 1]):
        S[f'Hand{f}{k + 1}'] = (kn + (t - kn) * u, y, handZ)
tb = (wrist + (kn - wrist) * .25, fingerY[0] - .004, handZ - .004)
for k, u in enumerate([0, .4, .72, 1]): S[f'HandThumb{k + 1}'] = tuple(float(tb[i] + (th[i] - tb[i]) * u) for i in range(3))

CHAIN = {'Hips': None, 'Spine': 'Hips', 'Spine1': 'Spine', 'Spine2': 'Spine1', 'Neck': 'Spine2', 'Head': 'Neck', 'HeadTop_End': 'Head'}
SIDE = {'Shoulder': 'Spine2', 'Arm': 'Shoulder', 'ForeArm': 'Arm', 'Hand': 'ForeArm', 'UpLeg': 'Hips', 'Leg': 'UpLeg', 'Foot': 'Leg', 'ToeBase': 'Foot', 'Toe_End': 'ToeBase'}
for f in ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']:
    for k in range(1, 5): SIDE[f'Hand{f}{k}'] = 'Hand' if k == 1 else f'Hand{f}{k - 1}'

# ---------- armature ----------
arm_data = bpy.data.armatures.new('Armature'); rig = bpy.data.objects.new('Armature', arm_data); bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
pos = {n: Vector(p) * H for n, p in J.items()}; par = dict(CHAIN)
for sn, sx in [('Left', 1), ('Right', -1)]:
    for n, p in S.items():
        pos[sn + n] = Vector((p[0] * sx, p[1], p[2])) * H
        q = SIDE[n]; par[sn + n] = q if q in CHAIN else sn + q
kids = {}
for n, q in par.items(): kids.setdefault(q, []).append(n)
eb = {}
for n in pos:
    b = arm_data.edit_bones.new(P + n); b.head = pos[n]; eb[n] = b
for n, b in eb.items():
    ks = kids.get(n, [])
    main = {'Hips': 'Spine', 'Spine2': 'Neck'}.get(n) or next((k for k in ks if not k.endswith('Shoulder') and 'UpLeg' not in k), None)
    if n.endswith('Hand'): main = n + 'Middle1'
    if main: b.tail = pos[main]
    else: b.tail = b.head + (b.head - pos[par[n]]).normalized() * .03
    if (b.tail - b.head).length < .004: b.tail = b.head + Vector((0, 0, .02))
for n, b in eb.items():
    if par[n]: b.parent = eb[par[n]]; b.use_connect = False
END = [n for n in pos if n.endswith('_End') or n.endswith('4')]   # tips: no weights of their own
bpy.ops.object.mode_set(mode='OBJECT')
for n in END: arm_data.bones[P + n].use_deform = False

# ---------- skin through a watertight proxy ----------
def only(*obs):
    for o in bpy.context.scene.objects: o.select_set(o in obs)
    bpy.context.view_layer.objects.active = obs[-1]
only(ob); bpy.ops.object.duplicate(); proxy = bpy.context.active_object; proxy.name = 'proxy'
rm = proxy.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = .008; rm.adaptivity = 0
bpy.ops.object.modifier_apply(modifier='remesh')
only(proxy); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=.0005); bpy.ops.object.mode_set(mode='OBJECT')
print('PROXY verts', len(proxy.data.vertices))
only(proxy, rig); bpy.ops.object.parent_set(type='ARMATURE_AUTO')
unw = sum(1 for v in proxy.data.vertices if not v.groups)
print('PROXY groups', len(proxy.vertex_groups), 'unweighted verts', unw)
if unw > len(proxy.data.vertices) * .5: raise SystemExit('bone heat failed')
# onto the real mesh
for g in proxy.vertex_groups: ob.vertex_groups.new(name=g.name)
dt = ob.modifiers.new('dt', 'DATA_TRANSFER'); dt.object = proxy; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'; dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
only(ob); bpy.ops.object.modifier_apply(modifier='dt')
ob.parent = rig; am = ob.modifiers.new('Armature', 'ARMATURE'); am.object = rig
only(ob); bpy.ops.object.vertex_group_clean(group_select_mode='ALL', limit=.01)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4); bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
# loose bits the proxy missed (hair strands, cords): take the weights of the nearest skinned vertex
from mathutils import kdtree
skinned = [v for v in ob.data.vertices if v.groups]; bare = [v for v in ob.data.vertices if not v.groups]
kd = kdtree.KDTree(len(skinned))
for i, v in enumerate(skinned): kd.insert(v.co, i)
kd.balance()
for v in bare:
    src = skinned[kd.find(v.co)[1]]
    for g in src.groups: ob.vertex_groups[g.group].add([v.index], g.weight, 'REPLACE')
print('MESH unweighted fixed', len(bare), 'of', len(ob.data.vertices))
bpy.data.objects.remove(proxy, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=f'{D.OUT}/{name}_rig.blend')

# ---------- pose tests (same set as the app stress test) ----------
def turn(bone, axis, deg):
    """Rotate a pose bone about a world axis through its head (children follow)."""
    pb = rig.pose.bones[P + bone]; bpy.context.view_layer.update()
    h = (rig.matrix_world @ pb.matrix).to_translation()
    M = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-h)
    pb.matrix = rig.matrix_world.inverted() @ M @ rig.matrix_world @ pb.matrix
    bpy.context.view_layer.update()
def reset():
    for pb in rig.pose.bones: pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))   # x: his left, -y: forward, z: up
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
which = sys.argv[sys.argv.index('--') + 2:] or list(POSES)
for pn in which:
    reset(); POSES[pn](); eye, tgt = CAM[pn]
    D.render(f'{D.OUT}/{name}_{pn}.jpg', eye, tgt, lens=85 if pn == 'g_fist' else 50, res=(700, 600) if pn == 'g_fist' else (700, 900))
reset()
# ---------- export for the app: one GLB, 2K texture ----------
for img in bpy.data.images:
    if img.size[0] > 2048: img.scale(2048, 2048)
only(ob, rig)
bpy.ops.export_scene.gltf(filepath=f'{D.OUT}/{name}.glb', export_format='GLB', use_selection=True, export_yup=True, export_skins=True, export_animations=False,
                          export_image_format='JPEG', export_jpeg_quality=88, export_apply=False, export_tangents=False, export_morph=False, export_def_bones=False)
print('EXPORTED', os.path.getsize(f'{D.OUT}/{name}.glb'))
print('DONE')
