import bpy,sys
import numpy as np
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate'
if any(OUT.glob('CT_Student_Explore_v122l*')):raise RuntimeError('Preserve L')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122k.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122k'];skin=bpy.data.materials['V122j student painted physical skin']
skin.name='V122l student original SKIN complexion';shader=skin.node_tree.nodes['Principled BSDF']
texture=next(n for n in skin.node_tree.nodes if n.type=='TEX_IMAGE');image=texture.image
w,h=image.size;pixels=np.array(image.pixels[:],np.float32).reshape(h,w,4)
# Bake the existing physical factor into image bytes: the portable GLTF
# exporter does not serialize the arbitrary MixRGB graph used in K.
pixels[:,:,:3]*=np.array([.75,.52,.4]);image.pixels.foreach_set(pixels.ravel());image.pack()
for link in list(shader.inputs['Base Color'].links):skin.node_tree.links.remove(link)
skin.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color'])
shader.inputs['Specular IOR Level'].default_value=.125
export_candidate(root,root,OUT,'CT_Student_Explore_v122l','CT_Student_Explore_v122k','v122l',['Bake the retained physical skin tint into the portable atlas; match neck and hand complexion','Skin name retains player shadow protection'],student=True)
