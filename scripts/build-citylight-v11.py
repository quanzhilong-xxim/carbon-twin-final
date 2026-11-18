"""V11 side-by-side architectural candidates. Offline Blender, metre units.
Never writes v1/v2 assets. A authored swept wings; B deeply adapted CC0 source.
"""
import bpy, os, math, json, hashlib, importlib.util, random
from mathutils import Vector
spec=importlib.util.spec_from_file_location('geo',os.path.join(os.path.dirname(__file__),'build-city-landmarks.py'))
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
g.OUT=os.path.join(g.ROOT,'public/models/citylight/v11');os.makedirs(g.OUT,exist_ok=True)
box,beam,poly=g.box,g.beam,g.poly
for name,color,metal,rough in [
 ('curtain-glass',(.13,.23,.26),.62,.23),('curtain-silver',(.22,.31,.32),.57,.28),
 ('curtain-warm',(.17,.22,.23),.48,.31),('spandrel',(.045,.068,.075),.5,.4),
 ('anodized',(.42,.38,.28),.78,.32),('copper',(.32,.20,.105),.7,.42),
 ('interior-wall',(.59,.51,.38),0,.8),('interior-floor',(.32,.31,.27),.1,.5),
 ('paving',(.29,.31,.30),0,.86),('soil',(.055,.067,.043),0,.96),
 ('leaves-light',(.18,.27,.12),0,.84),('leaves-dark',(.07,.15,.09),0,.9)]:g.material(name,color,metal,rough)
g.material('light-strip',(1,.73,.43),0,.5,1.4)
g.material('clear-glass',(.7,.85,.88),0,.12)
p=g.MATS['clear-glass'].node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.86;p.inputs['IOR'].default_value=1.45

def chamfer(w,d):
 c=min(2.3,w*.23,d*.23)
 return [(-w+c,-d),(w-c,-d),(w,-d+c),(w,d-c),(w-c,d),(-w+c,d),(-w,d-c),(-w,-d+c)]

def panel_surface(shape,floors,start,height,variant=0,low=False):
 # The floor edge, inset glass and proud mullions are three physical depths.
 for f in range(floors):
  z=start+f*height; outline=shape(f/floors);nextline=shape((f+1)/floors)
  for side in range(len(outline)):
   a=Vector(outline[side]);b=Vector(outline[(side+1)%len(outline)])
   aa=Vector(nextline[side]);bb=Vector(nextline[(side+1)%len(outline)])
   length=(a-b).length;n=max(1,round(length/(3.1 if low else 1.6)))
   normal=Vector((b.y-a.y,-(b.x-a.x))).normalized()
   for k in range(n):
    u0=(k+.025)/n;u1=(k+.975)/n
    def pt(u,h,offset=0):
     v=a.lerp(b,u).lerp(aa.lerp(bb,u),h/height)+normal*offset
     return(v.x,v.y,z+h)
    code=(f//3*13+k//2*7+side*17+variant*19)%29
    mat='curtain-warm' if code<10 else 'curtain-silver' if code<15 else 'curtain-glass'
    if f in [2,3] and side==0 and k%3!=0:mat='clear-glass'
    poly(mat,[pt(u0,.23),pt(u1,.23),pt(u1,height-.55),pt(u0,height-.55)],[(0,1,2,3)])
    poly('spandrel',[pt(u0,height-.53,-.08),pt(u1,height-.53,-.08),pt(u1,height-.06,-.08),pt(u0,height-.06,-.08)],[(0,1,2,3)])
    if not low:
     beam('anodized',pt(k/n,0,.16),pt(k/n,height,.16),.045,4)
     beam('anodized',pt(k/n,height-.53,.09),pt((k+1)/n,height-.53,.09),.038,4)
     # Partial interior light behind selected shaded panes, not uniformly lit glass.
     if code<7:
      poly('light-strip',[pt(u0+.04,.8,-.08),pt(u1-.04,.8,-.08),pt(u1-.04,2.25,-.08),pt(u0+.04,2.25,-.08)],[(0,1,2,3)])
   beam('anodized',(a.x,a.y,z+height),(b.x,b.y,z+height),.075,4)
  if f in [2,3]:
   # Selected two inspectable floors with actual desk/ceiling/wall geometry.
   front=outline[0][1];cx=sum(p[0] for p in outline)/len(outline)
   for h in [.12,height-.18]:box('interior-floor',(cx,front+3,z+h),(12,5,.13))
   box('interior-wall',(cx,front+5.3,z+1.7),(12,.12,3))
   for x in [-4,-1,2,5]:
    box('limestone',(cx+x,front+2.7,z+.85),(1.5,.8,.1))
    for dx in [-.6,.6]:box('anodized',(cx+x+dx,front+2.7,z+.44),(.06,.65,.8))
    box('roof',(cx+x,front+2.8,z+1.12),(.5,.08,.35))
    box('cloth',(cx+x,front+3.7,z+.6),(.55,.6,.1))
    box('light-strip',(cx+x,front+2.5,z+height-.35),(2,.12,.06))

def terrace(cx,cy,z,w,d):
 box('roof',(cx,cy,z),(w,d,.24))
 for y in [-d/2+.3,d/2-.3]:
  beam('anodized',(cx-w/2,cy+y,z+1.15),(cx+w/2,cy+y,z+1.15),.05,6)
  for x in range(int(-w/2),int(w/2)+1,3):beam('anodized',(cx+x,cy+y,z),(cx+x,cy+y,z+1.15),.035,5)
 for x in [-w/2+.8,w/2-.8]:
  box('limestone',(cx+x,cy,z+.4),(1.1,d-1,.65));box('leaves-dark',(cx+x,cy,z+.85),(.9,d-1.2,.3))
 for x in [-w*.2,w*.2]:
  box('roof',(cx+x,cy+1,z+.7),(2.3,2.8,1.2))
  for j in range(7):box('anodized',(cx+x,cy+.1+j*.35,z+1.34),(2.1,.08,.07))

def podium():
 # Double-height colonnade, inset shops, articulated stone roof edge and entry.
 for h,w,d in [(.14,59,43),(.3,57,41),(.46,55,39)]:box('limestone',(0,0,h),(w,d,.16))
 for z in [.62,5.5,10.8]:box('interior-floor',(0,0,z),(52,35,.24))
 for x in range(-24,25,4):
  for y in [-16.8,16.8]:box('limestone',(x,y,5.65),(.65,.85,10))
  for z in [3,8.2]:
   box('clear-glass',(x+1.7,-16,z),(2.7,.075,4.4))
   box('anodized',(x+.3,-16.1,z),(.1,.17,4.6))
 for x in [-25.8,25.8]:
  for y in range(-14,15,4):
   box('clear-glass',(x,y,5.7),(.08,3.7,9.5));box('anodized',(x,y-1.9,5.7),(.16,.12,10))
 box('interior-wall',(0,11,3),(49,.25,4.6))
 for x in [-20,-12,12,20]:
  box('interior-wall',(x,2,2.8),(.15,18,4.2))
  box('limestone',(x,-8,1),(3,1,.6))
  box('cloth',(x,-7.7,1.5),(3,.25,.5))
  for y in [-11,-4,4]:box('light-strip',(x,y,5.2),(3,.15,.07))
 box('copper',(0,-5,1.2),(6.5,1.5,1.2))
 box('interior-wall',(0,1,2.7),(8,.25,4.1))
 for x in [-3,0,3]:
  box('clear-glass',(x,-17.1,2.8),(2.8,.07,4.2));box('anodized',(x-1.45,-17.2,2.8),(.12,.17,4.4))
  box('anodized',(x+.2,-17.25,2.6),(.06,.12,.65))
 box('copper',(0,-20,5.6),(18,8,.22))
 for x in [-8,8]:box('anodized',(x,-23.2,2.85),(.22,.22,5.3))
 for x in [-6,-2,2,6]:box('light-strip',(x,-20,5.4),(.08,6,.035))
 for x in range(-25,26):box('anodized',(x,-18,10.8),(.085,.35,.6))
 terrace(0,0,11,54,36)

def ellipsoid(mat,p,s,seed):
 r=random.Random(seed);seg=7;lev=5
 vs=[(p[0]+s[0]*math.sin(j*math.pi/lev)*math.cos(i*math.tau/seg)*(1+r.uniform(-.15,.15)),p[1]+s[1]*math.sin(j*math.pi/lev)*math.sin(i*math.tau/seg),p[2]+s[2]*math.cos(j*math.pi/lev))for j in range(1,lev)for i in range(seg)]
 vs.extend([(p[0],p[1],p[2]+s[2]),(p[0],p[1],p[2]-s[2])]);top=len(vs)-2;bottom=len(vs)-1
 faces=[(j*seg+i,j*seg+(i+1)%seg,(j+1)*seg+(i+1)%seg,(j+1)*seg+i)for j in range(lev-2)for i in range(seg)]
 faces.extend([(top,(i+1)%seg,i)for i in range(seg)]);faces.extend([(bottom,(lev-2)*seg+i,(lev-2)*seg+(i+1)%seg)for i in range(seg)])
 poly(mat,vs,faces)

def frontage():
 box('paving',(0,0,-.14),(94,84,.25))
 # Actual edge, curb ramps, drainage and 1m paving joint grid near the entrance.
 for y in [-32,32]:box('limestone',(0,y,.08),(87,.3,.18))
 for x in range(-42,43,2):box('spandrel',(x,-24,.002),(.012,15,.012))
 for y in range(-31,-16,2):box('spandrel',(0,y,.003),(86,.012,.012))
 for x in [-31,31]:
  box('limestone',(x,10,.36),(5,14,.72));box('soil',(x,10,.73),(4.6,13.6,.05))
  for q,y in enumerate([5,14]):
   beam('bark',(x,y,.75),(x+.15,y,5.7),.18,8)
   for j in range(9):
    a=j*2.4;end=(x+math.cos(a)*1.8,y+math.sin(a)*1.6,4.5+(j%3)*.8)
    beam('bark',(x,y,2.8+(j%3)*.5),end,.075,6)
    ellipsoid('leaves-light'if j%3 else'leaves-dark',end,(1.15,1.1,1.35),j+q*40)
  # Slatted cantilever seats retain human scale under close inspection.
  for y in [-12,-2,22]:
   for j in range(6):box('copper',(x-.9+j*.32,y,.63),(.27,3,.09))
   for dy in [-1.1,1.1]:box('anodized',(x,y+dy,.32),(1.8,.12,.6))
 for x in [-24,-16,-8,8,16,24]:
  box('anodized',(x,-30,.5),(.16,.16,1));box('light-strip',(x,-30,.92),(.18,.18,.13))

def candidate_a(low=False):
 for wing in [0,1]:
  height=115.2 if wing==0 else 100.8;floors=32 if wing==0 else 28
  def shape(t):
   cx=(-11 if wing==0 else 12)+(2.4*math.sin(t*math.pi)if wing==0 else-2*t)
   cy=1+(-2 if wing==0 else 2)*t
   tier=0 if t<.375 else 1 if t<.719 else 2
   w=(9.7 if wing==0 else 9.0)*(1-.12*t)-tier*.65
   d=13.2*(1-.12*t)-tier*.65
   return [(x+cx,y+cy)for x,y in chamfer(w,d)]
  panel_surface(shape,floors,11.2,height/floors,wing,low)
  for t in [.375,.719]:
   o=shape(t-.001);cx=sum(p[0]for p in o)/8;cy=sum(p[1]for p in o)/8
   terrace(cx,cy,11.2+t*height,(max(p[0]for p in o)-min(p[0]for p in o)),(max(p[1]for p in o)-min(p[1]for p in o)))
  # Broad bronze ribs tie the stepped lantern to the occupied body.
  for index in [0,2,4,6]:
   pts=[(*shape(t)[index],11.2+t*height)for t in [i/12 for i in range(13)]]
   for a,b in zip(pts,pts[1:]):beam('anodized',a,b,.14,6)
  o=shape(1);cx=sum(p[0]for p in o)/8;cy=sum(p[1]for p in o)/8;z=11.2+height
  terrace(cx,cy,z,17 if wing==0 else 15.5,22)
  for k in range(8):
   x=cx-8+k*2.25
   box('anodized',(x,cy,z+2.5),( .12,18,5-k*.25))
   box('light-strip',(x,cy-8,z+2.2),(.08,.08,2.8))
 # A legible elevated winter garden spans the separate wings, with structure.
 for z in [84,91]:box('roof',(0,0,z),(14,20,.32))
 for x in [-6,6]:
  for y in [-9.8,9.8]:beam('anodized',(x,y,84),(x,y,91),.18,6)
 for x in range(-6,7,2):box('clear-glass',(x,-10,87.5),(1.9,.06,6.6))
 for y in [-10,10]:
  beam('copper',(-7,y,84),(7,y,91),.18,6);beam('copper',(-7,y,91),(7,y,84),.18,6)
  box('light-strip',(0,y,90.7),(12,.09,.08))
 podium();frontage()

def candidate_b(low=False):
 # An asymmetric sequence of occupied terraces instead of two swept wings.
 for tier,(cx,cy,w,d,z,floors) in enumerate([(0,0,19,13,11.2,12),(-3,1,16,12,54.4,10),(-6,2,12.5,10,90.4,9)]):
  def shape(t):return[(x+cx,y+cy)for x,y in chamfer(w-.6*t,d-.3*t)]
  panel_surface(shape,floors,z,3.6,tier+3,low)
  terrace(cx,cy,z+floors*3.6,w*2,d*2)
  for k in [-1,1]:
   box('limestone',(cx+k*(w-.6),cy-1,z+floors*1.8),(.5,2.7,floors*3.6))
 # A screened double-height crown; side profile cut at a deliberate slope.
 for i in range(15):
  x=-17+i*1.55;h=6+(i/14)*4
  box('anodized',(x,2,122.8+h/2),(.14,16,h))
 box('roof',(-6,2,123),(21,17,.4))
 for x in [-13,-8,-3,2]:box('light-strip',(x,-5.8,126),(.08,.08,3.2))
 podium();frontage()

def append_kenney(filepath):
 # Source mass is imported, split, rescaled and inset into a serviced podium wing.
 # Main silhouette, all facade framing, terraces and entry are newly authored.
 bpy.ops.import_scene.gltf(filepath=filepath)
 imported=list(bpy.context.selected_objects)
 meshes=[o for o in imported if o.type=='MESH']
 corners=[o.matrix_world@Vector(c)for o in meshes for c in o.bound_box]
 lo=Vector(tuple(min(v[i]for v in corners)for i in range(3)));hi=Vector(tuple(max(v[i]for v in corners)for i in range(3)))
 for o in meshes:
  o.name='CC0_adapted_service_annex_'+o.name
  for v in o.data.vertices:
   world=o.matrix_world@v.co;v.co=Vector(((world.x-(lo.x+hi.x)/2)*11/(hi.x-lo.x)+19,(world.y-(lo.y+hi.y)/2)*8/(hi.y-lo.y)+8,(world.z-lo.z)*8/(hi.z-lo.z)+.6))
  o.matrix_world.identity()
  o.data.materials.clear();o.data.materials.append(g.MATS['limestone'])
 return len(meshes)

records=[]
for name,fn in [('tide-gate-a',candidate_a),('terrace-lantern-b',candidate_b)]:
 for low in [False,True]:
  fn(low);tag=name+('-lod'if low else'');stats=g.export(tag)
  source=os.path.join(g.ROOT,'work/citylight-v11-research/kenney-source.glb')
  if name.endswith('-b') and os.path.exists(source):
   stats['adaptedSourceMeshes']=append_kenney(source)
   stats['triangles']=sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons)
   bpy.ops.export_scene.gltf(filepath=os.path.join(g.OUT,tag+'.glb'),export_format='GLB',export_yup=True,export_apply=True)
  # Keep editable source scene with material-batched architecture and CC0 annex.
  bpy.ops.wm.save_as_mainfile(filepath=os.path.join(g.ROOT,'work',tag+'.blend'))
  coordinates=[o.matrix_world@v.co for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices]
  bounds=[[min(v[i]for v in coordinates),max(v[i]for v in coordinates)]for i in range(3)]
  asset=os.path.join(g.OUT,tag+'.glb');stats.update(bytes=os.path.getsize(asset),sha256=hashlib.sha256(open(asset,'rb').read()).hexdigest(),id='CL-H11-A'if name.endswith('-a')else'CL-H11-B',lod=low,editableSource='work/'+tag+'.blend',blenderBounds=bounds,unit='metre')
  records.append(stats)
with open(os.path.join(g.OUT,'manifest.json'),'w',encoding='utf8')as f:json.dump(records,f,ensure_ascii=False,indent=2)
print('V11_ASSETS '+json.dumps([{k:v for k,v in r.items()if k!='materials'}for r in records]))
