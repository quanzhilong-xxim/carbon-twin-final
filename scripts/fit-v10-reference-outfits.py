"""Correct two silhouettes identified in exported-model inspection frames.
Only the current V10 study is changed. Original V1-V9 sources stay untouched.
"""
import bpy,bmesh,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v10';bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')),load_ui=False,use_scripts=False);root=bpy.data.objects[stem]
 if root.get('reference_outfit_fit'):raise RuntimeError('Reference fit already applied')
 if who=='Business':
  hair=next(o for o in root.children_recursive if o.type=='MESH' and 'hair_base' in o.name)
  inverse=hair.matrix_world.inverted()
  for v in hair.data.vertices:
   p=hair.matrix_world@v.co
   if p.z>1.645:
    # Undo the previous over-compression before fitting above the skull.
    p.x-=.018*math.sin((p.z-1.645)*25);p.z=1.645+(p.z-1.645)/.49
   if p.z>1.70:p.z=1.70+(p.z-1.70)*.60
   v.co=inverse@p
  fibres=next(o for o in root.children_recursive if o.name=='V10 fine hair silhouettes')
  inv=fibres.matrix_world.inverted()
  for v in fibres.data.vertices:
   p=fibres.matrix_world@v.co
   if p.z>1.70:p.z=1.70+(p.z-1.70)*.60
   v.co=inv@p
  shirt=bpy.data.objects['Shirt front'];inv=shirt.matrix_world.inverted()
  for v in shirt.data.vertices:
   p=shirt.matrix_world@v.co;t=max(0,min(1,(p.z-1.09)/.31));p.x*=.24+.76*t;p.z=1.18+(p.z-1.09)*.73;v.co=inv@p
 else:
  jacket=bpy.data.objects['Fitted tailored jacket'];bm=bmesh.new();bm.from_mesh(jacket.data)
  cut=[]
  for f in bm.faces:
   p=jacket.matrix_world@f.calc_center_median();half=.027+.062*max(0,min(1,(p.z-1.10)/.30))
   if p.y<-.065 and 1.10<p.z<1.42 and abs(p.x)<half:cut.append(f)
  bmesh.ops.delete(bm,geom=cut,context='FACES');bm.to_mesh(jacket.data);bm.free()
 root['reference_outfit_fit']=True;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')));print('REFERENCE_OUTFIT_FIT',who,flush=True)
