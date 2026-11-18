"""Inspect the existing student candidate without modifying its Blender file."""
import json
from pathlib import Path

import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(
    filepath=str(root / 'public/models/characters-v10/CT_Student_Explore_v107a.blend'),
    load_ui=False, use_scripts=False,
)
rig = bpy.data.objects['Root']
for bone in rig.data.bones:
    if any(part in bone.name for part in ('UpperArm', 'LowerArm', '_Hand')) and bone.name.startswith('J_Bip_'):
        print('BONE', bone.name, list(rig.matrix_world @ bone.head_local), list(rig.matrix_world @ bone.tail_local))
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    if obj.name == 'Body' or any(part in obj.name for part in ('sleeve', 'cuff', 'jacket')):
        points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        print('MESH', json.dumps({
            'name': obj.name,
            'bounds': [[round(min(p[i] for p in points), 4), round(max(p[i] for p in points), 4)] for i in range(3)],
            'materials': [m.name if m else '' for m in obj.data.materials],
            'vertices': len(obj.data.vertices),
        }))
body = bpy.data.objects['Body']
print('BODY_SHAPE_KEYS', bool(body.data.shape_keys))
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH' or 'sleeve' not in obj.name:
        continue
    for lower, upper in ((0.88, 0.93), (0.98, 1.03), (1.08, 1.13), (1.18, 1.23)):
        points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        points = [p for p in points if lower <= p.z < upper]
        if points:
            print('SLEEVE_SLICE', obj.name, lower, [[round(min(p[i] for p in points), 4), round(max(p[i] for p in points), 4)] for i in range(3)])
for name in ('Body_00_SKIN', 'CarbonTwin ivory ribbed inner jersey'):
    indices = {i for i, mat in enumerate(body.data.materials) if mat and mat.name == name}
    for lower, upper in ((0.88, 0.93), (0.98, 1.03), (1.08, 1.13), (1.18, 1.23)):
        vertices = {v for poly in body.data.polygons if poly.material_index in indices for v in poly.vertices}
        points = [body.matrix_world @ body.data.vertices[i].co for i in vertices]
        points = [p for p in points if lower <= p.z < upper and p.x > .12]
        if points:
            print('SLICE', name, lower, len(points), [[round(min(p[i] for p in points), 4), round(max(p[i] for p in points), 4)] for i in range(3)])
