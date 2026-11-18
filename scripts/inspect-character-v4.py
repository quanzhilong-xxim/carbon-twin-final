import bpy,json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
for who in ['Student','Business','City']:
 bpy.ops.wm.open_mainfile(filepath=str(root/'public/models/characters-v10'/f'CT_{who}_Explore_v3.blend'),load_ui=False,use_scripts=False)
 out=[]
 for o in bpy.context.scene.objects:
  if o.type=='MESH' and ('eyes' in o.name.lower() or o.name.startswith(('V3 iris','V3 pupil','V3 catch','Eye reflection'))):
   points=[o.matrix_world@v.co for v in o.data.vertices]
   out.append({'name':o.name,'visible':not o.hide_render,'parent':o.parent.name if o.parent else None,'world':list(o.matrix_world.translation),'raw':[[min(v.co[i] for v in o.data.vertices),max(v.co[i] for v in o.data.vertices)] for i in range(3)],'bounds':[[min(v[i] for v in points),max(v[i] for v in points)] for i in range(3)],'materials':[{'name':m.name,'alpha':m.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value if m.use_nodes and m.node_tree.nodes.get('Principled BSDF') else None} for m in o.data.materials]})
 print('INSPECT',who,json.dumps(out),flush=True)
