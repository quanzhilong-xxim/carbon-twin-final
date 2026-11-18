"""Stage finite-distance AO on 42 original room-shell quads; no geometry edits.

Only the six existing visible sample rooms. Original UV0 and every coordinate,
polygon, object transform remain exact. New UV1 maps other faces to white.
AO is static local indirect-light occlusion, not GI or direct-light baking.
"""
import bpy,bmesh,json,hashlib,struct,math
import numpy as np
from pathlib import Path
import argparse,sys
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source',required=True,type=Path)
parser.add_argument('--expected-source-sha256',required=True)
parser.add_argument('--output',required=True,type=Path)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
SOURCE=args.source.resolve();OUT=args.output.resolve()
assert OUT.is_relative_to(ROOT/'work'), 'Bake only to a new project work subdirectory'
assert not OUT.exists(), 'Never overwrite an earlier source, asset or failed experiment'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==args.expected_source_sha256
assert args.expected_source_sha256=='fd973e5540a4fa1436c91bf83da58788ceaa49decc6926f181337bbad29bcab3', 'This UV recipe is pinned to the audited original source'
OUT.mkdir(parents=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
def fp(o):
    mesh=o.data
    return hashlib.sha256(repr((list(o.matrix_world),[tuple(v.co)for v in mesh.vertices],[tuple(p.vertices)for p in mesh.polygons],[(u.name,[tuple(v.uv)for v in u.data])for u in list(mesh.uv_layers)[:1]])).encode()).hexdigest()
before={o.name:fp(o)for o in bpy.context.scene.objects if o.type=='MESH'}
targets=[];verts=[];faces=[];uvs=[];mapping=[];contexts=[];hidden=[]
RES=1024;TILE=128;WHITE=(1020.5/RES,1020.5/RES)
for o in list(bpy.context.scene.objects):
    if o.type!='MESH' or not o.name.startswith('v12-room-'):continue
    selected=[]
    for p in o.data.polygons:
        coords=[o.matrix_world@o.data.vertices[i].co for i in p.vertices]
        if all(-15.63<=v.x<=.02 and -13.55<=v.y<=-9.65 and 14.48<=v.z<=21.39 for v in coords):selected.append(p.index)
    if not selected:continue
    assert o.matrix_world.is_identity
    targets.append(o)
    uv=o.data.uv_layers.new(name='Room shell AO')
    for loop in uv.data:loop.uv=WHITE
    for pi in selected:
        p=o.data.polygons[pi];coords=[o.data.vertices[i].co.copy()for i in p.vertices]
        axis=max(range(3),key=lambda i:abs(p.normal[i]));axes=[i for i in range(3)if i!=axis]
        lo=[min(v[a]for v in coords)for a in axes];hi=[max(v[a]for v in coords)for a in axes]
        lengths=[hi[i]-lo[i]for i in range(2)];assert min(lengths)>.01
        # Metric aspect ratios and 6px gutters; no UV overlap or wall stretching.
        tile=len(faces);tx=tile%8;ty=tile//8
        scale=(TILE-13)/max(lengths)
        offset=len(verts);verts.extend(tuple(v)for v in coords);faces.append(tuple(range(offset,offset+len(coords))))
        tile_uv=[]
        for li,v in zip(p.loop_indices,coords):
            co=tuple((tx*TILE+6.5+(v[axes[0]]-lo[0])*scale)/RES if i==0 else (ty*TILE+6.5+(v[axes[1]]-lo[1])*scale)/RES for i in range(2))
            uv.data[li].uv=co;uvs.append(co);tile_uv.append(co)
        mapping.append({'object':o.name,'polygon':pi,'tile':[tx,ty],'normal':list(p.normal),'uv':tile_uv,'dimensionsMetres':lengths})
    # Keep every other original room shell as an occluder while hiding only the
    # coincident originals. Temporary objects are removed before save/export.
    selected=set(selected);mesh=bpy.data.meshes.new('R25 context temporary')
    mesh.from_pydata([tuple(v.co)for v in o.data.vertices],[],[tuple(p.vertices)for p in o.data.polygons if p.index not in selected]);mesh.update()
    ctx=bpy.data.objects.new('R25 context temporary',mesh);bpy.context.collection.objects.link(ctx);contexts.append(ctx)
    hidden.append((o,o.hide_render));o.hide_render=True
assert len(faces)==42 and {o.name for o in targets}=={'v12-room-0','v12-room-1'}
mesh=bpy.data.meshes.new('R25 bake temporary');mesh.from_pydata(verts,[],faces);mesh.update()
uv=mesh.uv_layers.new(name='Room shell AO')
for i,co in enumerate(uvs):uv.data[i].uv=co
obj=bpy.data.objects.new('R25 bake temporary',mesh);bpy.context.collection.objects.link(obj)
img=bpy.data.images.new('v12-sample-room-shell-AO',width=RES,height=RES,alpha=False)
img.colorspace_settings.name='Non-Color';img.pixels.foreach_set(np.ones(RES*RES*4,dtype=np.float32))
material=bpy.data.materials.new('R25 temporary bake');material.use_nodes=True
nodes=material.node_tree.nodes;links=material.node_tree.links
tex=nodes.new('ShaderNodeTexImage');tex.image=img;nodes.active=tex
ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.8;ao.samples=64
emit=nodes.new('ShaderNodeEmission');links.new(ao.outputs['Color'],emit.inputs['Color']);links.new(emit.outputs['Emission'],nodes.get('Material Output').inputs['Surface'])
obj.data.materials.append(material)
for o in bpy.context.scene.objects:
    if o.type=='MESH'and any(m and 'glass'in m.name for m in o.data.materials):hidden.append((o,o.hide_render));o.hide_render=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=20
scene.render.bake.margin=4;scene.render.bake.use_clear=False
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
print('R25_BAKE_START 42 original quads, finite AO .8m, 1024 atlas',flush=True)
bpy.ops.object.bake(type='EMIT')
pixels=np.array(img.pixels[:],dtype=np.float32).reshape((RES,RES,4))
assert np.isfinite(pixels).all()
assert float(pixels[1020,1020,0])>.999,'Untouched faces must read white'
assert float(pixels[:6*TILE,:,0].min())<.9,'Reject an empty white bake'
img.filepath_raw=str(OUT/'room-shell-AO.png');img.file_format='PNG';img.save();img.pack()
for o in targets:
    o.data.uv_layers[0].active_render=True
    m=o.data.materials[0];nodes=m.node_tree.nodes;links=m.node_tree.links
    uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map='Room shell AO'
    tex=nodes.new('ShaderNodeTexImage');tex.image=img;links.new(uvnode.outputs['UV'],tex.inputs['Vector'])
    # The source already has a volume-only group with this base name. Do not
    # mutate its shared sockets; exporter recognises the Blender numeric suffix.
    group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
    group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
    settings=nodes.new('ShaderNodeGroup');settings.node_tree=group;links.new(tex.outputs['Color'],settings.inputs['Occlusion'])
for o,v in hidden:o.hide_render=v
for o in [obj]+contexts:
    mesh=o.data;bpy.data.objects.remove(o,do_unlink=True);bpy.data.meshes.remove(mesh)
bpy.data.materials.remove(material)
assert all(before[o.name]==fp(o)for o in bpy.context.scene.objects if o.type=='MESH')
assert set(before)=={o.name for o in bpy.context.scene.objects if o.type=='MESH'}
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'light-court-v12.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'light-court.glb'),export_format='GLB',export_yup=True,export_apply=True)
raw=(OUT/'light-court.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n])
occlusion=[{'name':m['name'],'occlusion':m.get('occlusionTexture')}for m in j['materials']if m['name'].startswith('v12-room-')]
assert sum(bool(m['occlusion'])for m in occlusion)==2
assert all(m['occlusion'].get('texCoord')==1 for m in occlusion if m['occlusion'])
report={'status':'STAGED_NOT_ACCEPTED','source':str(SOURCE),'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'sourceGeometryTransformsAndOriginalUV0Exact':True,'originalMeshes':len(before),'sampleQuads':42,'roomMaterials':occlusion,'atlas':{'resolution':[RES,RES],'finiteDistanceMetres':.8,'aoSamples':64,'cyclesSamples':20,'whiteRegion':float(pixels[1020,1020,0]),'min':float(pixels[:,:,0].min()),'mean':float(pixels[:,:,0].mean()),'uvChannel':1,'gutterPixels':6},'mapping':mapping,'glb':{'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'meshes':len(j['meshes']),'images':len(j.get('images',[]))},'limits':['Only the six existing sample-room shells; all other room faces read a white atlas tile','No new geometry, GI, direct-light bake, all-building acceptance, or score','LOD unchanged intentionally: sample-fitout remains standard-only'],'paidApiCalls':0}
(OUT/'room-shell-proof.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('R25_STAGE_DONE '+json.dumps(report['glb']),flush=True)
