"""Repair the measured V3 eye displacement; keep V1-V3 masters untouched.
Rain/Snow © Blender Foundation, CC BY 4.0. Local Blender only.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
SOURCE=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets')
for who in ['Student','Business','City']:
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v3.blend'),load_ui=False,use_scripts=False)
 scene=bpy.context.scene;root=bpy.data.objects[f'CT_{who}_Explore_v3'];root.name=f'CT_{who}_Explore_v4'
 members=[root,*root.children_recursive];eyes=bpy.data.objects['Eyes'];head=bpy.data.objects['Head']
 eye=next(o for o in members if o.type=='MESH' and o.name.startswith(('Study / GEO-','Source / GEO-')) and o.name.endswith('_eyes'))
 # Baked vertices already contain the original evaluated world coordinates.
 # Detach before relocating the pivot, then restore its identity world matrix.
 eye.parent=None;eye.matrix_world=Matrix.Identity(4);bpy.context.view_layer.update()
 points=[v.co.copy() for v in eye.data.vertices];center=Vector(tuple((min(p[i] for p in points)+max(p[i] for p in points))/2 for i in range(3)))
 eyes.matrix_world=Matrix.Translation(center);bpy.context.view_layer.update()
 eye.parent=eyes;eye.matrix_world=Matrix.Identity(4);bpy.context.view_layer.update()
 for o in members:
  if o.name.startswith(('V3 iris','V3 pupil','V3 catchlight','Eye reflection','Natural iris','Iris lens','Pupil','Tiny catchlight')):o.hide_render=True
 # One original eye surface with its real UV texture; no floating lens proxies.
 m=bpy.data.materials.new('V4 original mapped eyes');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.30;p.inputs['IOR'].default_value=1.38
 image=SOURCE/('snow-v2/extracted/maps/bake/eyes_diffuse.png' if who=='Business' else 'rain-v2/extracted/maps/TEX-rain_eyes_diffuse.png')
 t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(image),check_existing=True);t.image.pack();m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color']);eye.data.materials.clear();eye.data.materials.append(m)
 for o in members:
  if o.name.startswith('V3 rounded sleeve shoulder'):o.scale*=.84
  if o.name.startswith('V3 optical frame'):o.scale.z*=.84
 # Correctly fitted sleeves remain from V3. A restrained head pose avoids an
 # expressionless, perfectly symmetric mannequin in the portrait.
 head.rotation_euler.z=math.radians(2 if who=='Student' else -2)
 # Hide all source rigs/helpers outside the exported character hierarchy.
 for o in scene.objects:
  if o not in members:o.hide_render=True
  if o.name in bpy.context.view_layer.objects:o.select_set(o in members and not o.hide_render)
 bpy.context.view_layer.objects.active=root
 stem=f'CT_{who}_Explore_v4';bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_image_format='WEBP',export_image_quality=88,export_image_webp_fallback=False)
 E=ROOT/'outputs/v10-explore'/f'{who.lower()}-v4';E.mkdir(exist_ok=True)
 world=bpy.data.worlds.new('V4 portrait studio');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.18,.21,.19,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.55;scene.world=world
 for name,loc,power,size,color in [('Key',(-3,-4,4),350,4,(1,.89,.76)),('Fill',(3,-2,2),180,3,(.8,.9,1)),('Rim',(2,2,3),420,3,(1,.87,.64))]:
  d=bpy.data.lights.new('V4 '+name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('V4 portrait camera');cam=bpy.data.objects.new(d.name,d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=2.04
 scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
 for name,angle in [('front',0),('right',70),('back',180),('portrait',-12)]:
  a=math.radians(angle);d.ortho_scale=1.14 if name=='portrait' else 2.04;target=Vector((0,0,1.3 if name=='portrait' else .9));cam.location=(math.sin(a)*4,-math.cos(a)*4,target.z+.18);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(E/(name+'.png'));bpy.ops.render.render(write_still=True)
 info=json.loads((OUT/f'CT_{who}_Explore_v3.sources.json').read_text());info.update({'version':4,'source_retained':f'CT_{who}_Explore_v3.blend','repair':'Restored baked eye world matrix before resetting pivot; removed detached artificial iris overlays; one original mapped eye surface','eye_world_translation':list(eye.matrix_world.translation),'web_bytes':(OUT/(stem+'.glb')).stat().st_size,'paid_calls':0,'status':'browser validation pending'});(OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2));print('V4_CHARACTER_READY',who,flush=True)
