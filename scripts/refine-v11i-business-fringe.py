"""Remove measured misplaced old nape strips; keep prior candidates intact."""
import bpy,math,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
exec(compile((R/'scripts/refine-v104e-face-and-cargo.py').read_text().split("for who in ['Student','Business','City']:")[0],__file__,'exec'))
stem='CT_Business_Explore_v11i'
if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve '+stem)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Business_Explore_v11h.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Business_Explore_v11h'];root.name=stem;removed=[]
for o in root.children_recursive:
 if o.type!='MESH'or o.hide_render:continue
 if o.name.startswith('V108k crown-to-nape strand')and o.name.rsplit('.',1)[-1]in['013','014','015','016','017']:
  o.hide_render=True;removed.append(o.name)
 if o.name.startswith('V108k fine tapered flyaway'):
  points=[o.matrix_world@v.co for v in o.data.vertices]
  if min(p.y for p in points)<-.10 and min(p.z for p in points)<1.27:o.hide_render=True;removed.append(o.name)
head=bpy.data.objects['Source / GEO-snow_head']
def lid(p):
 p=p.copy();eye=1.204;w=math.exp(-((abs(p.x)-.047)/.035)**4-((p.z-eye)/.033)**4)*max(0,min(1,(-p.y-.065)/.035))
 if p.z>eye:p.z-=.16*(p.z-eye)*w
 return p
deform(head,lid)
fixes=['Hidden measured old crown-to-nape strands013–017 and two front-crossing flyaway meshes; these were the straight strands visible through the forehead.','Softened male upper eyelid aperture16% locally, preserving eyeball volume, fitted spectacles and all expressions.']
root['v11i_finish']=json.dumps(fixes);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
export(root,stem);export(root,stem+'-portrait')
for o in root.children_recursive:
 if o.type!='MESH'or o.hide_render or o.data.shape_keys or len(o.data.polygons)<1000:continue
 bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
 try:bpy.ops.object.modifier_apply(modifier=mod.name)
 except RuntimeError:o.modifiers.remove(mod)
export(root,stem+'-lite')
record=json.loads((OUT/'CT_Business_Explore_v11h.sources.json').read_text());record.update(version='v11i',parent_version='v11h',paid_calls=0,status='isolated business candidate; not registered as default',removed_forehead_strips=removed)
record.setdefault('refinements',[]).extend(fixes);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in sorted(OUT.glob(stem+'*.glb'))]
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V11I_EXPORTED',removed,flush=True)
