import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'public/models/characters-v10/CT_City_Explore_v8.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_City_Explore_v8'];members=[root,*root.children_recursive]
items=[]
for o in bpy.context.scene.objects:
 if not o.hide_render and o.type in ['MESH','CURVE']:
  items.append({'name':o.name,'in_export_hierarchy':o in members,'materials':[m.name if m else None for m in o.data.materials]})
(ROOT/'outputs/v10-explore/civic-visible-inventory.json').write_text(json.dumps(items,indent=2))
print(json.dumps([o for o in items if not o['in_export_hierarchy']]))
