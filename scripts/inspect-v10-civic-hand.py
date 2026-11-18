import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'public/models/characters-v10/CT_City_Explore_v10.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_City_Explore_v10'];report=[]
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render:continue
 if not any(t in o.name.lower() for t in ['dress','coat','skin left','cape','trouser','pants','skin torso']):continue
 ps=[o.matrix_world@v.co for v in o.data.vertices]
 report.append({'name':o.name,'materials':[m.name for m in o.data.materials if m],'groups':[g.name for g in o.vertex_groups],'low':[min(p[i] for p in ps) for i in range(3)],'high':[max(p[i] for p in ps) for i in range(3)]})
(ROOT/'outputs/v10-explore/characters-v10/civic-hand-inspection.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
