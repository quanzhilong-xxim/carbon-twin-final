"""Local, editable geometry and material improvements, with original masters retained.
No generated images, remote calls, new dependencies or changes to the live Blender.
"""
import bpy, bmesh, math, json, hashlib, os
import numpy as np
from pathlib import Path
from mathutils import Vector

R=Path(__file__).resolve().parents[1]
OUT=R/'public/models/characters-v10'
REV=os.environ.get('CT_ART_REVISION','v108d')
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))

def material(name,color,rough=.5,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m

def woven_normal(name):
 n=256;y,x=np.mgrid[0:n,0:n];sx=np.sin(x/n*math.tau*32);sy=np.sin(y/n*math.tau*32)
 height=(sx*.5+.5)*(sy*.5+.5)*.4+(sx+sy)*.1
 dx=np.roll(height,1,axis=1)-np.roll(height,-1,axis=1);dy=np.roll(height,1,axis=0)-np.roll(height,-1,axis=0)
 a=np.stack((dx*.45,dy*.45,np.ones_like(dx)),axis=-1);a/=np.linalg.norm(a,axis=-1,keepdims=True)
 rgba=np.concatenate((a*.5+.5,np.ones((n,n,1))),axis=-1).astype(np.float32)
 im=bpy.data.images.new(name,width=n,height=n,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(rgba.ravel());im.pack();return im

def cloth(m,normal,color=None,rough=.74):
 if not m or not m.use_nodes:return
 p=m.node_tree.nodes.get('Principled BSDF')
 if not p:return
 if color:
  for l in list(p.inputs['Base Color'].links):m.node_tree.links.remove(l)
  p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Roughness'].default_value=rough;p.inputs['Sheen Weight'].default_value=.06
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=normal;tex.extension='REPEAT'
 normal_node=m.node_tree.nodes.new('ShaderNodeNormalMap');normal_node.inputs['Strength'].default_value=.22
 m.node_tree.links.new(tex.outputs['Color'],normal_node.inputs['Color']);m.node_tree.links.new(normal_node.outputs['Normal'],p.inputs['Normal'])

def tube(name,points,radius,mat,p,flatten=1):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=3;curve.bevel_depth=radius;curve.bevel_resolution=3
 spline=curve.splines.new('NURBS');spline.points.add(len(points)-1)
 for i,(point,co) in enumerate(zip(spline.points,points)):
  point.co=(*co,1);point.radius=max(.08,math.sin(math.pi*(i+.5)/len(points))**.45)
 spline.order_u=min(4,len(points));spline.use_endpoint_u=True
 ob=bpy.data.objects.new(name,curve);bpy.context.scene.collection.objects.link(ob);curve.materials.append(mat);parent(ob,p)
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')
 for f in ob.data.polygons:f.use_smooth=True
 return ob

def rounded(name,loc,size,mat,p,r=.02):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(mat);b=o.modifiers.new('Rounded crafted edge','BEVEL');b.width=r;b.segments=4
 bpy.ops.object.modifier_apply(modifier=b.name)
 for f in o.data.polygons:f.use_smooth=True
 parent(o,p);return o

def ellipsoid(name,loc,size,mat,p):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=14,location=loc);o=bpy.context.object;o.name=name;o.scale=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 parent(o,p);return o

def groom(root,who):
 head=bpy.data.objects['Head'];gold=bpy.data.materials['V10 satin brass']
 m=material('V108d '+who+' layered chestnut hair',(.055,.025,.017),.43)
 anis=m.node_tree.nodes.get('Principled BSDF').inputs.get('Anisotropic');
 if anis:anis.default_value=.5
 highlights=material('V108d '+who+' fine hair filaments',(.105,.048,.024),.48)
 for o in root.children_recursive:
  if who=='Business' and any(n in o.name for n in ['measured side swept fringe','scalp attached swept lock']):o.hide_render=True
  if who=='City' and any(n in o.name for n in ['fitted tapered civic fringe','shallow side-part strand']):o.hide_render=True
 z=1.71 if who=='Business' else 1.755
 # Long tapered locks follow a continuous scalp, varying both curl and lift.
 for i in range(15):
  t=i/14;points=[]
  for j in range(10):
   u=j/9;x=.055-.18*u+(.025-t*.045)*math.sin(math.pi*u);y=.035-.18*math.sin(u*math.pi*.57)+t*.035;zz=z-.17*u*u+.018*math.sin(u*math.pi)+.012*math.sin(u*math.pi*2+t)
   points.append((x,y,zz))
  tube('V108d swept tapered hair lock',points,.010+math.sin(t*math.pi)*.009,m,head)
  for k in [-1,1]:tube('V108d fine groom filament',[(x+k*.004,y-.001,zz+.009) for x,y,zz in points],.00065,highlights,head)
 if who=='City':
  for i in range(12):
   a=i*math.tau/12;points=[(.045*math.cos(a+u*.7),.105+.027*math.sin(u*math.pi),1.573+.043*math.sin(a+u*.7)) for u in np.linspace(0,1,10)]
   tube('V108d braided low-bun strand',points,.004,m,head)
  # Small botanical hair clasp, echoing the coat pin.
  for i in range(5):
   a=i*math.tau/5;leaf=ellipsoid('V108d gold hairpin leaf',(.035+math.cos(a)*.015,.132,1.599+math.sin(a)*.015),(.006,.003,.014),gold,head);leaf.rotation_euler.y=a
 for o in root.children_recursive:
  if o.type=='MESH' and o.name.endswith('_eyebrows'):
   o.data.materials.clear();o.data.materials.append(material('V108d '+who+' defined eyebrow',(.055,.025,.02),.8))

def seated_leg(point):
 p=point.copy();z=p.z;hip=.90;knee=.48;angle=math.radians(79);c=math.cos(angle);s=math.sin(angle)
 # Smoothly weighted hip and knee, retaining the original tailored topology.
 thigh=Vector((p.x,p.y*c+(z-hip)*s,.55-p.y*s+(z-hip)*c))
 shin=Vector((p.x,p.y-(hip-knee)*s,.55-(hip-knee)*c+z-knee))
 w=max(0,min(1,(z-(knee-.07))/.14));w=w*w*(3-2*w)
 p=shin.lerp(thigh,w)
 spread=max(0,min(1,(hip-z)/.35))*.025;p.x+=math.copysign(spread,p.x)
 return p

for who,base in [('Student','v108b'),('Business','v108c'),('City','v108c')]:
 stem=f'CT_{who}_Explore_{REV}'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Refusing to overwrite existing art source '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_{base}.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects['Root' if who=='Student' else f'CT_{who}_Explore_{base}'];normal=woven_normal('V108d original woven normal')
 changes=[]
 if who=='Student':
  hair=bpy.data.objects['Hair'];bm=bmesh.new();bm.from_mesh(hair.data)
  cut=[f for f in bm.faces if (hair.matrix_world@f.calc_center_median()).z<1.40]
  bmesh.ops.delete(bm,geom=cut,context='FACES');bm.to_mesh(hair.data);bm.free()
  pink=material('V108d rose silk braided hair',(.58,.21,.34),.42)
  pink_fine=material('V108d rose hair highlights',(.78,.39,.48),.48)
  for side in [-1,1]:
   for strand in range(3):
    points=[]
    for j in range(36):
     t=j/35;phase=t*math.pi*5+strand*math.tau/3;rad=.027*(1-t*.55)
     points.append((side*(.129+.024*math.sin(t*math.pi))+math.cos(phase)*rad,-.052+math.sin(phase)*rad,1.47-t*.43))
    ob=tube('V108d interwoven rose braid',points,.018,pink,root)
    vg=ob.vertex_groups.new(name='J_Bip_C_Head');vg.add(list(range(len(ob.data.vertices))),1,'REPLACE');mod=ob.modifiers.new('Retained head bone weights','ARMATURE');mod.object=root
    fine=tube('V108d braid silk filament',[(x,y-.014,z+.002) for x,y,z in points],.0011,pink_fine,root)
    vg=fine.vertex_groups.new(name='J_Bip_C_Head');vg.add(list(range(len(fine.data.vertices))),1,'REPLACE');mod=fine.modifiers.new('Retained head bone weights','ARMATURE');mod.object=root
   tie=rounded('V108d lavender braid band',(side*.129,-.056,1.055),(.052,.04,.026),bpy.data.materials['Original plum woven jacket.001'],root,.008)
   vg=tie.vertex_groups.new(name='J_Bip_C_Head');vg.add(list(range(len(tie.data.vertices))),1,'REPLACE');mod=tie.modifiers.new('Head weights','ARMATURE');mod.object=root
  cloth(bpy.data.materials.get('Original plum woven jacket.001'),normal,(.32,.19,.46),.7)
  cloth(bpy.data.materials.get('V10 warm recycled cotton.003'),normal,(.64,.52,.35),.85)
  for o in root.children_recursive:
   if o.type=='MESH' and o.name.startswith('V10 merged CT_Student'):
    bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Soft canvas fold continuity','SMOOTH');mod.factor=.6;mod.iterations=4;bpy.ops.object.modifier_apply(modifier=mod.name)
  grip=bpy.data.materials.get('V104 charcoal grip with fine mineral.001')
  if grip:
   p=grip.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.11,.075,.19,1);p.inputs['Roughness'].default_value=.89
  changes=['braided geometry replaces long straight lower hair; retained humanoid head weights','lavender woven jacket and softly smoothed canvas cargo trousers; real tangent normal texture','all source face morphs, skeleton, camera, backpack and skateboard retained']
 else:
  root.name=stem;groom(root,who)
  cloth(bpy.data.materials.get('Fine midnight pinstripe wool' if who=='Business' else 'Ivory tailored wool'),normal,None,.66 if who=='Business' else .73)
  # Relax the original individual fingers at the distal joints.
  for o in root.children_recursive:
   if o.type=='MESH' and o.name.startswith('Source skin') and o.name!='Source skin torso':
    inverse=o.matrix_world.inverted()
    for v in o.data.vertices:
     p=o.matrix_world@v.co;t=max(0,min(1,(.79-p.z)/.06));p.y-=.018*t*t;p.z+=.014*t*t;v.co=inverse@p
  changes=['layered tapered chestnut locks, fine filaments and defined eyebrows','woven tangent normal fabric and relaxed source finger geometry']
  if who=='Business':
   for o in root.children_recursive:
    if o.type=='MESH' and any(s in o.name for s in ['GEO-snow_pants','GEO-snow_shoes']):
     inv=o.matrix_world.inverted()
     for v in o.data.vertices:v.co=inv@seated_leg(o.matrix_world@v.co)
   bpy.data.objects['Breath'].location.z-=.35
   leather=material('V108d dark botanical leather',(.032,.038,.027),.4);metal=material('V108d brushed chair brass',(.34,.24,.10),.32,.75)
   rounded('V108d leather seat',(0,.03,.46),(.57,.56,.12),leather,root,.06)
   back=rounded('V108d upholstered back',(0,.27,.84),(.58,.12,.73),leather,root,.075);back.rotation_euler.x=math.radians(-7)
   for side in [-1,1]:
    rounded('V108d padded leather arm',(side*.32,-.005,.70),(.085,.51,.075),leather,root,.035)
    for y in [-.18,.20]:rounded('V108d chair support',(side*.25,y,.24),(.025,.025,.44),metal,root,.01)
    tube('V108d leather arm saddle stitch',[(side*.35,-.23+i*.46/12,.74) for i in range(13)],.0012,metal,root)
   for i in range(7):tube('V108d backrest stitched channel', [((i-3)*.075,.191, .58+j*.045) for j in range(13)],.001,metal,root)
   changes.append('continuous hip/knee mesh deformation to a natural seated pose; fitted leather chair, armrests, upholstery and brass feet')
  else:
   # A gently weighted shoulder drape, with a continuous neckline and hem.
   ivory=bpy.data.materials['Ivory tailored wool'];n=80;verts=[];faces=[]
   for j in range(6):
    t=j/5
    for i in range(n):
     a=-math.pi/2+.70+i/(n-1)*(math.tau-1.40);rx=.073+t*.245;ry=.058+t*.112;z=1.424-t*.225-.025*t*math.cos(a*2)+math.sin(a*3)*.009*t*t
     verts.append((rx*math.cos(a),.008+ry*math.sin(a),z))
   for j in range(5):
    for i in range(n-1):k=j*n+i;faces.append((k,k+1,k+n+1,k+n))
   cape=mesh('V108d softly draped ivory shoulder cape',verts,faces,ivory,bpy.data.objects['Breath']);sub=cape.modifiers.new('Soft drape subdivision','SUBSURF');sub.levels=2;bpy.context.view_layer.objects.active=cape;bpy.ops.object.modifier_apply(modifier=sub.name);solid=cape.modifiers.new('Tailored cloth thickness','SOLIDIFY');solid.thickness=.0025;bpy.ops.object.modifier_apply(modifier=solid.name)
   tube('V108d continuous cape gold binding',verts[-n:],.0017,bpy.data.materials['V10 satin brass'],bpy.data.objects['Breath'])
   changes.append('continuous soft ivory shoulder cape and fine gold binding with actual cloth thickness')
 root['v108d_art_changes']=json.dumps(changes);root['paid_calls']=0
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 if who=='Student':
  members=[root,*root.children_recursive];bpy.ops.object.select_all(action='DESELECT')
  for o in members:o.select_set(not o.hide_render)
  bpy.context.view_layer.objects.active=root;bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_skins=True,export_morph=True)
 else:
  combine_static(root);export(root,stem);export(root,stem+'-portrait')
  for o in root.children_recursive:
   if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
   bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Retained web distance LOD','DECIMATE');dec.ratio=.55;bpy.ops.object.modifier_apply(modifier=dec.name)
  export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_{base}.sources.json').read_text(encoding='utf-8'))
 record.update(version=REV,parent_version=base,status='web integration and art review pending',paid_calls=0)
 record['refinements']=record.get('refinements',[])+changes
 record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in OUT.glob(stem+'*.glb')]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf-8')
 print('ART_MODEL_EXPORTED',who,flush=True)
