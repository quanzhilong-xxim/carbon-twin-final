"""Reuse the licensed, expression-ready anime topology already in the project.
Adult-specific proportions are sculpted locally; H masters remain unchanged.
"""
import bpy,bmesh,math,json,hashlib,struct
from pathlib import Path
from mathutils import Vector,Matrix
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
donor=OUT/'CT_Student_Explore_v108e.blend'

def finish_glb(file):
 b=file.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n])
 for m in g.get('materials',[]):
  if not m.get('name','').startswith('V108i anime'):continue
  if 'extensions' in m:
   m['extensions'].pop('KHR_materials_unlit',None)
   if not m['extensions']:del m['extensions']
  p=m.setdefault('pbrMetallicRoughness',{});p['metallicFactor']=0;p['roughnessFactor']=.68
  if 'Face_00_SKIN' in m['name']:p['baseColorFactor']=[.85,.68,.58,1]
 g.setdefault('asset',{}).setdefault('extras',{})['v108i']='locally adapted licensed anime topology, facial morphs retained; not a remote AI generation'
 j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);tail=b[20+n:];file.write_bytes(struct.pack('<4sIII4s',b'glTF',2,20+len(j)+len(tail),len(j),b'JSON')+j+tail)

for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v108i'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Existing candidate preserved '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v108h.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v108h'];root.name=stem;pivot=bpy.data.objects['Head']
 old=bpy.data.objects['Source / GEO-snow_head' if who=='Business' else 'Source / GEO-rain_head']
 # Keep the old ears as real geometry, while hiding the incompatible face,
 # eyeballs, eyebrows and lashes together. No double eyes or face z fighting.
 ears=old.copy();ears.data=old.data.copy();ears.name='V108i retained anatomical ears';bpy.context.scene.collection.objects.link(ears)
 if ears.data.shape_keys:ears.shape_key_clear()
 bm=bmesh.new();bm.from_mesh(ears.data);remove=[f for f in bm.faces if abs((ears.matrix_world@f.calc_center_median()).x)<(.105 if who=='City' else .098)];bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(ears.data);bm.free()
 for o in root.children_recursive:
  if o.type=='MESH' and (o.name==old.name or o.name.endswith(('_eyes','_eyebrows','_eyelashes'))):o.hide_render=True
 parent(ears,pivot)
 with bpy.data.libraries.load(str(donor),link=False)as(src,dst):dst.objects=['Face']
 face=dst.objects[0];bpy.context.scene.collection.objects.link(face);bpy.context.view_layer.update();world=face.matrix_world.copy()
 face.parent=None;face.matrix_world=Matrix.Identity(4);face.name='V108i distinct '+who+' anime face'
 for mod in list(face.modifiers):face.modifiers.remove(mod)
 face.vertex_groups.clear()
 eye=1.20 if who=='Business' else 1.588
 def adapt(p):
  p=p.copy();p.x*=1.12 if who=='Business' else 1.09;p.y=p.y*1.35-.040;p.z=eye+(p.z-1.480)*1.17
  # Different facial identities, not three versions of the same student.
  eye_w=math.exp(-((abs(p.x)-.048)/.043)**4-((p.z-eye)/.045)**4)
  p.z=eye+(p.z-eye)*(1-(.24 if who=='Business' else .09)*eye_w)
  jaw=math.exp(-((p.z-(eye-.115))/.05)**2);p.x*=1+(.20 if who=='Business' else .035)*jaw
  if who=='Business':
   p.y-=.004*math.exp(-(p.x/.022)**4-((p.z-(eye-.053))/.025)**2)
  return p
 keys=face.data.shape_keys
 for k in keys.key_blocks:
  for v in k.data:v.co=adapt(world@v.co)
 for v,k in zip(face.data.vertices,keys.key_blocks[0].data):v.co=k.co
 # Reuse the player's established expression names; source morphs stay in the
 # editable mesh as well, so no facial topology or animation data is lost.
 close=next((k for k in keys.key_blocks if k.name.endswith('Fcl_EYE_Close')),None)
 joy=next((k for k in keys.key_blocks if k.name.endswith('Fcl_MTH_Joy')),None)
 if close:
  for side in ['Left','Right']:
   k=face.shape_key_add(name='Blink'+side)
   for v,b,c in zip(k.data,keys.key_blocks[0].data,close.data):v.co=b.co+(c.co-b.co)*(1 if (b.co.x<0)==(side=='Left') else 0)
 if joy:
  k=face.shape_key_add(name='Smile')
  for v,b,j in zip(k.data,keys.key_blocks[0].data,joy.data):v.co=b.co+(j.co-b.co)*.42
 for i,m in enumerate(face.data.materials):
  m=m.copy();m.name='V108i anime '+who+' '+m.name;face.data.materials[i]=m
 parent(face,pivot)
 root['v108i_source']='pixiv Inc. VRM1 Constraint Twist Sample, VRM Public License 1.0; adult-specific sculpt and expression remap, retained Blender Foundation ears; previous head retained hidden'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 combine_static(root);export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.55;bpy.ops.object.modifier_apply(modifier=mod.name)
 export(root,stem+'-lite')
 for f in OUT.glob(stem+'*.glb'):finish_glb(f)
 record=json.loads((OUT/f'CT_{who}_Explore_v108h.sources.json').read_text());record.update(version='v108i',parent_version='v108h',paid_calls=0,status='isolated visual evaluation; not accepted');record['refinements']+=[root['v108i_source']];record['additional_source']=json.loads((OUT/'CT_Student_Explore_v108e.sources.json').read_text())['source_metadata']
 record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('ANIME_PORTRAIT_EXPORTED',who,flush=True)
