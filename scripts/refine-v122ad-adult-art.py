"""Refine retained adult meshes without evaluating unused donor control rigs.
Append just the actually exported hierarchy; original full sources survive.
"""
import bpy,json,sys,math,struct
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BUSINESS=ROLE=='Business'
BASE='v122x' if BUSINESS else 'v122s';STEM=f'CT_{ROLE}_Explore_v122ad'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve existing AD source')
source_stem=f'CT_{ROLE}_Explore_{BASE}';data=(OUT/(source_stem+'.glb')).read_bytes()
g=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
names={n['name']for n in g['nodes']if 'name'in n and ('mesh'in n or n['name']=='CT_Humanoid')};names.add(source_stem)
with bpy.data.libraries.load(str(OUT/(source_stem+'.blend')),link=False)as(fr,to):
 to.objects=[n for n in fr.objects if n in names]
for o in to.objects:
 if o:o.hide_viewport=False;o.hide_render=False;bpy.context.scene.collection.objects.link(o)
root=bpy.data.objects[source_stem];rig=bpy.data.objects['CT_Humanoid']
assert all(o.parent is not None for o in to.objects if o and o!=root)
# A compact source includes the render anatomy, all expressions, native
# animation and weights. Historical authoring rigs stay in the parent blend.
for o in root.children_recursive:
 if o.type=='MESH' and o.data.shape_keys:
  for key in o.data.shape_keys.key_blocks:key.value=0

eye=1.204 if BUSINESS else 1.588
head=bpy.data.objects['V12e native head'];mouth=eye-(.105 if BUSINESS else .095)
def sculpt(p):
 p=p.copy();front=max(0,min(1,(-p.y-.055)/.055))
 # Keep the centre lip shape, lifting only the corners of the continuous
 # surface and narrowing the inflated nasal wing, including all morphs.
 corner=math.exp(-((abs(p.x)-.030)/.014)**2-((p.z-mouth)/.015)**2)*front
 p.z+=.0025*corner
 nose=math.exp(-(p.x/.031)**4-((p.z-(eye-.053))/.024)**4)*front
 p.x*=1-(.045 if BUSINESS else .025)*nose;p.y+=.0014*nose
 return p
for key in head.data.shape_keys.key_blocks:
 for v in key.data:v.co=sculpt(v.co)
for v,k in zip(head.data.vertices,head.data.shape_keys.key_blocks[0].data):v.co=k.co

if not BUSINESS:
 # Relax the worried V-shaped brow without flattening the natural arch.
 brow=bpy.data.objects['V12e native eyebrows'];basis=brow.data.shape_keys.key_blocks[0]
 offsets=[]
 for v in basis.data:
  t=max(0,min(1,(abs(v.co.x)-.015)/.072))
  wanted=eye+.026+.005*math.sin(t*math.pi)-.002*t
  offsets.append((wanted-v.co.z)*.62)
 for key in brow.data.shape_keys.key_blocks:
  for v,d in zip(key.data,offsets):v.co.z+=d
 for v,k in zip(brow.data.vertices,brow.data.shape_keys.key_blocks[0].data):v.co=k.co

# The real donor hands receive one pre-armature surface subdivision. Finger
# weights interpolate rather than replacing fingers with rigid primitives.
for side in ['L','R']:
 o=bpy.data.objects['V12 anatomical hand '+side]
 m=o.modifiers.new('AD native finger skin continuity','SUBSURF');m.levels=1;m.render_levels=1
 bpy.context.view_layer.objects.active=o
 while list(o.modifiers).index(m)>0:bpy.ops.object.modifier_move_up(modifier=m.name)
 bpy.ops.object.modifier_apply(modifier=m.name)

# Soften the small shirt cuff instead of retaining a white torus bracelet.
for side,suffix in [('R',''),('L','.001')]:
 o=bpy.data.objects['V3 fitted cuff'+suffix]
 center=sum((v.co for v in o.data.vertices),Vector())/len(o.data.vertices)
 for v in o.data.vertices:v.co=center+(v.co-center)*.88

# Retain the artist's directional groom, with restrained highlights rather
# than the broad plastic sheen. Source fibres and UV textures remain intact.
hair=bpy.data.materials.get('V122o artist sculpted chestnut hair')
if hair:
 p=next(n for n in hair.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 p.inputs['Roughness'].default_value=.52;p.inputs['Specular IOR Level'].default_value=.25;p.inputs['Sheen Weight'].default_value=.08

export_candidate(root,rig,OUT,STEM,source_stem,'v122ad',[
 'Keep exported native anatomy, full source expression targets, skin weights and action while leaving unused historical donor control rigs in the original source',
 'Proportional lip-corner and nasal refinement applied consistently to every expression; city brow relaxed toward the original concept',
 'Subdivide the continuous native hands before armature so every weighted finger has a smooth surface',
 'Reduce oversized cotton cuff rims and soften directional artist hair highlights'
])
