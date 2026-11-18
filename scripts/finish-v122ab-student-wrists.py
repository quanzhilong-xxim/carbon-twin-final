"""Shorten the skin transition to the actual cuff overlap measured in web review."""
import bpy,sys,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122ab'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve AB')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122aa.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122aa'];rig=root
for side in ['L','R']:
 o=bpy.data.objects['V122z anatomical student hand '+side]
 # The original ring has eighteen source boundary vertices. Its index order
 # is retained by each authored extension ring; no finger vertex is moved.
 old_end=sum((o.data.vertices[i].co for i in range(1443,1461)),Vector())/18
 wrist=rig.data.bones['J_Bip_'+side+'_Hand'].head_local;elbow=rig.data.bones['J_Bip_'+side+'_LowerArm'].head_local
 wanted=wrist+(elbow-wrist).normalized()*.025
 for v in o.data.vertices:
  if v.index<1353:continue
  t=((v.index-1353)//18+1)/6;v.co+=(wanted-old_end)*t
 o.name='V122ab anatomical student hand '+side
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122aa','v122ab',[
 'Web-reviewed cuff correction: limit the native wrist transition to 25mm of proximal overlap instead of a long folded sleeve of skin; preserve real finger topology and weights'
],student=True)
file=OUT/(STEM+'.sources.json');record=json.loads(file.read_text());record['additional_sources']=json.loads((OUT/'CT_Student_Explore_v122aa.sources.json').read_text())['additional_sources'];file.write_text(json.dumps(record,indent=2),encoding='utf8')
