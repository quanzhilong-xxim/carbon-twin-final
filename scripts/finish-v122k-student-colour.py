import bpy, sys
import numpy as np
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate'
if any(OUT.glob('CT_Student_Explore_v122k*')):raise RuntimeError('Preserve K')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122j.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122j']
skin=bpy.data.materials['V122j student painted physical skin'];shader=skin.node_tree.nodes['Principled BSDF']
texture=next(n for n in skin.node_tree.nodes if n.type=='TEX_IMAGE')
for link in list(shader.inputs['Base Color'].links):skin.node_tree.links.remove(link)
multiply=skin.node_tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
multiply.inputs[2].default_value=(.75,.52,.4,1)
skin.node_tree.links.new(texture.outputs['Color'],multiply.inputs[1]);skin.node_tree.links.new(multiply.outputs['Color'],shader.inputs['Base Color'])
# Generated colour atlases require the same byte/sRGB convention as the
# retained garment atlases. Use a lighter lavender without coarse normals.
image=bpy.data.images['V122j lavender fine canvas albedo'];w,h=image.size
pixels=np.array(image.pixels[:],np.float32).reshape(h,w,4);pixels[:,:,:3]*=np.array([1.37,1.49,1.30]);pixels=np.clip(pixels,0,1)
image.pixels.foreach_set(pixels.ravel());image.pack()
export_candidate(root,root,OUT,'CT_Student_Explore_v122k','CT_Student_Explore_v122j','v122k',['Restore the original physical skin factor to match neck and hands','Correct lavender atlas brightness while retaining fine weave'],student=True)
