"""Local reference-driven revision, never overwriting V10 or V104.

Fix the visible puppet seams and disproportionate lip/nose volume found in
the 3035 browser closeups. Retain the licensed topology and six facial morphs.
"""
import bpy, bmesh, math, json, numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/characters-v10'
report = {}

def deform(obj, fn):
    inv = obj.matrix_world.inverted()
    sets = [k.data for k in obj.data.shape_keys.key_blocks] if obj.data.shape_keys else [obj.data.vertices]
    for points in sets:
        for v in points:
            v.co = inv @ fn(obj.matrix_world @ v.co)
    if obj.data.shape_keys:
        for v, basis in zip(obj.data.vertices, obj.data.shape_keys.key_blocks['Basis'].data):
            v.co = basis.co

def face(p, who):
    p = p.copy()
    eye = {'Student': 1.47, 'Business': 1.55, 'City': 1.59}[who]
    mouth = eye - (.104 if who != 'Business' else .095)
    front = max(0, min(1, (-p.y - .065) / .035))
    lip = math.exp(-(p.x / .048)**6 - ((p.z - mouth) / .025)**6) * front
    # Reduce height and projection without moving the eyelids or eye sockets.
    p.z = mouth + (p.z - mouth) * (1 - .43 * lip)
    p.x *= 1 - .12 * lip
    p.y += .006 * lip
    nose = math.exp(-(p.x / .039)**6 - ((p.z - (eye - .061)) / .025)**4) * front
    p.x *= 1 - .14 * nose
    p.y += .007 * nose
    corner = math.exp(-((abs(p.x) - .027) / .012)**2 - ((p.z - mouth) / .012)**2) * front
    p.z += (.003 if who != 'Business' else .0018) * corner
    return p

for who in ['Student', 'Business', 'City']:
    stem = f'CT_{who}_Explore_v104b'
    dest = OUT / (stem + '.blend')
    if dest.exists():
        raise RuntimeError('Candidate exists; refusing compounded geometry edit: ' + str(dest))
    bpy.ops.wm.open_mainfile(filepath=str(OUT / f'CT_{who}_Explore_v104.blend'), load_ui=False, use_scripts=False)
    root = bpy.data.objects[f'CT_{who}_Explore_v104']
    root.name = stem
    head = next(o for o in root.children_recursive if o.type == 'MESH' and o.name.endswith('_head'))
    deform(head, lambda p: face(p, who))
    # Keep neutral-expression construction while preserving blink/gaze deltas.
    for k in head.data.shape_keys.key_blocks:
        k.value = 0

    sleeves = []
    for side in ['ArmRight', 'ArmLeft']:
        arm = bpy.data.objects[side]
        sleeve = next(o for o in arm.children if o.type == 'MESH' and o.name.startswith('Fitted sleeve'))
        cap = next(o for o in arm.children if o.type == 'MESH' and o.name.startswith('V3 rounded sleeve shoulder'))
        # Retain the cap object's pivot, used by the existing runtime elbow rig.
        # A single welded surface gives one continuous normal at the sleeve head.
        cap_name = cap.name
        bpy.ops.object.select_all(action='DESELECT')
        for o in [cap, sleeve]:
            o.hide_set(False)
            o.select_set(True)
        bpy.context.view_layer.objects.active = cap
        bpy.ops.object.join()
        bm = bmesh.new()
        bm.from_mesh(cap.data)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.0012)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(cap.data)
        bm.free()
        for f in cap.data.polygons:
            f.use_smooth = True
        cap.name = cap_name
        # Smooth only the continuous join; preserve the existing elbow folds.
        smooth = cap.modifiers.new('Continuous cloth sleeve normals', 'CORRECTIVE_SMOOTH')
        smooth.factor = .30
        smooth.iterations = 3
        bpy.ops.object.modifier_apply(modifier=smooth.name)
        sleeves.append({'name': cap.name, 'vertices': len(cap.data.vertices), 'shared_shoulder_pivot': True})

    # Match the provided student's soft pink, avoiding the previous burgundy.
    changed_images = []
    if who == 'Student':
        for mat in bpy.data.materials:
            if not mat.use_nodes or not any(s in mat.name.lower() for s in ['hair', 'groom', 'rose', 'lock']):
                continue
            pbr = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not pbr:
                continue
            pbr.inputs['Roughness'].default_value = .53
            pbr.inputs['Specular IOR Level'].default_value = .28
            for node in mat.node_tree.nodes:
                if node.type != 'TEX_IMAGE' or not node.image or not any(l.to_socket.name == 'Base Color' for l in node.outputs['Color'].links):
                    continue
                old = node.image
                name = 'CT_Student_SoftRose_v104b_' + str(len(changed_images))
                im = old.copy()
                im.name = name
                w, h = im.size
                pixels = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
                luma = np.maximum(.01, pixels[:, :, :3].mean(axis=2))
                variation = np.clip(luma / max(.01, np.median(luma)), .65, 1.2)
                pixels[:, :, :3] = np.minimum(1, variation[:, :, None] * np.array([.76, .39, .48]))
                im.pixels.foreach_set(pixels.ravel())
                im.filepath_raw = str(OUT / (name + '.png'))
                im.file_format = 'PNG'
                im.save()
                im.pack()
                node.image = im
                changed_images.append(name)
        # Lighten the eyebrow separately: shape and eye framing stay intact.
        for o in root.children_recursive:
            if o.type == 'MESH' and o.name.endswith('_eyebrows'):
                mat = o.data.materials[0].copy()
                o.data.materials[0] = mat
                p = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
                for l in list(p.inputs['Base Color'].links):
                    mat.node_tree.links.remove(l)
                p.inputs['Base Color'].default_value = (.20, .070, .08, 1)

    root['v104b_browser_reference_fit'] = True
    bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    info = json.loads((OUT / f'CT_{who}_Explore_v104.sources.json').read_text())
    info.update(version='v104b', parent_version='v104', status='candidate: actual browser visual review pending')
    info['reference_fit'] = {'basis_and_all_morphs': True, 'continuous_sleeves': sleeves, 'soft_rose_images': changed_images, 'paid_calls': 0}
    (OUT / (stem + '.sources.json')).write_text(json.dumps(info, indent=2))
    report[who] = info['reference_fit']
    print('REFERENCE_FIT_SAVED', who, flush=True)

(ROOT / 'docs/recovery/v10.4/reference-silhouette-result.json').write_text(json.dumps(report, indent=2))
