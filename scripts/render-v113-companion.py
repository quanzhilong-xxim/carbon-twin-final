import bpy,os
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];O=R/'public/models/behaviour-v113-candidate'
stem=os.environ.get('CT_COMPANION_SOURCE','woodland-companion');bpy.ops.wm.open_mainfile(filepath=str(O/(stem+'.blend')),use_scripts=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24
scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
if not scene.world:scene.world=bpy.data.worlds.new('inspection world')
scene.world.color=(.20,.20,.20)
m=bpy.data.materials.new('inspection floor');m.diffuse_color=(.12,.17,.12,1)
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=.65,depth=.045,location=(0,0,-.025));bpy.context.object.data.materials.append(m)
def area(name,loc,power,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.7))-o.location).to_track_quat('-Z','Y').to_euler()
area('softbox key',(2.4,-3.5,4),420,3);area('softbox fill',(-2,-1.5,2),170,2.4);area('hair rim',(-1,2,3),380,2)
d=bpy.data.cameras.new('inspection portrait');camera=bpy.data.objects.new('inspection portrait',d);bpy.context.collection.objects.link(camera);camera.location=(2.5,-5,2.2);camera.rotation_euler=(Vector((0,0,.73))-camera.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=1.95;scene.camera=camera
prefix='' if stem=='woodland-companion' else stem+'-';scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(O/(prefix+'inspection-portrait.png'));bpy.ops.render.render(write_still=True)
camera.location=(0,-5,1.65);camera.rotation_euler=(Vector((0,0,.73))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(O/(prefix+'inspection-front.png'));bpy.ops.render.render(write_still=True)
