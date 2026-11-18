"""Fit a parted, strand-detailed groom to the actual retained anime face.
Local original geometry only; R and every earlier editable master stay intact.
"""
import bpy,bmesh,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
stem='CT_City_Explore_v108s'
if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve S master')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_City_Explore_v108r.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_City_Explore_v108r'];root.name=stem;pivot=bpy.data.objects['Head']
face=bpy.data.objects['V108l distinct City anime face']
tree=BVHTree.FromPolygons([face.matrix_world@v.co for v in face.data.vertices],[tuple(p.vertices)for p in face.data.polygons])
for o in root.children_recursive:
 if o.name.startswith('V108k '):o.hide_render=True
hair=bpy.data.materials['V108k City chestnut hair'].copy();hair.name='V108s fitted chestnut satin hair'
p=hair.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.047,.019,.011,1);p.inputs['Roughness'].default_value=.43;p.inputs['Specular IOR Level'].default_value=.30
fiber=hair.copy();fiber.name='V108s restrained warm longitudinal fibres';fiber.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.068,.032,.018,1)
dark=hair.copy();dark.name='V108s fine hair separation';dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.026,.010,.006,1)
def surf(name,vs,fs,material,uvs=None):
 ob=mesh(name,vs,fs,material,pivot);bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
 if uvs:
  uv=ob.data.uv_layers.new()
  for poly in ob.data.polygons:
   for li in poly.loop_indices:uv.data[li].uv=uvs[ob.data.loops[li].vertex_index]
 return ob
def tube(name,points,r,material):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=2;cu.bevel_depth=r;cu.bevel_resolution=2
 sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for q,v in zip(sp.points,points):q.co=(*v,1)
 ob=bpy.data.objects.new(name,cu);bpy.context.scene.collection.objects.link(ob);cu.materials.append(material);parent(ob,pivot)
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')
 for f in ob.data.polygons:f.use_smooth=True
def fitted(x,z,lift=.006):
 # Fit each lock against the current face, rather than the discarded head.
 e=1-(x/.139)**2-((z-1.638)/.158)**2
 ey=-.014-.159*math.sqrt(max(.002,e))
 hit,_,_,_=tree.ray_cast(Vector((x,-.45,z)),Vector((0,1,0)),.6)
 return min(ey,hit.y if hit else ey)-lift
cols=128;rows=36;vs=[];fs=[];uv=[]
for j in range(rows+1):
 for i in range(cols+1):
  phi=i/cols*math.tau;front=max(0,-math.sin(phi));back=max(0,math.sin(phi));edge=1.66+.46*back-.42*front
  theta=.012+(edge-.012)*j/rows;x=.139*math.sin(theta)*math.cos(phi);z=1.638+.158*math.cos(theta);y=-.014+.159*math.sin(theta)*math.sin(phi)
  if front>.5:y=min(y,fitted(x,z,.002))
  vs.append((x,y,z));uv.append((i/cols,j/rows))
for j in range(rows):
 for i in range(cols):q=j*(cols+1)+i;fs.append((q,q+1,q+cols+2,q+cols+1))
surf('V108s fitted crown and graduated temple hairline',vs,fs,hair,uv)
def bez(a,b,c,d,t):return a*(1-t)**3+b*3*(1-t)**2*t+c*3*(1-t)*t*t+d*t**3
def lock(index,endx,endz,side):
 a=Vector((.045+index*.0005,-.038,1.789-index*.00045));b=Vector((-.020 if side<0 else .100,-.105,1.793));c=Vector((endx*.82,-.17,endz+.058));d=Vector((endx,-.15,endz))
 def center(t):
  t=float(t);q=bez(a,b,c,d,t);q.y=fitted(q.x,q.z,.006+.002*math.sin(t*math.pi));return q
 def frame(t):
  q=center(t);tangent=(center(min(1,t+.003))-center(max(0,t-.003))).normalized();normal=Vector((q.x/.139**2,(q.y+.014)/.159**2,(q.z-1.638)/.158**2)).normalized();across=tangent.cross(normal).normalized();normal=across.cross(tangent).normalized();return q,across,normal
 def width(t):return (.012+.006*math.sin(index*1.7)**2)*(.42+.58*math.sin(t*math.pi*.85))*max(.008,1-t**3.3)
 points=[];faces=[];uv=[];n=56;m=10
 for j in range(n+1):
  t=j/n;q,across,normal=frame(t)
  for i in range(m):
   angle=i/m*math.tau;points.append(q+across*math.cos(angle)*width(t)+normal*math.sin(angle)*.0037*max(.03,1-t**3));uv.append((i/m,t))
 for j in range(n):
  for i in range(m):ia=j*m+i;ib=j*m+(i+1)%m;faces.append((ia,ib,ib+m,ia+m))
 faces.extend([tuple(reversed(range(m))),tuple(n*m+i for i in range(m))]);surf('V108s swept tapered lock',points,faces,hair,uv)
 for k in [-.72,-.42,-.1,.22,.55,.79]:
  pts=[]
  for t in np.linspace(.10,.94,36):
   q,across,normal=frame(t);pts.append(q+across*width(t)*k+normal*(.00385*math.sqrt(1-k*k)*max(.03,1-t**3)))
  tube('V108s fitted longitudinal fibre',pts,.00010 if abs(k)<.6 else .00008,fiber if k>0 else dark)
for i,(x,z) in enumerate([(-.130,1.592),(-.121,1.620),(-.102,1.642),(-.076,1.658),(-.043,1.680),(-.006,1.700),(.032,1.721)]):lock(i,x,z,-1)
for i,(x,z) in enumerate([(.075,1.717),(.101,1.688),(.121,1.649),(.133,1.607)]):lock(i+7,x,z,1)
for sign in [-1,1]:
 pts=[Vector((sign*(.126+.008*math.sin(t*math.pi*2)),-.071-.027*math.sin(t*math.pi),1.68-t*.16))for t in np.linspace(0,1,45)]
 # Taper the face framing wisps to prevent blunt tube ends.
 vv=[];ff=[]
 for j,q in enumerate(pts):
  t=j/(len(pts)-1);radius=.0038*(.7+.3*math.sin(t*math.pi))*max(.015,1-t**3)
  for i in range(8):a=i/8*math.tau;vv.append(q+Vector((math.cos(a)*radius,math.sin(a)*radius,0)))
 for j in range(len(pts)-1):
  for i in range(8):a=j*8+i;b=j*8+(i+1)%8;ff.append((a,b,b+8,a+8))
 surf('V108s tapered temple wisp',vv,ff,hair)
root['v108s']='Groom fitted to the actual anime facial BVH: graduated scalp, asymmetric swept part, eleven shaped locks, sixty-six longitudinal fibres, tapered temple wisps; R neck, rig, facial morphs, clothes, bun and props retained.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
combine_static(root);export(root,stem);export(root,stem+'-portrait')
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
 bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.55
 try:bpy.ops.object.modifier_apply(modifier=mod.name)
 except RuntimeError:o.modifiers.remove(mod)
export(root,stem+'-lite')
record=json.loads((OUT/'CT_City_Explore_v108r.sources.json').read_text());record.update(version='v108s',parent_version='v108r',paid_calls=0,status='actual webpage review pending');record['refinements'].append(root['v108s']);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('FITTED_CIVIC_GROOM_S',flush=True)
