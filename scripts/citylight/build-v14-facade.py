"""Original metre-scale G2 material/geometry research specimen. Not a passed building."""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2]; A=R/'work/citylight-v14-assets/CL-G2-FACADE-14';A.mkdir(parents=True,exist_ok=True)
O=R/'public/models/citylight/v14-lab';O.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
M={}
def material(name,color,metal=0,rough=.5):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;M[name]=m;return m
for name,c,m,r in [('bronze',(.24,.17,.09),.8,.27),('frame',(.085,.10,.105),.8,.29),('limestone',(.62,.59,.52),0,.73),('wall',(.72,.69,.61),0,.85),('parquet',(.27,.12,.049),0,.5),('fabric',(.26,.30,.29),0,.94),('chair-mesh',(.055,.065,.063),0,.83),('chrome',(.48,.5,.51),1,.23),('black',(.025,.03,.033),.08,.55),('screen',(.075,.14,.16),0,.34),('paper',(.84,.82,.74),0,.85),('leaf',(.08,.18,.06),0,.8),('soil',(.04,.03,.018),0,1),('porcelain',(.55,.54,.49),0,.32),('light',(.96,.79,.52),0,.3),('glass',(.92,.97,.96),0,.075)]:material(name,c,m,r)
p=M['glass'].node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.82;p.inputs['IOR'].default_value=1.5
p=M['light'].node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.78,.48,1);p.inputs['Emission Strength'].default_value=1
counts={};parts=[]
def finish(obj,name,mat,bevel=0):
 obj.name=name;obj.data.materials.append(M[mat]);obj['assetId']='CL-G2-FACADE-14';obj['part']=name
 if bevel:
  mod=obj.modifiers.new('Manufactured edge radius','BEVEL');mod.width=bevel;mod.segments=3
  bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in obj.data.polygons:p.use_smooth=False
 parts.append(obj);counts[mat]=counts.get(mat,0)+1;return obj
def box(name,p,s,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,mat,bevel)
def cylinder(name,a,b,r,mat,vertices=12):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=(a+b)*.5);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,name,mat)
def cushion(name,p,s,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,location=p);o=bpy.context.object;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,mat)
def chair(x,y,z,angle=0):
 before=len(parts)
 box('chair-upholstered-seat',(x,y,z+.48),(.51,.48,.10),'fabric',.043)
 # Curved shell with visible lumbar bow. A real mesh, not a flat back card.
 vs=[]
 for h in range(9):
  for k in range(13):
   xx=(k/12-.5)*.49;zz=z+.60+h/8*.48;yy=y+.22+.045*(xx/.245)**2+.055*math.sin(h/8*math.pi)
   vs.append((x+xx,yy,zz))
 faces=[(h*13+k,h*13+k+1,(h+1)*13+k+1,(h+1)*13+k) for h in range(8) for k in range(12)]
 mesh=bpy.data.meshes.new('bowed back');mesh.from_pydata(vs,[],faces);mesh.update();o=bpy.data.objects.new('chair-curved-back',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,'chair-mesh');mod=o.modifiers.new('Back thickness','SOLIDIFY');mod.thickness=.025;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 cylinder('chair-gas-lift',(x,y,z+.14),(x,y,z+.43),.035,'chrome')
 for a in range(5):
  t=a*math.tau/5;ex=x+.30*math.cos(t);ey=y+.30*math.sin(t)
  cylinder('chair-star-spoke',(x,y,z+.16),(ex,ey,z+.09),.019,'chrome');cylinder('chair-twin-caster',(ex-.035,ey,z+.065),(ex+.035,ey,z+.065),.052,'black')
 for dx in [-.30,.30]:
  cylinder('chair-arm-support',(x+dx,y+.10,z+.48),(x+dx,y+.10,z+.73),.017,'chrome');box('chair-arm-pad',(x+dx,y,z+.74),(.07,.34,.035),'black',.015)
 if angle:
  for o in parts[before:]:
   # apply rotation around chair centre without altering mesh scale
   from mathutils import Matrix
   pivot=Vector((x,y,z));o.matrix_world=Matrix.Translation(pivot)@Matrix.Rotation(angle,4,'Z')@Matrix.Translation(-pivot)@o.matrix_world
def desk(x,y,z):
 box('desk-oak-top',(x,y,z+.75),(1.65,.8,.055),'parquet',.02)
 for dx in [-.7,.7]:
  box('desk-steel-leg',(x+dx,y,z+.38),(.045,.64,.72),'frame',.012)
 box('desk-cable-tray',(x,y+.22,z+.65),(1.2,.12,.08),'frame',.012)
 box('monitor-base',(x,y+.17,z+.797),(.31,.18,.025),'black',.01);cylinder('monitor-stand',(x,y+.23,z+.81),(x,y+.23,z+1.04),.025,'frame')
 box('monitor-bezel',(x,y+.25,z+1.17),(.65,.045,.38),'black',.014);box('monitor-display',(x,y+.224,z+1.17),(.608,.006,.336),'screen',.006)
 box('keyboard',(x,y-.17,z+.799),(.43,.14,.018),'black',.008)
 for r in range(3):
  for k in range(12):box('keyboard-key',(x-.18+k*.032,y-.20+r*.034,z+.811),(.026,.026,.006),'chair-mesh',.002)
 cushion('mouse',(x+.38,y-.16,z+.81),(.035,.06,.018),'black');box('notebook',(x-.55,y-.12,z+.795),(.24,.3,.015),'paper',.005)
 chair(x,y-.9,z,math.pi)
def plant(x,y,z):
 cylinder('planter-container',(x,y,z),(x,y,z+.42),.23,'porcelain',24);cylinder('planter-soil',(x,y,z+.422),(x,y,z+.427),.211,'soil',24)
 for j in range(9):
  t=j*2.399;r=.12+j%3*.03;end=(x+math.cos(t)*r,y+math.sin(t)*r,z+.8+(j%4)*.12)
  cylinder('plant-stem',(x,y,z+.42),end,.008,'leaf',6);leaf=cushion('plant-leaf',end,(.07,.19,.014),'leaf');leaf.rotation_euler=(.3,math.sin(t)*.35,t)
# Structural system, three bays, two real rooms. Front is Blender -Y / browser +Z.
for level in range(3):
 z=level*3.6;box('slab-edge',(0,0,z),(9.8,6.7,.22),'limestone',.025)
 if level<2:box('floor-finish',(0,0,z+.135),(9.5,6.4,.04),'parquet',.005)
for f in range(2):
 z=f*3.6
 box('room-rear-wall',(0,3.21,z+1.85),(9.6,.16,3.3),'wall',.01)
 box('room-west-wall',(-4.72,.03,z+1.85),(.16,6.3,3.3),'wall',.01)
 box('room-east-return',(4.72,2,z+1.85),(.16,2.6,3.3),'wall',.01)
 box('ceiling',(0,0,z+3.42),(9.45,6.35,.09),'wall',.01)
 for x in [-4.8,-1.6,1.6,4.8]:
  box('mullion-deep-cap',(x,-3.32,z+1.82),(.075,.18,3.42),'bronze',.008)
  box('mullion-inner-pressure',(x,-3.22,z+1.82),(.13,.07,3.42),'frame',.006)
 for x in [-3.2,0,3.2]:
  for y in [-3.22,3.1]:box('structure-column',(x,y,z+1.8),(.20,.20,3.6),'limestone',.02)
  box('curtain-head',(x,-3.29,z+3.31),(3.2,.16,.09),'bronze',.008)
  box('curtain-sill',(x,-3.29,z+.28),(3.2,.16,.09),'bronze',.008)
  box('vision-glass',(x,-3.255,z+1.8),(3.08,.016,2.96),'glass')
  box('opaque-insulated-spandrel',(x,-3.21,z+3.49),(3.10,.12,.22),'frame',.012)
 # External horizontal shadow relief, actual thickness.
 box('floor-pressure-cap',(0,-3.39,z+.16),(9.72,.24,.14),'bronze',.01)
 for x in [-3.2,0,3.2]:
  box('pendant-housing',(x,-.10,z+3.03),(1.5,.16,.055),'frame',.01)
  box('pendant-diffuser',(x,-.1,z+2.997),(1.40,.11,.013),'light',.003)
  for dx in [-.58,.58]:cylinder('pendant-cable',(x+dx,-.1,z+3.07),(x+dx,-.1,z+3.37),.004,'black',6)
 if f==0:
  desk(-3.1,-.7,z+.16);desk(-.9,-.7,z+.16)
  box('lounge-seat',(3,.3,z+.56),(1.8,.78,.24),'fabric',.10);box('lounge-back',(3,.65,z+.85),(1.8,.18,.65),'fabric',.07)
  for dx in [-.8,.8]:box('lounge-arm',(3+dx,.3,z+.78),(.16,.8,.38),'fabric',.07)
  box('coffee-table',(3,-.8,z+.57),(1.2,.65,.06),'parquet',.035)
  for dx in [-.48,.48]:cylinder('coffee-table-leg',(3+dx,-.8,z+.18),(3+dx,-.8,z+.54),.023,'frame')
  plant(4,2,z+.16)
 else:
  box('meeting-table',(0,.4,z+.91),(3.4,1.3,.09),'parquet',.08)
  for x in [-1.1,1.1]:box('meeting-pedestal',(x,.4,z+.52),(.18,.65,.72),'frame',.025)
  for x in [-1,0,1]:chair(x,-.65,z+.16,math.pi);chair(x,1.4,z+.16)
  box('presentation-frame',(.1,3.10,z+1.9),(2.3,.09,1.3),'black',.03);box('presentation-screen',(.1,3.046,z+1.9),(2.13,.008,1.13),'screen')
  plant(-3.8,2,z+.16);plant(3.8,2,z+.16)
  for x in [-3.0,3.0]:
   box('storage-body',(x,2.7,z+.74),(1.4,.55,1.15),'parquet',.015)
   for dx in [-.36,.36]:box('storage-door',(x+dx,2.40,z+.74),(.65,.035,1.08),'wall',.012);box('cabinet-handle',(x+dx,2.37,z+.84),(.025,.025,.14),'bronze',.006)
 # Floor-specific partition, not a repeated luminous wall.
 box('partial-partition',(1.67,1.4,z+1.53),(.11,3.2,2.72),'wall',.02)
 box('partition-door-post',(1.67,-.56,z+1.35),(.13,.09,2.45),'bronze',.005)
# Side return glass makes corner construction legible, not a front-only card.
for f in range(2):
 for y in [-2.3,-.7]:
  box('side-glass',(4.80,y,f*3.6+1.8),(.016,1.49,2.96),'glass')
  box('corner-mullion',(4.83,y-.8,f*3.6+1.8),(.15,.07,3.37),'bronze',.007)
# Merge by material for modest draw calls, preserving semantic material boundaries.
for mat in M:
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==M[mat]]
 if not objs:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();objs[0].name='CL-G2-FACADE-14__'+mat
scene=bpy.context.scene;scene['status']='RESEARCH_NOT_PASSED';scene['metres']='9.8 wide / 6.7 deep / 7.42 high';scene['originalGeometry']=True
bpy.ops.wm.save_as_mainfile(filepath=str(A/'source.blend'))
dest=O/'facade-specimen.glb';bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_materials='EXPORT',export_image_format='AUTO')
tri=sum(len(p.vertices)-2 for o in scene.objects if o.type=='MESH' for p in o.data.polygons)
info=dict(assetId='CL-G2-FACADE-14',status='RESEARCH_NOT_PASSED',metres=[9.8,7.42,6.7],triangles=tri,drawMaterialGroups=len([o for o in scene.objects if o.type=='MESH']),originalParts=counts,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),bytes=dest.stat().st_size,source=str(A/'source.blend'),script=str(Path(__file__)))
(O/'manifest.json').write_text(json.dumps(info,indent=2),encoding='utf8');(A/'QA.json').write_text(json.dumps(info,indent=2),encoding='utf8');(A/'LICENSES.md').write_text('# Research specimen\nOriginal procedural geometry authored for CarbonTwin. No external geometry. Separate Poly Haven textures/HDRI are CC0, see docs/citylight/v14/LICENSE_REGISTER.csv. NOT independently passed.\n',encoding='utf8')
print('V14_ASSET_RESULT',json.dumps(info))
