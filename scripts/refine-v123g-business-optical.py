"""Fit one coherent optical assembly on the retained V123b/F native-action rig.

The exported head-relative audit proves skinning is rigid and correct. Avoid
per-vertex surface projection: it buckled the historical D rim. Preserve those
assets and fit the new assembly with smooth analytic transforms instead.
"""
import bpy, sys, json, math, shutil, hashlib
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from native_action_glb import repair_morph_channels
OUT = ROOT / 'public/models/characters-v12-candidate'
STAGE = ROOT / 'work/v123g-business-optical'
PARENT = 'CT_Business_Explore_v123f'
STEM = 'CT_Business_Explore_v123g'
if any(OUT.glob(STEM + '*')):
    raise RuntimeError('Refuse overwrite ' + STEM)
STAGE.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(OUT / (PARENT + '.blend')), load_ui=False, use_scripts=False)
root = bpy.data.objects[PARENT]
rig = bpy.data.objects['CT_Humanoid']
objects = [root, *root.children_recursive]
original_actions = [a.name for a in bpy.data.actions]
original_tracks = {o.name: [t.name for t in o.animation_data.nla_tracks] for o in objects if o.animation_data}
changes = []

def smooth(t):
    t = max(0, min(1, t))
    return t * t * (3 - 2 * t)

for obj in objects:
    if obj.type != 'MESH' or not any(s in obj.name.lower() for s in ['optical', 'nose bridge']):
        continue
    if obj.name == 'V3 optical bridge':
        # The retained old bridge floated 4.8 cm behind the newer bridge. Keep
        # its editable source, but show only the connected newer assembly.
        obj.hide_render = True
        changes.append(dict(object=obj.name, change='Superseded duplicate bridge retained in source, omitted from new export'))
        continue
    before = [obj.matrix_world @ v.co for v in obj.data.vertices]
    inverse = obj.matrix_world.inverted()
    def fitted(p):
        q = p.copy()
        if 'rounded rectangular' in obj.name:
            sign = 1 if p.x > 0 else -1
            q.x = sign * .039 + (p.x - sign * .047) * .70
            q.y += .035
            q.z = 1.207 + (p.z - 1.19735) * .82
        elif 'temple' in obj.name:
            front = smooth((.012 - p.y) / .166)
            q.x *= 1 - .23 * front
            q.y += .035 * front
            q.z += .003 * front
        else:
            q.x *= 1.15
            q.y += .035
            q.z += .006
        return q
    for v in obj.data.vertices:
        v.co = inverse @ fitted(obj.matrix_world @ v.co)
    changes.append(dict(object=obj.name, vertices=len(before), maximum_displacement_m=max((fitted(p) - p).length for p in before)))

assert original_actions == [a.name for a in bpy.data.actions]
for name, tracks in original_tracks.items():
    assert tracks == [t.name for t in bpy.data.objects[name].animation_data.nla_tracks]
root.name = STEM
root['v123g_optical_fit'] = json.dumps(changes)
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(STAGE / (STEM + '.blend')))
for obj in bpy.context.scene.objects:
    if obj.name in bpy.context.view_layer.objects:
        obj.select_set(obj in objects and not obj.hide_render)
exports = []
for tier in ['', '-portrait', '-lite']:
    if tier == '-lite':
        for obj in objects:
            if obj.type != 'MESH' or obj.hide_render or obj.data.shape_keys or ('anatomical' in obj.name and 'hand' in obj.name) or len(obj.data.polygons) < 800:
                continue
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new('Mobile silhouette budget', 'DECIMATE')
            modifier.ratio = .55
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.context.view_layer.objects.active = rig
    file = STAGE / (STEM + tier + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(file), export_format='GLB', use_selection=True, export_apply=False, export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_range=False, export_morph=True, export_morph_animation=True, export_skins=True, export_def_bones=True, export_image_format='WEBP', export_image_quality=74 if tier == '-lite' else 86, export_image_webp_fallback=False)
    repair_morph_channels(file, objects, 30)
    exports.append(dict(file=file.name, bytes=file.stat().st_size, sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
record = json.loads((OUT / (PARENT + '.sources.json')).read_text(encoding='utf8'))
record.update(revision='v123g', version='v123g', parent_revision='v123f', development_base='v123b', editable_source=STEM + '.blend', status='CANDIDATE_NOT_ACCEPTED', optical_fit=changes, exports=exports, paid_calls=0)
record['action_limitations'] = ['All V123b native actions and facial morphs retained. F garment refinements retained.', 'Superseded V3 bridge omitted from export only; remains editable in source.', 'Rigid eyewear fit needs multi-angle browser visual acceptance. Remaining garment and hair issues are not accepted.']
(STAGE / (STEM + '.sources.json')).write_text(json.dumps(record, indent=2), encoding='utf8')
for file in [STAGE / (STEM + '.blend'), STAGE / (STEM + '.sources.json'), *[STAGE / e['file'] for e in exports]]:
    if (OUT / file.name).exists():
        raise RuntimeError('Refuse overwrite ' + file.name)
    shutil.copy2(file, OUT / file.name)
(STAGE / 'fit-result.json').write_text(json.dumps(dict(exported=True, visualAcceptance=False, changes=changes, exports=exports), indent=2), encoding='utf8')
print('V123G_OPTICAL_EXPORTED', json.dumps(changes), flush=True)
