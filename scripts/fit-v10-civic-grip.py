"""Fit the retained open hand beneath the existing tablet and nest the skirt.
This is a single measured rest-pose correction, not a replacement character.
"""
import bpy,math,json
from mathutils import Vector,Matrix
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
file=OUT/'CT_City_Explore_v10.blend'
bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_City_Explore_v10']
if root.get('civic_grip_fit'):raise RuntimeError('Already fitted')
hand=bpy.data.objects['Source skin left'];inverse=hand.matrix_world.inverted();pivot=Vector((.262,-.025,.902));rotation=Matrix.Rotation(-1.22,4,'Y')
for v in hand.data.vertices:
 p=hand.matrix_world@v.co
 # Keep the wrist ring attached to its retained cuff, then smoothly rotate
 # the palm to cradle the lower tablet edge instead of piercing the screen.
 t=max(0,min(1,(.906-p.z)/.035));t=t*t*(3-2*t)
 q=pivot+rotation@(p-pivot);v.co=inverse@p.lerp(q,t)
skirt=bpy.data.objects['V10 charcoal pleated underdress'];inverse=skirt.matrix_world.inverted()
for v in skirt.data.vertices:
 p=skirt.matrix_world@v.co
 # Measured inner skirt exceeded the outer coat at the hip. Nest the fabric
 # while retaining its existing pleats and front opening.
 t=max(0,min(1,(p.z-.65)/.22));p.x*=1-.22*t;p.y*=1-.32*t;v.co=inverse@p
inner=bpy.data.objects['V10 continuous dark inner dress'];inverse=inner.matrix_world.inverted()
for v in inner.data.vertices:
 p=inner.matrix_world@v.co
 # Leave the high collar around the neck rather than sinking through it.
 if p.z>1.35:
  t=max(0,min(1,(p.z-1.35)/.06));p.y=(p.y+.012)/(1-.25*t)-.012
 v.co=inverse@p
root['civic_grip_fit']=True
bpy.ops.wm.save_as_mainfile(filepath=str(file))
(ROOT/'outputs/v10-explore/characters-v10/civic-grip-fit.json').write_text(json.dumps({'wrist_pivot':list(pivot),'palm_rotation_y':-1.22,'skirt_nested_at_hip':True,'original_hand_topology_retained':True,'paid_calls':0},indent=2))
print('CIVIC_GRIP_FIT_SAVED',flush=True)
