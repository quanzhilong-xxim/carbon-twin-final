"""Retarget the retained CC BY Snow hand topology onto the student's real rig.
Original meshes and every previous candidate remain on disk.
"""
import bpy,bmesh,sys
from pathlib import Path
from mathutils import Vector,Matrix
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122x'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve existing X')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122w.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122w'];rig=root
with bpy.data.libraries.load(str(OUT/'CT_Business_Explore_v122x.blend'),link=False)as(fr,to):
 to.objects=['CT_Humanoid','V12 anatomical hand R','V12 anatomical hand L']
donor,hand_r,hand_l=to.objects
for o in to.objects:bpy.context.scene.collection.objects.link(o)
bpy.context.view_layer.update()
skin=bpy.data.materials.new('V122x student anatomical skin');skin.use_nodes=True
p=next(n for n in skin.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
p.inputs['Base Color'].default_value=(.69,.49,.32,1);p.inputs['Roughness'].default_value=.56;p.inputs['Specular IOR Level'].default_value=.23;p.inputs['Subsurface Weight'].default_value=.035
body=bpy.data.objects['Body'];removed=0
for side,hand in [('R',hand_r),('L',hand_l)]:
 def target_name(name):
  stem=name.removeprefix('CT_').removesuffix('_'+side).replace('Pinky','Little')
  return 'J_Bip_'+side+'_'+stem
 def dh(name):return donor.matrix_world@donor.data.bones[name].head_local
 def th(name):return rig.matrix_world@rig.data.bones[target_name(name)].head_local
 donor_across=dh('CT_Index1_'+side)-dh('CT_Pinky1_'+side)
 target_across=th('CT_Index1_'+side)-th('CT_Pinky1_'+side)
 width=target_across.length/donor_across.length
 def frame(head,tip,across):
  y=(tip-head).normalized();x=across-y*across.dot(y);x.normalize();z=x.cross(y).normalized()
  return Matrix(((x.x,y.x,z.x,head.x),(x.y,y.y,z.y,head.y),(x.z,y.z,z.z,head.z),(0,0,0,1)))
 transforms={};mapping={}
 for group in hand.vertex_groups:
  name=group.name
  if name not in donor.data.bones:continue
  mapped=target_name(name)
  if mapped not in rig.data.bones:continue
  if name.startswith('CT_Hand_'):following='CT_Middle1_'+side
  else:
   bone=donor.data.bones[name];following=bone.children[0].name if bone.children else name
  if following==name:
   previous=donor.data.bones[name].parent.name
   da=dh(name);db=da+(da-dh(previous));ta=th(name);tb=ta+(ta-th(previous))
  else:da,db,ta,tb=dh(name),dh(following),th(name),th(following)
  length=(tb-ta).length/(db-da).length
  transforms[group.index]=frame(ta,tb,target_across)@Matrix.Diagonal((width,length,width,1))@frame(da,db,donor_across).inverted()
  mapping[group.index]=mapped
 matrix=hand.matrix_world.copy();weights=[]
 for v in hand.data.vertices:
  original=matrix@v.co;values=[(g.group,g.weight)for g in v.groups if g.group in transforms];total=sum(w for _,w in values)
  if total<1e-8:raise RuntimeError('Unweighted donor hand vertex')
  v.co=sum((transforms[g]@original*(w/total)for g,w in values),Vector())
  weights.append([(mapping[g],w/total)for g,w in values])
 hand.parent=None;hand.matrix_world=Matrix.Identity(4);hand.parent=root;hand.matrix_parent_inverse=Matrix.Identity(4)
 hand.vertex_groups.clear();groups={name:hand.vertex_groups.new(name=name)for name in set(mapping.values())}
 for i,values in enumerate(weights):
  for name,w in values:groups[name].add([i],w,'REPLACE')
 for m in list(hand.modifiers):hand.modifiers.remove(m)
 arm=hand.modifiers.new('Student native finger and wrist skin','ARMATURE');arm.object=rig
 hand.data.materials.clear();hand.data.materials.append(skin)
 for face in hand.data.polygons:face.material_index=0;face.use_smooth=True
 hand.name='V122x anatomical student hand '+side
 # The cut is hidden inside the retained knitted cuff. The donor includes
 # its continuous wrist, so no overlapping cylindrical proxy is required.
 wrist=rig.data.bones['J_Bip_'+side+'_Hand'].head_local
 forward=(rig.data.bones['J_Bip_'+side+'_Middle1'].head_local-wrist).normalized()
 bm=bmesh.new();bm.from_mesh(body.data)
 cut=[v for v in bm.verts if(v.co-wrist).dot(forward)>-.025 and(v.co-wrist).length<.22]
 removed+=len(cut);bmesh.ops.delete(bm,geom=cut,context='VERTS');bm.to_mesh(body.data);bm.free()
 print('RETARGETED_HAND',side,len(hand.data.vertices),len(groups),flush=True)
 # Recalculate normals after transforming the source's continuous surface.
 bm=bmesh.new();bm.from_mesh(hand.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(hand.data);bm.free()
bpy.data.objects.remove(donor,do_unlink=True)
print('RETIRED_OLD_HAND_VERTICES',removed,flush=True)
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122w','v122x',[
 'Retarget Blender Foundation Snow CC BY 4.0 continuous anatomical hand meshes to the existing 154-joint student skeleton, preserving every original source',
 'Map the actual wrist and finger landmarks and interpolate source skin weights onto the student phalanges; remove the old hand topology only inside the new candidate',
 'Retain the donor continuous wrist beneath the knitted cuff; use restrained skin roughness and subsurface response'
],student=True)
