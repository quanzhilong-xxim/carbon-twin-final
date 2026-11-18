"""Attach fine geometric fibres to reviewed broad groom surfaces.
Keep all previous geometry, licensed bases and original references intact.
"""
import bpy,bmesh,math,sys,json,hashlib
import numpy as np
from mathutils import Vector
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];STUDENT=ROLE=='Student';BUSINESS=ROLE=='Business';BASE='v122d' if STUDENT else 'v122e';REV='v122f';STEM=f'CT_{ROLE}_Explore_{REV}'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Retain '+STEM)
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_{BASE}.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_{BASE}'];root.name=STEM;rig=root if STUDENT else bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
hair=bpy.data.materials['V122b rose satin plait' if STUDENT else 'V122b chestnut flowing hair']
if STUDENT:
 n=256;y,x=np.mgrid[:n,:n];f=.5+.18*np.sin(x*2.1+np.sin(y*.025))+.08*np.sin(x*4.7);dx=np.roll(f,1,1)-np.roll(f,-1,1)
 px=np.stack((.5+dx*.14,np.full_like(dx,.5),np.ones_like(dx),np.ones_like(dx)),2).astype(np.float32)
 im=bpy.data.images.new('V122f rose directional normal',width=n,height=n,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(px.ravel());im.pack()
 tx=hair.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;nm=hair.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.20;hair.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);hair.node_tree.links.new(nm.outputs['Normal'],hair.node_tree.nodes['Principled BSDF'].inputs['Normal'])
light=mat('V122f subtle hair highlight',(.53,.235,.35) if STUDENT else (.125,.058,.033),.68,.19)
dark=mat('V122f subtle hair lowlight',(.31,.089,.16) if STUDENT else (.044,.017,.009),.70,.17)
vs=[];fs=[];uv=[];material_indices=[]
def fibre(points,radius,lightness):
 start=len(vs);C=5
 for j,p in enumerate(points):
  tangent=(points[min(len(points)-1,j+1)]-points[max(0,j-1)]).normalized();side=tangent.cross(Vector((0,-1,0))).normalized()
  if side.length<.5:side=tangent.cross(Vector((1,0,0))).normalized()
  normal=side.cross(tangent).normalized();t=j/(len(points)-1);r=radius*max(.15,math.sin(math.pi*t)**.28)
  for k in range(C):a=k/C*math.tau;vs.append(p+(side*math.cos(a)+normal*math.sin(a))*r);uv.append((k/C,t))
 for j in range(len(points)-1):
  for k in range(C):a=start+j*C+k;b=start+j*C+(k+1)%C;fs.append((a,b,b+C,a+C));material_indices.append(lightness)
for o in list(root.children_recursive):
 if o.type!='MESH' or o.hide_render:continue
 if not STUDENT and o.name.startswith('V122e opposite natural wave'):
  o.hide_render=True;continue
 if STUDENT and o.name.startswith('V122b interlaced rose plait'):
  C=12;M=120;lanes=range(1,12,2);radius=.00012
 elif not STUDENT and o.name.startswith('V122e flowing broad side sweep'):
  C=20;M=80;lanes=range(1,10);radius=.00013
 else:continue
 for k in lanes:
  points=[o.data.vertices[j*C+k].co.copy()+o.data.vertices[j*C+k].normal*.00016 for j in range(5,M-3)]
  fibre(points,radius,0 if k%3 else 1)
if not STUDENT:
 shell=bpy.data.objects['V122e closed measured groom shell'];C=193;M=64
 for i in range(0,192,3):
  points=[shell.data.vertices[j*C+i].co.copy()+shell.data.vertices[j*C+i].normal*.00017 for j in range(3,M)]
  fibre(points,.00011,0 if i%4 else 1)
mesh=make('V122f scalp-attached individual fibres',vs,fs,light,'J_Bip_C_Head' if STUDENT else 'CT_Head',uv);mesh.data.materials.append(dark)
for f,i in zip(mesh.data.polygons,material_indices):f.material_index=i
changes=['Fine tapered geometric fibres attached to actual broad groom surfaces','Restrained tangent-space strand response','Removed detached opposing-side loops' if not STUDENT else 'Retained repaired wrist occlusion, inner cuff and all real finger weights']
neutral();root['v122f_changes']=json.dumps(changes);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')))
if STUDENT:
 keep={'Basis','Fcl_EYE_Close','Fcl_MTH_Joy','Fcl_BRW_Joy','Fcl_EYE_Joy','Fcl_BRW_Fun','Fcl_EYE_Surprised'}
 for o in root.children_recursive:
  if o.type=='MESH' and o.data.shape_keys:
   for key in list(o.data.shape_keys.key_blocks)[::-1]:
    if key.name.rsplit('.',1)[-1] not in keep:o.shape_key_remove(key)
native=bpy.data.actions.get('CT_BreathAndHands')
if not STUDENT:
 for a in list(bpy.data.actions):
  if a!=native:bpy.data.actions.remove(a)
objects=[root,*root.children_recursive]
for o in bpy.context.scene.objects:
 if o.name in bpy.context.view_layer.objects:o.select_set(o in objects and not o.hide_render)
exports=[]
for tier in ['','-portrait','-lite']:
 neutral()
 if tier=='-lite':
  for o in objects:
   if o.type!='MESH' or o.hide_render or o.data.shape_keys or 'anatomical hand' in o.name or o.name=='Body' or len(o.data.polygons)<800:continue
   bpy.context.view_layer.objects.active=o;q=o.modifiers.new('Mobile silhouette budget','DECIMATE');q.ratio=.55;bpy.ops.object.modifier_apply(modifier=q.name)
 bpy.context.view_layer.objects.active=rig
 if native and not STUDENT:rig.animation_data.action=native
 p=OUT/(STEM+tier+'.glb');bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_apply=False,export_animations=not STUDENT,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=True,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=86 if tier!='-lite' else 74,export_image_webp_fallback=False)
 exports.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
record=json.loads((OUT/f'CT_{ROLE}_Explore_{BASE}.sources.json').read_text());record.update(revision=REV,version=REV,status='CANDIDATE_NOT_ACCEPTED',editable_source=STEM+'.blend',parent_revision=BASE,refinements=record.get('refinements',[])+changes,exports=exports,paid_calls=0)
(OUT/(STEM+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V122F_EXPORTED',ROLE,flush=True)
