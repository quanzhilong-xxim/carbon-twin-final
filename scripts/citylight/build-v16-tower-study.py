"""Build an original CL-T01 G2 tower study for V16 review."""
import bpy, math, json, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
ASSET=ROOT/'work/citylight-v16-assets/CL-T01-V16-STUDY'; OUT=ROOT/'public/models/citylight/v16-study'
ASSET.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
M={}
def mat(name,color,metal=0.0,rough=.5,emission=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*emission[0],1);p.inputs['Emission Strength'].default_value=emission[1]
 M[name]=m;return m
for args in [('v12-glass',(.15,.34,.42),.05,.075),('v12-frame',(.025,.045,.055),.82,.24),('v12-bronze',(.22,.11,.045),.78,.28),('v12-stone',(.42,.40,.35),.05,.72),('v12-paving',(.20,.23,.22),0,.88),('v12-wall',(.18,.21,.20),0,.82),('v12-spandrel',(.08,.13,.16),.18,.42),('v12-joint',(.05,.06,.06),.55,.35),('v12-wood',(.23,.10,.035),0,.48),('v12-black',(.015,.018,.02),.1,.55),('v12-screen',(.03,.12,.16),.05,.3),('v12-cloth',(.20,.25,.24),0,.9),('v12-leaf-a',(.045,.16,.065),0,.84),('v12-leaf-b',(.08,.25,.10),0,.82),('bark',(.16,.08,.035),0,.92),('v12-soil',(.035,.025,.015),0,1),('v12-lamp',(.75,.47,.20),0,.3,((1.0,.52,.18),.2))]:mat(*args)
for i,c in enumerate([(.40,.39,.34),(.26,.31,.30),(.53,.48,.37),(.32,.38,.39),(.45,.34,.22),(.28,.25,.22),(.45,.42,.34),(.18,.28,.29)]):mat(f'v12-room-{i}',c,0,.75)
for i,c in enumerate([(.9,.63,.35),(.9,.67,.42),(.75,.78,.65),(.65,.78,.82),(.96,.63,.35),(.9,.75,.5),(.7,.78,.8),(.96,.72,.4)]):mat(f'v12-light-{i}',c,0,.34,(tuple(min(1,x*1.1) for x in c),.9))
parts=[];counts={}
def finish(o,name,material,bevel=0):
 o.name=name;o.data.materials.append(M[material]);o['assetId']='CL-T01-V16-STUDY';o['part']=name
 if bevel:mod=o.modifiers.new('manufactured edge','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 parts.append(o);counts[material]=counts.get(material,0)+1;return o
def cube(name,p,s,material,bevel=0,rot=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p,rotation=(0,0,rot));o=bpy.context.object;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,material,bevel)
def cyl(name,p,radius,depth,material,vertices=16):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=p);return finish(bpy.context.object,name,material)
def frustum(name,p,r1,r2,depth,material,vertices=8,rot=math.pi/8):
 bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r1,radius2=r2,depth=depth,location=p,rotation=(0,0,rot));return finish(bpy.context.object,name,material)
def torus(name,p,major,minor,material):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=48,minor_segments=10,location=p);return finish(bpy.context.object,name,material)
# Site and transparent podium
cube('parcel-ground',(0,0,-.35),(42,34,.35),'v12-paving',.08);cube('podium-stone',(0,0,5.2),(27,20,5.2),'v12-stone',.25);cube('podium-roof-garden',(0,0,10.55),(23,16,.22),'v12-paving',.08);cube('lobby-volume',(0,-18.2,5.8),(21.5,1.0,5.5),'v12-lobby-glass',.05);cube('lobby-roof',(0,-18.2,11.25),(23,2.1,.35),'v12-bronze',.08)
for x in (-15,-5,5,15):cube('lobby-mullion',(x,-19.25,5.8),(.16,.18,5.2),'v12-frame',.02)
for x in (-10,0,10):cube('lobby-door',(x,-19.35,3.0),(3.2,.10,3.0),'v12-lobby-glass',.02)
cube('lobby-reception',(0,-16.7,2.1),(4.4,1.1,.8),'v12-stone',.1)
for x in (-2.7,2.7):cube('lobby-light',(x,-18.2,9.6),(1.5,.25,.09),'v12-lamp',.03)
# Tapered octagonal tower, real floor plates and alternating room/light blocks
z0,floors,floor_h=10.9,24,4.05
for level in range(floors):
 z=z0+level*floor_h;t=level/(floors-1);radius=15.8-2.5*t
 frustum('floor-glass-band',(0,0,z+floor_h*.5),radius-.10,radius-.22,floor_h-.30,'v12-glass',8);frustum('floor-spandrel',(0,0,z+.18),radius+.02,radius-.08,.22,'v12-spandrel',8);frustum('interior-floor',(0,0,z+.35),radius-1.0,radius-1.1,.16,'v12-stone',8)
 for side in range(8):
  ang=side*math.tau/8+math.pi/8;x,y=math.cos(ang)*(radius+.12),math.sin(ang)*(radius+.12);cube('vertical-mullion',(x,y,z+floor_h*.5),(.18,.34,floor_h*.48),'v12-frame',.025,ang)
  if level%3!=1:
   roommat=f'v12-room-{(side+level)%8}';lightmat=f'v12-light-{(side+level)%8}';cube('office-room',(math.cos(ang)*(radius-1.05),math.sin(ang)*(radius-1.05),z+1.55),(1.8,.55,.65),roommat,.05,ang)
   if (level+side)%4 in (0,1):cube('office-window-light',(math.cos(ang)*(radius-.48),math.sin(ang)*(radius-.48),z+2.42),(1.0,.035,.46),lightmat,.015,ang)
# Crown and antenna
frustum('crown-shoulder',(0,0,z0+floors*floor_h+1.0),13.3,10.8,2.0,'v12-bronze',8);frustum('crown-glass',(0,0,z0+floors*floor_h+4.7),10.7,8.2,5.6,'v12-glass',8);torus('crown-ring',(0,0,z0+floors*floor_h+7.7),9.3,.52,'v12-bronze');torus('crown-inner-light',(0,0,z0+floors*floor_h+7.7),7.5,.16,'v12-lamp');cyl('antenna-base',(0,0,z0+floors*floor_h+11.5),1.2,1.2,'v12-frame',16);cyl('antenna',(0,0,z0+floors*floor_h+17),.22,10.0,'v12-bronze',12);cyl('antenna-tip',(0,0,z0+floors*floor_h+22.7),.09,1.2,'v12-lamp',10)
# Forecourt life

def tree(x,y,h=4.4):
 cyl('tree-trunk',(x,y,1.5),.16,h,'bark',10)
 for i in range(4):cyl('tree-branch',(x,y,3.0),.09,2.4,'bark',8)
 for i in range(5):
  a=i*math.tau/5;c=cyl('tree-crown',(x+math.cos(a)*1.2,y+math.sin(a)*1.2,h),1.2,'v12-leaf-a',12);c.scale=(1,.78,.7)
for x,y in [(-28,-17),(28,-17),(-29,14),(29,14),(-18,25),(18,25)]:tree(x,y)
for x in (-13,13):cyl('forecourt-lamp',(x,-24,4.2),.09,7.8,'v12-frame',10);cyl('forecourt-lamp-head',(x,-24,8.2),.28,.35,'v12-lamp',12)
for x in (-12,12):cube('bench',(x,-24,1.1),(2.2,.45,.28),'v12-wood',.12);cube('bench-back',(x,-24.45,1.8),(2.2,.12,.65),'v12-wood',.08)
for x in (-8,8):cube('car-body',(x,-28,1.0),(2.2,4.0,.65),'v12-frame',.18);cube('car-roof',(x,-28,1.85),(1.65,2.2,.34),'v12-glass',.12)
# Merge by material into stable draw groups
for material in M:
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==M[material]]
 if len(objs)>1:
  bpy.ops.object.select_all(action='DESELECT')
  for o in objs:o.select_set(True)
  bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();objs[0].name='CL-T01-V16-STUDY__'+material
scene=bpy.context.scene;scene['assetId']='CL-T01-V16-STUDY';scene['status']='WHITEBOX_RESEARCH_NOT_PASSED';scene['designLanguage']='crystalline faceted tower / bronze vertical fins / ring crown / transparent podium';scene['units']='metre'
bpy.ops.wm.save_as_mainfile(filepath=str(ASSET/'source.blend'))
dest=OUT/'cl-t01-v16-study.glb';bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_materials='EXPORT',export_image_format='AUTO')
tri=sum(max(0,len(p.vertices)-2) for o in scene.objects if o.type=='MESH' for p in o.data.polygons);info={'assetId':'CL-T01-V16-STUDY','status':'WHITEBOX_RESEARCH_NOT_PASSED','dimensionsMetres':[84,68,121.2],'triangles':tri,'materialGroups':len([o for o in scene.objects if o.type=='MESH']),'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'source':'work/citylight-v16-assets/CL-T01-V16-STUDY/source.blend','script':'scripts/citylight/build-v16-tower-study.py','designLanguage':scene['designLanguage']}
(OUT/'manifest.json').write_text(json.dumps(info,indent=2),encoding='utf8');(ASSET/'QA.json').write_text(json.dumps(info,indent=2),encoding='utf8');print('V16_TOWER_STUDY',json.dumps(info))
