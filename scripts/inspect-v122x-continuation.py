import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
rows=[]
for role,rev in [('Business','v122t'),('Student','v122w')]:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v12-candidate/CT_{role}_Explore_{rev}.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{role}_Explore_{rev}'];rig=root if role=='Student' else bpy.data.objects['CT_Humanoid']
 print('ROLE',role,'RIG',len(rig.data.bones),'POSE',[(b.name,list(b.rotation_euler))for b in rig.pose.bones if sum(abs(x)for x in b.rotation_euler)>.001][:4],flush=True)
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render:continue
  if role=='Business' and any(s in o.name.lower() for s in ['shirt','collar','lapel','jacket','suit','cotton','tie']):
   box=[o.matrix_world@__import__('mathutils').Vector(v)for v in o.bound_box]
   rows.append({'role':role,'name':o.name,'materials':[m.name for m in o.data.materials if m],'bounds':[[min(v[k]for v in box)for k in range(3)],[max(v[k]for v in box)for k in range(3)]],'groups':[g.name for g in o.vertex_groups]})
 if role=='Student':
  for side in ['L','R']:
   for stem in ['LowerArm','Hand','Thumb1','Thumb2','Thumb3','Index1','Index2','Index3','Middle1','Middle2','Middle3','Ring1','Little1']:
    b=rig.data.bones.get(f'J_Bip_{side}_{stem}')
    if b:rows.append({'role':role,'bone':b.name,'head':list(b.head_local),'tail':list(b.tail_local),'roll':list(b.matrix_local.to_quaternion()),'children':[c.name for c in b.children]})
(R/'outputs/v122/x-source-inspection.json').write_text(json.dumps(rows,indent=2))
print('INSPECTION_SAVED',flush=True)
