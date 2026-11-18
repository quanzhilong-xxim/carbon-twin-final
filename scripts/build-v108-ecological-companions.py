"""Original reusable companion meshes. No downloads, tokens or paid API.
Creates an editable Blender source plus separate web GLBs; never touches old assets.
"""
import bpy,math,json,hashlib,random
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];O=R/'public/models/behaviour-v108';O.mkdir(exist_ok=True)
if (O/'companions.blend').exists():raise RuntimeError('Refusing to overwrite source')
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name,c,rough=.7,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
fur=mat('warm tabby fur',(.48,.27,.115));cream=mat('warm ivory fur',(.86,.77,.59));dark=mat('tabby stripe',(.20,.11,.055));pink=mat('nose and ear cartilage',(.55,.25,.23));eye=mat('amber iris',(.61,.38,.08),.21);black=mat('pupil and hoof',(.018,.022,.021),.4);glint=mat('corneal light',(.96,.98,.9),.15)
white=mat('dairy ivory',(.80,.79,.70));patch=mat('charcoal coat patches',(.028,.039,.035));wool=mat('oatmeal wool',(.78,.74,.62),.98);horn=mat('warm horn',(.50,.41,.28))
roots={}
def group(n,p=None,pos=(0,0,0)):
 o=bpy.data.objects.new(n,None);bpy.context.scene.collection.objects.link(o);o.location=pos;o.parent=p;return o
def ell(n,pos,scale,m,p,segments=24):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=16,radius=1);o=bpy.context.object;o.name=n;o.location=pos;o.scale=scale;o.data.materials.append(m);o.parent=p
 for f in o.data.polygons:f.use_smooth=True
 return o
def tube(n,pts,r,m,p):
 d=bpy.data.curves.new(n,'CURVE');d.dimensions='3D';d.resolution_u=8;d.bevel_depth=r;d.bevel_resolution=3;s=d.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
 for i,(b,co) in enumerate(zip(s.bezier_points,pts)):b.co=co;b.handle_left_type=b.handle_right_type='AUTO';b.radius=1 if i<len(pts)-1 else .35
 o=bpy.data.objects.new(n,d);bpy.context.scene.collection.objects.link(o);d.materials.append(m);o.parent=p;return o
def ear(n,side,p,m,inner,cat=False):
 g=group(n,p,(side*(.112 if cat else .20),.092 if cat else .07,0))
 if cat:
  v=[(-.055,0,-.035),(.055,0,-.035),(0,.15,-.005),(-.04,0,.025),(.04,0,.025),(0,.135,.027)];f=[(0,1,2),(3,5,4),(0,3,4,1),(0,2,5,3),(1,4,5,2)]
  d=bpy.data.meshes.new(n);d.from_pydata(v,[],f);o=bpy.data.objects.new(n,d);bpy.context.scene.collection.objects.link(o);o.parent=g;d.materials.append(m)
  ell(n+' inner',(0,.058,.024),(.025,.059,.006),inner,g)
 else:ell(n+' pinna',(side*.035,0,0),(.11,.04,.06),m,g);ell(n+' inner',(side*.035,.012,.035),(.075,.019,.018),inner,g)
 return g
# All assets use glTF's Y-up directly; Blender exporter converts the scene.
# Coordinates below are authored Y-up then transformed to Blender Z-up once.
cat=group('CT_TabBy_Companion');roots['cat']=cat
body=group('Breath',cat);ell('cat ribcage',(0,.29,-.03),(.14,.18,.25),fur,body);ell('cat chest bib',(0,.35,.156),(.095,.13,.045),cream,body)
head=group('Head',cat,(0,.49,.16));ell('cat cranial form',(0,.018,0),(.15,.13,.123),fur,head)
for side in [-1,1]:
 ear('EarLeft' if side<0 else 'EarRight',side,head,fur,pink,True)
 ell('cheek muzzle',(side*.038,-.035,.107),(.046,.032,.024),cream,head)
 ell('eye globe',(side*.065,.035,.104),(.043,.035,.022),cream,head)
 iris=ell('EyeLeft' if side<0 else 'EyeRight',(side*.065,.035,.125),(.025,.027,.008),eye,head)
 ell('vertical pupil',(side*.065,.035,.132),(.005,.024,.0025),black,head)
 ell('corneal catchlight',(side*.065-.008,.046,.135),(.005,.006,.002),glint,head)
 for j in range(3):tube('tapered whisker',[(side*.035,-.038+j*.006,.128),(side*.14,-.038+j*.018,.145),(side*.21,-.07+j*.036,.15)],.0007,cream,head)
 for j in range(3):ell('tabby cheek marking',(side*(.10+j*.006),.002-j*.018,.075),(.023,.007,.016),dark,head)
ell('rose nose',(0,-.019,.137),(.016,.011,.008),pink,head)
tube('mouth seam',[(0,-.027,.137),(0,-.047,.137),(-.019,-.055,.125)],.0017,dark,head)
tube('mouth seam R',[(0,-.047,.137),(.019,-.055,.125)],.0017,dark,head)
for x in [-.09,.09]:
 for z in [-.17,.12]:
  ell('cat leg',(x,.15,z),(.043,.125,.048),fur,cat);ell('soft paw',(x,.048,z+.028),(.052,.038,.075),cream,cat)
  for j in [-1,0,1]:ell('paw toe',(x+j*.023,.038,z+.078),(.016,.018,.024),cream,cat,16)
tail=group('Tail',cat,(0,.28,-.23));tube('tapered cat tail',[(0,0,0),(.16,.02,-.09),(.24,.15,-.05),(.23,.25,.015)],.03,fur,tail)
for i in range(5):ell('back stripe',(0,.36+i*.013,-.17+i*.04),(.135,.015,.013),dark,body)

def stock(kind):
 cow=kind=='cow';root=group('CT_DairyCow' if cow else 'CT_PastureSheep');roots[kind]=root;body=group('Breath',root)
 ell('ribcage',(0,.88 if cow else .55,0),(.34 if cow else .27,.37 if cow else .28,.67 if cow else .43),white if cow else wool,body)
 head=group('Head',root,(0,1.02 if cow else .67,.67 if cow else .46))
 ell('neck',(0,-.04,-.13),(.19 if cow else .13,.26 if cow else .17,.23 if cow else .17),white if cow else cream,head)
 ell('cranium',(0,.025,.07),(.21 if cow else .12,.25 if cow else .17,.22 if cow else .14),white if cow else cream,head)
 ell('muzzle',(0,-.13 if cow else -.045,.23 if cow else .14),(.20 if cow else .10,.12 if cow else .085,.13 if cow else .09),pink if cow else cream,head)
 for side in [-1,1]:
  ear('EarLeft' if side<0 else 'EarRight',side,head,white if cow else cream,pink)
  ell('dark eye',(side*(.185 if cow else .10),.064,.165 if cow else .098),(.022,.027,.022),black,head)
  ell('eye glint',(side*(.19 if cow else .104),.074,.179 if cow else .11),(.005,.006,.005),glint,head,16)
  ell('nostril',(side*(.10 if cow else .05),-.105 if cow else -.035,.344 if cow else .221),(.022,.014,.004),black,head,16)
  if cow:tube('short curved horn',[(side*.135,.19,-.025),(side*.17,.30,-.01),(side*.20,.32,.035)],.03,horn,head)
 for x in [-.235,.235] if cow else [-.17,.17]:
  for z in [-.43,.43] if cow else [-.26,.26]:
   ell('upper leg',(x,.49 if cow else .31,z),(.10 if cow else .066,.25 if cow else .15,.12 if cow else .073),white if cow else cream,root)
   ell('hock',(x,.23 if cow else .15,z-.015),(.058 if cow else .043,.19 if cow else .12,.065 if cow else .05),white if cow else cream,root)
   ell('hoof',(x,.062,z+.01),(.073 if cow else .052,.062,.095 if cow else .065),black,root)
   tube('hoof division',[(x,.022,z+.099),(x,.08,z+.089)],.0025,cream,root)
 tail=group('Tail',root,(0,.98 if cow else .66,-.62 if cow else -.40));tube('tail strand',[(0,0,0),(.07,-.14,-.1),(.09,-.40,-.13)],.022 if cow else .035,white if cow else wool,tail)
 if cow:
  ell('tail switch',(.09,-.41,-.13),(.05,.10,.035),patch,tail)
  ell('udder',(0,.52,.25),(.16,.13,.18),pink,root)
  for x in [-.07,.07]:
   for z in [.17,.32]:ell('teat',(x,.395,z),(.018,.055,.018),pink,root,16)
  # Separate coat patches follow the body curvature; authored once for instancing.
  for s in [-1,1]:
   for j in range(4):
    z=-.40+j*.25;y=.90+math.sin(j*2.1)*.15
    o=ell('dairy coat patch',(s*.322,y,z),(.017,.11+(j%2)*.06,.13),patch,body);o.rotation_euler.x=.3*j
  ell('forehead blaze',(0,.12,.19),(.08,.13,.04),patch,head)
 else:
  random.seed(108)
  for i in range(64):
   a=i*2.39996;h=-1+2*(i+.5)/64;r=math.sqrt(1-h*h)
   ell('layered fleece curl',(.27*math.cos(a)*r,.55+.27*h,.43*math.sin(a)*r),(.075,.075,.09),wool,body,12)
 return root
stock('cow');stock('sheep')
# Convert all authored Y-up transforms to Blender Z-up with a single parent,
# then bake the top transform for a clean Y-up glTF root.
for root in roots.values():root.rotation_euler.x=math.pi/2
for o in list(bpy.context.scene.objects):
 if o.type=='CURVE':
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
bpy.ops.wm.save_as_mainfile(filepath=str(O/'companions.blend'))
record={'license':'CC0-1.0','author':'CarbonTwin original procedural geometry','external_assets':[],'paid_calls':0,'source_script':'scripts/build-v108-ecological-companions.py','files':[]}
for key,root in roots.items():
 members=[root,*root.children_recursive];bpy.ops.object.select_all(action='DESELECT')
 for o in members:o.select_set(True)
 bpy.context.view_layer.objects.active=root;p=O/(key+'.glb');bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_animations=False)
 record['files'].append(dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
(O/'sources.json').write_text(json.dumps(record,indent=2));print('COMPANIONS_EXPORTED',flush=True)
