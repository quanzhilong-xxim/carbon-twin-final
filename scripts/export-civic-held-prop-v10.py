"""Preserve the tablet as a rigid hierarchy while merging static materials.
Continues the finalized V10 master without reapplying the facial sculpt.
"""
from pathlib import Path
script=Path(__file__).with_name('finalize-character-v10.py').read_text()
exec(compile(script.split('summary={}')[0],str(__file__),'exec'))
stem='CT_City_Explore_v10';bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')),load_ui=False,use_scripts=False);root=bpy.data.objects[stem]
if not bpy.data.objects.get('HeldTablet'):
 group=bpy.data.objects.new('HeldTablet',None);bpy.context.scene.collection.objects.link(group);parent(group,bpy.data.objects['Breath'])
 for o in list(root.children_recursive):
  if o.name.startswith('Tablet '):parent(o,group)
 group.location+=Vector((.02,.095,-.14))
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
combine_static(root);export(root,stem)
meshes=[o for o in root.children_recursive if o.type=='MESH' and not o.hide_render];saved={o:o.data.copy() for o in meshes}
for o in meshes:
 if o.data.shape_keys and o.name.endswith('_head'):subdivide_morph(o)
export(root,stem+'-portrait')
for o,d in saved.items():o.data=d
for o in meshes:
 if o.data.shape_keys or o.name.startswith('V3 rounded sleeve shoulder') or len(o.data.polygons)<400:continue
 bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Lightweight interactive distance','DECIMATE');mod.ratio=.34;bpy.ops.object.modifier_apply(modifier=mod.name)
export(root,stem+'-lite');print('CIVIC_HELD_TABLET_EXPORTED',flush=True)
