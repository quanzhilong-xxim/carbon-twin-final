"""Export a V104 candidate only. Keep V10 web assets and masters untouched."""
from pathlib import Path
import sys,os
script=Path(__file__).with_name('finalize-character-v10.py').read_text()
exec(compile(script.split('summary={}')[0],str(__file__),'exec'))
summary={}
version=os.environ.get('CT_CHARACTER_VERSION','v104')
if version not in ['v104','v104b','v104c','v104d','v104e','v104f','v104g']:raise RuntimeError('Unrecognized candidate version')
for who in (sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Student','Business','City']):
 stem=f'CT_{who}_Explore_{version}';bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')),load_ui=False,use_scripts=False);root=bpy.data.objects[stem]
 combine_static(root);export(root,stem)
 meshes=[o for o in root.children_recursive if o.type=='MESH' and not o.hide_render];saved={o:o.data.copy() for o in meshes}
 for o in meshes:
  if o.data.shape_keys and o.name.endswith('_head'):subdivide_morph(o)
 export(root,stem+'-portrait')
 for o,d in saved.items():o.data=d
 for o in meshes:
  if o.data.shape_keys or o.name.startswith('V3 rounded sleeve shoulder') or len(o.data.polygons)<400:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('V104 distance LOD','DECIMATE');mod.ratio=.42;bpy.ops.object.modifier_apply(modifier=mod.name)
 export(root,stem+'-lite')
 info=json.loads((OUT/(stem+'.sources.json')).read_text());info['tiers']={name:(OUT/(stem+suffix+'.glb')).stat().st_size for name,suffix in [('standard',''),('portrait','-portrait'),('lite','-lite')]};(OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2));summary[who]=info['tiers'];print('V104_TIERS_EXPORTED',who,flush=True)
(ROOT/f'docs/recovery/v10.4/export-result-{version}.json').write_text(json.dumps(summary,indent=2))
