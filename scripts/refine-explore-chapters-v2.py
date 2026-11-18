"""Refine the saved six compositions; retain v1 sources and all original models."""
import bpy, math, json, sys, random
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1]
BASE=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/chapter-scenes-v1')
OUT=BASE.parent/'chapter-scenes-v2';OUT.mkdir(exist_ok=True)
WEB=ROOT/'public/media/explore-v10'
names=['culture','waterfront','innovation','valley','mobility','symbiosis']
indices=[int(sys.argv[-1])] if '--' in sys.argv else range(6)
def material(name,color,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
def cube(name,pos,size,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:m=o.modifiers.new('Soft edges','BEVEL');m.width=bevel;m.segments=2
 return o
for idx in indices:
 name=names[idx];bpy.ops.wm.open_mainfile(filepath=str(BASE/(name+'.blend')),load_ui=False,use_scripts=False);scene=bpy.context.scene;random.seed(301+idx)
 grass=bpy.data.materials.get('Fine park soil and grass');stone=bpy.data.materials.get('Warm limestone');wood=bpy.data.materials.get('Waterfront oak');glass=bpy.data.materials.get('Reflective architectural glass')
 distant=material('Distant park landscape',(.12,.20,.12));warm=material('Warm interior',(.30,.18,.07));brass=material('Detail bronze',(.29,.22,.11),.3,.7)
 # Saved v1 had a finite ground that exposed the black underside of the sky.
 cube('Continuous land beyond the composition',(0,240,-1.1),(3500,3500,1),distant)
 # Layered, low-contrast ridges give the skyline a real destination.
 for j in range(12):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=28,ring_count=12,location=(-400+j*78,310+(j%3)*65,-3));h=bpy.context.object;h.name='Distant tree-covered ridge';h.scale=(80,64,17+(j%4)*12);h.data.materials.append(distant)
  for p in h.data.polygons:p.use_smooth=True
 # Background is unique to each composition: modest urban forms for waterfront
 # scenes, a natural ridge for the valley, a long station campus for mobility.
 if idx in [0,1,2,5]:
  for j in range(18):
   x=-115+j*13.7;y=83+(j%3)*15;h=7+(j*7+idx*3)%28
   cube('Distant inhabited urban fabric',(x,y,h/2),(8+(j%3)*2,8,h),glass,.15)
   for z in range(2,int(h),3):cube('Distant facade floor',(x,y-4.1,z),(8+(j%3)*2,.11,.15),stone)
 # Low planting along the water's edge, linked to the actual saved tree mesh.
 trees=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('CC0 park tree') and not o.hide_render]
 sources=[]
 if trees:
  # Duplicate one complete tree, not an arbitrary leaf-only object.
  prefix=trees[0].name.split(' / ')[0]
  first=min((o for o in trees if 'leaves' not in o.name.lower()),key=lambda o:abs(o.location.x),default=trees[0])
  anchor=first.matrix_world.translation.copy()
  sources=[o for o in trees if (o.matrix_world.translation-anchor).length<.01]
  for j in range(12 if idx!=3 else 5):
   target=Vector((-85+j*15,55+(j%3)*9,.05));transform=Matrix.Translation(target)@Matrix.Scale(.7,4)@Matrix.Translation(-anchor)
   for original in sources:
    o=original.copy();o.data=original.data;scene.collection.objects.link(o);o.matrix_world=transform@original.matrix_world;o.name='Distant planted tree';o.hide_render=False;o.hide_set(False)
 # Readable fine paving and a public forecourt, rather than a blank white slab.
 for j in range(41):
  cube('Quay stone joint',(-50+j*2.5,-.5,.061),(.018,5,.012),brass)
 for j in range(4):cube('Longitudinal paving joint',(0,-2+j*1.3,.063),(100,.018,.012),brass)
 # Local sunlight and sky use a matched warm afternoon / blue-hour setup.
 for o in scene.objects:
  if o.type=='LIGHT' and o.data.type=='SUN':
   o.data.energy=2.0 if idx!=5 else .65;o.data.angle=math.radians(3);o.data.color=(1,.82,.62) if idx!=5 else (.62,.72,1)
   o.rotation_euler=(math.radians(52),math.radians(-12),math.radians(-38))
 world=scene.world;nodes=world.node_tree.nodes
 sky=next((n for n in nodes if n.type=='TEX_SKY'),None)
 if sky:sky.sun_elevation=math.radians(17 if idx!=5 else 4);sky.air_density=1.4;sky.aerosol_density=1.4
 nodes.get('Background').inputs['Strength'].default_value=.28 if idx!=5 else .14
 # Interior rim light, while keeping the user reference free of invented metrics.
 if idx==0:
  for x in [-7,-3,1,5]:
   d=bpy.data.lights.new('Museum warm interior','AREA');d.energy=80;d.color=(1,.66,.32);d.shape='DISK';d.size=3;o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=(x,6,3);o.rotation_euler=(math.radians(90),0,0)
 scene.cycles.samples=40;scene.cycles.use_denoising=True
 scene.render.resolution_x=1400;scene.render.resolution_y=980
 scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(WEB/(name+'-v2.png'))
 scene.view_settings.look='AgX - Medium High Contrast'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(name+'-v2.blend')));bpy.ops.render.render(write_still=True)
 (OUT/(name+'-v2.json')).write_text(json.dumps({'source':str(BASE/(name+'.blend')),'changes':['continuous horizon','layered landscape','unique inhabited context','paving joints','matched lighting'],'license':'Original geometry; Poly Haven CC0 tree; Rain Rig © Blender Foundation CC-BY-4.0','paid_calls':0}),encoding='utf8')
 print('REFINED_CHAPTER',name,flush=True)
