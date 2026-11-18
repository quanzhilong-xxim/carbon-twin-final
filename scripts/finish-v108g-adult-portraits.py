import bpy,bmesh,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v108g'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Already retained '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v108f.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v108f'];root.name=stem
 fixed=[]
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render:continue
  if o.name.startswith(('V108f continuous sculpted','V108f swept fitted')):
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();fixed.append(o.name)
  if who=='City' and any(o.name.endswith(k) for k in ['_head','_eyes','_eyelashes','_eyebrows']):
   inv=o.matrix_world.inverted();sets=[o.data.vertices]+([k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [])
   for vs in sets:
    for v in vs:
     p=o.matrix_world@v.co;cx=.055 if p.x>0 else -.055;z=1.588
     w=math.exp(-((p.x-cx)/.052)**4-((p.z-z)/.047)**4) if p.y<-.07 else 0
     p.x=cx+(p.x-cx)*(1-.075*w);p.z=z+(p.z-z)*(1-.11*w);v.co=inv@p
  if o.name.endswith('_eyes'):
   for mat in o.data.materials:
    if not mat or not mat.use_nodes:continue
    for node in mat.node_tree.nodes:
     if node.type!='TEX_IMAGE' or not node.image:continue
     im=node.image.copy();im.name='V108g '+who+' restrained hazel iris';px=np.array(im.pixels[:],np.float32).reshape(im.size[1],im.size[0],4);rgb=px[:,:,:3];mask=(rgb.max(2)-rgb.min(2)>.07)&(rgb[:,:,0]>rgb[:,:,2]*1.3)
     rgb[mask]*=np.array([.68,.73,.83]);im.pixels.foreach_set(px.ravel());im.pack();node.image=im
 root['v108g_finish']=json.dumps({'outward_groom_surfaces':len(fixed),'city_eye_region':'coordinated eyelids, eyeballs, brows and all morphs; gently reduced vertical aperture','iris':'retained texture with restrained hazel saturation'})
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 combine_static(root);export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Web LOD','DECIMATE');mod.ratio=.55;bpy.ops.object.modifier_apply(modifier=mod.name)
 export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_v108f.sources.json').read_text());record.update(version='v108g',parent_version='v108f',paid_calls=0,status='final visual acceptance pending');record['refinements']+=[root['v108g_finish']]
 record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in OUT.glob(stem+'*.glb')]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('ADULT_PORTRAIT_FINISHED',who,flush=True)
