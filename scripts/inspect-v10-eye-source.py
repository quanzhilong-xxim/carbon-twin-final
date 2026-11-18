"""Inspect material slots/UVs before a localized eye correction."""
import bpy,json,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/v10-explore/characters-v10'
files={'current':ROOT/'public/models/characters-v10/CT_Business_Explore_v10.blend','prior':Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/RESUME-DELTA-2026-11-08T18-51-09-011Z/files/public/models/characters-v10/CT_Business_Explore_v10.blend'),'source':Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/snow-v2/extracted/snow_v02.blend')}
report={}
for tag,file in files.items():
 if not file.exists():continue
 bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False)
 items=[]
 for o in bpy.data.objects:
  if o.type!='MESH' or not ('eyes' in o.name.lower() or 'sclera' in o.name.lower()):continue
  mats=[]
  for m in o.data.materials:
   if not m:continue
   nodes=[]
   if m.use_nodes:
    for nd in m.node_tree.nodes:
     if nd.type=='TEX_IMAGE' and nd.image:
      src=nd.image;w,h=src.size
      if not w or not h or len(src.pixels)==0:continue
      im=bpy.data.images.new('Inspection',width=w,height=h,alpha=True);im.pixels.foreach_set(src.pixels[:]);im.filepath_raw=str(OUT/(tag+'-'+o.name.replace('/','-')+'-'+m.name.replace('/','-')+'.png'));im.file_format='PNG';im.save()
      px=list(src.pixels[:]);nodes.append({'node':nd.name,'image':src.name,'alpha_range':[min(px[3::4]),max(px[3::4])],'range':[min(px),max(px)],'links':[(l.to_node.name,l.to_socket.name) for l in nd.outputs['Color'].links]})
   mats.append({'name':m.name,'nodes':nodes})
  items.append({'name':o.name,'materials':mats,'indices':dict(collections.Counter(p.material_index for p in o.data.polygons)),'vertices':len(o.data.vertices),'uv':[[min(v.uv[i] for v in o.data.uv_layers.active.data),max(v.uv[i] for v in o.data.uv_layers.active.data)] for i in range(2)] if o.data.uv_layers.active else []})
 report[tag]=items
(OUT/'eye-source-inspection.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
