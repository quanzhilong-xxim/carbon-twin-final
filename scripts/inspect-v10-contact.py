"""Read-only contact bounds and packed iris evidence for a precise fit."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/v10-explore/characters-v10'
report={}
for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v10'
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'public/models/characters-v10'/(stem+'.blend')),load_ui=False,use_scripts=False)
 root=bpy.data.objects[stem];items=[]
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render:continue
  if o.name.endswith('_eyes'):
   for nd in o.data.materials[0].node_tree.nodes:
    if nd.type=='TEX_IMAGE' and nd.image:
     src=nd.image;im=bpy.data.images.new('Inspection '+nd.name,width=src.size[0],height=src.size[1],alpha=True)
     im.pixels.foreach_set(src.pixels[:]);im.filepath_raw=str(OUT/(who.lower()+'-eye-'+nd.name.replace('.','-')+'.png'));im.file_format='PNG';im.save()
     print('EYE_NODE',who,nd.name,src.name,src.colorspace_settings.name,[(l.to_node.name,l.to_socket.name) for l in nd.outputs['Color'].links],flush=True)
  if o.parent.name in ['ArmLeft','HeldTablet'] or any(s in o.name for s in ['inner dress','coat torso','lapel','Sleeve']):
   ps=[o.matrix_world@v.co for v in o.data.vertices]
   items.append(dict(name=o.name,parent=o.parent.name,location=list(o.location),rotation=list(o.rotation_euler),low=[min(p[i] for p in ps) for i in range(3)],high=[max(p[i] for p in ps) for i in range(3)]))
 report[who]=items
(OUT/'contact-bounds.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
