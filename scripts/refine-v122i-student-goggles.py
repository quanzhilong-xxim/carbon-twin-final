"""Create a review-only student revision while retaining the v122g source."""
import bpy, hashlib, json, math
from pathlib import Path
from mathutils import Vector

root_dir = Path(__file__).resolve().parents[1]
out = root_dir / 'public/models/characters-v12-candidate'
stem = 'CT_Student_Explore_v122i'
if any(out.glob(stem + '*')):
    raise RuntimeError('Candidate already exists; preserve it')
bpy.ops.wm.open_mainfile(filepath=str(out / 'CT_Student_Explore_v122g.blend'), load_ui=False, use_scripts=False)
root = bpy.data.objects['CT_Student_Explore_v122g']
root.name = stem
objects = [root, *root.children_recursive]
parts = [bpy.data.objects.get('V10 merged Head / Brushed brass'), bpy.data.objects.get('V10 merged Head / Optical lens')]
if any(o is None or o.type != 'MESH' for o in parts):
    raise RuntimeError('Expected original goggle meshes are missing')

# Transform in world space around their shared centre to preserve the matching
# frame/lens alignment and original head weights and expression keys.
points = [o.matrix_world @ v.co for o in parts for v in o.data.vertices]
lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
centre = (lo + hi) / 2
for obj in parts:
    inverse = obj.matrix_world.inverted()
    collections = [key.data for key in obj.data.shape_keys.key_blocks] if obj.data.shape_keys else [obj.data.vertices]
    for vertices in collections:
        for vertex in vertices:
            p = obj.matrix_world @ vertex.co
            p.x = centre.x + (p.x - centre.x) * .88
            p.z = centre.z + (p.z - centre.z) * .88 + .002
            vertex.co = inverse @ p
    if obj.data.shape_keys:
        for v, basis in zip(obj.data.vertices, obj.data.shape_keys.key_blocks[0].data):
            v.co = basis.co
for material in parts[1].data.materials:
    if material and material.use_nodes:
        shader = material.node_tree.nodes.get('Principled BSDF')
        if shader:
            shader.inputs['Roughness'].default_value = .34
            shader.inputs['Metallic'].default_value = .12

def neutral():
    for obj in objects:
        if obj.type == 'MESH' and obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                key.value = 0
neutral()
root['v122i_changes'] = 'Reduced goggle frame and lens together; softened lens reflectance.'
bpy.ops.wm.save_as_mainfile(filepath=str(out / (stem + '.blend')))
keep = {'Basis','Fcl_EYE_Close','Fcl_MTH_Joy','Fcl_BRW_Joy','Fcl_EYE_Joy','Fcl_BRW_Fun','Fcl_EYE_Surprised'}
for obj in objects:
    if obj.type == 'MESH' and obj.data.shape_keys:
        for key in list(obj.data.shape_keys.key_blocks)[::-1]:
            if key.name.rsplit('.', 1)[-1] not in keep:
                obj.shape_key_remove(key)
for obj in bpy.context.scene.objects:
    if obj.name in bpy.context.view_layer.objects:
        obj.select_set(obj in objects and not obj.hide_render)
bpy.context.view_layer.objects.active = root
exports = []
for tier in ['', '-portrait', '-lite']:
    neutral()
    if tier == '-lite':
        for obj in objects:
            if obj.type != 'MESH' or obj.hide_render or obj.data.shape_keys or 'anatomical hand' in obj.name or obj.name == 'Body' or len(obj.data.polygons) < 800:
                continue
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new('Mobile silhouette budget', 'DECIMATE')
            modifier.ratio = .55
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.context.view_layer.objects.active = root
    path = out / (stem + tier + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_skins=True, export_def_bones=True, export_image_format='WEBP', export_image_quality=74 if tier == '-lite' else 86, export_image_webp_fallback=False)
    exports.append({'file': path.name, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
record = json.loads((out / 'CT_Student_Explore_v122g.sources.json').read_text(encoding='utf8'))
record.update(revision='v122i', version='v122i', status='CANDIDATE_NOT_ACCEPTED', editable_source=stem+'.blend', parent_revision='v122g', refinements=record.get('refinements', []) + ['Proportional goggle frame and lens reduction; softer lens reflections'], exports=exports, paid_calls=0)
(out / (stem + '.sources.json')).write_text(json.dumps(record, indent=2), encoding='utf8')
print('V122I_EXPORTED', flush=True)
