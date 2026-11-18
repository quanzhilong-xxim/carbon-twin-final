"""Read-only triangle contact and boundary checks in the measured rest pose."""
import bpy,bmesh,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'public/models/characters-v10/CT_City_Explore_v10.blend'),load_ui=False,use_scripts=False)
hand=bpy.data.objects['Source skin left'];frame=bpy.data.objects['Tablet graphite frame'];screen=bpy.data.objects['Tablet glass screen']
def bvh(o,offset=0):
 verts=[o.matrix_world@v.co+Vector((0,offset,0)) for v in o.data.vertices];return BVHTree.FromPolygons(verts,[tuple(f.vertices) for f in o.data.polygons])
h=bvh(hand);contacts=[]
for step in range(21):
 delta=step*.005;contacts.append({'offset':delta,'frame_intersections':len(h.overlap(bvh(frame,delta))),'screen_intersections':len(h.overlap(bvh(screen,delta)))})
bm=bmesh.new();bm.from_mesh(hand.data);edges=set(e for e in bm.edges if e.is_boundary);loops=[]
while edges:
 stack=[edges.pop()];found=[]
 while stack:
  e=stack.pop();found.append(e)
  for v in e.verts:
   for q in v.link_edges:
    if q in edges:edges.remove(q);stack.append(q)
 vs=set(v for e in found for v in e.verts);center=sum((hand.matrix_world@v.co for v in vs),Vector())/len(vs)
 loops.append({'edges':len(found),'center':list(center),'radius':max(((hand.matrix_world@v.co)-center).length for v in vs)})
bm.free();report={'contacts':contacts,'hand_boundary_loops':loops}
(ROOT/'outputs/v10-explore/characters-v10/grip-clearance.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
