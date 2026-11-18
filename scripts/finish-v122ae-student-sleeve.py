"""Correct cloth assignment using actual vertex rings, never polygon order."""
import bpy,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122ae'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve AE')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122ad.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122ad']
for side in ['L','R']:
 o=bpy.data.objects['V122s inset raglan bomber sleeve '+side]
 for f in o.data.polygons:
  row=sum(v//48 for v in f.vertices)/len(f.vertices)
  f.material_index=1 if row>=87 else 0
export_candidate(root,root,OUT,STEM,'CT_Student_Explore_v122ad','v122ae',[
 'Assign the retained raglan sleeves by their actual longitudinal vertex rings so knit never reaches the shoulder after polygon normal reordering'
],student=True)
