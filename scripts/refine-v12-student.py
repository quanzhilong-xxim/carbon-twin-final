"""Isolated student polish; retain licensed VRM humanoid and all expressions.
Original base © pixiv, VRM Public License 1.0, permitted modification/use.
"""
import bpy,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];DEST=R/'public/models/characters-v12-candidate';stem='CT_Student_Explore_v12a'
if(DEST/(stem+'.blend')).exists():raise RuntimeError('Preserve student candidate')
bpy.ops.wm.open_mainfile(filepath=str(R/'public/models/characters-v10/CT_Student_Explore_v11e.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v11e'];root.name=stem
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
OUT=DEST
face=bpy.data.objects['Face'];body=bpy.data.objects['Body']
# A small cheek transition is applied consistently to each expression basis.
for key in face.data.shape_keys.key_blocks:
 for v in key.data:
  w=face.matrix_world@v.co
  cheek=math.exp(-((abs(w.x)-.047)/.032)**4-((w.z-1.422)/.038)**4)*max(0,min(1,(-w.y-.025)/.045))
  w.y-=.0016*cheek;w.x*=1+.012*cheek;v.co=face.matrix_world.inverted()@w
for v,k in zip(face.data.vertices,face.data.shape_keys.key_blocks[0].data):v.co=k.co
subdivide_morph(face)
# Actual smooth anatomical hands retain interpolated original finger weights.
q=body.modifiers.new('Soft hand silhouette','SUBSURF');q.levels=1;q.render_levels=1;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=q.name)
for p in body.data.polygons:p.use_smooth=True
for material in bpy.data.materials:
 if not material.use_nodes:continue
 shader=material.node_tree.nodes.get('Principled BSDF')
 if not shader:continue
 if material.name in ['Body_00_SKIN','Face_00_SKIN']:
  shader.inputs['Roughness'].default_value=.51;shader.inputs['Specular IOR Level'].default_value=.26;shader.inputs['Subsurface Weight'].default_value=.045
 if 'hair'in material.name.lower()or 'rose silk'in material.name.lower():
  shader.inputs['Roughness'].default_value=.48;shader.inputs['Specular IOR Level'].default_value=.30
# Fine tapered fibres hug the existing broad plait, retaining Head weights.
rig=next(o for o in [root,*root.children_recursive] if o.type=='ARMATURE')
pink=bpy.data.materials['V108d rose hair highlights']
for sign in [-1,1]:
 for strand in range(8):
  points=[]
  for j in range(80):
   t=j/79;settle=min(1,t/.24);settle=settle*settle*(3-2*settle)
   a=t*math.tau*3.6+strand*math.tau/8;r=(.014+.007*math.sin(math.pi*t))*(1-.38*t)
   points.append((sign*(.106+.058*settle+.010*math.sin(t*math.pi*1.3))+(r+.006)*math.cos(a),-.004-.081*settle+(r+.006)*math.sin(a),1.515-.414*t))
  c=bpy.data.curves.new('V12 student soft plait filament','CURVE');c.dimensions='3D';c.bevel_depth=.00035;c.bevel_resolution=1
  line=c.splines.new('POLY');line.points.add(len(points)-1)
  for i,(p,xyz)in enumerate(zip(line.points,points)):p.co=(*xyz,1);p.radius=max(.1,math.sin(math.pi*(i+.5)/len(points))**.35)
  o=bpy.data.objects.new(c.name,c);bpy.context.scene.collection.objects.link(o);o.parent=root;c.materials.append(pink)
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
  vg=o.vertex_groups.new(name='J_Bip_C_Head');vg.add(list(range(len(o.data.vertices))),1,'REPLACE');q=o.modifiers.new('Head skin','ARMATURE');q.object=rig
root['v12_student_refinement']='Subdivided facial expression topology; continuously smoothed original anatomical hand weights; fine rose plait filaments; restrained physical skin and hair.'
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/(stem+'.blend')))
export(root,stem);export(root,stem+'-portrait')
for o in root.children_recursive:
 if o.type!='MESH'or o.hide_render or o.data.shape_keys or o==body or len(o.data.polygons)<1000:continue
 bpy.context.view_layer.objects.active=o;q=o.modifiers.new('Mobile silhouette budget','DECIMATE');q.ratio=.5
 try:bpy.ops.object.modifier_apply(modifier=q.name)
 except RuntimeError:o.modifiers.remove(q)
export(root,stem+'-lite')
record=json.loads((R/'public/models/characters-v10/CT_Student_Explore_v11e.sources.json').read_text());record.update(version='v12a',parent_version='v11e',status='CANDIDATE_NOT_ACCEPTED',paid_calls=0)
record.setdefault('refinements',[]).extend(['smooth anatomical hand topology with original finger weights','morph-preserving facial subdivision and cheek transition','16 fine head-weighted rose plait fibres','softer physical skin and hair response'])
record['exports']=[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in DEST.glob(stem+'*.glb')]
(DEST/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
print('V12_STUDENT_EXPORTED',flush=True)
