import bpy,bmesh,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'public/models/characters-v12-candidate/CT_Student_Explore_v122x.blend'),load_ui=False,use_scripts=False)
rows=[]
for o in bpy.data.objects:
 if o.name.startswith('V122x anatomical student hand'):
  bm=bmesh.new();bm.from_mesh(o.data);vertices={v for e in bm.edges if e.is_boundary for v in e.verts}
  side=o.name[-1];w=bpy.data.objects['CT_Student_Explore_v122x'].data.bones['J_Bip_'+side+'_Hand'].head_local
  rows.append({'name':o.name,'boundaries':[list(v.co)for v in vertices],'wrist':list(w)})
  bm.free()
for m in bpy.data.materials:
 if 'SKIN'in m.name and m.use_nodes:
  rows.append({'material':m.name,'nodes':[(n.type,n.name)for n in m.node_tree.nodes],'principled':[{i.name:list(i.default_value)if hasattr(i.default_value,'__len__')else i.default_value,'linked':i.is_linked}for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'for i in n.inputs if i.name in ['Base Color','Roughness','Specular IOR Level']]})
(R/'outputs/v122/y-wrist-inspection.json').write_text(json.dumps(rows,indent=2))
print('WRISTS_INSPECTED')
