"""Recover hero leaf detail from the retained higher resolution master."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/urban-vegetation'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_ParkTree_Hero_v3.blend'),load_ui=False,use_scripts=False)
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in objects:o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'CT_ParkTree_Hero_v4.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'CT_ParkTree_Hero_v4.glb'),export_format='GLB',use_selection=True,export_apply=True,export_image_format='WEBP',export_image_quality=88,export_image_webp_fallback=False)
count=0
for o in objects:o.data.calc_loop_triangles();count+=len(o.data.loop_triangles)
(OUT/'CT_ParkTree_Hero_v4.sources.json').write_text(json.dumps({'source':'https://polyhaven.com/a/island_tree_02','license':'CC0','license_url':'https://polyhaven.com/license','authors':['Rob Tuytel','Rico Cilliers'],'retained_master':'CT_ParkTree_Hero_v3.blend','triangles':count,'changes':'Restore higher resolution leaf and twig geometry; WebP textures; former Web v3 retained','paid_calls':0},indent=2));print('TREE_V4_READY',count)
