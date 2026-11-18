"""Measure retained facial deformation controls, without saving a master."""
import bpy,json,numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];report={}
for who,v in [('Student',6),('Business',9),('City',9)]:
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'public/models/characters-v10/CT_{who}_Explore_v{v}.blend'),load_ui=False,use_scripts=False)
 business=who=='Business';rig=bpy.data.objects['RIG-Snow' if business else 'RIG-rain'];src=bpy.data.objects['GEO-snow_head' if business else 'GEO-rain_head'];dst=bpy.data.objects[('Source / ' if who!='Student' else 'Study / ')+src.name]
 def points():
  bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();ev=src.evaluated_get(deps);m=ev.to_mesh();p=np.array([ev.matrix_world@v.co for v in m.vertices]);ev.to_mesh_clear();return p
 base=points();target=np.array([dst.matrix_world@v.co for v in dst.data.vertices]);fit={}
 if len(base)==len(target):
  coeff=np.linalg.lstsq(np.column_stack((base,np.ones(len(base)))),target,rcond=None)[0];fit={'max_error':float(np.abs(np.column_stack((base,np.ones(len(base))))@coeff-target).max()),'transform':coeff.tolist()}
 options=['MSTR-Eyelid_Upper.L','MSTR-Eyelid_Lower.L'] if business else ['ACT-Eyelid_Upper.L','MSTR-Eyering_Upper.L','ACT-Eyelid_Lower.L']
 probes=[]
 for name in options:
  b=rig.pose.bones.get(name)
  if not b:continue
  initial=b.matrix.copy();m=initial.copy();m.translation+=Vector((0,0,-.018));b.matrix=m;rig.update_tag();after=points()
  probes.append({'bone':name,'count':len(after),'max_delta':float(np.abs(after-base).max()) if after.shape==base.shape else None,'matrix':list(b.matrix.translation),'basis':list(b.location)})
  b.matrix=initial;rig.update_tag();bpy.context.view_layer.update()
 report[who]={'original':len(base),'baked':len(target),'fit':fit,'probes':probes,'mouth_controls':[b.name for b in rig.pose.bones if ('corner' in b.name.lower() or 'lip' in b.name.lower()) and b.name.startswith(('CTR-','STR-','ACT-'))]}
(ROOT/'outputs/v10-explore/lid-control-probe.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
