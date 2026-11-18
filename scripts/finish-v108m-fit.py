"""Fit the integrated anime head and retained clothes. Earlier masters stay intact."""
import bpy,math,json,hashlib,struct
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))
def deform(o,fn):
 inv=o.matrix_world.inverted()
 arrays=[k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
 for a in arrays:
  for v in a:v.co=inv@fn(o.matrix_world@v.co)
 if o.data.shape_keys:
  for v,b in zip(o.data.vertices,o.data.shape_keys.key_blocks[0].data):v.co=b.co
def portable(file):
 b=file.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n])
 for m in g.get('materials',[]):
  if 'anime' not in m.get('name',''):continue
  m.get('extensions',{}).pop('KHR_materials_unlit',None)
  if m.get('extensions')=={}:m.pop('extensions',None)
  p=m.setdefault('pbrMetallicRoughness',{});p.update(metallicFactor=0,roughnessFactor=.72)
  if 'Face_00_SKIN' in m['name']:p['baseColorFactor']=[.87,.72,.62,1]
 j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);tail=b[20+n:];file.write_bytes(struct.pack('<4sIII4s',b'glTF',2,20+len(j)+len(tail),len(j),b'JSON')+j+tail)
for who in ['Student','Business','City']:
 rev='v108e' if who=='Student' else 'v108l';stem=f'CT_{who}_Explore_v108m'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Existing master preserved '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_{rev}.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects['Root' if who=='Student' else f'CT_{who}_Explore_{rev}'];root.name=stem
 if who=='Business':
  face=bpy.data.objects['V108l distinct Business anime face']
  def fit(p):
   p=p.copy()
   if p.z>1.27:
    t=min(1,(p.z-1.27)/.10);p.z=1.27+(p.z-1.27)*.70;p.x*=1-.07*t
   return p
  deform(face,fit)
  shirt=bpy.data.objects['V108c fitted continuous shirt']
  deform(shirt,lambda p:Vector((p.x*.33,p.y,p.z-.008)))
 if who=='Student':
  knit=bpy.data.objects['V108 continuous knit neckline']
  def trim(p):
   p=p.copy();t=max(0,min(1,(p.z-1.22)/.075));p.x*=1-.58*t;return p
  deform(knit,trim)
  yoke=bpy.data.objects['V108 explorer shoulder yoke']
  def shoulder(p):
   p=p.copy()
   if p.y<.015:p.y-=.055*max(0,min(1,(abs(p.x)-.04)/.045))
   return p
  deform(yoke,shoulder)
  # Match the existing cargo fabric, with a curved bridge between the two
  # fitted trouser legs rather than leaving a view through the pelvic seam.
  mat=next(m for m in bpy.data.materials if 'cargo' in m.name.lower() or 'sand' in m.name.lower())
  vs=[];fs=[];n=64
  for z,rx,ry in [(.735,.105,.084),(.78,.137,.100),(.85,.139,.103),(.89,.132,.101)]:
   for i in range(n):a=i/n*math.tau;vs.append((rx*math.cos(a),ry*math.sin(a)+.012,z))
  for j in range(3):
   for i in range(n):q=j*n+i;r=j*n+(i+1)%n;fs.append((q,r,r+n,q+n))
  mesh('V108m continuous cargo pelvis',vs,fs,mat,root)
 root['v108m']='Local fit correction: integrated head/groom clearance, restrained shirt insert, continuous explorer shoulders and cargo pelvis. No remote generation.'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 combine_static(root);export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Retained distance LOD','DECIMATE');mod.ratio=.55
  try:bpy.ops.object.modifier_apply(modifier=mod.name)
  except RuntimeError:o.modifiers.remove(mod)
 export(root,stem+'-lite')
 for f in OUT.glob(stem+'*.glb'):portable(f)
 record=json.loads((OUT/f'CT_{who}_Explore_{rev}.sources.json').read_text());record.update(version='v108m',parent_version=rev,paid_calls=0,status='integrated, visual review pending');record.setdefault('refinements',[]).append(root['v108m']);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('FITTED_AND_EXPORTED',who,flush=True)
