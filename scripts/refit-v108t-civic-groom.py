"""Keep R's sculpted swept silhouette and fit it to the current head."""
import bpy,json,hashlib,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
stem='CT_City_Explore_v108t'
if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve T source')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_City_Explore_v108r.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_City_Explore_v108r'];root.name=stem
face=bpy.data.objects['V108l distinct City anime face'];tree=BVHTree.FromPolygons([face.matrix_world@v.co for v in face.data.vertices],[tuple(p.vertices)for p in face.data.polygons])
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render:continue
 if o.name.startswith(('V108k crown-to-nape','V108k fine tapered')):
  o.hide_render=True;continue
 if not o.name.startswith(('V108k anatomical','V108k layered swept','V108k soft temple')):continue
 inv=o.matrix_world.inverted()
 for v in o.data.vertices:
  p=o.matrix_world@v.co;p.x*=1.12;p.z=1.64+(p.z-1.64)*1.20
  if p.y<-.035:
   p.z-=.020*max(0,min(1,(1.73-p.z)/.08));old=p.y;p.y=.005+(p.y-.005)*1.23
   hit,_,_,_=tree.ray_cast(Vector((p.x,-.5,p.z)),Vector((0,1,0)),.65)
   if hit:p.y=min(p.y,hit.y-.008)
  v.co=inv@p
root['v108t']='Retained sculpted R swept locks refitted across the current face; front strand artifacts removed; connected R neck and all facial morphs, clothing, props retained.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
combine_static(root);export(root,stem);export(root,stem+'-portrait')
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
 bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.55
 try:bpy.ops.object.modifier_apply(modifier=mod.name)
 except RuntimeError:o.modifiers.remove(mod)
export(root,stem+'-lite')
record=json.loads((OUT/'CT_City_Explore_v108r.sources.json').read_text());record.update(version='v108t',parent_version='v108r',paid_calls=0,status='actual webpage review pending');record['refinements'].append(root['v108t']);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('REFITTED_CIVIC_T',flush=True)
