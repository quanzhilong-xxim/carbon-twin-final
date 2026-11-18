"""Read only: locate the actual lip pigment/face profile instead of guessed heights."""
import bpy, json, numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];rows={}
for who in ['Student','Business','City']:
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'public/models/characters-v10/CT_{who}_Explore_v104.blend'),load_ui=False,use_scripts=False)
 o=next(o for o in bpy.data.objects[f'CT_{who}_Explore_v104'].children_recursive if o.type=='MESH' and o.name.endswith('_head'))
 pbr=next(n for n in o.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 im=pbr.inputs['Base Color'].links[0].from_node.image;w,h=im.size;px=np.array(im.pixels[:]).reshape(h,w,4)
 pts=[]
 for f in o.data.polygons:
  for li in f.loop_indices:
   v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv=o.data.uv_layers.active.data[li].uv
   if abs(v.x)<.05 and v.y<-.09:
    rgb=px[int(uv.y*h)%h,int(uv.x*w)%w,:3];pts.append((v.x,v.y,v.z,float(rgb[0]/max(.001,rgb[1])),*map(float,rgb)))
 eye={'Student':1.47,'Business':1.55,'City':1.59}[who]
 profile=[]
 for z in np.arange(eye-.17,eye-.025,.005):
  bucket=[p for p in pts if abs(p[0])<.014 and z<=p[2]<z+.005]
  if bucket:profile.append({'z':round(float(z),4),'frontY':round(min(p[1] for p in bucket),5),'redRatio':round(max(p[3] for p in bucket),3)})
 lip=sorted([p for p in pts if eye-.16<p[2]<eye-.08],key=lambda p:p[3],reverse=True)[:24]
 rows[who]={'profile':profile,'lipPigment':lip}
(ROOT/'docs/recovery/v10.4/measured-face-landmarks.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows),flush=True)
