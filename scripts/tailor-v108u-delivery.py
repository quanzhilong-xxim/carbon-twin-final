"""Versioned, offline garment and surface tailoring. No live scene or old asset edits."""
import bpy,bmesh,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10';REV='v108u'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
exec(compile((R/'scripts/tailor-v108n-cloth.py').read_text().split("for who in ['Student','Business']:")[0],__file__,'exec'))

def image(name,rgba):
 h,w=rgba.shape[:2];im=bpy.data.images.new(name,width=w,height=h,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(rgba.astype(np.float32).ravel());im.pack();return im
def normal(name,h,strength):
 dx=(np.roll(h,1,1)-np.roll(h,-1,1))*strength;dy=(np.roll(h,1,0)-np.roll(h,-1,0))*strength
 v=np.stack((dx,dy,np.ones_like(dx)),axis=-1);v/=np.linalg.norm(v,axis=-1,keepdims=True)
 return image(name,np.concatenate((v*.5+.5,np.ones((*h.shape,1))),axis=-1))
def pbr(m,n,rough=.75,amount=.25):
 if not m or not m.use_nodes:return
 p=m.node_tree.nodes.get('Principled BSDF')
 if not p:return
 for link in list(p.inputs['Normal'].links):m.node_tree.links.remove(link)
 t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=n;t.extension='REPEAT';a=m.node_tree.nodes.new('ShaderNodeNormalMap');a.inputs['Strength'].default_value=amount;m.node_tree.links.new(t.outputs['Color'],a.inputs['Color']);m.node_tree.links.new(a.outputs['Normal'],p.inputs['Normal'])
 p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=0;p.inputs['Sheen Weight'].default_value=.025
def curve(name,pts,radius,mat,p):
 d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.bevel_depth=radius;d.bevel_resolution=2;d.resolution_u=3;s=d.splines.new('POLY');s.points.add(len(pts)-1)
 for k,(q,pt) in enumerate(zip(s.points,pts)):q.co=(*pt,1);q.radius=max(.12,math.sin(math.pi*(k+.5)/len(pts))**.24)
 o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);d.materials.append(mat);parent(o,p);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o
def weight(o,root,bones):
 o.vertex_groups.clear();segments=[]
 for name in bones:
  b=root.data.bones[name];segments.append((name,root.matrix_world@b.head_local,root.matrix_world@b.tail_local));o.vertex_groups.new(name=name)
 for v in o.data.vertices:
  p=o.matrix_world@v.co;ds=[]
  for name,a,b in segments:
   d=b-a;t=max(0,min(1,(p-a).dot(d)/max(1e-9,d.length_squared)));ds.append(((p-a-d*t).length,name))
  ds.sort();ds=ds[:2];ws=[math.exp(-((d-ds[0][0])/.04)**2)for d,n in ds];total=sum(ws)
  for (d,n),w in zip(ds,ws):o.vertex_groups[n].add([v.index],w/total,'REPLACE')
 for mod in list(o.modifiers):
  if mod.type=='ARMATURE':o.modifiers.remove(mod)
 a=o.modifiers.new('Retained humanoid garment weights','ARMATURE');a.object=root
def patch_pants(mat,root):
 # Sew front and back left/right panels into the retained upper thighs.
 # Raised, narrow crotch replaces three overlapping balloon-like inserts.
 vs=[];fs=[];nx=40;zs=[.705,.725,.75,.775,.79,.81,.84,.87,.895]
 for side in [-1,1]:
  start=len(vs)
  for face in [-1,1]:
   for z in zs:
    t=max(0,min(1,(z-.775)/.075));t=t*t*(3-2*t);inner=.017*max(0,1-(z-.705)/.085);outer=.145-.012*max(0,(z-.84)/.055)
    for k in range(nx+1):
     u=k/nx;x=inner+(outer-inner)*u;leg=.085;rx=.075;lower=.003+face*.100*math.sqrt(max(.035,1-((x-leg)/rx)**2));upper=.004+face*.112*math.sqrt(max(.035,1-(x/.144)**2));y=lower*(1-t)+upper*t
     y+=face*.0018*math.sin(u*math.pi*7+z*22)*math.sin(u*math.pi)*math.sin((z-.705)/.19*math.pi);vs.append((side*x,y,z))
  rows=len(zs);count=rows*(nx+1)
  for face in range(2):
   for j in range(rows-1):
    for k in range(nx):
     q=start+face*count+j*(nx+1)+k;f=(q,q+1,q+nx+2,q+nx+1);fs.append(f if (face==0)==(side==1)else tuple(reversed(f)))
  for j in range(rows-1):
   for k in [0,nx]:
    q=start+j*(nx+1)+k;fs.append((q,q+nx+1,q+nx+1+count,q+count))
 o=mesh('V108u sewn cargo rise and hip',vs,fs,mat,root);uv=o.data.uv_layers.new()
 for l in o.data.loops:
  p=o.data.vertices[l.vertex_index].co;uv.data[l.index].uv=(p.x*8,p.z*8)
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 weight(o,root,['J_Bip_C_Hips','J_Bip_L_UpperLeg','J_Bip_R_UpperLeg']);return o

for who,base in [('Student','v108p'),('Business','v108n'),('City','v108t')]:
 stem=f'CT_{who}_Explore_{REV}'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Retain existing '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_{base}.blend'),load_ui=False,use_scripts=False);root=bpy.data.objects[f'CT_{who}_Explore_{base}'];root.name=stem
 n=512;y,x=np.mgrid[0:n,0:n];u=x/n;v=y/n;weave=(np.sin(u*math.tau*64)*np.cos(v*math.tau*64)+.25*np.sin((u+v)*math.tau*32))
 textile=normal('V108u '+who+' woven tangent normal',weave,.32);hairnormal=normal('V108u '+who+' longitudinal hair normal',np.sin(u*math.tau*96+np.sin(v*math.tau)*.8),.2)
 changes=['Retained source topology, morphs, rigs and props; real packed tangent normal textures survive GLB export.']
 if who=='Student':
  wool=bpy.data.materials['Original plum woven jacket.001'];jersey=bpy.data.materials['CarbonTwin ivory ribbed inner jersey'];sand=bpy.data.materials['V10 warm recycled cotton.003']
  p=wool.node_tree.nodes.get('Principled BSDF')
  for l in list(p.inputs['Base Color'].links):wool.node_tree.links.remove(l)
  p.inputs['Base Color'].default_value=(.20,.095,.30,1);wool.diffuse_color=(.20,.095,.30,1)
  for name in ['V108n continuous ivory neckline','V108n continuous explorer shoulder','V108n fitted sand cargo hip','V108 closed cargo crotch gusset','V10 merged Breath / Original plum woven jacket']:
   bpy.data.objects[name].hide_render=True
  inner=shell('V108u continuous fine knit',[(.88,.128,.100,.005),(1.15,.136,.099,.005),(1.24,.146,.082,.005),(1.28,.105,.055,.008),(1.31,.044,.037,.010),(1.328,.040,.035,.010)],jersey,root)
  rings=[(.882,.148,.117,.009),(.92,.151,.121,.009),(1.03,.151,.12,.01),(1.13,.153,.118,.01),(1.21,.171,.110,.012),(1.245,.187,.097,.014),(1.27,.169,.081,.013),(1.294,.121,.059,.012),(1.316,.056,.045,.012),(1.326,.046,.041,.012)]
  outer=shell('V108u continuous fitted bomber',rings,wool,root,.24)
  for o in [inner,outer]:weight(o,root,['J_Bip_C_Hips','J_Bip_C_Spine','J_Bip_C_Chest','J_Bip_C_UpperChest'])
  pants=bpy.data.objects['V10 merged CT_Student_Explore_v104g / V10 warm recycled cotton']
  bm=bmesh.new();bm.from_mesh(pants.data);cut=[f for f in bm.faces if (pants.matrix_world@f.calc_center_median()).z>.755];bmesh.ops.delete(bm,geom=cut,context='FACES');bm.to_mesh(pants.data);bm.free();patch_pants(sand,root)
  brass=bpy.data.materials['Brushed brass.001']
  for side in [-1,1]:
   pts=[(side*rx*math.sin(.24),cy-ry*math.cos(.24)-.001,z) for z,rx,ry,cy in rings];trim=curve('V108u bomber bound zipper edge',pts,.0014,brass,root);weight(trim,root,['J_Bip_C_Spine','J_Bip_C_Chest'])
  for o in root.children_recursive:
   if o.type=='MESH' and o.name.startswith('V3 rounded sleeve'):
    def folds(p):
     p=p.copy();a=math.exp(-((p.z-1.02)/.075)**2)*.0025*math.sin(p.z*160+p.x*18);p.y+=a;return p
    deform(o,folds)
   if o.name.startswith(('V108d interwoven rose braid','V108d braid silk filament','V108d lavender braid band')):o.hide_render=True
  pink=bpy.data.materials['V108d rose silk braided hair'];fine=bpy.data.materials['V108d rose hair highlights'];pbr(pink,hairnormal,.55,.32)
  for side in [-1,1]:
   for strand in range(3):
    pts=[]
    for j in range(100):
     t=j/99;a=t*math.pi*12+strand*math.tau/3;r=.013*(1-.45*t);pts.append((side*(.13+.014*math.sin(math.pi*t))+r*math.cos(a),-.048+r*math.sin(a),1.458-.414*t))
    o=curve('V108u compact interwoven braid',pts,.0095,pink,root);weight(o,root,['J_Bip_C_Head'])
    for strandlet in [-1,0,1]:
     o=curve('V108u braid filament',[(x+strandlet*.0025,y-.008,z) for x,y,z in pts],.00032,fine,root);weight(o,root,['J_Bip_C_Head'])
  changes+=['Continuous fitted bomber with bound front edges, full knit neckline and sleeve folds.','Sewn raised-crotch cargo panels replace overlapping hip/gusset shells while preserving weighted legs.','Compact three-strand braids with fine filaments replace oversized ribbon tubes.']
 elif who=='Business':
  face=bpy.data.objects['V108l distinct Business anime face']
  def mature(p):
   p=p.copy();w=math.exp(-((p.z-1.117)/.055)**2);p.x*=1+.045*w
   nose=math.exp(-(p.x/.023)**2-((p.z-1.187)/.035)**2)*max(0,min(1,(-p.y-.10)/.035));p.y-=.003*nose;return p
  deform(face,mature);changes+=['Retained all facial morphs while widening lower jaw slightly and refining nose projection.']
 active={m for o in root.children_recursive if o.type=='MESH' and not o.hide_render for m in o.data.materials if m}
 for m in active:
  name=m.name.lower()
  if any(k in name for k in ['wool','woven jacket','recycled cotton','cotton poplin','knit','canvas']):pbr(m,textile,.78,.22)
  if any(k in name for k in ['layered chestnut hair','sculpted chestnut','hair lock','rose silk','hair_00_hair','fitted hair']):pbr(m,hairnormal,.56,.18)
 root['v108u_refinements']=json.dumps(changes);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 # Keep every armature modifier and expression object separate.
 export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<800:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.6
  try:bpy.ops.object.modifier_apply(modifier=mod.name)
  except RuntimeError:o.modifiers.remove(mod)
 export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_{base}.sources.json').read_text());record.update(version=REV,parent_version=base,paid_calls=0,status='browser review pending');record.setdefault('refinements',[]).extend(changes);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')];(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('V108U_EXPORTED',who,flush=True)
