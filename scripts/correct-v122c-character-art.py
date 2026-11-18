"""Correct inspected candidate defects, preserve every B source/export."""
import bpy,bmesh,math,sys,json,hashlib
import numpy as np
from mathutils import Vector
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];STUDENT=ROLE=='Student';BUSINESS=ROLE=='Business';REV='v122c';STEM=f'CT_{ROLE}_Explore_{REV}'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Retain '+STEM)
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122b.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122b'];root.name=STEM;rig=root if STUDENT else bpy.data.objects['CT_Humanoid']
# Load shared helpers without executing candidate construction or exports.
helper=(R/'scripts/refine-v122b-character-art.py').read_text();section=helper[helper.index('def neutral():'):helper.index('changes=[]')]
exec(compile(section,__file__,'exec'),globals())
neutral()
def recolor(m,color):
 p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1)
 for node in m.node_tree.nodes:
  if node.type!='TEX_IMAGE' or not node.image or not any(l.to_socket==p.inputs['Base Color'] for l in node.outputs['Color'].links):continue
  im=node.image;w,h=im.size;y,x=np.mgrid[:h,:w];f=.95+.025*np.sin(x*1.8+np.sin(y*.021)*1.4)+.012*np.sin(x*4.7+y*.007)
  srgb=np.where(np.array(color)<=.0031308,np.array(color)*12.92,1.055*np.array(color)**(1/2.4)-.055)
  px=np.ones((h,w,4),np.float32);px[:,:,:3]=srgb[None,None,:]*f[:,:,None];im.pixels.foreach_set(px.ravel());im.pack()

if STUDENT:
 hair=bpy.data.materials['V122b rose satin plait'];recolor(hair,(.43,.155,.25))
 for side,sign in [('L',1),('R',-1)]:
  o=bpy.data.objects['V122b continuous bomber sleeve '+side];groups=[o.vertex_groups.get(f'J_Bip_{side}_{n}') or o.vertex_groups.new(name=f'J_Bip_{side}_{n}') for n in ['UpperArm','LowerArm','Hand']]
  for v in o.data.vertices:
   t=(v.index//48)/80;elbow=max(0,min(1,(t-.45)/.22));elbow=elbow*elbow*(3-2*elbow);hand=max(0,min(1,(t-.88)/.12));hand=hand*hand*(3-2*hand)*.95
   for g,w in zip(groups,[1-elbow,elbow*(1-hand),elbow*hand]):g.add([v.index],w,'REPLACE')
  # Garment occlusion mask removes only covered arm skin; actual palm and
  # all finger topology and weights remain. Original Body retained in B.
 body=bpy.data.objects['Body'];bm=bmesh.new();bm.from_mesh(body.data);layer=bm.verts.layers.deform.active;remove=[]
 for face in bm.faces:
  center=sum((v.co for v in face.verts),Vector())/len(face.verts)
  for side in ['L','R']:
   a=rig.data.bones[f'J_Bip_{side}_UpperArm'].head_local;c=rig.data.bones[f'J_Bip_{side}_Hand'].head_local;axis=(c-a).normalized();along=(center-a).dot(axis);closest=a+axis*along
   arm=[body.vertex_groups[f'J_Bip_{side}_{n}'].index for n in ['UpperArm','LowerArm']]
   covered=all(sum(v[layer].get(i,0) for i in arm)>.25 for v in face.verts)
   if covered and -.035<along<(c-a).length-.004 and (center-closest).length<.09:remove.append(face);break
 bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(body.data);bm.free()
 for sign in [-1,1]:
  def center(t):
   ease=min(1,t/.22);ease=ease*ease*(3-2*ease)
   return Vector((sign*(.106+.057*ease+.009*math.sin(t*math.pi)),-.004-.081*ease,1.515-.414*t))
  swept('V122c soft plait underbody',center,lambda t:.016*(1-.35*t),lambda t:.010*(1-.35*t),hair,'J_Bip_C_Head',100,16)
 changes=['Wrist cuff weights follow palm rotation through a smooth hand transition','Covered arm skin masked to prevent cloth intersections; palms/fingers retained','Correct sRGB fibre colour and closed plait depth']
else:
 hair=bpy.data.materials['V122b chestnut flowing hair'];recolor(hair,(.080,.034,.020) if BUSINESS else (.067,.029,.018))
 # Use the retained, fully fitted scalp as the interpolation surface. Native
 # face meshes are open at the back, making raycast fallback unsuitable.
 scalp=bpy.data.objects['V108k anatomical open hairline'];points=[scalp.matrix_world@v.co for v in scalp.data.vertices];C=112;M=24
 assert len(points)==(C+1)*(M+1)
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render:continue
  if o.name.startswith(('V122b continuous combed','V122b swept','V122b short opposing','V122b tapered temple','V11 swept businessman quiff')):o.hide_render=True
 def point(phi,t,lift=0):
  u=(phi/math.tau)%1*C;v=max(0,min(.99999,t))*M;i=int(u);j=int(v);u-=i;v-=j
  p=points[j*(C+1)+i].lerp(points[j*(C+1)+i+1],u).lerp(points[(j+1)*(C+1)+i].lerp(points[(j+1)*(C+1)+i+1],u),v)
  outward=(p-Vector((0,.005,1.24 if BUSINESS else 1.64))).normalized()
  return p+outward*lift
 # Retained fitted topology, softened comb ridges, complete rear coverage.
 vs=[];fs=[];uv=[]
 for j in range(M+1):
  t=j/M
  for i in range(C+1):
   phi=i/C*math.tau;vs.append(point(phi,t,.001+.0005*math.sin(phi*35+t*6)));uv.append((i/C*5+.12*t,t))
 for j in range(M):
  for i in range(C):a=j*(C+1)+i;fs.append((a,a+1,a+C+2,a+C+1))
 make('V122c fitted combed scalp',vs,fs,hair,'CT_Head',uv)
 # Paths sampled directly on retained cap; no guessed ellipsoid fallback.
 for k in range(5):
  end=-math.pi+.22+k*.29
  def path(t):return point(-.95+(end+.95)*(t*t*(3-2*t)),.12+(.87-.045*k)*t,.005+.011*math.sin(math.pi*t))
  swept('V122c broad flowing sweep '+str(k),path,lambda t:(.019+.0015*math.sin(k))*(.55+.45*math.sin(math.pi*t))*max(.025,(1-t**3)**.7),lambda t:.0035*max(.04,1-t**4),hair,'CT_Head',64,16)
 for k in range(2):
  def path(t):return point(-.9+(1.05+k*.36)*t,.15+.82*t,.004+.008*math.sin(math.pi*t))
  swept('V122c opposite part '+str(k),path,lambda t:.014*max(.03,1-t**3),lambda t:.003*max(.04,1-t**4),hair,'CT_Head',48,12)
 if not BUSINESS:
  for sign in [-1,1]:
   def path(t):return Vector((sign*(.112+.009*math.sin(t*math.pi*1.7)),-.053-.036*math.sin(t*math.pi),1.696-.165*t))
   swept('V122c tapered temple tendril',path,lambda t:.0034*(1-.88*t),lambda t:.0025*(1-.90*t),hair,'CT_Head',48,10)
 changes=['Hair sampled on retained fitted cap, avoiding open-head raycast failures','Removed all remaining old businessman quiffs','Correct sRGB chestnut fibre colour with restrained highlight','Off-centre part and varied fitted front locks; full rear coverage']

neutral();root['v122c_changes']=json.dumps(changes);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')))
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
record=json.loads((OUT/f'CT_{ROLE}_Explore_v122b.sources.json').read_text());record.update(revision=REV,version=REV,status='CANDIDATE_NOT_ACCEPTED',editable_source=STEM+'.blend',parent_revision='v122b',refinements=record.get('refinements',[])+changes,exports=exports,paid_calls=0)
(OUT/(STEM+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V122C_EXPORTED',ROLE,flush=True)
