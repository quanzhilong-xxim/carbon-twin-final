import bpy,json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
report={}
for who in ['Student','Business','City']:
    bpy.ops.wm.open_mainfile(filepath=str(root/f'public/models/characters-v10/CT_{who}_Explore_v104c.blend'),load_ui=False,use_scripts=False)
    parent=bpy.data.objects[f'CT_{who}_Explore_v104c'];items=[]
    for o in parent.children_recursive:
        if o.hide_render or o.type not in {'MESH','CURVE'}:continue
        if not any(x in o.name.lower() for x in ['hair','groom','lock','glass','lens','head','eye','frame','skin']):continue
        ps=[o.matrix_world@Vector(v) for v in o.bound_box]
        items.append({'name':o.name,'type':o.type,'vertices':len(o.data.vertices) if o.type=='MESH' else 0,'bounds':[[round(min(v[i] for v in ps),5),round(max(v[i] for v in ps),5)] for i in range(3)],'materials':[m.name for m in o.data.materials if m]})
    report[who]=items
(root/'docs/recovery/v10.4/head-survey-c.json').write_text(json.dumps(report,indent=2))
