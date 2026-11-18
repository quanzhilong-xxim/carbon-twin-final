import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
report=[]
for role in ['Business','City','Student']:
 p=R/('public/models/characters-v12-candidate/CT_'+role+'_Explore_'+('v12a.blend' if role=='Student' else 'v12g.blend'))
 bpy.ops.wm.open_mainfile(filepath=str(p),load_ui=False,use_scripts=False)
 row={'role':role,'objects':[]}
 for o in bpy.data.objects:
  if not any(n in o.name.lower() for n in ['hair','groom','fringe','scalp','eyeb','collar','tie','shirt','plait','braid','frill']):continue
  if o.type not in ['MESH','CURVE','CURVES']:continue
  bounds=[[round(min((o.matrix_world@__import__('mathutils').Vector(c))[k] for c in o.bound_box),5),round(max((o.matrix_world@__import__('mathutils').Vector(c))[k] for c in o.bound_box),5)] for k in range(3)] if o.type in ['MESH','CURVE'] else []
  row['objects'].append({'name':o.name,'type':o.type,'hidden':o.hide_render,'parent':o.parent.name if o.parent else None,'vertices':len(o.data.vertices) if o.type=='MESH' else None,'bounds':bounds,'materials':[m.name if m else None for m in o.data.materials],'mods':[(m.name,m.type) for m in o.modifiers]})
 report.append(row)
(R/'work/v122-art-inspection.json').write_text(json.dumps(report,indent=2))
print('INSPECTION_SAVED',flush=True)
