"""Replace crossing neck panels with continuous fitted cloth; preserve M sources."""
import bpy,bmesh,math,json,hashlib,struct
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
def shell(name,rings,material,p,opening=0):
 n=96;vs=[];faces=[]
 for z,rx,ry,cy in rings:
  for k in range(n+1):
   a=-math.pi/2+opening+k/n*(math.tau-2*opening);vs.append((rx*math.cos(a),cy+ry*math.sin(a),z))
 for j in range(len(rings)-1):
  for k in range(n):q=j*(n+1)+k;faces.append((q,q+1,q+n+2,q+n+1))
 o=mesh(name,vs,faces,material,p);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 uv=o.data.uv_layers.new()
 for f in o.data.polygons:
  for li in f.loop_indices:
   i=o.data.loops[li].vertex_index;uv.data[li].uv=((i%(n+1))/n*2,(i//(n+1))/(len(rings)-1))
 bpy.context.view_layer.objects.active=o
 sub=o.modifiers.new('Continuous tailored surface','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
 solid=o.modifiers.new('Fabric edge thickness','SOLIDIFY');solid.thickness=.0015;bpy.ops.object.modifier_apply(modifier=solid.name)
 return o
def deform(o,fn):
 inv=o.matrix_world.inverted();arrays=[k.data for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else[o.data.vertices]
 for a in arrays:
  for v in a:v.co=inv@fn(o.matrix_world@v.co)
 if o.data.shape_keys:
  for v,b in zip(o.data.vertices,o.data.shape_keys.key_blocks[0].data):v.co=b.co
for who in ['Student','Business']:
 stem=f'CT_{who}_Explore_v108n'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve existing '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v108m.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v108m'];root.name=stem
 if who=='Student':
  for name in ['V108 continuous knit neckline','V108 explorer shoulder yoke','V108m continuous cargo pelvis']:bpy.data.objects[name].hide_render=True
  jersey=bpy.data.materials['CarbonTwin ivory ribbed inner jersey'];wool=bpy.data.materials['Original plum woven jacket.001']
  inner=shell('V108n continuous ivory neckline',[(1.19,.148,.095,.007),(1.24,.159,.082,.008),(1.27,.133,.063,.009),(1.30,.067,.042,.010),(1.323,.041,.036,.010)],jersey,root)
  outer=shell('V108n continuous explorer shoulder',[(1.223,.175,.122,.01),(1.25,.195,.113,.014),(1.275,.174,.098,.014),(1.30,.120,.068,.012),(1.322,.056,.046,.012)],wool,root,.38)
  for o in [inner,outer]:
   vg=o.vertex_groups.new(name='J_Bip_C_Chest');vg.add(list(range(len(o.data.vertices))),1,'REPLACE');arm=o.modifiers.new('Humanoid cloth weights','ARMATURE');arm.object=root
  sand=bpy.data.materials['V10 warm recycled cotton.003']
  shell('V108n fitted sand cargo hip',[(.745,.107,.118,.003),(.79,.139,.124,.003),(.85,.145,.122,.003),(.89,.134,.112,.003)],sand,root)
 else:
  # The previous M insert compressed a whole shirt and left a pinched collar.
  bpy.data.objects['V108c fitted continuous shirt'].hide_render=True
  for o in root.children_recursive:
   if 'rolled poplin collar' in o.name:o.hide_render=True
  poplin=bpy.data.materials['Cream cotton poplin'];body=bpy.data.objects['Breath']
  shell('V108n fitted shirt neck',[(1.005,.066,.056,-.003),(1.03,.060,.052,-.003),(1.064,.047,.043,-.003),(1.077,.044,.041,-.003)],poplin,body)
  face=bpy.data.objects['V108l distinct Business anime face']
  def mature(p):
   p=p.copy();w=math.exp(-((abs(p.x)-.052)/.044)**4-((p.z-1.20)/.043)**4);p.z=1.20+(p.z-1.20)*(1-.17*w)
   jaw=math.exp(-((p.z-1.095)/.045)**2);p.x*=1+.055*jaw
   return p
  deform(face,mature)
 root['v108n']='Local continuous cloth tailoring and adult eyelid/jaw refinement. Existing PBR textures, facial morphs, skeletons and props retained.'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 combine_static(root);export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.55
  try:bpy.ops.object.modifier_apply(modifier=mod.name)
  except RuntimeError:o.modifiers.remove(mod)
 export(root,stem+'-lite')
 if who=='Business':
  for file in OUT.glob(stem+'*.glb'):
   b=file.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n])
   for m in g.get('materials',[]):
    if 'anime' not in m.get('name',''):continue
    m.get('extensions',{}).pop('KHR_materials_unlit',None)
    if m.get('extensions')=={}:m.pop('extensions',None)
    p=m.setdefault('pbrMetallicRoughness',{});p.update(metallicFactor=0,roughnessFactor=.72)
    if 'Face_00_SKIN' in m['name']:p['baseColorFactor']=[.87,.72,.62,1]
   j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);tail=b[20+n:];file.write_bytes(struct.pack('<4sIII4s',b'glTF',2,20+len(j)+len(tail),len(j),b'JSON')+j+tail)
 record=json.loads((OUT/f'CT_{who}_Explore_v108m.sources.json').read_text());record.update(version='v108n',parent_version='v108m',paid_calls=0,status='integrated visual review pending');record['refinements'].append(root['v108n']);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('TAILORED',who,flush=True)
