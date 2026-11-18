"""Fit the actual shirt opening to the retained lapels and jacket skin weights."""
import bpy,sys,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Business_Explore_v122x'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve existing X')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Business_Explore_v122t.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Business_Explore_v122t'];rig=bpy.data.objects['CT_Humanoid']
shirt=bpy.data.objects['V122s shirt front curved to the neck'];jacket=bpy.data.objects['Fitted tailored jacket']
verts=[jacket.matrix_world@v.co for v in jacket.data.vertices]
bvh=BVHTree.FromPolygons(verts,[list(p.vertices)for p in jacket.data.polygons])
kd=KDTree(len(verts))
for i,p in enumerate(verts):kd.insert(p,i)
kd.balance()
for group in list(shirt.vertex_groups):shirt.vertex_groups.remove(group)
for v in shirt.data.vertices:
 t=max(0,min(1,(v.co.z-.82)/.247));old=.104-.053*t*t;u=max(-1,min(1,v.co.x/old))
 # The white panel tapers toward the jacket closure rather than extending
 # through the wool on either side of the V-shaped opening.
 v.co.x=u*(.009+.050*t)
 p=shirt.matrix_world@v.co;hit=bvh.ray_cast(Vector((p.x,-.5,p.z)),Vector((0,1,0)),1)[0]
 p.y=(hit.y-.0018)if hit is not None else(-.133+.040*t*t)
 v.co=shirt.matrix_world.inverted()@p
 nearby=kd.find_n(p,4);total=sum(1/max(d,.001)**2 for _,_,d in nearby);weights={}
 for _,i,d in nearby:
  influence=(1/max(d,.001)**2)/total
  for g in jacket.data.vertices[i].groups:
   name=jacket.vertex_groups[g.group].name;weights[name]=weights.get(name,0)+influence*g.weight
 for name,w in weights.items():
  group=shirt.vertex_groups.get(name)or shirt.vertex_groups.new(name=name);group.add([v.index],w,'REPLACE')
shirt.name='V122x V opening shirt fitted to wool and lapels'
export_candidate(root,rig,OUT,STEM,'CT_Business_Explore_v122t','v122x',[
 'Narrow the actual shirt mesh to the V-shaped lapel opening, removing the triangular white intersections',
 'Project the shirt onto the retained jacket surface with 1.8mm clearance; transfer the real jacket bone weights to preserve the seam while breathing and turning'
])
