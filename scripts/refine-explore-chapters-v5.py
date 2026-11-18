"""Upgrade saved chapter spaces; keep all earlier scene versions.
Local Cycles, reused CC0 botanical source and original CarbonTwin architecture.
"""
import bpy,math,random,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];BASE=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/chapter-scenes-v3');OUT=BASE.parent/'chapter-scenes-v5';OUT.mkdir(exist_ok=True);WEB=ROOT/'public/media/explore-v10'
names=['culture','waterfront','innovation','valley','mobility','symbiosis'];indices=[int(sys.argv[-1])] if '--' in sys.argv else range(6)
def mat(n,c,rough=.7,metal=0):
 m=bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
def cube(n,p,s,m,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:b=o.modifiers.new('V5 soft light edge','BEVEL');b.width=bevel;b.segments=2;o.modifiers.new('V5 weighted normals','WEIGHTED_NORMAL')
 return o
def tube(n,points,r,m):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,v in zip(s.bezier_points,points):p.co=v;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);bpy.context.scene.collection.objects.link(o);o.data.materials.append(m);return o
for idx in indices:
 name=names[idx];bpy.ops.wm.open_mainfile(filepath=str(BASE/(name+'-v3.blend')),load_ui=False,use_scripts=False);scene=bpy.context.scene;random.seed(912+idx)
 glass=bpy.data.materials.get('Reflective architectural glass');stone=bpy.data.materials.get('Warm limestone');wood=bpy.data.materials.get('Waterfront oak');brass=bpy.data.materials.get('Warm brass');dark=bpy.data.materials.get('Anodized bronze');grass=bpy.data.materials.get('Fine park soil and grass')
 # Proper glazing reveals a shallow inhabited interior instead of a solid box.
 if glass:
  p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.34,.48,.43,1);p.inputs['Metallic'].default_value=.18;p.inputs['Roughness'].default_value=.17;p.inputs['Transmission Weight'].default_value=.62;p.inputs['IOR'].default_value=1.45
 plaster=mat('V5 warm interior plaster',(.58,.48,.33));leaf=mat('V5 garden leaf',(.16,.29,.07),.9);bloom=mat('V5 cream wildflower',(.88,.68,.28));linen=mat('V5 linen parasol',(.72,.67,.50),.9)
 # Interior depth and bronze mullions are placed only in the authored halls.
 rooms=[o for o in scene.objects if o.name.startswith('Glazed public room') and not o.hide_render]
 for room in rooms:
  x,y,z=room.location;w,d,h=room.dimensions
  cube('V5 interior back wall',(x,y+d*.35,z),(w*.97,.16,h*.95),plaster)
  for floor in range(max(1,int(h/3))):
   level=z-h/2+.18+floor*3;cube('V5 interior slab',(x,y,level),(w*.97,d*.90,.12),stone)
   for bay in range(max(2,int(w/2.5))):
    px=x-w*.4+bay*w*.8/max(1,int(w/2.5)-1);cube('V5 interior timber fin',(px,y+d*.22,z),(.10,.8,h*.92),wood)
    if floor<3:cube('V5 interior desk',(px,y-d*.10,level+.78),(1.2,.72,.07),wood);cube('V5 interior desk leg',(px,y-d*.10,level+.4),(.06,.06,.75),dark)
  for j in range(9):cube('V5 exterior vertical fin',(x-w/2+j*w/8,y-d/2-.08,z),(.07,.22,h),brass)
 # Fine natural surface detail and warmer, coherent landscape.
 for m in [stone,wood]:
  if not m:continue
  n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=14 if m==stone else 5;tex.inputs['Detail'].default_value=3
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.022;l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
  mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.18;mix.inputs[1].default_value=p.inputs['Base Color'].default_value;l.new(tex.outputs['Fac'],mix.inputs[2]);l.new(mix.outputs[0],p.inputs['Base Color'])
 # Furnished terraces with human scale.
 if idx in [0,1,2]:
  anchors=[(-13,-1),(14,-1)] if idx==0 else [(-17,-4),(-7,-4),(4,-4),(17,-4)] if idx==1 else [(-18,-2),(20,-2)]
  for x,y in anchors:
   bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.85,depth=.1,location=(x,y,.82));bpy.context.object.data.materials.append(wood)
   cube('V5 table pedestal',(x,y,.4),(.06,.06,.8),dark)
   bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.035,depth=3.25,location=(x,y,1.62));bpy.context.object.data.materials.append(dark)
   bpy.ops.mesh.primitive_cone_add(vertices=40,radius1=2,radius2=.05,depth=.45,location=(x,y,3.2));bpy.context.object.data.materials.append(linen)
   for side in [-1,1]:
    cube('V5 terrace chair seat',(x+side*1.1,y,.45),(.55,.55,.07),wood);cube('V5 chair back',(x+side*1.36,y,.77),(.06,.55,.65),wood)
    for dx in [-.2,.2]:
     for dy in [-.2,.2]:cube('V5 chair leg',(x+side*1.1+dx,y+dy,.22),(.025,.025,.44),dark,.008)
 # Foreground plants use linked leaf meshes, with individual foliage and flowers.
 verts=[];faces=[]
 for j in range(900 if idx!=3 else 450):
  if idx in [0,1,2]:x=random.uniform(-42,42);y=random.choice([-6.8,3.2])+random.uniform(-.4,.4);z=.06
  elif idx==3:continue
  else:x=random.uniform(-45,45);y=-4+random.uniform(-1,1);z=.1
  h=random.uniform(.16,.55);a=random.random()*6.28;r=random.uniform(.08,.17);i=len(verts);verts.extend([(x,y,z),(x+math.cos(a)*r,y+math.sin(a)*r,z+h*.55),(x,y,z+h),(x-math.cos(a)*r,y-math.sin(a)*r,z+h*.55)]);faces.append((i,i+1,i+2,i+3))
 if verts:
  mesh=bpy.data.meshes.new('V5 planted border leaves');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new(mesh.name,mesh);scene.collection.objects.link(o);mesh.materials.append(leaf)
 # Street lamps, not just a bare plaza.
 for x in [-36,-12,14,38]:
  y=2 if idx!=4 else -15
  tube('V5 curved path light',[(x,y,0),(x,y,3.6),(x+.4,y,4.3),(x+1.25,y,4.3)],.055,dark)
  cube('V5 path light head',(x+1.25,y,4.3),(.45,.3,.08),brass)
  if idx==5:
   d=bpy.data.lights.new('V5 warm path lamp','POINT');d.energy=35;d.color=(1,.60,.25);d.shadow_soft_size=.3;o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=(x+1.25,y,4.1)
 # Broader canopy silhouettes from the retained CC0 mother geometry.
 for o in scene.objects:
  if o.type=='MESH' and not o.hide_render and any('leaves' in m.name for m in o.data.materials if m) and o.name.startswith(('CC0 park tree','Terrain-rooted')):
   o.scale.x*=1.16;o.scale.y*=1.16
 cameras=[((27,-33,8),(0,8,4.4),38),((33,-34,8),(0,9,5),36),((35,-40,10),(0,17,9),37),((49,-47,18),(0,31,19),38),((48,-40,9),(0,10,7),34),((49,-46,9),(0,29,13),36)]
 loc,target,lens=cameras[idx];cam=scene.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens
 scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65 if idx!=5 else .25
 for o in scene.objects:
  if o.type=='LIGHT' and o.data.type=='SUN':o.data.energy=3.8 if idx!=5 else .8;o.data.angle=math.radians(4);o.data.color=(1,.85,.65) if idx!=5 else (.68,.78,1);o.rotation_euler=(math.radians(42),math.radians(-18),math.radians(-35))
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.65 if idx!=5 else 1.15
 scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True;scene.cycles.max_bounces=8;scene.cycles.transmission_bounces=6;scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(WEB/(name+'-v5.png'))
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(name+'-v5.blend')));bpy.ops.render.render(write_still=True)
 (OUT/(name+'-v5.json')).write_text(json.dumps({'retained_source':str(BASE/(name+'-v3.blend')),'changes':['transmissive glazing and interiors','human scale camera','furnished terraces','surface pores','planted borders','path lights','matched daylight'],'paid_calls':0,'status':'visual inspection pending'},indent=2));print('V5_CHAPTER_READY',name,flush=True)
