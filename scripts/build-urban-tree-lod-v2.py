import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "models" / "urban-vegetation"
OUT.mkdir(parents=True, exist_ok=True)
random.seed(20261108)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.render.engine = "BLENDER_EEVEE"
collection = bpy.data.collections.new("UrbanTree_Canopy_LOD_v2")
scene.collection.children.link(collection)


def material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    return mat, shader


bark, bark_shader = material("Bark · layered cambium", (.22, .13, .075), .9)
nodes, links = bark.node_tree.nodes, bark.node_tree.links
texture = nodes.new("ShaderNodeTexNoise")
texture.inputs["Scale"].default_value = 5.5
texture.inputs["Detail"].default_value = 5
texture.inputs["Roughness"].default_value = .76
texture.location = (-620, 80)
coordinates = nodes.new("ShaderNodeTexCoord")
coordinates.location = (-840, 80)
links.new(coordinates.outputs["Generated"], texture.inputs["Vector"])
ramp = nodes.new("ShaderNodeValToRGB")
ramp.location = (-340, 160)
ramp.color_ramp.elements[0].position = .2
ramp.color_ramp.elements[0].color = (.085, .055, .035, 1)
ramp.color_ramp.elements[1].position = .8
ramp.color_ramp.elements[1].color = (.39, .26, .15, 1)
links.new(texture.outputs["Fac"], ramp.inputs["Fac"])
links.new(ramp.outputs["Color"], bark_shader.inputs["Base Color"])
bump = nodes.new("ShaderNodeBump")
bump.location = (-80, -80)
bump.inputs["Strength"].default_value = .22
bump.inputs["Distance"].default_value = .075
links.new(texture.outputs["Fac"], bump.inputs["Height"])
links.new(bump.outputs["Normal"], bark_shader.inputs["Normal"])

leaf_materials = []
for name, color in [
    ("Foliage · deep canopy", (.075, .22, .09)),
    ("Foliage · sunlit leaf", (.22, .39, .12)),
    ("Foliage · spring tips", (.39, .51, .19)),
    ("Foliage · warm edge", (.54, .48, .21)),
]:
    mat, shader = material(name, color, .72)
    shader.inputs["Subsurface Weight"].default_value = .06
    shader.inputs["Subsurface Radius"].default_value = (1.0, .55, .24)
    leaf_materials.append(mat)

branch_curve = bpy.data.curves.new("Tapered trunk, limbs and twigs", "CURVE")
branch_curve.dimensions = "3D"
branch_curve.resolution_u = 2
branch_curve.bevel_depth = .36
branch_curve.bevel_resolution = 1
branch_curve.use_fill_caps = True
terminals = []


def add_spline(points, radii):
    spline = branch_curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coord, radius in zip(spline.points, points, radii):
        point.co = (*coord, 1)
        point.radius = radius


def grow_branch(start, direction, length, radius, depth):
    direction = direction.normalized()
    up = Vector((0, 0, 1))
    side = direction.cross(up)
    if side.length < .1:
        side = direction.cross(Vector((0, 1, 0)))
    side.normalize()
    bend = side * length * random.uniform(-.055, .055)
    points = [
        start,
        start + direction * length * .32 + bend * .28,
        start + direction * length * .68 + bend,
        start + direction * length + bend * .82,
    ]
    add_spline(points, [radius / .36, radius / .36 * .76, radius / .36 * .43, radius / .36 * .055])
    tip = points[-1]
    if depth == 0:
        terminals.append((tip, direction, radius))
        return
    for fraction, sign in ((.43, -1), (.74, 1)):
        anchor = start.lerp(tip, fraction)
        spread = (direction * .7 + side * sign * .55 + up * .35).normalized()
        grow_branch(anchor, spread, length * random.uniform(.49, .59), radius * .58, depth - 1)


trunk_points = [
    Vector((0, 0, 0)), Vector((.04, -.025, 2.4)), Vector((-.08, .03, 5.0)),
    Vector((.06, .015, 7.4)), Vector((-.02, .08, 9.5)), Vector((.12, .12, 11.8)),
]
add_spline(trunk_points, [1, .78, .59, .42, .25, .045])
for index in range(9):
    angle = index * math.tau / 9 + .18
    direction = Vector((math.cos(angle) * .95, math.sin(angle) * .95, .26)).normalized()
    grow_branch(Vector((0, 0, .18)), direction, random.uniform(1.15, 1.9), .2, 0)

for index in range(20):
    angle = index * 2.39996 + random.uniform(-.16, .16)
    height = 2.35 + index * .405
    crown = math.sin((height / 13.2) * math.pi)
    length = 2.3 + crown * random.uniform(1.8, 2.8)
    direction = Vector((math.cos(angle), math.sin(angle), random.uniform(.31, .54))).normalized()
    grow_branch(Vector((.02 * math.sin(height), .01, height)), direction, length, .115 * crown, 2)

branch_object = bpy.data.objects.new("UrbanTree · bark and branching skeleton", branch_curve)
collection.objects.link(branch_object)
branch_object.data.materials.append(bark)

vertices, faces, material_ids, leaf_uvs = [], [], [], []
for tip, branch_direction, radius in terminals:
    for _ in range(random.randint(18, 26)):
        center = tip + Vector((random.uniform(-.42, .42), random.uniform(-.42, .42), random.uniform(-.38, .52)))
        direction = (branch_direction + Vector((random.uniform(-.62, .62), random.uniform(-.62, .62), random.uniform(-.05, .68)))).normalized()
        side = direction.cross(Vector((0, 0, 1)))
        if side.length < .08:
            side = direction.cross(Vector((0, 1, 0)))
        side.normalize()
        normal = side.cross(direction).normalized()
        length = random.uniform(.23, .39)
        width = random.uniform(.065, .105)
        leaf_start = len(vertices)
        rows = 2
        for row in range(rows):
            t = row / (rows - 1)
            half_width = width * (math.sin(t * math.pi) ** .72) + .003
            midrib = center + direction * length * t + normal * (math.sin(t * math.pi) * .035)
            for column in (-1, 0, 1):
                point = midrib + side * (half_width * column)
                vertices.append(tuple(point))
                leaf_uvs.append(((column + 1) / 2, t))
        color_id = random.choices(range(4), weights=(38, 35, 21, 6))[0]
        for row in range(rows - 1):
            for column in range(2):
                a = leaf_start + row * 3 + column
                b = a + 3
                faces.append((a, a + 1, b + 1, b))
                material_ids.append(color_id)

leaf_mesh = bpy.data.meshes.new("Pointed blades with a raised midrib")
leaf_mesh.from_pydata(vertices, [], faces)
leaf_mesh.materials.clear()
for mat in leaf_materials:
    leaf_mesh.materials.append(mat)
leaf_mesh.update()
uv_layer = leaf_mesh.uv_layers.new(name="LeafBladeUV")
for loop in leaf_mesh.loops:
    uv_layer.data[loop.index].uv = leaf_uvs[loop.vertex_index]
leaf_mesh.validate(verbose=False, clean_customdata=True)
for polygon, mat_index in zip(leaf_mesh.polygons, material_ids):
    polygon.material_index = mat_index
    polygon.use_smooth = True
leaf_object = bpy.data.objects.new("UrbanTree · individually shaped leaves", leaf_mesh)
collection.objects.link(leaf_object)

for obj in (branch_object, leaf_object):
    obj["asset_id"] = "carbontwin.urban-tree-master"
    obj["asset_version"] = "2.0.0"
    obj["asset_license"] = "Original project-authored procedural geometry"
    obj["reuse"] = "Explore hero tree, park groves, identity scenes, public realm"
    obj.select_set(True)
    obj.color = (.24, .42, .2, 1)

scene.render.resolution_x = 960
scene.render.resolution_y = 720
scene.render.resolution_percentage = 80
scene.camera = None
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "UrbanTree_Canopy_LOD_v2.blend"))
bpy.ops.export_scene.gltf(
    filepath=str(OUT / "UrbanTree_Canopy_LOD_v2.glb"),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_materials="EXPORT",
)
print(f"TREE_MASTER: {OUT / 'UrbanTree_Canopy_LOD_v2.glb'}")
print(f"BRANCH_SPLINES: {len(branch_curve.splines)}")
print(f"LEAF_BLADES: {len(vertices) // 12}")
