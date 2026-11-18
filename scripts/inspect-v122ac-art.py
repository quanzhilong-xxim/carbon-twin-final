"""Read-only inventory for the next additive character art pass."""
import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'public/models/characters-v12-candidate/CT_Student_Explore_v122ac.blend'),load_ui=False,use_scripts=False)
rig=bpy.data.objects['CT_Student_Explore_v122ac']
meshes=[]
for o in rig.children_recursive:
 if o.type!='MESH' or o.hide_render:continue
 meshes.append(dict(name=o.name,vertices=len(o.data.vertices),faces=len(o.data.polygons),dimensions=list(o.dimensions),matrix=[list(r) for r in o.matrix_world],materials=[m.name if m else '' for m in o.data.materials],groups=[g.name for g in o.vertex_groups],modifiers=[m.type for m in o.modifiers],shape_keys=len(o.data.shape_keys.key_blocks) if o.data.shape_keys else 0))
materials=[]
for m in bpy.data.materials:
 if not m.use_nodes:continue
 nodes=m.node_tree.nodes
 p=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
 materials.append(dict(name=m.name,shader=p.name if p else None,base=list(p.inputs['Base Color'].default_value) if p else None,roughness=p.inputs['Roughness'].default_value if p else None,textures=[dict(node=n.name,image=n.image.name if n.image else None) for n in nodes if n.type=='TEX_IMAGE']))
bones={b.name:dict(head=list(b.head_local),tail=list(b.tail_local)) for b in rig.data.bones if any(n in b.name for n in ['Head','Neck','UpperArm','LowerArm','Hand','Index','Middle','Wrist'])}
out=R/'outputs/v122/ac-art-inventory.json'
details={}
for name in ['Face','V122ac anatomical student hand L','V122s inset raglan bomber sleeve L','V108u continuous fine knit','V108u continuous fitted bomber','Body','Hair']:
 o=bpy.data.objects[name]
 groups=[]
 for i,m in enumerate(o.data.materials):
  indices={v for f in o.data.polygons if f.material_index==i for v in f.vertices}
  ps=[o.matrix_world@o.data.vertices[v].co for v in indices]
  if ps:groups.append(dict(material=m.name,bounds=[[min(p[j]for p in ps),max(p[j]for p in ps)]for j in range(3)]))
 details[name]=dict(materials=groups)
 if 'hand' in name:
  details[name]['rings']=[[list(o.data.vertices[v].co)for v in range(i,min(i+18,len(o.data.vertices)))]for i in [1353,1443]]
out.write_text(json.dumps(dict(meshes=meshes,materials=materials,bones=bones,details=details),indent=2),encoding='utf8')
print('INVENTORY_SAVED',str(out),flush=True)
