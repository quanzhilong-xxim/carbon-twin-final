"""Local V12.2 portrait revision. Preserve F, original reference sheets and rigs.
No network generation. Native donor face/skin ownership remains in sources.json.
"""
import bpy,bmesh,math,sys,json,hashlib,random
import numpy as np
from mathutils import Vector
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate'
ROLE=sys.argv[-1];STUDENT=ROLE=='Student';BUSINESS=ROLE=='Business';REV='v122g';STEM=f'CT_{ROLE}_Explore_{REV}'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve existing '+STEM)
# Recover a fraction of the native eye aperture instead of stacking another
# eyelid approximation on top of the relaxed D pose.
original={}
if not STUDENT:
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v12e.blend'),load_ui=False,use_scripts=False)
 for suffix in ['head','eyes','eyelashes']:
  o=bpy.data.objects.get('V12e native '+suffix)
  if o and o.data.shape_keys:original[suffix]={k.name:np.array([v.co[:] for v in k.data]) for k in o.data.shape_keys.key_blocks}
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122f.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122f'];root.name=STEM;rig=root if STUDENT else bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()

def principled(material):
 return material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
def image_to_base(material,name,pixels):
 p=principled(material);h,w=pixels.shape[:2];im=bpy.data.images.new(name,width=w,height=h,alpha=True)
 im.pixels.foreach_set(pixels.astype(np.float32).ravel());im.pack();t=material.node_tree.nodes.new('ShaderNodeTexImage');t.image=im
 material.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color']);return im
def base_image(material):
 p=principled(material)
 # Retained native skin uses an upstream color multiplier; resolve that
 # graph instead of assuming a direct texture -> Principled connection.
 pending=[l.from_node for l in p.inputs['Base Color'].links];seen=set()
 while pending:
  n=pending.pop()
  if n.name in seen:continue
  seen.add(n.name)
  if n.type=='TEX_IMAGE' and n.image:return n.image
  pending.extend(l.from_node for socket in n.inputs for l in socket.links)
 raise RuntimeError('Missing direct base image '+material.name)
def subtle_complexion(head):
 m=head.data.materials[0];im=base_image(m);w,h=im.size;px=np.array(im.pixels[:],np.float32).reshape(h,w,4).copy()
 # Preserve the licensed painted atlas, pores, lips and repeat addressing.
 px[:,:,:3]*=np.array([1.015,.945,.905] if BUSINESS else [1.018,.956,.925])
 # Rasterize a cheek-only tint from actual anatomy into the existing UVs.
 weight=np.zeros((h,w),np.float32);uv=head.data.uv_layers.active;eye=1.204 if BUSINESS else 1.588
 coords=np.array([v.co[:] for v in head.data.vertices]);brush=np.exp(-((np.abs(coords[:,0])-.057)/.028)**2-((coords[:,2]-(eye-.042))/.027)**2)*np.clip((-coords[:,1]-.075)/.045,0,1)
 head.data.calc_loop_triangles()
 for tri in head.data.loop_triangles:
  inds=list(tri.vertices);ws=brush[inds]
  if ws.max()<.015:continue
  u=np.array([uv.data[i].uv[:] for i in tri.loops])%1
  if np.ptp(u[:,0])>.5 or np.ptp(u[:,1])>.5:continue
  pts=u*np.array([w-1,h-1]);xmin,ymin=np.floor(pts.min(0)).astype(int);xmax,ymax=np.ceil(pts.max(0)).astype(int)
  if xmin<0 or ymin<0 or xmax>=w or ymax>=h:continue
  yy,xx=np.mgrid[ymin:ymax+1,xmin:xmax+1];a,b,c=pts;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
  if abs(den)<1e-8:continue
  v=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den;u1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;u2=1-v-u1
  mask=(v>=-.001)&(u1>=-.001)&(u2>=-.001);z=(v*ws[0]+u1*ws[1]+u2*ws[2])*mask
  region=weight[ymin:ymax+1,xmin:xmax+1];np.maximum(region,z,out=region)
 px[:,:,1]*=1-.095*weight;px[:,:,2]*=1-.065*weight;px[:,:,:3]=np.clip(px[:,:,:3],0,1)
 image_to_base(m,'V122g anatomy painted warm complexion',px);p=principled(m);p.inputs['Roughness'].default_value=.55;p.inputs['Specular IOR Level'].default_value=.25
 for n in m.node_tree.nodes:
  if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=min(.16,n.inputs['Strength'].default_value)

def warm_iris(eyes):
 m=eyes.data.materials[0];im=base_image(m);w,h=im.size;px=np.array(im.pixels[:],np.float32).reshape(h,w,4).copy();yy,xx=np.mgrid[:h,:w]
 # Existing atlas centre is recovered from its actual dark central iris.
 mask=(xx>w*.3)&(xx<w*.63)&(yy>h*.30)&(yy<h*.64)&(px[:,:,:3].mean(2)<.22)
 cy,cx=np.mean(np.argwhere(mask),axis=0);radius=math.sqrt(mask.sum()/math.pi)*(1.055 if BUSINESS else 1.0)
 rr=np.sqrt((xx-cx)**2+(yy-cy)**2)/radius;a=np.arctan2(yy-cy,xx-cx)
 striae=.78+.10*np.sin(a*83+np.sin(rr*18)*.6)+.07*np.sin(a*147+rr*10)+.05*np.sin(a*39-rr*28)
 ring=np.clip((1-rr)/.14,0,1)*np.clip((rr-.27)/.07,0,1)
 gold=np.stack((.30+.16*(1-rr),.135+.12*(1-rr),.052+.055*(1-rr)),2)*striae[:,:,None]
 iris=np.maximum(.009,gold*ring[:,:,None]);pupil=rr<.31;iris[pupil]=(.004,.003,.002)
 # Two restrained illustrative corneal highlights complement actual WebGL
 # lighting; they remain on the true spherical eye with the existing gaze.
 glint=np.exp(-(((xx-cx+radius*.31)/(radius*.11))**2+((yy-cy-radius*.38)/(radius*.13))**2)*2)
 iris=iris*(1-glint[:,:,None]*.78)+glint[:,:,None]*.80
 inside=rr<1;px[inside,:3]=iris[inside];outer=(rr>=1)&(rr<1.10);t=np.clip((rr-1)/.10,0,1)
 px[outer,:3]=px[outer,:3]*(t[outer,None])+.012*(1-t[outer,None]);px[:,:,:3]=np.clip(px[:,:,:3],0,1)
 image_to_base(m,'V122g rich brown radial iris',px);p=principled(m);p.inputs['Roughness'].default_value=.19;p.inputs['Specular IOR Level'].default_value=.30

def tube_fibres(name,paths,material,bone):
 vs=[];fs=[];uv=[];C=5
 for points,radius in paths:
  start=len(vs)
  for j,p in enumerate(points):
   t=j/(len(points)-1);tan=(points[min(len(points)-1,j+1)]-points[max(0,j-1)]).normalized();side=tan.cross(Vector((0,-1,0))).normalized()
   if side.length<.5:side=tan.cross(Vector((1,0,0))).normalized()
   n=side.cross(tan);rr=radius*max(.07,math.sin(math.pi*t)**.4)
   for k in range(C):a=k/C*math.tau;vs.append(p+(side*math.cos(a)+n*math.sin(a))*rr);uv.append((k/C,t))
  for j in range(len(points)-1):
   for k in range(C):a=start+j*C+k;b=start+j*C+(k+1)%C;fs.append((a,b,b+C,a+C))
 return make(name,vs,fs,material,bone,uv)

changes=[]
if not STUDENT:
 eye=1.204 if BUSINESS else 1.588
 for suffix,old in original.items():
  o=bpy.data.objects['V12e native '+suffix];basis=o.data.shape_keys.key_blocks[0]
  for k in o.data.shape_keys.key_blocks:
   source=old[k.name]
   if len(source)!=len(k.data):raise RuntimeError('Eye topology mismatch')
   for i,v in enumerate(k.data):
    p=basis.data[i].co;w=math.exp(-((abs(p.x)-(.047 if BUSINESS else .054))/.039)**4-((p.z-eye)/.040)**4)*max(0,min(1,(-p.y-.055)/.055))
    v.co=v.co.lerp(Vector(source[i]),w*(.16 if BUSINESS else .56))
  for v,k in zip(o.data.vertices,basis.data):v.co=k.co
 head=bpy.data.objects['V12e native head'];subtle_complexion(head);warm_iris(bpy.data.objects['V12e native eyes'])
 # A small corner lift and thinner, less protruding lips preserve continuous
 # topology and every original facial target, rather than adding facial parts.
 mouth=eye-(.105 if BUSINESS else .09)
 for key in head.data.shape_keys.key_blocks:
  for v in key.data:
   p=v.co;w=math.exp(-(p.x/.050)**4-((p.z-mouth)/.026)**4)*max(0,min(1,(-p.y-.080)/.04))
   if BUSINESS:p.z=mouth+(p.z-mouth)*(1-.09*w);p.y+=.0022*w
   p.z+=.0018*math.exp(-((abs(p.x)-.035)/.016)**2-((p.z-mouth)/.018)**2)*w
 for v,k in zip(head.data.vertices,head.data.shape_keys.key_blocks[0].data):v.co=k.co
 for o in root.children_recursive:
  if o.type=='MESH' and not o.hide_render and o.name.startswith(('V122e flowing','V122e fine cheek','V122f scalp')):o.hide_render=True
 hair=bpy.data.materials['V122b chestnut flowing hair'];p=principled(hair);p.inputs['Roughness'].default_value=.43;p.inputs['Specular IOR Level'].default_value=.31;p.inputs['Anisotropic'].default_value=.5
 for n in hair.node_tree.nodes:
  if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.13
 cx=Vector((0,-.026,eye+(.020 if BUSINESS else .034)));rx,ry,rz=(.124,.123,.113) if BUSINESS else (.135,.146,.136)
 def edge(phi):return 1.72+.57*max(0,math.sin(phi))-.34*max(0,-math.sin(phi))+.065*math.sin(phi*2+.6)
 def surface(phi,theta,lift=0):
  d=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)));n=Vector((d.x/rx,d.y/ry,d.z/rz)).normalized()
  vol=.006*math.sin(phi*2.5+theta*3)*math.sin(theta)**2+.007*max(0,math.cos(theta))
  return cx+Vector((d.x*rx,d.y*ry,d.z*rz))+n*(lift+vol),n
 shell=bpy.data.objects['V122e closed measured groom shell'];C=192;M=64
 for j in range(M+1):
  for i in range(C+1):
   phi=i/C*math.tau;t=j/M;point,_=surface(phi,.001+(edge(phi)-.001)*t,.001);shell.data.vertices[j*(C+1)+i].co=point
 paths=[]
 def clump(name,controls,width,depth,seed):
  rng=random.Random(seed);N=84;C=24;vs=[];fs=[];uv=[]
  controls=[Vector(x) for x in controls]
  def pt(t):
   a,b,c,d=controls;q=a*(1-t)**3+b*3*(1-t)**2*t+c*3*(1-t)*t*t+d*t**3
   phi,theta=q.x,q.y;lift=.003+(.012 if BUSINESS else .010)*math.sin(math.pi*t)**.6+.003*math.sin(t*math.pi*3+.5)*math.sin(math.pi*t)
   return surface(phi,theta,lift)
  for j in range(N+1):
   t=j/N;c,n=pt(t);a,_=pt(max(0,t-.001));b,_=pt(min(1,t+.001));side=(b-a).normalized().cross(n).normalized();n=side.cross((b-a).normalized()).normalized()
   w=width*(.45+.55*math.sin(math.pi*t)**.65)*(.10+.90*(1-t**5)**.55);dd=depth*(.24+.76*math.sin(math.pi*t))*(1-.86*t**5)
   for k in range(C):
    angle=k/C*math.tau;vs.append(c+side*math.cos(angle)*w+n*math.sin(angle)*dd);uv.append((k/C,t))
  for j in range(N):
   for k in range(C):a=j*C+k;b=j*C+(k+1)%C;fs.append((a,b,b+C,a+C))
  fs.extend([tuple(reversed(range(C))),tuple(N*C+k for k in range(C))]);o=make(name,vs,fs,hair,'CT_Head',uv)
  for k in [2,4,6,8,10]:
   points=[vs[j*C+k]+o.data.vertices[j*C+k].normal*.00010 for j in range(3,N-1)];paths.append((points,.00011+rng.random()*.00004))
 if BUSINESS:
  designs=[([(-.65,.42),(-1.12,.24),(-2.45,.98),(-3.05,1.85)],.027,.007),([(-.48,.40),(-1.00,.30),(-2.15,1.12),(-2.88,1.73)],.024,.006),([(-.25,.43),(-.72,.28),(-1.84,1.02),(-2.65,1.54)],.023,.007),([(.02,.55),(-.35,.32),(-1.50,.95),(-2.25,1.40)],.021,.006),([(.20,.67),(-.06,.46),(-1.08,.78),(-1.90,1.29)],.019,.005),([(-.52,.47),(-.02,.45),(.42,1.15),(.12,1.87)],.019,.005),([(-.22,.53),(.21,.60),(.74,1.16),(.56,2.02)],.018,.005)]
 else:
  designs=[([(-.69,.41),(-1.31,.23),(-2.44,.97),(-3.00,1.94)],.030,.007),([(-.42,.44),(-1.02,.28),(-2.04,.91),(-2.76,1.68)],.030,.008),([(-.14,.51),(-.69,.31),(-1.70,.92),(-2.41,1.46)],.025,.007),([(.16,.66),(-.19,.38),(-1.20,.80),(-2.10,1.31)],.024,.006),([(-.53,.50),(-.01,.49),(.38,1.19),(.10,2.06)],.025,.006),([(-.14,.60),(.33,.62),(.82,1.29),(.63,2.12)],.023,.006)]
 for k,(control,w,d) in enumerate(designs):clump('V122g organic swept lock '+str(k),control,w,d,k+20)
 fibre=mat('V122g warm low contrast fibre',(.105,.049,.027) if BUSINESS else (.095,.041,.025),.49,.27)
 tube_fibres('V122g groom attached fine fibres',paths,fibre,'CT_Head')
 # A few imperfect, tapered silhouette strands are fully 3D and head-skinned.
 for sign in [-1,1]:
  for k in range(3 if BUSINESS else 4):
   def point(t):
    phi=(-3.06 if sign<0 else .10)+k*.055;theta=1.2+.67*t
    c,n=surface(phi,theta,.003+(.0025+k*.0005)*math.sin(math.pi*t));return c+n*(.002*math.sin(t*math.pi*2))
   swept('V122g soft temple wisp',point,lambda t:.0014*(1-.91*t),lambda t:.0011*(1-.91*t),hair,'CT_Head',45,8)
 changes=['Warm anatomy-rasterized complexion with preserved licensed atlas details','Rich brown radial iris and restrained corneal highlights on original spherical eyes','Native eye aperture partially restored, all six facial morphs retained','Asymmetric curved volume clumps and small silhouette wisps replace rigid parallel wedges','Independent swept designs for the adult roles; city low bun and gold pin preserved']
else:
 # Smooth, less block-like braid cross sections; keep actual over-under flow.
 hair=bpy.data.materials['V122b rose satin plait'];p=principled(hair);p.inputs['Roughness'].default_value=.46;p.inputs['Specular IOR Level'].default_value=.28
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render:continue
  if o.name.startswith('V122b interlaced rose plait'):
   q=o.modifiers.new('Soft continuous braid cross-section','SUBSURF');q.levels=1;q.render_levels=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=q.name)
  if o.name.startswith('V122b continuous bomber sleeve'):
   N=48;M=80
   for v in o.data.vertices:
    t=(v.index//N)/M;angle=(v.index%N)/N*math.tau;zone=math.exp(-((t-.59)/.17)**2)
    # Nonparallel compression folds around the elbow, fading before the cuff
    # so the measured wrist overlap and repaired skin mask remain unchanged.
    radial=Vector((0,-math.cos(angle),math.sin(angle)));fold=.0024*math.sin(t*math.pi*24+angle*1.8)*zone*(.30+.70*math.sin(angle+.6)**2)
    v.co+=radial*fold
   for f in o.data.polygons:f.use_smooth=True
 changes=['Subdivided interlaced plaits preserve over-under volume without faceted cross-sections','Softer directional satin response','Asymmetric elbow compression folds fade out before the repaired wrist contact','All real finger weights and six web expressions retained']

neutral();root['v122g_changes']=json.dumps(changes);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')))
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
record=json.loads((OUT/f'CT_{ROLE}_Explore_v122f.sources.json').read_text());record.update(revision=REV,version=REV,status='CANDIDATE_NOT_ACCEPTED',editable_source=STEM+'.blend',parent_revision='v122f',refinements=record.get('refinements',[])+changes,exports=exports,paid_calls=0)
(OUT/(STEM+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V122G_EXPORTED',ROLE,flush=True)
