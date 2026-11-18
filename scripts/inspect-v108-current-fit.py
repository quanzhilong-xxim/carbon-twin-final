import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
for who,rev in [('Student','v108p'),('Business','v108n'),('City','v108m')]:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v10/CT_{who}_Explore_{rev}.blend'),load_ui=False,use_scripts=False)
 rows=[]
 for o in bpy.context.scene.objects:
  if o.type!='MESH' or o.hide_render:continue
  pts=[o.matrix_world@v.co for v in o.data.vertices]
  if not pts:continue
  rows.append(dict(name=o.name,parent=o.parent.name if o.parent else None,bounds=[[round(min(p[i] for p in pts),4),round(max(p[i] for p in pts),4)] for i in range(3)],materials=[m.name for m in o.data.materials if m],modifiers=[m.type for m in o.modifiers]))
 out=R/f'outputs/v108/internal/model-inspections/{who}-{rev}-current.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(rows,indent=2))
 print(who,len(rows),flush=True)
