"""C: preserve B, reduce curve tessellation and batch cloth/fur skin draws."""
import bpy,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'public/models/behaviour-v113-candidate';target=O/'woodland-companion-v113c.blend'
if target.exists():raise RuntimeError('C candidate already exists')
bpy.ops.wm.open_mainfile(filepath=str(O/'woodland-companion-v113b.blend'),use_scripts=False)
rig=bpy.data.objects['CT113_Woodland_Companion_Rig'];groups={}
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 if o.data.shape_keys:continue
 for mod in list(o.modifiers):
  if mod.type!='ARMATURE':bpy.ops.object.modifier_apply(modifier=mod.name)
 tri=sum(len(p.vertices)-2 for p in o.data.polygons)
 if tri>200:
  ratio=.12 if any(n in o.name for n in ['sweeping cape gold hem','brooch gold bezel','scalloped linen lace hem']) else .42 if tri>600 else .7
  dec=o.modifiers.new('Web silhouette retained simplification','DECIMATE');dec.ratio=ratio;bpy.ops.object.modifier_apply(modifier=dec.name)
 if o.name=='continuous rounded feline head':continue
 mat=o.data.materials[0].name if o.data.materials else 'none';groups.setdefault(mat,[]).append(o)
for mat,items in groups.items():
 if len(items)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in items:o.select_set(True)
 bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();items[0].name='CT113 batched '+mat
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(target));glb=O/'woodland-companion-v113c.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_skins=True,export_animations=False,export_morph=True,export_apply=True)
record=json.loads((O/'sources-v113b.json').read_text(encoding='utf8'));record['revision']='v113c';record['optimization_script']='scripts/optimize-v113-woodland-companion.py';record['meshes']=len([o for o in bpy.context.scene.objects if o.type=='MESH'])
record['files']=[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [target,glb,O/'linen-wool-micro-normal.png',O/'short-fur-micro-normal.png']]
(O/'sources-v113c.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8');print('C_CANDIDATE_EXPORTED',flush=True)
