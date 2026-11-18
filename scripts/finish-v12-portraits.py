"""V12f: restrained adult eye/brow/lip proportions and tucked neck seams."""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate'
role=sys.argv[-1];b=role=='Business';stem=f'CT_{role}_Explore_v12f'
if(OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve '+stem)
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{role}_Explore_v12e.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{role}_Explore_v12e'];root.name=stem;rig=bpy.data.objects['CT_Humanoid'];eye=1.204 if b else 1.588
for o in root.children_recursive:
 if o.type!='MESH'or o.hide_render:continue
 keys=[k.data for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else[o.data.vertices]
 if o.name.startswith('V12e native'):
  brow=o.name.endswith('eyebrows');head=o.name.endswith('head');eyes=o.name.endswith('eyes')or o.name.endswith('eyelashes')
  if not(brow or head or eyes):continue
  for data in keys:
   for v in data:
    p=v.co
    if brow:
     center=eye+(.029 if b else .033)+.004*math.sin(min(1,abs(p.x)/.075)*math.pi)
     p.z=center+(p.z-center)*(.48 if b else .36);p.y+=.002
    else:
     region=math.exp(-((abs(p.x)-(.047 if b else .054))/.038)**4-((p.z-eye)/.038)**4)*max(0,min(1,(-p.y-.055)/.055))
     p.z=eye+(p.z-eye)*(1-.18*region)
     if head:
      mouth=eye-(.105 if b else .09)
      w=math.exp(-(p.x/.047)**4-((p.z-mouth)/.026)**4)*max(0,min(1,(-p.y-.08)/.04))
      p.z=mouth+(p.z-mouth)*(1-.25*w);p.y+=.002*w
      neck=eye-(.145 if b else .133)
      k=max(0,min(1,(neck-p.z)/.075));k=k*k*(3-2*k)
      p.x*=1-.55*k;p.y+=.020*k
  if o.data.shape_keys:
   for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks[0].data):v.co=k.co
   smile=o.data.shape_keys.key_blocks.get('Smile');basis=o.data.shape_keys.key_blocks[0]
   if smile:
    for v,base in zip(smile.data,basis.data):v.co=base.co+(v.co-base.co)*1.35
 if b and o.name=='Shirt front':
  for v in o.data.vertices:
   t=max(0,min(1,(v.co.z-.94)/.115));v.co.x*=1+.35*t
 if b and o.name.startswith('V12e folded shirt collar'):o.hide_render=True
 if b and o.name=='Fitted tailored jacket':
  for v in o.data.vertices:
   t=math.exp(-((v.co.z-.72)/.15)**2);v.co.x*=1-.055*t
# The native neck is tucked inside a shaped continuous poplin stand collar.
if b:
 material=bpy.data.materials['Cream cotton poplin'];vs=[];fs=[];N=64
 for z,rx,ry,cy in [(1.005,.067,.092,-.038),(1.04,.061,.080,-.032),(1.073,.052,.061,-.022)]:
  for i in range(N):
   a=i/N*math.tau;vs.append((rx*math.cos(a),cy+ry*math.sin(a),z))
 for j in range(2):
  for i in range(N):a=j*N+i;c=j*N+(i+1)%N;fs.append((a,c,c+N,a+N))
 d=bpy.data.meshes.new('V12f fitted stand collar');d.from_pydata(vs,[],fs);o=bpy.data.objects.new(d.name,d);bpy.context.scene.collection.objects.link(o);o.parent=rig;d.materials.append(material)
 for f in d.polygons:f.use_smooth=True
 for n in ['CT_Chest','CT_Neck']:o.vertex_groups.new(name=n)
 for v in d.vertices:
  t=max(0,min(1,(v.co.z-1.025)/.05));o.vertex_groups['CT_Neck'].add([v.index],t,'REPLACE');o.vertex_groups['CT_Chest'].add([v.index],1-t,'REPLACE')
 q=o.modifiers.new('Cloth edge','SOLIDIFY');q.thickness=.002;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=q.name)
 q=o.modifiers.new('Real collar skin','ARMATURE');q.object=rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
native=bpy.data.actions.get('CT_BreathAndHands')
for action in list(bpy.data.actions):
 if action!=native:bpy.data.actions.remove(action)
objects=[root,*root.children_recursive]
for o in bpy.context.scene.objects:
 if o.name in bpy.context.view_layer.objects:o.select_set(o in objects and not o.hide_render)
for tier in ['','-portrait','-lite']:
 if tier=='-lite':
  for o in objects:
   if o.type!='MESH'or o.hide_render or o.data.shape_keys or 'anatomical hand'in o.name or len(o.data.polygons)<800:continue
   bpy.context.view_layer.objects.active=o;q=o.modifiers.new('Mobile silhouette budget','DECIMATE');q.ratio=.52;bpy.ops.object.modifier_apply(modifier=q.name)
 bpy.context.view_layer.objects.active=rig;rig.animation_data.action=native
 bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+tier+'.glb')),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=True,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=86 if tier!='-lite'else 74,export_image_webp_fallback=False)
record=json.loads((OUT/f'CT_{role}_Explore_v12e.sources.json').read_text());record.update(revision='v12f',parent_revision='v12e',status='CANDIDATE_NOT_ACCEPTED',refinements=['slimmer native eyebrows with curved arch','restrained eye aperture and lip thickness across all morphs','tucked neck continuity','fitted poplin collar and jacket waist'if b else'original gold and silk costume retained'])
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
print('V12F_EXPORTED',role)
