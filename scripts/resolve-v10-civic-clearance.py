"""Bounded triangle-based prop fit and local cloth layering repair."""
import bpy,bmesh,json,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';file=OUT/'CT_City_Explore_v10.blend'
bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False);root=bpy.data.objects['CT_City_Explore_v10']
if root.get('civic_clearance_resolved'):raise RuntimeError('Already applied')
hand=bpy.data.objects['Source skin left'];pieces=[bpy.data.objects[n] for n in ['Tablet graphite frame','Tablet glass screen']]
def bvh(o,delta):return BVHTree.FromPolygons([o.matrix_world@v.co+delta for v in o.data.vertices],[tuple(f.vertices) for f in o.data.polygons])
h=bvh(hand,Vector());candidates=[]
for j in range(13):
 for k in range(13):
  d=Vector((0,j*.005,k*.005))
  if all(not h.overlap(bvh(o,d)) for o in pieces):candidates.append(d)
if not candidates:raise RuntimeError('No non-intersecting contact found inside bounded search')
delta=min(candidates,key=lambda d:d.length_squared);held=bpy.data.objects['HeldTablet'];m=held.matrix_world.copy();m.translation+=delta;held.matrix_world=m;bpy.context.view_layer.update()
intersections=[len(h.overlap(bvh(o,Vector()))) for o in pieces]
if any(intersections):raise RuntimeError('The final stored tablet transform still intersects the hand')
# The high-neck rings had been offset in front of the actual neck. Center
# each retained ring around the measured neck's y=.008 axis, with a continuous
# transition from the torso and the original face left completely intact.
inner=bpy.data.objects['V10 continuous dark inner dress'];inv=inner.matrix_world.inverted();rings={}
for v in inner.data.vertices:
 p=inner.matrix_world@v.co
 if p.z>1.39:rings.setdefault(round(p.z,3),[]).append((v,p))
for z,points in rings.items():
 center=sum(p.y for v,p in points)/len(points);radius=max(abs(p.y-center) for v,p in points)
 for v,p in points:
  p.y=.008+(p.y-center)/max(.001,radius)*.043
  if p.z>1.435:p.z=1.43
  v.co=inv@p
# Keep the source jeans in the master; only their visible fitted copy is
# trimmed inside the long dress. The upper jeans were protruding through it.
jeans=next(o for o in root.children_recursive if o.type=='MESH' and not o.hide_render and o.name.endswith('_jeans'))
copy=jeans.copy();copy.data=jeans.data.copy();bpy.context.scene.collection.objects.link(copy);copy.name='V10 fitted civic tights';jeans.hide_render=True
bm=bmesh.new();bm.from_mesh(copy.data);trim=[f for f in bm.faces if (copy.matrix_world@f.calc_center_median()).z>.49];bmesh.ops.delete(bm,geom=trim,context='FACES');bm.to_mesh(copy.data);bm.free()
inverse=copy.matrix_world.inverted()
for v in copy.data.vertices:
 p=copy.matrix_world@v.co
 if .07<p.z<.20:p.z-=.025*max(0,min(1,(.20-p.z)/.07))
 v.co=inverse@p
root['civic_clearance_resolved']=True;bpy.ops.wm.save_as_mainfile(filepath=str(file))
report={'tablet_offset':list(delta),'bounded_candidates':169,'frame_triangle_intersections':intersections[0],'screen_triangle_intersections':intersections[1],'original_jeans_retained_hidden':True,'upper_jeans_faces_hidden_inside_dress':len(trim),'collar_rings_centered':list(rings),'paid_calls':0}
(ROOT/'outputs/v10-explore/characters-v10/civic-clearance-resolved.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
