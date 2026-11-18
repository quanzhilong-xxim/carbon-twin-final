import bpy,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'public/models/behaviour-v113-candidate';target=O/'woodland-companion-v113d.blend'
if target.exists():raise RuntimeError('D candidate already exists')
bpy.ops.wm.open_mainfile(filepath=str(O/'woodland-companion-v113c.blend'),use_scripts=False)
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.data.shape_keys:
  for k in o.data.shape_keys.key_blocks:
   if k.name!='Basis':k.value=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(target));glb=O/'woodland-companion-v113d.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_skins=True,export_animations=False,export_morph=True,export_apply=True)
record=json.loads((O/'sources-v113c.json').read_text(encoding='utf8'));record['revision']='v113d';record['finalization_script']='scripts/finalize-v113-woodland-companion.py';record['rest_pose']='Blink morphs start at zero; preview uses a dedicated neutral inspection camera and lights, leaving default chapter art untouched.'
record['files']=[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [target,glb,O/'linen-wool-micro-normal.png',O/'short-fur-micro-normal.png']]
(O/'sources-v113d.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8');print('D_CANDIDATE_EXPORTED',flush=True)
