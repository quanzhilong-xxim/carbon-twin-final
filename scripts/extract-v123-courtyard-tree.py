"""Extract only a previously authored landscape tree; preserve the full tower."""
import bpy, os, json, hashlib
from mathutils import Vector
root=r'C:\Users\23242\Desktop\CarbonTwin_App'
source=os.path.join(root,'public','models','citylight','v12','light-court.glb')
dest=os.path.join(root,'public','models','behaviour-v123')
os.makedirs(dest,exist_ok=True)
output=os.path.join(dest,'courtyard-tree.glb')
if os.path.exists(output): raise RuntimeError('Refuse to overwrite existing derived asset')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
kept=[]
for obj in list(bpy.data.objects):
    if obj.type!='MESH' or obj.name not in ['bark','v12-leaf-a','v12-leaf-b']: continue
    verts=[]; faces=[]; mapping={}
    for polygon in obj.data.polygons:
        coords=[obj.matrix_world@obj.data.vertices[i].co for i in polygon.vertices]
        if not all(-34<p.x<-26 and -12<p.y<-4 and -.1<p.z<8 for p in coords): continue
        face=[]
        for index,p in zip(polygon.vertices,coords):
            if index not in mapping:
                mapping[index]=len(verts);verts.append((p.x+30,p.y+8,p.z-.45))
            face.append(mapping[index])
        faces.append(face)
    if not faces: continue
    mesh=bpy.data.meshes.new(obj.name+'-landscape');mesh.from_pydata(verts,[],faces);mesh.update()
    new=bpy.data.objects.new(obj.name+'-landscape',mesh);bpy.context.collection.objects.link(new)
    for mat in obj.data.materials: mesh.materials.append(mat)
    kept.append(new)
if len(kept)<2: raise RuntimeError('Did not isolate a complete existing tree')
bpy.ops.object.select_all(action='DESELECT')
for obj in kept: obj.select_set(True)
bpy.context.view_layer.objects.active=kept[0]
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',use_selection=True,export_animations=False)
manifest={'source':'/models/citylight/v12/light-court.glb','sourceSha256':hashlib.sha256(open(source,'rb').read()).hexdigest(),'asset':'courtyard-tree.glb','scope':'Original CarbonTwin authored courtyard tree only. No tower geometry. Ground-level tree at original Blender (-30,-8).','meshCount':len(kept),'vertices':sum(len(o.data.vertices)for o in kept),'faces':sum(len(o.data.polygons)for o in kept),'sha256':hashlib.sha256(open(output,'rb').read()).hexdigest()}
json.dump(manifest,open(os.path.join(dest,'courtyard-tree.sources.json'),'w'),indent=2)
print('CT_EXTRACT_OK '+json.dumps(manifest))
