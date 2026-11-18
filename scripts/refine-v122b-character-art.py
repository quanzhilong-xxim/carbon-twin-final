"""Reference-led local candidates. Retain all previous sources and exports.
The full source keeps every expression; the web export keeps those in use.
No remote generator or paid service is called.
"""
import bpy, bmesh, math, json, sys, hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/characters-v12-candidate'
ROLE=sys.argv[-1]; STUDENT=ROLE=='Student'; BUSINESS=ROLE=='Business'
REV='v122b'; STEM=f'CT_{ROLE}_Explore_{REV}'
BASE='v12a' if STUDENT else 'v12g'
if any(OUT.glob(STEM+'*')): raise RuntimeError('Retain existing candidate '+STEM)
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_{BASE}.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_{BASE}'];root.name=STEM
rig=root if STUDENT else bpy.data.objects['CT_Humanoid']

def neutral():
 for o in [root,*root.children_recursive]:
  if o.type=='MESH' and o.data.shape_keys:
   for key in o.data.shape_keys.key_blocks:key.value=0
 bpy.context.view_layer.update()
neutral()

def mat(name,color,rough=.65,spec=.24):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF']
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=spec
 return m

def make(name,vs,fs,material,bone=None,uvs=None):
 d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.materials.append(material)
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
 o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);o.parent=rig
 for f in d.polygons:f.use_smooth=True
 uv=d.uv_layers.new(name='Surface flow')
 for loop in d.loops:
  v=d.vertices[loop.vertex_index].co;uv.data[loop.index].uv=uvs[loop.vertex_index] if uvs else (v.x*5,v.z*5)
 if bone:
  g=o.vertex_groups.new(name=bone);g.add(list(range(len(d.vertices))),1,'REPLACE')
  q=o.modifiers.new('Real humanoid skin','ARMATURE');q.object=rig
 return o

def flow_material(name,color):
 m=mat(name,color,.63,.23);n=512;y,x=np.mgrid[:n,:n]
 f=.94+.035*np.sin(x*1.8+np.sin(y*.021)*1.4)+.018*np.sin(x*4.7+y*.007)
 p=np.ones((n,n,4),np.float32);p[:,:,:3]=np.array(color)[None,None,:]*f[:,:,None]
 # Blender image pixels are linear; the texture replaces a linear factor.
 im=bpy.data.images.new(name+' direction colour',width=n,height=n,alpha=True);im.pixels.foreach_set(p.ravel());im.pack()
 t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;m.node_tree.links.new(t.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
 return m

def swept(name,point,width,depth,material,bone,nr=72,nc=16):
 vs=[];fs=[];uv=[]
 for j in range(nr+1):
  t=j/nr;c=point(t);tangent=(point(min(1,t+.001))-point(max(0,t-.001))).normalized()
  front=Vector((0,-1,0));side=tangent.cross(front).normalized();normal=side.cross(tangent).normalized()
  for k in range(nc):
   a=k/nc*math.tau;vs.append(c+side*math.cos(a)*width(t)+normal*math.sin(a)*depth(t));uv.append((k/nc,t))
 for j in range(nr):
  for k in range(nc):a=j*nc+k;b=j*nc+(k+1)%nc;fs.append((a,b,b+nc,a+nc))
 fs.extend([tuple(reversed(range(nc))),tuple(nr*nc+k for k in range(nc))])
 return make(name,vs,fs,material,bone,uv)

changes=[]
if STUDENT:
 cloth=bpy.data.objects['V3 rounded sleeve shoulder'].data.materials[0]
 cuff=mat('V122b soft plum rib knit',(.24,.105,.33),.83,.18)
 for o in root.children_recursive:
  if o.name.startswith(('V3 rounded sleeve shoulder','V3 fitted cuff','V11e loose rose plait section','V11e rose plait surface fibre','V12 student soft plait filament')):o.hide_render=True
 # Closed shoulder domes overlap the jacket, avoiding the exposed shoulder
 # gaps of the earlier open cylindrical candidate. Use rest joint HEADS.
 for side,sign in [('L',1),('R',-1)]:
  a=rig.data.bones[f'J_Bip_{side}_UpperArm'].head_local.copy()
  b=rig.data.bones[f'J_Bip_{side}_LowerArm'].head_local.copy()
  c=rig.data.bones[f'J_Bip_{side}_Hand'].head_local.copy()
  direction=(c-b).normalized();start=a+Vector((-sign*.028,0,.028));finish=c+direction*.014
  vs=[];fs=[];uv=[];N=48;M=80
  for j in range(M+1):
   t=j/M
   if t<.16:
    u=t/.16;center=start.lerp(a,u);radius=.004+.061*math.sin(u*math.pi/2)
   elif t<.56:
    u=(t-.16)/.40;center=a.lerp(b,u);radius=.065-.010*u
   else:
    u=(t-.56)/.44;center=b.lerp(finish,u);radius=.055-.026*u
   tangent=(b-a if t<.56 else finish-b).normalized();front=Vector((0,-1,0));lateral=tangent.cross(front).normalized()
   cuff_zone=t>.91
   if cuff_zone:radius=.0295+.0006*math.sin(t*math.pi*32)
   fold=(.0015*math.sin(t*math.pi*21)+.0007*math.sin(t*math.pi*35))*math.exp(-((t-.61)/.2)**2)
   for k in range(N):
    ang=k/N*math.tau;r=radius+fold*(.5+.5*math.sin(ang)**2)+(.00045*math.cos(ang*24) if cuff_zone else 0)
    vs.append(center+(front*math.cos(ang)+lateral*math.sin(ang))*r);uv.append((k/N*2,t*4))
  for j in range(M):
   for k in range(N):p=j*N+k;q=j*N+(k+1)%N;fs.append((p,q,q+N,p+N))
  fs.append(tuple(reversed(range(N))))
  o=make('V122b continuous bomber sleeve '+side,vs,fs,cloth,None,uv);o.data.materials.append(cuff)
  for f in o.data.polygons:f.material_index=1 if f.index//N>=73 else 0
  groups=[o.vertex_groups.new(name=f'J_Bip_{side}_{n}') for n in ['UpperArm','LowerArm']]
  for v in o.data.vertices:
   t=(v.index//N)/M;w=max(0,min(1,(t-.45)/.22));w=w*w*(3-2*w)
   for g,x in zip(groups,[1-w,w]):
    if x:g.add([v.index],x,'REPLACE')
  q=o.modifiers.new('Continuous elbow skin','ARMATURE');q.object=rig
 # A true over-under plait: three flattened locks alternate depth twice per
 # lateral cycle, rather than following three identical corkscrew helices.
 pink=flow_material('V122b rose satin plait',(.40,.105,.19))
 for sign in [-1,1]:
  for strand in range(3):
   phase=strand*math.tau/3
   def point(t):
    ease=min(1,t/.22);ease=ease*ease*(3-2*ease);a=t*math.tau*3.0+phase
    taper=1-.30*t
    return Vector((sign*(.106+.057*ease+.009*math.sin(t*math.pi))+.021*taper*math.sin(a),-.004-.081*ease+.010*taper*math.cos(2*a),1.515-.414*t))
   swept('V122b interlaced rose plait',point,lambda t:.012*(1-.25*t),lambda t:.008*(1-.25*t),pink,'J_Bip_C_Head',120,12)
 changes=['Neutral expression defaults for every source and tier','Closed shoulder cap and continuous elbow-weighted bomber sleeves','Integrated knit cuffs with measured wrist overlap','Three-strand over-under rose plaits; removed bright helical fibre outlines','Six runtime facial morphs in web export; full source morphs retained']
else:
 eye=1.204 if BUSINESS else 1.588
 head=bpy.data.objects['V12e native head'];center=Vector((0,-.005,eye+.045))
 tree=BVHTree.FromPolygons([head.matrix_world@v.co for v in head.data.vertices],[tuple(f.vertices) for f in head.data.polygons])
 # Hide all obsolete scalp/fringe/tendrils, retaining the separately authored
 # low bun, hairpin and facial brows. This prevents residual forehead strips.
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render:continue
  if any(k in o.name.lower() for k in ['groom','fringe','hairline','crown-to-nape','tapered flyaway','soft temple curl','individual fibre']):o.hide_render=True
 hair=flow_material('V122b chestnut flowing hair',(.075,.033,.019) if BUSINESS else (.067,.029,.018))
 def radial(phi,theta,lift=0):
  d=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)))
  hit,normal,_,_=tree.ray_cast(center,d,.6)
  if hit is None:hit=center+Vector((d.x*.115,d.y*.13,d.z*.13))
  return hit+d*lift
 # One continuous combed scalp gives a complete silhouette in every view.
 # The wavy edge rises over the off-centre part; ridges are submillimetric.
 C=192;M=56;vs=[];fs=[];uv=[]
 for j in range(M+1):
  t=j/M
  for i in range(C+1):
   phi=i/C*math.tau;front=max(0,-math.sin(phi));back=max(0,math.sin(phi))
   edge=1.68+.32*back-.52*front+.075*math.sin(phi*2+.7)
   theta=.008+(edge-.008)*t
   lift=.006+(.015 if BUSINESS else .012)*math.sin(theta)**.8
   lift+=.00075*math.sin(phi*38+theta*5)*math.sin(math.pi*t)**.7
   vs.append(radial(phi,theta,lift));uv.append((i/C*6+.16*t,t))
 for j in range(M):
  for i in range(C):a=j*(C+1)+i;fs.append((a,a+1,a+C+2,a+C+1))
 make('V122b continuous combed scalp',vs,fs,hair,'CT_Head',uv)
 # Five varied, gently curved broad locks shape the front silhouette. Each
 # is fitted to the face BVH and stays above the brow, with a rounded taper.
 for k in range(5):
  end_phi=-math.pi+.20+k*.33
  end_theta=[1.52,1.42,1.31,1.20,1.12][k] if BUSINESS else [1.55,1.42,1.30,1.16,1.08][k]
  def point(t):
   phi=-.90+(end_phi+.90)*(t*t*(3-2*t))
   theta=.22+(end_theta-.22)*t
   return radial(phi,theta,.012+(.024+.002*k)*math.sin(math.pi*t)**.7)
  swept('V122b swept side part '+str(k),point,lambda t:(.023+.002*math.sin(k))*(.65+.35*math.sin(math.pi*t))*max(.025,(1-t**3)**.7),lambda t:.0055*max(.04,1-t**4),hair,'CT_Head',72,16)
 # A smaller opposing section completes the visible part, not another fan.
 for k in range(2):
  def point(t):return radial(-.85+(1.15+k*.3)*t,.25+1.10*t,.011+.014*math.sin(math.pi*t))
  swept('V122b short opposing sweep '+str(k),point,lambda t:.018*max(.03,1-t**3),lambda t:.004*max(.04,1-t**4),hair,'CT_Head',48,12)
 if not BUSINESS:
  for sign in [-1,1]:
   def point(t):return Vector((sign*(.112+.010*math.sin(t*math.pi*1.7)),-.053-.036*math.sin(t*math.pi),eye+.108-.165*t))
   swept('V122b tapered temple tendril',point,lambda t:.0043*(1-.88*t),lambda t:.003*(1-.90*t),hair,'CT_Head',48,10)
 # Slim the brow outer ends without losing expression topology.
 brow=bpy.data.objects['V12e native eyebrows']
 for key in brow.data.shape_keys.key_blocks:
  for sign in [-1,1]:
   points=[v for v in key.data if v.co.x*sign>0];mid=sum(v.co.z for v in points)/len(points)
   for v in points:v.co.z=mid+(v.co.z-mid)*(.76-.20*min(1,abs(v.co.x)/.10))
 for v,k in zip(brow.data.vertices,brow.data.shape_keys.key_blocks[0].data):v.co=k.co
 changes=['Complete continuous anatomy-fitted scalp with off-centre part','Five varied broad side-swept locks and two opposing sweeps replace eighteen repeated wedges','Removed all obsolete forehead-crossing strips and flyaways','Retained native facial morphs, low bun, props and full humanoid skin','Tapered expression-compatible eyebrow width']

# UV validation is necessary for new collar/cloth panels carrying a texture.
for o in root.children_recursive:
 if o.type=='MESH' and not o.hide_render and not o.data.uv_layers:
  if any(m and m.use_nodes and any(n.type=='TEX_IMAGE' for n in m.node_tree.nodes) for m in o.data.materials):
   uv=o.data.uv_layers.new(name='Cloth projection')
   for l in o.data.loops:p=o.data.vertices[l.vertex_index].co;uv.data[l.index].uv=(p.x*6,p.z*6)
neutral();root['v122b_changes']=json.dumps(changes)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')))

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
   bpy.context.view_layer.objects.active=o;q=o.modifiers.new('Mobile silhouette budget','DECIMATE');q.ratio=.55
   bpy.ops.object.modifier_apply(modifier=q.name)
 bpy.context.view_layer.objects.active=rig
 if native and not STUDENT:rig.animation_data.action=native
 p=OUT/(STEM+tier+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_apply=False,export_animations=not STUDENT,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=True,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=86 if tier!='-lite' else 74,export_image_webp_fallback=False)
 exports.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
record=json.loads((OUT/f"CT_{ROLE}_Explore_{'v12b' if STUDENT else BASE}.sources.json").read_text())
record.update(revision=REV,version=REV,status='CANDIDATE_NOT_ACCEPTED',editable_source=STEM+'.blend',parent_revision='v12b' if STUDENT else BASE,refinements=changes,exports=exports,paid_calls=0)
(OUT/(STEM+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
print('V122B_EXPORTED',ROLE,flush=True)
