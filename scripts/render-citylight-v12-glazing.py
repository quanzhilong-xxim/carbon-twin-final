"""Render the actual editable V12 trial source, not a replacement model."""
import bpy,os,math,json
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT='C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v5-r1'
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'work/light-court-v12.blend'))
scene=bpy.context.scene
world=bpy.data.worlds.new('V5 CC0 sunset study');world.use_nodes=True;scene.world=world
nodes=world.node_tree.nodes;links=world.node_tree.links
env=nodes.new('ShaderNodeTexEnvironment');image=bpy.data.images.load(os.path.join(ROOT,'public/environments/citylight/kloppenheim_06_puresky_1k.hdr'));image.pack();env.image=image
links.new(env.outputs['Color'],nodes['Background'].inputs['Color']);nodes['Background'].inputs['Strength'].default_value=.5
camera_data=bpy.data.cameras.new('V5 locked front');camera=bpy.data.objects.new('V5 locked front',camera_data);scene.collection.objects.link(camera)
camera.location=(92,-145,66);camera.rotation_euler=(Vector((0,0,55))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type='PERSP';camera_data.lens=43.45;scene.camera=camera
light=bpy.data.lights.new('V5 sunset sun','SUN');light.energy=2.2;light.angle=math.radians(.53);sun=bpy.data.objects.new('V5 sunset sun',light);scene.collection.objects.link(sun)
elev=math.radians(4.4);az=math.radians(100)
direction=Vector((math.cos(elev)*math.sin(az),-math.cos(elev)*math.cos(az),math.sin(elev)))
sun.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()
floor_mat=bpy.data.materials.new('V5 context ground');floor_mat.diffuse_color=(.15,.16,.15,1)
bpy.ops.mesh.primitive_plane_add(size=8000,location=(0,0,-.31));bpy.context.object.name='V5 render context ground';bpy.context.object.data.materials.append(floor_mat)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=0
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'blender-glazing-r5-offline.png')
# Separate editable lighting study preserves the web-export source's geometry.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'work/v5-glazing-staged/light-court-lighting-study.blend'))
bpy.ops.render.render(write_still=True)
with open(os.path.join(OUT,'blender-render-settings.json'),'w')as f:json.dump({'source':os.path.join(ROOT,'work/light-court-v12.blend'),'renderer':'Cycles CPU','samples':24,'resolution':[800,800],'viewTransform':'AgX','webRenderer':'WebGL ACES','notice':'Offline inspection only; this image is not a browser result. Shading/camera are not pixel matched.','camera':list(camera.location),'sunElevation':4.4,'sunAzimuth':100},f,indent=2)
