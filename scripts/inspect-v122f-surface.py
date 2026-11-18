import bpy,json,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1];role=sys.argv[-1]
bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v12-candidate/CT_{role}_Explore_v122f.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{role}_Explore_v122f'];result=[]
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render:continue
 if role=='Student' and not any(n in o.name.lower() for n in ['sleeve','jacket','shoulder','coat','boot','cargo','plait','braid','hair']):continue
 if role!='Student' and not any(n in o.name.lower() for n in ['native head','native eyes','shirt','jacket','lapel','collar']):continue
 mats=[]
 for m in o.data.materials:
  if not m:continue
  p=m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
  mats.append({'name':m.name,'rough':p.inputs['Roughness'].default_value if p else None,'images':[{'name':n.image.name,'size':list(n.image.size),'color':n.image.colorspace_settings.name}for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image] if m.use_nodes else []})
 result.append({'name':o.name,'verts':len(o.data.vertices),'faces':len(o.data.polygons),'matrix':list(map(list,o.matrix_world)),'materials':mats,'morphs':[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else []})
p=R/f'outputs/v122/material-inspection/{role}-geometry.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(result,indent=2));print(json.dumps(result))
