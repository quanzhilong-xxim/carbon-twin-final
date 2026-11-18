"""Fix the inside-out scalp detected in actual 45-degree browser views.
This is a mesh winding repair, with no replacement source or paid generation.
"""
import bpy,bmesh,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';report={}
for who in ['Student','Business','City']:
 file=OUT/f'CT_{who}_Explore_v104b.blend'
 bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v104b']
 if root.get('scalp_winding_fixed'):raise RuntimeError('Already fixed')
 scalp=bpy.data.objects['V104 fitted scalp foundation']
 bm=bmesh.new();bm.from_mesh(scalp.data)
 bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(scalp.data);bm.free()
 if who=='Business':
  for name in ['Source skin left','Source skin right']:
   o=bpy.data.objects[name];inv=o.matrix_world.inverted()
   for v in o.data.vertices:
    p=o.matrix_world@v.co
    # Anatomical hand ease below the existing wrist, preserving contact.
    if p.z<.90:
     anchor=.293 if p.x>0 else -.293
     p.x=anchor+(p.x-anchor)*.84;p.z=.90+(p.z-.90)*.84;p.y=.009+(p.y-.009)*.88
    v.co=inv@p
 root['scalp_winding_fixed']=True
 bpy.ops.wm.save_as_mainfile(filepath=str(file));report[who]={'scalp_faces_reversed':len(scalp.data.polygons),'old_source_retained':True}
(ROOT/'docs/recovery/v10.4/groom-normal-repair.json').write_text(json.dumps(report,indent=2))
