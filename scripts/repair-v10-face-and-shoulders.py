"""Restore only the reviewed face surface, then close sleeves continuously.
Uses the verified pre-polish checkpoint; no project-wide restore or deletion.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
CP=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/RESUME-DELTA-2026-11-08T17-55-23-028Z')
manifest=json.loads((CP/'manifest.json').read_text())['files']
for who in ['Student','Business','City']:
 stem=f'CT_{who}_Explore_v10';bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')),load_ui=False,use_scripts=False);root=bpy.data.objects[stem]
 if root.get('sleeve_cap_repaired'):raise RuntimeError('Already repaired')
 rel=f'public/models/characters-v10/{stem}.blend';entry=next(x for x in manifest if x['file']==rel);saved=Path(entry['source'])/'files'/rel
 names=[o.name for o in root.children_recursive if o.type=='MESH' and o.name.endswith('_head')]
 if who=='Business':names += ['Folded poplin collar','Folded poplin collar.001']
 current={name:bpy.data.objects[name] for name in names};expected=tuple(names)
 with bpy.data.libraries.load(str(saved),link=False) as (source,target):target.objects=list(expected)
 for old in target.objects:
  if old is None:raise RuntimeError('Required checkpoint mesh missing')
  # Library names may get .001 suffixes; match in the same requested order.
 for name,old in zip(expected,target.objects):
  obj=current[name];obj.data=old.data.copy()
  if who=='Business' and name.startswith('Folded poplin collar'):
   inv=obj.matrix_world.inverted()
   for v in obj.data.vertices:
    p=obj.matrix_world@v.co;p.x*=.88;p.z=1.40+(p.z-1.40)*.87;v.co=inv@p
 for side in ['ArmRight','ArmLeft']:
  arm=bpy.data.objects[side];sleeve=next(o for o in arm.children if o.type=='MESH' and o.name.startswith('Fitted sleeve'))
  cap=next(o for o in arm.children if o.type=='MESH' and o.name.startswith('V3 rounded sleeve shoulder'))
  N=32;ring=[sleeve.matrix_world@sleeve.data.vertices[i].co for i in range(N)]
  center=sum(ring,Vector())/N;next_center=sum((sleeve.matrix_world@sleeve.data.vertices[N+i].co for i in range(N)),Vector())/N;up=(center-next_center).normalized()
  points=[];faces=[];R=8
  for j in range(R):
   t=j/(R-1)*math.pi/2
   for p in ring:points.append(center+(p-center)*math.cos(t)+up*.053*math.sin(t))
  inv=cap.matrix_world.inverted();data=bpy.data.meshes.new('V10 continuous domed sleeve cap');data.from_pydata([inv@p for p in points],[],[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k) for j in range(R-1) for k in range(N)])
  data.materials.append(sleeve.data.materials[0]);uv=data.uv_layers.new()
  for f in data.polygons:
   f.use_smooth=True
   for li in f.loop_indices:i=data.loops[li].vertex_index;uv.data[li].uv=((i%N)/N*6,-(i//N)/R)
  cap.data=data
 root['sleeve_cap_repaired']=True
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')));print('FACE_RESTORED_SLEEVE_CLOSED',who,flush=True)
