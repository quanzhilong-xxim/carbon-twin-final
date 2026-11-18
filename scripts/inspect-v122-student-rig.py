import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'public/models/characters-v12-candidate/CT_Student_Explore_v12a.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v12a'];rig=root if root.type=='ARMATURE' else next(o for o in root.children_recursive if o.type=='ARMATURE');bpy.context.view_layer.update()
rows=[]
for n in ['J_Bip_C_Chest','J_Bip_L_UpperArm','J_Bip_L_LowerArm','J_Bip_L_Hand','J_Bip_R_UpperArm','J_Bip_R_LowerArm','J_Bip_R_Hand']:
 b=rig.pose.bones[n];rows.append({'bone':n,'head':list(rig.matrix_world@b.head),'tail':list(rig.matrix_world@b.tail)})
for o in [bpy.data.objects['Body'],bpy.data.objects['V3 rounded sleeve shoulder']]:
 rows.append({'name':o.name,'matrix':[list(x) for x in o.matrix_world],'groups':[g.name for g in o.vertex_groups],'mods':[(m.name,m.type)for m in o.modifiers]})
(R/'work/v122-student-rig.json').write_text(json.dumps(rows,indent=2));print('RIG_MEASURED')
