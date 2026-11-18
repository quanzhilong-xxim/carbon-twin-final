import bpy,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122w'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve W')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122v.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122v'];rig=root
for obj in root.children_recursive:
 if obj.name.startswith('V122d folded cuff hem'):obj.hide_render=True
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122v','v122w',[
 'Retire the two retained D cuff-hem overlays after rebuilding the continuous S sleeve; they otherwise intersect the independently moving hand'
],student=True)
