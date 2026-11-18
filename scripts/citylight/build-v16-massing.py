"""V16 W02/W03: two first-tower concept geometries, not approved assets."""
import bpy,math,json,hashlib,argparse,sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--revision',default='r2');cfg=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
O=R/'public/models/citylight/v16-study'/cfg.revision;W=R/'work/citylight-v16-assets'/cfg.revision
O.mkdir(parents=True,exist_ok=True);W.mkdir(parents=True,exist_ok=True)
if (O/'manifest.json').exists():raise RuntimeError('Do not overwrite prior revision')
manifest=[]
for variant in ['crystal','terrace']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
 M={};sections=[]
 for n,c in [('envelope',(.53,.56,.56)),('structure',(.72,.73,.70)),('floor',(.37,.40,.40)),('core',(.30,.33,.34)),('crown',(.57,.59,.59)),('site',(.18,.22,.22)),('scale',(.44,.28,.20))]:
  m=bpy.data.materials.new('clay-'+n);m.use_nodes=True;q=m.node_tree.nodes.get('Principled BSDF');q.inputs['Base Color'].default_value=(*c,1);q.inputs['Roughness'].default_value=.72;M[n]=m
 def finish(o,n,m,bevel=0):
  o.name=n;o.data.materials.append(M[m]);o['assetId']='CL-T01-V16-'+variant.upper();o['role']='UNAPPROVED_GEOMETRY_RESEARCH'
  if bevel:
   md=o.modifiers.new('edge radius','BEVEL');md.width=bevel;md.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=md.name)
  return o
 def box(n,p,s,m='structure',bevel=0):
  bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,n,m,bevel)
 def rod(n,a,b,r=.05,m='structure',vertices=8):
  a,b=Vector(a),Vector(b);v=b-a
  if v.length<.00001:raise ValueError('zero length')
  bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return finish(o,n,m)
 def mesh(n,v,f,m):
  d=bpy.data.meshes.new(n);d.from_pydata(v,[],f);d.update();o=bpy.data.objects.new(n,d);bpy.context.collection.objects.link(o);return finish(o,n,m)
 def poly(z,inset=0):
  t=max(0,min(1,(z-8.4)/93.6))
  if variant=='crystal':hx=18-3.6*t;hy=14-1.8*t;cut=.85+6.4*t
  else:
   level=0 if z<43 else 1 if z<77 else 2
   hx=18-2.3*level-.7*t;hy=14-1.35*level-.55*t;cut=2.6
  hx-=inset;hy-=inset;cut=min(cut,max(.1,min(hx,hy)*.75))
  points=[(hx-cut,-hy,z),(hx,-hy+cut,z),(hx,hy-cut,z),(hx-cut,hy,z),(-hx+cut,hy,z),(-hx,hy-cut,z),(-hx,-hy+cut,z),(-hx+cut,-hy,z)]
  if variant=='crystal':
   # A distinct sloped roof shoulder, reached only in the final mechanical level.
   blend=max(0,min(1,(z-98.4)/3.6))
   points=[(x,y,zz+blend*(1.9*x/hx-.65*y/hy)) for x,y,zz in points]
  return points
 def wall(n,a,b,m,cap=False):
  f=[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
  if cap:f.extend([tuple(range(7,-1,-1)),tuple(range(8,16))])
  return mesh(n,a+b,f,m)
 def circlewall(n,r0,r1,z0,z1,m):
  k=64;v=[(math.cos(i*math.tau/k)*r,math.sin(i*math.tau/k)*r,z) for z,r in [(z0,r0),(z1,r1)] for i in range(k)]
  return mesh(n,v,[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)],m)
 def annulus(n,ro,ri,z,th,m):
  k=64;v=[(math.cos(i*math.tau/k)*r,math.sin(i*math.tau/k)*r,zz) for r,zz in [(ro,z),(ri,z),(ro,z+th),(ri,z+th)] for i in range(k)];f=[]
  for i in range(k):
   j=(i+1)%k;f.extend([(i,j,j+2*k,i+2*k),(i+k,i+3*k,j+3*k,j+k),(i+2*k,j+2*k,j+3*k,i+3*k),(i,i+k,j+k,j)])
  return mesh(n,v,f,m)
 box('site:plinth',(0,0,-.25),(72,62,.5),'site',.07);box('lobby:floor',(0,0,.12),(43,33,.24),'floor',.03)
 # A real double-height void; no green-ball trees or toy cars used to disguise massing.
 box('podium:rear',(0,15.7,4.2),(42,.6,8.4),'envelope',.04)
 box('podium:west-return',(-20.7,5,4.2),(.6,21.4,8.4),'envelope',.04)
 box('podium:east-service',(20.7,8,4.2),(.6,15.4,8.4),'envelope',.04)
 box('podium:roof',(0,0,8.22),(43,33,.36),'structure',.05)
 for x in [-18,-12,-6,6,12,18]:
  for y in [-15.5,10.5]:box('lobby:column',(x,y,4.1),(.38,.46,8.2),'structure',.035)
 for x in [-2.75,2.75]:box('entry:jamb',(x,-16.65,1.7),(.12,.30,3.2),'structure',.01)
 box('entry:lintel',(0,-16.65,3.35),(5.6,.30,.15),'structure',.01)
 for x in [-.95,.95]:box('entry:door-mullion',(x,-16.65,1.7),(.055,.10,3.2),'structure',.005)
 canopy=box('entry:canopy',(0,-19.4,4.5),(15.2,5.8,.24),'structure',.035);canopy.rotation_euler.x=math.radians(1)
 for x in [-6.6,6.6]:
  rod('entry:canopy-stay',(x,-16.1,6.6),(x,-21.7,4.6),.055);box('entry:canopy-pier',(x,-16.15,3),(.22,.26,6),'structure',.02)
 box('entry:drain-edge',(0,-22.2,4.42),(15.2,.11,.15),'core')
 box('core:back',(0,4,4),(9,.32,8),'core')
 for x in [-4.35,4.35]:box('core:side',(x,0,4),(.3,8,8),'core')
 for x in [-2.8,0,2.8]:box('core:elevator-pier',(x,-4,4),(.45,.3,8),'core')
 box('core:elevator-header',(0,-4,5.5),(9,.3,5),'core')
 for level in range(27):
  z=8.4+level*3.6;sections.append(dict(level=level,z=z,polygon=poly(z)))
  wall('slab:level-%02d'%level,poly(z,.16),poly(z+.22,.16),'floor',True)
  if level==26:continue
  if variant=='crystal' and level==24:
   # An actual service-floor recess with individual louvres, not painted stripes.
   wall('service:recess',poly(z+.22,.48),poly(z+3.6,.48),'core')
  else:wall('envelope:level-%02d'%level,poly(z+.22,.16),poly(z+3.6,.16),'envelope')
  a,b=poly(z+.22),poly(z+3.6)
  for side in range(8):
   pa,pb=Vector(a[side]),Vector(b[side]);na,nb=Vector(a[(side+1)%8]),Vector(b[(side+1)%8])
   rod('frame:corner',pa,pb,.072)
   divisions=6 if (pa-na).length>12 else 3
   for j in range(1,divisions):rod('frame:secondary',pa.lerp(na,j/divisions),pb.lerp(nb,j/divisions),.055)
   if variant=='crystal' and level==24:
    for j in range(1,divisions*3):rod('service:louvre',pa.lerp(na,j/(divisions*3)),pb.lerp(nb,j/(divisions*3)),.04,'structure')
 if variant=='crystal':
  for side in range(8):rod('structure:edge-spine',poly(8.4)[side],poly(102)[side],.13)
 annulus('crown:catwalk',8.9,6.55,104.9,.24,'crown')
 circlewall('crown:mechanical-screen',6.25,5.8,104.2,108.05,'core')
 annulus('crown:mechanical-lid',5.8,.82,108.05,.12,'core')
 for k in range(32):
  a=k*math.tau/32;c,s=math.cos(a),math.sin(a);rod('crown:post',(c*8.75,s*8.75,105.15),(c*8.75,s*8.75,106.25),.035)
  rod('crown:louvre',(c*6.28,s*6.28,104.4),(c*5.84,s*5.84,107.9),.04)
  if k%4==0:rod('crown:support',(c*6,s*6,102.2),(c*8.5,s*8.5,107.6),.105)
 for z in [106.2,107.6,108.05]:annulus('crown:ring',8.9,8.55,z,.16,'crown')
 circlewall('crown:mast-base',1.35,.8,107,110.2,'structure')
 rod('antenna:lower',(0,0,108.6),(0,0,116.1),.22,'core',12);rod('antenna:upper',(0,0,116.1),(0,0,121.6),.10,'crown',12)
 for z,w in [(111.3,.9),(113.8,.65),(116.1,.45)]:
  rod('antenna:equipment-arm',(-w,0,z),(w,0,z),.055)
  for x in [-w,w]:box('antenna:equipment',(x,0,z),(.18,.24,.65),'core',.025)
 for x in [-2,2]:box('crown:access-stair-core',(x,3,103.3),(1.25,2.4,2.0),'core',.04)
 for x,y in [(-3.8,-20),(3.8,-20)]:
  for dx in [-.11,.11]:rod('scale:leg',(x+dx,y,.03),(x+dx,y,.86),.075,'scale')
  box('scale:torso',(x,y,1.15),(.42,.25,.6),'scale',.07)
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.13,location=(x,y,1.58));finish(bpy.context.object,'scale:head','scale')
  for dx in [-.28,.28]:rod('scale:arm',(x+dx,y,1.39),(x+dx,y,1.0),.055,'scale')
 for prefix in ['site','podium','lobby','entry','core','slab','envelope','frame','structure','service','crown','antenna','scale']:
  col=bpy.data.collections.new(prefix.upper());scene.collection.children.link(col)
  for o in list(scene.objects):
   if o.name.startswith(prefix+':'):
    for coll in list(o.users_collection):coll.objects.unlink(o)
    col.objects.link(o)
 asset_dir=W/variant;asset_dir.mkdir(parents=True,exist_ok=True);asset_id='CL-T01-V16-'+variant.upper()
 scene['assetId']=asset_id;scene['stage']='CONCEPT_GEOMETRY_RESEARCH';scene['userApproved']=False
 bpy.context.view_layer.update()
 bpy.ops.wm.save_as_mainfile(filepath=str(asset_dir/'source.blend'))
 bounds=[o.matrix_world@Vector(c) for o in scene.objects if o.type=='MESH' for c in o.bound_box]
 lo=[min(v[i] for v in bounds) for i in range(3)];hi=[max(v[i] for v in bounds) for i in range(3)]
 source_parts=len([o for o in scene.objects if o.type=='MESH'])
 for material in M:
  for prefix in ['site','podium','lobby','entry','core','slab','envelope','frame','structure','service','crown','antenna','scale']:
   objs=[o for o in scene.objects if o.type=='MESH' and o.name.startswith(prefix+':') and o.data.materials and o.data.materials[0]==M[material]]
   if len(objs)>1:
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();objs[0].name=prefix+'__'+material
 dest=O/(variant+'.glb');bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_materials='EXPORT')
 tri=sum(len(f.vertices)-2 for o in scene.objects if o.type=='MESH' for f in o.data.polygons)
 card=dict(assetId=asset_id,candidate=variant,revision=cfg.revision,status='IN_PROGRESS',stage='CONCEPT_GEOMETRY_RESEARCH',internallyPassed=False,userApproved=False,uri='/models/citylight/v16-study/'+cfg.revision+'/'+variant+'.glb',sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),bytes=dest.stat().st_size,triangles=tri,sourceParts=source_parts,renderGroups=len([o for o in scene.objects if o.type=='MESH']),boundsZUp=dict(min=lo,max=hi),dimensionsMetres=[hi[i]-lo[i] for i in range(3)],source=(asset_dir/'source.blend').relative_to(R).as_posix(),script=Path(__file__).relative_to(R).as_posix(),sourceHash=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),licence='Original geometry; no external mesh, texture or paid tool',sections=sections,openDefects=['No approved curtainwall, PBR, reflection, furniture or street assets','Envelope is an opaque removable massing shell, not glass','Roof/service circulation needs geometry audit','No WALK or final city story claim'])
 (asset_dir/'design-card.json').write_text(json.dumps(card,ensure_ascii=False,indent=2),encoding='utf8');manifest.append(card)
 print('V16_STUDY_RESULT',json.dumps({k:v for k,v in card.items() if k!='sections'}))
(O/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
