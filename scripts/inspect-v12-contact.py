import bpy,json,sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];rows={}
for role,version in [('Student','v12a'),('Business','v12g')]:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v12-candidate/CT_{role}_Explore_{version}.blend'),load_ui=False,use_scripts=False)
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
 result={'rig_matrix':[list(r) for r in rig.matrix_world],'bones':{},'meshes':[]}
 for name in (['J_Bip_R_LowerArm','J_Bip_R_Hand','J_Bip_L_LowerArm','J_Bip_L_Hand'] if role=='Student' else ['CT_Neck','CT_Chest']):
  p=rig.pose.bones.get(name);result['bones'][name]={'head':list(rig.matrix_world@p.head),'tail':list(rig.matrix_world@p.tail)}
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  box=[o.matrix_world@Vector(v) for v in o.bound_box];lo=[min(v[i]for v in box)for i in range(3)];hi=[max(v[i]for v in box)for i in range(3)]
  if role=='Student' and o.name not in ['Body','Face']:continue
  if role=='Business' and not any(t in o.name.lower() for t in ['shirt','collar','tie','lapel','neck']):continue
  result['meshes'].append({'name':o.name,'hidden':o.hide_render,'min':lo,'max':hi,'matrix':[list(r) for r in o.matrix_world],'modifiers':[(m.name,m.type)for m in o.modifiers],'materials':[m.name if m else None for m in o.data.materials]})
 rows[role]=result
(R/'work/v12-contact-inspection.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
