"""Measured local civic tailoring; immutable M master retained. No API calls."""
import bpy, bmesh, math, json, hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/tailor-v108n-cloth.py').read_text().split("for who in ['Student','Business']:")[0],__file__,'exec'))
stem='CT_City_Explore_v108q'
if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve existing Q source')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_City_Explore_v108m.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_City_Explore_v108m'];root.name=stem;body=bpy.data.objects['Breath']
for name in ['V108d softly draped ivory shoulder cape','V108d continuous cape gold binding','V108c closed civic shoulder','V108c dark continuous neckline','V10 continuous dark inner dress']:
 bpy.data.objects[name].hide_render=True
shell('V108q fitted charcoal silk neckline',[(.975,.128,.093,-.004),(1.20,.132,.102,-.004),(1.29,.133,.088,-.003),(1.335,.109,.067,-.002),(1.375,.060,.044,.002),(1.410,.045,.039,.003),(1.426,.044,.039,.003)],bpy.data.materials['V10 forest charcoal silk'],body)
# The shoulder radius reaches its maximum before the hem drops. The old
# linear radius growth produced a triangular wing at either side.
rings=[(1.432,.064,.054),(1.422,.093,.061),(1.407,.144,.077),(1.381,.205,.105),(1.348,.243,.130),(1.303,.253,.145),(1.258,.254,.148),(1.218,.250,.147)]
n=112;vs=[];fs=[];hem=[]
for j,(z,rx,ry) in enumerate(rings):
 t=j/(len(rings)-1)
 for k in range(n+1):
  a=-math.pi/2+.70+k/n*(math.tau-1.40)
  fold=math.sin(a*7+.3)*.0028*t*t+math.sin(a*3)*.002*t
  p=((rx+fold)*math.cos(a),.013+(ry+fold)*math.sin(a),z+.009*t*t*math.cos(a*3))
  vs.append(p)
  if j==len(rings)-1:hem.append(p)
for j in range(len(rings)-1):
 for k in range(n):q=j*(n+1)+k;fs.append((q,q+1,q+n+2,q+n+1))
o=mesh('V108q curved shoulder drape',vs,fs,bpy.data.materials['Ivory tailored wool'],body)
bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
uv=o.data.uv_layers.new()
for f in o.data.polygons:
 for li in f.loop_indices:
  i=o.data.loops[li].vertex_index;uv.data[li].uv=((i%(n+1))/n*2,(i//(n+1))/(len(rings)-1))
bpy.context.view_layer.objects.active=o
sub=o.modifiers.new('Soft continuous shoulder','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
sol=o.modifiers.new('Real wool edge','SOLIDIFY');sol.thickness=.0025;bpy.ops.object.modifier_apply(modifier=sol.name)
curve=bpy.data.curves.new('Q fine cape binding','CURVE');curve.dimensions='3D';curve.bevel_depth=.0012;curve.bevel_resolution=2
s=curve.splines.new('NURBS');s.points.add(len(hem)-1)
for point,co in zip(s.points,hem):point.co=(*co,1)
s.order_u=4;s.use_endpoint_u=True
edge=bpy.data.objects.new('V108q fine shoulder binding',curve);bpy.context.scene.collection.objects.link(edge);curve.materials.append(bpy.data.materials['V10 satin brass']);parent(edge,body)
bpy.ops.object.select_all(action='DESELECT');edge.select_set(True);bpy.context.view_layer.objects.active=edge;bpy.ops.object.convert(target='MESH')
root['v108q']='Fitted silk neckline; curved shoulder drape with near-vertical hem, UVs, folds, thickness and restrained gold binding. Previous facial morphs, skeleton, props and sleeves retained.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
combine_static(root);export(root,stem);export(root,stem+'-portrait')
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
 bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance cloth LOD','DECIMATE');mod.ratio=.55
 try:bpy.ops.object.modifier_apply(modifier=mod.name)
 except RuntimeError:o.modifiers.remove(mod)
export(root,stem+'-lite')
record=json.loads((OUT/'CT_City_Explore_v108m.sources.json').read_text());record.update(version='v108q',parent_version='v108m',paid_calls=0,status='integrated browser review pending');record['refinements'].append(root['v108q']);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('TAILORED_CITY_Q',flush=True)
