import bpy,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Business_Explore_v122t'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve T')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Business_Explore_v122s.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Business_Explore_v122s'];rig=bpy.data.objects['CT_Humanoid']
o=bpy.data.objects['V122s curved silk Windsor knot']
for v in o.data.vertices:
 t=max(0,min(1,(v.co.z-1.018)/.043));v.co.z-=.012*(1-t)
export_candidate(root,rig,OUT,STEM,'CT_Business_Explore_v122s','v122t',[
 'Join the shaped Windsor knot to the retained silk tie with a measured twelve-millimetre overlap'
])
