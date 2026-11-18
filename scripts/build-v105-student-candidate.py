"""Bounded, offline candidate study. Never edits an earlier character master.
Base: pixiv VRM1 Constraint Twist Sample, VRM Public License 1.0, model settings
allow corporate use, modification and redistribution. Changes: CarbonTwin.
Run in a separate Blender background process, not the user's live scene.
"""
import bpy, math, json, hashlib, re
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
REVIEW=Path('C:/Users/23242/Documents/Codex/2026-11-07/ni/outputs/v105-asset-review')
OUT=ROOT/'public/models/characters-v10'
DEST=OUT/'CT_Student_Explore_v105.blend'
if DEST.exists():raise RuntimeError('Candidate already exists; inspect it instead of overwriting.')
bpy.ops.wm.open_mainfile(filepath=str(REVIEW/'pixiv-import-inspection.blend'),load_ui=False,use_scripts=False)
rig=bpy.data.objects['Root'];body=bpy.data.objects['Body'];face=bpy.data.objects['Face'];hair=bpy.data.objects['Hair']
for o in list(bpy.context.scene.objects):
 if o not in [rig,body,face,hair]:bpy.data.objects.remove(o,do_unlink=True)

# The sample's optional VRM twist/aim helpers depend on VRM extensions. Convert
# their weights to the exported humanoid chain so plain GLTFLoader retains
# functional shoulders, elbows, fingers and knees without an extra runtime.
mapping={}
for group in body.vertex_groups:
 name=group.name
 if name.startswith('J_Bip_'):continue
 side='_L_' if '_L_' in name else '_R_' if '_R_' in name else None
 if not side:continue
 part='UpperArm' if any(x in name for x in ['Shoulder','UpperArm']) else 'LowerArm' if any(x in name for x in ['LowerArm','Elbow']) else 'Hand' if 'Hand' in name else 'UpperLeg' if 'UpperLeg' in name else 'LowerLeg' if 'LowerLeg' in name else None
 if part:mapping[group.index]='J_Bip'+side+part
for v in body.data.vertices:
 sums={}
 for g in v.groups:
  name=mapping.get(g.group,body.vertex_groups[g.group].name)
  sums[name]=sums.get(name,0)+g.weight
 for name,w in sums.items():
  vg=body.vertex_groups.get(name) or body.vertex_groups.new(name=name)
  vg.add([v.index],w,'REPLACE')
for name in [g.name for g in body.vertex_groups if g.index in mapping]:body.vertex_groups.remove(body.vertex_groups[name])

def material(name,color,rough=.72,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m

def fabric(name,color):
 m=material(name,color);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Sheen Weight'].default_value=.18
 n=256;y,x=np.mgrid[:n,:n];weave=.5+.14*np.sin(x*np.pi)+.14*np.sin(y*np.pi)+.07*np.sin((x-y)*math.pi/4)
 px=np.ones((n,n,4),np.float32);px[:,:,:3]=np.array(color)[None,None,:]*(.86+weave[:,:,None]*.23)
 im=bpy.data.images.new(name+' / woven albedo',width=n,height=n,alpha=True);im.pixels.foreach_set(px.ravel());im.pack()
 t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im
 uv=m.node_tree.nodes.new('ShaderNodeTexCoord');scale=m.node_tree.nodes.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs[3].default_value=28
 m.node_tree.links.new(uv.outputs['UV'],scale.inputs[0]);m.node_tree.links.new(scale.outputs[0],t.inputs['Vector']);m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 return m

lavender=fabric('CarbonTwin lavender woven overshirt',(.54,.34,.66))
canvas=fabric('CarbonTwin warm pink cargo cotton',(.72,.46,.47))
cream=fabric('CarbonTwin ivory ribbed inner jersey',(.85,.84,.71))
trim=material('CarbonTwin muted mint binding',(.46,.70,.57),.63)

def subset(name,predicate,mat):
 # Copy all vertex groups, UVs and armature bindings, remove only non-selected
 # faces. This is a real skinned garment surface rather than rigid capsules.
 o=body.copy();o.data=body.data.copy();o.name=name;bpy.context.scene.collection.objects.link(o)
 import bmesh
 bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table()
 delete=[f for f in bm.faces if not predicate(f)]
 bmesh.ops.delete(bm,geom=delete,context='FACES');bm.to_mesh(o.data);bm.free()
 o.data.materials.clear();o.data.materials.append(mat)
 for p in o.data.polygons:p.material_index=0;p.use_smooth=True
 return o

skin_index=next(i for i,m in enumerate(body.data.materials) if m.name=='Body_00_SKIN')
top_index=next(i for i,m in enumerate(body.data.materials) if m.name=='Tops_01_CLOTH')
pants=subset('CT skinned full-length cargo trousers',lambda f:f.material_index==skin_index and .072<f.calc_center_median().z<.77,canvas)
for v in pants.data.vertices:
 co=v.co;side=1 if co.x>0 else -1;center=side*.077
 fold=(.0028*math.sin(co.z*80+co.y*29)+.0018*math.sin(co.z*134))*math.exp(-((co.z-.46)/.25)**2)
 co.x=center+(co.x-center)*1.53+side*.008
 co.y=(co.y-.004)*1.28+.004+fold
 for g in v.groups:
  if g.weight>0:pass
shell=pants.modifiers.new('Cotton thickness','SOLIDIFY');shell.thickness=.0018

# Preserve the white inner shirt and construct an open overshirt from its
# retained tailored surface, with long sleeves from the real weighted arms.
body.data.materials[top_index]=cream
for i,m in enumerate(body.data.materials):
 if m.name=='Bottoms_01_CLOTH':body.data.materials[i]=canvas
jacket=subset('CT skinned open lavender jacket',lambda f:f.material_index==top_index and not(abs(f.calc_center_median().x)<.049 and f.calc_center_median().y<-.045),lavender)
for v in jacket.data.vertices:
 v.co.x*=1.055;v.co.y*=1.09
 if v.co.z<1.13:v.co.y+=.002*math.sin(v.co.z*95+v.co.x*23)
shell=jacket.modifiers.new('Folded jacket edge thickness','SOLIDIFY');shell.thickness=.0025
sleeves=subset('CT skinned long sleeves with elbow folds',lambda f:f.material_index==skin_index and .215<abs(f.calc_center_median().x)<.532 and f.calc_center_median().z>1.16,lavender)
for v in sleeves.data.vertices:
 x=abs(v.co.x);w=.006+.003*math.sin(x*118)*math.exp(-((x-.34)/.12)**2)
 delta=Vector((0,v.co.y-.025,v.co.z-1.274))
 if delta.length>0:delta.normalize();v.co+=delta*w
shell=sleeves.modifiers.new('Sleeve fabric thickness','SOLIDIFY');shell.thickness=.0015

# Repaint the supplied texture while retaining its painted strand highlights
# and alpha. Source images remain untouched in the research directory.
for name in ['Hair_00','HairBack_00']:
 old=bpy.data.images.get(name)
 if not old:continue
 px=np.array(old.pixels[:],np.float32).reshape(old.size[1],old.size[0],4)
 luminance=np.sum(px[:,:,:3]*np.array([.2126,.7152,.0722]),axis=2)
 light=np.clip(.67+luminance*.68,.45,1.08)
 px[:,:,:3]=np.clip(light[:,:,None]*np.array([.49,.77,.65]),0,1)
 im=bpy.data.images.new('CT mint layered hair / '+name,width=old.size[0],height=old.size[1],alpha=True)
 im.pixels.foreach_set(px.ravel());im.pack()
 for m in bpy.data.materials:
  if m.use_nodes:
   for n in m.node_tree.nodes:
    if n.type=='TEX_IMAGE' and n.image==old:n.image=im

# Keep the expressive original face, brows, eyelashes and individual fingers.
# Only a restrained smile is part of the resting pose; runtime expressions use
# the retained morph targets, including left/right eye closure.
for m in bpy.data.materials:
 if not m.use_nodes:continue
 p=m.node_tree.nodes.get('Principled BSDF')
 if not p:continue
 if 'SKIN' in m.name:
  p.inputs['Roughness'].default_value=.53;p.inputs['Specular IOR Level'].default_value=.27
  p.inputs['Subsurface Weight'].default_value=.035
 if 'EYE' in m.name:p.inputs['Roughness'].default_value=.24

# Reuse the approved camera, canvas backpack and complete skateboard geometry.
before=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(OUT/'CT_Student_Explore_v104g.glb'))
imported=set(bpy.context.scene.objects)-before
props=[]
for o in imported:
 if o.type!='MESH':continue
 ancestors=[];p=o
 while p:ancestors.append(p.name);p=p.parent
 if re.search(r'camera|backpack|Botanical canvas|complete skateboard',' '.join(ancestors),re.I):
  world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
  o.location*=.935;o.scale*=.935;props.append(o)
for o in imported:
 if o not in props:bpy.data.objects.remove(o,do_unlink=True)
for o in props:
 world=o.matrix_world.copy();o.parent=rig;o.matrix_world=world

# The root keeps a compact source and explicit identity. Plain glTF metadata
# retains the licence settings instead of inheriting three-vrm's code licence.
source=(REVIEW/'pixiv-sample.vrm').read_bytes();length=int.from_bytes(source[12:16],'little');gltf=json.loads(source[20:20+length]);meta=gltf['extensions']['VRMC_vrm']['meta']
rig['ct_rig']='humanoid-v105';rig['ct_source']='pixiv Inc. / VRM1_Constraint_Twist_Sample v1.0.1'
rig['ct_license']='VRM Public License 1.0; corporate commercial use; modification and redistribution allowed'
rig['ct_license_url']='https://vrm.dev/licenses/1.0/'
for o in [body,face,hair,jacket,sleeves,pants]:
 o['ct_source']='pixiv sample, adapted by CarbonTwin';o['ct_license_url']='https://vrm.dev/licenses/1.0/'
 o.select_set(True)
rig.select_set(True)
for o in props:o.select_set(True)
bpy.context.view_layer.objects.active=rig

# Export an explicit candidate; the stable character manifest is not changed.
bpy.ops.wm.save_as_mainfile(filepath=str(DEST))
exports=[]
for suffix in ['', '-portrait', '-lite']:
 f=OUT/('CT_Student_Explore_v105'+suffix+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(f),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_skins=True,export_morph=True,export_image_format='AUTO')
 exports.append({'file':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
record={'status':'CANDIDATE_NOT_VISUALLY_ACCEPTED','source':'https://github.com/vrm-c/vrm-specification/tree/master/samples/VRM1_Constraint_Twist_Sample','source_sha256':hashlib.sha256(source).hexdigest(),'source_metadata':meta,'source_readme':'pixiv-sample-readme.md','adaptations':['real skinned full-length cargo trousers','weighted open lavender jacket and long sleeves','mint layered hair texture','retained face, eyelash and eyebrow textures and morphs','retained humanoid skeleton and fingers','twist helper weights remapped for plain glTF runtime','retained CarbonTwin camera, backpack and skateboard (Blender Foundation CC BY 4.0 / CarbonTwin original modifications)'],'exports':exports,'paid_calls':0}
(OUT/'CT_Student_Explore_v105.sources.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),'utf8')
print('V105_CANDIDATE',json.dumps({'exports':exports,'morphs':len(face.data.shape_keys.key_blocks)-1,'bones':len(rig.data.bones),'props':len(props)}))
