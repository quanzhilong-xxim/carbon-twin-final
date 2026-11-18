"""Correct context scale and terrain placement in the saved chapter compositions."""
import bpy,math,random,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];BASE=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/chapter-scenes-v2');OUT=BASE.parent/'chapter-scenes-v3';OUT.mkdir(exist_ok=True);WEB=ROOT/'public/media/explore-v10'
names=['culture','waterfront','innovation','valley','mobility','symbiosis']
indices=[int(sys.argv[-1])] if '--' in sys.argv else range(6)
def cube(name,p,s,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);return o
for idx in indices:
 name=names[idx];bpy.ops.wm.open_mainfile(filepath=str(BASE/(name+'-v2.blend')),load_ui=False,use_scripts=False);scene=bpy.context.scene;random.seed(503+idx)
 # Hide the oversized context experiment; v1/v2 masters remain intact.
 for o in scene.objects:
  if o.name.startswith(('Distant inhabited urban fabric','Distant facade floor','Distant tree-covered ridge','Distant planted tree')):o.hide_render=True
 grass=bpy.data.materials.get('Fine park soil and grass');stone=bpy.data.materials.get('Warm limestone');glass=bpy.data.materials.get('Reflective architectural glass');wood=bpy.data.materials.get('Waterfront oak');dark=bpy.data.materials.get('Anodized bronze')
 # A real captured cloud environment. Map both sky hemispheres above the horizon
 # to avoid the previous sky model's unlit underside beyond a finite landscape.
 world=scene.world;nodes=world.node_tree.nodes;links=world.node_tree.links;env=nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(ROOT/'public/environments/citylight/kloppenheim_06_puresky_4k.hdr'),check_existing=True);env.image.pack()
 tex=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');combine=nodes.new('ShaderNodeCombineXYZ');absolute=nodes.new('ShaderNodeMath');absolute.operation='ABSOLUTE';offset=nodes.new('ShaderNodeMath');offset.operation='ADD';offset.inputs[1].default_value=.10
 links.new(tex.outputs['Generated'],sep.inputs[0]);links.new(sep.outputs['X'],combine.inputs['X']);links.new(sep.outputs['Y'],combine.inputs['Y']);links.new(sep.outputs['Z'],absolute.inputs[0]);links.new(absolute.outputs[0],offset.inputs[0]);links.new(offset.outputs[0],combine.inputs['Z']);links.new(combine.outputs[0],env.inputs[0]);links.new(env.outputs['Color'],nodes.get('Background').inputs['Color']);nodes.get('Background').inputs['Strength'].default_value=.42 if idx!=5 else .1
 # Context uses articulated facades and a low distant scale, leaving the subject
 # dominant. Each chapter keeps its original, separate foreground composition.
 if idx in [0,1,2,5]:
  for j in range(14):
   x=-110+j*17;y=120+(j%3)*12;h=6+(j*3+idx)%12;w=7+(j%3)*2;d=7
   cube('Articulated distant building',(x,y,h/2),(w,d,h),glass)
   for z in range(2,int(h),2):cube('Context cornice',(x,y,z),(w+.2,d+.2,.13),stone)
   for k in range(5):cube('Context mullion',(x-w/2+k*w/4,y-d/2-.04,h/2),(.09,.11,h),dark)
   cube('Context roof',(x,y,h+.1),(w+.4,d+.4,.2),stone)
 # Complete tree instances are shared by data, at actual terrain elevations.
 prefabs=[o for o in scene.objects if o.type=='MESH' and o.hide_render and o.name.startswith(('island_tree_02','CT_ParkTree'))]
 if not prefabs:
  existing=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/urban-vegetation/CT_ParkTree_StreetLite_v3.glb'));prefabs=[o for o in bpy.data.objects if o not in existing and o.type=='MESH']
  for o in prefabs:o.hide_render=True
 points=[o.matrix_world@Vector(v) for o in prefabs for v in o.bound_box];lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));ratio=9/max(.1,hi.z-lo.z);norm=Matrix.Scale(ratio,4)@Matrix.Translation((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z));local=[(o,norm@o.matrix_world) for o in prefabs]
 terrain=[]
 deps=bpy.context.evaluated_depsgraph_get()
 for o in scene.objects:
  if o.name.startswith(('Distant forest ridge','Forested hillside')):terrain.append((o,BVHTree.FromObject(o,deps)))
 def elevation(x,y):
  z=.03
  for o,bvh in terrain:
   origin=o.matrix_world.inverted()@Vector((x,y,300));direction=o.matrix_world.inverted().to_3x3()@Vector((0,0,-1));hit,normal,face,distance=bvh.ray_cast(origin,direction)
   if hit is not None:z=max(z,(o.matrix_world@hit).z)
  return z
 def tree(x,y,s=1):
  transform=Matrix.Translation((x,y,elevation(x,y)))@Matrix.Rotation(random.random()*6.28,4,'Z')@Matrix.Scale(s,4)
  for source,matrix in local:
   o=source.copy();o.data=source.data;scene.collection.objects.link(o);o.parent=None;o.matrix_world=transform@matrix;o.hide_render=False;o.hide_set(False);o.name='Terrain-rooted landscape tree'
 if idx==3:
  # Move the original park trees out of the hills and populate forest slopes.
  for o in scene.objects:
   if o.name.startswith('CC0 park tree') and not o.hide_render:o.location.z+=elevation(o.location.x,o.location.y)
  for j in range(130):
   x=random.uniform(-80,85);y=random.uniform(8,110);tree(x,y,random.uniform(.5,1.0))
  for o in scene.objects:
   if o.name.startswith(('Glazed public room','Roof plate','Facade mullion','Floor edge')):
    anchor=min([(-26,15),(-8,19),(13,24),(35,23)],key=lambda p:(p[0]-o.location.x)**2+(p[1]-o.location.y)**2);o.location.z+=elevation(*anchor)
  for o in scene.objects:
   if o.name.startswith(('Wind energy tower','Turbine blade')):
    anchor=min([(-38,49),(4,68),(43,56)],key=lambda p:(p[0]-o.location.x)**2+(p[1]-o.location.y)**2);o.location.z+=elevation(*anchor)
  # Real bridge deck and railings replace the isolated tube-only crossing.
  for j in range(36):
   t=j/35;x=-18+t*36;y=-10+t*6;z=1+math.sin(t*math.pi)*3
   o=cube('Footbridge timber deck',(x,y,z),(.98,3.1,.14),wood);o.rotation_euler.z=math.atan2(6,36)
   if j%3==0:
    for side in [-1,1]:cube('Bridge railing post',(x,y+side*1.5,z+.5),(.07,.07,1),dark)
  scene.camera.location=(67,-75,33);scene.camera.rotation_euler=(Vector((0,31,17))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.lens=43
 else:
  for j in range(54):tree(-115+(j%18)*13,52+(j//18)*16,.65+random.random()*.3)
  if idx==0:
   # Shadows and planting have a human scale at the entrance.
   for x,y in [(-12,2),(14,2),(-15,18),(17,20)]:tree(x,y,.6)
 scene.render.resolution_x=1400;scene.render.resolution_y=980;scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(WEB/(name+'-v3.png'))
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(name+'-v3.blend')));bpy.ops.render.render(write_still=True);print('CHAPTER_V3',name,flush=True)
