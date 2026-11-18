"""Non-destructive facade-detail pass on the existing V12 source.

Read the verified rollback source. Preserve every original mesh vertex and face.
Write staging assets only; promotion to the original URL is a separate operation.
No network, service API, external model, or second building.
"""
import bpy, math, os, json, hashlib, struct
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE=os.path.join(ROOT,'docs/citylight/master/rollback/v5-r1-before/work/light-court-v12.blend')
OUT=os.path.join(ROOT,'work/v5-glazing-staged')
os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=SOURCE)

def fingerprint(obj):
    payload={'matrix':[list(row) for row in obj.matrix_world],
             'vertices':[list(v.co) for v in obj.data.vertices],
             'faces':[list(p.vertices) for p in obj.data.polygons]}
    return hashlib.sha256(json.dumps(payload,separators=(',',':')).encode()).hexdigest()

before={o.name:fingerprint(o) for o in bpy.context.scene.objects if o.type=='MESH'}
verts={'v12-gasket':[],'v12-spacer':[]};faces={k:[] for k in verts}

def strip(key,a,b,normal,width,depth,offset):
    tangent=(b-a).normalized();across=normal.cross(tangent).normalized()
    center=(a+b)*.5+normal*offset;length=(b-a).length
    start=len(verts[key])
    # Front seal strip and recessed edge spacer are thin architectural surfaces.
    # Six-sided boxes here tripled GLB size for subpixel hidden faces; avoid that.
    span=across*width if key=='v12-gasket' else normal*depth
    for x,y in [(-1,-1),(1,-1),(1,1),(-1,1)]:
        verts[key].append(tuple(center+tangent*(x*length*.5)+span*(y*.5)))
    faces[key].append(tuple(start+i for i in [0,1,2,3]))

glass=bpy.data.objects['v12-glass'];pane_count=0
for polygon in glass.data.polygons:
    if len(polygon.vertices)!=4:raise RuntimeError('Unexpected pane topology')
    corners=[glass.matrix_world@glass.data.vertices[i].co for i in polygon.vertices]
    normal=(glass.matrix_world.to_3x3()@polygon.normal).normalized()
    center=sum(corners,Vector())/4
    # 12mm EPDM seal and 6mm aluminium spacer, inward of the locked outer plane.
    # The renderer still uses an explicitly thin-sheet equivalent glazing model;
    # these edge components do not pretend to simulate two optical glass panes.
    for i,a in enumerate(corners):
        b=corners[(i+1)%4]
        inset=(center-(a+b)*.5).normalized()*.009
        strip('v12-gasket',a+inset,b+inset,normal,.012,.012,-.008)
        strip('v12-spacer',a+inset,b+inset,normal,.006,.018,-.024)
    pane_count+=1

for key,color,metal,rough in [('v12-gasket',(.012,.015,.016,1),0,.78),
                               ('v12-spacer',(.24,.27,.28,1),.75,.32)]:
    mat=bpy.data.materials.new(key);mat.use_nodes=True
    node=mat.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=color
    node.inputs['Metallic'].default_value=metal;node.inputs['Roughness'].default_value=rough
    mesh=bpy.data.meshes.new(key);mesh.from_pydata(verts[key],[],faces[key]);mesh.update()
    obj=bpy.data.objects.new(key,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mat)

for name,rough,coat in [('v12-glass',.035,.65),('v12-lobby-glass',.025,0)]:
    mat=bpy.data.materials[name];node=mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Roughness'].default_value=rough;node.inputs['IOR'].default_value=1.52
    node.inputs['Transmission Weight'].default_value=.96
    node.inputs['Coat Weight'].default_value=coat;node.inputs['Coat Roughness'].default_value=.065

after={name:fingerprint(bpy.data.objects[name]) for name in before}
if before!=after:raise RuntimeError('Original geometry changed; stop before export')

report={'status':'STAGED_NOT_ACCEPTED','paneCount':pane_count,'originalMeshCount':len(before),
        'originalGeometryUnchanged':before==after,'originalGeometryFingerprints':before,
        'newMeshes':[{ 'name':k,'vertices':len(verts[k]),'triangles':len(faces[k])*2}for k in verts],
        'optics':'Thin-sheet equivalent; edge seals/spacers are real geometry, not two-pane ray tracing',
        'source':SOURCE,'blender':bpy.app.version_string}
bpy.context.scene['target_identity']='CL-T01-V12'
bpy.context.scene['glazing_representation']=report['optics']
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'light-court-v12.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'light-court.glb'),export_format='GLB',export_yup=True,export_apply=True)
for ext in ['blend','glb']:
    filename='light-court-v12.blend' if ext=='blend' else 'light-court.glb'
    data=open(os.path.join(OUT,filename),'rb').read()
    report[ext]={'file':filename,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
with open(os.path.join(OUT,'geometry-proof.json'),'w',encoding='utf8')as f:json.dump(report,f,indent=2)
print('V12_GLAZING_STAGED '+json.dumps({k:v for k,v in report.items()if k!='originalGeometryFingerprints'}))
