"""V10.3: reference-led local continuation, not a replacement character pipeline.
Reuses Rain/Snow © Blender Foundation, CC BY 4.0. Retains every earlier master.
Bakes the retained facial controls into portable morph targets; original cloth,
hair microtextures, long civic coat and explorer equipment remain editable.
No remote calls. Run with Blender 5.2 --background --python-exit-code 1.
"""
import bpy,math,json,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
BASE=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets')
E=ROOT/'outputs/v10-explore/characters-v10';E.mkdir(exist_ok=True)
def image_file(name,values,noncolor=False):
 h,w=values.shape[:2];im=bpy.data.images.new(name,width=w,height=h,alpha=True)
 if noncolor:im.colorspace_settings.name='Non-Color'
 im.pixels.foreach_set(np.asarray(values,dtype=np.float32).ravel());im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
def texture(path,name,kind):
 im=bpy.data.images.load(str(path),check_existing=True).copy();im.name=name
 if max(im.size)>1024:im.scale(1024,1024)
 w,h=im.size;p=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4)
 if kind=='skin':
  # Preserve the artist's freckles, lips and painted variation. Lift the
  # complexion towards the supplied warm ivory palette, without a flat fill.
  p[:,:,:3]=np.minimum(1,np.power(np.maximum(p[:,:,:3],0),[.62,.68,.72])*[1.30,1.28,1.25])
 elif kind in ['rose','chestnut']:
  l=np.maximum(.001,p[:,:,:3].mean(axis=2));l=.62+.45*np.power(l,.55)
  p[:,:,:3]=l[:,:,None]*np.array([.58,.19,.29] if kind=='rose' else [.095,.046,.026])
 elif kind=='rough':
  p[:,:,:3]=np.clip(.39+p[:,:,:3]*.28,.4,.68)
 return image_file(name,p,kind=='rough')
def pbr(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
def link_image(m,im,socket,normal=0):
 n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=im
 if normal:
  q=m.node_tree.nodes.new('ShaderNodeNormalMap');q.inputs['Strength'].default_value=normal;m.node_tree.links.new(n.outputs['Color'],q.inputs['Color']);m.node_tree.links.new(q.outputs['Normal'],m.node_tree.nodes['Principled BSDF'].inputs[socket])
 else:m.node_tree.links.new(n.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs[socket])
def parent(o,p):
 bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=p;o.matrix_world=w
def mesh_object(name,verts,faces,m,p,thickness=0,sub=0):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(o);o.data.materials.append(m)
 uv=mesh.uv_layers.new()
 for f in mesh.polygons:
  f.use_smooth=True
  for li in f.loop_indices:
   v=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(v.x*13,v.z*13)
 if thickness:q=o.modifiers.new('Real cloth edge thickness','SOLIDIFY');q.thickness=thickness
 if sub:q=o.modifiers.new('Tailored soft surface','SUBSURF');q.levels=sub;q.render_levels=sub
 parent(o,p);return o
def curve(name,points,r,m,p,radii=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for i,(b,pt) in enumerate(zip(s.bezier_points,points)):b.co=pt;b.handle_left_type='AUTO';b.handle_right_type='AUTO';b.radius=radii[i] if radii else 1
 o=bpy.data.objects.new(name,c);bpy.context.scene.collection.objects.link(o);o.data.materials.append(m);parent(o,p);return o
def cube(name,pos,size,m,p,bevel=.006):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:q=o.modifiers.new('Rounded equipment edges','BEVEL');q.width=bevel;q.segments=3;o.modifiers.new('Equipment normals','WEIGHTED_NORMAL')
 o.data.materials.append(m);parent(o,p);return o
def sphere(name,pos,size,m,p):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=pos);o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 parent(o,p);return o
def evaluated(o):
 bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();ev=o.evaluated_get(deps);me=ev.to_mesh();ps=np.array([ev.matrix_world@v.co for v in me.vertices]);ev.to_mesh_clear();return ps
report={}
for who,version in [('Student',6),('Business',9),('City',9)]:
 source=OUT/f'CT_{who}_Explore_v{version}.blend';bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
 scene=bpy.context.scene;root=bpy.data.objects[f'CT_{who}_Explore_v{version}'];root.name=f'CT_{who}_Explore_v10';members=[root,*root.children_recursive]
 for o in list(scene.objects):
  if o not in members and o.type in ['MESH','CURVE']:o.driver_remove('hide_render');o.hide_render=True
 business=who=='Business';student=who=='Student';head=bpy.data.objects['Head'];body=bpy.data.objects['Breath'];rig=bpy.data.objects['RIG-Snow' if business else 'RIG-rain']
 # Exact retained topology fits were measured before transfer, not guessed.
 targets=[]
 for o in members:
  if o.type!='MESH' or o.hide_render:continue
  if not any(o.name.endswith('_'+s) for s in ['head','eyes','eyebrows','eyelashes']):continue
  src=bpy.data.objects.get(o.name.split(' / ')[-1])
  if not src:continue
  original=evaluated(src);dest=np.array([o.matrix_world@v.co for v in o.data.vertices])
  if original.shape!=dest.shape:raise RuntimeError('Facial topology mismatch '+o.name)
  coeff=np.linalg.lstsq(np.column_stack((original,np.ones(len(original)))),dest,rcond=None)[0]
  error=float(np.abs(np.column_stack((original,np.ones(len(original))))@coeff-dest).max())
  if error>1e-5:raise RuntimeError('Facial transfer fit exceeded tolerance '+o.name)
  o.shape_key_add(name='Basis');targets.append((o,src,original,coeff,error))
 control_bases={b.name:b.matrix.copy() for b in rig.pose.bones if b.name.startswith(('ACT-','MSTR-','TGT-'))}
 def reset():
  for name,m in control_bases.items():rig.pose.bones[name].matrix=m
  rig.update_tag();bpy.context.view_layer.update()
 def offset(name,delta):
  b=rig.pose.bones.get(name)
  if b:m=b.matrix.copy();m.translation+=Vector(delta);b.matrix=m
 shapes=['BlinkLeft','BlinkRight','Smile','GazeLeft','GazeRight','GazeDown']
 for shape in shapes:
  reset()
  if shape.startswith('Blink'):
   side='L' if shape=='BlinkLeft' else 'R';prefix='MSTR-' if business else 'ACT-'
   offset(prefix+'Eyelid_Upper.'+side,(0,0,-(.022 if business else .027)))
   offset(prefix+'Eyelid_Lower.'+side,(0,0,.009 if business else .010))
  elif shape=='Smile':
   for side,sign in [('L',1),('R',-1)]:
    offset('ACT-Lips_Corner.'+side,(sign*.003,0,.004 if student else .0028));offset('MSTR-Eyebrow.'+side,(0,0,.0014))
  else:
   name='MSTR-TGT-Eyes' if business else 'TGT-Eyes'
   offset(name,(-.09 if shape=='GazeRight' else .09 if shape=='GazeLeft' else 0,0,-.07 if shape=='GazeDown' else 0))
  rig.update_tag();bpy.context.view_layer.update()
  for o,src,original,coeff,error in targets:
   after=evaluated(src);delta=(after-original)@coeff[:3,:];key=o.shape_key_add(name=shape);inverse=o.matrix_world.inverted().to_3x3()
   for i,v in enumerate(o.data.vertices):key.data[i].co=v.co+inverse@Vector(delta[i])
 reset()
 # Skin: original licensed painted variation, individual roughness and a very
 # restrained, original tangent normal. glTF uses ordinary portable PBR.
 maps=BASE/('snow-v2/extracted/maps/bake' if business else 'rain-v2/extracted/maps')
 facepath=maps/('skin_diffuse.1001.png' if business else 'TEX-rain_head_diffuse.png')
 facecolor=texture(facepath,'CT_'+who+'_Skin_Color_v10','skin')
 n=512;yy,xx=np.mgrid[:n,:n];rng=np.random.default_rng(41);noise=rng.normal(0,.012,(n,n));norm=np.ones((n,n,4),dtype=np.float32);norm[:,:,0]=.5+noise+np.sin(xx*2.1+yy*.8)*.009;norm[:,:,1]=.5+rng.normal(0,.012,(n,n));norm[:,:,2]=.998
 skin_normal=image_file('CT_'+who+'_Skin_Normal_v10',norm,True)
 face=pbr('V10 '+who+' warm painted skin',(.7,.45,.32),.54);p=face.node_tree.nodes['Principled BSDF'];p.inputs['Specular IOR Level'].default_value=.28;p.inputs['Subsurface Weight'].default_value=.065;p.inputs['Subsurface Radius'].default_value=(1,.36,.2)
 link_image(face,facecolor,'Base Color');link_image(face,skin_normal,'Normal',.12)
 if not business:link_image(face,texture(maps/'TEX-rain_head_roughness.png','CT_'+who+'_Skin_Roughness_v10','rough'),'Roughness')
 else:
  rough=np.ones((512,512,4),dtype=np.float32);rough[:,:,:3]=(.53+noise*.8)[:,:,None];link_image(face,image_file('CT_'+who+'_Skin_Roughness_v10',rough,True),'Roughness')
 for o,src,original,coeff,error in targets:
  if o.name.endswith('_head'):
   o.data.materials.clear();o.data.materials.append(face)
   for f in o.data.polygons:f.material_index=0
 # Hands and neck match the new face rather than exposing body-atlas clothing.
 hand=pbr('V10 '+who+' hand and neck skin',(.62,.37,.25),.58);hand.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.25;link_image(hand,skin_normal,'Normal',.12)
 for o in members:
  if o.type=='MESH' and not o.hide_render and o.name.startswith('Source skin'):
   o.data.materials.clear();o.data.materials.append(hand)
   for f in o.data.polygons:f.material_index=0
 # Original hair UVs and directional roughness recover fibre detail.
 hairpath=maps/('hair_diffuse.png' if business else 'TEX-rain_hair_diffuse.png');hair=pbr('V10 '+who+' directional hair',(.5,.15,.25) if student else (.09,.045,.025),.56)
 link_image(hair,texture(hairpath,'CT_'+who+'_Hair_Color_v10','rose' if student else 'chestnut'),'Base Color')
 if not business:
  im=bpy.data.images.load(str(maps/'TEX-rain_hair_roughness.png'),check_existing=True).copy();im.scale(1024,1024);im.colorspace_settings.name='Non-Color';im.pack();link_image(hair,im,'Roughness')
 for o in members:
  if o.type=='MESH' and not o.hide_render and ('_hair_main' in o.name or '_hair_strand' in o.name):
   o.data.materials.clear();o.data.materials.append(hair)
   for f in o.data.polygons:f.material_index=0
 # The retained cloth weave was too strong/regular at medium distance.
 for m in bpy.data.materials:
  if not m.use_nodes:continue
  for nd in m.node_tree.nodes:
   if nd.type=='NORMAL_MAP':nd.inputs['Strength'].default_value=min(nd.inputs['Strength'].default_value,.11)
  p=m.node_tree.nodes.get('Principled BSDF')
  if p and any(k in m.name.lower() for k in ['wool','woven jacket','canvas','cotton','poplin']):p.inputs['Sheen Weight'].default_value=.16;p.inputs['Sheen Roughness'].default_value=.7
 cream=pbr('V10 warm recycled cotton',(.7,.6,.44),.84);black=pbr('V10 forest charcoal silk',(.024,.040,.033),.72);gold=pbr('V10 satin brass',(.52,.34,.12),.3,.72)
 # Reference-led costume corrections, layered over the retained fitted body.
 if student:
  jeans=bpy.data.objects['Study / GEO-rain_jeans'];jeans.data.materials.clear();jeans.data.materials.append(cream)
  for f in jeans.data.polygons:f.material_index=0
  # Cargo pockets have thickness, a flap and actual stitching.
  for side in [-1,1]:
   pocket=cube('V10 explorer cargo pocket',(side*.127,-.005,.62),(.055,.09,.14),cream,root,.007)
   cube('V10 cargo pocket flap',(side*.145,-.015,.686),(.058,.095,.025),cream,root,.006)
   curve('V10 cargo side seam',[(side*.142,-.041,.83),(side*.15,-.03,.67),(side*.12,-.02,.44)],.001,cream,root)
  # Readable camera front: glass layers, radial controls and a real wrist dial.
  for j in range(12):
   a=j*math.tau/12;cube('V10 lens grip',(.038*math.cos(a),-.217,1.035+.038*math.sin(a)),(.004,.008,.005),black,body,.001)
  for j in range(3):sphere('V10 camera control',(.04+j*.009,-.204,1.055),(.003,.002,.003),gold,body)
  curve('V10 camera leather strap',[(-.06,-.183,1.07),(-.10,-.145,1.23),(0,-.08,1.29),(.10,-.145,1.23),(.06,-.183,1.07)],.0035,black,body)
  pack=bpy.data.objects['Canvas expedition backpack'];pack.data.materials.clear();pack.data.materials.append(cream)
  curve('V10 backpack zipper',[(-.12,.22,1.18),(-.12,.24,1.24),(0,.25,1.25),(.12,.24,1.24),(.12,.22,1.18)],.002,gold,body)
  for side in [-1,1]:
   cube('V10 backpack buckle',(side*.09,.248,1.14),(.025,.012,.032),gold,body,.003)
  # Fine ribbing is geometry on the beanie, not a noisy displacement shader.
  for i in range(44):
   a=i*math.tau/44;pts=[]
   for j in range(7):
    t=j/6;pts.append((.146*math.cos(a)*(1-t*.64),.025+.126*math.sin(a)*(1-t*.64),1.646+.082*math.sin(t*math.pi/2)))
   curve('V10 knitted cap rib',pts,.0011,cream,head)
 elif who=='City':
  # The supplied 080 reference is an ivory long coat over a dark dress.
  for name in ['Shirt front','Folded poplin collar','Folded poplin collar.001','Jacket button','Jacket button.001']:
   o=bpy.data.objects.get(name)
   if o:o.hide_render=True
  cube('V10 dark high-neck insert',(0,-.136,1.30),(.13,.026,.26),black,body,.012)
  rings=[(.48,.235,.135),(.53,.232,.138),(.70,.21,.135),(.87,.19,.126),(1.02,.177,.122)]
  verts=[];faces=[];N=64
  for j,(z,rx,ry) in enumerate(rings):
   for k in range(N):a=k/N*math.tau;fold=1+.024*math.sin(a*12+j*.6);verts.append((rx*math.cos(a)*fold,ry*math.sin(a)*fold,z))
  for j in range(len(rings)-1):
   for k in range(N):a=j*N+k;b=j*N+(k+1)%N;faces.append((a,b,b+N,a+N))
  mesh_object('V10 charcoal pleated underdress',verts,faces,black,body,.005,1)
  # Long coat tails curve around the back and remain open in front.
  verts=[];faces=[];N=56;R=12
  for j in range(R):
   t=j/(R-1);z=1.02-t*.56
   for k in range(N):
    a=-math.pi*.32+k/(N-1)*math.pi*1.64;rx=.18+.08*t;ry=.126+.04*t;fold=1+.025*math.sin(a*10+t*4)*t;verts.append((math.cos(a)*rx*fold,math.sin(a)*ry*fold,z+.055*math.cos(a*2)*t))
  for j in range(R-1):
   for k in range(N-1):i=j*N+k;faces.append((i,i+1,i+N+1,i+N))
  wool=bpy.data.materials['Ivory tailored wool'];mesh_object('V10 open long ivory coat',verts,faces,wool,body,.007,1)
  for side in [0,N-1]:curve('V10 gold long coat edge',[verts[j*N+side] for j in range(R)],.0018,gold,body)
  # Shoulder cape layers have a real folded edge and a restrained gold hem.
  verts=[];faces=[];N=48
  for j in range(6):
   t=j/5
   for k in range(N):
    a=-math.pi*.28+k/(N-1)*math.pi*1.56;verts.append(((.115+.18*t)*math.cos(a),(.082+.09*t)*math.sin(a),1.43-.22*t+.012*math.cos(a*3)*t))
  for j in range(5):
   for k in range(N-1):i=j*N+k;faces.append((i,i+1,i+N+1,i+N))
  mesh_object('V10 layered civic shoulder cape',verts,faces,wool,body,.006,1);curve('V10 cape gold hem',verts[-N:],.0015,gold,body)
  cube('V10 waist belt',(0,-.132,.975),(.37,.017,.035),black,body,.005);cube('V10 belt clasp',(0,-.145,.975),(.035,.007,.028),gold,body,.003)
  for o in members:
   if o.type=='MESH' and not o.hide_render and o.name.endswith(('_jeans','_shoes')):
    o.data.materials.clear();o.data.materials.append(black)
    for f in o.data.polygons:f.material_index=0
 else:
  # A functional cuff/watch sits on the actual retained right wrist.
  arm=bpy.data.objects['ArmRight'];cube('V10 watch face',(-.29,-.047,.895),(.032,.012,.033),gold,arm,.005)
  cube('V10 watch dial',(-.29,-.055,.895),(.025,.003,.026),black,arm,.004)
  for j in range(12):
   a=j*math.tau/12;sphere('V10 watch index',(-.29+math.sin(a)*.009,-.057,.895+math.cos(a)*.01),(.001,.001,.0018),gold,arm)
  curve('V10 watch hour hand',[(-.29,-.058,.895),(-.286,-.058,.901)],.0007,gold,arm)
 # Non-uniform fine flyaways follow the retained head silhouette. One joined
 # curve object per character keeps draw calls bounded.
 strands=bpy.data.curves.new('V10 fine hair silhouettes','CURVE');strands.dimensions='3D';strands.resolution_u=5;strands.bevel_depth=.00045;strands.bevel_resolution=1
 hairmesh=next(o for o in members if o.type=='MESH' and '_hair_main' in o.name) if not business else next(o for o in members if o.type=='MESH' and 'hair' in o.name.lower() and not o.hide_render)
 points=[hairmesh.matrix_world@v.co for v in hairmesh.data.vertices];chosen=[p for i,p in enumerate(points) if i%max(1,len(points)//80)==0 and p.z>max(v.z for v in points)-.15]
 for i,p in enumerate(chosen):
  s=strands.splines.new('BEZIER');s.bezier_points.add(3)
  for j,b in enumerate(s.bezier_points):
   t=j/3;b.co=(p.x+(1 if p.x>0 else -1)*math.sin(t*math.pi)*.004,p.y+.006*t,p.z+.01*math.sin(t*math.pi)-.012*t);b.radius=(1-t)*.6+.08;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 obj=bpy.data.objects.new('V10 fine hair silhouettes',strands);scene.collection.objects.link(obj);obj.data.materials.append(hair);parent(obj,head)
 members=[root,*root.children_recursive]
 for o in members:
  if o.type=='MESH' and not o.hide_render:
   for f in o.data.polygons:f.use_smooth=True
 # Keep the original source rig and six editable expression keys in the master.
 stem=f'CT_{who}_Explore_v10';bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 for o in scene.objects:
  if o.name in bpy.context.view_layer.objects:o.select_set(o in members and not o.hide_render)
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True,export_apply=False,export_animations=False,export_morph=True,export_morph_normal=True,export_image_format='WEBP',export_image_quality=88,export_image_webp_fallback=False)
 info=json.loads((OUT/f'CT_{who}_Explore_v{version}.sources.json').read_text());info.update(version=10,retained_source=str(source),reference_file={'Student':'074_a3ba842c39b243196a3b5b1eadb4bc43.png','Business':'078_b49ef97a9684a5ef4ee637b0d9566b80.png','City':'080_c41043c1772b8ebc1d72eb8775b19069.png'}[who],facial_morphs=shapes,facial_fit_error=max(t[-1] for t in targets),paid_calls=0,status='pending runtime visual acceptance',web_bytes=(OUT/(stem+'.glb')).stat().st_size)
 (OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2));report[who]=info;print('V10_CHARACTER_EXPORTED',who,info['web_bytes'],flush=True)
(E/'asset-result.json').write_text(json.dumps(report,indent=2))
