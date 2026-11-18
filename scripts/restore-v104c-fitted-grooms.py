"""Use the retained fitted source grooms instead of the rejected floating ribbons.
Writes a new candidate, preserving V10, V104 and V104b byte-for-byte.
"""
import bpy, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/characters-v10'
report={}
for who in ['Student','Business','City']:
    stem=f'CT_{who}_Explore_v104c'
    dest=OUT/(stem+'.blend')
    if dest.exists(): raise RuntimeError('Candidate already exists: '+str(dest))
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v104b.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_v104b'];root.name=stem
    fitted=[];archived=[]
    for o in root.children_recursive:
        if o.type not in {'MESH','CURVE'}:continue
        # These fitted surfaces were kept in the new master, never deleted.
        original=any(s in o.name for s in ['_hair_main','_hair_strand','hair_base','V10 fine hair silhouettes','V10 swept civic part','V10 civic cheek tendril'])
        if original:
            o.hide_render=False; o.hide_set(False);fitted.append(o.name)
            if who=='Student':
                mat=bpy.data.materials.get('V104 Student layered silk-fibre hair')
                if mat:
                    o.data.materials.clear();o.data.materials.append(mat)
            else:
                for mat in o.data.materials:
                    if not mat or not mat.use_nodes:continue
                    p=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
                    if p:
                        p.inputs['Roughness'].default_value=.58
                        p.inputs['Specular IOR Level'].default_value=.26
        rejected=o.name.startswith(('V104 fitted scalp','V104 sculpted flowing lock','V104 tapered groom filament'))
        if rejected and (who!='Student' or 'fitted scalp' in o.name):
            o.hide_render=True;archived.append(o.name)
    if not fitted:raise RuntimeError('Original fitted groom not found: '+who)
    root['v104c_fitted_groom_review']=True
    bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    info=json.loads((OUT/f'CT_{who}_Explore_v104b.sources.json').read_text())
    info.update(version='v104c',parent_version='v104b',status='candidate: browser art review pending')
    info['fitted_groom']={'restored':fitted,'rejected_retained_hidden':archived,'paid_calls':0}
    (OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2))
    report[who]=info['fitted_groom']
(ROOT/'docs/recovery/v10.4/fitted-groom-v104c.json').write_text(json.dumps(report,indent=2))
