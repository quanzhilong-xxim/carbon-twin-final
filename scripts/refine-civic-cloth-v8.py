"""Fix clipped stripe curves and covered source-skin overlap in new masters.
Uses retained Snow/Rain (CC BY 4.0); local export and two inspection frames.
"""
import bpy,bmesh,math,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
for who in ([sys.argv[-1]] if '--' in sys.argv else ['Business','City']):
 source=OUT/f'CT_{who}_Explore_v8.blend'
 bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
 scene=bpy.context.scene;root=bpy.data.objects[f'CT_{who}_Explore_v8'];root.name=f'CT_{who}_Explore_v9';members=[root,*root.children_recursive]
 # Source-rig visibility drivers were re-enabling a few unexported original
 # accessories during a still render. Disable only those drivers in this copy.
 for o in list(scene.objects):
  if o not in members and o.type in ['MESH','CURVE']:
   o.driver_remove('hide_render');o.hide_render=True
 for o in members:
  if o.name.startswith('Wool pinstripe'):o.hide_render=True
 torso=bpy.data.objects.get('Source skin torso')
 if torso:
  bm=bmesh.new();bm.from_mesh(torso.data)
  # Keep the original neck. Skin covered by the new jacket is not a second
  # visible arm when the visitor raises the fitted sleeve.
  cut=[v for v in bm.verts if (torso.matrix_world@v.co).z<1.40]
  bmesh.ops.delete(bm,geom=cut,context='VERTS');bm.to_mesh(torso.data);bm.free()
  # The retained body atlas has clothing regions next to the neck UV island.
  # Match the repaired hand/face tone instead of exposing those painted regions.
  torso.data.materials.clear();torso.data.materials.append(bpy.data.materials['CT corrected hand skin'])
  for face in torso.data.polygons:face.material_index=0
 jacket=bpy.data.objects['Fitted tailored jacket'];mesh=jacket.data
 uv=mesh.uv_layers.active or mesh.uv_layers.new()
 for face in mesh.polygons:
  for li in face.loop_indices:
   p=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(math.atan2(p.y,p.x)/math.tau+.5,(p.z-.88)/.52)
 if who=='Business':
  width=1024;height=128;image=bpy.data.images.new('V8 original woven pinstripe',width=width,height=height);pixels=[]
  for y in range(height):
   for x in range(width):
    stripe=min(x%64,64-x%64)<1;grain=(math.sin(x*2.7+y*1.3)+math.sin(y*2.9))*.0013
    color=(.046,.061,.08) if stripe else (.026,.037,.052)
    pixels.extend([*(max(0,c+grain) for c in color),1])
  image.pixels.foreach_set(pixels);image.filepath_raw=str(OUT/'CT_Pinstripe_Color_v8.png');image.file_format='PNG';image.save();image.pack()
  cloth=jacket.data.materials[0];node=cloth.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;cloth.node_tree.links.new(node.outputs['Color'],cloth.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
  # Baked microstripes stay on the cloth surface at every view and distance.
 for o in scene.objects:
  if o.name in bpy.context.view_layer.objects:o.select_set(o in members and not o.hide_render)
 bpy.context.view_layer.objects.active=root;stem=f'CT_{who}_Explore_v9'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_image_format='WEBP',export_image_quality=88,export_image_webp_fallback=False)
 info=json.loads((OUT/f'CT_{who}_Explore_v8.sources.json').read_text());info.update({'version':9,'retained_source':str(source),'cloth_repair':'Removed intersecting pinstripe curves; original UV texture on suit; covered torso skin trimmed below neck','preview_repair':'Unexported original accessory visibility drivers disabled in new copy','web_bytes':(OUT/(stem+'.glb')).stat().st_size,'status':'pending new browser validation'});(OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2))
 E=ROOT/'outputs/v10-explore'/f'{who.lower()}-v9';E.mkdir(exist_ok=True)
 # The retained master is saved before its inspection studio is added.
 world=bpy.data.worlds.new('V8 cloth inspection');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.21,.19,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55;scene.world=world
 for name,loc,power,size,color in [('Key',(-3,-4,4),350,4,(1,.89,.76)),('Fill',(3,-2,2),180,3,(.8,.9,1)),('Rim',(2,2,3),420,3,(1,.87,.64))]:
  d=bpy.data.lights.new('V8 '+name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('V8 inspection camera');cam=bpy.data.objects.new(d.name,d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO'
 scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
 for name,scale,z in [('front',2.04,.9),('portrait',1.14,1.3)]:
  cam.data.ortho_scale=scale;target=Vector((0,0,z));cam.location=(0,-4,z+.18);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(E/(name+'.png'));bpy.ops.render.render(write_still=True)
 print('CIVIC_CLOTH_V8_READY',who,flush=True)
