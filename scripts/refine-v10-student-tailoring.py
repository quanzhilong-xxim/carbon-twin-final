"""Reference 074: fit the retained explorer's cargo silhouette and hair fringe.

Edits only the checkpointed V10 master. Source body/UVs, facial shape keys,
articulated arms and all earlier versions remain intact. No remote requests.
"""
import bpy, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/characters-v10'
stem = 'CT_Student_Explore_v10'
bpy.ops.wm.open_mainfile(filepath=str(OUT / (stem + '.blend')), load_ui=False, use_scripts=False)
root = bpy.data.objects[stem]
if root.get('v10_reference_cargo_fringe'):
    raise RuntimeError('Reference cargo/fringe already applied; export only')

def parent(obj, target):
    bpy.context.view_layer.update()
    matrix = obj.matrix_world.copy()
    obj.parent = target
    obj.matrix_world = matrix

def smoothstep(a, b, x):
    t = max(0, min(1, (x-a)/(b-a)))
    return t*t*(3-2*t)

jeans = bpy.data.objects['Study / GEO-rain_jeans']
original = np.array([jeans.matrix_world @ v.co for v in jeans.data.vertices])
levels = np.linspace(.13, .90, 32)
centers = {}
for sign in [-1, 1]:
    side = original[original[:, 0]*sign > .015]
    centers[sign] = []
    for z in levels:
        ring = side[np.abs(side[:, 2]-z) < .025]
        if len(ring) < 4:
            ring = side[np.argsort(np.abs(side[:, 2]-z))[:24]]
        centers[sign].append((float(np.median(ring[:, 0])), float(np.median(ring[:, 1]))))

inverse = jeans.matrix_world.inverted()
for vert, point in zip(jeans.data.vertices, original):
    x, y, z = point
    sign = 1 if x >= 0 else -1
    cx = float(np.interp(z, levels, [c[0] for c in centers[sign]]))
    cy = float(np.interp(z, levels, [c[1] for c in centers[sign]]))
    envelope = smoothstep(.13, .23, z)*(1-smoothstep(.78, .90, z))
    # The reference is relaxed cargo, with volume below the knee and a
    # gathered ankle. Expand the actual retained cloth, never the skin.
    fullness = .60 + .32*math.exp(-((z-.35)/.20)**2)
    dx, dy = x-cx, y-cy
    angle = math.atan2(dy, dx)
    fold = .0035*math.sin(z*45 + angle*3)*envelope
    p = Vector((cx+dx*(1+fullness*envelope)+math.cos(angle)*fold,
                cy+dy*(1+.55*envelope)+math.sin(angle)*fold, z))
    vert.co = inverse @ p

def curve(name, points, radius, material, target):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'; data.resolution_u = 6
    data.bevel_depth = radius; data.bevel_resolution = 2
    spline = data.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
    for node, p in zip(spline.bezier_points, points):
        node.co = p; node.handle_left_type = node.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, data); bpy.context.scene.collection.objects.link(obj)
    data.materials.append(material); parent(obj, target)
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
    bpy.context.view_layer.objects.active = obj; bpy.ops.object.convert(target='MESH')
    # Curves export with generated UVs; explicitly retain a portable map.
    if not obj.data.uv_layers:
        uv = obj.data.uv_layers.new(name='UVMap')
        for loop in obj.data.loops:
            p = obj.data.vertices[loop.vertex_index].co
            uv.data[loop.index].uv = (p.x*8, p.z*8)
    return obj

cotton = bpy.data.materials['V10 warm recycled cotton']
# Fit existing side pockets to the expanded leg instead of leaving them
# buried in the old narrow trouser surface.
for obj in root.children_recursive:
    if obj.name.startswith(('V10 explorer cargo pocket', 'V10 cargo pocket flap')):
        matrix = obj.matrix_world.copy()
        sign = 1 if matrix.translation.x > 0 else -1
        matrix.translation.x += sign*.037
        matrix.translation.y -= .012
        obj.matrix_world = matrix
    elif obj.name.startswith('V10 cargo side seam'):
        obj.hide_render = True  # retained historical stitch, now inside cloth

for sign in [-1, 1]:
    points = []
    for z in np.linspace(.18, .83, 19):
        ring = [jeans.matrix_world @ v.co for v in jeans.data.vertices
                if abs((jeans.matrix_world @ v.co).z-z)<.025 and (jeans.matrix_world @ v.co).x*sign>.015]
        if ring:
            outer = max(ring, key=lambda p: p.x*sign)
            points.append((outer.x+sign*.001, outer.y, float(z)))
    curve('V10 fitted cargo outseam', points, .0012, cotton, bpy.data.objects['Breath'])

# Reuse the detailed original sneakers and laces; bring their palette and
# robust sole proportions into the supplied purple/cream outfit.
palette = {'CT canvas sneakers': (.29,.115,.40), 'CT equipment trim': (.74,.65,.50),
           'CT socks': (.74,.67,.55), 'CT laces': (.82,.76,.64)}
for name, color in palette.items():
    mat = bpy.data.materials.get(name)
    if not mat or not mat.use_nodes: continue
    pbr = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    for link in list(pbr.inputs['Base Color'].links): mat.node_tree.links.remove(link)
    pbr.inputs['Base Color'].default_value = (*color, 1)
    pbr.inputs['Roughness'].default_value = .72
shoes = bpy.data.objects['Study / GEO-rain_shoes']; inverse = shoes.matrix_world.inverted()
for vert in shoes.data.vertices:
    p = shoes.matrix_world @ vert.co
    cx = .10 if p.x > 0 else -.10
    p.x = cx+(p.x-cx)*1.12; p.y *= 1.08; p.z = .001+(p.z-.001)*1.10
    vert.co = inverse @ p

head = bpy.data.objects['Head']
hair = bpy.data.materials['V10 Student directional hair']
# Catmull-Rom tubes with flattened cross-sections form overlapping tapered
# locks. Low vertex count, no transparent cards or separate strand renderer.
def catmull(points, t):
    n = len(points)-1; scaled = min(t*n, n-1e-7); i = int(scaled); u = scaled-i
    a,b,c,d = [Vector(points[max(0,min(n,j))]) for j in (i-1,i,i+1,i+2)]
    return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)

locks = [
    ([(-.032,-.075,1.648),(-.067,-.115,1.618),(-.085,-.130,1.579),(-.098,-.129,1.530)], .023),
    ([(-.018,-.095,1.642),(-.040,-.127,1.608),(-.047,-.144,1.574),(-.049,-.149,1.533)], .024),
    ([(-.003,-.095,1.646),(.005,-.130,1.620),(.018,-.145,1.584),(.006,-.151,1.545)], .025),
    ([(.018,-.088,1.648),(.048,-.123,1.616),(.063,-.141,1.582),(.056,-.146,1.550)], .024),
    ([(.034,-.078,1.645),(.077,-.110,1.610),(.102,-.126,1.570),(.112,-.129,1.510)], .023),
]
for index, (points, width) in enumerate(locks):
    verts=[]; faces=[]; rings=24; count=10
    for j in range(rings):
        t=j/(rings-1); p=catmull(points,t)
        tangent=(catmull(points,min(1,t+.004))-catmull(points,max(0,t-.004))).normalized()
        axis=Vector((tangent.z,0,-tangent.x)).normalized()
        taper=(.65+.55*math.sin(t*math.pi))*(1-t**5)*.98+.018
        for k in range(count):
            a=k/count*math.tau
            verts.append(tuple(p+axis*(width*taper*math.cos(a))+Vector((0,math.sin(a)*.007*taper,0))))
    for j in range(rings-1):
        for k in range(count):
            a=j*count+k; b=j*count+(k+1)%count
            faces.append((a,b,b+count,a+count))
    faces += [tuple(reversed(range(count))), tuple((rings-1)*count+k for k in range(count))]
    data=bpy.data.meshes.new('Reference swept fringe'); data.from_pydata(verts,[],faces)
    data.materials.append(hair); uv=data.uv_layers.new(name='UVMap')
    for face in data.polygons:
        face.use_smooth=True
        for li in face.loop_indices:
            vi=data.loops[li].vertex_index; uv.data[li].uv=((vi%count)/count,(vi//count)/(rings-1))
    obj=bpy.data.objects.new('V10 swept explorer fringe '+str(index),data)
    bpy.context.scene.collection.objects.link(obj); parent(obj,head)

# Soften coarse source hair facets; facial topology and eyelid shapes do not
# change, and the close-up and mobile tiers share the same fringe identity.
for obj in list(root.children_recursive):
    if obj.type!='MESH' or obj.hide_render: continue
    if obj.name.endswith(('_hair_main','_hair_strand')):
        bpy.context.view_layer.objects.active=obj
        mod=obj.modifiers.new('Retained hair silhouette subdivision','SUBSURF');mod.levels=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if obj.name.endswith('_eyebrows'):
        # Thinner, tapered brows preserve every expression delta.
        sets=[key.data for key in obj.data.shape_keys.key_blocks] if obj.data.shape_keys else [obj.data.vertices]
        inverse=obj.matrix_world.inverted()
        for values in sets:
            for sign in [-1,1]:
                points=[v for v in values if (obj.matrix_world@v.co).x*sign>0]
                if not points: continue
                center=sum((obj.matrix_world@v.co for v in points),Vector())/len(points)
                for v in points:
                    p=obj.matrix_world@v.co; edge=max(0,min(1,(abs(p.x)-.06)/.045))
                    p.z=center.z+(p.z-center.z)*(.62-.25*edge)
                    v.co=inverse@p
        if obj.data.shape_keys:
            for v,k in zip(obj.data.vertices,obj.data.shape_keys.key_blocks['Basis'].data):v.co=k.co

root['v10_reference_cargo_fringe']=True
for obj in root.children_recursive:
    if obj.type=='MESH' and obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:key.value=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
report={'reference':'074_a3ba842c39b243196a3b5b1eadb4bc43.png',
        'changes':['retained cargo geometry relaxed, ankle kept fitted','pockets and seams fitted',
                   'retained sneakers recolored and proportioned','five overlapping swept fringe meshes',
                   'source hair subdivided once','tapered brows retain expression topology'],
        'paid_calls':0,'originals_retained':True,'visual_acceptance':'pending actual browser comparison'}
(ROOT/'outputs/v10-explore/characters-v10/student-reference-tailoring.json').write_text(json.dumps(report,indent=2))
print('STUDENT_REFERENCE_TAILORING_SAVED',flush=True)
