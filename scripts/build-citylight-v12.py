"""V12 single Light Tower remediation. Original metre-scale offline geometry.
No service API; V11 and original project assets are never written.
"""
import bpy, bmesh, os, math, json, hashlib, importlib.util, random
from mathutils import Vector
spec=importlib.util.spec_from_file_location('geo',os.path.join(os.path.dirname(__file__),'build-city-landmarks.py'))
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
g.OUT=os.path.join(g.ROOT,'public/models/citylight/v12');os.makedirs(g.OUT,exist_ok=True)
box,beam,poly=g.box,g.beam,g.poly
SOFT_BOX_CACHE={}
def soft_box(mat,pos,size,angle=0,radius=.025):
 # Beveled furniture edges, cached by dimensions before material batching.
 key=(*size,radius)
 if key not in SOFT_BOX_CACHE:
  bm=bmesh.new();bmesh.ops.create_cube(bm,size=1)
  for v in bm.verts:v.co.x*=size[0];v.co.y*=size[1];v.co.z*=size[2]
  bmesh.ops.bevel(bm,geom=list(bm.edges),offset=min(radius,min(size)*.22),segments=2,affect='EDGES');bm.verts.ensure_lookup_table();bm.verts.index_update()
  SOFT_BOX_CACHE[key]=([tuple(v.co)for v in bm.verts],[tuple(v.index for v in f.verts)for f in bm.faces]);bm.free()
 verts,faces=SOFT_BOX_CACHE[key];x,y,z=pos;c,s=math.cos(angle),math.sin(angle)
 poly(mat,[(x+a*c-b*s,y+a*s+b*c,z+h)for a,b,h in verts],faces)
for n,c,m,r in [
 ('v12-frame',(.17,.20,.21),.72,.3),('v12-bronze',(.37,.27,.16),.7,.35),
 ('v12-edge',(.36,.38,.37),.28,.45),('v12-spandrel',(.065,.09,.105),.3,.36),
 ('v12-stone',(.62,.59,.52),0,.68),('v12-paving',(.39,.40,.38),0,.88),
 ('v12-joint',(.16,.18,.18),0,.9),('v12-wall',(.58,.55,.48),0,.8),
 ('v12-wood',(.28,.14,.065),0,.58),('v12-carpet',(.15,.18,.19),0,.97),
 ('v12-cloth',(.31,.35,.33),0,.93),('v12-black',(.035,.041,.045),.15,.68),
 ('v12-leaf-a',(.12,.24,.09),0,.88),('v12-leaf-b',(.20,.31,.105),0,.84),
 ('v12-soil',(.055,.043,.029),0,.99)]:g.material(n,c,m,r)
g.material('v12-glass',(.72,.82,.83),0,.115)
p=g.MATS['v12-glass'].node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.78;p.inputs['IOR'].default_value=1.46
g.material('v12-lobby-glass',(.86,.91,.91),0,.065)
p=g.MATS['v12-lobby-glass'].node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.92;p.inputs['IOR'].default_value=1.46
g.material('v12-lamp',(1,.81,.56),0,.42,2)
g.material('v12-screen',(.13,.25,.3),0,.45,.12)
for i in range(8):
 g.material('v12-room-'+str(i),(.64+i*.012,.59+i*.008,.49+i*.004),0,.88,.025)
 g.material('v12-light-'+str(i),(1,.73+i*.022,.43+i*.035),0,.45,1)

def rounded(w,d,r=3,segments=5):
 pts=[]
 for cx,cy,start in [(w-r,-d+r,-math.pi/2),(w-r,d-r,0),(-w+r,d-r,math.pi/2),(-w+r,-d+r,math.pi)]:
  for j in range(segments+1):
   a=start+j*math.pi/2/segments;pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
 return pts

def extrude(mat,points,z,h):
 n=len(points);vs=[(x,y,zz)for zz in [z,z+h]for x,y in points]
 faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)]
 poly(mat,vs,faces)

def desk(x,y,z,angle=0,detail=True):
 def b(mat,dx,dy,dz,w,d,h):
  xx=x+dx*math.cos(angle)-dy*math.sin(angle);yy=y+dx*math.sin(angle)+dy*math.cos(angle)
  (soft_box if mat in ['v12-wood','v12-cloth'] else box)(mat,(xx,yy,z+dz),(w,d,h),angle)
 b('v12-wood',0,0,.755,1.65,.82,.055)
 for dx in [-.68,.68]:
  b('v12-frame',dx,0,.38,.045,.65,.72)
 b('v12-frame',0,.22,.95,.12,.11,.31);b('v12-black',0,.23,1.15,.68,.055,.4)
 b('v12-screen',0,.195,1.15,.61,.008,.33);b('v12-black',0,-.18,.798,.43,.15,.025)
 # Five-star chair, inclined mesh back, armrests; actual local geometry.
 b('v12-cloth',0,-.82,.47,.51,.5,.1);b('v12-frame',0,-1.03,.74,.5,.055,.46)
 b('v12-black',0,-.82,.25,.065,.065,.36)
 if detail:
  chairx=x+.82*math.sin(angle);chairy=y-.82*math.cos(angle)
  for j in range(5):
   a=angle+j*math.tau/5;end=(chairx+.31*math.cos(a),chairy+.31*math.sin(a),z+.11)
   beam('v12-frame',(chairx,chairy,z+.14),end,.025,5)
  for dx in [-.29,.29]:b('v12-black',dx,-.8,.67,.035,.38,.035)
 else:
  b('v12-frame',0,-.82,.12,.6,.06,.035);b('v12-frame',0,-.82,.12,.06,.6,.035)

def sofa(x,y,z,angle=0):
 def b(mat,dx,dy,dz,w,d,h):(soft_box if mat=='v12-cloth' else box)(mat,(x+dx*math.cos(angle)-dy*math.sin(angle),y+dx*math.sin(angle)+dy*math.cos(angle),z+dz),(w,d,h),angle)
 b('v12-frame',0,0,.22,2.4,.82,.12)
 for dx in [-.76,0,.76]:b('v12-cloth',dx,0,.43,.72,.8,.25)
 b('v12-cloth',0,.35,.7,2.45,.17,.6)
 for dx in [-1.2,1.2]:b('v12-cloth',dx,0,.62,.14,.85,.4)
 for dx in [-1,1]:b('v12-frame',dx,0,.12,.06,.65,.2)

def lettering(text,pos,size,mat='v12-bronze'):
 # Locally generated Bfont geometry. No image decal, external font or network request.
 curve=bpy.data.curves.new('architectural signage','FONT');curve.body=text;curve.align_x='CENTER';curve.size=size;curve.extrude=.008;curve.resolution_u=4
 obj=bpy.data.objects.new('signage',curve);bpy.context.collection.objects.link(obj);obj.location=pos;obj.rotation_euler[0]=math.pi/2
 bpy.context.view_layer.update();evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
 poly(mat,[tuple(obj.matrix_world@v.co)for v in mesh.vertices],[tuple(p.vertices)for p in mesh.polygons]);evaluated.to_mesh_clear();bpy.data.objects.remove(obj,do_unlink=True)

def tree(x,y,size,seed,low):
 r=random.Random(seed);base=.45
 beam('bark',(x,y,base),(x+.09,y,base+size*.65),size*.023,8)
 for j in range(7):
  a=j*2.4;start=(x+.05,y,base+size*(.34+j*.025));end=(x+math.cos(a)*size*.27,y+math.sin(a)*size*.24,base+size*(.62+j%3*.08))
  beam('bark',start,end,size*.008,6)
  for k in range(7 if low else 24):
   aa=r.random()*math.tau;rad=r.random()*size*.22;cx=end[0]+math.cos(aa)*rad;cy=end[1]+math.sin(aa)*rad;zz=end[2]+r.uniform(-.5,.5)
   # Leaf clusters made of crossed irregular leaf surfaces, not one sphere.
   s=r.uniform(.26,.52)*(1.4 if low else 1);v=[(cx-s,cy,zz),(cx,cy-s*.7,zz+.13),(cx+s,cy,zz+.06),(cx,cy+s*.7,zz+.2)]
   # glTF exports these materials double-sided. Duplicate reverse faces are invalid Blender topology.
   poly('v12-leaf-a'if k%3 else'v12-leaf-b',v,[(0,1,2,3)])
   poly('v12-leaf-a',[(cx,cy-s,zz-.2),(cx,cy+s,zz-.2),(cx+s*.25,cy+s,zz+.3),(cx+s*.25,cy-s,zz+.3)],[(0,1,2,3)])

def tower(low=False):
 base=10.6;fh=3.65;floors=27
 for f in range(floors):
  z=base+f*fh
  w,d,cx,cy=(19,13.5,0,0)if f<18 else(15.5,12,-2.8,1.5)if f<24 else(12.7,10.4,-6,3)
  outline=[(x+cx,y+cy)for x,y in rounded(w,d,3.4,3 if low else 5)]
  extrude('v12-edge',outline,z,.15)
  extrude('v12-carpet',[(cx+(x-cx)*.97,cy+(y-cy)*.97)for x,y in outline],z+.16,.09)
  for side in range(len(outline)):
   a,b=Vector(outline[side]),Vector(outline[(side+1)%len(outline)]);length=(b-a).length
   if length<.03:continue
   normal=Vector((b.y-a.y,-(b.x-a.x))).normalized();tangent=(b-a).normalized();n=max(1,round(length/(2.8 if low else 1.7)))
   for k in range(n):
    l=a.lerp(b,(k+.025)/n);r=a.lerp(b,(k+.975)/n);width=(r-l).length
    def pt(p,h,off=0):return (p.x+normal.x*off,p.y+normal.y*off,z+h)
    poly('v12-glass',[pt(l,.24),pt(r,.24),pt(r,fh-.34),pt(l,fh-.34)],[(0,1,2,3)])
    poly('v12-spandrel',[pt(l,fh-.32,-.06),pt(r,fh-.32,-.06),pt(r,fh-.04,-.06),pt(l,fh-.04,-.06)],[(0,1,2,3)])
    beam('v12-frame',pt(a.lerp(b,k/n),.1,.12),pt(a.lerp(b,k/n),fh,.12),.035 if low else .045,4)
    # Perimeter rooms with real backs, ceilings and party walls, never luminous glass.
    # Tenant floor schedules, with occupied office bands and dim circulation/end bays.
    schedule=[4,1,0,3,7,0,5,1,4,6,2,0,7,1,5,6,4,3,0,2,5,7,1,3,6,5,4]
    code=schedule[f]
    if k//3 in [0,max(0,n//3-1)] and (f+side)%3:code=1 if code not in [1,4,7]else 3
    depth=3.8;left=l-normal*depth;right=r-normal*depth
    poly('v12-room-'+str(code),[pt(left,.25),pt(right,.25),pt(right,fh-.2),pt(left,fh-.2)],[(0,1,2,3)])
    # Three bays form one office. A wall behind every mullion hid all lit backs at oblique angles.
    if k%3==0:poly('v12-room-'+str(code),[pt(l,.25),pt(left,.25),pt(left,fh-.2),pt(l,fh-.2)],[(0,1,2,3)])
    poly('v12-room-'+str(code),[pt(l,fh-.18),pt(r,fh-.18),pt(right,fh-.18),pt(left,fh-.18)],[(3,2,1,0)])
    if (k+f+side)%3!=0:
     mid=(left+right)*.5+normal*1.4
     beam('v12-light-'+str(code),(mid.x-tangent.x*width*.28,mid.y-tangent.y*width*.28,z+fh-.24),(mid.x+tangent.x*width*.28,mid.y+tangent.y*width*.28,z+fh-.24),.026,4)
    if not low and length>8 and k%3==1:
     mid=(l+r)*.5-normal*2.3;angle=math.atan2(tangent.y,tangent.x)
     desk(mid.x,mid.y,z+.25,angle,f<3)
     if k%4==0:
      # Partial blind, not a full glowing rectangle covering the opening.
      for j in range(4):
       h=fh-.48-j*.12
       beam('v12-wood',pt(l,h,-.13),pt(r,h,-.13),.028,4)
   beam('v12-frame',pt(a,fh-.34,.09),pt(b,fh-.34,.09),.045,4)
  # Rhythmic vertical stone blades break long elevations, real depth/edge shadow.
  if not low:
   for x in [-12,-5.1,5.1,12]:
    if abs(x)<w-1:box('v12-bronze',(x+cx,-d+cy-.18,z+fh/2),(.09,.38,fh-.08))
 # Two functional setbacks with retained floor plates and human-scale terrace fittings.
 for f,w,d,cx,cy,oldw,oldd,oldcx,oldcy in [(18,15.5,12,-2.8,1.5,19,13.5,0,0),(24,12.7,10.4,-6,3,15.5,12,-2.8,1.5)]:
  z=base+f*fh
  deck=[(x+oldcx,y+oldcy)for x,y in rounded(oldw,oldd,3.4,5)]
  extrude('v12-stone',deck,z-.1,.2)
  for j,a in enumerate(deck):
   b=deck[(j+1)%len(deck)]
   beam('v12-frame',(*a,z+1.15),(*b,z+1.15),.025,6)
   beam('v12-frame',(*a,z+.15),(*a,z+1.15),.025,5)
  for yy in [-7,1,8]:
   xx=oldcx+oldw-1.7
   box('v12-stone',(xx,yy+oldcy,z+.4),(1.4,2,.6))
   for k in range(6):
    a=k*2.4;beam('v12-leaf-b',(xx,yy+oldcy,z+.65),(xx+math.cos(a)*.55,yy+oldcy+math.sin(a)*.7,z+1.2+k%3*.1),.15,5)
  if not low:
   sofa(oldcx+oldw-3.8,oldcy+4,z+.2,math.pi/2)
 # Crown: a low mechanical enclosure with ventilating louvers, not oversized opaque sails.
 z=base+floors*fh
 roof=[(x-6,y+3)for x,y in rounded(12.7,10.4,3.1,5)];extrude('v12-stone',roof,z,.3)
 for i in range(11):
  zz=z+.5+i*.18
  for yy in [-3.9,9.9]:box('v12-bronze',(-6,yy,zz),(19,.055,.055))
  for xx in [-15.5,3.5]:box('v12-bronze',(xx,3,zz),(.055,13.8,.055))
 for xx in [-15.5,-6,3.5]:
  for yy in [-3.9,9.9]:box('v12-frame',(xx,yy,z+1.2),(.065,.065,2.1))
 for x in [-13,-7,-1]:
  box('v12-frame',(x,1,z+.9),(4,5,1.5))
  for j in range(7):box('v12-edge',(x,-1.2+j*.65,z+1.7),(3.7,.12,.1))
 for x in [-17.9,5.9]:
  for y in range(-6,13,3):beam('v12-frame',(x,y,z+.2),(x,y,z+1.25),.025,5)
  beam('v12-frame',(x,-6,z+1.25),(x,12,z+1.25),.035,6)

def lobby(low):
 for z,w,d in [(.12,47,35),(.28,46,34),(.44,45,33)]:box('v12-stone',(0,0,z),(w,d,.16))
 box('v12-wall',(0,8,5.5),(42,.2,10));box('v12-carpet',(0,0,.55),(42,29,.15))
 # Upper side galleries and rear bridge leave a real 13m-wide atrium void.
 for x in [-14,14]:box('v12-stone',(x,0,5.6),(15,30,.3))
 box('v12-stone',(0,11,5.6),(44,8,.3))
 box('v12-stone',(0,0,10.4),(44,32,.3))
 for x in range(-21,22,3):
  for y in [-15.3,15.3]:box('v12-stone',(x,y,5.45),(.3,.65,9.5))
  for level in [0,1]:
   z=3+level*5
   poly('v12-lobby-glass',[(x+.05,-14.7,z-2.3),(x+2.65,-14.7,z-2.3),(x+2.65,-14.7,z+2.3),(x+.05,-14.7,z+2.3)],[(0,1,2,3)])
   box('v12-frame',(x-.1,-14.78,z),(.065,.12,4.7))
 for x in [-21.5,21.5]:
  for y in range(-12,13,3):poly('v12-lobby-glass',[(x,y-1.425,.8),(x,y+1.425,.8),(x,y+1.425,10.2),(x,y-1.425,10.2)],[(0,1,2,3)]if x>0 else[(3,2,1,0)])
 # Atrium columns, reception, elevator hall, actual sofa groups.
 for x in [-12,12]:
  for y in [-8,2]:beam('v12-stone',(x,y,.6),(x,y,10.2),.28,12)
 box('v12-stone',(0,-1,1.15),(6.4,1.4,1.2));box('v12-wood',(0,-1,1.82),(6.5,1.48,.1))
 for j in range(32):box('v12-wood',(-3.1+j*.2,-1.725,1.14),(.085,.075,1.12))
 for j in range(29):box('v12-wood',(-3.5+j*.25,7.64,2.5),(.08,.1,3.8))
 lettering('LIGHT COURT',(0,7.5,3.6),.42)
 lettering('LIGHT COURT',(0,-21.08,4.36),.29)
 for x in [-2,0,2]:box('v12-black',(x,-.9,2.03),(.5,.08,.32))
 for x in [-7,0,7]:
  box('v12-frame',(x,7.85,2),(2.35,.12,2.9))
  for xx in [-.57,.57]:box('v12-edge',(x+xx,7.73,2),(1.1,.025,2.7))
  box('v12-lamp',(x,7.68,3.6),(.55,.04,.08))
 for x in [-15,15]:
  for y in [-7,-1]:sofa(x,y,.65,0 if x<0 else math.pi)
  box('v12-wood',(x,-4,1.05),(1.5,1.3,.09))
  beam('v12-frame',(x,-4,.6),(x,-4,1),.035,8)
 for x in range(-18,19,6):
  for y in [-9,1]:box('v12-lamp',(x,y,5.36),(3.5,.06,.04))
 # Upper coworking gallery, glass partitions, tables at both ends.
 for x in [-14,-9,9,14]:
  desk(x,-8,5.84,0,not low)
 for x in [-6.35,6.35]:
  box('v12-lobby-glass',(x,-3.5,6.3),(.015,21,1.1))
  beam('v12-bronze',(x,-14,6.9),(x,7,6.9),.032,6)
  for y in [-12,-6,0,6]:beam('v12-frame',(x,y,5.8),(x,y,6.9),.022,6)
 for y in [-11,-6,0]:box('v12-lamp',(0,y,10.1),(5,.07,.04))
 for y,z in [(-4,8.2),(-8,7.5)]:
  for x in [-2.1,2.1]:beam('v12-frame',(x,y,z),(x,y,10.2),.009,5)
  box('v12-frame',(0,y,z),(4.8,.15,.1));box('v12-lamp',(0,y,z-.055),(4.6,.12,.018))
 # Independently supported canopy: small repeated fins rather than an oversized brown plate.
 for j in range(18):box('v12-bronze',(-8.5+j,-18.4,4.65),(.12,6.3,.22))
 box('v12-lobby-glass',(0,-18.4,4.79),(18.2,6.3,.016))
 for y in [-16,-21]:box('v12-frame',(0,y,4.5),(19,.12,.22))
 for x in [-8.9,8.9]:beam('v12-bronze',(x,-20.7,.6),(x,-20.7,4.5),.075,8)
 for x in [-3,0,3]:box('v12-frame',(x,-14.85,2.7),(.07,.08,4.4))
 for x in [-1.4,1.4]:box('v12-bronze',(x,-14.9,2.25),(.04,.12,.7))

def parcel(low):
 box('v12-paving',(0,0,-.15),(76,66,.3))
 # Staggered slabs and subdued joints, actual physical scale.
 for x in range(-35,36,2):box('v12-joint',(x,-24,.006),(.008,14,.006))
 for y in range(-30,-16,2):box('v12-joint',(0,y,.007),(72,.008,.006))
 for x in [-29,29]:
  box('v12-stone',(x,0,.27),(4.4,26,.54));box('v12-soil',(x,0,.55),(3.95,25.6,.04))
  for k,y in enumerate([-8,2,10]):tree(x,y,6.4+k*.25,100+k+int(x),low)
  for y in [-17,17]:
   for j in range(7):box('v12-wood',(x-1+j*.3,y,.57),(.25,2.5,.06))
   for yy in [-.9,.9]:box('v12-frame',(x,y+yy,.28),(2,.09,.5))
 for x in [-23,-15,-7,7,15,23]:
  box('v12-frame',(x,-28,.47),(.12,.12,.94));box('v12-lamp',(x,-28,.85),(.15,.15,.1))
 for y in [-29.5,29.5]:box('v12-stone',(0,y,.07),(72,.18,.14))

records=[]
for low in [False,True]:
 tower(low);lobby(low);parcel(low)
 tag='light-court'+('-lod'if low else'');stats=g.export(tag)
 bounds=[obj.matrix_world@Vector(corner) for obj in bpy.context.scene.objects if obj.type=='MESH' for corner in obj.bound_box]
 lo=[min(v[i] for v in bounds)for i in range(3)];hi=[max(v[i] for v in bounds)for i in range(3)]
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(g.ROOT,'work',tag+'-v12.blend'))
 asset=os.path.join(g.OUT,tag+'.glb')
 stats.update(id='CL-T01-V12',file=tag+'.glb',bytes=os.path.getsize(asset),sha256=hashlib.sha256(open(asset,'rb').read()).hexdigest(),editableSource='work/'+tag+'-v12.blend',unit='metre',height=round(hi[2],4),boundsZUp={'min':lo,'max':hi,'includesParcel':True},footprint=[47,35],parcel=[76,66],lod=low,provenance='Original geometry; no external model; parts batched by material',interiors='Actual three-bay perimeter offices on all floors; high LOD has desks along all straight elevations; double-height lobby plus gallery; no claim of complete interior fit-out',status='UNAPPROVED_REMEDIATION')
 records.append(stats)
with open(os.path.join(g.OUT,'manifest.json'),'w',encoding='utf8')as f:json.dump(records,f,ensure_ascii=False,indent=2)
print('V12_ASSETS '+json.dumps([{k:v for k,v in r.items()if k!='materials'}for r in records]))
