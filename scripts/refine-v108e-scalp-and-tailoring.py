"""Fit real groom meshes to the retained scalp and tailor the existing trousers.
Writes a new editable source and GLB; never modifies an earlier master.
"""
import bpy, math, json, hashlib, bmesh
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))

for who in ['Student','Business','City']:
 stem=f'CT_{who}_Explore_v108e'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Retained output already exists: '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v108d.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects['Root' if who=='Student' else f'CT_{who}_Explore_v108d']
 changes=[]
 if who=='Student':
  # Preserve skinning, pocket topology and the existing folded fabric.
  # Ease the exaggerated balloon silhouette around each actual leg centre.
  for o in root.children_recursive:
   if o.type!='MESH' or o.hide_render:continue
   if not any(m and 'recycled cotton' in m.name for m in o.data.materials):continue
   if 'Head' in o.name:continue
   inv=o.matrix_world.inverted()
   for v in o.data.vertices:
    p=o.matrix_world@v.co
    if .18<p.z<.86:
     weight=min(1,(p.z-.18)/.09,(.86-p.z)/.10)
     anchor=math.copysign(.092,p.x)
     p.x=anchor+(p.x-anchor)*(1-.19*weight)
     p.y=.015+(p.y-.015)*(1-.19*weight)
     v.co=inv@p
  changes.append('Retained skinned cargo trouser mesh tailored around both legs, with pockets and folds preserved')
 else:
  root.name=stem
  foundation=bpy.data.objects['V104d fitted complete scalp' if who=='Business' else 'V104f civic fitted hair foundation']
  verts=[foundation.matrix_world@v.co for v in foundation.data.vertices]
  polys=[tuple(p.vertices) for p in foundation.data.polygons]
  surface=BVHTree.FromPolygons(verts,polys,all_triangles=False)
  bounds=[min(v.z for v in verts),max(v.z for v in verts)]
  adjusted=0
  for o in root.children_recursive:
   if o.type!='MESH' or o.hide_render:continue
   if not o.name.startswith(('V108d swept tapered hair lock','V108d fine groom filament')):continue
   inv=o.matrix_world.inverted()
   # A closest-surface projection prevents free-floating arcs in side views.
   for v in o.data.vertices:
    p=o.matrix_world@v.co;hit,normal,_,_=surface.find_nearest(p)
    if hit is None:continue
    if normal.dot(hit-Vector((0,0,(bounds[0]+bounds[1])/2)))<0:normal=-normal
    v.co=inv@(hit+normal*(.0018 if 'filament' in o.name else .0012))
   adjusted+=1
   for m in o.data.materials:
    if m and m.use_nodes:
     p=m.node_tree.nodes.get('Principled BSDF')
     if p:p.inputs['Roughness'].default_value=.68;p.inputs['Specular IOR Level'].default_value=.25
  # Retain the genuine complexion texture. Roughness removes the plastic glare.
  for o in root.children_recursive:
   if o.type!='MESH' or not o.name.endswith('_head') or o.hide_render:continue
   for m in o.data.materials:
    if m and m.use_nodes:
     p=m.node_tree.nodes.get('Principled BSDF')
     if p:p.inputs['Roughness'].default_value=.68;p.inputs['Specular IOR Level'].default_value=.27
  changes.append(f'{adjusted} swept lock/filament meshes fitted to the actual source scalp by BVH projection; restrained fibre specular response')
 root['v108e_refinements']=json.dumps(changes)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 if who=='Student':
  bpy.ops.object.select_all(action='DESELECT')
  for o in [root,*root.children_recursive]:o.select_set(not o.hide_render)
  bpy.context.view_layer.objects.active=root
  bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_skins=True,export_morph=True)
 else:
  combine_static(root);export(root,stem);export(root,stem+'-portrait')
  for o in root.children_recursive:
   if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
   bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Web distance LOD','DECIMATE');mod.ratio=.55;bpy.ops.object.modifier_apply(modifier=mod.name)
  export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_v108d.sources.json').read_text())
 record.update(version='v108e',parent_version='v108d',paid_calls=0,status='integrated; final visual acceptance pending')
 record['refinements']+=changes
 record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in OUT.glob(stem+'*.glb')]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2))
 print('SCALP_AND_TAILORING_EXPORTED',who,flush=True)
