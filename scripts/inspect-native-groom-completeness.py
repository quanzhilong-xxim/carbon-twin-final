import bpy,json
from pathlib import Path
paths={'Business':'D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/snow-v2/extracted/snow_v02.blend','City':'D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/rain-v2/extracted/rain_rig.blend'}
rows=[]
for role,path in paths.items():
 bpy.ops.wm.open_mainfile(filepath=path,load_ui=False,use_scripts=False)
 for o in bpy.data.objects:
  if not any(x in o.name.lower() for x in ['hair','groom','strand','fringe']):continue
  rows.append({'role':role,'name':o.name,'type':o.type,'hidden':o.hide_render,'parent':o.parent.name if o.parent else None,'modifiers':[(m.name,m.type) for m in o.modifiers],'particles':[{'name':p.name,'type':p.settings.type,'count':p.settings.count,'child':p.settings.rendered_child_count,'length':p.settings.hair_length} for p in getattr(o,'particle_systems',[])],'materials':[m.name for m in getattr(o.data,'materials',[]) if m]})
print(json.dumps(rows,indent=2));out=Path(__file__).resolve().parents[1]/'outputs/v122/material-inspection/native-grooms.json';out.write_text(json.dumps(rows,indent=2))
