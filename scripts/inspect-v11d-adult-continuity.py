import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
for who in ['Business','City']:
    bpy.ops.wm.open_mainfile(filepath=str(R/f'public/models/characters-v10/CT_{who}_Explore_v11d.blend'),load_ui=False,use_scripts=False)
    print('ROLE',who,flush=True)
    for o in bpy.data.objects:
        if o.type!='MESH' or o.hide_render or not o.data.vertices:continue
        if not any(s in o.name.lower() for s in ['face','head','skin','neck','ear','hair','scalp','bun']):continue
        ps=[o.matrix_world@v.co for v in o.data.vertices]
        print(json.dumps({'object':o.name,'parent':o.parent.name if o.parent else None,'bounds':[[round(min(p[k]for p in ps),4),round(max(p[k]for p in ps),4)]for k in range(3)],'mats':[{'name':m.name,'textures':[n.image.name for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image],'color':list(m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value)if m.node_tree.nodes.get('Principled BSDF')else None}for m in o.data.materials if m and m.use_nodes]}),flush=True)
