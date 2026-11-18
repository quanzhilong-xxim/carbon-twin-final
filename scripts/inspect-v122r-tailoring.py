import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];out=[]
for role,rev in [('Student','v122q'),('Business','v122r'),('City','v122r')]:
 bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v12-candidate/CT_{role}_Explore_{rev}.blend'),load_ui=False,use_scripts=False)
 meshes=[]
 for o in bpy.data.objects:
  if o.type!='MESH' or not any(s in o.name.lower() for s in ['hair','bomber','sleeve','body','collar','neck','head','rain','snow']):continue
  points=[o.matrix_world@v.co for v in o.data.vertices]
  meshes.append(dict(name=o.name,hidden=o.hide_render,parent=o.parent.name if o.parent else None,vertices=len(points),bounds=[[min(p[i]for p in points)for i in range(3)],[max(p[i]for p in points)for i in range(3)]] if points else None,materials=[m.name if m else None for m in o.data.materials],modifiers=[dict(type=m.type,name=m.name)for m in o.modifiers]))
 rig=bpy.data.objects[f'CT_{role}_Explore_{rev}' if role=='Student' else 'CT_Humanoid']
 bones=[dict(name=b.name,head=list(b.head_local),tail=list(b.tail_local),matrix=[list(row)for row in b.matrix_local])for b in rig.data.bones if ('Hand'in b.name or 'Arm'in b.name or 'Chest'in b.name or 'Neck'in b.name)]
 out.append(dict(role=role,meshes=meshes,bones=bones))
(R/'outputs/v122/r-tailoring-inspection.json').write_text(json.dumps(out,indent=2));print('TAILORING_INSPECTED',flush=True)
