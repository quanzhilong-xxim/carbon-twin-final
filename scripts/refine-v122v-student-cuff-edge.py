"""Keep knitted sleeve edge behind the real wrist joint during the held pose."""
import bpy,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122v'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve V')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122u.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122u'];rig=root
for side in ['L','R']:
 o=bpy.data.objects['V122s inset raglan bomber sleeve '+side];hand='J_Bip_'+side+'_Hand'
 a=rig.data.bones['J_Bip_'+side+'_LowerArm'].head_local;c=rig.data.bones[hand].head_local;direction=(c-a).normalized()
 for v in o.data.vertices:
  t=(v.index//48)/96
  if t<.87:continue
  f=max(0,min(1,(t-.87)/.13));v.co-=direction*.026*f
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122u','v122v',[
 'Shorten knitted cuff at the actual wrist pivot, exposing the articulated skin rather than intersecting the palm'
],student=True)
