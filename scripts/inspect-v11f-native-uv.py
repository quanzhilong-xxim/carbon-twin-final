import bpy,json,numpy as np
from pathlib import Path
R=Path(__file__).resolve().parents[1]
for who,source in [('Business','snow'),('City','rain')]:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v10/CT_{who}_Explore_v11e.blend'),load_ui=False,use_scripts=False)
 o=bpy.data.objects[f'Source / GEO-{source}_head'];m=o.data.materials[0]
 print('UV',who,[{'name':uv.name,'active_render':uv.active_render,'range':[[min(v.uv[k]for v in uv.data),max(v.uv[k]for v in uv.data)]for k in range(2)]}for uv in o.data.uv_layers],flush=True)
 for n in m.node_tree.nodes:
  if n.type=='TEX_IMAGE'and n.image:
   im=n.image;a=np.array(im.pixels[:],np.float32).reshape(im.size[1],im.size[0],4);print('IMAGE',im.name,im.filepath,im.size[:],im.packed_file is not None,im.colorspace_settings.name,np.quantile(a[:,:,:3],[0,.25,.5,.75,.99]),flush=True)
 print('LINKS',[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name)for l in m.node_tree.links],flush=True)
