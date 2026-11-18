"""Review-led adult finish: cover the blank cap with a curved forelock and
flowing three-dimensional grooves; preserve G skin/eye revisions and native rig.
"""
import bpy,bmesh,math,sys,json,hashlib
from mathutils import Vector
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BUSINESS=ROLE=='Business';REV='v122h';STEM=f'CT_{ROLE}_Explore_{REV}'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Retain '+STEM)
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122g.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122g'];root.name=STEM;rig=bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
eye=1.204 if BUSINESS else 1.588;center=Vector((0,-.026,eye+(.020 if BUSINESS else .034)));rx,ry,rz=(.124,.123,.113) if BUSINESS else (.135,.146,.136)
hair=bpy.data.materials['V122b chestnut flowing hair'];fibre=bpy.data.materials['V122g warm low contrast fibre']
for o in root.children_recursive:
 if o.type=='MESH' and o.name.startswith(('V122g organic swept','V122g groom attached','V122g soft temple')):o.hide_render=True
def edge(phi):return 1.72+.57*max(0,math.sin(phi))-.49*max(0,-math.sin(phi))-.10*math.cos(phi)+.035*math.sin(phi*3+.6)
def surface(phi,theta,lift=0,groove=True):
 d=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)));n=Vector((d.x/rx,d.y/ry,d.z/rz)).normalized()
 vol=.004*math.sin(phi*2.5+theta*3)*math.sin(theta)**2+.007*max(0,math.cos(theta))
 if groove:vol+=(.00070*math.sin(phi*61+theta*17+math.sin(phi*3)*2)+.00025*math.sin(phi*127+theta*29))*math.sin(theta)**.8
 return center+Vector((d.x*rx,d.y*ry,d.z*rz))+n*(lift+vol),n
shell=bpy.data.objects['V122e closed measured groom shell'];C=192;M=64
for j in range(M+1):
 for i in range(C+1):phi=i/C*math.tau;shell.data.vertices[j*(C+1)+i].co=surface(phi,.001+(edge(phi)-.001)*j/M,.001)[0]
def clump(name,controls,width,depth):
 controls=[Vector(x) for x in controls];N=90;C=28;vs=[];fs=[];uv=[]
 def pt(t):
  a,b,c,d=controls;q=a*(1-t)**3+b*3*(1-t)**2*t+c*3*(1-t)*t*t+d*t**3
  return surface(q.x,q.y,.003+.012*math.sin(math.pi*t)**.6,False)
 for j in range(N+1):
  t=j/N;c,n=pt(t);a,_=pt(max(0,t-.001));b,_=pt(min(1,t+.001));tangent=(b-a).normalized();side=tangent.cross(n).normalized();n=side.cross(tangent).normalized()
  w=width*(.55+.45*math.sin(math.pi*t))*(.08+.92*(1-t**5)**.7);dd=depth*(.35+.65*math.sin(math.pi*t))*(1-.9*t**5)
  for k in range(C):
   angle=k/C*math.tau;ridge=.00038*math.cos(angle*9+t*4)*math.sin(math.pi*t)
   vs.append(c+side*math.cos(angle)*w+n*math.sin(angle)*(dd+ridge));uv.append((k/C,t))
 for j in range(N):
  for k in range(C):a=j*C+k;b=j*C+(k+1)%C;fs.append((a,b,b+C,a+C))
 fs.extend([tuple(reversed(range(C))),tuple(N*C+k for k in range(C))]);o=make(name,vs,fs,hair,'CT_Head',uv)
 # Finer tracks follow the actual forelock, not independent helices.
 for k in [3,6,8,10,12]:
  points=[vs[j*C+k]+o.data.vertices[j*C+k].normal*.00015 for j in range(4,N-3)]
  start=len(vs);pv=[];pf=[]
  for j,p in enumerate(points):
   t=j/(len(points)-1);tangent=(points[min(len(points)-1,j+1)]-points[max(0,j-1)]).normalized();side=tangent.cross(Vector((0,-1,0))).normalized();n=side.cross(tangent);r=.00013*max(.05,math.sin(math.pi*t)**.4)
   for c in range(5):a=c/5*math.tau;pv.append(p+(side*math.cos(a)+n*math.sin(a))*r)
  for j in range(len(points)-1):
   for c in range(5):a=j*5+c;b=j*5+(c+1)%5;pf.append((a,b,b+5,a+5))
  make('V122h forelock fine strand',pv,pf,fibre,'CT_Head')
designs=[
 ([(-.65,.64),(-1.05,1.10),(-2.18,1.36),(-3.02,1.88)],.030,.0065),
 ([(-.44,.52),(-.98,.85),(-1.90,1.17),(-2.80,1.66)],.026,.0070),
 ([(-.18,.46),(-.67,.64),(-1.70,1.00),(-2.53,1.49)],.025,.0070),
 ([(.10,.55),(-.34,.43),(-1.25,.85),(-2.14,1.33)],.023,.0060),
 ([(.32,.65),(-.01,.46),(-.85,.69),(-1.68,1.20)],.021,.0050),
 ([(-.53,.63),(-.11,.85),(.21,1.35),(.10,1.93)],.022,.0060),
 ([(-.18,.57),(.19,.77),(.71,1.28),(.58,2.04)],.022,.0055),
 ([(.24,.65),(.60,.89),(1.04,1.38),(1.12,2.13)],.020,.0050)]
for i,(controls,w,d) in enumerate(designs):
 if not BUSINESS:
  controls=[(phi,theta+(.025 if i<3 else 0)) for phi,theta in controls];w*=1.08
 clump('V122h curved forelock '+str(i),controls,w,d)
for sign in [-1,1]:
 for k in range(4):
  def point(t):
   c,n=surface((-3.05 if sign<0 else .12)+k*.035,1.22+.70*t,.0035,False);return c+n*(.0015*math.sin(t*math.pi*2+k))
  swept('V122h tapered soft temple lock',point,lambda t:.0018*(1-.94*t),lambda t:.0013*(1-.94*t),hair,'CT_Head',48,8)
changes=['Raised asymmetric true hairline and forehead-spanning curved forelock eliminate the blank cap crescent','Submillimetre flowing geometric grooves on the full closed groom','Varied forelock volumes, tapered temple locks and attached fibres']
if BUSINESS:
 jacket=bpy.data.objects['Fitted tailored jacket'];q=jacket.modifiers.new('Continuous tailored neckline','SUBSURF');q.levels=1;q.render_levels=1;bpy.context.view_layer.objects.active=jacket;bpy.ops.object.modifier_apply(modifier=q.name)
 collar=bpy.data.objects['V12f fitted stand collar']
 for v in collar.data.vertices:
  upper=max(0,min(1,(v.co.z-1.035)/.038));front=max(0,min(1,(-v.co.y-.02)/.06));v.co.z-=.012*math.exp(-(v.co.x/.042)**4)*upper*front
 for o in root.children_recursive:
  if o.name.startswith('V12g folded collar point'):o.hide_render=True
 cotton=bpy.data.materials['Cream cotton poplin']
 for sign in [-1,1]:
  a=Vector((sign*.027,-.078,1.062));b=Vector((sign*.075,-.076,1.035));c=Vector((sign*.053,-.145,.980));d=Vector((sign*.014,-.152,1.019));N=16;vs=[];fs=[];uv=[]
  for j in range(N+1):
   v=j/N
   for i in range(N+1):
    u=i/N;p=a.lerp(b,u).lerp(d.lerp(c,u),v);p.y-=.004*math.sin(u*math.pi)*math.sin(v*math.pi);vs.append(p);uv.append((u,v))
  for j in range(N):
   for i in range(N):k=j*(N+1)+i;fs.append((k,k+1,k+N+2,k+N+1))
  o=make('V122h curved cotton collar leaf',vs,fs,cotton,'CT_Chest',uv);q=o.modifiers.new('Cotton folded thickness','SOLIDIFY');q.thickness=.0012;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=q.name)
 changes+=['Subdivided fitted jacket neckline retains the real torso weights','Curved three-dimensional cotton collar leaves with a lowered front stand edge']
neutral();root['v122h_changes']=json.dumps(changes);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')))
native=bpy.data.actions.get('CT_BreathAndHands')
for action in list(bpy.data.actions):
 if action!=native:bpy.data.actions.remove(action)
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
 bpy.context.view_layer.objects.active=rig;rig.animation_data.action=native;p=OUT/(STEM+tier+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=True,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=86 if tier!='-lite' else 74,export_image_webp_fallback=False)
 exports.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
record=json.loads((OUT/f'CT_{ROLE}_Explore_v122g.sources.json').read_text());record.update(revision=REV,version=REV,status='CANDIDATE_NOT_ACCEPTED',editable_source=STEM+'.blend',parent_revision='v122g',refinements=record.get('refinements',[])+changes,exports=exports,paid_calls=0)
(OUT/(STEM+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V122H_EXPORTED',ROLE,flush=True)
