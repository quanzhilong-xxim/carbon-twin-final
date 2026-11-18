import bpy,json,numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];result={}
for version in ['v10','v104']:
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'public/models/characters-v10/CT_Student_Explore_{version}.blend'),load_ui=False,use_scripts=False)
 o=bpy.data.objects['Study / GEO-rain_head'];keys=o.data.shape_keys.key_blocks
 coords=np.array([o.matrix_world@v.co for v in keys['Basis'].data]);data=np.array([o.matrix_world@v.co for v in o.data.vertices]);mat=o.data.materials[0]
 row={'data_basis_delta':float(np.max(np.abs(coords-data))),'keys':{k.name:k.value for k in keys},'images':[],'bounds':[coords.min(axis=0).tolist(),coords.max(axis=0).tolist()]}
 for n in mat.node_tree.nodes:
  if n.type=='TEX_IMAGE' and n.image:
   px=np.array(n.image.pixels[:]).reshape(-1,4);row['images'].append({'name':n.image.name,'space':n.image.colorspace_settings.name,'alpha':[float(px[:,3].min()),float(px[:,3].max())],'rgb':[float(px[:,:3].min()),float(px[:,:3].max())],'links':[(l.to_socket.name) for l in n.outputs['Color'].links]})
 result[version]=row
 if version=='v10':before=coords
 else:
  delta=np.linalg.norm(coords-before,axis=1);result['delta']={'max':float(delta.max()),'quantiles':np.quantile(delta,[.5,.9,.99]).tolist()};result['largest']=[{'i':int(i),'before':before[i].tolist(),'after':coords[i].tolist(),'delta':float(delta[i])} for i in np.argsort(delta)[-10:]]
(ROOT/'docs/recovery/v10.4/face-diagnosis.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
