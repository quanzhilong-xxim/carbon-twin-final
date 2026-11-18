"""Create a new student candidate while retaining the original editable master."""
import bpy
import bmesh
import hashlib
import json
from pathlib import Path

R = Path(__file__).resolve().parents[1]
OUT = R / 'public/models/characters-v10'
exec(compile((R / 'scripts/tailor-v108u-delivery.py').read_text().split("for who,base in [(")[0], __file__, 'exec'))

stem = 'CT_Student_Explore_v11a'
if (OUT / (stem + '.blend')).exists() or (OUT / (stem + '.glb')).exists():
    raise RuntimeError('Existing candidate must not be overwritten')
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'CT_Student_Explore_v108w.blend'), load_ui=False, use_scripts=False)
root = bpy.data.objects['CT_Student_Explore_v108w']
root.name = stem
body = bpy.data.objects['Body']
assert body.data.shape_keys is None
bm = bmesh.new()
bm.from_mesh(body.data)
faces = []
for face in bm.faces:
    center = body.matrix_world @ face.calc_center_median()
    # Body skin beneath the closed jacket/knit intersects the cloth during motion.
    # Leave the neck, arms and hands intact; earlier master remains untouched.
    if face.material_index == 0 and abs(center.x) < .125 and .89 < center.z < 1.24:
        faces.append(face)
assert faces, 'No covered body faces found'
count = len(faces)
bmesh.ops.delete(bm, geom=faces, context='FACES')
bm.to_mesh(body.data)
bm.free()
root['v11a_refinement'] = f'Removed {count} covered torso faces that penetrated clothing; preserved head, hands, rig and previous source.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / (stem + '.blend')))
export(root, stem)
export(root, stem + '-portrait')
for obj in root.children_recursive:
    if obj.type != 'MESH' or obj.hide_render or obj.data.shape_keys or len(obj.data.polygons) < 1000:
        continue
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new('Distance LOD', 'DECIMATE')
    modifier.ratio = .65
    try:
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    except RuntimeError:
        obj.modifiers.remove(modifier)
export(root, stem + '-lite')
record = json.loads((OUT / 'CT_Student_Explore_v108w.sources.json').read_text())
record.update(version='v11a', parent_version='v108w', paid_calls=0, status='isolated browser review pending')
record.setdefault('refinements', []).append(root['v11a_refinement'])
record['exports'] = [dict(file=p.name, bytes=p.stat().st_size, sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(OUT.glob(stem + '*.glb'))]
(OUT / (stem + '.sources.json')).write_text(json.dumps(record, indent=2), encoding='utf-8')
print('V11A_EXPORTED', count, flush=True)
