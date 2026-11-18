"""One bounded offline correction. Retains both previous editable masters.
Reuses complete CC BY 4.0/CarbonTwin apparel instead of skin-derived surfaces.
The result is a candidate, never an automatic production asset replacement.
"""
import bpy,math,json,hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
DEST=OUT/'CT_Student_Explore_v105b.blend'
if DEST.exists():raise RuntimeError('Existing correction must be reviewed, not overwritten')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v105.blend'),load_ui=False,use_scripts=False)
rig=bpy.data.objects['Root'];body=bpy.data.objects['Body'];face=bpy.data.objects['Face'];hair=bpy.data.objects['Hair']
for o in list(bpy.context.scene.objects):
 if o not in [rig,body,face,hair]:bpy.data.objects.remove(o,do_unlink=True)

# Freeze the humanoid in an A pose before fitting the existing tailored clothes.
for side,sign in [('L',1),('R',-1)]:
 b=rig.pose.bones['J_Bip_'+side+'_UpperArm'];pivot=rig.matrix_world@b.head
 world=Matrix.Translation(pivot)@Matrix.Rotation(sign*1.13,4,'Y')@Matrix.Translation(-pivot)
 b.matrix=rig.matrix_world.inverted()@world@rig.matrix_world@b.matrix
 bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
for mod in list(body.modifiers):
 if mod.type=='ARMATURE':bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT')
mod=body.modifiers.new('Humanoid skin after rest-pose fit','ARMATURE');mod.object=rig

# Hide the original shorts, footwear and covered legs, retaining real hands.
import bmesh
bm=bmesh.new();bm.from_mesh(body.data)
remove=[]
for f in bm.faces:
 mat=body.data.materials[f.material_index].name
 center=f.calc_center_median()
 if 'Bottoms_' in mat or 'Shoes_' in mat or ('SKIN' in mat and center.z<.91 and abs(center.x)<.19) or ('jersey' in mat and abs(center.x)>.145):remove.append(f)
bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(body.data);bm.free()

before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(OUT/'CT_Student_Explore_v104g.glb'))
imported=set(bpy.context.scene.objects)-before;kept=[]
def bind(o,names):
 o.vertex_groups.clear();o.modifiers.clear();o.parent=rig
 for name in names:o.vertex_groups.new(name=name)
 segments=[]
 for name in names:
  b=rig.data.bones[name];a=rig.matrix_world@b.head_local
  suffix=name.split('_')[-1]
  child={'UpperArm':'LowerArm','LowerArm':'Hand','UpperLeg':'LowerLeg','LowerLeg':'Foot','Hips':'Spine','Spine':'Chest','Chest':'UpperChest','UpperChest':'Neck'}.get(suffix)
  end=rig.data.bones.get(name.rsplit('_',1)[0]+'_'+child) if child else None
  z=rig.matrix_world@end.head_local if end else a+Vector((0,0,.08))
  segments.append((name,a,z))
 for v in o.data.vertices:
  p=o.matrix_world@v.co;dist=[]
  for name,a,z in segments:
   d=z-a;t=max(0,min(1,(p-a).dot(d)/max(d.length_squared,1e-10)));dist.append(((p-(a+d*t)).length,name))
  dist.sort();two=dist[:2];weights=[math.exp(-((d-two[0][0])/.035)**2) for d,n in two];total=sum(weights)
  for (d,n),w in zip(two,weights):o.vertex_groups[n].add([v.index],w/total,'REPLACE')
 m=o.modifiers.new('Transferred humanoid garment weights','ARMATURE');m.object=rig

for o in imported:
 if o.type!='MESH':continue
 name=o.name;anc=[];p=o
 while p:anc.append(p.name);p=p.parent
 path=' '.join(anc)
 sleeve='V3 rounded sleeve' in name or 'V3 fitted cuff' in name
 trouser='V10 merged CT_Student_Explore_v104g / V10 warm recycled cotton' in name
 shoe='GEO-rain_shoes' in name
 jacket=any(s in name for s in ['Ribbed jacket hem','Original plum woven jacket','V104 lavender topstitch']) and not sleeve
 prop=any(s in path.lower() for s in ['camera','backpack','botanical canvas','complete skateboard'])
 detail=any(s in name for s in ['Brushed brass','V10 satin brass','V10 forest charcoal silk','/ Warm canvas']) and 'Head' not in path
 if not any([sleeve,trouser,shoe,jacket,prop,detail]):continue
 world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
 # Bake source transforms so the subsequent weights use one consistent space.
 o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
 for v in o.data.vertices:
  v.co*=.935
  if sleeve:
   v.co.x*=1.10;v.co.z=.88+(v.co.z-.775)*.87
  elif jacket:
   v.co.x*=.92;v.co.z+=.04
  elif trouser:
   if v.co.z<.2:v.co.z-=.012
  elif prop or detail:v.co.z+=.04 if v.co.z>.7 else 0
 if sleeve:
  side='L' if sum(v.co.x for v in o.data.vertices)>0 else 'R'
  bind(o,['J_Bip_'+side+'_UpperArm','J_Bip_'+side+'_LowerArm'])
 elif trouser:
  bind(o,['J_Bip_'+s+'_'+part for s in ['L','R'] for part in ['UpperLeg','LowerLeg']]+['J_Bip_C_Hips'])
 elif shoe:bind(o,['J_Bip_L_Foot','J_Bip_R_Foot'])
 elif jacket:bind(o,['J_Bip_C_Hips','J_Bip_C_Spine','J_Bip_C_Chest','J_Bip_C_UpperChest'])
 else:o.parent=rig
 kept.append(o)
for o in imported:
 if o not in kept:bpy.data.objects.remove(o,do_unlink=True)

# Hair retains painted strand contrast. No external generation or paid call.
for im in bpy.data.images:
 if not im.name.startswith('CT mint layered hair'):continue
 px=np.array(im.pixels[:],np.float32).reshape(im.size[1],im.size[0],4)
 y,x=np.mgrid[:im.size[1],:im.size[0]];u=x/im.size[0];v=y/im.size[1]
 light=np.clip(.64+.22*np.sin(v*math.pi)+.07*np.sin(u*math.pi*110+v*4),.4,.98)
 px[:,:,:3]=np.array([.34,.66,.51])[None,None,:]*light[:,:,None]
 im.pixels.foreach_set(px.ravel());im.pack()
for o in [body,face]:
 for m in o.data.materials:
  if 'SKIN' not in m.name or not m.use_nodes:continue
  p=m.node_tree.nodes.get('Principled BSDF')
  if p:p.inputs['Base Color'].default_value=(.90,.76,.70,1);p.inputs['Roughness'].default_value=.52
rig['ct_rig']='humanoid-v105b-apose';rig['ct_status']='candidate pending independent visual acceptance'
rig['ct_garment_source']='Blender Foundation Rain CC BY 4.0, CarbonTwin original tailoring and accessories'
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(DEST))
f=OUT/'CT_Student_Explore_v105b.glb'
bpy.ops.export_scene.gltf(filepath=str(f),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_skins=True,export_morph=True)
source=json.loads((OUT/'CT_Student_Explore_v105.sources.json').read_text('utf8'))
source.update(status='CANDIDATE_PENDING_VISUAL_REVIEW',parent_candidate='v105',adaptations=source['adaptations']+['complete existing tailored apparel replaces skin-derived garments','rest pose and weighted garment transfer','removed concealed duplicate shorts and leg surfaces'],exports=[{'file':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}])
(OUT/'CT_Student_Explore_v105b.sources.json').write_text(json.dumps(source,ensure_ascii=False,indent=2),'utf8')
print('CORRECTION_EXPORTED',json.dumps({'file':str(f),'bytes':f.stat().st_size,'apparel':len(kept)}))
