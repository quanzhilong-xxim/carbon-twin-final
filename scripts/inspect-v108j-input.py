import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
for who in ['Business','City']:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v10/CT_{who}_Explore_v108h.blend'),load_ui=False,use_scripts=False)
 head=bpy.data.objects['Source / GEO-snow_head' if who=='Business' else 'Source / GEO-rain_head']
 pts=[head.matrix_world@v.co for v in head.data.vertices]
 mats=[]
 for m in head.data.materials:
  mats.append(dict(name=m.name,nodes=[dict(name=n.name,type=n.type,image=n.image.name if n.type=='TEX_IMAGE' and n.image else None)for n in m.node_tree.nodes],links=[f'{l.from_node.name}:{l.from_socket.name} -> {l.to_node.name}:{l.to_socket.name}' for l in m.node_tree.links]))
 print('HEAD_INPUT',who,json.dumps(dict(bounds=[[min(p[i]for p in pts),max(p[i]for p in pts)]for i in range(3)],materials=mats)),flush=True)
