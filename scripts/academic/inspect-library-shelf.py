import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'public/models/research/CT_LibraryShelf_v104.blend'),load_ui=False,use_scripts=False)
rows={}
for o in bpy.context.scene.objects:
    if o.type!='MESH' or o.hide_render:continue
    for f in o.data.polygons:
        if f.normal.z<.9:continue
        area=f.area
        z=round((o.matrix_world@f.center).z,2)
        rows[z]=rows.get(z,0)+area
result=sorted([{'z':z,'area':a} for z,a in rows.items() if a>.10],key=lambda r:r['z'])
(ROOT/'docs/recovery/v10.4/bookshelf-horizontal-levels.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
