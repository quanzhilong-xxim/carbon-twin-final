"""Isolated native Snow/Rain adult head candidate. Does not register defaults.
Uses retained CC BY 4.0 head topology, native eye sockets and six morphs, rather
than adapting the student's face a second time. No service calls or live UI.
"""
import bpy,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
exec(compile((R/'scripts/refine-v104e-face-and-cargo.py').read_text().split("for who in ['Student','Business','City']:")[0],__file__,'exec'))

for who,source in [('Business','snow'),('City','rain')]:
 stem=f'CT_{who}_Explore_v11f'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve existing candidate '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v11e.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v11e'];root.name=stem
 head=bpy.data.objects[f'Source / GEO-{source}_head'];eye=1.204 if who=='Business'else 1.588
 hidden=[];native=[]
 for o in root.children_recursive:
  if o.type!='MESH':continue
  if o.name.startswith((f'V108l distinct {who} anime face','V108l retained anatomical ears','V108r continuous anatomical neck')):
   o.hide_render=True;hidden.append(o.name)
  if o.name.startswith(f'Source / GEO-{source}_')and o.name.endswith(('_head','_eyes','_eyebrows','_eyelashes')):
   o.hide_render=False;o.hide_set(False);native.append(o)
 def sculpt(p):
  p=p.copy();front=max(0,min(1,(-p.y-.055)/.050))
  if who=='Business':
   p.x*=1+.055*math.exp(-((p.z-(eye-.100))/.040)**2)*front
   p.y-=.004*math.exp(-(p.x/.024)**2-((p.z-(eye-.046))/.030)**2)*front
   p.y-=.0025*math.exp(-((abs(p.x)-.053)/.025)**2-((p.z-(eye-.025))/.023)**2)*front
   if p.z>1.28:p.z=1.28+(p.z-1.28)*.57
  else:
   p.x*=1+.025*math.exp(-((p.z-(eye-.075))/.035)**2)*front
   p.y-=.002*math.exp(-(p.x/.022)**2-((p.z-(eye-.049))/.029)**2)*front
   if p.z>1.68:p.z=1.68+(p.z-1.68)*.75
  return p
 deform(head,sculpt)
 old=head.data.materials[0];skin=old.copy();skin.name='V11f '+who+' native continuous skin';head.data.materials[0]=skin
 p=skin.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.60;p.inputs['Specular IOR Level'].default_value=.27
 for socket in ['Normal','Roughness']:
  for l in list(p.inputs[socket].links):skin.node_tree.links.remove(l)
 node=next((n for n in skin.node_tree.nodes if n.type=='TEX_IMAGE'and n.image and any(l.to_socket==p.inputs['Base Color']for l in n.outputs['Color'].links)),None)
 complexion={}
 if node:
  image=node.image;w,h=image.size;rgba=np.array(image.pixels[:],np.float32).reshape(h,w,4);uv=head.data.uv_layers.active;samples=[]
  for face in head.data.polygons:
   for li in face.loop_indices:
    point=head.matrix_world@head.data.vertices[head.data.loops[li].vertex_index].co
    if not(.028<abs(point.x)<.078 and eye-.07<point.z<eye-.015 and point.y<-.075):continue
    u,v=uv.data[li].uv;samples.append(rgba[min(h-1,max(0,int(v*h))),min(w-1,max(0,int(u*w))),:3])
  median=np.median(samples,axis=0)if samples else np.median(rgba[:,:,:3].reshape(-1,3),axis=0)
  target=np.array([.847,.706,.603]if who=='Business'else[.912,.782,.693]);rgb=rgba[:,:,:3];ratio=target/np.maximum(median,.05)
  rgb[:]=np.clip(rgb*ratio,0,1)
  # Keep licensed lip/cheek colour while attenuating only the mottled source
  # paint. The anatomy and native eyelids supply the facial structure.
  low=rgb.copy()
  for axis in [0,1]:low=sum(np.roll(low,i,axis=axis)for i in range(-2,3))/5
  rgb[:]=rgb*.45+low*.55
  adjusted=bpy.data.images.new('V11f '+who+' native complexion',width=w,height=h,alpha=True)
  adjusted.pixels.foreach_set(rgba.ravel());adjusted.pack();node.image=adjusted
  complexion={'source_median':list(map(float,median)),'target_srgb':target.tolist(),'ratio':ratio.tolist()}
 # Continuous head/ears/neck replace separately tinted face fragments. Keep
 # existing six player morphs and the fitted groom, suit, coat and accessories.
 for o in native:
  if o.name.endswith('_eyebrows'):
   for i,m in enumerate(o.data.materials):
    if not m:continue
    m=m.copy();m.name='V11f '+who+' natural brow';o.data.materials[i]=m
    p=m.node_tree.nodes.get('Principled BSDF')if m.use_nodes else None
    if p:p.inputs['Base Color'].default_value=(.055,.024,.014,1);p.inputs['Roughness'].default_value=.72
  for face in o.data.polygons:face.use_smooth=True
 # One subdivision preserves every morph and improves eyelid/lip silhouettes.
 subdivide_morph(head)
 changes=['Restored distinct Blender Foundation '+source+' native head, eyes, brows and original six expressions; student face hidden as a retained reversible source.','Continuous native head, ears and neck; individually fitted upper cranium under existing groom.','Subtle adult-specific jaw, cheekbone and nasal bridge sculpt applied identically to all shape targets.','Retained original face UV/lip colour with a cheek-sampled neutral complexion correction; no paid calls.']
 root['v11f_native_head_refinements']=json.dumps(changes)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH'or o.hide_render or o.data.shape_keys or len(o.data.polygons)<1000:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
  try:bpy.ops.object.modifier_apply(modifier=mod.name)
  except RuntimeError:o.modifiers.remove(mod)
 export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_v11e.sources.json').read_text());record.update(version='v11f',parent_version='v11e',paid_calls=0,status='isolated native adult head candidate; browser visual comparison pending',native_head={'source':source,'license':'CC BY 4.0','credit':'Blender Foundation','restored_meshes':[o.name for o in native],'hidden_previous_meshes':hidden,'complexion':complexion})
 record.setdefault('refinements',[]).extend(changes)
 record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in sorted(OUT.glob(stem+'*.glb'))]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V11F_NATIVE_EXPORTED',who,flush=True)
