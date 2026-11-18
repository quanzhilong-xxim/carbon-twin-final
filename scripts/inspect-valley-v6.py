import bpy,json
from mathutils import Vector
from pathlib import Path
bpy.ops.wm.open_mainfile(filepath='D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/chapter-scenes-v6/valley-v6.blend',load_ui=False,use_scripts=False)
items=[]
for o in bpy.context.scene.objects:
 if o.hide_render or not o.name.startswith(('Distant forest ridge','Forested hillside','Terrain-rooted','CC0 park tree','Glazed public room','Wind energy tower')):continue
 pts=[o.matrix_world@Vector(v) for v in o.bound_box]
 items.append({'name':o.name,'location':list(o.location),'matrix_translation':list(o.matrix_world.translation),'scale':list(o.scale),'materials':[m.name for m in o.data.materials] if o.type=='MESH' else [],'min':[min(p[i] for p in pts) for i in range(3)],'max':[max(p[i] for p in pts) for i in range(3)]})
Path('C:/Users/23242/Desktop/CarbonTwin_App/outputs/v10-explore/valley-v6-inspection.json').write_text(json.dumps(items,indent=2))
print('VALLEY_INSPECTED',len(items))
