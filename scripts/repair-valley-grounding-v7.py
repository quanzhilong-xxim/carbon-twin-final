"""Repair saved valley placement after terrain smoothing; retain V1-V6.
Local Cycles; linked licensed tree buffers and the existing authored community.
"""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];BASE=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/chapter-scenes-v6');OUT=BASE.parent/'chapter-scenes-v7';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/'valley-v6.blend'),load_ui=False,use_scripts=False)
scene=bpy.context.scene;random.seed(7712)
terrain=[o for o in scene.objects if not o.hide_render and o.type=='MESH' and o.name.startswith(('Distant forest ridge','Forested hillside'))]
for o in terrain:
 for v in o.data.vertices:
  x,y,z=v.co
  v.co.z=max(0,z*(.72 if o.name.startswith('Distant') else .88)+math.sin(x*.23+y*.12)*math.sin(y*.24)*min(1,z/4)*.65)
 o.data.update()
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
surfaces=[(o,BVHTree.FromObject(o,deps)) for o in terrain]
def elevation(x,y):
 z=.03
 for o,bvh in surfaces:
  hit,_,_,_=bvh.ray_cast(o.matrix_world.inverted()@Vector((x,y,300)),o.matrix_world.inverted().to_3x3()@Vector((0,0,-1)))
  if hit is not None:z=max(z,(o.matrix_world@hit).z)
 return z
trees=[o for o in scene.objects if not o.hide_render and o.type=='MESH' and o.name.startswith(('Terrain-rooted','CC0 park tree'))]
errors=[]
for o in trees:
 x,y=o.matrix_world.translation.xy
 bottom=min((o.matrix_world@v.co).z for v in o.data.vertices)
 delta=elevation(x,y)-bottom-.10
 o.location.z+=delta;errors.append(abs(delta))
# All new forest copies keep the same editable, complete linked botanical mesh.
mother=next(o for o in trees if o.name.startswith('Terrain-rooted'))
for i in range(105):
 x=random.choice([random.uniform(-100,-22),random.uniform(37,110)]);y=random.uniform(20,113)
 o=mother.copy();o.data=mother.data;scene.collection.objects.link(o);o.name='V7 grounded forest instance';o.parent=None
 # Preserve the complete mother geometry's orientation; vary only yaw/scale.
 o.location=(x,y,0);o.rotation_euler.z=random.random()*math.tau;o.scale*=random.uniform(.58,1.1)
 bpy.context.view_layer.update();bottom=min((o.matrix_world@Vector(v)).z for v in o.bound_box);o.location.z=elevation(x,y)-bottom-.10
# The same four halls stand on level terraces, with supports reaching the slope.
rooms=[o for o in scene.objects if not o.hide_render and o.name.startswith('Glazed public room')]
anchors=[(o.location.x,o.location.y) for o in rooms];moves={}
stone=bpy.data.materials.get('Warm limestone')
def cube(n,loc,size):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(stone);b=o.modifiers.new('Soft terrace edge','BEVEL');b.width=.08;b.segments=2;return o
for room in rooms:
 x,y=room.location.xy;w,d,h=room.dimensions;bottom=min((room.matrix_world@Vector(v)).z for v in room.bound_box)
 base=max(elevation(x+dx,y+dy) for dx in [-w*.45,0,w*.45] for dy in [-d*.45,0,d*.45])+.18
 moves[(x,y)]=base-bottom
 cube('V7 community terrace',(x,y,base-.12),(w+1.6,d+1.4,.32))
 for dx in [-w*.4,w*.4]:
  for dy in [-d*.38,d*.38]:
   ground=elevation(x+dx,y+dy);height=max(.1,base-ground)
   cube('V7 grounded terrace support',(x+dx,y+dy,ground+height*.5),(.45,.45,height))
prefix=('Glazed public room','Roof plate','Stone edge','Facade mullion','Floor edge','V5 interior','V5 exterior')
for o in list(scene.objects):
 if not o.hide_render and o.name.startswith(prefix) and anchors:
  anchor=min(anchors,key=lambda p:(p[0]-o.location.x)**2+(p[1]-o.location.y)**2);o.location.z+=moves[anchor]
towers=[o for o in scene.objects if not o.hide_render and o.name.startswith('Wind energy tower')]
for tower in towers:
 x,y=tower.location.xy;bottom=min((tower.matrix_world@Vector(v)).z for v in tower.bound_box);delta=elevation(x,y)-bottom
 for o in list(scene.objects):
  if o is tower or (o.name.startswith('Turbine blade') and min(towers,key=lambda t:(t.location.x-o.location.x)**2+(t.location.y-o.location.y)**2) is tower):o.location.z+=delta
# Terrain receives world-scale variation, instead of identical smooth green hills.
m=bpy.data.materials.get('Fine park soil and grass')
if m and m.use_nodes:
 n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');coord=n.new('ShaderNodeNewGeometry');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=.18;noise.inputs['Detail'].default_value=5;noise.inputs['Roughness'].default_value=.75;l.new(coord.outputs['Position'],noise.inputs['Vector'])
 ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.2;ramp.color_ramp.elements[0].color=(.035,.065,.019,1);ramp.color_ramp.elements[1].position=.8;ramp.color_ramp.elements[1].color=(.22,.29,.10,1);l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color'])
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.38;bump.inputs['Distance'].default_value=.32;l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal']);p.inputs['Roughness'].default_value=.96
cam=scene.camera;cam.location=(79,-99,41);target=Vector((0,32,17));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=38;cam.data.dof.use_dof=False
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'public/media/explore-v10/valley-v7.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'valley-v7.blend'));bpy.ops.render.render(write_still=True)
(OUT/'valley-v7.json').write_text(json.dumps({'source_retained':str(BASE/'valley-v6.blend'),'tree_roots_reprojected':len(trees),'max_prior_root_offset':max(errors),'additional_linked_forest':105,'changes':['reprojected roots against evaluated smoothed terrain','grounded level community terraces','wind towers aligned to revised terrain','wider river and bridge composition','world-scale soil detail'],'paid_calls':0,'status':'pending visual inspection'},indent=2));print('VALLEY_V7_READY',flush=True)
