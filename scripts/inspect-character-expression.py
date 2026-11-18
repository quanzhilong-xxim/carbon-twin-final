"""Read retained masters and facial controls; never save or execute embedded scripts."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
report={}
for who,version in [('Student',6),('Business',9),('City',9)]:
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'public/models/characters-v10/CT_{who}_Explore_v{version}.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v{version}'];members=[root,*root.children_recursive]
 meshes=[]
 for o in members:
  if o.type!='MESH' or o.hide_render:continue
  ps=[o.matrix_world@v.co for v in o.data.vertices]
  meshes.append({'name':o.name,'verts':len(ps),'polygons':len(o.data.polygons),'bounds':[[min(p[i] for p in ps),max(p[i] for p in ps)] for i in range(3)] if ps else [],'materials':[m.name for m in o.data.materials if m],'uv':bool(o.data.uv_layers),'keys':list(o.data.shape_keys.key_blocks.keys()) if o.data.shape_keys else []})
 rig=bpy.data.objects.get('RIG-Snow' if who=='Business' else 'RIG-rain')
 controls=[]
 if rig:
  for b in rig.pose.bones:
   if any(k in b.name.lower() for k in ['blink','lid','smile','mouth','look','eye','brow']) and not b.name.startswith(('DEF-','MCH-','STR-','ORG-')):
    controls.append({'name':b.name,'location':list(b.location),'rotation':list(b.rotation_euler),'properties':{k:str(v) for k,v in b.items()}})
 report[who]={'meshes':meshes,'controls':controls,'rig':rig.name if rig else None,'source_heads':[{'name':o.name,'verts':len(o.data.vertices),'mods':[(m.name,m.type) for m in o.modifiers]} for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('GEO-') and 'head' in o.name]}
(ROOT/'outputs/v10-explore/expression-inventory.json').write_text(json.dumps(report,indent=2))
print('EXPRESSION_INVENTORY_READY',flush=True)
