"""Finish the saved valley: continuous banks, terraced community, layered ridges.
Versioned local Blender source; no generation service or original overwrite.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
BASE=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/chapter-scenes-v7/valley-v7.blend')
OUT=BASE.parent.parent/'chapter-scenes-v8';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE),load_ui=False,use_scripts=False)
scene=bpy.context.scene;random.seed(8103)
def material(name,color,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
def cube(name,loc,size,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:b=o.modifiers.new('Crafted edge','BEVEL');b.width=bevel;b.segments=2
 return o
def line(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('POLY');s.points.add(len(points)-1)
 for p,co in zip(s.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);c.materials.append(m);return o
soil=bpy.data.materials['Fine park soil and grass'];stone=material('V8 coursed local stone',(.23,.245,.18));timber=material('V8 weathered larch',(.24,.14,.068));metal=material('V8 bronze rail',(.13,.16,.105),.4,.65)
# Masonry uses a real world position, not one stretched brick over each wall.
n=stone.node_tree.nodes;l=stone.node_tree.links;g=n.new('ShaderNodeNewGeometry');b=n.new('ShaderNodeTexBrick');b.inputs['Scale'].default_value=1.8;b.inputs['Mortar Size'].default_value=.025;b.inputs['Color1'].default_value=(.24,.25,.19,1);b.inputs['Color2'].default_value=(.38,.35,.27,1);b.inputs['Mortar'].default_value=(.11,.13,.09,1);l.new(g.outputs['Position'],b.inputs['Vector']);l.new(b.outputs['Color'],n['Principled BSDF'].inputs['Base Color']);bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.3;bump.inputs['Distance'].default_value=.07;l.new(b.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],n['Principled BSDF'].inputs['Normal'])
terrain=[o for o in scene.objects if o.type=='MESH' and not o.hide_render and o.name.startswith(('Distant forest ridge','Forested hillside'))]
deps=bpy.context.evaluated_depsgraph_get();surfaces=[(o,BVHTree.FromObject(o,deps)) for o in terrain]
def elevation(x,y):
 z=.03
 for o,bvh in surfaces:
  hit,_,_,_=bvh.ray_cast(o.matrix_world.inverted()@Vector((x,y,300)),o.matrix_world.inverted().to_3x3()@Vector((0,0,-1)))
  if hit is not None:z=max(z,(o.matrix_world@hit).z)
 return z
# Seal the open bases of the original heightfields. Water stays unobstructed.
cube('V8 continuous far riverbank',(0,111,-.18),(520,228,.4),soil)
cube('V8 foreground meadow',(0,-172,-.18),(520,293,.4),soil)
line('V8 far-bank stone edge',[(-250,-3,.04),(-100,-3,.04),(0,-3,.04),(100,-3,.04),(250,-3,.04)],.3,stone)
cube('V8 riverside walking path',(0,-2,.12),(400,1.6,.15),bpy.data.materials['Warm limestone'],.06)
for o in list(scene.objects):
 if o.name.startswith('V7 grounded terrace support'):o.hide_render=True
rooms=[o for o in scene.objects if not o.hide_render and o.name.startswith('Glazed public room')]
for i,room in enumerate(rooms):
 x,y=room.location.xy;w,d,h=room.dimensions;base=min((room.matrix_world@Vector(v)).z for v in room.bound_box)
 # Full stepped retaining plinth replaces the exposed slender stilts.
 for tier in range(3):
  front=y-d/2-1.2-tier*1.1;low=min(elevation(x+dx,front) for dx in [-w*.48,0,w*.48])-.1;top=base-.18-tier*.72
  if top>low:cube('V8 terraced retaining foundation',(x,front+.65,(low+top)/2),(w+1.4-tier*.25,1.7,top-low),stone,.07)
  if top>low+.3:
   cube('V8 planted terrace strip',(x,front,top+.04),(w+.8,.65,.16),soil,.06)
   for j in range(14):
    px=x-w*.46+j*w*.92/13
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(px,front,top+.28));o=bpy.context.object;o.name='V8 terrace shrub';o.scale=(.44,.36,.32+random.random()*.3);o.data.materials.append(soil)
 # Timber screen, usable balcony and a slender handrail add domestic scale.
 for j in range(6):cube('V8 larch sun screen',(x+w*.24+j*.3,y-d/2-.22,base+h*.54),(.09,.16,h*.9),timber,.02)
 cube('V8 community balcony',(x,y-d/2-.65,base+.07),(w+1.4,1.45,.18),timber,.04)
 line('V8 balcony handrail',[(x-w*.5-.4,y-d/2-1.25,base+1.1),(x+w*.5+.4,y-d/2-1.25,base+1.1)],.035,metal)
 for dx in [-w*.5,-w*.25,0,w*.25,w*.5]:line('V8 balcony post',[(x+dx,y-d/2-1.25,base+.2),(x+dx,y-d/2-1.25,base+1.1)],.024,metal)
 cube('V8 roof garden',(x,y+.2,base+h+.6),(w*.6,d*.6,.2),soil,.1)
 # Approach steps make the terrain connection readable.
 for step in range(10):
  sy=y-d/2-2-step*.48;z=base-.2-step*.3
  if z>elevation(x-w*.4,sy):cube('V8 approach stair',(x-w*.4,sy,z-.12),(1.5,.53,.24),stone,.03)
# Three distant ridges cover the artificial ground/sky boundary. Their colors
# encode atmospheric distance, while the mesh silhouette remains irregular.
for layer in range(3):
 verts=[];faces=[];nx=130;ny=20;center=210+layer*175;width=1000+layer*350;depth=230+layer*130
 for j in range(ny+1):
  v=j/ny;yy=center+(v-.5)*depth
  for k in range(nx+1):
   xx=(k/nx-.5)*width;ridge=44+18*math.sin(xx*.016+layer)+10*math.sin(xx*.041+1.2)+5*math.sin(xx*.09)
   zz=max(0,math.sin(math.pi*v))**.8*ridge+2*math.sin(xx*.07+yy*.045)*math.sin(math.pi*v)
   verts.append((xx,yy,zz))
 for j in range(ny):
  for k in range(nx):a=j*(nx+1)+k;faces.append((a,a+1,a+nx+2,a+nx+1))
 mesh=bpy.data.meshes.new('V8 ridgeline mesh');mesh.from_pydata(verts,[],faces);mesh.materials.append(material('V8 aerial ridge '+str(layer),[(.19,.27,.22),(.29,.36,.32),(.39,.45,.42)][layer]))
 o=bpy.data.objects.new('V8 layered distant mountains '+str(layer),mesh);scene.collection.objects.link(o)
 for p in mesh.polygons:p.use_smooth=True
# Supplement the middle distance with the complete shared botanical mother.
mother=next(o for o in scene.objects if not o.hide_render and o.type=='MESH' and o.name.startswith('Terrain-rooted'))
for i in range(130):
 x=random.uniform(-122,125);y=random.uniform(48,128);o=mother.copy();o.data=mother.data;o.name='V8 middle-distance forest';scene.collection.objects.link(o);o.parent=None;o.location=(x,y,0);o.rotation_euler.z=random.random()*math.tau;o.scale*=random.uniform(.5,.9)
 bpy.context.view_layer.update();bottom=min((o.matrix_world@Vector(v)).z for v in o.bound_box);o.location.z=elevation(x,y)-bottom-.08
# Keep the wind facility on the horizon, at a scale that fits the composition.
towers=[o for o in scene.objects if not o.hide_render and o.name.startswith('Wind energy tower')]
for tower in towers:
 pivot=Vector((tower.location.x,tower.location.y,min((tower.matrix_world@Vector(v)).z for v in tower.bound_box)))
 children=[o for o in scene.objects if o is tower or (o.name.startswith('Turbine blade') and min(towers,key=lambda t:(t.location.x-o.location.x)**2+(t.location.y-o.location.y)**2) is tower)]
 for o in children:o.location=pivot+(o.location-pivot)*.62;o.scale*=.62
cam=scene.camera;cam.location=(79,-99,41);cam.rotation_euler=(Vector((0,34,14))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=36
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.filepath=str(ROOT/'public/media/explore-v10/valley-v8.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'valley-v8.blend'));bpy.ops.render.render(write_still=True)
(OUT/'valley-v8.json').write_text(json.dumps({'source_retained':str(BASE),'changes':['sealed heightfield bases and continuous riverbanks','stepped masonry community foundations','balconies, timber shading, roof gardens and approach stairs','three original layered mountain meshes','130 linked complete tree instances','wind installation scaled into full frame'],'paid_calls':0,'status':'pending visual inspection'},indent=2))
print('VALLEY_V8_READY',flush=True)
