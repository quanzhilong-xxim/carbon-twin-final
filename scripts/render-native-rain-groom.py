import bpy,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath='D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/rain-v2/extracted/rain_rig.blend',load_ui=False,use_scripts=False)
keep={'GEO-rain_head','GEO-rain_eyes','GEO-rain_eyebrows','GEO-rain_eyelashes','GEO-rain_hair_main','GEO-rain_hair_strand','GEO-rain_hair_ponytail','GEO-rain_hairband'}
for o in bpy.data.objects:
    if o.type=='MESH':o.hide_render=o.name not in keep
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100
world=bpy.data.worlds.new('Review white world');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.3,.3,1);scene.world=world
for name,position,power,size in [('Key',(-2,-3,4),500,3),('Fill',(2,-2,2),200,3)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=position;o.rotation_euler=(Vector((0,0,1.5))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Review camera');camera=bpy.data.objects.new('Review camera',data);scene.collection.objects.link(camera)
camera.location=(0,-3,1.55);camera.rotation_euler=(Vector((0,0,1.48))-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=.65;scene.camera=camera
scene.render.filepath=str(R/'outputs/v122/native-rain-portrait.png');bpy.ops.render.render(write_still=True)
