"""Correct the rejected Y wrist weighting; keep the improved physical skin."""
import bpy,sys,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122z'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve existing Z')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122y.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122y'];rig=root
for side in ['L','R']:
 o=bpy.data.objects['V122y anatomical student hand '+side];hand=o.vertex_groups['J_Bip_'+side+'_Hand'];forearm=o.vertex_groups.new(name='J_Bip_'+side+'_LowerArm')
 for v in o.data.vertices:
  if v.index<1353:continue
  t=((v.index-1353)//18+1)/6;w=t*t*(3-2*t)
  hand.add([v.index],1-w,'REPLACE');forearm.add([v.index],w,'REPLACE')
 o.name='V122z anatomical student hand '+side
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122y','v122z',[
 'Correct the Y candidate wrist extension: transition its actual skin vertices to the native forearm bone beneath the cuff instead of allowing a rigid wrist spike',
 'Preserve all thirty native finger weights, facial expressions, painted skin and the exact retained props'
],student=True)
file=OUT/(STEM+'.sources.json');record=json.loads(file.read_text());record['additional_sources']=json.loads((OUT/'CT_Student_Explore_v122y.sources.json').read_text())['additional_sources'];file.write_text(json.dumps(record,indent=2),encoding='utf8')
