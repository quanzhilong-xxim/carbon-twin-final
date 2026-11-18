import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];out={}
for who in ['Student','Business','City']:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v10/CT_{who}_Explore_v108d.blend'),load_ui=False,use_scripts=False)
 obs=[]
 for o in bpy.data.objects:
  if o.type!='MESH':continue
  if not any(x in o.name.lower() for x in ['hair','head','scalp','pants','eyebrow','eye','skin']):continue
  ps=[o.matrix_world@v.co for v in o.data.vertices]
  if not ps:continue
  obs.append(dict(name=o.name,hidden=o.hide_render,parent=o.parent.name if o.parent else None,vertices=len(ps),min=[round(min(p[i] for p in ps),4) for i in range(3)],max=[round(max(p[i] for p in ps),4) for i in range(3)],mats=[m.name for m in o.data.materials if m],keys=[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else []))
 out[who]=obs
(R/'outputs/v108/internal/model-inspections/v108d-parts.json').write_text(json.dumps(out,indent=2))
print('INSPECTED',[(k,len(v)) for k,v in out.items()])
