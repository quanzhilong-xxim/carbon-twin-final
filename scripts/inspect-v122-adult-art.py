import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];rows=[]
for role,rev in [('Business','v122x'),('City','v122s')]:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v12-candidate/CT_{role}_Explore_{rev}.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{role}_Explore_{rev}'];objects=[]
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render or not any(n in o.name.lower()for n in ['head','eye','hair','cuff','collar','hand']):continue
  ps=[o.matrix_world@v.co for v in o.data.vertices]
  objects.append(dict(name=o.name,vertices=len(ps),bounds=[[min(p[j]for p in ps),max(p[j]for p in ps)]for j in range(3)],materials=[m.name for m in o.data.materials if m],keys=[k.name for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else []))
 rows.append(dict(role=role,objects=objects))
(R/'outputs/v122/adult-art-inventory.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
print('ADULT_INVENTORY_SAVED',flush=True)
