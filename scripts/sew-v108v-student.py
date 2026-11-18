"""Continuous, welded cargo garment; versioned offline source only."""
import bpy,bmesh,math,json,hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10';REV='v108v'
exec(compile((R/'scripts/tailor-v108u-delivery.py').read_text().split("for who,base in [(")[0],__file__,'exec'))
REV='v108v' # The imported helper prefix declares its own revision.
stem='CT_Student_Explore_'+REV
if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve existing version')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v108u.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v108u'];root.name=stem
for name in ['V108u sewn cargo rise and hip','V10 merged CT_Student_Explore_v104g / V10 warm recycled cotton']:
 bpy.data.objects[name].hide_render=True
sand=bpy.data.materials['V10 warm recycled cotton.003'];wool=bpy.data.materials['Original plum woven jacket.001']
def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
# Four garment panels share the same exact inner/outer boundaries. Below the
# crotch the inner seam joins front to back; above it left joins right.
zs=[.108+i*(.895-.108)/100 for i in range(101)]+[.70,.735,.75,.765,.775,.79,.82]
zs=sorted(set(zs));nx=48;vs=[];fs=[]
def section(z):
 knots=[(.108,.075,.044,.043),(.16,.079,.055,.055),(.25,.087,.071,.075),(.38,.091,.074,.082),(.45,.090,.062,.066),(.52,.091,.079,.083),(.62,.091,.084,.09),(.70,.090,.082,.091),(.765,.083,.083,.101),(.84,.073,.073,.110),(.895,.067,.067,.107)]
 for a,b in zip(knots,knots[1:]):
  if z<=b[0]:
   t=smooth((z-a[0])/(b[0]-a[0]));return [a[i]*(1-t)+b[i]*t for i in range(1,4)]
 return knots[-1][1:]
for side in [-1,1]:
 for face in [-1,1]:
  start=len(vs)
  for z in zs:
   c,rx,ry=section(z);inner=max(.0,c-rx)*(1-smooth((z-.70)/.065));outer=c+rx;t=smooth((z-.765)/.065)
   for k in range(nx+1):
    u=k/nx;x=inner+(outer-inner)*u;lower=ry*math.sqrt(max(0,1-(2*u-1)**2));upper=ry*math.sqrt(max(0,1-(x/outer)**2))
    depth=lower*(1-t)+upper*t
    fold=(.0028*math.sin(z*125+u*math.pi*5)+.0015*math.sin(z*230-u*7))*math.sin(math.pi*u)**2
    depth+=fold*(1-t)*math.exp(-((z-.43)/.11)**2)
    vs.append((side*x,.002+face*max(0,depth),z))
  for j in range(len(zs)-1):
   for k in range(nx):
    q=start+j*(nx+1)+k;fs.append((q,q+1,q+nx+2,q+nx+1))
pants=mesh('V108v welded four-panel cargo trouser',vs,fs,sand,root)
bm=bmesh.new();bm.from_mesh(pants.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000005);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(pants.data);bm.free()
uv=pants.data.uv_layers.new()
for l in pants.data.loops:
 p=pants.data.vertices[l.vertex_index].co;uv.data[l.index].uv=(p.x*6+p.y*3,p.z*6)
weight(pants,root,['J_Bip_C_Hips','J_Bip_L_UpperLeg','J_Bip_R_UpperLeg','J_Bip_L_LowerLeg','J_Bip_R_LowerLeg'])
# A disconnected horizontal strap from the old coat crossed the new knit.
# Keep the genuine camera neck strap, remove only the horizontal component.
strap=bpy.data.objects['V10 merged Breath / V10 forest charcoal silk']
bm=bmesh.new();bm.from_mesh(strap.data);todo=set(bm.verts);removed=[]
while todo:
 first=todo.pop();group={first};stack=[first]
 while stack:
  v=stack.pop()
  for edge in v.link_edges:
   n=edge.other_vert(v)
   if n in todo:todo.remove(n);group.add(n);stack.append(n)
 pts=[strap.matrix_world@v.co for v in group];lo=[min(p[i]for p in pts)for i in range(3)];hi=[max(p[i]for p in pts)for i in range(3)]
 if hi[0]-lo[0]>.10 and hi[2]-lo[2]<.04 and lo[2]>1.05 and hi[2]<1.19:
  removed.append(dict(min=lo,max=hi));bmesh.ops.delete(bm,geom=list(group),context='VERTS')
bm.to_mesh(strap.data);bm.free()
# Replace rope cylinders with tightly interleaved, tapered strands.
for o in root.children_recursive:
 if o.name.startswith(('V108u compact interwoven braid','V108u braid filament')):o.hide_render=True
pink=bpy.data.materials['V108d rose silk braided hair'];fine=bpy.data.materials['V108d rose hair highlights']
for mat,col in [(pink,(.39,.075,.15,1)),(fine,(.52,.13,.22,1))]:
 p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=col;mat.diffuse_color=col;p.inputs['Roughness'].default_value=.65
for side in [-1,1]:
 for strand in range(3):
  pts=[]
  for j in range(150):
   t=j/149;a=t*math.pi*15+strand*math.tau/3;r=.009*(1-.65*t);pts.append((side*(.139+.013*math.sin(math.pi*t))+r*math.cos(a),-.044+r*math.sin(a),1.455-.398*t))
  o=curve('V108v woven rose braid',pts,.011,pink,root);weight(o,root,['J_Bip_C_Head'])
  for offset in [-1,1]:
   o=curve('V108v fine hair sheen',[(x+offset*.002,y-.009,z) for x,y,z in pts],.00022,fine,root);weight(o,root,['J_Bip_C_Head'])
root['v108v']='Welded continuous cargo topology, weighted full legs, tapered braid and removed crossing horizontal strap.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
export(root,stem);export(root,stem+'-portrait')
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<800:continue
 bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
 try:bpy.ops.object.modifier_apply(modifier=mod.name)
 except RuntimeError:o.modifiers.remove(mod)
export(root,stem+'-lite')
record=json.loads((OUT/'CT_Student_Explore_v108u.sources.json').read_text());record.update(version=REV,parent_version='v108u',paid_calls=0,status='browser review pending',removed_crossing_components=removed)
record['refinements'].append(root['v108v']);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('V108V_EXPORTED',flush=True)
