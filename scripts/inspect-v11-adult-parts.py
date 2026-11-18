import bpy
from pathlib import Path
R=Path(__file__).resolve().parents[1]
for who in ['Business','City']:
    bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v10/CT_{who}_Explore_v108w.blend'),load_ui=False,use_scripts=False)
    print('ROLE',who,flush=True)
    for o in bpy.data.objects:
        if o.type!='MESH' or o.hide_render or not o.data.vertices: continue
        points=[o.matrix_world@v.co for v in o.data.vertices]
        if max(p.z for p in points)<(1.0 if who=='Business' else 1.4):continue
        print(o.name,'PARENT',o.parent.name if o.parent else None,'BOUNDS',tuple(round(min(p[k]for p in points),3)for k in range(3)),tuple(round(max(p[k]for p in points),3)for k in range(3)),'MATS',[m.name for m in o.data.materials],flush=True)
