"""TOWER_01 reference geometry study. This is not a finished facade or building."""
import bpy
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'public/models/citylight/v17/massing-r1'
SOURCE = ROOT / 'work/citylight-v17/massing-r1'
if DEST.exists() or SOURCE.exists():
    raise RuntimeError('Revision exists; preserve earlier work')
DEST.mkdir(parents=True)
SOURCE.mkdir(parents=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene['status'] = 'NEEDS_REWORK: geometric reference study only'
scene['asset_id'] = 'TOWER_01_V17_MASSING_R1'

def material(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = .72
    return m

concrete = material('study:slab', (.67, .69, .66))
core = material('study:core', (.78, .76, .70))
glass_study = material('study:opaque-envelope-not-glass', (.24, .36, .40))
steel = material('study:columns', (.50, .52, .50))

def box(name, center, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj

# Proportions are provisional visual estimates, not surveyed dimensions.
box('core:west', (-16, 2, 24), (4, 18, 48), core)
box('site:building-base', (0, 0, -.25), (44, 34, .5), concrete)
box('lobby:floor', (0, 0, .15), (38, 27, .3), concrete)
for x in [-13, -4, 5, 14]:
    for y in [-10, 9]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.4, depth=7.2, location=(x, y, 3.75))
        bpy.context.object.name = 'lobby:column'
        bpy.context.object.data.materials.append(steel)

# Individual terraces and cantilever volumes remain separately inspectable.
# (centre x, centre y, width, depth, lower height, number of levels)
volumes = [
    (-.5, 0, 37, 27, 7.5, 2),
    (-3.5, 1, 32, 23, 15.5, 2),
    (3.5, 2, 31, 22, 23.5, 2),
    (-4, 3, 25, 20, 31.5, 2),
    (5, 4, 29, 20, 39.5, 2),
]
for idx, (x, y, width, depth, z, levels) in enumerate(volumes, 1):
    for level in range(levels):
        floor_z = z + level * 4
        box(f'volume-{idx}:slab-{level}', (x, y, floor_z), (width, depth, .42), concrete)
        box(f'volume-{idx}:opaque-study-{level}', (x, y, floor_z + 2.1), (width-.4, depth-.4, 3.72), glass_study)
    box(f'volume-{idx}:roof', (x, y, z + levels*4), (width, depth, .42), concrete)

bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'tower01-massing.blend'))
bpy.ops.export_scene.gltf(filepath=str(DEST / 'tower01-massing.glb'), export_format='GLB', export_yup=True)
manifest = {'asset_id':'TOWER_01_V17_MASSING_R1','status':'NEEDS_REWORK',
            'units':'metres, provisional estimates', 'volumes':volumes,
            'limitations':['opaque proxy is not glass','no facade modules','no interior, vegetation or scene',
                           'proportions not independently reviewed','not the final building']}
(DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
