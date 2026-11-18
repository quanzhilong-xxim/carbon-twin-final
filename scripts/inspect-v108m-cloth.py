import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'public/models/characters-v10/CT_Student_Explore_v108m.blend'),load_ui=False,use_scripts=False)
rows=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or o.hide_render:continue
 pts=[o.matrix_world@v.co for v in o.data.vertices]
 if not pts:continue
 rows.append(dict(name=o.name,parent=o.parent.name if o.parent else None,bounds=[[round(min(p[i]for p in pts),4),round(max(p[i]for p in pts),4)]for i in range(3)],materials=[m.name for m in o.data.materials if m],modifiers=[m.type for m in o.modifiers]))
(R/'outputs/v108/internal/model-inspections/Student-v108m-cloth.json').write_text(json.dumps(rows,indent=2))
print('INSPECTED',len(rows))
