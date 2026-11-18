"""Gentle, continuous coordinate fit of the complete retained head hierarchy.
Every expression and facial part receives the same invertible warp, avoiding
the isolated lip movement which exposed an internal surface in an earlier fit.
"""
import bpy,math,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
file=OUT/'CT_Business_Explore_v10.blend'
bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Business_Explore_v10']
if root.get('business_continuous_head_fit'):raise RuntimeError('Already fitted')
def warp(p):
 p=p.copy();z=p.z
 # The derivative of each vertical warp remains positive (> .75). Eyes,
 # lids, lips, teeth and glasses cannot separate at object boundaries.
 p.z-=.22*(z-1.55)*math.exp(-((z-1.55)/.047)**2)
 p.z-=.18*(z-1.435)*math.exp(-((z-1.435)/.027)**2)
 p.y*=1-.13*math.exp(-((z-1.49)/.095)**2)
 return p
meshes=[]
for o in bpy.data.objects['Head'].children_recursive:
 if o.type!='MESH' or o.hide_render:continue
 inv=o.matrix_world.inverted();sets=[k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
 for points in sets:
  for v in points:v.co=inv@warp(o.matrix_world@v.co)
 if o.data.shape_keys:
  for i,v in enumerate(o.data.vertices):v.co=o.data.shape_keys.key_blocks['Basis'].data[i].co
 meshes.append(o.name)
root['business_continuous_head_fit']=True
bpy.ops.wm.save_as_mainfile(filepath=str(file))
(ROOT/'outputs/v10-explore/characters-v10/business-proportion-fit.json').write_text(json.dumps({'retained_meshes':meshes,'all_expressions_transformed_consistently':True,'minimum_local_vertical_derivative':.75,'paid_calls':0},indent=2));print('BUSINESS_HEAD_FIT_SAVED',flush=True)
