"""Re-import actual GLBs; verify weights and actual vertex deformation."""
import bpy,json,math,sys,os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
out=Path(sys.argv[-1]) if '--' in sys.argv else ROOT/'outputs/v12/native-rig-validation.json'
reports=[]
revision=os.environ.get('CT_RIG_REVISION','v12b')
role_revisions=json.loads(os.environ.get('CT_ROLE_REVISIONS','{}'))
for role in ['Business','City']:
 role_revision=role_revisions.get(role.lower(),revision)
 file=ROOT/f'public/models/characters-v12-candidate/CT_{role}_Explore_{role_revision}.glb'
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(file))
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 if rig.animation_data:rig.animation_data_clear()
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE'for m in o.modifiers)]
 failures=[];tests=[];worst=0;unweighted=0
 for o in meshes:
  for v in o.data.vertices:
   total=sum(g.weight for g in v.groups)
   worst=max(worst,abs(total-1))
   if total<.999:unweighted+=1
 if worst>.001:failures.append('unnormalized skin weights')
 if unweighted:failures.append('vertices without skin weights')
 targets=['CT_Pelvis','CT_Spine','CT_Chest','CT_Neck','CT_Head','CT_UpperArm_R','CT_Forearm_R','CT_Hand_R','CT_Thigh_R','CT_Calf_R','CT_Foot_R','CT_Toe_R']
 targets += [f'CT_{f}2_{s}'for s in ['L','R']for f in ['Thumb','Index','Middle','Ring','Pinky']]
 for name in targets:
  pb=rig.pose.bones.get(name)
  affected=[]
  for o in meshes:
   group=o.vertex_groups.get(name)
   if not group:continue
   indices=[v.index for v in o.data.vertices if any(g.group==group.index and g.weight>.05 for g in v.groups)]
   if indices:affected.append((o,indices))
  if not pb or not affected:
   tests.append({'bone':name,'passed':False,'reason':'missing bone or meaningful direct weights'});failures.append(name);continue
  def positions():
   bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();result=[]
   for o,indices in affected:
    ev=o.evaluated_get(dg);result.extend(ev.matrix_world@ev.data.vertices[i].co for i in indices)
   return result
  before=positions();q=pb.rotation_quaternion.copy();pb.rotation_mode='XYZ';pb.rotation_euler.x=.18
  after=positions();delta=max((a-b).length for a,b in zip(after,before))
  pb.rotation_euler=(0,0,0);bpy.context.view_layer.update()
  passed=delta>.00005
  tests.append({'bone':name,'weighted_vertices':sum(len(i)for o,i in affected),'maximum_displacement_m':delta,'passed':passed})
  if not passed:failures.append(name)
 report={'role':role,'file':str(file),'joints':len(rig.data.bones),'skinned_meshes':len(meshes),'worst_weight_sum_error':worst,'unweighted_vertices':unweighted,'tests':tests,'failures':failures,'passed':not failures}
 reports.append(report)
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps({'reports':reports,'passed':all(r['passed']for r in reports)},indent=2),encoding='utf8')
print('V12_EXPORTED_DEFORMATION',[(r['role'],r['passed'],r['failures'])for r in reports],flush=True)
if not all(r['passed']for r in reports):raise RuntimeError('Actual exported skin validation failed')
