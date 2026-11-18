"""Fit the retained optical frames to the source face; preserve V123b and all clips."""
import bpy, json, hashlib, sys, os
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
from native_action_glb import repair_morph_channels

OUT = ROOT/'public/models/characters-v12-candidate'
revision=os.environ.get('CT_OPTICAL_REVISION','v123c')
if revision not in ['v123c','v123d']: raise ValueError('Unsupported optical revision')
STAGE = ROOT/f'work/{revision}-optical-fit'
STAGE.mkdir(parents=True, exist_ok=True)
parent = 'CT_Business_Explore_v123b'
stem = f'CT_Business_Explore_{revision}'
if any(OUT.glob(stem+'*')): raise RuntimeError('Preserve existing '+stem)
bpy.ops.wm.open_mainfile(filepath=str(OUT/(parent+'.blend')), load_ui=False, use_scripts=False)
root = bpy.data.objects[parent]; rig = bpy.data.objects['CT_Humanoid']
objects = [root, *root.children_recursive]
changes = []
surface_points=[];surface_faces=[]
if revision=='v123d':
    depsgraph=bpy.context.evaluated_depsgraph_get()
    for name in ['V12e native head','V12e native eyes']:
        evaluated=bpy.data.objects[name].evaluated_get(depsgraph);mesh=evaluated.to_mesh();offset=len(surface_points)
        surface_points.extend(evaluated.matrix_world@vertex.co for vertex in mesh.vertices)
        surface_faces.extend(tuple(offset+index for index in face.vertices) for face in mesh.polygons)
        evaluated.to_mesh_clear()
    surface=BVHTree.FromPolygons(surface_points,surface_faces)
for obj in objects:
    if obj.type != 'MESH' or not any(word in obj.name.lower() for word in ['optical', 'nose bridge']): continue
    inverse = obj.matrix_world.inverted(); points = [obj.matrix_world@v.co for v in obj.data.vertices]
    # The former rims sat 3–6cm ahead of the corneas. Compress only the eyewear's
    # anterior depth; posterior temple tips stay at their original ear support.
    def fitted(point):
        p = point.copy()
        if revision=='v123d':
            hit,normal,index,distance=surface.ray_cast(Vector((p.x,-.8,p.z)),Vector((0,1,0)),1.0)
            if hit and p.y<.01:
                target=hit.y-.012
                # Keep a real air gap over the nose and cornea. Preserve some
                # of the frame's original curve instead of tracing skin facets.
                p.y=min(target,p.y*.35+target*.65)
        else:
            p.x *= .93
            if p.y < 0: p.y *= .80
        return p
    if obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:
            for vertex in key.data: vertex.co = inverse@fitted(obj.matrix_world@vertex.co)
    for vertex in obj.data.vertices: vertex.co = inverse@fitted(obj.matrix_world@vertex.co)
    changes.append(dict(object=obj.name,vertices=len(points),max_displacement_m=max((fitted(p)-p).length for p in points)))
root.name = stem
root[revision+'_refinements'] = json.dumps(changes)
bpy.context.scene.frame_set(1); bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(STAGE/(stem+'.blend')))
for obj in bpy.context.scene.objects:
    if obj.name in bpy.context.view_layer.objects: obj.select_set(obj in objects and not obj.hide_render)
exports = []
for tier in ['', '-portrait', '-lite']:
    if tier == '-lite':
        for obj in objects:
            if obj.type != 'MESH' or obj.hide_render or obj.data.shape_keys or ('anatomical' in obj.name and 'hand' in obj.name) or len(obj.data.polygons) < 800: continue
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new('Mobile silhouette budget', 'DECIMATE'); modifier.ratio=.55
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.context.view_layer.objects.active = rig
    file = STAGE/(stem+tier+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_morph=True,export_morph_animation=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=74 if tier=='-lite' else 86,export_image_webp_fallback=False)
    repair_morph_channels(file, objects, 30)
    exports.append(dict(file=file.name,bytes=file.stat().st_size,sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
record = json.loads((OUT/(parent+'.sources.json')).read_text(encoding='utf8'))
record.update(revision=revision,version=revision,parent_revision='v123b',editable_source=stem+'.blend',status='CANDIDATE_NOT_ACCEPTED',exports=exports,eyewear_fit=changes,paid_calls=0)
(STAGE/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
import shutil
for file in [STAGE/(stem+'.blend'),STAGE/(stem+'.sources.json'),*[STAGE/entry['file'] for entry in exports]]:
    if (OUT/file.name).exists(): raise RuntimeError('Refuse overwrite '+file.name)
    shutil.copy2(file,OUT/file.name)
(STAGE/'fit-result.json').write_text(json.dumps(dict(exported=True,changes=changes,exports=exports,visualAcceptance=False),indent=2),encoding='utf8')
print('V123C_OPTICAL_FIT_EXPORTED', json.dumps(changes), flush=True)
