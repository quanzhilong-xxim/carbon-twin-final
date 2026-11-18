import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
report=[]
for label,path in [('snow',Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/snow-v2/extracted/snow_v02.blend')),('rain',Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/rain-v2/extracted/rain_rig.blend')),('Business',R/'public/models/characters-v10/CT_Business_Explore_v11e.blend'),('City',R/'public/models/characters-v10/CT_City_Explore_v11e.blend')]:
 bpy.ops.wm.open_mainfile(filepath=str(path),load_ui=False,use_scripts=False)
 rows=[]
 for o in bpy.data.objects:
  if o.type!='MESH' or not len(o.data.vertices):continue
  if label in ['Business','City'] and not any(s in o.name.lower()for s in ['head','face','eye','ear','neck','nose','mouth','brow','hair','skin']):continue
  ps=[o.matrix_world@v.co for v in o.data.vertices]
  rows.append({'name':o.name,'vertices':len(ps),'polygons':len(o.data.polygons),'hidden':o.hide_render,'parent':o.parent.name if o.parent else None,'bounds':[[round(min(p[k]for p in ps),5),round(max(p[k]for p in ps),5)]for k in range(3)],'materials':[m.name for m in o.data.materials if m],'shapeKeys':[k.name for k in o.data.shape_keys.key_blocks]if o.data.shape_keys else [],'modifiers':[{'name':m.name,'type':m.type}for m in o.modifiers]})
 report.append({'label':label,'path':str(path),'objects':rows})
out=R/'work/v11f-adult-source-inspection.json';out.parent.mkdir(exist_ok=True);out.write_text(json.dumps(report,indent=2),encoding='utf8');print(str(out),flush=True)
