"""Weld split skin normals in a NEW character version; retain all V1-V4 files.
Rain/Snow: Blender Foundation, CC BY 4.0. No service calls or live-session edits.
"""
import bpy,bmesh,json,math,sys
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
who=sys.argv[-1] if '--' in sys.argv else 'Student';version=6 if who=='Student' else 7
assert who in ['Student','Business','City']
source=OUT/f'CT_{who}_Explore_v4.blend'
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
scene=bpy.context.scene;root=bpy.data.objects[f'CT_{who}_Explore_v4'];root.name=f'CT_{who}_Explore_v{version}'
members=[root,*root.children_recursive];changes=[]
skin=bpy.data.materials.new('CT corrected hand skin');skin.use_nodes=True
p=skin.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.32,.18,.105,1);p.inputs['Roughness'].default_value=.52;p.inputs['Specular IOR Level'].default_value=.32
if who!='Student':
 torso=bpy.data.objects['Source skin torso'];source=torso.data;distal={-1:[],1:[]};keep=[]
 for face in source.polygons:
  c=sum((torso.matrix_world@source.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
  if abs(c.x)>.20 and .5<c.z<1.02:distal[1 if c.x>0 else -1].append(face)
  else:keep.append(face.index)
 for side,polys in distal.items():
  hand=bpy.data.objects['Source skin left' if side>0 else 'Source skin right'];verts=[];faces=[]
  for obj,items in [(hand,list(hand.data.polygons)),(torso,polys)]:
   for f in items:
    start=len(verts);verts.extend(tuple(obj.matrix_world@obj.data.vertices[i].co) for i in f.vertices);faces.append(tuple(range(start,len(verts))))
  mesh=bpy.data.meshes.new('V7 complete articulated hand');mesh.from_pydata(verts,[],faces);hand.data=mesh;hand.matrix_world=Matrix.Identity(4)
  changes.append({'mesh':hand.name,'distal_faces_returned_to_hand':len(polys)})
 bm=bmesh.new();bm.from_mesh(source);bm.faces.ensure_lookup_table();retained=set(keep);bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in retained],context='FACES');bm.to_mesh(source);bm.free()
for o in members:
 if o.type!='MESH' or not o.name.startswith('Source skin '):continue
 before=len(o.data.vertices);bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 for p in o.data.polygons:p.use_smooth=True
 # Baking separate polygons dropped the original welded vertex normals.
 o.data.update();changes.append({'mesh':o.name,'before_vertices':before,'after_vertices':len(o.data.vertices)})
 if o.name in ['Source skin left','Source skin right']:
  # The split retained body-atlas UVs, which sample black clothing regions on
  # the hands. Use the face-matched skin surface on the preserved finger mesh.
  o.data.materials.clear();o.data.materials.append(skin)
  for f in o.data.polygons:f.material_index=0
for o in scene.objects:
 if o.name in bpy.context.view_layer.objects:o.select_set(o in members and not o.hide_render)
bpy.context.view_layer.objects.active=root
stem=f'CT_{who}_Explore_v{version}'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_image_format='WEBP',export_image_quality=88,export_image_webp_fallback=False)
E=ROOT/'outputs/v10-explore'/f'{who.lower()}-v{version}';E.mkdir(exist_ok=True)
world=bpy.data.worlds.new('V5 neutral character studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.21,.19,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55;scene.world=world
for name,loc,power,size,color in [('Key',(-3,-4,4),350,4,(1,.89,.76)),('Fill',(3,-2,2),180,3,(.8,.9,1)),('Rim',(2,2,3),420,3,(1,.87,.64))]:
 d=bpy.data.lights.new('V5 '+name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('V5 portrait camera');cam=bpy.data.objects.new(d.name,d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=2.04
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
for name,angle in [('front',0),('portrait',-12)]:
 a=math.radians(angle);d.ortho_scale=1.14 if name=='portrait' else 2.04;target=Vector((0,0,1.3 if name=='portrait' else .9));cam.location=(math.sin(a)*4,-math.cos(a)*4,target.z+.18);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(E/(name+'.png'));bpy.ops.render.render(write_still=True)
info=json.loads((OUT/f'CT_{who}_Explore_v4.sources.json').read_text());info.update({'version':version,'retained_source':str(source),'normal_repair':changes,'material_repair':'Hand geometry used unrelated body atlas regions; replaced with face-matched skin material','web_bytes':(OUT/(stem+'.glb')).stat().st_size,'status':'pending browser and visual verification','paid_calls':0});(OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2));print('V6_NORMALS_READY',who,changes,flush=True)
