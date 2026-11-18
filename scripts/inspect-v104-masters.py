import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];report={}
for who in ['Student','Business','City']:
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'public/models/characters-v10/CT_{who}_Explore_v10.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v10'];items=[]
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render:continue
  p=[o.matrix_world@v.co for v in o.data.vertices]
  if not p:continue
  items.append({'name':o.name,'parent':o.parent.name,'verts':len(p),'low':[round(min(v[i] for v in p),5) for i in range(3)],'high':[round(max(v[i] for v in p),5) for i in range(3)],'materials':[m.name for m in o.data.materials if m],'keys':[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else []})
 report[who]=items
(ROOT/'docs/recovery/v10.4/master-inspection.json').write_text(json.dumps(report,indent=2));print('READ_ONLY_MASTER_INSPECTION_SAVED',flush=True)
