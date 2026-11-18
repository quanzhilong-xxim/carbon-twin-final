import bpy, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'public/models/characters-v12-candidate/CT_Student_Explore_v122i.blend'), load_ui=False, use_scripts=False)
rows=[]
for name in ['Face','Hair','V108u continuous fitted bomber','V122b continuous bomber sleeve L','V11e fitted rib knit beanie crown']:
    obj=bpy.data.objects[name]
    groups=[]
    for i, material in enumerate(obj.data.materials):
        indices={v for poly in obj.data.polygons if poly.material_index==i for v in poly.vertices}
        points=[obj.matrix_world@obj.data.vertices[i].co for i in indices]
        p=material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
        groups.append(dict(material=material.name, bounds=[[round(min(v[j] for v in points),5),round(max(v[j] for v in points),5)] for j in range(3)], shader={n:list(p.inputs[n].default_value) if n=='Base Color' else p.inputs[n].default_value for n in ['Base Color','Roughness','Metallic']} if p else {}, textures=[dict(name=n.image.name,size=list(n.image.size)) for n in material.node_tree.nodes if n.type=='TEX_IMAGE' and n.image] if material.use_nodes else []))
    rows.append(dict(name=name,matrix=[list(r) for r in obj.matrix_world],groups=groups))
path=root/'outputs/v122/student-i-anatomy.json'
path.write_text(json.dumps(rows,indent=2),encoding='utf8')
print('INSPECTION_SAVED',str(path))
