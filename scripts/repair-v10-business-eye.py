"""Replace the broken black sclera atlas with one continuous mapped eye.
The existing UVs, eye mesh, eyelid morphs and gaze deformations stay intact.
"""
import bpy,math,json,numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
file=OUT/'CT_Business_Explore_v10.blend'
bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Business_Explore_v10']
if root.get('continuous_sclera_repaired'):raise RuntimeError('Already repaired')
eye=next(o for o in root.children_recursive if o.type=='MESH' and not o.hide_render and o.name.endswith('_eyes'))
mat=eye.data.materials[0].copy();eye.data.materials[0]=mat
p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.22;p.inputs['Specular IOR Level'].default_value=.42
N=1024;yy,xx=np.mgrid[:N,:N];dx=xx/N-.458984375;dy=yy/N-.458984375;r=np.hypot(dx,dy);a=np.arctan2(dy,dx)
px=np.ones((N,N,4),dtype=np.float32)
# A softly shaded warm sclera fills the complete UV island. No isolated pale
# ring surrounded by the previous black atlas.
edge=np.clip((r-.14)/.3,0,1)
for c,v in enumerate([.82,.80,.75]):px[:,:,c]=v-edge*([.06,.12,.12][c])
iris=r<.108;pupil=r<.041
fibres=.90+.065*np.sin(a*127+np.sin(r*480))+.035*np.sin(a*263+r*160)
collar=np.clip((.108-r)/.012,0,1)*np.clip((r-.041)/.016,0,1)
light=(.22+.78*collar)*fibres
for c,col in enumerate([.34,.22,.105]):px[:,:,c][iris]=col*light[iris]
px[:,:,:3][pupil]=[.007,.009,.008]
im=bpy.data.images.new('CT Business continuous hazel eye v10',width=N,height=N,alpha=True);im.pixels.foreach_set(px.ravel());im.filepath_raw=str(OUT/'CT_Business_Eye_Continuous_v10.png');im.file_format='PNG';im.save();im.pack()
nd=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.outputs['Color'].is_linked);nd.image=im
# A restrained warm brown reads as hair instead of an almost black helmet.
hair=bpy.data.materials.get('V10 Business directional hair')
if hair:
 hp=hair.node_tree.nodes['Principled BSDF'];hp.inputs['Base Color'].default_value=(.036,.019,.011,1);hp.inputs['Roughness'].default_value=.58;hp.inputs['Specular IOR Level'].default_value=.24
root['continuous_sclera_repaired']=True
bpy.ops.wm.save_as_mainfile(filepath=str(file))
(ROOT/'outputs/v10-explore/characters-v10/business-eye-repair.json').write_text(json.dumps({'cause':'Black pixels outside the iris in the inherited atlas','correction':'Full warm sclera with continuous hazel iris on the retained UV map','eye_geometry_changed':False,'morphs_retained':True,'paid_calls':0},indent=2))
print('BUSINESS_CONTINUOUS_EYE_SAVED',flush=True)
