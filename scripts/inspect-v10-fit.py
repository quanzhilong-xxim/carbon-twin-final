"""Read-only measurements and a held closed-lid render of exported models."""
import bpy, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/v10-explore/characters-v10'
report={}
for who in ['Student','Business','City']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/models/characters-v10/CT_{who}_Explore_v10.glb'))
 scene=bpy.context.scene;items=[]
 for o in scene.objects:
  if o.type!='MESH':continue
  if o.data.shape_keys:
   keys=o.data.shape_keys.key_blocks
   stats={k.name:max((v.co-keys['Basis'].data[i].co).length for i,v in enumerate(k.data)) for k in keys if k.name!='Basis'}
   for k in keys:k.value=1 if k.name.startswith('Blink') else .2 if k.name=='Smile' else 0
  else:stats={}
  if o.parent and (o.parent.name.startswith('Arm') or o.name.endswith(('_head','_eyes')) or any(t in o.name for t in ['collar','lapel','jacket','shoulder','hair'])):
   ps=[o.matrix_world@v.co for v in o.data.vertices]
   items.append(dict(name=o.name,parent=o.parent.name,low=[min(p[i] for p in ps) for i in range(3)],high=[max(p[i] for p in ps) for i in range(3)],morphs=stats))
 world=bpy.data.worlds.new('Read only held expression');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.4,.4,.4,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.world=world
 for name,pos,power in [('Key',(-3,-4,4),330),('Fill',(3,-2,2),190)]:
  d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=4;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,1.5))-o.location).to_track_quat('-Z','Y').to_euler()
 eye=1.47 if who=='Student' else 1.55 if who=='Business' else 1.59
 d=bpy.data.cameras.new('Held blink');cam=bpy.data.objects.new(d.name,d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=.47;cam.location=(0,-4,eye);cam.rotation_euler=(Vector((0,0,eye))-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.resolution_x=560;scene.render.resolution_y=560;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.filepath=str(OUT/f'closed-{who.lower()}.png');bpy.ops.render.render(write_still=True)
 report[who]=items
(OUT/'fit-and-morph-inspection.json').write_text(json.dumps(report,indent=2))
print('READ_ONLY_FIT_INSPECTION_COMPLETE',flush=True)
