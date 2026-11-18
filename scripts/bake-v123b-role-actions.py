"""Add local, editable Idle/Wave/Turn clips without touching prior candidates.

Blender 5.2 background only; no rendering, online services or paid calls.
Axes and two-bone reach mirror studentPerformance.ts/nativeAdult.ts.
Every frame is baked to genuine pose-bone channels and glTF NLA clips.
"""
import bpy, math, json, hashlib, struct, shutil, sys, os
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
sys.path.insert(0,str(Path(__file__).resolve().parent))
from native_action_glb import repair_morph_channels

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/characters-v12-candidate'
DEST=Path(os.environ.get('CT_ACTION_CANDIDATE_DIR',str(OUT)))
STAGE=Path(os.environ.get('CT_ACTION_STAGE',str(ROOT/'work/v123b-native-actions-stage')))
FPS=30
CLIPS={'Idle':4.0,'Wave':4.8,'Turn':5.6}
X=Vector((1,0,0));Y=Vector((0,1,0));Z=Vector((0,0,1))
roles=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Student','Business','City']
STAGE.mkdir(parents=True,exist_ok=True)
DEST.mkdir(parents=True,exist_ok=True)

def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)

def envelope(t,total,rise=.7,fall=.8):
 return smooth(t/rise)*smooth((total-t)/fall)

def set_world_rotation(rig,bone,q):
 m=rig.matrix_world@bone.matrix
 m=Matrix.LocRotScale(m.translation,q,m.to_scale())
 bone.matrix=rig.matrix_world.inverted()@m
 bpy.context.view_layer.update()

def rotate(rig,bone,axis,angle):
 if not bone or abs(angle)<1e-10:return
 m=rig.matrix_world@bone.matrix
 set_world_rotation(rig,bone,Quaternion(axis,angle)@m.to_quaternion())

def point(rig,bone):
 return rig.matrix_world@bone.matrix.translation

def reach(rig,upper,lower,end,target,pole):
 """The runtime's geometric two-bone solver, evaluated in world coordinates."""
 a,b,c=point(rig,upper),point(rig,lower),point(rig,end)
 la=(b-a).length;lb=(c-b).length
 direction=target-a
 if min(la,lb,direction.length)<1e-6:return
 distance=max(abs(la-lb)+.0001,min(la+lb-.0001,direction.length));direction.normalize()
 along=(la*la+distance*distance-lb*lb)/(2*distance)
 height=math.sqrt(max(0,la*la-along*along))
 normal=pole-a;normal-=direction*normal.dot(direction)
 if normal.length<1e-6:normal=direction.cross(X)
 normal.normalize();joint=a+direction*along+normal*height
 q=(b-a).normalized().rotation_difference((joint-a).normalized())
 set_world_rotation(rig,upper,q@(rig.matrix_world@upper.matrix).to_quaternion())
 e,w=point(rig,lower),point(rig,end)
 q=(w-e).normalized().rotation_difference((target-e).normalized())
 set_world_rotation(rig,lower,q@(rig.matrix_world@lower.matrix).to_quaternion())

def rest_palm(rig,side,amount=1):
 hand=rig.pose.bones['CT_Hand_'+side]
 middle=rig.pose.bones.get('CT_Middle3_'+side);index=rig.pose.bones.get('CT_Index1_'+side);pinky=rig.pose.bones.get('CT_Pinky1_'+side)
 if not all((middle,index,pinky)):return
 distal=(point(rig,middle)-point(rig,hand)).normalized()
 width=(point(rig,index)-point(rig,pinky)).normalized()
 normal=width.cross(distal).normalized()*(1 if side=='R' else -1)
 forward=Vector((.035 if side=='R' else -.035,-1,-.12)).normalized()
 align=distal.rotation_difference(forward);normal=align@normal
 normal-=forward*normal.dot(forward);normal.normalize()
 down=Vector((0,0,-1));down-=forward*down.dot(forward);down.normalize()
 angle=math.atan2(forward.dot(normal.cross(down)),normal.dot(down))
 q=Quaternion(forward,angle)@align@(rig.matrix_world@hand.matrix).to_quaternion()
 current=(rig.matrix_world@hand.matrix).to_quaternion()
 set_world_rotation(rig,hand,current.slerp(q,max(0,min(1,amount))))

def register_track(owner,clip):
 ad=owner.animation_data
 if not ad or not ad.action:return
 action=ad.action;action.name=f'V123b_{owner.name}_{clip}';action.use_fake_user=True
 slot=ad.action_slot
 tr=ad.nla_tracks.new();tr.name=clip
 strip=tr.strips.new(clip,1,action)
 if slot:strip.action_slot=slot
 strip.blend_type='REPLACE';strip.extrapolation='NOTHING';tr.mute=True
 ad.action=None

def read_glb(file):
 b=file.read_bytes();assert b[:4]==b'glTF' and struct.unpack_from('<I',b,8)[0]==len(b)
 n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n])

reports=[]
for role in roles:
 stem=f'CT_{role}_Explore_v123b';parent=f'CT_{role}_Explore_v123a'
 if any(DEST.glob(stem+'*')):raise RuntimeError('Preserve existing candidate '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/(parent+'.blend')),load_ui=False,use_scripts=False)
 root=bpy.data.objects[parent];rig=root if role=='Student' else bpy.data.objects['CT_Humanoid'];student=role=='Student'
 original_actions=[a.name for a in bpy.data.actions]
 root.name=stem;objects=[root,*root.children_recursive];bones=rig.pose.bones
 rest={b.name:b.matrix_basis.copy()for b in bones};root_q=rig.rotation_quaternion.copy();root_loc=rig.location.copy()
 rig.rotation_mode='QUATERNION';root_q=rig.matrix_basis.to_quaternion()
 # Source snapshots contain no actions; preserve any actions if future sources do.
 for o in objects:
  if o.animation_data:
   o.animation_data.action=None
   for tr in o.animation_data.nla_tracks:tr.mute=True
  if o.type=='MESH' and o.data.shape_keys:
   if o.data.shape_keys.animation_data:
    o.data.shape_keys.animation_data.action=None
    for tr in o.data.shape_keys.animation_data.nla_tracks:tr.mute=True
   for k in o.data.shape_keys.key_blocks:k.value=0
 bpy.context.view_layer.update()
 shape_owners=[]
 suffixes=['Fcl_EYE_Close','Fcl_MTH_Joy','Fcl_BRW_Joy','Fcl_EYE_Joy'] if student else ['BlinkLeft','BlinkRight','Smile','GazeLeft','GazeRight','GazeDown']
 for o in objects:
  if o.type=='MESH' and o.data.shape_keys:
   keys=[k for k in o.data.shape_keys.key_blocks if any(k.name.endswith(s)for s in suffixes)]
   if keys:shape_owners.append((o.data.shape_keys,keys))
 recording=[o for o in objects if student and o.type=='MESH' and (o.name.startswith('V11 notebook')or o.name.startswith('V11 field notebook'))]
 prop_scales={o.name:o.scale.copy()for o in recording}
 prefix='J_Bip_' if student else 'CT_'
 foot_names=[f'J_Bip_{s}_Foot'if student else f'CT_Foot_{s}'for s in ['L','R']]
 foot_targets={n:point(rig,bones[n]).copy()for n in foot_names}
 foot_rotations={n:(rig.matrix_world@bones[n].matrix).to_quaternion()for n in foot_names}
 supports={}
 if role=='Business':
  for o in objects:
   if o.type=='MESH' and o.name.startswith('V108d padded leather arm'):
    pts=[o.matrix_world@Vector(v)for v in o.bound_box];lo=Vector(tuple(min(p[i]for p in pts)for i in range(3)));hi=Vector(tuple(max(p[i]for p in pts)for i in range(3)))
    side='R'if(lo.x+hi.x)<0 else'L';c=(lo+hi)*.5
    supports[side]=Vector((c.x,c.y-.10,hi.z+.026))
 affected=set()
 def touch(name,axis,angle):
  b=bones.get(name)
  if b:affected.add(name);rotate(rig,b,axis,angle)
 metrics=[]
 for clip,duration in CLIPS.items():
  count=round(duration*FPS);scene=bpy.context.scene;scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=count+1
  worst_foot=0;hand_heights=[];turn_angles=[]
  for frame in range(1,count+2):
   scene.frame_set(frame);t=(frame-1)/FPS;phase=2*math.pi*t/duration
   for b in bones:b.matrix_basis=rest[b.name]
   rig.location=root_loc;rig.rotation_quaternion=root_q
   for owner,keys in shape_owners:
    for k in keys:k.value=0
   bpy.context.view_layer.update()
   wave=envelope(t,duration)if clip=='Wave'else 0
   turn=envelope(t,duration,1.3,1.5)if clip=='Turn'else 0
   breath=math.sin(phase);yaw=.40*turn
   # Rotate the character rig while the business chair remains a sibling.
   rig.rotation_quaternion=Quaternion(Z,yaw)@root_q;bpy.context.view_layer.update()
   if student:
    touch('J_Bip_C_Chest',X,.0045*breath)
    touch('J_Bip_C_Chest',Z,.075*turn)
    touch('J_Bip_C_Head',X,.008*math.sin(phase)*(.4+wave*.6))
    touch('J_Bip_C_Head',Z,.018*math.sin(phase)+.11*envelope(t+.15,duration,1.2,1.4)*int(clip=='Turn'))
    touch('J_Bip_C_Head',Vector((0,-1,0)),-.035*wave)
    touch('J_Bip_L_LowerArm',X,-.18)
    touch('J_Bip_R_UpperArm',Vector((0,-1,0)),-.78*wave)
    touch('J_Bip_R_LowerArm',X,-.18-.12*wave)
    touch('J_Bip_R_LowerArm',Vector((0,-1,0)),wave*(-1.75+math.sin((t-.65)*7)*.10))
    touch('J_Bip_R_Hand',Z,.95*wave)
    # Real retained fingers use palm-local across axes; no loose substitute mesh.
    for side in ['L','R']:
     palm=bones['J_Bip_'+side+'_Hand'];axis=(rig.matrix_world@palm.matrix).to_quaternion()@Z
     for fi,finger in enumerate(['Index','Middle','Ring','Little']):
      for joint in [1,2,3]:touch(f'J_Bip_{side}_{finger}{joint}',axis,(-.16-fi*.018-(joint-1)*.06)*(1-(wave*.7 if side=='R'else 0))*(1 if side=='L'else -1))
     roll=bones.get(f'J_Roll_{side}_WristSkin');lower=bones.get(f'J_Bip_{side}_LowerArm')
     if roll and lower:
      q=(rig.matrix_world@lower.matrix).to_quaternion().slerp((rig.matrix_world@palm.matrix).to_quaternion(),.5)
      set_world_rotation(rig,roll,q);affected.add(roll.name)
   else:
    touch('CT_Spine',X,.005*breath);touch('CT_Chest',X,.006*breath)
    touch('CT_Chest',Z,.065*turn)
    touch('CT_Head',Z,.02*math.sin(phase)+.10*envelope(t+.15,duration,1.2,1.4)*int(clip=='Turn'))
    touch('CT_Head',X,.012*math.sin(phase)-.025*wave)
    for side,sign in [('R',-1),('L',1)]:
     upper=bones['CT_UpperArm_'+side];lower=bones['CT_Forearm_'+side];hand=bones['CT_Hand_'+side]
     if role=='Business':target=supports[side].copy()
     else:target=point(rig,hand).copy()
     if side=='R'and wave:
      raised=Vector((-.35,-.17,1.0 if role=='Business'else 1.30));target=target.lerp(raised,wave)
     pole=Vector((sign*(.265 if role=='Business'else .45),-.025 if role=='Business'else .03,.68 if role=='Business'else 1.10))
     if role=='Business':pole=pole.lerp(Vector((sign*.32,.10,.80)),1-wave if side=='R'else 1)
     reach(rig,upper,lower,hand,target,pole);affected.update([upper.name,lower.name,hand.name])
     if role=='Business':rest_palm(rig,side,1-wave if side=='R'else 1)
     touch('CT_Hand_'+side,Vector((0,-1,0)),sign*wave*(.10+math.sin((t-.6)*6)*.08)if side=='R'else 0)
     middle=bones.get('CT_Middle1_'+side);index=bones.get('CT_Index1_'+side);pinky=bones.get('CT_Pinky1_'+side)
     if middle and index and pinky:
      distal=(point(rig,middle)-point(rig,hand)).normalized();normal=(point(rig,index)-point(rig,pinky)).normalized().cross(distal).normalized()*(1 if side=='R'else -1)
      for fi,finger in enumerate(['Thumb','Index','Middle','Ring','Pinky']):
       for joint in [1,2,3]:
        b=bones.get(f'CT_{finger}{joint}_{side}')
        if not b:continue
        nxt=bones.get(f'CT_{finger}{joint+1}_{side}');direction=(point(rig,nxt)-point(rig,b))if nxt else(point(rig,b)-point(rig,b.parent))
        axis=direction.normalized().cross(normal).normalized()
        angle=(.08 if finger=='Thumb'else .11+fi*.025)*(1+.08*math.sin(phase))*(1-wave*.8 if side=='R'else 1)
        touch(b.name,axis,angle)
   # Keep both soles planted through the modest in-place turn, without root bob.
   for side in ['L','R']:
    names=[f'J_Bip_{side}_UpperLeg',f'J_Bip_{side}_LowerLeg',f'J_Bip_{side}_Foot']if student else[f'CT_Thigh_{side}',f'CT_Calf_{side}',f'CT_Foot_{side}']
    upper,lower,foot=[bones[n]for n in names]
    if turn>.00001:
     pole=Vector((.11 if side=='L'else-.11,-.42,.45))
     reach(rig,upper,lower,foot,foot_targets[foot.name],pole);set_world_rotation(rig,foot,foot_rotations[foot.name]);affected.update(names)
    worst_foot=max(worst_foot,(point(rig,foot)-foot_targets[foot.name]).length)
   # A gentle blink and smile are real morph animation, including in standalone viewers.
   blink_t=t-(2.15 if clip=='Idle'else 2.7)
   blink=max(0,math.sin(math.pi*blink_t/.28))if 0<=blink_t<=.28 else 0
   for owner,keys in shape_owners:
    for k in keys:
     if k.name.endswith(('Fcl_EYE_Close','BlinkLeft','BlinkRight')):k.value=blink
     elif k.name.endswith(('Fcl_MTH_Joy','Smile')):k.value=.12+.22*wave
     elif k.name.endswith('Fcl_BRW_Joy'):k.value=.18*wave
     elif k.name.endswith('Fcl_EYE_Joy'):k.value=.1*wave*(1-blink)
     elif k.name.endswith('GazeLeft'):k.value=.18*turn
     k.keyframe_insert('value',frame=frame)
   for prop in recording:
    prop.scale=(0,0,0);prop.keyframe_insert('scale',frame=frame)
   for name in affected:
    b=bones[name];b.rotation_mode='QUATERNION';b.keyframe_insert('rotation_quaternion',frame=frame);b.keyframe_insert('location',frame=frame)
   rig.keyframe_insert('rotation_quaternion',frame=frame)
   hand_heights.append(point(rig,bones['J_Bip_R_Hand'if student else'CT_Hand_R']).z)
   turn_angles.append(yaw)
  owners=[rig,*[x[0]for x in shape_owners],*recording]
  for owner in owners:register_track(owner,clip)
  metrics.append(dict(clip=clip,duration_seconds=duration,samples=count+1,maximum_foot_target_error_m=worst_foot,right_wrist_height_range_m=[min(hand_heights),max(hand_heights)],root_turn_radians=max(turn_angles)))
  print('BAKED_ACTION',role,metrics[-1],flush=True)
 # Preserve a neutral initial mesh state. The new source keeps all original keys/actions.
 for b in bones:b.matrix_basis=rest[b.name]
 rig.location=root_loc;rig.rotation_quaternion=root_q
 for owner,keys in shape_owners:
  for k in owner.key_blocks:k.value=0
 for prop in recording:prop.scale=prop_scales[prop.name]
 bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
 root['v123b_actions']=json.dumps(metrics)
 bpy.ops.wm.save_as_mainfile(filepath=str(STAGE/(stem+'.blend')))
 if student:
  keep={'Basis','Fcl_EYE_Close','Fcl_MTH_Joy','Fcl_BRW_Joy','Fcl_EYE_Joy','Fcl_BRW_Fun','Fcl_EYE_Surprised'}
  for o in objects:
   if o.type=='MESH'and o.data.shape_keys:
    for k in list(o.data.shape_keys.key_blocks)[::-1]:
     if k.name.rsplit('.',1)[-1]not in keep:o.shape_key_remove(k)
 for o in bpy.context.scene.objects:
  if o.name in bpy.context.view_layer.objects:o.select_set(o in objects and not o.hide_render)
 bpy.context.view_layer.objects.active=rig
 exports=[]
 for tier in ['','-portrait','-lite']:
  if tier=='-lite':
   for o in objects:
    if o.type!='MESH'or o.hide_render or o.data.shape_keys or('anatomical'in o.name and'hand'in o.name)or o.name=='Body'or len(o.data.polygons)<800:continue
    bpy.context.view_layer.objects.active=o;m=o.modifiers.new('Mobile silhouette budget','DECIMATE');m.ratio=.55;bpy.ops.object.modifier_apply(modifier=m.name)
  bpy.context.view_layer.objects.active=rig
  file=STAGE/(stem+tier+'.glb')
  bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_morph=True,export_morph_animation=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=74 if tier=='-lite'else 86,export_image_webp_fallback=False)
  repair_morph_channels(file,objects,FPS)
  g=read_glb(file);names={a.get('name')for a in g.get('animations',[])}
  if not set(CLIPS).issubset(names):raise RuntimeError(f'Missing actual exported clips {role} {tier}: {names}')
  for a in g['animations']:
   if a['name']in CLIPS:
    paths={c['target']['path']for c in a['channels']}
    assert'rotation'in paths and'weights'in paths,(role,a['name'],paths)
  exports.append(dict(file=file.name,bytes=file.stat().st_size,sha256=hashlib.sha256(file.read_bytes()).hexdigest(),animations=[dict(name=a['name'],channels=len(a['channels']))for a in g['animations']]))
 record=json.loads((OUT/(parent+'.sources.json')).read_text(encoding='utf8'))
 record.update(revision='v123b',version='v123b',parent_revision='v123a',editable_source=stem+'.blend',status='CANDIDATE_NOT_ACCEPTED',paid_calls=0,exports=exports,native_actions=metrics,retained_original_actions=original_actions,action_limitations=['Turn is a planted modest in-place 23-degree turn, not a walking turn.','Business retains its seated source and fixed chair.','Recording props are retained and scaled invisible only while these non-recording clips play.','Visual deformation/action acceptance still requires browser review.'])
 (STAGE/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
 for f in [STAGE/(stem+'.blend'),STAGE/(stem+'.sources.json'),*[STAGE/e['file']for e in exports]]:
  if(DEST/f.name).exists():raise RuntimeError('Refuse overwrite '+f.name)
  shutil.copy2(f,DEST/f.name)
 reports.append(dict(role=role,metrics=metrics,exports=exports))
 print('V123B_CANDIDATE_EXPORTED',role,flush=True)
(STAGE/'bake-result.json').write_text(json.dumps(dict(passed=True,reports=reports),indent=2),encoding='utf8')
print('V123B_ALL_COMPLETE',flush=True)
