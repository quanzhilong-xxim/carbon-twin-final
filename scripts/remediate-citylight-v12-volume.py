"""Stage source-authored glass settings; never change the target's structure."""
import bpy, bmesh, os, json, hashlib, struct, math, sys
from collections import Counter
from mathutils import Vector
ROOT='C:/Users/23242/Desktop/CarbonTwin_App'
LOW='--lod' in sys.argv
TAG='light-court-lod' if LOW else 'light-court'
OUT=ROOT+('/work/v5-lod-material-staged' if LOW else '/work/v5-material-staged')
os.makedirs(OUT,exist_ok=True)
SOURCE=ROOT+('/docs/citylight/master/rollback/v5-r13-before-lod-glass/work/light-court-lod-v12.blend' if LOW else '/docs/citylight/master/rollback/v5-r7-before-solid-glazing/work/light-court-v12.blend')
assert hashlib.sha256(open(SOURCE,'rb').read()).hexdigest()==('1719b37c92e8e815f328582fbe03a29c239db3cdb8214f6e2f400ef2121255dd' if LOW else 'b4d7ce6e93ba5614c3c0172b5b5073b27ca60f8d2db0cdb91f289f230990dc3d')
bpy.ops.wm.open_mainfile(filepath=SOURCE)

def srgb(s):
    vals=[int(s[i:i+2],16)/255 for i in (0,2,4)]
    return [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals]

def fingerprint(obj):
    return hashlib.sha256(json.dumps({'matrix':[list(r)for r in obj.matrix_world],
        'v':[list(v.co)for v in obj.data.vertices],
        'f':[list(p.vertices)for p in obj.data.polygons]},separators=(',',':')).encode()).hexdigest()

before={o.name:fingerprint(o)for o in bpy.context.scene.objects if o.type=='MESH'}
panel_proof=[]
legacy_roles=[]
for name,thickness in [('v12-glass',.024),('v12-lobby-glass',.012)]:
    obj=bpy.data.objects[name];old=obj.data
    verts=[tuple(v.co)for v in old.vertices];faces=[tuple(p.vertices)for p in old.polygons]
    edges=Counter(tuple(sorted((face[i],face[(i+1)%len(face)])))for face in faces for i in range(len(face)))
    count=0
    # Keep original outward pane faces exactly, add inward back and return edges.
    # Closed existing gallery rail components are retained, never re-extruded.
    for p in old.polygons:
        face=tuple(p.vertices)
        if not all(edges[tuple(sorted((face[i],face[(i+1)%len(face)])))]==1 for i in range(len(face))):continue
        assert len(face)==4
        n=len(verts);verts.extend(tuple(old.vertices[i].co-p.normal*thickness)for i in face)
        back=tuple(n+i for i in range(4));faces.append(tuple(reversed(back)))
        for i in range(4):j=(i+1)%4;faces.append((face[i],back[i],back[j],face[j]))
        count+=1
    # Separate the three originally closed pieces by their actual thickness.
    # Do not resize them to match the lobby's 12 mm equivalent panel.
    roles={}
    if name=='v12-lobby-glass':
        vertex_faces={i:set()for i in range(len(old.vertices))}
        for p in old.polygons:
            for i in p.vertices:vertex_faces[i].add(p.index)
        unseen=set(range(len(old.polygons)))
        while unseen:
            pending=[unseen.pop()];component=[];indices=set()
            while pending:
                fi=pending.pop();component.append(fi)
                for vi in old.polygons[fi].vertices:
                    indices.add(vi)
                    for linked in vertex_faces[vi]:
                        if linked in unseen:unseen.remove(linked);pending.append(linked)
            if len(component)<=1:continue
            bounds=[max(old.vertices[i].co[a]for i in indices)-min(old.vertices[i].co[a]for i in indices)for a in range(3)]
            measured=min(bounds)
            assert abs(measured-.015)<1e-5 or abs(measured-.016)<1e-5, bounds
            role='v12-lobby-rail-glass' if abs(measured-.015)<1e-5 else 'v12-canopy-glass'
            for fi in component:roles[fi]=role
            legacy_roles.append({'role':role,'faces':len(component),'measuredThicknessMetres':measured,'geometryChanged':False})
    mesh=bpy.data.meshes.new(name+'-closed-panels');mesh.from_pydata(verts,[],faces);mesh.update()
    for mat in old.materials:mesh.materials.append(mat)
    # Preserve the original pane UVs as well as its positions.  Rebuilding a
    # Mesh does not copy loop attributes automatically.  Side returns use a
    # physical scale; the inward back face reuses the matching outer UVs.
    uv_proof={}
    for old_uv in old.uv_layers:
        uv=mesh.uv_layers.new(name=old_uv.name)
        extra=[]
        for p in old.polygons:
            for loop_index in p.loop_indices:
                uv.data[loop_index].uv=old_uv.data[loop_index].uv
            face=tuple(p.vertices)
            if not all(edges[tuple(sorted((face[i],face[(i+1)%len(face)])))]==1 for i in range(len(face))):continue
            coords=[tuple(old_uv.data[i].uv)for i in p.loop_indices]
            extra.append(list(reversed(coords)))
            for i in range(4):
                j=(i+1)%4;length=(old.vertices[face[j]].co-old.vertices[face[i]].co).length/4
                extra.append([(0,0),(0,thickness/4),(length,thickness/4),(length,0)])
        for p,coords in zip(list(mesh.polygons)[len(old.polygons):],extra):
            for loop_index,coord in zip(p.loop_indices,coords):uv.data[loop_index].uv=coord
        assert all(tuple(uv.data[i].uv)==tuple(old_uv.data[i].uv)for p in old.polygons for i in p.loop_indices)
        uv_proof[old_uv.name]={'originalLoopUVsExact':True,'originalLoops':len(old_uv.data),'newLoops':len(uv.data)}
    obj.data=mesh
    obj['v5_legacy_face_roles']=json.dumps(roles)
    assert all((mesh.vertices[i].co-v.co).length==0 for i,v in enumerate(old.vertices))
    bm=bmesh.new();bm.from_mesh(mesh);bad=sum(not e.is_manifold for e in bm.edges);bm.free()
    assert bad==0, name+' has non-manifold edges: '+str(bad)
    panel_proof.append({'name':name,'thicknessMetres':thickness,'newClosedPanels':count,
        'allOriginalOuterVerticesExact':True,'nonManifoldEdges':bad,'oldVertices':len(old.vertices),
        'newVertices':len(mesh.vertices),'newFaces':len(mesh.polygons),'uvLayers':uv_proof})
# Blender's exporter reads the unconnected glTF Material Output Thickness socket.
# It is metadata for the real-time thin-sheet equivalent, not solidified geometry.
for name,color,thickness,atten,rough,coat in [
    ('v12-glass','e4efee',.024,'dbeae5',.035,.65),
    ('v12-lobby-glass','f3f5f1',.012,'f3f8f5',.025,0)]:
    mat=bpy.data.materials[name];nodes=mat.node_tree.nodes
    p=nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*srgb(color),1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=0
    p.inputs['IOR'].default_value=1.52;p.inputs['Transmission Weight'].default_value=.96
    p.inputs['Coat Weight'].default_value=coat;p.inputs['Coat Roughness'].default_value=.065
    absorption=nodes.new('ShaderNodeVolumeAbsorption');absorption.name='V12 optical attenuation'
    absorption.inputs['Color'].default_value=(*srgb(atten),1)
    absorption.inputs['Density'].default_value=1/12
    mat.node_tree.links.new(absorption.outputs['Volume'],nodes.get('Material Output').inputs['Volume'])
    group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
    group.interface.new_socket(name='Thickness',in_out='INPUT',socket_type='NodeSocketFloat')
    settings=nodes.new('ShaderNodeGroup');settings.node_tree=group;settings.inputs['Thickness'].default_value=thickness
    mat['representation']='Closed single equivalent solid panel, not a two-pane IGU or product-calibrated low-E stack'

lobby=bpy.data.objects['v12-lobby-glass']
role_indices={}
for role,thickness in [('v12-lobby-rail-glass',.015),('v12-canopy-glass',.016)]:
    mat=bpy.data.materials['v12-lobby-glass'].copy();mat.name=role
    settings=next(n for n in mat.node_tree.nodes if n.type=='GROUP' and n.node_tree.name.startswith('glTF Material Output'))
    settings.inputs['Thickness'].default_value=thickness
    lobby.data.materials.append(mat);role_indices[role]=len(lobby.data.materials)-1
for face,role in json.loads(lobby['v5_legacy_face_roles']).items():
    lobby.data.polygons[int(face)].material_index=role_indices[role]
del lobby['v5_legacy_face_roles']

after={o.name:fingerprint(o)for o in bpy.context.scene.objects if o.type=='MESH'}
assert all(before[n]==after[n]for n in before if n not in ['v12-glass','v12-lobby-glass']),'Non-glazing geometry changed'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/'+TAG+'-v12.blend')
bpy.ops.export_scene.gltf(filepath=OUT+'/'+TAG+'.glb',export_format='GLB',export_yup=True,export_apply=True)
b=open(OUT+'/'+TAG+'.glb','rb').read();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n])
report={'status':'STAGED_NOT_PROMOTED','lod':LOW,'source':SOURCE,'nonGlazingGeometryUnchanged':True,'panels':panel_proof,'preservedLegacyComponents':legacy_roles,
    'materials':[m for m in d['materials'] if 'glass' in m['name']],
    'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
with open(OUT+'/material-parity.json','w',encoding='utf8')as f:json.dump(report,f,indent=2)
print(json.dumps(report))
