import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'public/models/characters-v12-candidate/CT_Business_Explore_v122k.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Business_Explore_v122k'];rows=[]
for o in root.children_recursive:
    if o.type!='MESH' or o.hide_render:continue
    if not any('poplin' in m.name.lower() for m in o.data.materials if m):continue
    points=[o.matrix_world@v.co for v in o.data.vertices]
    rows.append(dict(name=o.name,bounds=[[min(p[j] for p in points),max(p[j] for p in points)]for j in range(3)],vertices=len(points),bones=[g.name for g in o.vertex_groups],modifiers=[(m.name,m.type)for m in o.modifiers]))
(R/'outputs/v122/business-k-visible-cotton.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
print('SAVED_CLOTH_INSPECTION')
