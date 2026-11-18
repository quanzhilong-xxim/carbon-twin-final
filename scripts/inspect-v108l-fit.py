import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
for who in ['Business','City','Student']:
 rev='v108e' if who=='Student' else 'v108l'
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v10/CT_{who}_Explore_{rev}.blend'),load_ui=False,use_scripts=False)
 rows=[]
 for o in bpy.context.scene.objects:
  if o.type!='MESH' or o.hide_render:continue
  pts=[o.matrix_world@v.co for v in o.data.vertices]
  if not pts:continue
  rows.append(dict(name=o.name,parent=o.parent.name if o.parent else None,vertices=len(pts),bounds=[[round(min(p[i]for p in pts),4),round(max(p[i]for p in pts),4)]for i in range(3)],materials=[m.name for m in o.data.materials if m],morphs=[k.name for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else []))
 (R/f'outputs/v108/internal/model-inspections/{who}-v108l-fit.json').write_text(json.dumps(rows,indent=2))
 print('INSPECTED',who,len(rows),flush=True)
