"""Finish the new V10 masters after actual browser review; keep V1-V9 intact.
Bake cloth edge modifiers, fit the civic dress, refine retained facial/hair
silhouettes and export three use-specific levels with the same six morphs.
"""
import bpy,numpy as np,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';E=ROOT/'outputs/v10-explore/characters-v10'
def parent(o,p):
 bpy.context.view_layer.update();m=o.matrix_world.copy();o.parent=p;o.matrix_world=m
def mesh(name,verts,faces,material,p):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);d.materials.append(material)
 for f in d.polygons:f.use_smooth=True
 parent(o,p);return o
def face_sculpt(p,who):
 p=p.copy();eye=1.47 if who=='Student' else 1.55 if who=='Business' else 1.59
 # Keep original eye sockets and topology; soften excessive ear projection
 # and broad lower-jaw proportions towards the supplied character sheets.
 if abs(p.x)>.10:p.x=math.copysign(.10+(abs(p.x)-.10)*.66,p.x)
 mouth=eye-.105;w=math.exp(-((p.z-mouth)/.022)**2-(p.x/.045)**2)
 if p.y<-.09:p.z=mouth+(p.z-mouth)*(1-.28*w)
 jaw=math.exp(-((p.z-(eye-.17))/.075)**2);p.x*=1-jaw*.075
 return p
def combine_static(root):
 # Preserve shoulder pivots, facial morphs and each animated hierarchy. Join
 # only material-compatible descendants belonging to the same parent.
 groups={}
 for o in list(root.children_recursive):
  if o.type!='MESH' or o.hide_render or o.data.shape_keys or o.name.startswith('V3 rounded sleeve shoulder'):continue
  key=(o.parent.name,tuple(m.name if m else '' for m in o.data.materials));groups.setdefault(key,[]).append(o)
 for key,items in groups.items():
  if len(items)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.hide_set(False);o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();items[0].name='V10 merged '+key[0]+' / '+key[1][0]
def export(root,stem):
 members=[root,*root.children_recursive]
 # Export a neutral basis, including portrait tiers whose shape keys were
 # rebuilt. The web player owns expression weights, not the saved preview.
 for o in members:
  if o.type=='MESH' and o.data.shape_keys:
   for key in o.data.shape_keys.key_blocks:key.value=0
 bpy.context.view_layer.update()
 for o in bpy.context.scene.objects:
  if o.name in bpy.context.view_layer.objects:o.select_set(o in members and not o.hide_render)
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True,export_apply=False,export_animations=False,export_morph=True,export_image_format='WEBP',export_image_quality=88,export_image_webp_fallback=False)
def subdivide_morph(o):
 names=[k.name for k in o.data.shape_keys.key_blocks];keys=o.data.shape_keys.key_blocks
 sub=o.modifiers.new('Near portrait surface refinement','SUBSURF');sub.levels=1;sub.render_levels=1
 def evaluate():
  bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();return bpy.data.meshes.new_from_object(o.evaluated_get(dg),depsgraph=dg)
 for k in keys:k.value=0
 base=evaluate();values={}
 for name in names[1:]:
  keys[name].value=1;d=evaluate();values[name]=[v.co.copy() for v in d.vertices];bpy.data.meshes.remove(d);keys[name].value=0
 o.modifiers.remove(sub);o.data=base;o.shape_key_add(name='Basis')
 for name,points in values.items():
  k=o.shape_key_add(name=name)
  for v,p in zip(k.data,points):v.co=p
summary={}
for who in ['Student','Business','City']:
 stem=f'CT_{who}_Explore_v10';bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')),load_ui=False,use_scripts=False);scene=bpy.context.scene;root=bpy.data.objects[stem];members=[root,*root.children_recursive]
 if root.get('v10_finalized'):raise RuntimeError('This master was already finalized; do not compound the sculpt.')
 # Make the cloth fibre reflect its own colour instead of a white sheen wash.
 for m in bpy.data.materials:
  if not m.use_nodes:continue
  p=m.node_tree.nodes.get('Principled BSDF')
  if p and p.inputs['Sheen Weight'].default_value>0:
   p.inputs['Sheen Weight'].default_value=.025 if who=='Business' else .05
   p.inputs['Sheen Tint'].default_value=(.08,.10,.13,1) if who=='Business' else (.35,.28,.38,1)
 # A small amount of optical detail comes from the source iris, recoloured
 # only in its saturated coloured regions, leaving pupil and sclera intact.
 for eye in [o for o in members if o.type=='MESH' and o.name.endswith('_eyes')]:
  mat=eye.data.materials[0].copy();eye.data.materials[0]=mat
  for node in mat.node_tree.nodes:
   if node.type!='TEX_IMAGE' or not node.image:continue
   im=node.image.copy();im.name='CT '+who+' hazel iris v10';w,h=im.size;px=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4);rgb=px[:,:,:3];lo=rgb.min(axis=2);hi=rgb.max(axis=2);mask=(hi-lo>.035)&(rgb[:,:,2]>rgb[:,:,0]*1.08);lum=np.maximum(.03,rgb.mean(axis=2));rgb[mask]=np.minimum(1,lum[mask,None]*np.array([1.9,1.04,.40]));im.pixels.foreach_set(px.ravel());im.pack();node.image=im
 for o in members:
  if o.type!='MESH' or o.hide_render:continue
  if o.name.endswith('_head'):
   # Apply the same shape-preserving sculpt to Basis and every expression.
   inverse=o.matrix_world.inverted()
   for k in o.data.shape_keys.key_blocks:
    if k.name=='Smile':
     for i,v in enumerate(k.data):v.co=o.data.vertices[i].co+(v.co-o.data.vertices[i].co)*1.65
    for v in k.data:v.co=inverse@face_sculpt(o.matrix_world@v.co,who)
   for i,v in enumerate(o.data.vertices):v.co=o.data.shape_keys.key_blocks['Basis'].data[i].co
  elif o.name.endswith('_eyebrows'):
   sets=[o.data.vertices]+[k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
   for values in sets:
    for sign in [-1,1]:
     vs=[v for v in values if (o.matrix_world@v.co).x*sign>0];center=sum((v.co for v in vs),Vector())/max(1,len(vs))
     for v in vs:v.co.z=center.z+(v.co.z-center.z)*.53
  if who=='Business' and 'hair_base' in o.name:
   inv=o.matrix_world.inverted()
   for v in o.data.vertices:
    p=o.matrix_world@v.co
    if p.z>1.645:p.z=1.645+(p.z-1.645)*.49;p.x+=.018*math.sin((p.z-1.645)*25)
    v.co=inv@p
  if who=='City' and '_hair_ponytail' in o.name:o.hide_render=True
  if who=='City' and o.name=='V10 dark high-neck insert':o.hide_render=True
  if who=='City' and o.name=='V10 charcoal pleated underdress':
   for v in o.data.vertices:
    t=max(0,min(1,(v.co.z-.72)/.15));v.co.x*=1-.20*t;v.co.y*=1-.22*t
 if who=='City':
  black=bpy.data.materials['V10 forest charcoal silk'];verts=[];faces=[];N=48
  for z,rx,ry in [(1.11,.13,.105),(1.28,.13,.11),(1.36,.07,.052),(1.41,.053,.045),(1.44,.053,.045)]:
   for k in range(N):a=k/N*math.tau;verts.append((rx*math.cos(a),ry*math.sin(a)-.022,z))
  for j in range(4):
   for k in range(N):a=j*N+k;b=j*N+(k+1)%N;faces.append((a,b,b+N,a+N))
  mesh('V10 fitted high-neck underlayer',verts,faces,black,bpy.data.objects['Breath'])
 # Apply cloth thickness and rounded-edge modifiers only on non-expression
 # pieces; glTF keeps the baked expression deltas untouched.
 for o in list(root.children_recursive):
  if o.hide_render or o.type not in ['MESH','CURVE']:continue
  if o.type=='CURVE':
   bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
  if o.data.shape_keys:continue
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):
   if mod.type in ['BEVEL','WEIGHTED_NORMAL','SOLIDIFY','SUBSURF']:
    try:bpy.ops.object.modifier_apply(modifier=mod.name)
    except RuntimeError:pass
 root['v10_finalized']=True
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 combine_static(root);export(root,stem)
 standard_bytes=(OUT/(stem+'.glb')).stat().st_size
 # Standard is the default; retain true expressions at every quality level.
 meshes=[o for o in root.children_recursive if o.type=='MESH' and not o.hide_render]
 standard_data={o:o.data.copy() for o in meshes}
 for o in meshes:
  if o.data.shape_keys and o.name.endswith('_head'):subdivide_morph(o)
 export(root,stem+'-portrait')
 for o,d in standard_data.items():o.data=d
 for o in meshes:
  if o.data.shape_keys or o.name.startswith('V3 rounded sleeve shoulder') or len(o.data.polygons)<400:continue
  bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Lightweight interactive distance','DECIMATE');dec.ratio=.34;bpy.ops.object.modifier_apply(modifier=dec.name)
 export(root,stem+'-lite')
 info=json.loads((OUT/(stem+'.sources.json')).read_text());info.update(finalized=True,tiers={'standard':standard_bytes,'portrait':(OUT/(stem+'-portrait.glb')).stat().st_size,'lite':(OUT/(stem+'-lite.glb')).stat().st_size},status='pending browser visual acceptance');(OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2));summary[who]=info['tiers'];print('V10_FINALIZED',who,info['tiers'],flush=True)
(E/'tiers.json').write_text(json.dumps(summary,indent=2))
