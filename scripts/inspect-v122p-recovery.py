import bpy,json,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1]
out=[]
for role,version in [('Student','v122m'),('Business','v122p'),('City','v122p')]:
    f=R/f'public/models/characters-v12-candidate/CT_{role}_Explore_{version}.blend'
    bpy.ops.wm.open_mainfile(filepath=str(f),load_ui=False,use_scripts=False)
    objects=[]
    for o in bpy.data.objects:
        if o.type!='MESH' or o.hide_render:continue
        co=[o.matrix_world@v.co for v in o.data.vertices]
        if not co:continue
        objects.append(dict(name=o.name,vertices=len(co),bounds=[[min(p[i] for p in co)for i in range(3)],[max(p[i] for p in co)for i in range(3)]],materials=[m.name if m else None for m in o.data.materials],uvs=[x.name for x in o.data.uv_layers],morphs=[k.name for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else []))
    out.append(dict(role=role,version=version,objects=objects))
(R/'outputs/v122/p-recovery-geometry.json').write_text(json.dumps(out,indent=2))
print('RECOVERY_GEOMETRY_SAVED',[(r['role'],len(r['objects']))for r in out],flush=True)
