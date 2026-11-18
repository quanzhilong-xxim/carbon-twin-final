"""Read-only visible geometry survey. Does not save or modify a blend file."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
report={}
for who in ['Student','Business','City']:
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'public/models/characters-v10/CT_{who}_Explore_v104f.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_v104f'];items=[]
    for o in root.children_recursive:
        if o.type!='MESH' or o.hide_render:continue
        ps=[o.matrix_world@v.co for v in o.data.vertices]
        if not ps:continue
        items.append({'name':o.name,'parent':o.parent.name,'verts':len(ps),'low':[round(min(p[i] for p in ps),5) for i in range(3)],'high':[round(max(p[i] for p in ps),5) for i in range(3)],'mats':[m.name for m in o.data.materials if m]})
    report[who]=items
(ROOT/'docs/recovery/v10.4/tailoring-survey-f.json').write_text(json.dumps(report,indent=2))
print('READ_ONLY_F_SURVEY', {who:len(items) for who,items in report.items()},flush=True)
