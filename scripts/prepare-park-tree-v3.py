"""Prepare the verified CC0 mother asset in a separate background Blender process.
The downloaded originals remain outside the project. Never touches the live scene.
"""
import json
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/island_tree_02')
OUT = ROOT / 'public/models/urban-vegetation'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE / 'island_tree_02_1k.gltf'))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [o.matrix_world @ Vector(c) for o in objects for c in o.bound_box]
low = Vector(tuple(min(v[i] for v in points) for i in range(3)))
high = Vector(tuple(max(v[i] for v in points) for i in range(3)))
center = (low + high) / 2
scale = 12 / (high.z - low.z)
normalize = Matrix.Scale(scale, 4) @ Matrix.Translation((-center.x, -center.y, -low.z))
for obj in objects:
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.data.transform(normalize @ world)
    obj.matrix_world = Matrix.Identity(4)
    obj['source'] = 'https://polyhaven.com/a/island_tree_02'
    obj['license'] = 'CC0'
    obj['authors'] = 'Rob Tuytel; Rico Cilliers'
    for poly in obj.data.polygons:
        poly.use_smooth = True

def triangles():
    count = 0
    for obj in objects:
        obj.data.calc_loop_triangles()
        count += len(obj.data.loop_triangles)
    return count

original_triangles = triangles()
for obj in objects:
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new('Web hero geometry budget', 'DECIMATE')
    modifier.ratio = .20
    bpy.ops.object.modifier_apply(modifier=modifier.name)

for image in bpy.data.images:
    if image.source == 'FILE':
        image.pack()

scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
for obj in scene.objects:
    obj.select_set(obj in objects)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'CT_ParkTree_Hero_v3.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT / 'CT_ParkTree_Hero_v3.glb'), export_format='GLB', use_selection=True, export_apply=True)
hero_triangles = triangles()
for obj in objects:
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new('Street distance LOD', 'DECIMATE')
    modifier.ratio = .18
    bpy.ops.object.modifier_apply(modifier=modifier.name)
for image in bpy.data.images:
    if image.size[0] > 512:
        image.scale(512, 512)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'CT_ParkTree_Street_v3.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT / 'CT_ParkTree_Street_v3.glb'), export_format='GLB', use_selection=True, export_apply=True)
report = {'asset': 'island_tree_02', 'source': 'https://polyhaven.com/a/island_tree_02', 'license': 'CC0', 'license_verified_at': 'https://polyhaven.com/license', 'authors': ['Rob Tuytel', 'Rico Cilliers'], 'height_metres': 12, 'original_triangles': original_triangles, 'hero_triangles': hero_triangles, 'street_triangles': triangles(), 'originals': str(SOURCE), 'paid_calls': 0}
(OUT / 'CT_ParkTree_v3.sources.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(json.dumps(report))
