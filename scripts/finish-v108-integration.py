"""Final local tailoring pass from retained N; preserve every earlier master."""
import bpy, math, json, hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/tailor-v108n-cloth.py').read_text().split("for who in ['Student','Business']:")[0],__file__,'exec'))
stem='CT_Student_Explore_v108p'
if (OUT/(stem+'.blend')).exists():raise RuntimeError('Existing final source preserved')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v108n.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v108n'];root.name=stem
sand=bpy.data.materials['V10 warm recycled cotton.003']
# A closed, rounded crotch gusset joins the existing legs and hip shell.
# It uses the same fabric and the actual pelvis deformation, not a flat patch.
bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,location=(0,.005,.787))
o=bpy.context.object;o.name='V108 closed cargo crotch gusset';o.scale=(.126,.119,.112)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
o.data.materials.append(sand)
for f in o.data.polygons:f.use_smooth=True
parent(o,root)
vg=o.vertex_groups.new(name='J_Bip_C_Hips');vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
arm=o.modifiers.new('Pelvis weights','ARMATURE');arm.object=root
# Bring the cap binding into contact with the retained hair crown.
for o in root.children_recursive:
 if o.type=='MESH' and (o.name in ['Explorer soft cap','Cap binding'] or 'merged Head' in o.name):
  o.location.z-=.016
root['v108p']='Closed cargo crotch, real pelvis weights and cap contact; all N textures, morphs, skeleton, camera and backpack retained. No paid calls.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
combine_static(root);export(root,stem);export(root,stem+'-portrait')
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
 bpy.context.view_layer.objects.active=o;m=o.modifiers.new('Distance LOD','DECIMATE');m.ratio=.55
 try:bpy.ops.object.modifier_apply(modifier=m.name)
 except RuntimeError:o.modifiers.remove(m)
export(root,stem+'-lite')
record=json.loads((OUT/'CT_Student_Explore_v108n.sources.json').read_text());record.update(version='v108p',parent_version='v108n',paid_calls=0,status='integrated visual validation pending');record['refinements'].append(root['v108p']);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('TAILORING_COMPLETE',stem,flush=True)
