"""Hide archived oral interior on closed-mouth runtime rigs.
These rigs export blink/smile/gaze, not jaw-open morphs. The original gums
otherwise break through the newly reduced lip volume. Retain all source data.
"""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';report={}
for who in ['Student','Business','City']:
 file=OUT/f'CT_{who}_Explore_v104.blend';bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False);root=bpy.data.objects[f'CT_{who}_Explore_v104']
 hidden=[]
 for o in root.children_recursive:
  if any(s in o.name for s in ['_gums_','_teeth_','_tongue']):o.hide_render=True;hidden.append(o.name)
 bpy.ops.wm.save_as_mainfile(filepath=str(file));report[who]={'retained_hidden_oral_interior':hidden,'runtime_expression_set':'closed-mouth smile, blink and gaze'}
(ROOT/'docs/recovery/v10.4/closed-mouth-finish.json').write_text(json.dumps(report,indent=2))
