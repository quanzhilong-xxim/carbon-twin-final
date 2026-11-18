"""Offline, additive collar fitting on G; retain G/F/B and every native action."""
import bpy,sys,json,math,hashlib,shutil,struct
from pathlib import Path
from mathutils import Matrix
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from native_action_glb import repair_morph_channels
OUT=ROOT/'public/models/characters-v12-candidate'
STAGE=ROOT/'work/v123h-business-collar'
PARENT='CT_Business_Explore_v123g';STEM='CT_Business_Explore_v123h'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Refuse overwrite '+STEM)
STAGE.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(OUT/(PARENT+'.blend')),load_ui=False,use_scripts=False)
root=bpy.data.objects[PARENT];rig=bpy.data.objects['CT_Humanoid']
actions=[a.name for a in bpy.data.actions]
tracks={o.name:[t.name for t in o.animation_data.nla_tracks]for o in [root,*root.children_recursive]if o.animation_data}
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
cotton=bpy.data.materials['V122n warm ivory cotton']
hidden=[]
for name in ['V122s turned spread collar leaf','V122s turned spread collar leaf.001']:
 obj=bpy.data.objects[name];obj.hide_render=True;hidden.append(name)

def smooth(a,b,v):
 t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)

created=[]
for side in [-1,1]:
 vertices=[];faces=[];n=20
 for v in range(n+1):
  t=v/n
  for u in range(n+1):
   s=u/n;theta=.16+1.08*s
   # The entire root lies on the retained elliptical cotton stand.
   rx=.049*math.sin(theta);ry=-.022-.075*math.cos(theta);rz=1.074-.011*s
   tx=.025+.042*s;ty=-.140+.013*s;tz=1.043-.022*s
   x=rx*(1-t)+tx*t;y=ry*(1-t)+ty*t-.003*math.sin(math.pi*s)*math.sin(math.pi*t);z=rz*(1-t)+tz*t
   vertices.append((side*x,y,z))
 for v in range(n):
  for u in range(n):
   a=v*(n+1)+u;face=(a,a+1,a+n+2,a+n+1);faces.append(face if side>0 else tuple(reversed(face)))
 mesh=bpy.data.meshes.new('V123h swept collar cotton shell');mesh.from_pydata(vertices,[],faces);mesh.update()
 obj=bpy.data.objects.new('V123h fitted collar '+('right'if side>0 else'left'),mesh);bpy.context.collection.objects.link(obj)
 obj.parent=root;obj.matrix_parent_inverse=root.matrix_world.inverted();obj.data.materials.append(cotton)
 # Paper-thin source leaves looked detached; give the new folded fabric a
 # closed 1.2mm hem while leaving every old source editable and recoverable.
 for p in mesh.polygons:p.use_smooth=True
 obj.select_set(True);bpy.context.view_layer.objects.active=obj
 solid=obj.modifiers.new('Turned cotton edge 1.2mm','SOLIDIFY');solid.thickness=.0012;solid.offset=0
 bpy.ops.object.modifier_apply(modifier=solid.name)
 for name in ['CT_Chest','CT_Neck']:obj.vertex_groups.new(name=name)
 for vertex in obj.data.vertices:
  neck=.30*smooth(1.040,1.075,vertex.co.z)
  obj.vertex_groups['CT_Chest'].add([vertex.index],1-neck,'REPLACE');obj.vertex_groups['CT_Neck'].add([vertex.index],neck,'REPLACE')
 arm=obj.modifiers.new('Retained adult skeleton','ARMATURE');arm.object=rig
 created.append(obj.name)

assert actions==[a.name for a in bpy.data.actions]
for name,names in tracks.items():assert names==[t.name for t in bpy.data.objects[name].animation_data.nla_tracks]
root.name=STEM;objects=[root,*root.children_recursive]
root['v123h_collar_fit']='Two curved cotton leaves sewn along the original elliptical stand; native actions and optical assembly unchanged'
bpy.ops.wm.save_as_mainfile(filepath=str(STAGE/(STEM+'.blend')))
for obj in bpy.context.scene.objects:
 if obj.name in bpy.context.view_layer.objects:obj.select_set(obj in objects and not obj.hide_render)
exports=[]
for tier in ['', '-portrait', '-lite']:
 if tier=='-lite':
  for obj in objects:
   if obj.type!='MESH'or obj.hide_render or obj.data.shape_keys or('anatomical'in obj.name and'hand'in obj.name)or len(obj.data.polygons)<800:continue
   bpy.context.view_layer.objects.active=obj;mod=obj.modifiers.new('Mobile silhouette budget','DECIMATE');mod.ratio=.55;bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.context.view_layer.objects.active=rig;file=STAGE/(STEM+tier+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_morph=True,export_morph_animation=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=74 if tier=='-lite'else 86,export_image_webp_fallback=False)
 repair_morph_channels(file,objects,30)
 raw=file.read_bytes();g=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
 assert{a['name']for a in g['animations']}=={'Idle','Wave','Turn'}
 assert max(len(s['joints'])for s in g['skins'])==52
 exports.append(dict(file=file.name,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),clips=[a['name']for a in g['animations']]))
record=json.loads((OUT/(PARENT+'.sources.json')).read_text(encoding='utf8'))
record.update(revision='v123h',version='v123h',parent_revision='v123g',editable_source=STEM+'.blend',status='CANDIDATE_NOT_ACCEPTED',exports=exports,paid_calls=0,collar_fit=dict(new_meshes=created,old_meshes_retained_hidden=hidden))
record['action_limitations']=['All B native clips, G glasses and F shoulder weights retained.','Only cotton collar leaves are refitted; face, shoulders and overall art require further visual review.']
(STAGE/(STEM+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
for file in [STAGE/(STEM+'.blend'),STAGE/(STEM+'.sources.json'),*[STAGE/e['file']for e in exports]]:
 if(OUT/file.name).exists():raise RuntimeError('Refuse overwrite '+file.name)
 shutil.copy2(file,OUT/file.name)
(STAGE/'collar-result.json').write_text(json.dumps(dict(exported=True,visualAcceptance=False,exports=exports,created=created),indent=2),encoding='utf8')
print('V123H_COLLAR_EXPORTED',json.dumps(exports),flush=True)
