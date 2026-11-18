"""One offline tailoring pass on V123b. Preserve every historical source and clip.

Only source sleeve/yoke skin weights and continuous cotton surfaces are refined.
No generated model, no eyewear changes and no destructive action filtering.
"""
import bpy,sys,json,math,hashlib,shutil,struct
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from native_action_glb import repair_morph_channels
OUT=ROOT/'public/models/characters-v12-candidate';STAGE=ROOT/'work/v123f-business-tailoring'
PARENT='CT_Business_Explore_v123b';STEM='CT_Business_Explore_v123f'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Refuse overwrite existing '+STEM)
STAGE.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(OUT/(PARENT+'.blend')),load_ui=False,use_scripts=False)
root=bpy.data.objects[PARENT];rig=bpy.data.objects['CT_Humanoid'];objects=[root,*root.children_recursive]
original_actions=[a.name for a in bpy.data.actions]
original_tracks={o.name:[t.name for t in o.animation_data.nla_tracks] for o in objects if o.animation_data}

def smooth(a,b,value):
 t=max(0,min(1,(value-a)/(b-a)));return t*t*(3-2*t)
def weights(obj,index,values):
 for group in obj.vertex_groups:group.remove([index])
 total=sum(values.values())
 for name,w in values.items():
  if w>1e-6:
   group=obj.vertex_groups.get(name)or obj.vertex_groups.new(name=name)
   group.add([index],w/total,'REPLACE')
def oldweights(obj,v):return{obj.vertex_groups[g.group].name:g.weight for g in v.groups}
def source_world(obj,v):return obj.matrix_world@v.co
def shoulder_field(p,side):
 bone=rig.data.bones['CT_UpperArm_'+side];a=rig.matrix_world@bone.head_local;b=rig.matrix_world@bone.tail_local
 axis=b-a;along=(p-a).dot(axis)/axis.length_squared
 return smooth(-.02,.32,along)

changes=[]
# Both meshes use the same continuous shoulder envelope. The retained sleeve
# cap previously moved 100% with the upper arm while its adjacent yoke had no
# arm influence, opening a hard line during Wave. The medial cap is now sewn
# to the chest; upper-arm influence rises smoothly over the actual sleeve root.
for name in ['V3 rounded sleeve shoulder','V3 rounded sleeve shoulder.001','V108c closed suit shoulder','Fitted tailored jacket']:
 obj=bpy.data.objects[name];count=0
 for v in obj.data.vertices:
  p=source_world(obj,v);side='L'if p.x>=0 else'R';old=oldweights(obj,v)
  if name.startswith('V3 rounded sleeve'):
   upper=shoulder_field(p,side)
   if upper>=.999999:continue
   new={n:w*upper for n,w in old.items()};new['CT_Chest']=1-upper
  elif name.startswith('V108c'):
   upper=shoulder_field(p,side)*smooth(.105,.160,abs(p.x))
   new={'CT_Chest':1-upper,'CT_UpperArm_'+side:upper}
  else:
   region=smooth(.12,.175,abs(p.x))*smooth(.885,.955,p.z)
   if region<1e-5:continue
   upper=shoulder_field(p,side)*region
   new={n:w*(1-upper)for n,w in old.items()};new['CT_UpperArm_'+side]=upper
  weights(obj,v.index,new);count+=1
 changes.append(dict(object=name,weighted_vertices=count,change='Shared continuous chest-to-upper-arm envelope at real sleeve root; retain original elbow/forearm weights below transition'))

cotton_names=['V122r continuous turned cotton neckband','V122s turned spread collar leaf','V122s turned spread collar leaf.001','V122x V opening shirt fitted to wool and lapels']
for name in cotton_names:
 obj=bpy.data.objects[name];maxdelta=0;count=0
 for v in obj.data.vertices:
  before=v.co.copy();p=source_world(obj,v)
  if name.startswith('V122s turned'):
   # Preserve the folded source shell and UV. Move its top edge 2.5mm into
   # the continuous stand and shorten only the exaggerated outer tips.
   top=smooth(1.038,1.068,p.z)
   p.y-=.0025*top
   tip=(1-smooth(1.018,1.049,p.z))*smooth(.030,.059,abs(p.x))
   p.z+=.007*tip;p.x*=1-.075*tip
   v.co=obj.matrix_world.inverted()@p
  elif name.startswith('V122x'):
   top=smooth(1.025,1.064,p.z)
   # The former jacket-projected bib stopped behind the folded leaves.
   # Extend the same cotton surface beneath those roots with a 3mm lap,
   # retaining the lower V taper and its original lapel clearance.
   p.x*=1+.10*top
   p.y-=.0035*top
   p.z+=.003*top
   v.co=obj.matrix_world.inverted()@p
  if p.z>1.025:
   neck=.30*smooth(1.040,1.075,p.z)
   weights(obj,v.index,{'CT_Chest':1-neck,'CT_Neck':neck});count+=1
  maxdelta=max(maxdelta,(v.co-before).length)
 changes.append(dict(object=name,weighted_vertices=count,maximum_source_displacement_m=maxdelta,change='Continuous overlapping cotton stand/leaf/bib surfaces share the same smooth chest-to-neck skin envelope'))

# Keep the source's exact editable action/NLA definitions. No keyframe, bone,
# face morph, optical mesh or original vertex/face topology is removed.
assert original_actions==[a.name for a in bpy.data.actions]
for name,tracks in original_tracks.items():assert tracks==[t.name for t in bpy.data.objects[name].animation_data.nla_tracks]
root.name=STEM;root['v123f_tailoring']=json.dumps(changes)
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(STAGE/(STEM+'.blend')))

# Source-level deformation diagnostics evaluate the retained clips separately.
# Bounds/normals are structural evidence only; visual acceptance is delegated
# to real browser inspection and is never inferred from these metrics.
rig_tracks=list(rig.animation_data.nla_tracks)
source_checks=[]
for track in rig_tracks:
 if track.name not in ['Idle','Wave','Turn']:continue
 for other in rig_tracks:other.mute=other!=track
 row={'clip':track.name,'samples':0,'finite':True,'minimum_triangle_area_m2':1e9,'maximum_bounds_diagonal_m':0}
 duration=track.strips[0].frame_end
 for frame in range(1,round(duration)+1,6):
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();depsgraph=bpy.context.evaluated_depsgraph_get()
  for name in ['V3 rounded sleeve shoulder','V3 rounded sleeve shoulder.001',*cotton_names]:
   obj=bpy.data.objects[name];evaluated=obj.evaluated_get(depsgraph);mesh=evaluated.to_mesh();pts=[evaluated.matrix_world@v.co for v in mesh.vertices]
   assert all(math.isfinite(c)for p in pts for c in p),name+' has nonfinite deformed vertex'
   lo=Vector(tuple(min(p[i]for p in pts)for i in range(3)));hi=Vector(tuple(max(p[i]for p in pts)for i in range(3)))
   row['maximum_bounds_diagonal_m']=max(row['maximum_bounds_diagonal_m'],(hi-lo).length)
   assert(hi-lo).length<.8,'Exploded garment deformation '+name
   for face in mesh.polygons:
    if len(face.vertices)>=3:
     a,b,c=[pts[i]for i in face.vertices[:3]];area=(b-a).cross(c-a).length*.5
     row['minimum_triangle_area_m2']=min(row['minimum_triangle_area_m2'],area)
   evaluated.to_mesh_clear()
  row['samples']+=1
 source_checks.append(row)
for track in rig_tracks:track.mute=True
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()

for obj in bpy.context.scene.objects:
 if obj.name in bpy.context.view_layer.objects:obj.select_set(obj in objects and not obj.hide_render)
exports=[]
for tier in ['','-portrait','-lite']:
 if tier=='-lite':
  for obj in objects:
   if obj.type!='MESH'or obj.hide_render or obj.data.shape_keys or('anatomical'in obj.name and'hand'in obj.name)or len(obj.data.polygons)<800:continue
   bpy.context.view_layer.objects.active=obj;modifier=obj.modifiers.new('Mobile silhouette budget','DECIMATE');modifier.ratio=.55;bpy.ops.object.modifier_apply(modifier=modifier.name)
 bpy.context.view_layer.objects.active=rig;file=STAGE/(STEM+tier+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_morph=True,export_morph_animation=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=74 if tier=='-lite'else 86,export_image_webp_fallback=False)
 repair_morph_channels(file,objects,30)
 raw=file.read_bytes();g=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
 assert{a['name']for a in g.get('animations',[])}=={'Idle','Wave','Turn'}
 assert max(len(s['joints'])for s in g['skins'])==52
 exports.append(dict(file=file.name,bytes=file.stat().st_size,sha256=hashlib.sha256(raw).hexdigest(),animations=[dict(name=a['name'],channels=len(a['channels']))for a in g['animations']]))

record=json.loads((OUT/(PARENT+'.sources.json')).read_text(encoding='utf8'))
record.update(revision='v123f',version='v123f',parent_revision='v123b',editable_source=STEM+'.blend',status='CANDIDATE_NOT_ACCEPTED',exports=exports,tailoring_refinements=changes,retained_source_actions=original_actions,source_deformation_checks=source_checks,paid_calls=0)
record['action_limitations']=record.get('action_limitations',[])+['V123f changes only garment seam shape and skin envelopes; browser visual acceptance is pending.','Original V123b eyewear is intentionally retained, including its known fit issues; V123c/d optical experiments are unchanged on disk.']
(STAGE/(STEM+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
for file in [STAGE/(STEM+'.blend'),STAGE/(STEM+'.sources.json'),*[STAGE/e['file']for e in exports]]:
 if(OUT/file.name).exists():raise RuntimeError('Refuse overwrite '+file.name)
 shutil.copy2(file,OUT/file.name)
(STAGE/'tailoring-result.json').write_text(json.dumps(dict(exported=True,visualAcceptance=False,changes=changes,source_checks=source_checks,exports=exports),indent=2),encoding='utf8')
print('V123F_BUSINESS_EXPORTED',json.dumps(dict(changes=changes,source_checks=source_checks)),flush=True)
