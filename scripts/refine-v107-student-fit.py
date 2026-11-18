"""Refit the student candidate while preserving the current website assets."""
import hashlib
import json
from pathlib import Path

import bpy

root = Path(__file__).resolve().parents[1]
assets = root / 'public/models/characters-v10'
source = assets / 'CT_Student_Explore_v107a.blend'
destination = assets / 'CT_Student_Explore_v107b.blend'
export = assets / 'CT_Student_Explore_v107b.glb'
record = assets / 'CT_Student_Explore_v107b.sources.json'
if any(path.exists() for path in (destination, export, record)):
    raise RuntimeError('Output exists; preserve the previous work')

bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
rig = bpy.data.objects['Root']
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH' or not any(part in obj.name for part in ('V3 rounded sleeve', 'V3 fitted cuff')):
        continue
    side = 1 if sum(v.co.x for v in obj.data.vertices) > 0 else -1
    for vertex in obj.data.vertices:
        # Align each cuff to its hand while retaining the fitted shoulder.
        wrist = max(0.0, min(1.0, (1.17 - vertex.co.z) / .28))
        vertex.co.x += side * .045 * wrist
        vertex.co.y += .023

body = bpy.data.objects['Body']
jersey = next(i for i, material in enumerate(body.data.materials)
              if material and material.name == 'CarbonTwin ivory ribbed inner jersey')
jersey_vertices = {index for face in body.data.polygons if face.material_index == jersey for index in face.vertices}
skin_vertices = {index for face in body.data.polygons if face.material_index != jersey for index in face.vertices}
for index in jersey_vertices - skin_vertices:
    vertex = body.data.vertices[index]
    if .94 < vertex.co.z < 1.25:
        vertex.co.x *= .85
        vertex.co.y *= .82

rig['ct_status'] = 'review-only candidate; not accepted or deployed'
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = rig
bpy.ops.wm.save_as_mainfile(filepath=str(destination))
bpy.ops.export_scene.gltf(filepath=str(export), export_format='GLB', use_selection=True,
                          export_animations=False, export_extras=True, export_skins=True, export_morph=True)
previous = json.loads((assets / 'CT_Student_Explore_v107a.sources.json').read_text(encoding='utf-8'))
previous.update(status='CANDIDATE_PENDING_VISUAL_REVIEW', parent_candidate='v107a',
                adaptations=previous['adaptations'] + ['aligned cuffs and sleeves with the existing hand rig',
                                                        'refitted the inner jersey behind the jacket'],
                exports=[{'file': export.name, 'bytes': export.stat().st_size,
                          'sha256': hashlib.sha256(export.read_bytes()).hexdigest()}])
record.write_text(json.dumps(previous, ensure_ascii=False, indent=2), encoding='utf-8')
print('CANDIDATE_EXPORTED', export)
