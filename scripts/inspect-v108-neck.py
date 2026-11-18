import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
for who in ['Business','City']:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v10/CT_{who}_Explore_v108.blend'),load_ui=False,use_scripts=False)
 bpy.context.view_layer.update()
 root=bpy.data.objects[f'CT_{who}_Explore_v108']
 o=next(o for o in root.children_recursive if o.type=='MESH' and o.name.endswith('_head'))
 print('ACTIVE_HEAD',o.name, o.parent.name, flush=True)
 result=[]
 for z in [1.34,1.37,1.40,1.42,1.44,1.46,1.48]:
  p=[o.matrix_world@v.co for v in o.data.vertices if abs((o.matrix_world@v.co).z-z)<.009]
  result.append({'z':z,'bounds':[[round(min(v[i] for v in p),4),round(max(v[i] for v in p),4)] for i in range(3)] if p else None})
 print('NECK_PROFILE',who,json.dumps(result),flush=True)
