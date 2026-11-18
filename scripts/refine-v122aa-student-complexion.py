"""Keep the Z hand skinning and warm the retained painted face texture."""
import bpy,sys,json,numpy as np
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122aa'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve AA')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122z.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122z'];rig=root
for name in ['Face_00_SKIN','Body_00_SKIN']:
 material=bpy.data.materials['V122y softly lit '+name]
 tex=next(n for n in material.node_tree.nodes if n.type=='TEX_IMAGE')
 image=tex.image.copy();image.name='V122aa warm painted '+name
 pixels=np.empty(len(image.pixels),np.float32);image.pixels.foreach_get(pixels)
 rgba=pixels.reshape(-1,4);rgba[:,:3]*=np.array([.98,.86,.78],np.float32)[None,:]
 image.pixels.foreach_set(pixels);image.pack();tex.image=image
 shader=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 for link in list(shader.inputs['Base Color'].links):material.node_tree.links.remove(link)
 material.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122z','v122aa',[
 'Warm the copied original painted skin texture in its actual pixels so the exported model retains its complexion across renderers; originals stay unchanged'
],student=True)
file=OUT/(STEM+'.sources.json');record=json.loads(file.read_text());record['additional_sources']=json.loads((OUT/'CT_Student_Explore_v122z.sources.json').read_text())['additional_sources'];file.write_text(json.dumps(record,indent=2),encoding='utf8')
