"""Correct failed candidate edits using the retained V104 mesh, not a project rollback.
Fresh generated images avoid re-exporting a copied image's stale packed data.
"""
import bpy, json, numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';report={}
for who in ['Student','Business','City']:
 file=OUT/f'CT_{who}_Explore_v104b.blend'
 bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v104b']
 if root.get('reviewed_surface_corrected'):raise RuntimeError('Already corrected')
 head=next(o for o in root.children_recursive if o.type=='MESH' and o.name.endswith('_head'))
 name=head.name
 with bpy.data.libraries.load(str(OUT/f'CT_{who}_Explore_v104.blend'),link=False) as (src,dst):dst.objects=[name]
 archived=dst.objects[0]
 if not archived:raise RuntimeError('Retained reference head missing')
 head.data=archived.data.copy()
 # The isolated B sculpt is rejected for the face. Its continuous sleeves
 # remain; do not change the source, expression pivots, body or business state.
 if who=='Student':
  for mat in {m for o in root.children_recursive if o.type=='MESH' and not o.hide_render for m in o.data.materials if m}:
   if not mat.use_nodes or not any(s in mat.name.lower() for s in ['hair','groom','rose','lock']):continue
   for node in mat.node_tree.nodes:
    if node.type!='TEX_IMAGE' or not node.image or not any(l.to_socket.name=='Base Color' for l in node.outputs['Color'].links):continue
    old=node.image;w,h=old.size;px=np.array(old.pixels[:],dtype=np.float32).reshape(h,w,4)
    luma=np.maximum(.01,px[:,:,:3].mean(axis=2));variation=np.clip(luma/max(.01,np.median(luma)),.72,1.15)
    px[:,:,:3]=np.minimum(1,variation[:,:,None]*np.array([.78,.43,.52]))
    im=bpy.data.images.new('CT_Student_ReferencePink_v104b',width=w,height=h,alpha=True,float_buffer=False)
    im.pixels.foreach_set(px.ravel());im.update();im.filepath_raw=str(OUT/'CT_Student_ReferencePink_v104b.png');im.file_format='PNG';im.save();im.pack();node.image=im
 root['reviewed_surface_corrected']=True
 bpy.ops.wm.save_as_mainfile(filepath=str(file))
 report[who]={'restored_only':'V104 head mesh and six expression morphs','continuous_sleeves_retained':True,'source_unchanged':True,'student_hair_new_packed_image':who=='Student'}
(ROOT/'docs/recovery/v10.4/reviewed-surface-correction.json').write_text(json.dumps(report,indent=2))
