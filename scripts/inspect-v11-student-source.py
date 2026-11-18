"""Read-only inspection of the editable student source."""
import bpy
from pathlib import Path

root = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root / 'public/models/characters-v10/CT_Student_Explore_v108w.blend'), load_ui=False, use_scripts=False)
for obj in bpy.data.objects:
    if obj.type == 'MESH' and obj.name == 'Body':
        print('BODY', obj.name, len(obj.data.vertices), len(obj.data.polygons),
              'shape_keys', bool(obj.data.shape_keys), 'materials', [m.name for m in obj.data.materials], flush=True)
        for poly in obj.data.polygons:
            center = obj.matrix_world @ poly.center
            if abs(center.x) < .07 and center.y < -.08 and 1.06 < center.z < 1.18:
                print('TORSO_FACE', poly.index, tuple(round(v, 4) for v in center), poly.material_index, flush=True)
