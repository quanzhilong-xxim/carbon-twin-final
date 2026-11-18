"""One local geometry correction following the V11g browser review."""
import bpy,math,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
exec(compile((R/'scripts/refine-v104e-face-and-cargo.py').read_text().split("for who in ['Student','Business','City']:")[0],__file__,'exec'))
for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v11h'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v11g.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v11g'];root.name=stem
 if who=='Business':
  scalp=bpy.data.objects['V108k anatomical open hairline']
  def fringe(p):
   p=p.copy();front=max(0,min(1,(-p.y-.045)/.035));minimum=1.273-.025*min(1,abs(p.x)/.12)**1.4
   if p.z<minimum:p.z+=(minimum-p.z)*.94*front
   return p
  deform(scalp,fringe)
  fixes=['Raised front scalp boundary under the retained broad swept locks; removed the four scalp strips that intersected and appeared as straight hairs over the forehead.']
 else:
  head=bpy.data.objects['Source / GEO-rain_head']
  def nose(p):
   p=p.copy();w=math.exp(-(p.x/.028)**4-((p.z-1.515)/.025)**4)*max(0,min(1,(-p.y-.112)/.035))
   if p.z<1.525:p.z+=(1.525-p.z)*.48*w
   p.y+=.004*w
   return p
  deform(head,nose)
  fixes=['Softened lower nasal-wing and columella silhouette with a smooth anatomical warp of all shape targets, shortening pointed lower projections while retaining nostril openings.']
 root['v11h_local_finish']=json.dumps(fixes)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH'or o.hide_render or o.data.shape_keys or len(o.data.polygons)<1000:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
  try:bpy.ops.object.modifier_apply(modifier=mod.name)
  except RuntimeError:o.modifiers.remove(mod)
 export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_v11g.sources.json').read_text());record.update(version='v11h',parent_version='v11g',paid_calls=0,status='isolated browser candidate; not registered as default')
 record.setdefault('refinements',[]).extend(fixes);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in sorted(OUT.glob(stem+'*.glb'))]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V11H_EXPORTED',who,flush=True)
