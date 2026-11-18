"""Keep the tested portrait sculpt and correct excessive white sheen in GLB."""
import bpy,sys,json,struct
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BASE=f'CT_{ROLE}_Explore_v122ad';STEM=f'CT_{ROLE}_Explore_v122ae'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve AE')
bpy.ops.wm.open_mainfile(filepath=str(OUT/(BASE+'.blend')),load_ui=False,use_scripts=False)
root=bpy.data.objects[BASE];rig=bpy.data.objects['CT_Humanoid']
hair=bpy.data.materials['V122o artist sculpted chestnut hair'];p=next(n for n in hair.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
p.inputs['Sheen Weight'].default_value=0;p.inputs['Roughness'].default_value=.52
export_candidate(root,rig,OUT,STEM,BASE,'v122ae',[
 'Actual browser review corrected the excessive white glTF sheen layer; retain physical chestnut base colour, fine groom, tested anatomy and natural roughness'
])
