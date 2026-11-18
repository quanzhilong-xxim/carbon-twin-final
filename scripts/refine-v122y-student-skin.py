"""Continue X: continuous anatomical wrist and physically lit painted skin."""
import bpy,bmesh,sys,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122y'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve existing Y')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122x.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122x'];rig=root
for side in ['L','R']:
 o=bpy.data.objects['V122x anatomical student hand '+side];bm=bmesh.new();bm.from_mesh(o.data)
 boundary=[e for e in bm.edges if e.is_boundary];start=boundary[0].verts[0];loop=[start];previous=None
 while True:
  nexts=[e.other_vert(loop[-1])for e in loop[-1].link_edges if e.is_boundary and e.other_vert(loop[-1])!=previous]
  nxt=nexts[0]
  if nxt==start:break
  previous=loop[-1];loop.append(nxt)
  if len(loop)>100:raise RuntimeError('Unexpected wrist boundary')
 center=sum((v.co for v in loop),Vector())/len(loop)
 wrist=rig.data.bones['J_Bip_'+side+'_Hand'].head_local;elbow=rig.data.bones['J_Bip_'+side+'_LowerArm'].head_local
 proximal=wrist+(elbow-wrist).normalized()*.060
 deform=bm.verts.layers.deform.verify();hand_index=o.vertex_groups['J_Bip_'+side+'_Hand'].index
 # A continuation of the donor's own boundary reaches under the cuff.
 # It moves with the wrist and has no second surface over the hand.
 ring=loop
 for j in range(1,7):
  t=j/6;new=[]
  for v in loop:
   vertex=bm.verts.new(center.lerp(proximal,t)+(v.co-center)*(1+.14*t));vertex[deform][hand_index]=1;new.append(vertex)
  for i in range(len(loop)):k=(i+1)%len(loop);bm.faces.new((ring[i],ring[k],new[k],new[i]))
  ring=new
 bm.faces.new(tuple(reversed(ring)))
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 for face in o.data.polygons:face.use_smooth=True
 o.name='V122y anatomical student hand '+side
 for polygon in o.data.polygons:polygon.material_index=0

# Retain the original painted features and blush. The source VRM shader was
# emissive, which removed nose/cheek form under the actual webpage lights.
for name in ['Face_00_SKIN','Body_00_SKIN']:
 original=bpy.data.materials.get(name)
 if not original:continue
 image=next(n.image for n in original.node_tree.nodes if n.type=='TEX_IMAGE'and n.image)
 material=bpy.data.materials.new('V122y softly lit '+name);material.use_nodes=True
 nodes=material.node_tree.nodes;shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
 shader.inputs['Roughness'].default_value=.57;shader.inputs['Specular IOR Level'].default_value=.20;shader.inputs['Subsurface Weight'].default_value=.035
 texture=nodes.new('ShaderNodeTexImage');texture.image=image
 tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.96,.87,.82,1)
 material.node_tree.links.new(texture.outputs['Color'],tint.inputs[1]);material.node_tree.links.new(tint.outputs[0],shader.inputs['Base Color'])
 for o in root.children_recursive:
  if o.type=='MESH':
   for i,m in enumerate(o.data.materials):
    if m==original:o.data.materials[i]=material
hand_material=bpy.data.materials['V122x student anatomical skin'];shader=next(n for n in hand_material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
shader.inputs['Base Color'].default_value=(.76,.58,.45,1)
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122x','v122y',[
 'Extend each continuous anatomical wrist from its actual 18-vertex source boundary beneath the knitted cuff; retire runtime cylinder overlays for this source',
 'Replace the emissive skin shader with softly lit principled skin while preserving original painted features, blush and every facial expression'
],student=True)
file=OUT/(STEM+'.sources.json');record=json.loads(file.read_text())
record['additional_sources']=[{'asset':'Snow continuous anatomical hands','author':'Blender Foundation','license':'CC BY 4.0','source':'https://studio.blender.org/characters/snow/','retained_donor':'CT_Business_Explore_v122x.blend','adaptation':'Hand topology and weights retargeted to the original student wrist and all thirty finger joints; source variants retained.'}]
file.write_text(json.dumps(record,indent=2),encoding='utf8')
