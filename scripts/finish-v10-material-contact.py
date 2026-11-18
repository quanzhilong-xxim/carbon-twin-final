"""Final local material and garment contact corrections; no remote tasks."""
import bpy,math,json,numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';report={}
for who in ['Business','City']:
 file=OUT/f'CT_{who}_Explore_v10.blend';bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False);root=bpy.data.objects[f'CT_{who}_Explore_v10']
 if root.get('material_contact_finished'):raise RuntimeError('Already fitted')
 hair=bpy.data.materials.get('V10 '+who+' directional hair')
 if hair:
  p=hair.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=.58
  # Base Color is texture-linked, so changing only its default value does
  # nothing. Refine the actual retained texture and preserve its variation.
  for link in p.inputs['Base Color'].links:
   if link.from_node.type!='TEX_IMAGE' or not link.from_node.image:continue
   src=link.from_node.image;w,h=src.size;px=np.array(src.pixels[:],dtype=np.float32).reshape(h,w,4)
   lum=px[:,:,:3].mean(axis=2);lo,hi=np.quantile(lum,[.05,.95]);l=np.clip((lum-lo)/max(.0001,hi-lo),0,1)
   shade=.65+.35*l;px[:,:,:3]=shade[:,:,None]*np.array([.17,.082,.038] if who=='Business' else [.11,.051,.027])
   im=bpy.data.images.new('CT '+who+' warm groom color v10',width=w,height=h,alpha=True);im.pixels.foreach_set(px.ravel());im.filepath_raw=str(OUT/f'CT_{who}_Hair_Color_v10.png');im.file_format='PNG';im.save();im.pack();link.from_node.image=im
 if who=='City':
  # The side panels and the narrow inner dress share a continuous waist.
  skirt=bpy.data.objects['V10 charcoal pleated underdress'];inv=skirt.matrix_world.inverted()
  for v in skirt.data.vertices:
   p=skirt.matrix_world@v.co;t=max(0,min(1,(p.z-.64)/.20));p.y*=1-.22*t;v.co=inv@p
  tablet=bpy.data.objects['HeldTablet'];m=tablet.matrix_world.copy();m.translation+=Vector((0,0,.023));tablet.matrix_world=m
  # Replace the collar's sunken side arcs with its measured neck clearance.
  inner=bpy.data.objects['V10 continuous dark inner dress'];inv=inner.matrix_world.inverted()
  for v in inner.data.vertices:
   p=inner.matrix_world@v.co
   if p.z>1.36:
    t=max(0,min(1,(p.z-1.36)/.045));p.y-=.017*t
   v.co=inv@p
  # Extend trouser hems to meet the retained shoes instead of leaving an
  # exposed gap. This changes only the distal, lower-leg vertices.
  for o in root.children_recursive:
   if o.type!='MESH' or o.hide_render or not any(t in o.name.lower() for t in ['trouser','pants']):continue
   inv=o.matrix_world.inverted()
   for v in o.data.vertices:
    p=o.matrix_world@v.co
    if .08<p.z<.20:p.z-=.025*max(0,min(1,(.20-p.z)/.07))
    v.co=inv@p
 root['material_contact_finished']=True;bpy.ops.wm.save_as_mainfile(filepath=str(file));report[who]={'actual_linked_hair_texture_refined':True,'paid_calls':0}
(ROOT/'outputs/v10-explore/characters-v10/material-contact-finish.json').write_text(json.dumps(report,indent=2));print('MATERIAL_CONTACT_FINISHED',flush=True)
