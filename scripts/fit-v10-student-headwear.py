"""Fit the existing cap/goggles together and match the supplied rose palette."""
import bpy,json,numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
p=OUT/'CT_Student_Explore_v10.blend'
bpy.ops.wm.open_mainfile(filepath=str(p),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v10']
if root.get('v10_rose_headwear_fitted'):raise RuntimeError('Already fitted')
changed=[]
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render:continue
 if o.name.startswith(('Explorer soft cap','Cap binding','Goggle brass','Goggle bridge','Raised optical glass','V10 knitted cap rib')):
  m=o.matrix_world.copy();m.translation+=Vector((0,.018,-.026));o.matrix_world=m;changed.append(o.name)
hair=bpy.data.materials['V10 Student directional hair']
pbr=next(n for n in hair.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
node=next(link.from_node for link in pbr.inputs['Base Color'].links if link.from_node.type=='TEX_IMAGE')
src=node.image;w,h=src.size;px=np.array(src.pixels[:],dtype=np.float32).reshape(h,w,4)
lum=px[:,:,:3].mean(axis=2);lo,hi=np.quantile(lum,[.02,.98]);shade=.82+.18*np.clip((lum-lo)/max(hi-lo,.0001),0,1)
px[:,:,:3]=shade[:,:,None]*[.56,.23,.31]
im=bpy.data.images.new('CT Student reference rose linear',width=w,height=h,alpha=True,float_buffer=True)
im.pixels.foreach_set(px.ravel());im.filepath_raw=str(OUT/'CT_Student_Hair_Color_v10.png');im.file_format='PNG';im.save();im.pack();node.image=im
root['v10_rose_headwear_fitted']=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'CT_Student_Explore_v10.blend'))
(ROOT/'outputs/v10-explore/characters-v10/student-headwear-fit.json').write_text(json.dumps({'headwear_offset':[0,.018,-.026],'pieces':changed,'hair_color_space':'linear working RGB saved to sRGB PNG','reference':'074_a3ba842c39b243196a3b5b1eadb4bc43.png','paid_calls':0},indent=2))
print('STUDENT_HEADWEAR_SAVED',flush=True)
