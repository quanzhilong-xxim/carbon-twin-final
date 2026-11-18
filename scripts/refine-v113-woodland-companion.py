"""Preserve A; add local Blink morphs, cloth/fur micro normals and torso weights."""
import bpy,math,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'public/models/behaviour-v113-candidate'
target=O/'woodland-companion-v113b.blend'
if target.exists():raise RuntimeError('Refusing to overwrite B candidate')
bpy.ops.wm.open_mainfile(filepath=str(O/'woodland-companion.blend'),use_scripts=False)
rig=bpy.data.objects['CT113_Woodland_Companion_Rig']
def normal_image(name,fabric):
 n=512;im=bpy.data.images.new(name,width=n,height=n);pixels=[]
 for y in range(n):
  for x in range(n):
   if fabric:nx=.5+.08*math.sin(x*math.pi/3);ny=.5+.08*math.sin(y*math.pi/3)
   else:nx=.5+.026*math.sin(x*.31+y*.04);ny=.5+.065*math.sin(x*.91+y*.13)
   pixels.extend((nx,ny,.994,1))
 im.pixels.foreach_set(pixels);im.filepath_raw=str(O/(name+'.png'));im.file_format='PNG';im.save();im.pack();im.colorspace_settings.name='Non-Color'
 return im
fabric=normal_image('linen-wool-micro-normal',True);fur=normal_image('short-fur-micro-normal',False)
for m in bpy.data.materials:
 if not m.use_nodes:continue
 image=fabric if any(n in m.name for n in ['wool outer','cape lining','linen underskirt','fine ecru lace']) else fur if 'fur' in m.name else None
 if not image:continue
 t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=image;t.name='Original locally authored microstructure';t.extension='REPEAT'
 n=m.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.23 if image==fabric else .18
 m.node_tree.links.new(t.outputs['Color'],n.inputs['Color']);m.node_tree.links.new(n.outputs['Normal'],m.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 uv=o.data.uv_layers.new(name='Tailored cylindrical UV') if not o.data.uv_layers else o.data.uv_layers.active
 for polygon in o.data.polygons:
  for loop in polygon.loop_indices:
   v=o.data.vertices[o.data.loops[loop].vertex_index].co
   uv.data[loop].uv=(math.atan2(v.y,v.x)/math.tau*3,v.z*4)
 name=o.name.split('.')[0]
 if name in ['eye globe','EyeLeft','EyeRight','vertical pupil','corneal catchlight']:
  o.shape_key_add(name='Basis');key=o.shape_key_add(name='Blink');key.value=0;center=sum(v.co.z for v in o.data.vertices)/len(o.data.vertices)
  for v in key.data:v.co.z=center+(v.co.z-center)*.065
 if name=='continuous pear shaped torso':
  root=o.vertex_groups.new(name='Root')
  for v in o.data.vertices:
   w=max(.05,min(1,(v.co.z-.25)/.35));o.vertex_groups['Breath'].add([v.index],w,'REPLACE');root.add([v.index],1-w,'REPLACE')
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(target))
glb=O/'woodland-companion-v113b.glb';bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_apply=True,export_morph=True)
record=json.loads((O/'sources.json').read_text(encoding='utf8'))
record['revision']='v113b';record['refinement_script']='scripts/refine-v113-woodland-companion.py'
record['integration']='Eight bones, soft torso weights, eight local Blink morphs, named PawLeft/PawRight controls. New procedural normal maps baked to packed local PNG.'
record['files']=[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [target,glb,O/'linen-wool-micro-normal.png',O/'short-fur-micro-normal.png']]
(O/'sources-v113b.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8')
print('B_CANDIDATE_EXPORTED',flush=True)
