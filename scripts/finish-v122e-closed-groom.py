"""Close the open native cranium with a measured continuous groom shell.
Keep D anatomy and original licensed sources. This is a new candidate only.
"""
import bpy,bmesh,math,sys,json,hashlib
import numpy as np
from mathutils import Vector
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];STUDENT=ROLE=='Student';BUSINESS=ROLE=='Business';REV='v122e';STEM=f'CT_{ROLE}_Explore_{REV}'
if STUDENT:raise RuntimeError('Retain reviewed student D, adult groom only')
if any(OUT.glob(STEM+'*')):raise RuntimeError('Retain '+STEM)
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122d.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122d'];root.name=STEM;rig=bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
for o in root.children_recursive:
 if o.type=='MESH' and not o.hide_render and o.name.startswith(('V122d continuous native','V122d individual side','V122d short parted','V122d soft cheek')):o.hide_render=True
eye=1.204 if BUSINESS else 1.588
center=Vector((0,-.026,eye+(.020 if BUSINESS else .034)))
rx,ry,rz=(.124,.123,.113) if BUSINESS else (.135,.146,.136)
hair=bpy.data.materials['V122b chestnut flowing hair']
# Real tangent-space fibre normal with subtle cross-strand variation.
n=512;y,x=np.mgrid[:n,:n];height=.5+.20*np.sin(x*2.0+np.sin(y*.024)*1.1)+.07*np.sin(x*4.8+y*.008)
dx=np.roll(height,1,axis=1)-np.roll(height,-1,axis=1)
pixels=np.stack((.5+dx*.17,np.full_like(dx,.5),np.ones_like(dx),np.ones_like(dx)),axis=2).astype(np.float32)
im=bpy.data.images.new('V122e original directional hair micro-normal',width=n,height=n,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(pixels.ravel());im.pack()
t=hair.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;normal=hair.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.22;hair.node_tree.links.new(t.outputs['Color'],normal.inputs['Color']);hair.node_tree.links.new(normal.outputs['Normal'],hair.node_tree.nodes['Principled BSDF'].inputs['Normal'])
def surface(phi,theta,lift=0):
 d=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)))
 normal=Vector((d.x/rx,d.y/ry,d.z/rz)).normalized()
 # A small wave at the main crown breaks the rigid hemisphere silhouette.
 wave=.002*math.sin(phi*3+theta*2)*math.sin(theta)**2
 return center+Vector((d.x*rx,d.y*ry,d.z*rz))+normal*(lift+wave),normal
def edge(phi):
 front=max(0,-math.sin(phi));back=max(0,math.sin(phi))
 return 1.72+.57*back-.46*front+.065*math.sin(phi*2+.6)
C=192;M=64;vs=[];fs=[];uv=[]
for j in range(M+1):
 u=j/M
 for i in range(C+1):
  phi=i/C*math.tau;theta=.001+(edge(phi)-.001)*u;p,n=surface(phi,theta,.001)
  vs.append(p);uv.append((i/C*7+.16*u,u))
for j in range(M):
 for i in range(C):a=j*(C+1)+i;fs.append((a,a+1,a+C+2,a+C+1))
make('V122e closed measured groom shell',vs,fs,hair,'CT_Head',uv)
def lock(name,end_phi,end_theta,width,start_phi=-.79):
 N=80;C=20;vs=[];fs=[];uv=[]
 def point(t):
  phi=start_phi+(end_phi-start_phi)*(t*t*(3-2*t));theta=.12+(end_theta-.12)*t
  return surface(phi,theta,.003+.014*math.sin(math.pi*t)**.7)
 for j in range(N+1):
  t=j/N;c,n=point(t);a,_=point(max(0,t-.001));b,_=point(min(1,t+.001));tangent=(b-a).normalized();side=tangent.cross(n).normalized();normal=side.cross(tangent).normalized()
  w=width*(.60+.40*math.sin(math.pi*t))*max(.025,(1-t**4)**.75);depth=.0034*max(.05,1-t**5)
  for k in range(C):
   angle=k/C*math.tau;vs.append(c+side*math.cos(angle)*w+normal*math.sin(angle)*depth);uv.append((k/C,t))
 for j in range(N):
  for k in range(C):a=j*C+k;b=j*C+(k+1)%C;fs.append((a,b,b+C,a+C))
 fs.extend([tuple(reversed(range(C))),tuple(N*C+k for k in range(C))]);make(name,vs,fs,hair,'CT_Head',uv)
for k in range(6):
 phi=-2.95+k*.275;lock('V122e flowing broad side sweep '+str(k),phi,min(edge(phi)+.04,1.64-k*.065),.020-k*.0014)
for k in range(3):
 phi=-.45+k*.45;lock('V122e opposite natural wave '+str(k),phi,min(edge(phi)+.02,1.72),.015-k*.001,-.72)
if not BUSINESS:
 for sign in [-1,1]:
  def p(t):return Vector((sign*(.112+.009*math.sin(t*math.pi*1.5)),-.062-.03*math.sin(t*math.pi),eye+.091-.148*t))
  swept('V122e fine cheek framing hair',p,lambda t:.0035*(1-.92*t),lambda t:.0025*(1-.92*t),hair,'CT_Head',48,12)
changes=['Closed full cranium shell measured to native forehead, temples and crown','Off-centre side sweeps with rounded taper and coherent tangent flow','Original tangent-space hair fibre normal, no repeated sharp wedges','D relaxed eyelids, complete anatomy and all native skin retained']
neutral();root['v122e_changes']=json.dumps(changes);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')))
native=bpy.data.actions.get('CT_BreathAndHands')
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
   if o.type!='MESH' or o.hide_render or o.data.shape_keys or 'anatomical hand' in o.name or len(o.data.polygons)<800:continue
   bpy.context.view_layer.objects.active=o;q=o.modifiers.new('Mobile silhouette budget','DECIMATE');q.ratio=.55;bpy.ops.object.modifier_apply(modifier=q.name)
 bpy.context.view_layer.objects.active=rig;rig.animation_data.action=native
 p=OUT/(STEM+tier+'.glb');bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=True,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=86 if tier!='-lite' else 74,export_image_webp_fallback=False)
 exports.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
record=json.loads((OUT/f'CT_{ROLE}_Explore_v122d.sources.json').read_text());record.update(revision=REV,version=REV,status='CANDIDATE_NOT_ACCEPTED',editable_source=STEM+'.blend',parent_revision='v122d',refinements=record.get('refinements',[])+changes,exports=exports,paid_calls=0)
(OUT/(STEM+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V122E_EXPORTED',ROLE,flush=True)
