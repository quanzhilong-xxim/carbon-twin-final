"""Bake a relaxed, attributed crowd LOD from the saved licensed character study."""
import bpy, math, json
from pathlib import Path
from mathutils import Matrix, Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/characters-v10'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Rain_v1.blend'),load_ui=False,use_scripts=False)
rig=bpy.data.objects['RIG-rain'];scene=bpy.context.scene
controls=rig.pose.bones['Properties_IKFK']
for side in ['left','right']:controls['ik_arm_'+side]=0.0
rig.update_tag();bpy.context.view_layer.update()
for side in ['L','R']:
    bone=rig.pose.bones['FK-Upperarm.'+side]
    matrix=bone.matrix.copy();location=matrix.translation.copy()
    rotation=Matrix.Rotation((1 if side=='L' else -1)*math.radians(72),4,'Y')
    matrix.translation=Vector((0,0,0));bone.matrix=Matrix.Translation(location)@rotation@matrix
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
people=[]
for o in list(scene.objects):
    if o.type!='MESH' or not o.name.startswith('GEO-') or o.hide_render:continue
    mesh=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps)
    baked=bpy.data.objects.new('CT_Citizen_'+o.name,mesh);scene.collection.objects.link(baked);baked.matrix_world=o.matrix_world.copy();people.append(baked)
for o in scene.objects:o.select_set(o in people)
for o in people:
    bpy.context.view_layer.objects.active=o
    if len(o.data.vertices)>500:
        dec=o.modifiers.new('Distance-specific citizen LOD','DECIMATE');dec.ratio=.17;bpy.ops.object.modifier_apply(modifier=dec.name)
    for m in o.data.materials:
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type=='TEX_IMAGE' and n.image and max(n.image.size)>256:n.image.scale(256,256)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'CT_Citizen_Rain_LOD_v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'CT_Citizen_Rain_LOD_v1.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_image_format='WEBP',export_image_quality=78,export_image_webp_fallback=False)
print('CITIZEN_LOD',sum(len(o.data.polygons) for o in people))
