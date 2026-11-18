"""Local, versioned fit correction of the retained V2 characters.
Rain/Snow © Blender Foundation, CC BY 4.0; CarbonTwin clothing and props.
No cloud calls. V1/V2 and the live Blender session are never overwritten.
"""
import bpy,math,json,bmesh
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
for who in ['Student','Business','City']:
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v2.blend'),load_ui=False,use_scripts=False)
 scene=bpy.context.scene;root=bpy.data.objects[f'CT_{who}_Explore_v2'];root.name=f'CT_{who}_Explore_v3'
 members=list(root.children_recursive);body=bpy.data.objects['Breath'];head=bpy.data.objects['Head'];eyes=bpy.data.objects['Eyes']
 def parent(o,p):
  bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=p;o.matrix_world=w;bpy.context.view_layer.update()
 def mat(name,color,rough=.6,metal=0):
  m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;return m
 dark=mat('V3 natural dark pupil',(.005,.008,.006),.23);iris=mat('V3 botanical iris',(.05,.18,.13),.33);glint=mat('V3 soft catchlight',(.9,.95,.9),.16)
 cloth=next(m for m in bpy.data.materials if m.name.startswith('Original plum woven jacket' if who=='Student' else 'Fine midnight pinstripe wool' if who=='Business' else 'Ivory tailored wool'))
 cuffmat=next(m for m in bpy.data.materials if m.name.startswith('Rib knit cuffs' if who=='Student' else 'Cream cotton poplin'))
 # Hide only derived overlays and ill-fitting sleeves in this NEW version.
 for o in members:
  if o.name.startswith(('Natural iris','Iris lens','Pupil','Tiny catchlight','Optical glasses','Glasses bridge','Glasses temples','Tailored sleeve','Jacket shoulder','Cotton cuff','Sleeve cuff button','Sleeve /','Knitted cuff','Soft jacket shoulder','Watch band','Wristwatch')):
   o.hide_render=True
 # Fit the sleeve to measured source-arm positions. Trim invisible skin to
 # avoid duplicate arms protruding from an unrelated sleeve centreline.
 endz=.835 if who=='Student' else .90
 for side in [-1,1]:
  arm=bpy.data.objects['ArmRight' if side<0 else 'ArmLeft']
  skin=next(o for o in members if o.name=='Source skin '+('right' if side<0 else 'left'))
  bm=bmesh.new();bm.from_mesh(skin.data)
  cut=[v for v in bm.verts if (skin.matrix_world@v.co).z>endz+.008];bmesh.ops.delete(bm,geom=cut,context='VERTS');bm.to_mesh(skin.data);bm.free()
  anchors=[(.15,0,1.27),(.19,.01,1.12),(.215,0,.98),(.249,-.017,.835)] if who=='Student' else [(.18,0,1.36),(.24,.008,1.18),(.255,.012,1.00),(.293,.009,.90)] if who=='Business' else [(.175,0,1.36),(.217,.01,1.18),(.233,-.004,1.0),(.254,-.02,.90)]
  curve=[Vector((side*x,y,z)) for x,y,z in anchors];verts=[];faces=[];N=32
  for j in range(25):
   t=j/24;seg=min(2,int(t*3));u=t*3-seg;c=curve[seg].lerp(curve[seg+1],u);q=Vector((0,0,1)).rotation_difference((curve[seg+1]-curve[seg]).normalized());r=(.067*(1-t)+.036*t)*(1+.035*math.sin(t*29)*math.sin(t*math.pi))
   for k in range(N):a=k/N*math.pi*2;verts.append(tuple(c+q@Vector((math.cos(a)*r,math.sin(a)*r,0))))
  for j in range(24):
   for k in range(N):a=j*N+k;b=j*N+(k+1)%N;faces.append((a,b,b+N,a+N))
  mesh=bpy.data.meshes.new('V3 fitted cloth sleeve');mesh.from_pydata(verts,[],faces);uv=mesh.uv_layers.new()
  for p in mesh.polygons:
   p.use_smooth=True
   for li in p.loop_indices:vi=mesh.loops[li].vertex_index;uv.data[li].uv=((vi%N)/N*6,(vi//N)/24*8)
  o=bpy.data.objects.new('Fitted sleeve '+str(side),mesh);scene.collection.objects.link(o);o.data.materials.append(cloth);parent(o,arm);solid=o.modifiers.new('Cloth seam thickness','SOLIDIFY');solid.thickness=.004
  bpy.ops.mesh.primitive_uv_sphere_add(segments=28,ring_count=18,location=curve[0]);o=bpy.context.object;o.name='V3 rounded sleeve shoulder';o.scale=(.068,.068,.058);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(cloth);parent(o,arm)
  for p in o.data.polygons:p.use_smooth=True
  bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,major_radius=.037,minor_radius=.006,location=curve[-1]);o=bpy.context.object;o.name='V3 fitted cuff';o.rotation_euler=Vector((0,0,1)).rotation_difference((curve[-1]-curve[-2]).normalized()).to_euler();o.data.materials.append(cuffmat);parent(o,arm)
 # Place pupils against the actual source eye geometry, not a guessed head
 # height. The source eye meshes and every new overlay share the blink pivot.
 eye=next(o for o in members if o.type=='MESH' and not o.hide_render and ('GEO-' in o.name) and o.name.lower().endswith('_eyes'))
 points=[eye.matrix_world@v.co for v in eye.data.vertices];z=(min(p.z for p in points)+max(p.z for p in points))/2;y=min(p.y for p in points)-.003
 w=eyes.matrix_world.copy();w.translation=Vector((0,y,z));eyes.matrix_world=w
 parent(eye,eyes)
 def sphere(name,pos,scale,m,p=eyes):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=pos);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);parent(o,p)
  for f in o.data.polygons:f.use_smooth=True
 for side in [-1,1]:
  x=side*(.043 if who=='Business' else .054 if who=='Student' else .058)
  sphere('V3 iris',(x,y,z),(.014,.004,.015),iris);sphere('V3 pupil',(x,y-.004,z),(.007,.0018,.008),dark);sphere('V3 catchlight',(x-.003,y-.006,z+.005),(.0023,.001,.0023),glint)
  if who=='Business':
   bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=8,major_radius=.039,minor_radius=.0024,location=(x,y-.014,z),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='V3 optical frame';o.data.materials.append(dark);parent(o,head)
 if who=='Business':
  bpy.ops.mesh.primitive_cube_add(size=1,location=(0,y-.014,z+.005));o=bpy.context.object;o.name='V3 optical bridge';o.dimensions=(.018,.003,.003);o.data.materials.append(dark);parent(o,head)
 # Use only explicitly visible character descendants. Hidden source rigs,
 # original meshes and render helpers are retained in the editable file.
 objects=[root,*root.children_recursive]
 for o in scene.objects:
  if o.name in bpy.context.view_layer.objects:
   o.select_set(False)
   if o in objects and not o.hide_render:o.hide_set(False);o.select_set(True)
 bpy.context.view_layer.objects.active=root
 stem=f'CT_{who}_Explore_v3';bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_image_format='WEBP',export_image_quality=86,export_image_webp_fallback=False)
 E=ROOT/'outputs/v10-explore'/f'{who.lower()}-v3';E.mkdir(exist_ok=True)
 world=bpy.data.worlds.new('Portrait environment');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.16,.18,.16,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.7;scene.world=world
 for name,loc,power,size in [('Key',(-3,-4,4),400,4),('Fill',(3,-2,2),130,3),('Rim',(2,2,3),580,3)]:
  d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('V3 multiview');cam=bpy.data.objects.new(d.name,d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=2.04
 scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
 for name,angle in [('front',0),('right',70),('left',-70),('back',180),('three-quarter',30)]:
  a=math.radians(angle);cam.location=(math.sin(a)*4,-math.cos(a)*4,1.2);cam.rotation_euler=(Vector((0,0,.9))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(E/(name+'.png'));bpy.ops.render.render(write_still=True)
 info=json.loads((OUT/f'CT_{who}_Explore_v2.sources.json').read_text());info.update({'version':3,'source_retained':f'CT_{who}_Explore_v2.blend','adaptation':info['adaptation']+'; measured sleeve fit, corrected optical alignment and grouped blink geometry','web_bytes':(OUT/(stem+'.glb')).stat().st_size,'paid_calls':0,'status':'browser validation pending'});(OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2))
 print('V3_READY',who,flush=True)
