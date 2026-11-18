import bpy,json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1];report={}
for who in ['Student','Business','City']:
    bpy.ops.wm.open_mainfile(filepath=str(root/f'public/models/characters-v10/CT_{who}_Explore_v104c.blend'),load_ui=False,use_scripts=False)
    o=next(o for o in bpy.data.objects[f'CT_{who}_Explore_v104c'].children_recursive if o.type=='MESH' and o.name.endswith('_head'))
    basis=o.data.shape_keys.key_blocks['Basis'];smile=o.data.shape_keys.key_blocks['Smile']
    vs=[]
    for i,(a,b) in enumerate(zip(basis.data,smile.data)):
        p=o.matrix_world@a.co;delta=(b.co-a.co).length
        if delta>.001 and p.y<-.05 and p.z<(1.47 if who=='Student' else 1.55 if who=='Business' else 1.59)-.06:
            vs.append({'i':i,'p':[round(v,5) for v in p],'d':round(delta,5)})
    vs.sort(key=lambda x:x['d'],reverse=True)
    report[who]=vs[:100]
(root/'docs/recovery/v10.4/lip-survey-c.json').write_text(json.dumps(report,indent=2))
