"""Finish S after actual web review: preserve bright original cloth and cuff contact."""
import bpy,bmesh,sys,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122t'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve T')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122s.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122s'];rig=root
old=bpy.data.materials['V122s lilac recycled twill']
with bpy.data.libraries.load(str(OUT/'CT_Student_Explore_v122q.blend'),link=False)as(src,dst):dst.materials=['Original plum woven jacket.001']
cloth=dst.materials[0].copy();cloth.name='V122t soft lavender twill'
normal=next(n.image for n in old.node_tree.nodes if n.type=='TEX_IMAGE'and 'normal'in n.image.name)
shader=next(n for n in cloth.node_tree.nodes if n.type=='BSDF_PRINCIPLED');shader.inputs['Roughness'].default_value=.76;shader.inputs['Specular IOR Level'].default_value=.23
for link in list(shader.inputs['Normal'].links):cloth.node_tree.links.remove(link)
tex=cloth.node_tree.nodes.new('ShaderNodeTexImage');tex.image=normal
nm=cloth.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.2;cloth.node_tree.links.new(tex.outputs['Color'],nm.inputs['Color']);cloth.node_tree.links.new(nm.outputs['Normal'],shader.inputs['Normal'])
for obj in root.children_recursive:
 if obj.type=='MESH':
  for i,material in enumerate(obj.data.materials):
   if material==old:obj.data.materials[i]=cloth
for side in ['L','R']:
 o=bpy.data.objects['V122s inset raglan bomber sleeve '+side];hand='J_Bip_'+side+'_Hand'
 vg=o.vertex_groups.new(name=hand)
 a=rig.data.bones['J_Bip_'+side+'_LowerArm'].head_local;c=rig.data.bones[hand].head_local;direction=(c-a).normalized()
 for v in o.data.vertices:
  t=(v.index//48)/96
  if t<.87:continue
  f=max(0,min(1,(t-.87)/.13));w=.80*f*f*(3-2*f)
  v.co+=direction*.018*f
  o.vertex_groups['J_Bip_'+side+'_LowerArm'].add([v.index],1-w,'REPLACE');vg.add([v.index],w,'REPLACE')
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122s','v122t',[
 'Web-review correction: retain original lavender base response with a fine UV normal map',
 'Extend knitted cuff under real wrist skin and blend forearm/hand weights during writing'
],student=True)
