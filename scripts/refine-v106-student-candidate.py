"""Create a review-only derivative without changing the deployed character."""
import bpy
import bmesh
import hashlib
import json
import numpy as np
from pathlib import Path

root = Path(__file__).resolve().parents[1]
assets = root / 'public/models/characters-v10'
source = assets / 'CT_Student_Explore_v105b.blend'
destination = assets / 'CT_Student_Explore_v106c.blend'
export = assets / 'CT_Student_Explore_v106c.glb'
record_path = assets / 'CT_Student_Explore_v106c.sources.json'
if any(path.exists() for path in (destination, export, record_path)):
    raise RuntimeError('Candidate output exists; do not overwrite it')

bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
body = bpy.data.objects['Body']
rig = bpy.data.objects['Root']

# The original shorts had been renamed to the new trouser material. Remove only
# those faces; the separate, weighted full-length cargo mesh stays intact.
shorts_index = next(i for i, material in enumerate(body.data.materials)
                    if material and material.name == 'CarbonTwin warm pink cargo cotton')
mesh = bmesh.new()
mesh.from_mesh(body.data)
bmesh.ops.delete(mesh, geom=[face for face in mesh.faces if face.material_index == shorts_index], context='FACES')
mesh.to_mesh(body.data)
mesh.free()

# Refit the existing woven jacket beyond the inner shirt, preserving its UVs,
# weights, and separately modelled seams and sleeves.
jacket = bpy.data.objects['V10 merged Breath / Original plum woven jacket']
for vertex in jacket.data.vertices:
    vertex.co.x *= 1.07
    vertex.co.y *= 1.27
    vertex.co.z = 1.04 + (vertex.co.z - 1.04) * 1.06

# Recolour the existing packed strand textures, retaining their alpha and
# texture variation instead of replacing the hair with an untextured mesh.
for image in bpy.data.images:
    if not image.name.startswith('CT mint layered hair'):
        continue
    pixels = np.array(image.pixels[:], dtype=np.float32).reshape(image.size[1], image.size[0], 4)
    brightness = np.clip(np.mean(pixels[:, :, :3], axis=2) / .48, .38, 1.10)
    pixels[:, :, :3] = np.clip(brightness[:, :, None] * np.array([.76, .40, .53]), 0, 1)
    image.pixels.foreach_set(pixels.ravel())
    image.pack()

rig['ct_status'] = 'review-only candidate; not accepted or deployed'
rig['ct_rig'] = 'humanoid-v106c-apose'
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = rig
bpy.ops.wm.save_as_mainfile(filepath=str(destination))
bpy.ops.export_scene.gltf(filepath=str(export), export_format='GLB', use_selection=True,
                          export_animations=False, export_extras=True, export_skins=True, export_morph=True)
previous = json.loads((assets / 'CT_Student_Explore_v105b.sources.json').read_text(encoding='utf8'))
previous.update(status='CANDIDATE_PENDING_VISUAL_REVIEW', parent_candidate='v105b',
                adaptations=previous['adaptations'] + ['removed retained shorts faces',
                'refitted existing woven jacket shell', 'recoloured packed hair strand textures'],
                exports=[{'file': export.name, 'bytes': export.stat().st_size,
                          'sha256': hashlib.sha256(export.read_bytes()).hexdigest()}])
record_path.write_text(json.dumps(previous, ensure_ascii=False, indent=2), encoding='utf8')
print('CANDIDATE_EXPORTED', export)
