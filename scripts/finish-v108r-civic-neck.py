"""Join the preserved anime head to the fitted collar with anatomical neck geometry."""
import bpy, json, hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1]; OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/tailor-v108n-cloth.py').read_text().split("for who in ['Student','Business']:")[0],__file__,'exec'))
stem='CT_City_Explore_v108r'
if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve R source')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_City_Explore_v108q.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_City_Explore_v108q'];root.name=stem
skin=bpy.data.materials['V10 City hand and neck skin'].copy();skin.name='V108r softly lit civic neck'
skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.75,.58,.48,1)
skin.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.72
shell('V108r continuous anatomical neck',[(1.401,.045,.039,.003),(1.425,.042,.036,.002),(1.465,.037,.033,.002),(1.505,.039,.035,.001),(1.545,.044,.039,0)],skin,bpy.data.objects['Head'])
root['v108r']='Continuous softly tapered neck overlaps the inner collar and rear jaw; follows existing head action. Q garment and all prior meshes retained.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
combine_static(root);export(root,stem);export(root,stem+'-portrait')
for o in root.children_recursive:
 if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
 bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance cloth LOD','DECIMATE');mod.ratio=.55
 try:bpy.ops.object.modifier_apply(modifier=mod.name)
 except RuntimeError:o.modifiers.remove(mod)
export(root,stem+'-lite')
record=json.loads((OUT/'CT_City_Explore_v108q.sources.json').read_text());record.update(version='v108r',parent_version='v108q',paid_calls=0,status='browser review pending');record['refinements'].append(root['v108r']);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('CIVIC_NECK_R',flush=True)
