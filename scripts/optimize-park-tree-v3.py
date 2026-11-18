from pathlib import Path
import json
import bpy

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/urban-vegetation'
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'CT_ParkTree_Hero_v3.blend'), load_ui=False, use_scripts=False)
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']

def reduce(ratio):
    for obj in objects:
        bpy.context.view_layer.objects.active = obj
        m = obj.modifiers.new('Measured web budget', 'DECIMATE')
        m.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=m.name)

def export(stem):
    for obj in bpy.context.scene.objects:
        obj.select_set(obj in objects)
    count = 0
    for obj in objects:
        obj.data.calc_loop_triangles()
        count += len(obj.data.loop_triangles)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / (stem + '.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT / (stem + '.glb')), export_format='GLB', use_selection=True, export_apply=True, export_image_format='WEBP', export_image_quality=84, export_image_webp_fallback=False)
    return {'triangles': count, 'bytes': (OUT / (stem + '.glb')).stat().st_size}

reduce(.4)
hero = export('CT_ParkTree_Web_v3')
reduce(.12)
for image in bpy.data.images:
    if image.size[0] > 512:
        image.scale(512, 512)
street = export('CT_ParkTree_StreetLite_v3')
report = json.loads((OUT / 'CT_ParkTree_v3.sources.json').read_text())
report.update(web_hero=hero, street_lite=street, web_textures='WebP, modern Chromium/Firefox/WebKit; to be verified in browser')
(OUT / 'CT_ParkTree_v3.sources.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(json.dumps({'web_hero': hero, 'street_lite': street}))
