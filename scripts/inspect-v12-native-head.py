import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
result=[]
for role,s in [('Business','snow'),('City','rain')]:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v12-candidate/CT_{role}_Explore_v12d.blend'),load_ui=False,use_scripts=False)
 row={'role':role,'objects':[]}
 dg=bpy.context.evaluated_depsgraph_get()
 for name in [f'GEO-{s}_head',f'GEO-{s}_eyes',f'Source / GEO-{s}_head',f'Source / GEO-{s}_eyes']:
  o=bpy.data.objects[name];me=bpy.data.meshes.new_from_object(o.evaluated_get(dg),depsgraph=dg);ps=[o.matrix_world@v.co for v in me.vertices]
  row['objects'].append({'name':name,'n':len(ps),'bounds':[[min(p[k]for p in ps),max(p[k]for p in ps)]for k in range(3)],'keys':[k.name for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else [],'modifiers':[(m.name,m.type)for m in o.modifiers]})
  bpy.data.meshes.remove(me)
 result.append(row)
(R/'work/v12-head-measurements.json').write_text(json.dumps(result,indent=2),encoding='utf8')
