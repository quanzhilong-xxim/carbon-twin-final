import bpy, json
from pathlib import Path
source=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/rain-v2/extracted')
bpy.ops.wm.open_mainfile(filepath=str(source/'rain_rig.blend'),load_ui=False,use_scripts=False)
report={'objects':[], 'materials':[], 'images':[], 'scripts_executed':False}
for o in bpy.data.objects:
    if o.type in {'MESH','ARMATURE'}:
        info={'name':o.name,'type':o.type,'hide_render':o.hide_render,'dimensions':list(o.dimensions),'modifiers':[(m.name,m.type) for m in o.modifiers]}
        if o.type=='MESH':info.update(vertices=len(o.data.vertices),materials=[m.name if m else None for m in o.data.materials])
        else:info['bones']=[b.name for b in o.data.bones]
        report['objects'].append(info)
for m in bpy.data.materials:
    report['materials'].append({'name':m.name,'nodes':[(n.name,n.type) for n in m.node_tree.nodes] if m.node_tree else []})
for image in bpy.data.images:report['images'].append({'name':image.name,'path':image.filepath,'packed':bool(image.packed_file),'size':list(image.size)})
(source.parent/'inspection.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('RAIN_INSPECTION',len(report['objects']),len(report['materials']),len(report['images']))
