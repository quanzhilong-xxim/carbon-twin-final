"""Rebuild isolated V12e facial candidates from untouched retained anatomy.
Keep the original source, six expression bakes, full body skin and V12d intact.
Snow/Rain: Blender Foundation, CC BY 4.0. No external generation calls.
"""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate'
role=sys.argv[-1];business=role=='Business';s='snow'if business else'rain';rev='v12e';stem=f'CT_{role}_Explore_{rev}'
if(OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve existing '+stem)
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{role}_Explore_v12d.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{role}_Explore_v12d'];root.name=stem
rig=bpy.data.objects['CT_Humanoid'];donor=bpy.data.objects['RIG-Snow'if business else'RIG-rain']
eye=1.204 if business else 1.588
source_eye=1.6225334 if business else 1.4733431
sx,sy,sz=(.80,.80,.80)if business else(.96,.96,.96)
matrix=Matrix.Translation((0,-.014 if business else-.009,eye))@Matrix.Diagonal((sx,sy,sz,1))@Matrix.Translation((0,0,-source_eye))
controls={b.name:b.matrix.copy()for b in donor.pose.bones if b.name.startswith(('ACT-','MSTR-','TGT-'))}
def reset():
 for n,m in controls.items():donor.pose.bones[n].matrix=m
 donor.update_tag();bpy.context.view_layer.update()
def offset(n,d):
 b=donor.pose.bones.get(n)
 if b:m=b.matrix.copy();m.translation+=Vector(d);b.matrix=m
def evaluated(o):
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();me=bpy.data.meshes.new_from_object(o.evaluated_get(dg),depsgraph=dg);me.transform(matrix@o.matrix_world);return me
new=[]
for suffix in ['head','eyes','eyebrows','eyelashes']:
 src=bpy.data.objects.get(f'GEO-{s}_{suffix}');old=bpy.data.objects.get(f'Source / GEO-{s}_{suffix}')
 if not src or not old:continue
 reset();data=evaluated(src)
 obj=bpy.data.objects.new('V12e native '+suffix,data);bpy.context.scene.collection.objects.link(obj);obj.parent=rig
 data.materials.clear()
 for m in old.data.materials:data.materials.append(m)
 for p in data.polygons:p.use_smooth=True;p.material_index=0
 obj.shape_key_add(name='Basis')
 for shape in ['BlinkLeft','BlinkRight','Smile','GazeLeft','GazeRight','GazeDown']:
  reset()
  if shape.startswith('Blink'):
   side='L'if shape=='BlinkLeft'else'R';prefix='MSTR-'if business else'ACT-'
   offset(prefix+'Eyelid_Upper.'+side,(0,0,-(.022 if business else .027)))
   offset(prefix+'Eyelid_Lower.'+side,(0,0,.009 if business else .010))
  elif shape=='Smile':
   for side,sign in [('L',1),('R',-1)]:offset('ACT-Lips_Corner.'+side,(sign*.003,0,.003));offset('MSTR-Eyebrow.'+side,(0,0,.0014))
  else:offset('MSTR-TGT-Eyes'if business else'TGT-Eyes',(-.09 if shape=='GazeRight'else .09 if shape=='GazeLeft'else 0,0,-.07 if shape=='GazeDown'else 0))
  me=evaluated(src)
  if len(me.vertices)!=len(data.vertices):raise RuntimeError('Expression topology changed')
  key=obj.shape_key_add(name=shape)
  for v,p in zip(key.data,me.vertices):v.co=p.co
  bpy.data.meshes.remove(me)
 old.hide_render=True;old.hide_set(True);new.append(obj)
reset()
# Subdivision evaluates every expression independently so no morph is lost.
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
OUT=R/'public/models/characters-v12-candidate'
for obj in new:
 if obj.name.endswith('head'):subdivide_morph(obj)
 for n in ['CT_Chest','CT_Neck','CT_Head']:obj.vertex_groups.new(name=n)
 low,high=(1.035,1.14)if business else(1.405,1.49)
 for v in obj.data.vertices:
  t=max(0,min(1,(v.co.z-low)/(high-low)));t=t*t*(3-2*t)
  obj.vertex_groups['CT_Head'].add([v.index],t,'REPLACE');obj.vertex_groups['CT_Neck'].add([v.index],1-t,'REPLACE')
 mod=obj.modifiers.new('Continuous neck and face skin','ARMATURE');mod.object=rig
 for material in obj.data.materials:
  if material and material.use_nodes:
   p=material.node_tree.nodes.get('Principled BSDF')
   if p:p.inputs['Roughness'].default_value=.44 if obj.name.endswith('head')else .25;p.inputs['Specular IOR Level'].default_value=.28
# Close the shirt opening with folded collar leaves; both are actual cloth.
if business:
 material=bpy.data.materials.get('Cream cotton poplin')or next(m for m in bpy.data.materials if'poplin'in m.name.lower())
 for sign in [-1,1]:
  vs=[(sign*.033,-.075,1.055),(sign*.087,-.075,1.032),(sign*.067,-.126,.978),(sign*.012,-.137,1.011)]
  d=bpy.data.meshes.new('V12e folded shirt collar');d.from_pydata(vs,[],[(0,1,2,3)]);o=bpy.data.objects.new(d.name,d);bpy.context.scene.collection.objects.link(o);o.parent=rig;d.materials.append(material)
  vg=o.vertex_groups.new(name='CT_Chest');vg.add(list(range(4)),1,'REPLACE')
  q=o.modifiers.new('Bound cotton edge','SOLIDIFY');q.thickness=.002
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=q.name)
  q=o.modifiers.new('Actual cloth skin','ARMATURE');q.object=rig
# Keep topology soft at the groom's broad highlights and add fine PBR strands.
import numpy as np
n=512;yy,xx=np.mgrid[:n,:n];fibres=.90+.075*np.sin(xx*.85+np.sin(yy*.025)*3)+.025*np.sin(xx*2.4+yy*.03)
pixels=np.ones((n,n,4),np.float32);pixels[:,:,:3]=fibres[:,:,None]*np.array([.24,.135,.085])
im=bpy.data.images.new('V12e chestnut directional fibres',width=n,height=n,alpha=True);im.pixels.foreach_set(pixels.ravel());im.pack()
hair=bpy.data.materials.new('V12e fine chestnut fibre response');hair.use_nodes=True;p=hair.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=.43;p.inputs['Specular IOR Level'].default_value=.30
tex=hair.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;hair.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
for o in root.children_recursive:
 if o.type!='MESH'or o.hide_render or o.data.shape_keys or not any(k in o.name.lower()for k in ['groom','fringe','hair layer','crown-to-nape']):continue
 o.data.materials.clear();o.data.materials.append(hair)
 uv=o.data.uv_layers.active or o.data.uv_layers.new()
 for f in o.data.polygons:
  f.use_smooth=True;f.material_index=0
  for li in f.loop_indices:
   v=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(v.x*8+v.y*2,v.z*5)
root['v12e_refinements']='Native anatomical face rebuilt from retained donor; portable original eyelid/smile/gaze; smooth neck weights; fine chestnut fibres and folded cotton collar.'
bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
native=bpy.data.actions.get('CT_BreathAndHands')
for action in list(bpy.data.actions):
 if action!=native:bpy.data.actions.remove(action)
objects=[root,*root.children_recursive]
for o in bpy.context.scene.objects:
 if o.name in bpy.context.view_layer.objects:o.select_set(o in objects and not o.hide_render)
bpy.context.view_layer.objects.active=rig
for tier in ['','-portrait','-lite']:
 if tier=='-lite':
  for o in objects:
   if o.type!='MESH'or o.hide_render or o.data.shape_keys or 'anatomical hand'in o.name or len(o.data.polygons)<800:continue
   bpy.context.view_layer.objects.active=o;q=o.modifiers.new('Mobile topology budget','DECIMATE');q.ratio=.52;bpy.ops.object.modifier_apply(modifier=q.name)
 rig.animation_data.action=native
 bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+tier+'.glb')),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=True,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=86 if tier!='-lite'else 74,export_image_webp_fallback=False)
record=json.loads((OUT/f'CT_{role}_Explore_v12d.sources.json').read_text());record.update(revision=rev,status='CANDIDATE_NOT_ACCEPTED',parent_revision='v12d',facial_method='Untouched donor anatomy with uniform proportions; six expressions rebaked from native rig; continuous neck weights',paid_calls=0)
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
print('V12E_REBUILT',role,flush=True)
