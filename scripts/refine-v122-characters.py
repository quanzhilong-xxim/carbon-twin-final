"""Reference-directed candidates, never modifies retained source versions.
Snow/Rain retained donor geometry: Blender Foundation CC BY 4.0.
Student retained base: pixiv VRM Public License 1.0. No paid API calls.
"""
import bpy,math,json,sys,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate'
role=sys.argv[-1];student=role=='Student';business=role=='Business';rev='v122a';stem=f'CT_{role}_Explore_{rev}'
if (OUT/(stem+'.blend')).exists():raise RuntimeError('Candidate already exists: '+stem)
parent_rev='v12a' if student else 'v12g'
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{role}_Explore_{parent_rev}.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{role}_Explore_{parent_rev}'];root.name=stem
rig=root if root.type=='ARMATURE' else next(o for o in root.children_recursive if o.type=='ARMATURE' and (student or o.name=='CT_Humanoid'))
def material(name,color,rough=.6,spec=.25):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=spec;return m
def bind(o,bone):
 o.parent=rig;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_world=Matrix.Identity(4)
 g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');q=o.modifiers.new('Reference art real skin','ARMATURE');q.object=rig
def mesh(name,vs,fs,mat,bone):
 d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.materials.append(mat);o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o)
 for f in d.polygons:f.use_smooth=True
 bind(o,bone);return o
def uv_project(o,scale=6):
 uv=o.data.uv_layers.active or o.data.uv_layers.new(name='Fabric UV')
 for loop in o.data.loops:
  p=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(p.x*scale,p.z*scale)
def apply_skin_satin():
 for m in bpy.data.materials:
  if not m.use_nodes:continue
  p=m.node_tree.nodes.get('Principled BSDF')
  if not p:continue
  if 'native continuous skin' in m.name or '00_SKIN' in m.name:
   p.inputs['Roughness'].default_value=.53;p.inputs['Specular IOR Level'].default_value=.23;p.inputs['Subsurface Weight'].default_value=.035
apply_skin_satin()
changes=[]
if not student:
 # Use the original sculpted, anatomy-fitted hairstyle rather than repeated
 # identical conical locks. All old grooms remain in the source, hidden.
 for o in root.children_recursive:
  if o.type=='MESH' and not o.hide_render and any(k in o.name.lower() for k in ['groom','fringe','hairline','scalp attached individual fibre']):o.hide_render=True
 eye=1.204 if business else 1.588;source_eye=1.6225334 if business else 1.4733431;s=.80 if business else .96
 align=Matrix.Translation((0,-.014 if business else -.009,eye))@Matrix.Diagonal((s,s,s,1))@Matrix.Translation((0,0,-source_eye))
 hair=material('V122 chestnut satin hair',(.065,.026,.014),.55,.28)
 # Texture lanes use retained native UVs. Broad highlight response remains
 # restrained; real geometry owns the main strand volume and silhouette.
 n=512;yy,xx=np.mgrid[:n,:n];v=.86+.08*np.sin(xx*.76+np.sin(yy*.031)*2)+.035*np.sin(xx*2.31+yy*.012)
 px=np.ones((n,n,4),np.float32);px[:,:,:3]=v[:,:,None]*np.array([.28,.15,.085]);im=bpy.data.images.new('V122 directionally varied chestnut fibres',width=n,height=n,alpha=True);im.pixels.foreach_set(px.ravel());im.pack()
 tex=hair.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;hair.node_tree.links.new(tex.outputs['Color'],hair.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
 names=['GEO-snow_hair_base'] if business else ['GEO-rain_hair_main','GEO-rain_hair_strand']
 for name in names:
  source=bpy.data.objects[name];bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();data=bpy.data.meshes.new_from_object(source.evaluated_get(dg),depsgraph=dg);data.transform(align@source.matrix_world)
  if business:
   for v in data.vertices:
    if v.co.z>eye+.09:v.co.z=eye+.09+(v.co.z-eye-.09)*.68
  obj=bpy.data.objects.new('V122 native sculpted '+name,data);bpy.context.scene.collection.objects.link(obj);data.materials.clear();data.materials.append(hair)
  for f in data.polygons:f.use_smooth=True;f.material_index=0
  bind(obj,'CT_Head')
 # Taper the existing fitted eyebrow ribbons. Preserve every expression.
 brow=bpy.data.objects.get('V12e native eyebrows')
 if brow and brow.data.shape_keys:
  for key in brow.data.shape_keys.key_blocks:
   for side in [-1,1]:
    points=[v for v in key.data if v.co.x*side>0];middle=sum(v.co.z for v in points)/len(points)
    for v in points:
     t=min(1,abs(v.co.x)/(.095 if business else .10));v.co.z=middle+(v.co.z-middle)*(.72-.32*t)+.002*math.sin(t*math.pi)
  for v,k in zip(brow.data.vertices,brow.data.shape_keys.key_blocks[0].data):v.co=k.co
 # Keep a very small relaxed upper-eyelid closure as model geometry, not a
 # permanently changing blink timer. All morphs remain valid and independent.
 for suffix in ['head','eyes','eyelashes']:
  o=bpy.data.objects.get('V12e native '+suffix)
  if not o or not o.data.shape_keys:continue
  basis=o.data.shape_keys.key_blocks[0];left=o.data.shape_keys.key_blocks.get('BlinkLeft');right=o.data.shape_keys.key_blocks.get('BlinkRight')
  if left and right:
   offsets=[((a.co-b.co)+(c.co-b.co))*(.12 if business else .055) for a,b,c in zip(left.data,basis.data,right.data)]
   for key in o.data.shape_keys.key_blocks:
    for v,delta in zip(key.data,offsets):v.co+=delta
   for v,k in zip(o.data.vertices,basis.data):v.co=k.co
 if business:
  for o in root.children_recursive:
   if o.type=='MESH' and not o.hide_render and ('poplin' in o.name.lower() or 'collar' in o.name.lower()):uv_project(o)
  # Cloth collar points receive a rounded stitched edge and proper UVs.
  for o in root.children_recursive:
   if not o.name.startswith('V12g folded collar point') or o.type!='MESH':continue
   q=o.modifiers.new('Soft folded cotton edge','BEVEL');q.width=.0013;q.segments=3;bpy.context.view_layer.objects.active=o
   bpy.ops.object.modifier_apply(modifier=q.name);uv_project(o)
  changes+=['Native sculpted side-part hair replaces 18 repeated fringe wedges','Relaxed eye aperture and tapered expression-compatible eyebrows','Poplin collar UVs and softened folded edges']
 else:changes+=['Native swept hair topology follows actual forehead and temples','Original low bun and gold botanical hairpin retained','Expression-compatible tapered brows and relaxed eye aperture']
else:
 # Rebuild the jacket's sleeves as continuous cloth between the measured
 # upper-arm, elbow and wrist pivots. The old shell had only two abrupt skin
 # groups and exposed sharp skin slivers when the writing IK bent the wrist.
 old_sleeve=bpy.data.objects['V3 rounded sleeve shoulder'];cloth=old_sleeve.data.materials[0]
 cuffmat=material('V122 plum rib knit cuff',(.24,.105,.33),.84,.18)
 for o in root.children_recursive:
  if o.name.startswith(('V3 rounded sleeve shoulder','V3 fitted cuff')):o.hide_render=True
 for side in ['L','R']:
  a=rig.matrix_world@rig.pose.bones[f'J_Bip_{side}_UpperArm'].head;b=rig.matrix_world@rig.pose.bones[f'J_Bip_{side}_LowerArm'].head;c=rig.matrix_world@rig.pose.bones[f'J_Bip_{side}_Hand'].head
  start=a-(b-a).normalized()*.018;finish=c+(c-b).normalized()*.018
  vs=[];fs=[];row_count=57;cols=40
  for j in range(row_count):
   t=j/(row_count-1)
   center=start.lerp(b,t*2) if t<.5 else b.lerp(finish,(t-.5)*2)
   tangent=((b-start) if t<.5 else (finish-b)).normalized();front=Vector((0,-1,0));lateral=tangent.cross(front).normalized()
   r=.043+.025*math.sin(math.pi*min(1,t/.75))-.011*t
   if t>.84:r=.032+(.042-.032)*max(0,(1-t)/.16)
   fold=(.0018*math.sin(t*math.pi*17)+.0010*math.sin(t*math.pi*29))*math.sin(math.pi*t)**2
   for i in range(cols):
    angle=i/cols*math.tau;rib=.0007*math.cos(angle*20) if t>.91 else 0
    p=center+(front*math.cos(angle)+lateral*math.sin(angle))*(r+fold+rib);vs.append(tuple(p))
  for j in range(row_count-1):
   for i in range(cols):n=j*cols+i;q=j*cols+(i+1)%cols;fs.append((n,q,q+cols,n+cols))
  d=bpy.data.meshes.new('V122 continuous bomber sleeve '+side);d.from_pydata(vs,[],fs);d.materials.append(cloth);d.materials.append(cuffmat);o=bpy.data.objects.new(d.name,d);bpy.context.scene.collection.objects.link(o);o.parent=rig
  for f in d.polygons:f.use_smooth=True;f.material_index=1 if f.index//cols>51 else 0
  names=[f'J_Bip_{side}_UpperArm',f'J_Bip_{side}_LowerArm',f'J_Bip_{side}_Hand'];groups=[o.vertex_groups.new(name=n) for n in names]
  for v in d.vertices:
   t=(v.index//cols)/(row_count-1);blend=max(0,min(1,(t-.37)/.26));blend=blend*blend*(3-2*blend);hand=max(0,min(.35,(t-.96)/.04*.35))
   for group,w in zip(groups,[1-blend,blend*(1-hand),blend*hand]):
    if w>0:group.add([v.index],w,'REPLACE')
  q=o.modifiers.new('Continuous humanoid cloth weights','ARMATURE');q.object=rig
  uv=d.uv_layers.new(name='Continuous sleeve weave')
  for loop in d.loops:
   index=loop.vertex_index;uv.data[loop.index].uv=((index%cols)/cols*2,(index//cols)/(row_count-1)*4)
 # Remove accumulated bright helix outlines, retaining the six broad plait
 # meshes and their actual Head weights. Build directional surface fibres.
 for o in root.children_recursive:
  if o.name.startswith(('V11e rose plait surface fibre','V12 student soft plait filament')):o.hide_render=True
 hair=bpy.data.materials['V108d rose silk braided hair'];p=hair.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.39,.078,.145,1);p.inputs['Roughness'].default_value=.62;p.inputs['Specular IOR Level'].default_value=.23;p.inputs['Sheen Weight'].default_value=.035;p.inputs['Sheen Tint'].default_value=(.36,.07,.15,1)
 n=512;yy,xx=np.mgrid[:n,:n];f=.94+.035*np.sin(xx*1.4+np.sin(yy*.03)*2)+.02*np.sin(xx*3.1)
 px=np.ones((n,n,4),np.float32);px[:,:,:3]=f[:,:,None]*np.array([.64,.29,.40]);im=bpy.data.images.new('V122 rose plait directional fibre',width=n,height=n,alpha=True);im.pixels.foreach_set(px.ravel());im.pack();tex=hair.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;hair.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
 for o in root.children_recursive:
  if o.type=='MESH' and o.name.startswith('V11e loose rose plait section'):
   uv=o.data.uv_layers.active or o.data.uv_layers.new()
   for loop in o.data.loops:
    v=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(v.x*14+v.y*7,v.z*2)
 # A fine stable woven response on the retained purple jacket. This does not
 # change the silhouette or the original body/finger skin weights.
 for m in bpy.data.materials:
  if not m.use_nodes or not any(x in m.name.lower() for x in ['woven jacket','plum woven']):continue
  p=m.node_tree.nodes.get('Principled BSDF')
  if p:p.inputs['Roughness'].default_value=.79;p.inputs['Specular IOR Level'].default_value=.18;p.inputs['Sheen Weight'].default_value=.04
 changes+=['Continuous full-volume bomber sleeves from measured arm, elbow and wrist pivots','Soft joint skin transitions and integrated rib-knit cuffs','Rose plaits retain real volume with quieter directional fibres','Removed accumulated shiny helix outlines','Matte woven bomber and restrained skin response']
# Give every visible textured mesh valid UVs. Previous new collar panels
# exported texCoord=-1, leaving undefined texture coordinates in glTF.
for o in root.children_recursive:
 if o.type=='MESH' and not o.hide_render and not o.data.uv_layers and any(m and m.use_nodes and any(n.type=='TEX_IMAGE' for n in m.node_tree.nodes) for m in o.data.materials):uv_project(o)
root['v122_changes']=json.dumps(changes);root['v122_reference']='074' if student else '078' if business else '080'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
native=bpy.data.actions.get('CT_BreathAndHands')
if not student:
 for a in list(bpy.data.actions):
  if a!=native:bpy.data.actions.remove(a)
objects=[root,*root.children_recursive]
for o in bpy.context.scene.objects:
 if o.name in bpy.context.view_layer.objects:o.select_set(o in objects and not o.hide_render)
exports=[]
for tier in ['','-portrait','-lite']:
 if tier=='-lite':
  for o in objects:
   if o.type!='MESH' or o.hide_render or o.data.shape_keys or 'anatomical hand' in o.name or len(o.data.polygons)<800:continue
   bpy.context.view_layer.objects.active=o;q=o.modifiers.new('Mobile topology budget','DECIMATE');q.ratio=.52
   bpy.ops.object.modifier_apply(modifier=q.name)
 bpy.context.view_layer.objects.active=rig
 if native and not student:rig.animation_data.action=native
 dest=OUT/(stem+tier+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_apply=False,export_animations=not student,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=True,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=86 if tier!='-lite' else 74,export_image_webp_fallback=False)
 exports.append({'file':dest.name,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
record=json.loads((OUT/f"CT_{role}_Explore_{'v12b' if student else 'v12g'}.sources.json").read_text())
record.update(revision=rev,status='CANDIDATE_NOT_ACCEPTED',parent_revision='v12b' if student else 'v12g',refinements=changes,exports=exports,paid_calls=0)
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
print('V122_EXPORTED',role,flush=True)
