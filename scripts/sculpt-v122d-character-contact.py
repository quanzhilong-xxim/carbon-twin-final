"""Fit groom directly to neutral native skull and finish concealed skin mask."""
import bpy,bmesh,math,sys,json,hashlib
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];STUDENT=ROLE=='Student';BUSINESS=ROLE=='Business';REV='v122d';STEM=f'CT_{ROLE}_Explore_{REV}'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Retain '+STEM)
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122c.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122c'];root.name=STEM;rig=root if STUDENT else bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
changes=[]
if STUDENT:
 body=bpy.data.objects['Body'];bm=bmesh.new();bm.from_mesh(body.data);layer=bm.verts.layers.deform.active;remove=[]
 for face in bm.faces:
  center=sum((v.co for v in face.verts),Vector())/len(face.verts)
  for side in ['L','R']:
   a=rig.data.bones[f'J_Bip_{side}_UpperArm'].head_local;c=rig.data.bones[f'J_Bip_{side}_Hand'].head_local;axis=(c-a).normalized();along=(center-a).dot(axis);closest=a+axis*along
   groups=[body.vertex_groups[f'J_Bip_{side}_{n}'].index for n in ['UpperArm','LowerArm','Hand']]
   covered=any(sum(v[layer].get(i,0) for i in groups)>.05 for v in face.verts)
   if covered and -.035<along<(c-a).length+.012 and (center-closest).length<.09:remove.append(face);break
 bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(body.data);bm.free()
 # Add a folded inner hem to the same sleeve, not a disconnected bracelet.
 for side in ['L','R']:
  o=bpy.data.objects['V122b continuous bomber sleeve '+side];N=48;M=80
  outer=[o.data.vertices[M*N+i].co.copy() for i in range(N)];center=sum(outer,Vector())/N
  tangent=(rig.data.bones[f'J_Bip_{side}_Hand'].head_local-rig.data.bones[f'J_Bip_{side}_LowerArm'].head_local).normalized()
  vs=outer+[center+(p-center)*.87-tangent*.005 for p in outer];fs=[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
  hem=make('V122d folded cuff hem '+side,vs,fs,bpy.data.materials['V122b soft plum rib knit'])
  for name,w in [('LowerArm',.05),('Hand',.95)]:g=hem.vertex_groups.new(name=f'J_Bip_{side}_{name}');g.add(list(range(len(vs))),w,'REPLACE')
  q=hem.modifiers.new('Wrist skin','ARMATURE');q.object=rig
 changes=['Complete covered-wrist skin mask without removing actual fingers','Folded inward cuff hem follows the real hand bone']
else:
 eye=1.204 if BUSINESS else 1.588;head=bpy.data.objects['V12e native head']
 # Slightly relaxed lids preserve every independent native expression.
 for suffix in ['head','eyes','eyelashes']:
  o=bpy.data.objects.get('V12e native '+suffix)
  if not o or not o.data.shape_keys:continue
  keys=o.data.shape_keys.key_blocks;basis=keys[0];left=keys.get('BlinkLeft');right=keys.get('BlinkRight')
  if left and right:
   offsets=[((a.co-b.co)+(c.co-b.co))*(.14 if BUSINESS else .07) for a,b,c in zip(left.data,basis.data,right.data)]
   for key in keys:
    for v,d in zip(key.data,offsets):v.co+=d
   for v,k in zip(o.data.vertices,basis.data):v.co=k.co
 hair=bpy.data.materials['V122b chestnut flowing hair']
 for o in root.children_recursive:
  if o.type=='MESH' and not o.hide_render and o.name.startswith(('V122c fitted','V122c broad','V122c opposite','V122c tapered')):o.hide_render=True
 # Native skull subset with a clipped organic hairline. This avoids both
 # the open-head radial misses and the mismatched older scalp interpolation.
 head.data.update();pts=[v.co.copy() for v in head.data.vertices];normals=[v.normal.copy() for v in head.data.vertices]
 tree=BVHTree.FromPolygons(pts,[tuple(f.vertices) for f in head.data.polygons]);center=Vector((0,-.05,eye+.045))
 def hairline(p):
  front=max(0,min(1,(-p.y-.055)/.075));back=max(0,min(1,(p.y+.035)/.065));temple=max(0,min(1,(abs(p.x)-.065)/.045))
  return eye+.058+.032*front-.105*back-.018*temple+.006*math.sin(p.x*32+.5)
 def outward(p,n):return n if n.dot(p-center)>0 else -n
 vs=[];fs=[];uv=[]
 for face in head.data.polygons:
  poly=[(pts[i],outward(pts[i],normals[i])) for i in face.vertices];clipped=[]
  for (a,na),(b,nb) in zip(poly,poly[1:]+poly[:1]):
   fa=a.z-hairline(a);fb=b.z-hairline(b)
   if fa>=0:clipped.append((a,na))
   if (fa>=0)!=(fb>=0):t=fa/(fa-fb);clipped.append((a.lerp(b,t),na.lerp(nb,t).normalized()))
  if len(clipped)<3:continue
  indices=[]
  for p,n in clipped:
   lift=.006+.005*max(0,min(1,(p.z-eye-.06)/.08));p=p+n*lift;indices.append(len(vs));vs.append(p);uv.append((p.x*5+p.y*2,p.z*5))
  fs.append(tuple(indices))
 cap=make('V122d continuous native skull hair',vs,fs,hair,'CT_Head',uv)
 bm=bmesh.new();bm.from_mesh(cap.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(cap.data);bm.free()
 # Broad curved locks with their transverse direction tangent to the skull.
 # Nearest-surface fitting has no guessed fallback radius.
 def bezier(a,b,c,d,t):return a*(1-t)**3+b*3*(1-t)**2*t+c*3*(1-t)*t*t+d*t**3
 def lock(name,controls,width):
  controls=[Vector(p) for p in controls];N=72;C=20;vs=[];fs=[];uv=[]
  def point(t):
   p=bezier(*controls,t);hit,n,_,_=tree.find_nearest(p);n=outward(hit,n)
   return hit+n*(.008+.017*math.sin(math.pi*t)**.7),n
  for j in range(N+1):
   t=j/N;c,n=point(t);before,_=point(max(0,t-.001));after,_=point(min(1,t+.001));tangent=(after-before).normalized();side=tangent.cross(n).normalized();n=side.cross(tangent).normalized()
   w=width*(.55+.45*math.sin(math.pi*t))*max(.02,(1-t**4)**.7);depth=.0038*max(.03,1-t**5)
   for k in range(C):
    a=k/C*math.tau;ridge=.0003*math.cos(k/C*math.tau*7)*math.sin(math.pi*t)
    vs.append(c+side*math.cos(a)*w+n*math.sin(a)*(depth+ridge));uv.append((k/C,t))
  for j in range(N):
   for k in range(C):a=j*C+k;b=j*C+(k+1)%C;fs.append((a,b,b+C,a+C))
  fs.extend([tuple(reversed(range(C))),tuple(N*C+k for k in range(C))]);make(name,vs,fs,hair,'CT_Head',uv)
 for k in range(6):
  shift=k*.007
  lock('V122d individual side sweep '+str(k),[(.037,-.045+shift,eye+.116),(-.015,-.087+shift,eye+.137),(-.085,-.142+shift,eye+.106-k*.005),(-.111,-.070+shift,eye+.026+k*.006)],.019-k*.0014)
 for k in range(3):
  lock('V122d short parted wave '+str(k),[(.038,-.040+k*.012,eye+.117),(.080,-.070+k*.010,eye+.126),(.108,-.080+k*.013,eye+.09),(.109,-.010+k*.012,eye+.008)],.014-k*.001)
 # Existing low bun and gold botanical pin remain from the reference outfit.
 if not BUSINESS:
  for sign in [-1,1]:
   def p(t):return Vector((sign*(.108+.009*math.sin(t*math.pi*1.5)),-.062-.03*math.sin(t*math.pi),eye+.091-.148*t))
   swept('V122d soft cheek tendril',p,lambda t:.0038*(1-.90*t),lambda t:.0025*(1-.90*t),hair,'CT_Head',48,12)
 changes=['Native skull-clipped continuous scalp with no guessed cap dimensions','Skull-tangent curved side part with varied full-volume locks','Reduced adult eye aperture using original blink deltas','Retained all expressions, real body/finger skin and natural actions']

neutral();root['v122d_changes']=json.dumps(changes);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')))
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
record=json.loads((OUT/f'CT_{ROLE}_Explore_v122c.sources.json').read_text());record.update(revision=REV,version=REV,status='CANDIDATE_NOT_ACCEPTED',editable_source=STEM+'.blend',parent_revision='v122c',refinements=record.get('refinements',[])+changes,exports=exports,paid_calls=0)
(OUT/(STEM+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V122D_EXPORTED',ROLE,flush=True)
