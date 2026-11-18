"""Inspect existing chest geometry without changing the source scene."""
import bpy
import bmesh
from pathlib import Path

root = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root / 'public/models/characters-v10/CT_Student_Explore_v108w.glb'))
for obj in bpy.data.objects:
    if obj.type != 'MESH' or obj.hide_render:
        continue
    selected = [obj.matrix_world @ v.co for v in obj.data.vertices if abs((obj.matrix_world @ v.co).x) < .065 and (obj.matrix_world @ v.co).y < -.085 and 1.04 < (obj.matrix_world @ v.co).z < 1.20]
    if len(selected) > 10:
        print('CHEST_VERTICES', obj.name, len(selected), [m.name for m in obj.data.materials if m], flush=True)
    for poly in obj.data.polygons:
        points = [obj.matrix_world @ obj.data.vertices[i].co for i in poly.vertices]
        lo = [min(p[i] for p in points) for i in range(3)]
        hi = [max(p[i] for p in points) for i in range(3)]
        if lo[0] < -.025 and hi[0] > .025 and lo[1] < -.09 and 1.04 < lo[2] < 1.20 and hi[2]-lo[2] < .04:
            print('CROSSING_FACE', obj.name, poly.index, lo, hi, flush=True)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    pending = set(bm.verts)
    while pending:
        first = pending.pop()
        group = {first}
        stack = [first]
        while stack:
            vertex = stack.pop()
            for edge in vertex.link_edges:
                other = edge.other_vert(vertex)
                if other in pending:
                    pending.remove(other)
                    group.add(other)
                    stack.append(other)
        points = [obj.matrix_world @ v.co for v in group]
        lo = [min(p[i] for p in points) for i in range(3)]
        hi = [max(p[i] for p in points) for i in range(3)]
        if lo[0] < -.025 and hi[0] > .025 and lo[1] < -.085 and 1.02 < lo[2] < 1.22 and hi[2] - lo[2] < .08:
            print('CHEST_COMPONENT', obj.name, len(group), lo, hi, [m.name for m in obj.data.materials if m], flush=True)
    bm.free()
