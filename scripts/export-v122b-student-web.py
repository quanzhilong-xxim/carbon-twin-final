"""Export retained source, preserving failed stripped-morph raw candidate."""
import bpy,shutil
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122b'
RAW=R/'outputs/v122/rejected-stripped-morph-raw';RAW.mkdir(parents=True,exist_ok=True)
for tier in ['','-portrait','-lite']:
 p=OUT/(STEM+tier+'.glb');backup=RAW/p.name
 if backup.exists():raise RuntimeError('Already recovered; retain backup')
 shutil.copy2(p,backup)
bpy.ops.wm.open_mainfile(filepath=str(OUT/(STEM+'.blend')),load_ui=False,use_scripts=False)
root=bpy.data.objects[STEM];keep={'Basis','Fcl_EYE_Close','Fcl_MTH_Joy','Fcl_BRW_Joy','Fcl_EYE_Joy','Fcl_BRW_Fun','Fcl_EYE_Surprised'}
for o in root.children_recursive:
 if o.type=='MESH' and o.data.shape_keys:
  for key in list(o.data.shape_keys.key_blocks)[::-1]:
   key.value=0
   if key.name.rsplit('.',1)[-1] not in keep:o.shape_key_remove(key)
objects=[root,*root.children_recursive]
for o in bpy.context.scene.objects:
 if o.name in bpy.context.view_layer.objects:o.select_set(o in objects and not o.hide_render)
for tier in ['','-portrait','-lite']:
 if tier=='-lite':
  for o in objects:
   if o.type!='MESH' or o.hide_render or o.data.shape_keys or o.name=='Body' or len(o.data.polygons)<800:continue
   bpy.context.view_layer.objects.active=o;q=o.modifiers.new('Mobile silhouette budget','DECIMATE');q.ratio=.55;bpy.ops.object.modifier_apply(modifier=q.name)
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(OUT/(STEM+tier+'.glb')),export_format='GLB',use_selection=True,export_apply=False,export_animations=False,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=86 if tier!='-lite' else 74,export_image_webp_fallback=False)
print('V122B_STUDENT_MORPHS_RETAINED',flush=True)
