"""Local reference-led groom/portrait refinement. Every H/I source is retained.
No remote generation or changes to the user's live Blender document.
"""
import bpy,bmesh,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))

def mat(name,color,rough=.5,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m

def surface(name,vs,fs,material,pivot,uvs=None):
 ob=mesh(name,vs,fs,material,pivot);bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
 if uvs:
  uv=ob.data.uv_layers.new()
  for poly in ob.data.polygons:
   for li in poly.loop_indices:uv.data[li].uv=uvs[ob.data.loops[li].vertex_index]
 return ob

def tube(name,ps,r,material,pivot,closed=False):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=3;cu.bevel_depth=r;cu.bevel_resolution=3
 sp=cu.splines.new('NURBS');sp.points.add(len(ps)-1)
 for q,p in zip(sp.points,ps):q.co=(*p,1)
 sp.order_u=min(4,len(ps));sp.use_endpoint_u=not closed;sp.use_cyclic_u=closed
 ob=bpy.data.objects.new(name,cu);bpy.context.scene.collection.objects.link(ob);cu.materials.append(material);parent(ob,pivot)
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')
 for f in ob.data.polygons:f.use_smooth=True
 return ob

def deform(ob,fn):
 inv=ob.matrix_world.inverted();arrays=[k.data for k in ob.data.shape_keys.key_blocks] if ob.data.shape_keys else [ob.data.vertices]
 for arr in arrays:
  for v in arr:v.co=inv@fn(ob.matrix_world@v.co)
 if ob.data.shape_keys:
  for v,k in zip(ob.data.vertices,ob.data.shape_keys.key_blocks[0].data):v.co=k.co

for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v108j'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Retained candidate already exists '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v108h.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v108h'];root.name=stem;pivot=bpy.data.objects['Head'];business=who=='Business';eye=1.20 if business else 1.588
 head=bpy.data.objects['Source / GEO-snow_head' if business else 'Source / GEO-rain_head']
 def sculpt(p):
  p=p.copy()
  if p.y<-.065:
   n=math.exp(-(p.x/.029)**4-((p.z-(eye-.055))/.031)**4);p.x*=1-.11*n;p.y+=.005*n
   lip=math.exp(-(p.x/.035)**6-((p.z-(eye-.096))/.023)**4);p.y+=.002*lip
   if business:p.x*=1+.055*math.exp(-((p.z-(eye-.14))/.035)**2)
  return p
 deform(head,sculpt)
 for ob in root.children_recursive:
  if ob.type=='MESH' and not ob.hide_render and ob.name.endswith(('_head','_eyes','_eyelashes')):
   def eyes(p):
    p=p.copy();cx=math.copysign(.05,p.x);w=math.exp(-((p.x-cx)/.042)**4-((p.z-eye)/.034)**4) if p.y<-.07 else 0;p.z=eye+(p.z-eye)*(1-(.10 if business else .055)*w);return p
   deform(ob,eyes)
  if ob.name.startswith(('V108h continuous','V108h overlapping')):ob.hide_render=True
  if business and any(x in ob.name for x in ['complete optical rim','spectacle temple','arched nose bridge']):ob.hide_render=True
 # Smooth only UV-scale colour noise; keep source lip/cheek shading and UVs.
 for m in head.data.materials:
  p=m.node_tree.nodes.get('Principled BSDF')
  for link in list(p.inputs['Roughness'].links):m.node_tree.links.remove(link)
  p.inputs['Roughness'].default_value=.73;p.inputs['Specular IOR Level'].default_value=.22
  for node in m.node_tree.nodes:
   if node.type!='TEX_IMAGE' or not node.image or not any(l.to_socket==p.inputs['Base Color'] for l in node.outputs['Color'].links):continue
   src=node.image;w,h=src.size;px=np.array(src.pixels[:],np.float32).reshape(h,w,4);low=px.copy()
   for _ in range(2):
    for axis in [0,1]:low=sum(np.roll(low,i,axis=axis)for i in range(-3,4))/7
   px[:,:,:3]=px[:,:,:3]*.2+low[:,:,:3]*.8
   im=bpy.data.images.new('V108j '+who+' softened source complexion',width=w,height=h,alpha=True);im.pixels.foreach_set(px.ravel());im.pack();node.image=im
 ps=[head.matrix_world@v.co for v in head.data.vertices];tree=BVHTree.FromPolygons(ps,[tuple(p.vertices)for p in head.data.polygons]);center=Vector((0,.005,1.24 if business else 1.64))
 hair=mat('V108j '+who+' chestnut hair',(.068,.028,.015)if business else(.058,.024,.015),.5);fiber=mat('V108j restrained hair filaments',(.10,.048,.027),.57)
 # Original tangent fibre texture, aligned to each lock's longitudinal UV.
 n=256;y,x=np.mgrid[:n,:n];f=.5+.25*np.sin(x/n*math.tau*83+np.sin(y/n*6)*.18);dx=np.roll(f,1,1)-np.roll(f,-1,1);px=np.stack((.5+dx*.13,np.full_like(dx,.5),np.ones_like(dx),np.ones_like(dx)),axis=2).astype(np.float32)
 im=bpy.data.images.new('V108j original directional fibre normal',width=n,height=n,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(px.ravel());im.pack();tex=hair.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;nm=hair.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.13;hair.node_tree.links.new(tex.outputs['Color'],nm.inputs['Color']);hair.node_tree.links.new(nm.outputs['Normal'],hair.node_tree.nodes['Principled BSDF'].inputs['Normal'])
 def radial(phi,theta,lift):
  d=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)));hit,_,_,_=tree.ray_cast(center,d,1)
  if hit is None:hit=center+Vector((d.x*.12,d.y*.13,d.z*.11))
  return hit+d*lift
 # Scalp follows anatomy, but its hairline rises over the open side part.
 cols=112;rows=24;vs=[];fs=[];uv=[]
 for j in range(rows+1):
  for i in range(cols+1):
   phi=i/cols*math.tau;front=max(0,-math.sin(phi));back=max(0,math.sin(phi));edge=1.53+.48*back-.50*front+.065*math.sin(phi*3)+.045*math.sin(phi*7)
   vs.append(radial(phi,.02+(edge-.02)*j/rows,.004));uv.append((i/cols,j/rows))
 for j in range(rows):
  for i in range(cols):q=j*(cols+1)+i;fs.append((q,q+1,q+cols+2,q+cols+1))
 surface('V108j anatomical open hairline',vs,fs,hair,pivot,uv)
 # Distinct long swept bangs, varied ends and soft lifted roots. The crown
 # and side locks form a silhouette instead of a single straight hat rim.
 def strand(k,short=False):
  u=k/17;end=(1.43+.32*math.sin(u*math.pi))if business else(1.50+.40*math.sin(u*math.pi));start_phi=-.20+u*.45
  def point(t):
   phi=start_phi-(1.65+u*.70)*t+.12*math.sin(t*math.pi*2+u*2)*t
   theta=.13+u*.15+(end-.13-u*.15)*t
   return radial(phi,theta,.008+(.014+.01*math.sin(u*8))*math.sin(t*math.pi)**.8)
  points=[];faces=[];uv=[];nc=10;nr=36
  for j in range(nr+1):
   t=j/nr;c=point(t);tan=(point(min(1,t+.003))-point(max(0,t-.003))).normalized();normal=(c-center).normalized();side=tan.cross(normal).normalized();normal=side.cross(tan).normalized();width=(.016+.010*math.sin(u*math.pi))*(.65+.35*math.sin(t*math.pi))*max(.008,1-t**4)
   for i in range(nc):
    a=i/nc*math.tau;points.append(c+side*math.cos(a)*width+normal*math.sin(a)*.0045*max(.01,1-t**4));uv.append((i/nc,t))
  for j in range(nr):
   for i in range(nc):a=j*nc+i;b=j*nc+(i+1)%nc;faces.append((a,b,b+nc,a+nc))
  faces.extend([tuple(reversed(range(nc))),tuple(nr*nc+i for i in range(nc))]);surface('V108j layered swept fringe',points,faces,hair,pivot,uv)
  if k%3==0:tube('V108j fine tapered flyaway',[point(t)+Vector((0,-.001,.001))for t in np.linspace(.12,.92,18)],.00032,fiber,pivot)
 for k in range(18):strand(k)
 # Side and rear locks blend the crop into the retained nape/bun.
 for k in range(20):
  phi=k/20*math.tau;tube('V108j crown-to-nape strand',[radial(phi+.16*math.sin(t*math.pi),.35+t*(1.25+max(0,math.sin(phi))*.6),.006)for t in np.linspace(0,1,20)],.0015,hair,pivot)
 if business:
  frame=mat('V108j thin graphite optical metal',(.025,.030,.027),.30,.6)
  def fy(x):return -.179+.030*(abs(x)/.10)**1.6
  for sign in [-1,1]:
   cx=sign*.047;points=[]
   for i in range(48):
    a=i/48*math.tau;c=math.cos(a);s=math.sin(a);x=cx+.042*math.copysign(abs(c)**.72,c);z=eye+.022*math.copysign(abs(s)**.75,s);points.append((x,fy(x),z))
   tube('V108j rounded rectangular optical rim',points,.00118,frame,pivot,True)
   tube('V108j optical temple',[(sign*.088,fy(.088),eye+.009),(sign*.112,-.08,eye+.015),(sign*.119,.012,eye+.004)],.0011,frame,pivot)
  tube('V108j nose bridge',[(-.007,-.179,eye+.008),(0,-.182,eye+.014),(.007,-.179,eye+.008)],.00115,frame,pivot)
 else:
  # Wavy face-framing tendril with a pointed tip, not a cylindrical tube.
  for sign in [-1,1]:
   points=[(sign*(.108+.014*math.sin(t*math.pi*2)), -.045-.04*math.sin(t*math.pi),1.68-t*.16)for t in np.linspace(0,1,28)];tube('V108j soft temple curl',points,.0045,hair,pivot)
 root['v108j_refinement']='Open asymmetrical anatomical hairline, 18 tapered volumetric swept bangs, 20 nape strands, directional UV normal, softened source complexion, coordinated eyelids and fine optical frames'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 combine_static(root);export(root,stem);export(root,stem+'-portrait')
 for ob in root.children_recursive:
  if ob.type!='MESH' or ob.hide_render or ob.data.shape_keys or len(ob.data.polygons)<400:continue
  bpy.context.view_layer.objects.active=ob;mod=ob.modifiers.new('Web distance LOD','DECIMATE');mod.ratio=.55;bpy.ops.object.modifier_apply(modifier=mod.name)
 export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_v108h.sources.json').read_text());record.update(version='v108j',parent_version='v108h',paid_calls=0,status='isolated browser visual review required');record['refinements']+=[root['v108j_refinement']];record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')];(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('LAYERED_GROOM_EXPORTED',who,flush=True)
