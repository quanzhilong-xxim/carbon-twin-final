"""Bake original six sample rooms AND their original furniture. Isolated trial.

Adds UV2 only, no position/topology/UV0/AO edit. Local Cycles CPU, no service.
Diffuse direct+indirect without albedo; static lighting, not runtime GI or lux.
"""
import bpy,json,hashlib,math,time,struct,zlib
import numpy as np
from pathlib import Path
import argparse,sys
R=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source',required=True,type=Path)
parser.add_argument('--output',required=True,type=Path)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
S=args.source.resolve();D=args.output.resolve();E=R/'work/v5-room-light-inputs'
assert D.is_relative_to(R/'work'), 'Only a fresh work subdirectory is permitted'
assert not D.exists(), 'Never overwrite an existing source or bake'
D.mkdir(parents=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(S)=='058116a9f3e934d3e21db392e890814890956599211deb2f2c679669bc546010'
bpy.ops.wm.open_mainfile(filepath=str(S));scene=bpy.context.scene;start=time.time()
original_uv_counts={o.name:len(o.data.uv_layers) for o in scene.objects if o.type=='MESH'}
def fp(o):
    m=o.data
    return hashlib.sha256(repr((list(o.matrix_world),[tuple(v.co)for v in m.vertices],[tuple(p.vertices)for p in m.polygons],[(u.name,[tuple(x.uv)for x in u.data])for u in list(m.uv_layers)[:original_uv_counts[o.name]]])).encode()).hexdigest()
before={o.name:fp(o)for o in scene.objects if o.type=='MESH'}
original=list(scene.objects);oldworld=scene.world
world=bpy.data.worlds.new('R29 isolated dark bake world');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Strength'].default_value=0;scene.world=world
hidden=[];emission=[]
for m in bpy.data.materials:
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type=='BSDF_PRINCIPLED':
                sock=n.inputs['Emission Strength'];assert not sock.is_linked;emission.append((sock,sock.default_value));sock.default_value=0
for o in original:
    if o.type=='LIGHT' or (o.type=='MESH' and any(m and 'glass' in m.name for m in o.data.materials)):
        hidden.append((o,o.hide_render));o.hide_render=True
# Match the existing web room base colors during transport, restore before export.
roomcolors=[]
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
for name,h in [('v12-room-0','9c9d91'),('v12-room-1','6b7b78')]:
    m=bpy.data.materials.get(name)
    if m:
        n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        c=n.inputs['Base Color'];assert not c.is_linked
        roomcolors.append((c,tuple(c.default_value)))
        c.default_value=tuple(linear(int(h[i:i+2],16)/255)for i in (0,2,4))+(1,)
verts=[];faces=[];matindices=[];mapping=[];contexts=[];targets=[];receivermats=[];matlookup={};tempmeshes=[]
def inside(v):return -15.63<=v.x<=.02 and -13.55<=v.y<=-9.65 and 14.48<=v.z<=21.39
for o in original:
    if o.type!='MESH' or o.hide_render:continue
    # Preserve emissive fixtures/screens and transmissive glazing themselves.
    if any(m and any(s in m.name for s in ['glass','light','lamp','screen'])for m in o.data.materials):continue
    selected=[p for p in o.data.polygons if all(inside(o.matrix_world@o.data.vertices[i].co)for i in p.vertices)]
    if not selected:continue
    assert o.matrix_world.is_identity,'Recipe is only for the inspected joined original meshes'
    targets.append(o);indices={p.index for p in selected}
    # Coincident originals are hidden but every remaining source face remains
    # a real occluder/indirect contributor in its original position.
    cm=bpy.data.meshes.new('R29 remaining '+o.name)
    cm.from_pydata([tuple(v.co)for v in o.data.vertices],[],[tuple(p.vertices)for p in o.data.polygons if p.index not in indices]);cm.update()
    for m in o.data.materials:cm.materials.append(m)
    for q,p in zip(cm.polygons,[p for p in o.data.polygons if p.index not in indices]):q.material_index=p.material_index
    co=bpy.data.objects.new(cm.name,cm);scene.collection.objects.link(co);contexts.append(co);tempmeshes.append(cm)
    hidden.append((o,o.hide_render));o.hide_render=True
    local={}
    for p in selected:
        poly=[]
        for vi in p.vertices:
            if vi not in local:local[vi]=len(verts);verts.append(tuple(o.data.vertices[vi].co))
            poly.append(local[vi])
        faces.append(tuple(poly));mapping.append(dict(object=o.name,polygon=p.index))
        m=o.data.materials[p.material_index]
        if m.name not in matlookup:
            c=m.copy();c.name='R29 receiver '+m.name
            n=next(n for n in c.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
            # Diffuse color=False removes first-hit albedo itself. Keep the
            # actual PBR colors/roughness/metalness for later path bounces.
            matlookup[m.name]=len(receivermats);receivermats.append(c)
        matindices.append(matlookup[m.name])
mesh=bpy.data.meshes.new('R29 original sample receiver');mesh.from_pydata(verts,[],faces);mesh.update();tempmeshes.append(mesh)
receiver=bpy.data.objects.new(mesh.name,mesh);scene.collection.objects.link(receiver)
for m in receivermats:mesh.materials.append(m)
for p,i in zip(mesh.polygons,matindices):p.material_index=i
bpy.ops.object.select_all(action='DESELECT');receiver.select_set(True);bpy.context.view_layer.objects.active=receiver
mesh.uv_layers.new(name='Sample room lamp irradiance')
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.006,area_weight=1,correct_aspect=True)
bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(rotate=True,shape_method='CONCAVE',margin_method='FRACTION',margin=.002,scale=True)
bpy.ops.object.mode_set(mode='OBJECT')
# Reserve a blank black UV region for every unaffected original face.
for loop in mesh.uv_layers.active.data:loop.uv.x=loop.uv.x*.96+.01;loop.uv.y=loop.uv.y*.96+.01
for o in targets:
    while len(o.data.uv_layers)<2:o.data.uv_layers.new(name='Unaffected UV placeholder')
    assert len(o.data.uv_layers)==2
    u=o.data.uv_layers.new(name='Sample room lamp irradiance')
    for loop in u.data:loop.uv=(.999,.999)
for p,row in zip(mesh.polygons,mapping):
    o=bpy.data.objects[row['object']];src=o.data.polygons[row['polygon']]
    assert len(p.loop_indices)==len(src.loop_indices)
    row['uv']=[list(mesh.uv_layers.active.data[i].uv)for i in p.loop_indices]
    for si,ri in zip(src.loop_indices,p.loop_indices):o.data.uv_layers[-1].data[si].uv=mesh.uv_layers.active.data[ri].uv
    o.data.uv_layers[0].active_render=True
lights=json.loads((E/'room-r26-original-light-inspection.json').read_text())['lights'];rig=[];lightobjects=[]
for i,row in enumerate(lights):
    d=bpy.data.lights.new('Sample original strip '+str(i),'AREA');d.shape='RECTANGLE'
    d.size=row['max'][0]-row['min'][0];d.size_y=row['max'][1]-row['min'][1]
    # Occupancy is applied exactly once, from the original room index.
    on=.68 if row['object']=='v12-light-0' else .025
    d.energy=60*on;d.color=(1,.80,.58)
    o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o)
    o.location=(row['center'][0],row['center'][1],row['min'][2]-.003)
    lightobjects.append(o);rig.append(dict(source=row['object'],position=list(o.location),direction=[0,0,-1],size=[d.size,d.size_y],referencePower=d.energy,occupancy=on))
RES=2048
image=bpy.data.images.new('R29 irradiance raw',width=RES,height=RES,alpha=False,float_buffer=True);image.colorspace_settings.name='Non-Color'
for m in receivermats:
    n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=image;m.node_tree.nodes.active=n
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=2048;scene.cycles.max_bounces=6;scene.cycles.diffuse_bounces=4
scene.render.bake.use_pass_direct=True;scene.render.bake.use_pass_indirect=True;scene.render.bake.use_pass_color=False
scene.render.bake.margin=3;scene.render.bake.use_clear=True
(D/'uv-mapping-before-bake.json').write_text(json.dumps(mapping),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(D/'pre-bake.blend'))
print('R29_BAKE_START '+json.dumps(dict(faces=len(faces),materials=list(matlookup),resolution=RES,samples=2048)),flush=True)
bpy.ops.object.bake(type='DIFFUSE')
raw=np.array(image.pixels[:],dtype=np.float32).reshape(RES,RES,4);assert np.isfinite(raw).all()
np.save(D/'sample-room-night-linear.npy',raw)
# Keep raw radiance and fixed reference scale. No percentile normalization that
# would change scene exposure between revisions, and no beauty-image filtering.
SCALE=4.0;rgb=np.maximum(raw[:,:,:3],0)/SCALE
reserved=int(RES*.98)
rgb[reserved:,:,:]=0;rgb[:,reserved:,:]=0
encoded=np.rint(np.where(rgb<=.0031308,rgb*12.92,1.055*np.power(rgb,1/2.4)-.055)*255).clip(0,255).astype(np.uint8)[::-1]
def chunk(k,d):return struct.pack('>I',len(d))+k+d+struct.pack('>I',zlib.crc32(k+d)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',RES,RES,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\0'+r.tobytes()for r in encoded)))+chunk(b'IEND',b'')
(D/'sample-room-night-irradiance.png').write_bytes(png)
for sock,value in emission:sock.default_value=value
for sock,value in roomcolors:sock.default_value=value
for o,value in hidden:o.hide_render=value
scene.world=oldworld
for o in [receiver]+contexts:
    bpy.data.objects.remove(o,do_unlink=True)
for m in tempmeshes:bpy.data.meshes.remove(m)
for m in receivermats:bpy.data.materials.remove(m)
for o in lightobjects:o.hide_render=True
integrity=[dict(object=o.name,originalUVCount=original_uv_counts[o.name],totalUVCount=len(o.data.uv_layers),before=before[o.name],after=fp(o),exact=fp(o)==before[o.name]) for o in original if o.type=='MESH']
(D/'source-integrity.json').write_text(json.dumps(integrity,indent=2),encoding='utf-8')
assert all(x['exact'] for x in integrity), 'Original geometry/UV assertion failed; see source-integrity.json'
# Asset export contains no new lights/nodes, only additional UVs. Original PBR
# material values stay unchanged; the web explicitly binds the local lightmap.
# Keep actual area rig in editable source, excluded from GLB via export_lights=False.
bpy.ops.export_scene.gltf(filepath=str(D/'light-court.glb'),export_format='GLB',export_yup=True,export_apply=True,export_lights=False)
# Save the geometry/UV edit plus a packed copy of its real baked data.
for o in lightobjects:o.hide_render=False
packed=bpy.data.images.load(str(D/'sample-room-night-irradiance.png'));packed.name='Sample room lamp irradiance';packed.colorspace_settings.name='sRGB';packed.pack()
scene['sample_room_bake']=json.dumps(dict(image=packed.name,uv=2,scale=SCALE,lightRig=rig,mode='Static diffuse direct+indirect reference; runtime night factor; not runtime GI'))
bpy.ops.wm.save_as_mainfile(filepath=str(D/'light-court-v12.blend'))
report=dict(status='STAGED_NOT_ACCEPTED',source=str(S),sourceSha256=sha(S),geometryTopologyTransformsOriginalUVsAndAOExact=True,faces=len(mapping),materials=list(matlookup),mapping=mapping,rig=rig,uvChannel=2,blackUnaffectedUV=[.999,.999],atlas=dict(resolution=[RES,RES],scale=SCALE,encoding='IEC sRGB OETF, 8bit PNG, flipY=false in Three',rawRange=[float(raw[:,:,:3].min()),float(raw[:,:,:3].max())],clippedTexelFraction=float((rgb>1).any(axis=2).mean())),bake=dict(engine='Cycles CPU',samples=2048,direct=True,indirect=True,color=False,worldStrength=0,diffuseBounces=4,filter='none',webRoomAlbedoMatchedDuringBake=True,firstHitAlbedoExcludedByDiffusePass=True,limits=['Static local diffuse transport only; no runtime GI or measured photometry','Reference area proxies occupy original lamp undersides','Metallic specular reflection remains real-time; diffuse map follows original PBR response','All six sample rooms only; whole building unfinished']),glbSha256=sha(D/'light-court.glb'),blendSha256=sha(D/'light-court-v12.blend'),imageSha256=sha(D/'sample-room-night-irradiance.png'),elapsedSeconds=time.time()-start,paidApiCalls=0)
(D/'sample-room-night-proof.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('R29_STAGE_DONE '+json.dumps({k:report[k]for k in ['faces','materials','glbSha256','elapsedSeconds']}),flush=True)
