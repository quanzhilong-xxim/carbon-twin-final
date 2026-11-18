"""Real current editable source inspection. Offline Cycles, never a web screenshot."""
import bpy,os,math,json,hashlib,sys,argparse
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT='C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v5-r1'
source=ROOT+'/work/light-court-v12.blend';source_hash=hashlib.sha256(open(source,'rb').read()).hexdigest()
parser=argparse.ArgumentParser();parser.add_argument('--revision',default='r20');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]if'--'in sys.argv else[]);revision=args.revision
assert revision.isalnum(),'Use a simple inspection revision'
bpy.ops.wm.open_mainfile(filepath=source);scene=bpy.context.scene
world=bpy.data.worlds.new(revision+' offline inspection world');world.use_nodes=True;scene.world=world
nodes=world.node_tree.nodes;links=world.node_tree.links
env=nodes.new('ShaderNodeTexEnvironment');image=bpy.data.images.load(ROOT+'/public/environments/citylight/kloppenheim_06_puresky_1k.hdr');image.pack();env.image=image
links.new(env.outputs['Color'],nodes['Background'].inputs['Color']);nodes['Background'].inputs['Strength'].default_value=.5
data=bpy.data.cameras.new(revision+' original window camera');camera=bpy.data.objects.new(data.name,data);scene.collection.objects.link(camera)
camera.location=(-8,-25,18);camera.rotation_euler=(Vector((-7,-9,18))-camera.location).to_track_quat('-Z','Y').to_euler()
data.sensor_fit='VERTICAL';data.sensor_height=24;data.lens=12/math.tan(math.radians(45)/2);scene.camera=camera
light=bpy.data.lights.new(revision+' sunset sun','SUN');light.energy=2.2;light.color=(1,.56,.28);light.angle=math.radians(.53);sun=bpy.data.objects.new(light.name,light);scene.collection.objects.link(sun)
elev=math.radians(4.4);az=math.radians(100);direction=Vector((math.cos(elev)*math.sin(az),-math.cos(elev)*math.cos(az),math.sin(elev)))
sun.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1024;scene.render.resolution_y=768;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=0;scene.render.image_settings.file_format='PNG'
scene.render.filepath=OUT+'/blender-window-'+revision+'-offline.png'
assert not os.path.exists(scene.render.filepath),'Do not overwrite an earlier inspection'
# Save a separate inspection rig; do not put this camera/light setup into the
# export source and do not use this image as browser rendering evidence.
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/work/v5-neutral-r20-staged/light-court-'+revision+'-offline-study.blend')
bpy.ops.render.render(write_still=True)
report={'status':'OFFLINE_INSPECTION_ONLY','source':source,'sourceSha256':source_hash,'renderer':'Cycles CPU','samples':32,'resolution':[1024,768],'cameraBlenderZUp':list(camera.location),'targetBlenderZUp':[-7,-9,18],'verticalFovDegrees':45,'viewTransform':'AgX','sourceUnmodifiedByRender':hashlib.sha256(open(source,'rb').read()).hexdigest()==source_hash,'limits':['Not a browser screenshot','Different renderer/light transport and color management from web ACES; not pixel matched','Full building acceptance and all-angle Blender inspection incomplete']}
with open(OUT+'/blender-window-'+revision+'-settings.json','w',encoding='utf-8')as f:json.dump(report,f,indent=2)
print('OFFLINE_INSPECTION '+json.dumps(report))
