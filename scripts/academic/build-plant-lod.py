from pathlib import Path
import json
import bpy


PROJECT = Path(__file__).resolve().parents[2]
SOURCE = PROJECT / "public/models/twin/plant.glb"
OUTPUT = PROJECT / "public/models/research"
BLEND = OUTPUT / "CT_AcademicPlant_LOD.blend"
GLB = OUTPUT / "CT_AcademicPlant_LOD.glb"


def triangle_count(objects):
    return sum(max(len(poly.vertices) - 2, 0) for obj in objects for poly in obj.data.polygons)


OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
before = triangle_count(meshes)

for obj in meshes:
    name = obj.name.lower()
    ratio = 0.62 if "leaves" in name else 0.48 if "pebbles" in name else None
    if ratio is None:
        continue
    modifier = obj.modifiers.new(name="Web LOD", type="DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)

after = triangle_count(meshes)
bpy.ops.file.pack_all()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.export_scene.gltf(
    filepath=str(GLB),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_materials="EXPORT",
    export_animations=False,
    export_cameras=False,
    export_lights=False,
)
print(json.dumps({"source": str(SOURCE), "blend": str(BLEND), "glb": str(GLB), "source_triangles": before, "lod_triangles": after, "ratio": round(after / before, 3), "meshes": len(meshes)}))
