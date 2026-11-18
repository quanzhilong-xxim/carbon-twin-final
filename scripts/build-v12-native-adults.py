"""V12 isolated candidates: anatomical hand weights + exported full body rig.
Retains every old source. Donor Snow/Rain meshes and weights: Blender Foundation,
CC BY 4.0. No generated API assets, no paid requests. Run with local Blender.
"""
import bpy,bmesh,json,math,sys
from pathlib import Path
from mathutils import Vector,Matrix

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'public/models/characters-v10'
OUT=ROOT/'public/models/characters-v12-candidate'
OUT.mkdir(exist_ok=True)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Business']
ROLE=args[0]
REV=args[1] if len(args)>1 else 'v12b'
BUSINESS=ROLE=='Business'
VERSION='v11i' if BUSINESS else 'v11g'
STEM=f'CT_{ROLE}_Explore_{REV}'
if (OUT/(STEM+'.blend')).exists():raise RuntimeError('Candidate exists; choose a new revision')
bpy.ops.wm.open_mainfile(filepath=str(SRC/f'CT_{ROLE}_Explore_{VERSION}.blend'),load_ui=False,use_scripts=False)
scene=bpy.context.scene
root=bpy.data.objects[f'CT_{ROLE}_Explore_{VERSION}'];root.name=STEM
donor=bpy.data.objects['RIG-Snow' if BUSINESS else 'RIG-rain']
source=bpy.data.objects['GEO-snow_body' if BUSINESS else 'GEO-rain_body']
bpy.context.view_layer.update()
members=[o for o in root.children_recursive if o.type=='MESH' and not o.hide_render]
oldparents={o:o.parent.name if o.parent else '' for o in members}

def world_bake(o):
 m=o.matrix_world.copy();o.parent=None;o.data.transform(m,shape_keys=True);o.matrix_world=Matrix.Identity(4)
 o.parent=root
 o.matrix_parent_inverse=Matrix.Identity(4)
 o.matrix_world=Matrix.Identity(4)

for o in members:world_bake(o)
bpy.context.view_layer.update()

if REV not in ['v12a','v12b']:
 # Preserve native facial topology and expression deltas while reducing the
 # pinched nasal tip and long lower-face silhouette visible in the baseline.
 face=next(o for o in members if o.name.endswith('_head'))
 eye=next(o for o in members if o.name.endswith('_eyes'))
 eye_z=sum(v.co.z for v in eye.data.vertices)/len(eye.data.vertices)
 coords=[k.data for k in face.data.shape_keys.key_blocks] if face.data.shape_keys else [face.data.vertices]
 for data in coords:
  for v in data:
   p=v.co
   jaw=math.exp(-((p.z-(eye_z-.12))/.072)**2)
   p.x*=1+.035*jaw
   if p.z<eye_z-.04:p.z+=(eye_z-.04-p.z)*.035
   nasal=math.exp(-(p.x/.028)**2-((p.z-(eye_z-.055))/.048)**2)
   if p.y<-.12:p.y+=nasal*(.009 if BUSINESS else .014)
 # Shape-preserving nasal surface relaxation avoids a sharp central ridge.
 adjacency=[set()for v in face.data.vertices]
 for edge in face.data.edges:
  a,b=edge.vertices;adjacency[a].add(b);adjacency[b].add(a)
 for data in coords:
  for iteration in range(3):
   before=[v.co.copy()for v in data]
   for i,v in enumerate(data):
    p=before[i];region=math.exp(-(p.x/.038)**4-((p.z-(eye_z-.05))/.055)**4)
    if p.y<-.12 and adjacency[i]:v.co=p.lerp(sum((before[j]for j in adjacency[i]),Vector())/len(adjacency[i]),.20*region)
 if face.data.shape_keys:
  for v,k in zip(face.data.vertices,face.data.shape_keys.key_blocks[0].data):v.co=k.co
 # A warmer diffuse response and restrained optical specular are shared by
 # the face and retained skin material; no painted face overlay is used.
 skin_materials=set(m for o in members if o.name.endswith('_head') or o.name.startswith('Source skin')for m in o.data.materials if m)
 for m in skin_materials:
  if not m.use_nodes:continue
  p=m.node_tree.nodes.get('Principled BSDF')
  if not p:continue
  p.inputs['Roughness'].default_value=.48
  p.inputs['Specular IOR Level'].default_value=.24
  p.inputs['Subsurface Weight'].default_value=.055
  links=list(p.inputs['Base Color'].links)
  if links:
   old=links[0].from_socket;mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.55;mix.inputs[2].default_value=(1,.88,.80,1);m.node_tree.links.new(old,mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
  else:
   c=p.inputs['Base Color'].default_value;p.inputs['Base Color'].default_value=(c[0],c[1]*.94,c[2]*.90,1)

def center(name):
 o=bpy.data.objects[name];return sum((o.matrix_world@Vector(p)for p in o.bound_box),Vector())/8

bones={};weights_report={}
def bone(name,head,tail,parent=None):
 bones[name]={'head':Vector(head),'tail':Vector(tail),'parent':parent}

hip=.55 if BUSINESS else .90
bone('CT_Root',(0,0,0),(0,0,.12))
bone('CT_Pelvis',(0,0,hip),(0,0,hip+.1),'CT_Root')
bone('CT_Spine',(0,0,hip+.04),(0,-.008,hip+.18),'CT_Pelvis')
bone('CT_Chest',(0,-.008,hip+.18),(0,0,1.055 if BUSINESS else 1.405),'CT_Spine')
bone('CT_Neck',(0,0,1.035 if BUSINESS else 1.40),(0,-.008,1.14 if BUSINESS else 1.49),'CT_Chest')
bone('CT_Head',(0,-.008,1.14 if BUSINESS else 1.49),(0,-.008,1.31 if BUSINESS else 1.74),'CT_Neck')

hand_data={}
for side,s in [('R',-1),('L',1)]:
 cuff=center('V3 fitted cuff'+('' if side=='R' else '.001'))
 shoulder=Vector((s*(.18 if BUSINESS else .175),0,1.01 if BUSINESS else 1.36))
 elbow=shoulder.lerp(cuff,.51);elbow.y+=.022
 bone('CT_Clavicle_'+side,(s*.035,0,shoulder.z+.015),shoulder,'CT_Chest')
 bone('CT_UpperArm_'+side,shoulder,elbow,'CT_Clavicle_'+side)
 bone('CT_Forearm_'+side,elbow,cuff,'CT_UpperArm_'+side)
 wrist=donor.pose.bones[('DEF-Forearm2.' if BUSINESS else 'DEF-Hand.')+side]
 source_wrist=donor.matrix_world@(wrist.tail if BUSINESS else wrist.head)
 hand_scale=.80 if BUSINESS else .90
 hand_matrix=Matrix.Translation(cuff)@Matrix.Scale(hand_scale,4)@Matrix.Translation(-source_wrist)
 # Native posed source hand replaces accumulated vertex warps. Source weights
 # survive evaluation and cropping, including individual finger phalanges.
 dg=bpy.context.evaluated_depsgraph_get()
 data=bpy.data.meshes.new_from_object(source.evaluated_get(dg),depsgraph=dg)
 data.transform(source.matrix_world)
 hand=bpy.data.objects.new('V12 anatomical hand '+side,data);scene.collection.objects.link(hand)
 for g in source.vertex_groups:hand.vertex_groups.new(name=g.name)
 bm=bmesh.new();bm.from_mesh(data)
 cut=[v for v in bm.verts if s*v.co.x<.18 or v.co.z>source_wrist.z+.028 or (v.co-source_wrist).length>.27]
 bmesh.ops.delete(bm,geom=cut,context='VERTS');bm.to_mesh(data);bm.free()
 deform_names={b.name for b in donor.data.bones if b.use_deform}
 # Vertex masks and sculpt-control groups are not skin influences. Including
 # them would dilute each finger's anatomical weights with a rigid palm.
 source_weights=[[(hand.vertex_groups[g.group].name,g.weight)for g in v.groups if hand.vertex_groups[g.group].name in deform_names]for v in data.vertices]
 data.transform(hand_matrix)
 # Same skin response as the accepted native adult head/neck.
 old=bpy.data.objects['Source skin '+('right' if side=='R' else 'left')]
 data.materials.clear()
 for material in old.data.materials:data.materials.append(material)
 for p in data.polygons:p.material_index=0;p.use_smooth=True
 old.hide_render=True;old.hide_set(True)
 hand.parent=root
 palm_tail=cuff+Vector((s*.008,-.006,-.055))
 bone('CT_Hand_'+side,cuff,palm_tail,'CT_Forearm_'+side)
 mapping={}
 for finger in ['Thumb','Index','Middle','Ring','Pinky']:
  count=3 if BUSINESS or finger=='Thumb' else 4
  for i in range(1,count+1):
   name=f'CT_{finger}{i}_{side}'
   original=f'DEF-Finger_{finger}{i}.{side}' if BUSINESS else f'DEF-{finger}{i}.{side}'
   pb=donor.pose.bones[original]
   h=hand_matrix@(donor.matrix_world@pb.head);t=hand_matrix@(donor.matrix_world@pb.tail)
   bone(name,h,t,'CT_Hand_'+side if i==1 else f'CT_{finger}{i-1}_{side}')
   mapping[original]=name
 hand.vertex_groups.clear()
 groups={n:hand.vertex_groups.new(name=n)for n in ['CT_Hand_'+side,*mapping.values()]}
 for vi,values in enumerate(source_weights):
  total={}
  for n,w in values:
   target=mapping.get(n,'CT_Hand_'+side)
   total[target]=total.get(target,0)+w
  top=sorted(total.items(),key=lambda x:-x[1])[:4];summ=sum(w for n,w in top)
  if not summ:top=[('CT_Hand_'+side,1)];summ=1
  for n,w in top:groups[n].add([vi],w/summ,'REPLACE')
 hand_data[side]=hand;members.append(hand);oldparents[hand]='native-hand'
 # Continuous wrist skin extends under the cuff; no runtime proxy cylinder.
 # Original source crop includes the distal forearm, preserving its anatomy.
 for piece in members:
  if oldparents.get(piece)=='Arm'+('Right' if side=='R' else 'Left') and 'watch' in piece.name.lower():
   pass
 thigh=Vector((s*.105,0,.55)) if BUSINESS else Vector((s*.085,0,.89))
 knee=Vector((s*.107,-.412,.47)) if BUSINESS else Vector((s*.085,-.012,.48))
 ankle=Vector((s*.108,-.412,.075)) if BUSINESS else Vector((s*.085,.014,.085))
 toe=ankle+Vector((0,-.13,-.035))
 bone('CT_Thigh_'+side,thigh,knee,'CT_Pelvis')
 bone('CT_Calf_'+side,knee,ankle,'CT_Thigh_'+side)
 bone('CT_Foot_'+side,ankle,toe,'CT_Calf_'+side)
 bone('CT_Toe_'+side,toe,toe+Vector((0,-.055,0)),'CT_Foot_'+side)

arm=bpy.data.armatures.new('CT native humanoid anatomy')
rig=bpy.data.objects.new('CT_Humanoid',arm);scene.collection.objects.link(rig);rig.parent=root
rig['carbonTwinNativeRig']=True;rig['source_license']='CC-BY-4.0'
rig.show_in_front=True;rig.hide_render=False;rig.hide_set(False)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,b in bones.items():
 e=arm.edit_bones.new(n);e.head=b['head'];e.tail=b['tail']
 if (e.tail-e.head).length<.0001:e.tail.z+=.01
 if b['parent']:e.parent=arm.edit_bones[b['parent']]
 e.use_deform=True
bpy.ops.object.mode_set(mode='OBJECT')

def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

def distance_segment(p,a,b):
 d=b-a;t=max(0,min(1,(p-a).dot(d)/max(1e-8,d.length_squared)))
 return (p-a-d*t).length,t

for o in members:
 if o.hide_render or not len(o.data.vertices):continue
 if o.name.startswith('V108d ') and any(k in o.name for k in ['leather','backrest','upholstered','chair']):continue
 if o not in hand_data.values():
  o.vertex_groups.clear()
  groups={}
  def put(i,values):
   nonlocal_dummy=None
   total=sum(values.values())
   for n,w in values.items():
    if w<.0001:continue
    if n not in groups:groups[n]=o.vertex_groups.new(name=n)
    groups[n].add([i],w/total,'REPLACE')
  name=o.name.lower();parent=oldparents[o]
  for v in o.data.vertices:
   p=v.co;s='L' if p.x>=0 else 'R'
   if parent in ['Head','Eyes'] or any(k in name for k in ['groom','fringe','hair','optical','eyebrow','eyelash','glasses']):
    w={'CT_Head':1}
   elif parent in ['ArmRight','ArmLeft']:
    s='R' if parent=='ArmRight' else 'L'
    if 'watch' in name:w={'CT_Hand_'+s:1}
    else:
     h=bones['CT_UpperArm_'+s]['head'];e=bones['CT_Forearm_'+s]['head'];c=bones['CT_Hand_'+s]['head']
     _,t=distance_segment(p,h,c);blend=smooth(.36,.66,t)
     w={'CT_UpperArm_'+s:1-blend,'CT_Forearm_'+s:blend}
   elif any(k in name for k in ['pants','tights','shoes']):
    if 'shoes' in name:
     toe=smooth(-.51 if BUSINESS else -.14,-.59 if BUSINESS else -.19,p.y) if False else smooth(.09,.16,-p.y-(.412 if BUSINESS else 0))
     w={'CT_Foot_'+s:1-toe,'CT_Toe_'+s:toe}
    else:
     knee=bones['CT_Calf_'+s]['head'];bend=smooth(knee.z-.09,knee.z+.09,p.z)
     if BUSINESS:bend=smooth(-.365,-.255,p.y)
     ankle=smooth(.06,.13,p.z)
     w={'CT_Thigh_'+s:bend,'CT_Calf_'+s:(1-bend)*ankle,'CT_Foot_'+s:(1-bend)*(1-ankle)}
   elif 'tablet' in name or parent=='HeldTablet':w={'CT_Hand_L':1}
   else:
    # Smooth spine envelope; coat skirt follows pelvis with independent leg
    # influence only below the hem split, keeping the torso continuous.
    t=smooth(hip+.07,hip+.30,p.z)
    if p.z>1.38-(.35 if BUSINESS else 0):
     k=smooth(1.38-(.35 if BUSINESS else 0),1.46-(.35 if BUSINESS else 0),p.z)
     w={'CT_Chest':1-k,'CT_Neck':k}
    else:w={'CT_Pelvis':1-t,'CT_Spine':t*(1-t),'CT_Chest':t*t}
   put(v.index,w)
  weights_report[o.name]={'vertices':len(o.data.vertices),'groups':list(groups)}
 mod=o.modifiers.new('V12 actual exported skin','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=False
 o.parent=rig;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_world=Matrix.Identity(4)
 o.hide_set(False)

# Exportable, bounded demonstration clip. Runtime action controls reuse these
# same bones; this clip additionally makes the source independently inspectable.
scene.render.fps=30;scene.frame_start=1;scene.frame_end=121
rig.animation_data_create()
for frame in [1,16,31,46,61,76,91,106,121]:
 t=(frame-1)/120*math.tau
 for n in ['CT_Spine','CT_Chest','CT_Neck','CT_Head']:
  p=rig.pose.bones[n];p.rotation_mode='XYZ';p.rotation_euler=(math.sin(t)*(.008 if n=='CT_Chest' else .004),0,math.sin(t*.5)*.005)
  p.keyframe_insert('rotation_euler',frame=frame,group=n)
 for side in ['L','R']:
  for finger in ['Thumb','Index','Middle','Ring','Pinky']:
   for i in range(1,4):
    p=rig.pose.bones[f'CT_{finger}{i}_{side}'];p.rotation_mode='XYZ';p.rotation_euler=(.035*(1+math.sin(t+(0 if side=='L' else 1)))*(i/3),0,0)
    p.keyframe_insert('rotation_euler',frame=frame,group='Natural finger relaxation')
if rig.animation_data.action:
 rig.animation_data.action.name='CT_BreathAndHands';rig.animation_data.action.use_fake_user=True
scene.frame_set(1)
# Save source at a neutral actual bind pose, never the last action frame.
for p in rig.pose.bones:p.rotation_euler=(0,0,0)
rig.animation_data.action=None
bpy.context.view_layer.update()
root['native_humanoid_revision']=REV
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')))
objects=[root,*root.children_recursive]
for o in scene.objects:
 if o.name in bpy.context.view_layer.objects:
  o.select_set(False)
  if o in objects and not o.hide_render:o.hide_set(False);o.select_set(True)
bpy.context.view_layer.objects.active=rig
native_action=bpy.data.actions.get('CT_BreathAndHands')
# Avoid broadcasting unrelated source corrective actions onto this new rig.
# They remain in the saved editable candidate and in every original source.
for action in list(bpy.data.actions):
 if action!=native_action:bpy.data.actions.remove(action)
for tier in ['','-portrait','-lite']:
 rig.animation_data.action=native_action
 if tier=='-lite':
  for o in members:
   if o.hide_render or o in hand_data.values() or o.data.shape_keys or len(o.data.polygons)<800:continue
   bpy.context.view_layer.objects.active=o
   mod=o.modifiers.new('V12 mobile silhouette budget','DECIMATE');mod.ratio=.52
   bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(STEM+tier+'.glb')),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=True,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=86 if tier!='-lite' else 74,export_image_webp_fallback=False)
manifest={'revision':REV,'role':ROLE,'status':'CANDIDATE_NOT_ACCEPTED','base':VERSION,'bones':{n:{'head':list(b['head']),'tail':list(b['tail']),'parent':b['parent']}for n,b in bones.items()},'hands':{s:{'vertices':len(o.data.vertices),'groups':[g.name for g in o.vertex_groups]}for s,o in hand_data.items()},'skin_meshes':weights_report,'license':'CC BY 4.0','credit':'Snow / Rain © Blender Foundation; CarbonTwin tailored apparel, props and rig adaptation','paid_calls':0,'limitations':['Includes body and individual finger skins. Browser art/action acceptance still required.','Portrait retains standard topology; lite reduces non-morph cloth and prop geometry, keeping original fingers and expressions.']}
(OUT/(STEM+'.sources.json')).write_text(json.dumps(manifest,indent=2),encoding='utf8')
print('V12_NATIVE_CANDIDATE',ROLE,len(bones),[(s,len(o.data.vertices))for s,o in hand_data.items()],flush=True)
