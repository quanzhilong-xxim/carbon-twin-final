"""E: approved chapter-six default, retain D and soften fur/cloth micro normals."""
import bpy,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'public/models/behaviour-v113-candidate';target=O/'woodland-companion-v113e.blend'
if target.exists():raise RuntimeError('E revision already exists')
bpy.ops.wm.open_mainfile(filepath=str(O/'woodland-companion-v113d.blend'),use_scripts=False)
for m in bpy.data.materials:
 if not m.use_nodes:continue
 for node in m.node_tree.nodes:
  if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.025 if 'fur' in m.name else .05
bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(target));glb=O/'woodland-companion-v113e.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_skins=True,export_animations=False,export_morph=True,export_apply=True)
record=json.loads((O/'sources-v113d.json').read_text(encoding='utf8'));record['name']='CarbonTwin woodland companion — chapter six V11.3e';record['revision']='v113e';record['default_replaced']=True;record['scope']='Chapter six only; original ordinary cat remains at ?companion=classic and in miniature ecology/sakura scenes; cow/sheep unchanged.';record['softening_script']='scripts/soften-v113-woodland-companion.py';record['normal_strength']={'fur':.025,'cloth':.05};record['scene_assets']=[{'source':'public/models/urban-vegetation/CT_ParkTree_StreetLite_v3.glb','license':'CC0','source_manifest':'public/models/urban-vegetation/CT_ParkTree_v3.sources.json','author':'Poly Haven / Rob Tuytel and Rico Cilliers'}]
record['files']=[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [target,glb,O/'linen-wool-micro-normal.png',O/'short-fur-micro-normal.png']]
(O/'sources-v113e.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8');print('E_REVISION_EXPORTED',flush=True)
