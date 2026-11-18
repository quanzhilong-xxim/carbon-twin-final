"""Ground-level photographic composition and surface finishing of saved scenes.
The V1-V3 editable scenes and renders are retained. Local Cycles, no cloud calls.
"""
import bpy,math,random,sys,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];BASE=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/chapter-scenes-v3');OUT=BASE.parent/'chapter-scenes-v4';OUT.mkdir(exist_ok=True)
names=['culture','waterfront','innovation','valley','mobility','symbiosis'];indices=[int(sys.argv[-1])] if '--' in sys.argv else range(6)
def mat(name,c,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
def cube(name,p,s,m,bevel=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:b=o.modifiers.new('Architectural edge light','BEVEL');b.width=bevel;b.segments=2;o.modifiers.new('Architectural corner normals','WEIGHTED_NORMAL')
 return o
for idx in indices:
 name=names[idx];bpy.ops.wm.open_mainfile(filepath=str(BASE/(name+'-v3.blend')),load_ui=False,use_scripts=False);scene=bpy.context.scene;random.seed(741+idx)
 # Pore-scale surface roughness rather than uniformly coloured solid surfaces.
 for m in bpy.data.materials:
  if not m.use_nodes or m.name not in ['Warm limestone','Waterfront oak','Anodized bronze']:continue
  n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=18 if m.name!='Waterfront oak' else 5;tex.inputs['Detail'].default_value=3
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.025;l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
  color=n.new('ShaderNodeMixRGB');color.blend_type='MULTIPLY';color.inputs[0].default_value=.22;color.inputs[1].default_value=p.inputs['Base Color'].default_value;l.new(tex.outputs['Fac'],color.inputs[2]);l.new(color.outputs[0],p.inputs['Base Color'])
 # Bevel just the civic architecture, never the shared tree/character buffers.
 for o in scene.objects:
  if o.type=='MESH' and not o.hide_render and o.name.startswith(('Glazed public room','Roof plate','Stone edge','Facade mullion','Floor edge','Museum','Pavilion')) and len(o.data.vertices)<400:
   b=o.modifiers.new('Light-catching architectural edge','BEVEL');b.width=.035;b.segments=2;o.modifiers.new('Soft architectural normals','WEIGHTED_NORMAL')
 dark=mat('V4 terrace bronze',(.05,.075,.06),.4,.65);linen=mat('V4 warm canvas umbrella',(.66,.59,.40),.9);wood=mat('V4 cafe furniture',(.23,.115,.047),.72)
 if idx in [0,1,2]:
  # A legible foreground terrace gives the pavilion a human scale.
  anchors=[(-16,-4),(15,-3)] if idx==0 else [(-16,-6),(-8,-7),(3,-6),(13,-4)] if idx==1 else [(-20,-2),(18,2)]
  for x,y in anchors:
   bpy.ops.mesh.primitive_cylinder_add(vertices=28,radius=.85,depth=.10,location=(x,y,1.03));bpy.context.object.data.materials.append(wood)
   cube('Cafe table pedestal',(x,y,.51),(.08,.08,1.0),dark,.01)
   bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.035,depth=3.5,location=(x,y,1.75));bpy.context.object.data.materials.append(dark)
   bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=2.25,radius2=.05,depth=.52,location=(x,y,3.5));bpy.context.object.data.materials.append(linen)
   for j in range(3):
    a=j*2.094;x1=x+math.cos(a)*1.18;y1=y+math.sin(a)*1.18;cube('Terrace seat',(x1,y1,.55),(.55,.55,.07),wood,.035);cube('Terrace seat back',(x1,y1+.24,.93),(.55,.06,.7),wood,.025)
    for dx in [-.21,.21]:
     for dy in [-.21,.21]:cube('Seat leg',(x1+dx,y1+dy,.26),(.035,.035,.52),dark,.005)
 # A low camera keeps the viewer inside the space. Each composition retains
 # its own subject, terrain, light and camera rather than recolouring one view.
 cameras=[((30,-40,10),(0,8,5),42),((37,-40,9),(0,10,5),38),((39,-46,13),(0,19,8),39),((53,-56,20),(0,32,18),39),((56,-49,11),(0,10,7),36),((54,-55,10),(0,30,13),39)]
 loc,target,lens=cameras[idx];cam=scene.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens
 cam.data.dof.use_dof=True;cam.data.dof.focus_distance=(Vector(target)-cam.location).length;cam.data.dof.aperture_fstop=8
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.45 if idx!=5 else 1.0
 for o in scene.objects:
  if o.type=='LIGHT' and o.data.type=='SUN':o.data.energy=2.8 if idx!=5 else .8;o.data.angle=math.radians(4);o.data.color=(1,.81,.57) if idx!=5 else (.66,.76,1)
 scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'public/media/explore-v10'/(name+'-v4.png'))
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(name+'-v4.blend')));bpy.ops.render.render(write_still=True)
 (OUT/(name+'-v4.json')).write_text(json.dumps({'original_scene':str(BASE/(name+'-v3.blend')),'changes':['eye-level camera','physical surface pores','terrace furniture','soft architectural edges','AgX exposure'],'paid_calls':0,'status':'visual inspection pending'},indent=2));print('V4_CHAPTER_READY',name,flush=True)
