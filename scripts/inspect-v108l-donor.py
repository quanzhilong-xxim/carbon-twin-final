import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'public/models/characters-v10/CT_Student_Explore_v108e.blend'),load_ui=False,use_scripts=False)
face=bpy.data.objects['Face'];bpy.context.view_layer.update();result=[]
for i,m in enumerate(face.data.materials):
 ids={vi for p in face.data.polygons if p.material_index==i for vi in p.vertices};ps=[face.matrix_world@face.data.vertices[k].co for k in ids]
 if not ps:continue
 result.append(dict(material=m.name,count=len(ps),bounds=[[min(p[i]for p in ps),max(p[i]for p in ps)]for i in range(3)]))
print('DONOR_FEATURES',json.dumps(result),flush=True)
