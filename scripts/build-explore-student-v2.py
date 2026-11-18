"""Editable, attributed character upgrade. Source meshes are retained unchanged.
Rain Rig © Blender Foundation | cloud.blender.org, CC-BY-4.0.
Original CarbonTwin outfit and props. No cloud generation or paid calls.
"""
import bpy,math,json,random
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';EVIDENCE=ROOT/'outputs/v10-explore/student-v2';EVIDENCE.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Rain_v1.blend'),load_ui=False,use_scripts=False)
scene=bpy.context.scene;rig=bpy.data.objects['RIG-rain'];controls=rig.pose.bones['Properties_IKFK']
for side in ['left','right']:controls['ik_arm_'+side]=0.0
rig.update_tag();bpy.context.view_layer.update()
for side in ['L','R']:
 bone=rig.pose.bones['FK-Upperarm.'+side];matrix=bone.matrix.copy();loc=matrix.translation.copy();matrix.translation=(0,0,0);bone.matrix=Matrix.Translation(loc)@Matrix.Rotation((1 if side=='L' else -1)*math.radians(68),4,'Y')@matrix
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
source=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('GEO-') and not o.hide_render]
# Bake only evaluated, visible geometry. Drivers in the official rig are never
# executed as Python; the original rig stays in the v1 mother file.
baked=[]
for o in source:
 if any(k in o.name for k in ['scarf','ponytail','cornea']) or o.name.endswith('_top'):continue
 for mod in o.modifiers:
  if mod.type=='SUBSURF':mod.levels=1;mod.render_levels=1
 mesh=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps);mesh.transform(o.matrix_world)
 b=bpy.data.objects.new('Study / '+o.name,mesh);scene.collection.objects.link(b);baked.append(b)
 for p in mesh.polygons:p.use_smooth=True
for o in list(scene.objects):
 if o not in baked:
  o.hide_render=True
  if o.name in bpy.context.view_layer.objects:o.hide_set(True)
def group(name,p,parent=None):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.location=p
 if parent:o.parent=parent;o.matrix_parent_inverse=parent.matrix_world.inverted()
 bpy.context.view_layer.update();return o
def parent(o,target):
 world=o.matrix_world.copy();o.parent=target;o.matrix_world=world
root=group('CT_Student_Explore_v2',(0,0,0));body=group('Breath',(0,0,1.0),root);head=group('Head',(0,0,1.39),body);eyes=group('Eyes',(0,-.085,1.51),head)
armR=group('ArmRight',(-.175,0,1.28),body);armL=group('ArmLeft',(.175,0,1.28),body)
for o in baked:
 name=o.name.lower()
 if any(s in name for s in ['head','hair','brow','lash','gums','tongue','eye']):parent(o,eyes if 'eye_' in name or name.endswith('_eyes') else head)
 elif 'jeans' in name or 'shoes' in name:parent(o,root)
 else:parent(o,body)
def material(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
purple=material('Original plum woven jacket',(.26,.13,.43),.82);rib=material('Rib knit cuffs',(.13,.065,.23),.94);lining=material('Warm jacket lining',(.61,.41,.25),.92);cream=material('Warm canvas',(.75,.68,.5),.85);gold=material('Brushed brass',(.43,.27,.085),.28,.78);rose=material('Rose hair fibre',(.57,.18,.32),.43);lightrose=material('Rose hair highlights',(.72,.29,.40),.45);packmat=material('Botanical canvas backpack',(.20,.28,.17),.92);dark=material('Camera body',(.028,.045,.041),.5,.45);rubber=material('Soft black rubber',(.035,.035,.03),.94);lens=material('Optical lens',(.05,.19,.18),.12,.6)
# Exportable fabric normal texture; UVs on the jacket repeat this weave.
size=256;image=bpy.data.images.new('Original fine woven normal',width=size,height=size,alpha=False);pixels=[]
for y in range(size):
 for x in range(size):
  nx=.5+.16*math.sin(x*math.pi/2)*(1 if y%4<2 else .7);ny=.5+.16*math.sin(y*math.pi/2)*(1 if x%4<2 else .7);pixels.extend((nx,ny,.98,1))
image.pixels[:]=pixels;image.filepath_raw=str(OUT/'CT_Woven_Normal_v2.png');image.file_format='PNG';image.save();image.colorspace_settings.name='Non-Color';image.pack()
for mat in [purple,cream,packmat]:
 n=mat.node_tree.nodes;t=n.new('ShaderNodeTexImage');t.image=image;normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.24;mat.node_tree.links.new(t.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs[0],n.get('Principled BSDF').inputs['Normal'])
def finish(o,mat,target=body):
 o.data.materials.append(mat);parent(o,target)
 if o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 return o
def cube(name,p,s,mat,target=body,bevel=.012):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:m=o.modifiers.new('Tailored rounded edges','BEVEL');m.width=bevel;m.segments=3;o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 return finish(o,mat,target)
def sphere(name,p,s,mat,target=body):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=p);o=bpy.context.object;o.name=name;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,mat,target)
def torus(name,p,r,t,mat,target=body,rotation=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=10,major_radius=r,minor_radius=t,location=p,rotation=rotation);o=bpy.context.object;o.name=name;return finish(o,mat,target)
def curve(name,points,r,mat,target=body,radii=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for i,(p,v) in enumerate(zip(s.bezier_points,points)):p.co=v;p.handle_left_type='AUTO';p.handle_right_type='AUTO';p.radius=radii[i] if radii else 1
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.data.materials.append(mat);parent(o,target);return o
def loft(name,rings,mat,target=body,segments=64):
 verts=[];faces=[]
 for j,(x,y,z,rx,ry) in enumerate(rings):
  for i in range(segments):
   a=2*math.pi*i/segments;fold=1+.02*math.sin(a*9+j*.7)+.015*math.sin(a*15-j)
   verts.append((x+math.cos(a)*rx*fold,y+math.sin(a)*ry*fold,z))
 for j in range(len(rings)-1):
  for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);uv=mesh.uv_layers.new(name='Woven UV')
 for p in mesh.polygons:
  for li in p.loop_indices:
   vi=mesh.loops[li].vertex_index;uv.data[li].uv=((vi%segments)/segments*8,(vi//segments)/max(1,len(rings)-1)*8)
 o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);solid=o.modifiers.new('Fabric thickness','SOLIDIFY');solid.thickness=.005;sub=o.modifiers.new('Soft cloth surface','SUBSURF');sub.levels=1;sub.render_levels=1;return finish(o,mat,target)
loft('Tailored exploration jacket',[(0,0,.89,.17,.115),(0,0,.92,.178,.12),(0,0,1.00,.158,.113),(0,0,1.08,.162,.118),(0,0,1.17,.177,.127),(0,0,1.24,.174,.118),(0,0,1.29,.135,.09)],purple)
loft('Ribbed jacket hem',[(0,0,.887,.173,.118),(0,0,.91,.178,.122)],rib)
curve('Brass jacket zipper',[(0,-.121,.91),(0,-.121,1.05),(0,-.134,1.18),(0,-.10,1.29)],.003,gold)
cube('Zipper pull',(0,-.136,1.19),(.014,.004,.024),gold)
for side,target in [(-1,armR),(1,armL)]:
 # Joint positions taken from the source's evaluated FK pose, so sleeves are
 # fitted around the actual licensed arms rather than replacing the hands.
 bone=rig.pose.bones['DEF-Upperarm1.'+('R' if side<0 else 'L')];wrist=rig.pose.bones.get('DEF-Forearm2.'+('R' if side<0 else 'L'))
 shoulder=Vector((side*.182,0,1.272));elbow=Vector((side*.255,0,1.055));end=Vector((side*.32,-.01,.84))
 if wrist:
  candidate=rig.matrix_world@wrist.tail
  if candidate.z>.5 and abs(candidate.x)<.7:end=candidate
 direction=(end-shoulder).normalized();length=(end-shoulder).length
 # Circular cloth tube follows the arm with small elbow compression folds.
 rings=[];axis=Vector((0,0,1));quat=axis.rotation_difference(direction)
 for j in range(14):
  t=j/13;centre=shoulder.lerp(end,t);radius=(.068*(1-t)+.046*t)*(1+.075*math.sin(t*31)*math.sin(t*math.pi));rings.append((centre,radius))
 verts=[];faces=[];N=28
 for centre,radius in rings:
  for k in range(N):a=k/N*math.pi*2;verts.append(tuple(centre+quat@Vector((math.cos(a)*radius,math.sin(a)*radius,0))))
 for j in range(13):
  for k in range(N):a=j*N+k;b=j*N+(k+1)%N;faces.append((a,b,b+N,a+N))
 mesh=bpy.data.meshes.new('Sculpted sleeve');mesh.from_pydata(verts,[],faces);uv=mesh.uv_layers.new();
 for p in mesh.polygons:
  for li in p.loop_indices:vi=mesh.loops[li].vertex_index;uv.data[li].uv=((vi%N)/N*5,(vi//N)/13*8)
 o=bpy.data.objects.new('Sleeve / '+str(side),mesh);scene.collection.objects.link(o);finish(o,purple,target);solid=o.modifiers.new('Sleeve thickness','SOLIDIFY');solid.thickness=.004
 cuff=torus('Knitted cuff',tuple(end),.044,.012,rib,target);cuff.rotation_euler=quat.to_euler()
 sphere('Soft jacket shoulder',(side*.17,.0,1.255),(.075,.078,.085),purple,target)
 # Seams and the backpack shoulder harness are modelled, editable curves.
 curve('Jacket shoulder seam',[(side*.11,-.095,1.29),(side*.175,-.08,1.27),(side*.21,-.055,1.22)],.002,lining)
 curve('Backpack strap',[(side*.13,.17,.92),(side*.17,.17,1.20),(side*.155,.015,1.31),(side*.14,-.12,1.19),(side*.14,-.12,1.0)],.014,packmat)
 cube('Harness brass adjuster',(side*.14,-.135,1.08),(.035,.013,.035),gold)
 cube('Jacket pocket',(side*.105,-.118,.975),(.10,.018,.065),purple)
curve('Soft cream collar',[(-.10,-.055,1.29),(-.06,-.10,1.31),(0,-.10,1.30),(.065,-.10,1.31),(.10,-.05,1.29)],.018,cream)
# Sculpted long, rose hair with separate highlight strands and tapered tips.
for side in [-1,1]:
 for j in range(7):
  pts=[]
  for k in range(10):
   t=k/9;pts.append((side*(.09+.045*math.sin(t*7+j*.5)+t*.07),.025+j*.009+.024*math.sin(t*9+j),1.60-t*(.47+j*.006)))
  curve('Rose layered lock',pts,.018 if j%2 else .023,rose,head,[.65]+[1]*7+[.6,.05])
  curve('Fine hair highlight',[(p[0]+side*.008,p[1]-.013,p[2]) for p in pts],.0025,lightrose,head,[.4]+[1]*7+[.5,.03])
# Protective cap and raised goggles; the face stays unobstructed.
sphere('Explorer soft cap',(0,.025,1.662),(.145,.125,.065),lining,head)
curve('Cap binding',[(-.14,.01,1.64),(-.1,-.09,1.65),(0,-.115,1.65),(.10,-.09,1.65),(.14,.01,1.64)],.011,cream,head)
for side in [-1,1]:
 torus('Goggle brass rim',(side*.052,-.111,1.683),.038,.006,gold,head,(math.pi/2,0,0));sphere('Raised optical glass',(side*.052,-.115,1.683),(.033,.009,.03),lens,head)
curve('Goggle bridge',[(-.018,-.113,1.683),(0,-.122,1.69),(.018,-.113,1.683)],.004,gold,head)
# Visible, rounded iris detail. The official eye white stays behind these
# non-flat iris lenses; no opaque corneal shell covers the painted eyes.
iris=material('Green teal irises',(.10,.25,.18),.28);pupil=material('Soft dark pupil',(.008,.012,.01),.22);catchlight=material('Eye catchlight',(.94,.95,.81),.15)
for side in [-1,1]:
 sphere('Iris lens',(side*.054,-.130,1.514),(.014,.006,.015),iris,head)
 sphere('Pupil',(side*.054,-.136,1.514),(.006,.002,.008),pupil,head)
 sphere('Eye reflection',(side*.054-.003,-.138,1.520),(.0026,.001,.003),catchlight,head)
cube('Canvas expedition backpack',(0,.145,1.055),(.29,.15,.34),packmat,body,.04);cube('Backpack flap',(0,.185,1.20),(.30,.1,.10),cream,body,.025);cube('Backpack outside pocket',(0,.24,1.02),(.20,.045,.14),packmat,body,.025)
for x in [-.075,.075]:cube('Pack clasp',(x,.247,1.13),(.025,.02,.075),gold)
cube('Field camera',(0,-.172,1.035),(.13,.055,.09),dark,body,.014);torus('Camera lens ring',(0,-.211,1.035),.03,.007,gold,body,(math.pi/2,0,0));sphere('Camera lens',(0,-.216,1.035),(.026,.008,.026),lens);cube('Camera top shutter',(.04,-.174,1.09),(.025,.022,.012),gold)
curve('Camera woven strap',[(-.06,-.17,1.08),(-.09,-.12,1.27),(0,-.06,1.35),(.09,-.12,1.27),(.06,-.17,1.08)],.004,cream)
board=cube('Curved skateboard deck',(.37,.10,.30),(.15,.035,.54),purple,root,.05);board.rotation_euler.y=-.14
for z in [.11,.48]:
 cube('Skateboard axle',(.37,.14,z),(.19,.018,.018),gold,root)
 for side in [-1,1]:
  wheel=torus('Skateboard wheel',(.37+side*.095,.14,z),.025,.012,cream,root,(0,math.pi/2,0))
# Replace body-only arm triangles with hinged copies. The split is concealed by
# the tailored shoulders; source hands and UVs are preserved.
for o in list(baked):
 if not o.name.endswith('_body'):continue
 mesh=o.data;parts={'torso':[],'left':[],'right':[]}
 for p in mesh.polygons:
  c=sum((mesh.vertices[i].co for i in p.vertices),Vector())/len(p.vertices);key='left' if c.x>.17 and c.z>.67 else 'right' if c.x<-.17 and c.z>.67 else 'torso';parts[key].append(p)
 for key,polys in parts.items():
  if not polys:continue
  verts=[];faces=[];uvs=[];mats=[]
  for poly in polys:
   start=len(verts);verts.extend(tuple(mesh.vertices[i].co) for i in poly.vertices);faces.append(tuple(range(start,len(verts))));mats.append(poly.material_index);uvs.extend(tuple(mesh.uv_layers.active.data[li].uv) if mesh.uv_layers.active else (0,0) for li in poly.loop_indices)
  m=bpy.data.meshes.new('Original posed skin '+key);m.from_pydata(verts,[],faces)
  for mat in mesh.materials:m.materials.append(mat)
  uv=m.uv_layers.new()
  for li,v in enumerate(uvs):uv.data[li].uv=v
  for p,mi in zip(m.polygons,mats):p.material_index=mi;p.use_smooth=True
  piece=bpy.data.objects.new('Source skin '+key,m);scene.collection.objects.link(piece);parent(piece,body if key=='torso' else armL if key=='left' else armR)
 o.hide_render=True;o.hide_set(True)
for m in bpy.data.materials:
 if m.name=='CT rose hair':m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.57,.18,.32,1)
 if m.name in ['CT clear eye surface']:
  p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=0;p.inputs['Metallic'].default_value=.12;p.inputs['Alpha'].default_value=.18;m.surface_render_method='DITHERED'
objects=[root,*root.children_recursive]
for o in scene.objects:
 if o.name in bpy.context.view_layer.objects:o.select_set(o in objects and not o.hide_render)
bpy.context.view_layer.objects.active=root
for im in bpy.data.images:
 if im.size[0]>1024:im.scale(1024,1024)
 if im.source=='FILE':
  try:im.pack()
  except:pass
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'CT_Student_Explore_v2.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'CT_Student_Explore_v2.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_image_format='WEBP',export_image_quality=86,export_image_webp_fallback=False)
# Multiview evidence uses the same exported source geometry, no generated photos.
for o in scene.objects:
 if o.type in ['LIGHT','CAMERA']:o.hide_render=True
world=bpy.data.worlds.new('Neutral warm portrait studio');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.19,.22,.19,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.65;scene.world=world
for name,loc,power,size in [('Key',(-3,-4,4),420,4),('Soft fill',(3,-2,2),140,3),('Warm rim',(2,2,3),620,3)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Multiview inspection');cam=bpy.data.objects.new(d.name,d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=1.95
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
for name,angle in [('front',0),('right',70),('left',-70),('back',180),('three-quarter',30)]:
 a=math.radians(angle);cam.location=(math.sin(a)*4,-math.cos(a)*4,1.15);cam.rotation_euler=(Vector((0,0,.88))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(EVIDENCE/(name+'.png'));bpy.ops.render.render(write_still=True)
info={'source':'https://studio.blender.org/characters/rain/v2/','license':'CC-BY-4.0','credit':'Rain Rig © Blender Foundation | cloud.blender.org','adaptation':'CarbonTwin original jacket, cap, goggles, long rose hair, backpack, field camera and skateboard','source_retained':'CT_Student_Rain_v1.blend','web_bytes':(OUT/'CT_Student_Explore_v2.glb').stat().st_size,'paid_calls':0,'status':'visual review pending'}
(OUT/'CT_Student_Explore_v2.sources.json').write_text(json.dumps(info,indent=2),encoding='utf8');print('STUDENT_V2_EXPORTED',info['web_bytes'])
