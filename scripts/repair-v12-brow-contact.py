"""Project soft eyebrow ribbons onto the actual face and rebuild shirt contact.
New candidates only; retain all previous versions and native morphs/skin.
"""
import bpy,math,json,sys,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate';role=sys.argv[-1];b=role=='Business';stem=f'CT_{role}_Explore_v12g'
if(OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve '+stem)
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{role}_Explore_v12f.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{role}_Explore_v12f'];root.name=stem;rig=bpy.data.objects['CT_Humanoid'];head=bpy.data.objects['V12e native head'];brow=bpy.data.objects['V12e native eyebrows']
# Recover the original complete eyebrow before the earlier nonuniform squeeze.
with bpy.data.libraries.load(str(OUT/f'CT_{role}_Explore_v12e.blend'),link=False)as(src,dst):dst.objects=['V12e native eyebrows']
donor=dst.objects[0];brow.data=donor.data.copy();bpy.data.objects.remove(donor,do_unlink=True)
basis=brow.data.shape_keys.key_blocks[0];center=sum(v.co.z for v in basis.data)/len(basis.data)
polys=[list(p.vertices)for p in head.data.polygons]
for key in brow.data.shape_keys.key_blocks:
 surface=head.data.shape_keys.key_blocks.get(key.name)or head.data.shape_keys.key_blocks[0]
 tree=BVHTree.FromPolygons([v.co for v in surface.data],polys)
 for v in key.data:
  v.co.z=center+(v.co.z-center)*(.55 if b else .42)
  hit,normal,_,_=tree.ray_cast(Vector((v.co.x,-.4,v.co.z)),Vector((0,1,0)),.6)
  if hit:v.co.y=hit.y-.0012-max(0,-v.co.y-.10)*.08
for v,k in zip(brow.data.vertices,brow.data.shape_keys.key_blocks[0].data):v.co=k.co
if b:
 # The measured mouth centre is 1.126m; the previous squeeze missed it.
 for key in head.data.shape_keys.key_blocks:
  for v in key.data:
   p=v.co;w=math.exp(-(p.x/.049)**6-((p.z-1.126)/.025)**4)*max(0,min(1,(-p.y-.09)/.04));p.z=1.126+(p.z-1.126)*(1-.30*w);p.y+=.003*w
 for v,k in zip(head.data.vertices,head.data.shape_keys.key_blocks[0].data):v.co=k.co
 # Hide the overlapping old front. A continuous shirt panel reaches the tie.
 bpy.data.objects['Shirt front'].hide_render=True
 vs=[];fs=[]
 for z,width,y in [(.83,.050,-.145),(.96,.075,-.144),(1.018,.083,-.145),(1.055,.071,-.117),(1.074,.053,-.085)]:
  for i in range(9):
   x=(i/8*2-1)*width;vs.append((x,y+.008*(x/width)**2,z))
 for j in range(4):
  for i in range(8):n=j*9+i;fs.append((n,n+1,n+10,n+9))
 d=bpy.data.meshes.new('V12g continuous poplin front');d.from_pydata(vs,[],fs);o=bpy.data.objects.new(d.name,d);bpy.context.scene.collection.objects.link(o);o.parent=rig;d.materials.append(bpy.data.materials['Cream cotton poplin'])
 for f in d.polygons:f.use_smooth=True
 vg=o.vertex_groups.new(name='CT_Chest');vg.add(list(range(len(d.vertices))),1,'REPLACE');q=o.modifiers.new('Cloth thickness','SOLIDIFY');q.thickness=.002;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=q.name);q=o.modifiers.new('Shirt skin','ARMATURE');q.object=rig
 # Real folded points continue from the collar band to either side of knot.
 for sign in [-1,1]:
  vs=[(sign*.020,-.104,1.071),(sign*.061,-.096,1.069),(sign*.073,-.148,1.007),(sign*.025,-.164,1.033)]
  d=bpy.data.meshes.new('V12g folded collar point');d.from_pydata(vs,[],[(0,1,2,3)]);o=bpy.data.objects.new(d.name,d);bpy.context.scene.collection.objects.link(o);o.parent=rig;d.materials.append(bpy.data.materials['Cream cotton poplin']);vg=o.vertex_groups.new(name='CT_Chest');vg.add([0,1,2,3],1,'REPLACE');q=o.modifiers.new('Cloth thickness','SOLIDIFY');q.thickness=.002;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=q.name);q=o.modifiers.new('Collar skin','ARMATURE');q.object=rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
native=bpy.data.actions.get('CT_BreathAndHands')
for action in list(bpy.data.actions):
 if action!=native:bpy.data.actions.remove(action)
objects=[root,*root.children_recursive]
for o in bpy.context.scene.objects:
 if o.name in bpy.context.view_layer.objects:o.select_set(o in objects and not o.hide_render)
exports=[]
for tier in ['','-portrait','-lite']:
 if tier=='-lite':
  for o in objects:
   if o.type!='MESH'or o.hide_render or o.data.shape_keys or'anatomical hand'in o.name or len(o.data.polygons)<800:continue
   bpy.context.view_layer.objects.active=o;q=o.modifiers.new('Mobile silhouette budget','DECIMATE');q.ratio=.52;bpy.ops.object.modifier_apply(modifier=q.name)
 bpy.context.view_layer.objects.active=rig;rig.animation_data.action=native;p=OUT/(stem+tier+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=True,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=86 if tier!='-lite'else 74,export_image_webp_fallback=False)
 exports.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
record=json.loads((OUT/f'CT_{role}_Explore_v12f.sources.json').read_text());record.update(revision='v12g',parent_revision='v12f',status='CANDIDATE_NOT_ACCEPTED',exports=exports,refinements=['native brow ribbons fitted to actual facial BVH for every expression','measured lip volume and continuous shirt/collar contact'if b else'civic costume retained']);(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V12G_EXPORTED',role,flush=True)
