"""Preview the actual exported GLBs, not extra source meshes or hidden rigs."""
import bpy,math,sys,os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];version=os.environ.get('CT_CHARACTER_VERSION','v10');E=ROOT/('outputs/v10-explore/characters-'+version);E.mkdir(exist_ok=True)
for who in (sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Student','Business','City']):
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
 bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/models/characters-v10/CT_{who}_Explore_{version}.glb'))
 for o in scene.objects:
  if o.type=='MESH' and o.data.shape_keys:
   for name,value in [('Smile',.2),('BlinkLeft',.08),('BlinkRight',.08)]:
    k=o.data.shape_keys.key_blocks.get(name)
    if k:k.value=value
 world=bpy.data.worlds.new('V10 soft portrait');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.26,.30,.29,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.world=world
 for name,pos,power,size,color in [('Key',(-3,-4,4),330,4,(1,.93,.85)),('Fill',(3,-2,2),150,3,(.84,.91,1)),('Rim',(2,2,3),340,3,(1,.88,.68))]:
  d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('V10 exported model camera');cam=bpy.data.objects.new(d.name,d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO'
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX'
 for mode,scale,height in [('full',2.04,.9),('role',1.03,1.37 if who=='Student' else 1.43)]:
  d.ortho_scale=scale;cam.location=(0,-4,height+.10);cam.rotation_euler=(Vector((0,0,height))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(E/f'{mode}-{who.lower()}.png');bpy.ops.render.render(write_still=True)
 print('V10_PREVIEW_READY',who,flush=True)
