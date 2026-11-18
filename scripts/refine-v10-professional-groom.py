"""Small groom corrections on the retained professional character masters.
Retain original faces and all expression shapes; never re-run the base sculpt.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
report={}
def parent(o,p):
 bpy.context.view_layer.update();matrix=o.matrix_world.copy();o.parent=p;o.matrix_world=matrix
def lock(name,points,radius,mat,head):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=9;c.bevel_depth=radius;c.bevel_resolution=3
 s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for i,(b,p) in enumerate(zip(s.bezier_points,points)):
  b.co=p;b.handle_left_type=b.handle_right_type='AUTO';b.radius=[.65,1,.65,.03][i]
 o=bpy.data.objects.new(name,c);bpy.context.scene.collection.objects.link(o);c.materials.append(mat);parent(o,head)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
 uv=o.data.uv_layers.new(name='UVMap') if not o.data.uv_layers else o.data.uv_layers.active
 for loop in o.data.loops:
  p=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(p.x*12,p.z*12)
 return o
for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v10';bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')),load_ui=False,use_scripts=False)
 root=bpy.data.objects[stem]
 if root.get('v10_professional_groom_fit'):raise RuntimeError('Groom already applied: '+who)
 hair_objects=[]
 for o in list(root.children_recursive):
  if o.type!='MESH' or o.hide_render:continue
  if o.name.endswith(('_hair_main','_hair_strand')) or 'hair_base' in o.name:
   bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Source groom silhouette smoothing','SUBSURF');mod.levels=1;bpy.ops.object.modifier_apply(modifier=mod.name);hair_objects.append(o.name)
  if o.name.endswith('_eyebrows'):
   sets=[key.data for key in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
   inverse=o.matrix_world.inverted()
   for values in sets:
    for sign in [-1,1]:
     points=[v for v in values if (o.matrix_world@v.co).x*sign>0]
     if not points:continue
     center=sum((o.matrix_world@v.co for v in points),Vector())/len(points)
     for v in points:
      p=o.matrix_world@v.co;edge=max(0,min(1,(abs(p.x)-.06)/.05))
      p.z=center.z+(p.z-center.z)*((.64 if who=='City' else .84)-.19*edge);v.co=inverse@p
   if o.data.shape_keys:
    for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks['Basis'].data):v.co=k.co
 if who=='City':
  head=bpy.data.objects['Head'];mat=bpy.data.materials.new('V10 chestnut swept temple locks');mat.use_nodes=True
  p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.085,.040,.022,1);p.inputs['Roughness'].default_value=.48;p.inputs['Specular IOR Level'].default_value=.34
  for i in range(4):
   offset=i*.010
   lock('V10 swept civic part',[(.028+offset,-.035,1.771-i*.003),(-.035+offset,-.103,1.751-i*.004),(-.092+offset,-.122,1.702-i*.005),(-.119+offset,-.098,1.622-i*.008)],.012,mat,head)
  for sign in [-1,1]:
   lock('V10 civic cheek tendril',[(sign*.112,-.015,1.676),(sign*.137,-.045,1.622),(sign*.122,-.071,1.567),(sign*.129,-.052,1.529)],.007,mat,head)
 root['v10_professional_groom_fit']=True
 for o in root.children_recursive:
  if o.type=='MESH' and o.data.shape_keys:
   for key in o.data.shape_keys.key_blocks:key.value=0
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 report[who]={'source_hair_smoothed':hair_objects,'brow_expression_topology_retained':True,'civic_swept_locks':6 if who=='City' else 0,'paid_calls':0,'visual_acceptance':'pending browser inspection'}
(ROOT/'outputs/v10-explore/characters-v10/professional-groom-fit.json').write_text(json.dumps(report,indent=2));print('PROFESSIONAL_GROOM_FITTED',flush=True)
