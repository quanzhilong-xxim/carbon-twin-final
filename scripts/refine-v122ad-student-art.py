"""Additive art pass: continuous wrist openings, cheek volume and lit hair.
Uses the retained concept-C identity and licensed source meshes; no AI calls.
"""
import bpy,bmesh,math,sys,json
from collections import deque
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122ad'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve existing AD assets')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122ac.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122ac'];rig=root

for side in ['L','R']:
 o=bpy.data.objects['V122ac anatomical student hand '+side]
 # Recover the true donor boundary, rather than relying on vertex numbers
 # to describe its cyclic order. The source boundary contained two notches.
 boundary={i for f in o.data.polygons if any(v>=1353 for v in f.vertices) for i in f.vertices if i<1353}
 assert len(boundary)==18
 wrist=rig.data.bones['J_Bip_'+side+'_Hand'].head_local
 axis=(rig.data.bones['J_Bip_'+side+'_LowerArm'].head_local-wrist).normalized()
 radial=Vector((0,1,0));radial=(radial-axis*radial.dot(axis)).normalized();cross=axis.cross(radial).normalized()
 center=wrist+axis*.006
 old={v.index:v.co.copy() for v in o.data.vertices}
 directions={i:(old[i]-center-axis*(old[i]-center).dot(axis)).normalized()for i in boundary}
 targets={i:center+directions[i]*.020 for i in boundary}
 # Blend the rim displacement into connected palm topology over 14mm.
 adjacency={v.index:set()for v in o.data.vertices if v.index<1353}
 for e in o.data.edges:
  a,b=e.vertices
  if a<1353 and b<1353:adjacency[a].add(b);adjacency[b].add(a)
 for i in range(1353):
  nearest=min(boundary,key=lambda j:(old[i]-old[j]).length_squared)
  d=(old[i]-old[nearest]).length;w=max(0,1-d/.014);w=w*w*(3-2*w)
  if i in boundary:w=1
  o.data.vertices[i].co=old[i]+(targets[nearest]-old[nearest])*w
 # The six authored extension rings retain their exact original topology.
 for ring in range(6):
  t=(ring+1)/6;origin=center.lerp(wrist+axis*.025,t);radius=.020+.002*t
  for k in range(18):
   i=1353+ring*18+k
   nearest=min(boundary,key=lambda j:(old[1353+k]-old[j]).length_squared)
   # Match the extension to the boundary's radial angle, including seam.
   d=old[1353+k]-sum((old[j]for j in range(1353,1371)),Vector())/18
   d-=axis*d.dot(axis);d.normalize()
   o.data.vertices[i].co=origin+d*radius
 # One subdivision before armature interpolates actual finger weights.
 sub=o.modifiers.new('AD continuous anatomical surface','SUBSURF');sub.levels=1;sub.render_levels=1
 bpy.context.view_layer.objects.active=o
 while list(o.modifiers).index(sub)>0:bpy.ops.object.modifier_move_up(modifier=sub.name)
 bpy.ops.object.modifier_apply(modifier=sub.name)
 o.name='V122ad anatomical student hand '+side
 for f in o.data.polygons:f.use_smooth=True
 # The shoulder closing disk is cloth, not the cuff stripe.
 sleeve=bpy.data.objects['V122s inset raglan bomber sleeve '+side]
 for f in sleeve.data.polygons:
  if len(f.vertices)>4:f.material_index=0

# Fit the undershirt below the bomber at the shoulder seam, retaining its
# visible centre panel and complete collar. No source clothing is deleted.
inner=bpy.data.objects['V108u continuous fine knit']
for v in inner.data.vertices:
 p=v.co;weight=math.exp(-((p.z-1.255)/.045)**2)
 p.x*=1-.10*weight;p.y*=1-.08*weight

# Proportional face sculpt applies the same coordinate map to every shape
# key so blinking and the retained smile remain geometrically consistent.
face=bpy.data.objects['Face']
def sculpt(p):
 p=p.copy();lower=math.exp(-((p.z-1.382)/.025)**2)
 p.x*=1+.065*lower
 p.z+=.0045*math.exp(-((p.z-1.361)/.017)**2)
 cheek=math.exp(-((abs(p.x)-.064)/.028)**2-((p.z-1.416)/.023)**2)
 if p.y<0:p.y-=.0023*cheek
 return p
for key in face.data.shape_keys.key_blocks:
 for v in key.data:v.co=sculpt(v.co)

# Convert original emissive VRM hair to physical material while retaining
# the painted strand map. Reuse the existing packed tangent normal map.
normal=bpy.data.images.get('V108u Student longitudinal hair normal')
for source_name in ['Hair_00_HAIR','HairBack_00_HAIR']:
 source=bpy.data.materials.get(source_name)
 if not source:continue
 image=next((n.image for n in source.node_tree.nodes if n.type=='TEX_IMAGE'and n.image),None)
 if not image:continue
 m=bpy.data.materials.new('V122ad physically lit '+source_name);m.use_nodes=True
 p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 p.inputs['Roughness'].default_value=.47;p.inputs['Specular IOR Level'].default_value=.28;p.inputs['Sheen Weight'].default_value=.12
 t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=image;m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 if normal:
  nt=m.node_tree.nodes.new('ShaderNodeTexImage');nt.image=normal
  nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.11
  m.node_tree.links.new(nt.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],p.inputs['Normal'])
 for o in root.children_recursive:
  if o.type=='MESH':
   for i,mat in enumerate(o.data.materials):
    if mat==source:o.data.materials[i]=m

export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122ac','v122ad',[
 'Rebuild planar continuous wrist rims from the real donor boundary; smooth connected palm transition and subdivide native weighted fingers before skinning',
 'Correct the sleeve shoulder closing-disk material and fit the retained inner jersey beneath the bomber',
 'Soften lower-face contour, add restrained cheek volume and lift chin with identical proportional sculpt on all retained expressions',
 'Replace emissive front/back hair with physically lit painted strand materials and retained fine tangent normals'
],student=True)
