import bpy,json,sys
from pathlib import Path
p=Path(__file__).resolve().parents[1]/('public/models/characters-v10/CT_'+(sys.argv[-1] if '--' in sys.argv else 'City')+'_Explore_v10.blend')
bpy.ops.wm.open_mainfile(filepath=str(p),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_'+(sys.argv[-1] if '--' in sys.argv else 'City')+'_Explore_v10']
rows=[]
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render:continue
 coords=[o.matrix_world@v.co for v in o.data.vertices]
 rows.append({'name':o.name,'materials':[m.name for m in o.data.materials if m],'uv':list(o.data.uv_layers.keys()),'vertices':len(o.data.vertices),'z':[min(v.z for v in coords),max(v.z for v in coords)]})
print('SURFACE_INVENTORY',json.dumps(rows))
