import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];bpy.ops.wm.open_mainfile(filepath=str(R/'public/models/characters-v10/CT_Business_Explore_v11g.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Business_Explore_v11g']
for o in root.children_recursive:
 if o.type!='MESH'or o.hide_render:continue
 if o.parent is None or o.parent.name!='Head':continue
 ps=[o.matrix_world@v.co for v in o.data.vertices]
 if min(p.z for p in ps)>1.28 or max(p.z for p in ps)<1.24 or min(p.y for p in ps)>-.10:continue
 print('FRINGE',json.dumps({'name':o.name,'vertices':len(ps),'materials':[m.name for m in o.data.materials if m],'bounds':[[round(min(p[k]for p in ps),5),round(max(p[k]for p in ps),5)]for k in range(3)]}),flush=True)
