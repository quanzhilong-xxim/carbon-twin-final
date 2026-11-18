import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];rows=[]
for who,rev in [('Student','v108v'),('Business','v108u'),('City','v108u')]:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v10/CT_{who}_Explore_{rev}.blend'),load_ui=False,use_scripts=False)
 objects=[]
 for o in bpy.context.scene.objects:
  if o.type!='MESH' or o.hide_render:continue
  pts=[o.matrix_world@v.co for v in o.data.vertices]
  if not pts:continue
  objects.append(dict(name=o.name,parent=o.parent.name if o.parent else None,bounds=[[min(p[i] for p in pts),max(p[i] for p in pts)]for i in range(3)],materials=[m.name for m in o.data.materials if m]))
 materials=[]
 for m in bpy.data.materials:
  if not any(k.lower() in m.name.lower() for k in ['skin','eye','face','plum','hair','silk']):continue
  materials.append(dict(name=m.name,nodes=[dict(name=n.name,type=n.type,image=n.image.name if n.type=='TEX_IMAGE' and n.image else None)for n in m.node_tree.nodes]if m.use_nodes else []))
 rows.append(dict(who=who,objects=objects,materials=materials))
(R/'outputs/v108/internal/surface-inspection-v.json').write_text(json.dumps(rows,indent=2))
