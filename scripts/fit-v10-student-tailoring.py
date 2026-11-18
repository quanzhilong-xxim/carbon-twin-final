"""Correct the silhouette using the pre-edit mesh and actual browser frames.
Loads a single mesh from the verified checkpoint; never restores the project.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
stem='CT_Student_Explore_v10'
bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')),load_ui=False,use_scripts=False)
root=bpy.data.objects[stem]
if root.get('v10_tailoring_browser_fit'):raise RuntimeError('Browser fit already applied')
checkpoint=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/RESUME-DELTA-2026-11-08T21-30-01-764Z')
prior=checkpoint/'files/public/models/characters-v10/CT_Student_Explore_v10.blend'
name='Study / GEO-rain_jeans';jeans=bpy.data.objects[name]
with bpy.data.libraries.load(str(prior),link=False) as (source,target):target.objects=[name]
original=target.objects[0]
if len(original.data.vertices)!=len(jeans.data.vertices):raise RuntimeError('Checkpoint cloth topology mismatch')
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
inverse=jeans.matrix_world.inverted()
for v,src in zip(jeans.data.vertices,original.data.vertices):
 p=original.matrix_world@src.co;sign=1 if p.x>=0 else -1
 env=smooth(.14,.25,p.z)*(1-smooth(.79,.90,p.z))
 # A small outward ease preserves the inner-leg clearance and original folds.
 outer=smooth(.035,.13,abs(p.x))
 p.x+=sign*.024*env*outer;p.y*=1+.20*env
 v.co=inverse@p
for obj in root.children_recursive:
 if obj.name.startswith(('V10 explorer cargo pocket','V10 cargo pocket flap')):
  matrix=obj.matrix_world.copy();sign=1 if matrix.translation.x>0 else -1
  matrix.translation.x-=sign*.021;obj.matrix_world=matrix
 if obj.name.startswith('V10 fitted cargo outseam'):obj.hide_render=True
 if obj.name.startswith('V10 cargo side seam'):obj.hide_render=False

# The new locks need their own longitudinal UV material. Reusing a face atlas
# made unrelated painted islands appear on each lock in the browser.
mat=bpy.data.materials.new('V10 swept rose fringe fibres');mat.use_nodes=True
pbr=mat.node_tree.nodes['Principled BSDF'];pbr.inputs['Base Color'].default_value=(.56,.23,.31,1)
pbr.inputs['Roughness'].default_value=.55;pbr.inputs['Specular IOR Level'].default_value=.30
normal=bpy.data.images.get('CT Student groom micro normal')
if normal:
 t=mat.node_tree.nodes.new('ShaderNodeTexImage');t.image=normal
 n=mat.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.15
 mat.node_tree.links.new(t.outputs['Color'],n.inputs['Color']);mat.node_tree.links.new(n.outputs['Normal'],pbr.inputs['Normal'])
for obj in root.children_recursive:
 if obj.name.startswith('V10 swept explorer fringe'):
  obj.data.materials.clear();obj.data.materials.append(mat)
  # Sweep toward the part rather than five symmetrical vertical points.
  inv=obj.matrix_world.inverted()
  for v in obj.data.vertices:
   p=obj.matrix_world@v.co;t=1-smooth(1.53,1.648,p.z)
   p.x+=.023*t;p.z+=.009*t
   v.co=inv@p

# Preserve the original sole topology and explicitly give the low sidewall a
# warm rubber material; the original atlas used a single shoe base material.
rubber=bpy.data.materials.new('V10 explorer cream rubber');rubber.use_nodes=True
p=rubber.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.74,.66,.53,1);p.inputs['Roughness'].default_value=.8
shoes=bpy.data.objects['Study / GEO-rain_shoes'];slot=len(shoes.data.materials);shoes.data.materials.append(rubber)
for f in shoes.data.polygons:
 z=sum((shoes.matrix_world@shoes.data.vertices[i].co).z for i in f.vertices)/len(f.vertices)
 if z<.032:f.material_index=slot
root['v10_tailoring_browser_fit']=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
(ROOT/'outputs/v10-explore/characters-v10/student-tailoring-browser-fit.json').write_text(json.dumps({
 'checkpoint_mesh':str(prior),'mesh_only_restore':True,'cloth_ease_m':.024,'new_fringe_uv_material':True,
 'cream_rubber_sidewall':True,'paid_calls':0,'status':'awaiting actual browser confirmation'},indent=2))
print('STUDENT_BROWSER_FIT_SAVED',flush=True)
