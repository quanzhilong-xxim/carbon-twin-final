import bpy,json,numpy as np
from pathlib import Path
R=Path(__file__).resolve().parents[1];rows=[]
for role in ['Business','City']:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v12-candidate/CT_{role}_Explore_v12f.blend'),load_ui=False,use_scripts=False)
 o=bpy.data.objects['V12e native head'];p=o.data.materials[0].node_tree.nodes.get('Principled BSDF');row={'role':role,'textures':[(n.name,n.image.name, list(n.image.size))for n in o.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE'and n.image], 'profile':[]}
 eye=1.204 if role=='Business'else 1.588
 for z in np.arange(eye-.165,eye-.03,.005):
  vs=[v.co for v in o.data.vertices if abs(v.co.x)<.012 and z<=v.co.z<z+.005 and v.co.y<-.04]
  if vs:row['profile'].append({'z':round(float(z),4),'y':round(min(v.y for v in vs),5)})
 rows.append(row)
(R/'work/v12-face-surface.json').write_text(json.dumps(rows,indent=2))
