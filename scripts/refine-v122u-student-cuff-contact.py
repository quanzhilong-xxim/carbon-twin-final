"""Continue the retained S/T studies; avoid linear-skin twist collapse at cuffs."""
import bpy,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122u'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve U')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122t.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122t'];rig=root
for side in ['L','R']:
 o=bpy.data.objects['V122s inset raglan bomber sleeve '+side];hand='J_Bip_'+side+'_Hand'
 a=rig.data.bones['J_Bip_'+side+'_LowerArm'].head_local;c=rig.data.bones[hand].head_local;direction=(c-a).normalized()
 o.vertex_groups.remove(o.vertex_groups[hand])
 for v in o.data.vertices:
  t=(v.index//48)/96
  if t<.87:continue
  f=max(0,min(1,(t-.87)/.13));v.co-=direction*.018*f
  o.vertex_groups['J_Bip_'+side+'_LowerArm'].add([v.index],1,'REPLACE')
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122t','v122u',[
 'Retain smooth original hand topology and fitted shoulder; keep knitted cuffs on the forearm to prevent twist collapse'
],student=True)
