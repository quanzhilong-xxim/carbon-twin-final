"""Additive source sculpt: preserve AE, every joint, expression and hand mesh."""
import bpy,sys,math,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate'
roles=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Student','Business','City']
for role in roles:
 stem=f'CT_{role}_Explore_v123a';parent=f'CT_{role}_Explore_v122ae'
 if any(OUT.glob(stem+'*')):raise RuntimeError('Preserve existing '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/(parent+'.blend')),load_ui=False,use_scripts=False)
 root=bpy.data.objects[parent];student=role=='Student';rig=root if student else bpy.data.objects['CT_Humanoid']
 head=bpy.data.objects['Face' if student else 'V12e native head']
 basis=head.data.shape_keys.key_blocks[0];deltas=[]
 if student:
  # Keep original painted eyes/mouth and every face expression. Soften only
  # the pointed lower skin contour; no separate spheres or overlay patches.
  skin=set()
  for f in head.data.polygons:
   if 'SKIN' in head.data.materials[f.material_index].name:skin.update(f.vertices)
  for i,v in enumerate(basis.data):
   p=v.co;d=Vector((0,0,0))
   if i in skin:
    w=math.exp(-((p.z-1.363)/.014)**2-(p.x/.045)**4)
    d.z=.0018*w;d.y=-.0007*w
   deltas.append(d)
 else:
  eye=1.204 if role=='Business' else 1.588
  mouth=eye-(.105 if role=='Business' else .095)
  for v in basis.data:
   p=v.co;d=Vector((0,0,0));front=max(0,min(1,(-p.y-.065)/.055))
   lip=math.exp(-(p.x/.041)**4-((p.z-mouth)/.014)**4)*front
   # Thin the actual continuous lip volume instead of recolouring a pout.
   d.z=-(p.z-mouth)*(.24 if role=='Business' else .16)*lip
   d.y=.0015*lip
   nose=math.exp(-(p.x/.031)**4-((p.z-(eye-.050))/.027)**4)*front
   d.x=-p.x*(.08 if role=='Business' else .065)*nose
   d.y+=.0017*nose
   corner=math.exp(-((abs(p.x)-.031)/.012)**2-((p.z-mouth)/.013)**2)*front
   d.z+=.0012*corner
   deltas.append(d)
 for key in head.data.shape_keys.key_blocks:
  for v,d in zip(key.data,deltas):v.co+=d
 for v,k in zip(head.data.vertices,basis.data):v.co=k.co
 # Preserve source groom topology and UV. Add low contrast colour variation
 # along its retained strand coordinates; geometry, flyaways and silhouette stay.
 if not student:
  material=bpy.data.materials['V122o artist sculpted chestnut hair'];nodes=material.node_tree.nodes;links=material.node_tree.links
  p=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');base=list(p.inputs['Base Color'].default_value)
  image=bpy.data.images.new(f'V123 {role} directional chestnut strands',width=256,height=256,alpha=True)
  pixels=[]
  for y in range(256):
   for x in range(256):
    variation=1+.10*math.sin(x*.83)+.04*math.sin(x*2.31+y*.017)+.025*math.sin(y*.041)
    pixels.extend([max(0,min(1,base[i]*variation)) for i in range(3)]+[1])
  image.colorspace_settings.name='Linear Rec.709';image.pixels.foreach_set(pixels);image.pack()
  tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.label='Original directional colour, retained source UV';links.new(tex.outputs['Color'],p.inputs['Base Color'])
  p.inputs['Roughness'].default_value=.55;p.inputs['Specular IOR Level'].default_value=.22
  # Taper the heavy ruler-like brow using all retained morph targets.
  brow=bpy.data.objects['V12e native eyebrows'];b=brow.data.shape_keys.key_blocks[0]
  center=sum(v.co.z for v in b.data)/len(b.data)
  offsets=[(v.co.z-center)*(-.15 if role=='Business' else -.08) for v in b.data]
  for key in brow.data.shape_keys.key_blocks:
   for v,d in zip(key.data,offsets):v.co.z+=d
  for v,k in zip(brow.data.vertices,b.data):v.co=k.co
 changes=[
  'Reviewed original target sheets 074/078/080 and retained AE anatomy, hands, every bone, UV, garment and action',
  'Apply a fixed continuous lower-face sculpt delta to every source expression; retain expression deltas rather than flattening facial animation',
  'Student: soften pointed lower skin contour by 1.8mm, preserve painted eyes, mouth and original character identity' if student else 'Adult: reduce protruding lip and nasal-wing volume with proportional source-mesh sculpt; retain eye geometry and skull',
  'Adult: restrained directional chestnut colour in retained groom UV, lower broad specular sheen and taper brow thickness' if not student else 'Preserve AE layered hair, cloth seams, all thirty weighted finger joints and notebook/pen contact',
 ]
 export_candidate(root,rig,OUT,stem,parent,'v123a',changes,student=student)
 print('SOURCE_SCULPT_MAX_DELTA',role,max(d.length for d in deltas),flush=True)
