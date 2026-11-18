"""Refine a separate student candidate without overwriting the live assets."""
import hashlib
import json
from pathlib import Path

import bpy
from mathutils import Matrix


root = Path(__file__).resolve().parents[1]
assets = root / 'public/models/characters-v10'
source = assets / 'CT_Student_Explore_v106c.blend'
destination = assets / 'CT_Student_Explore_v107a.blend'
export = assets / 'CT_Student_Explore_v107a.glb'
record = assets / 'CT_Student_Explore_v107a.sources.json'
if any(path.exists() for path in (destination, export, record)):
    raise RuntimeError('Output already exists; preserve the earlier candidate')

bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
rig = bpy.data.objects['Root']
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(assets / 'CT_Student_Explore_v104g.glb'))
imported = set(bpy.context.scene.objects) - before
names = ('Cap binding', 'Explorer soft cap', 'V10 merged Head / Brushed brass',
         'V10 merged Head / Optical lens', 'V10 merged Head / V10 warm recycled cotton')
kept = []
for obj in imported:
    if obj.type != 'MESH' or obj.name not in names:
        continue
    # The source hat was fitted to a larger head. Bake the transform, then
    # follow the candidate's actual head bone through its existing skin rig.
    obj.data.transform(obj.matrix_world)
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    for vertex in obj.data.vertices:
        vertex.co.x *= .88
        vertex.co.y = (vertex.co.y - .02) * .90 + .02
        vertex.co.z -= .035
    obj.vertex_groups.clear()
    obj.modifiers.clear()
    group = obj.vertex_groups.new(name='J_Bip_C_Head')
    group.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    obj.parent = rig
    modifier = obj.modifiers.new('Follow head', 'ARMATURE')
    modifier.object = rig
    kept.append(obj)
for obj in imported:
    if obj not in kept:
        bpy.data.objects.remove(obj, do_unlink=True)
if len(kept) != len(names):
    raise RuntimeError(f'Expected {len(names)} headwear meshes, found {len(kept)}')

rig['ct_status'] = 'review-only candidate; not accepted or deployed'
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = rig
bpy.ops.wm.save_as_mainfile(filepath=str(destination))
bpy.ops.export_scene.gltf(filepath=str(export), export_format='GLB', use_selection=True,
                          export_animations=False, export_extras=True,
                          export_skins=True, export_morph=True)
previous = json.loads((assets / 'CT_Student_Explore_v106c.sources.json').read_text(encoding='utf-8'))
previous.update(status='CANDIDATE_PENDING_VISUAL_REVIEW', parent_candidate='v106c',
                adaptations=previous['adaptations'] + ['refitted existing cap and goggles to the head rig'],
                exports=[{'file': export.name, 'bytes': export.stat().st_size,
                          'sha256': hashlib.sha256(export.read_bytes()).hexdigest()}])
record.write_text(json.dumps(previous, ensure_ascii=False, indent=2), encoding='utf-8')
print('CANDIDATE_EXPORTED', export)
