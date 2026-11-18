"""Read-only background inspection of existing apparel and humanoid rest pose."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'public/models/characters-v10/CT_Student_Explore_v105.blend'),load_ui=False,use_scripts=False)
rig=bpy.data.objects['Root']
print('BONES',json.dumps([{ 'name':b.name,'head':list(rig.matrix_world@b.head_local),'tail':list(rig.matrix_world@b.tail_local)} for b in rig.data.bones if b.name.startswith('J_Bip_') and any(s in b.name for s in ['UpperArm','LowerArm','UpperLeg','LowerLeg','Hips','Spine','Head'])]))
before=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/characters-v10/CT_Student_Explore_v104g.glb'))
report=[]
for o in set(bpy.context.scene.objects)-before:
 if o.type!='MESH':continue
 if any(s in o.name for s in ['Head','skin','eyelash','skateboard']):continue
 pts=[o.matrix_world@Vector(c) for c in o.bound_box]
 report.append({'name':o.name,'parent':o.parent.name if o.parent else None,'props':dict(o.items()),'bounds':[[round(min(p[i] for p in pts),3),round(max(p[i] for p in pts),3)]for i in range(3)],'vertices':len(o.data.vertices),'materials':[m.name if m else '' for m in o.data.materials]})
print('APPAREL',json.dumps(report))
