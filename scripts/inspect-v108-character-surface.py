"""Read-only source inspection; does not save the user's open Blender session."""
import bpy, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
for who, version in [('Student','v107b'), ('Business','v104g'), ('City','v104g')]:
    bpy.ops.wm.open_mainfile(filepath=str(root/f'public/models/characters-v10/CT_{who}_Explore_{version}.blend'), load_ui=False, use_scripts=False)
    result=[]
    for o in bpy.context.scene.objects:
        if o.type!='MESH': continue
        if o.hide_render or o.name.startswith('WGT'): continue
        points=[o.matrix_world @ v.co for v in o.data.vertices]
        if not points: continue
        result.append(dict(name=o.name, vertices=len(points), materials=[m.name if m else '' for m in o.data.materials], bounds=[[round(min(p[i] for p in points),3),round(max(p[i] for p in points),3)] for i in range(3)]))
    folder=root/'outputs/v108/internal/model-inspections'
    folder.mkdir(parents=True,exist_ok=True)
    (folder/(who+'-source.json')).write_text(json.dumps(result,indent=2))
    print('CT_SURFACE '+who+' '+str(len(result)),flush=True)
