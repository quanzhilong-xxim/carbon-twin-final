import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];rows=[]
for role in ['Business','City','Student']:
 p=R/f'public/models/characters-v12-candidate/CT_{role}_Explore_v12e.blend'if role!='Student'else R/'public/models/characters-v10/CT_Student_Explore_v11e.blend'
 bpy.ops.wm.open_mainfile(filepath=str(p),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{role}_Explore_'+('v11e'if role=='Student'else'v12e')]
 row={'role':role,'objects':[]}
 for o in root.children_recursive:
  if o.type!='MESH'or o.hide_render or not len(o.data.vertices):continue
  ps=[o.matrix_world@v.co for v in o.data.vertices]
  row['objects'].append({'name':o.name,'n':len(ps),'bounds':[[round(min(p[k]for p in ps),4),round(max(p[k]for p in ps),4)]for k in range(3)],'materials':[m.name for m in o.data.materials if m],'keys':[k.name for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else []})
 rows.append(row)
(R/'work/v12-costume-inspection.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
