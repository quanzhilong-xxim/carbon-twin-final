"""Repair isolated V11f review findings without overwriting that candidate."""
import bpy,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
exec(compile((R/'scripts/refine-v104e-face-and-cargo.py').read_text().split("for who in ['Student','Business','City']:")[0],__file__,'exec'))

for who,source in [('Business','snow'),('City','rain')]:
 stem=f'CT_{who}_Explore_v11g'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v11f.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v11f'];root.name=stem;head=bpy.data.objects[f'Source / GEO-{source}_head']
 skin=head.data.materials[0].copy();skin.name='V11g '+who+' native continuous skin';head.data.materials[0]=skin
 p=skin.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.64;p.inputs['Specular IOR Level'].default_value=.24
 fixes=[]
 if who=='Business':
  # Snow's retained UV map crosses U=1 because of its mirrored atlas. Sample
  # the same REPEAT addressing that the image shader uses, never edge clamp.
  source_image=bpy.data.images.load(str(OUT/'CT_Business_Complexion_v104e.png'),check_existing=False)
  w,h=source_image.size;rgba=np.array(source_image.pixels[:],np.float32).reshape(h,w,4);uv=head.data.uv_layers.get('UVMap');samples=[]
  for face in head.data.polygons:
   for li in face.loop_indices:
    point=head.matrix_world@head.data.vertices[head.data.loops[li].vertex_index].co
    if not(.028<abs(point.x)<.078 and 1.134<point.z<1.189 and point.y<-.075):continue
    u,v=uv.data[li].uv;value=rgba[int((v%1)*h)%h,int((u%1)*w)%w,:3]
    if min(value)>.08:samples.append(value)
  if not samples:raise RuntimeError('No valid repeated-atlas cheek sample')
  median=np.median(samples,axis=0);target=np.array([.847,.706,.603]);ratio=target/np.maximum(median,.05)
  rgba[:,:,:3]=np.clip(rgba[:,:,:3]*ratio,0,1)
  adjusted=bpy.data.images.new('V11g Business repeat-corrected native complexion',width=w,height=h,alpha=True)
  adjusted.pixels.foreach_set(rgba.ravel());adjusted.pack()
  node=next(n for n in skin.node_tree.nodes if n.type=='TEX_IMAGE'and n.image and any(l.to_socket==p.inputs['Base Color']for l in n.outputs['Color'].links));node.image=adjusted;node.extension='REPEAT'
  removed=[]
  for o in root.children_recursive:
   if o.type=='MESH'and not o.hide_render and o.name.startswith('V11e scalp attached individual fibre'):
    o.hide_render=True;removed.append(o.name)
  fixes+=['Corrected Snow mirrored/repeating UV sampling; rebuilt PBR complexion from retained original painted face PNG, preserving lips and warm complexion.',f'Removed {len(removed)} fine fibres from the previous scalp fit that crossed the native forehead.']
  colour_evidence={'source_cheek_srgb':list(map(float,median)),'target_srgb':target.tolist(),'ratio':ratio.tolist(),'uv_addressing':'REPEAT'}
 else:
  # Lower the upper lid 25% of its distance from the aperture centre, with a
  # smooth falloff over the socket. Eyeballs retain their volume and position.
  def softer_lid(v):
   v=v.copy();eye=1.588
   weight=math.exp(-((abs(v.x)-.054)/.040)**4-((v.z-eye)/.042)**4)*max(0,min(1,(-v.y-.070)/.040))
   if v.z>eye:v.z-=.25*(v.z-eye)*weight
   return v
  for o in root.children_recursive:
   if o.type=='MESH'and not o.hide_render and o.name.startswith('Source / GEO-rain_')and o.name.endswith(('_head','_eyelashes')):deform(o,softer_lid)
  # Relax only the small nasal-wing / columella region. The rest of the nose,
  # lips, cheeks and morph deltas retain the native continuous topology.
  adjacent=[set()for _ in head.data.vertices]
  for edge in head.data.edges:
   a,b=edge.vertices;adjacent[a].add(b);adjacent[b].add(a)
  inv=head.matrix_world.inverted();base=[head.matrix_world@v.co for v in head.data.vertices]
  weights=[.55*math.exp(-(v.x/.026)**4-((v.z-1.518)/.023)**4)*max(0,min(1,(-v.y-.115)/.025))for v in base]
  for key in head.data.shape_keys.key_blocks:
   coords=[head.matrix_world@v.co for v in key.data]
   for _ in range(5):
    prior=coords;coords=[v.lerp(sum((prior[j]for j in adjacent[i]),Vector())/len(adjacent[i]),weights[i])if weights[i]>.001 and adjacent[i]else v for i,v in enumerate(prior)]
   for v,point in zip(key.data,coords):v.co=inv@point
  for v,b in zip(head.data.vertices,head.data.shape_keys.key_blocks[0].data):v.co=b.co
  for o in root.children_recursive:
   if o.type=='MESH'and not o.hide_render and o.name.endswith('_eyes'):
    for i,m in enumerate(o.data.materials):
     m=m.copy();m.name='V11g softened native civic eye';o.data.materials[i]=m
     shader=m.node_tree.nodes.get('Principled BSDF')if m.use_nodes else None
     if shader:shader.inputs['Roughness'].default_value=.29;shader.inputs['Specular IOR Level'].default_value=.28
  fixes+=['Lowered native upper eyelid and matching eyelash geometry by up to25% of upper aperture distance; preserved full eyeballs and all facial targets.','Five constrained relaxation passes soften pointed nasal wings/columella without adding separate nose geometry.','Softer PBR iris reflection; native eye placement and six expression targets retained.']
  colour_evidence={'preserved_from':'v11f City native complexion'}
 root['v11g_review_fixes']=json.dumps(fixes)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH'or o.hide_render or o.data.shape_keys or len(o.data.polygons)<1000:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
  try:bpy.ops.object.modifier_apply(modifier=mod.name)
  except RuntimeError:o.modifiers.remove(mod)
 export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_v11f.sources.json').read_text());record.update(version='v11g',parent_version='v11f',paid_calls=0,status='isolated review candidate; default assets not changed',v11g_fixes=fixes,complexion_evidence=colour_evidence)
 record.setdefault('refinements',[]).extend(fixes);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in sorted(OUT.glob(stem+'*.glb'))]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8');print('V11G_EXPORTED',who,flush=True)
