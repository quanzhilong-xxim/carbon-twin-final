"""One existing facade sample: additive office fit-out, no envelope changes.

Six original desks behind the existing window preset, two floors/three rooms.
All 38 original meshes and transforms remain byte-identical on export.  Floor
AO is baked from the actual room/furniture and exported as glTF occlusion, not
a lighting photograph. This is a partial sample, not full interior acceptance.
"""
import bpy,bmesh,math,json,hashlib,struct,os,random
from mathutils import Vector
ROOT='C:/Users/23242/Desktop/CarbonTwin_App'
SOURCE=ROOT+'/docs/citylight/master/rollback/v5-r15-before-window-sample/work/light-court-v12.blend'
assert hashlib.sha256(open(SOURCE,'rb').read()).hexdigest()=='b8ef753f28a901bcb25e2b7928b5b479c615c7d73f65da12ba759ca9b5e3b5c0'
OUT=ROOT+'/work/v5-window-staged';os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=SOURCE)
original=set(o.name for o in bpy.context.scene.objects)
def fingerprint(o):
    return hashlib.sha256(repr((list(o.matrix_world),[tuple(v.co)for v in o.data.vertices],[tuple(p.vertices)for p in o.data.polygons])).encode()).hexdigest()
before={o.name:fingerprint(o)for o in bpy.context.scene.objects if o.type=='MESH'}
parts={};materials={};counts={};floors=[]
def mat(name,hex,rough=.6,metal=0):
    values=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
    color=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values]
    m=bpy.data.materials.new('v12-study-'+name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    materials[name]=m;return m
for args in [('ivory','c9c4b7',.65),('graphite','303a3e',.54),('keys','8b9698',.55),('oak','967652',.5),('fabric','536d70',.94),('paper','d4d4c6',.83),('leaf','42604a',.83),('clay','a89a82',.88)]:mat(*args)
def poly(name,verts,faces):
    vs,fs=parts.setdefault(name,([],[]));n=len(vs);vs.extend(verts);fs.extend(tuple(n+i for i in f)for f in faces)
def box(name,pos,size,radius=0):
    bm=bmesh.new();bmesh.ops.create_cube(bm,size=1)
    for v in bm.verts:
        for i in range(3):v.co[i]*=size[i]
    if radius:bmesh.ops.bevel(bm,geom=list(bm.edges),offset=min(radius,min(size)*.23),segments=2,affect='EDGES')
    bm.verts.ensure_lookup_table();bm.verts.index_update()
    poly(name,[tuple(v.co+Vector(pos))for v in bm.verts],[tuple(v.index for v in f.verts)for f in bm.faces]);bm.free()
def ellipsoid(name,pos,radii,u=12,v=8):
    vs=[]
    for j in range(v+1):
        theta=math.pi*(j+.01)/(v+.02)
        for i in range(u):
            a=math.tau*i/u;vs.append((pos[0]+radii[0]*math.sin(theta)*math.cos(a),pos[1]+radii[1]*math.sin(theta)*math.sin(a),pos[2]+radii[2]*math.cos(theta)))
    fs=[]
    for j in range(v):
        for i in range(u):a=j*u+i;b=j*u+(i+1)%u;fs.append((a,b,b+u,a+u))
    fs.extend([tuple(reversed(range(u))),tuple(v*u+i for i in range(u))]);poly(name,vs,fs)
def tube(name,a,b,radius=.007,sides=8):
    a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)))
    if u.length<.001:u=Vector((1,0,0))
    u.normalize();v=axis.cross(u)
    vs=[tuple(p+(u*math.cos(i*math.tau/sides)+v*math.sin(i*math.tau/sides))*radius)for p in [a,b]for i in range(sides)]
    fs=[(i,(i+1)%sides,(i+1)%sides+sides,i+sides)for i in range(sides)]
    fs.extend([tuple(reversed(range(sides))),tuple(sides+i for i in range(sides))]);poly(name,vs,fs)
def pot(x,y,z,seed):
    rng=random.Random(seed);vs=[];sides=16
    for h,r in [(0,.13),(.27,.17),(.27,.145),(.035,.105)]:
        for i in range(sides):a=i*math.tau/sides;vs.append((x+r*math.cos(a),y+r*math.sin(a),z+h))
    fs=[]
    for j in range(3):
        for i in range(sides):a=j*sides+i;b=j*sides+(i+1)%sides;fs.append((a,b,b+sides,a+sides))
    fs.extend([tuple(reversed(range(sides))),tuple(3*sides+i for i in range(sides))]);poly('clay',vs,fs)
    for i in range(13):
        angle=i*2.4;h=rng.uniform(.25,.65);r=rng.uniform(.09,.26);tip=(x+r*math.cos(angle),y+r*math.sin(angle),z+.22+h)
        tube('leaf',(x,y,z+.22),tip,.003,5)
        direction=Vector((math.cos(angle),math.sin(angle),.45));side=Vector((-math.sin(angle),math.cos(angle),0))
        base=Vector(tip);length=.13;width=.045
        verts=[tuple(base-direction*length),tuple(base+side*width),tuple(base+direction*length*.6),tuple(base-side*width),tuple(base+Vector((0,0,.012)))]
        # Use glTF doubleSided for thin leaves; duplicated reverse triangles
        # are invalid Blender faces and add avoidable overdraw.
        poly('leaf',verts,[(0,1,4),(1,2,4),(2,3,4),(3,0,4)])
def fitout(x,f,variant):
    z=10.6+f*3.65+.25;y=-11.2
    # The original keyboard body stays. Add separate key rows + space bar.
    for row in range(5):
        for col in range(13):
            if row==4 and 3<=col<=8:continue
            box('keys',(x-.19+col*.031,y-.237+row*.029,z+.815),(.026,.024,.009))
    box('keys',(x-.02,y-.121,z+.815),(.177,.024,.009))
    ellipsoid('ivory',(x+.36,y-.17,z+.805),(.039,.062,.024))
    tube('graphite',(x+.36,y-.183,z+.825),(x+.36,y-.164,z+.825),.004,8)
    # Real monitor foot, cable and under-desk cable spine.
    # The original desk top is at z+.7825; the 18mm foot rests on it.
    box('graphite',(x,y+.23,z+.7915),(.25,.18,.018),.009)
    for i in range(6):
        tube('graphite',(x+.03,y+.24,z+.88-i*.07),(x+.03+math.sin(i)*.015,y+.25,z+.81-i*.07),.0035,6)
    box('graphite',(x,y+.26,z+.65),(1.14,.12,.07),.008)
    # Documents retain visible cover and page layers.
    for i in range(3):box('paper',(x-.56,y-.09+i*.004,z+.786+i*.012),(.21,.28,.01),.001)
    for i in range(3):box('oak',(x-.56,y-.09,z+.782+i*.012),(.217,.283,.003),.001)
    # Five actual paired caster wheels, not a generic chair pedestal.
    for i in range(5):
        a=i*math.tau/5;cx=x+.31*math.cos(a);cy=y-.82+.31*math.sin(a)
        for offset in [-.018,.018]:
            start=(cx+offset,cy-.012,z+.052);end=(cx+offset,cy+.012,z+.052)
            tube('graphite',start,end,.049,12)
    # Keep the old chair frame. The original back reaches y-1.0575.
    # Put a closed 3mm upholstered shell outside it, with >=2.5mm gap;
    # R15's curved sheet was mostly buried in that existing solid.
    vs=[];fs=[]
    for j in range(6):
        h=.53+j*.08
        for i in range(9):
            t=(i-4)/4;vs.append((x+.245*t,y-1.06-.018*(1-t*t)-j*.002,z+h))
    for j in range(5):
        for i in range(8):a=j*9+i;fs.append((a,a+1,a+10,a+9))
    fs=[tuple(reversed(face))for face in fs]
    count=len(vs);vs.extend((vx,vy-.003,vz)for vx,vy,vz in list(vs))
    fs.extend(tuple(count+k for k in reversed(face))for face in list(fs))
    rim=list(range(9))+[j*9+8 for j in range(1,6)]+list(range(52,44,-1))+[j*9 for j in range(4,0,-1)]
    for i,a in enumerate(rim):
        b=rim[(i+1)%len(rim)];fs.append((a,b,b+count,a+count))
    poly('fabric',vs,fs)
    box('graphite',(x,y-1.045,z+.67),(.32,.034,.075),.015)
    # Storage at the room back is outside the desk/chair access path.
    cabinet_x=x+.92 if variant!=1 else x-1.05
    box('ivory',(cabinet_x,-9.99,z+.67),(.84,.42,1.24),.012)
    # An inset plinth closes the measured 48.5mm gap to the new floor.
    # Keep the cabinet top/plant positions intact; do not sink the whole cabinet.
    box('graphite',(cabinet_x,-9.99,z+.02575),(.75,.34,.0485))
    box('oak',(cabinet_x,-9.99,z+1.299),(.86,.44,.025),.006)
    for h in [.48,.88]:
        box('graphite',(cabinet_x,-10.205,z+h),(.79,.004,.005))
        tube('graphite',(cabinet_x-.11,-10.22,z+h+.14),(cabinet_x+.11,-10.22,z+h+.14),.008,8)
    # Baseboard and back wall detail establish a real wall/floor joint.
    box('oak',(x,-9.744,z+.055),(5.1,.028,.11),.003)
    if variant==0:
        for i in range(15):box('oak',(x-1.3+i*.075,-9.75,z+1.65),(.034,.05,1.12),.006)
        pot(cabinet_x,-10,z+1.312,10+f)
    elif variant==1:
        box('graphite',(x+.85,-9.757,z+1.82),(1.16,.04,.78),.009)
        box('paper',(x+.85,-9.783,z+1.82),(1.1,.012,.72),.006)
        for i,width in enumerate([.5,.76,.61,.35]):box('fabric',(x+.7,-9.791,z+2.04-i*.095),(width,.003,.009))
        pot(x+1.65,-10.05,z,31+f)
    else:
        for h in [1.65,2.13]:
            box('oak',(x-.9,-9.91,z+h),(1.4,.28,.035),.006)
            for i in range(7):box(['fabric','paper','clay'][i%3],(x-1.4+i*.082,-9.91,z+h+.16),(.06,.17,.28),.004)
        pot(x-1.65,-10.14,z,40+f)
    # A floor is a texture carrier for actual AO, not an image of a room.
    mesh=bpy.data.meshes.new('study-floor');mesh.from_pydata([(x-2.57,-13.24,z+.0015),(x+2.57,-13.24,z+.0015),(x+2.57,-9.75,z+.0015),(x-2.57,-9.75,z+.0015)],[],[(0,1,2,3)]);mesh.update()
    uv=mesh.uv_layers.new(name='Room AO UV')
    for l,co in zip(mesh.polygons[0].loop_indices,[(0,0),(1,0),(1,1),(0,1)]):uv.data[l].uv=co
    obj=bpy.data.objects.new('v12-study-floor-'+str(f)+'-'+str(variant),mesh);bpy.context.collection.objects.link(obj)
    m=bpy.data.materials.new(obj.name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(.15,.18,.19,1);p.inputs['Roughness'].default_value=.97
    img=bpy.data.images.new(obj.name+'-AO',width=256,height=256,alpha=False);img.colorspace_settings.name='Non-Color'
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img;m.node_tree.nodes.active=tex
    group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
    settings=m.node_tree.nodes.new('ShaderNodeGroup');settings.node_tree=group;m.node_tree.links.new(tex.outputs['Color'],settings.inputs['Occlusion'])
    obj.data.materials.append(m);floors.append((obj,img))
for f in [1,2]:
    for variant,x in enumerate([-13,-7.8,-2.6]):fitout(x,f,variant)
for name,(verts,faces)in parts.items():
    mesh=bpy.data.meshes.new('study-'+name);mesh.from_pydata(verts,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='Metric UV')
    for p in mesh.polygons:
        axis=max(range(3),key=lambda i:abs(p.normal[i]))
        for l in p.loop_indices:
            co=mesh.vertices[mesh.loops[l].vertex_index].co;uv.data[l].uv=(co.y,co.z)if axis==0 else(co.x,co.z)if axis==1 else(co.x,co.y)
    obj=bpy.data.objects.new('v12-study-'+name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(materials[name])
    counts[name]={'vertices':len(verts),'triangles':sum(len(f)-2 for f in faces)}
assert all(before[o.name]==fingerprint(o)for o in bpy.context.scene.objects if o.name in before)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.render.bake.margin=4;scene.world.color=(.1,.1,.1)
hidden=[]
for o in scene.objects:
    if o.type=='MESH'and any('glass'in m.name for m in o.data.materials):hidden.append((o,o.hide_render));o.hide_render=True
for obj,img in floors:
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    # Unlimited AO would darken nearly the whole enclosed office. Bake a
    # finite 0.8m contact term instead, with real chair/cabinet/wall geometry.
    m=obj.data.materials[0];nodes=m.node_tree.nodes;links=m.node_tree.links
    ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.8;ao.samples=32
    emit=nodes.new('ShaderNodeEmission');links.new(ao.outputs['Color'],emit.inputs['Color'])
    output=nodes.get('Material Output');links.new(emit.outputs['Emission'],output.inputs['Surface'])
    bpy.ops.object.bake(type='EMIT')
    links.new(nodes.get('Principled BSDF').outputs['BSDF'],output.inputs['Surface']);nodes.remove(emit);nodes.remove(ao)
    img.filepath_raw=OUT+'/'+img.name+'.png';img.file_format='PNG';img.save();img.pack()
for o,hidden_before in hidden:o.hide_render=hidden_before
scene.render.engine='CYCLES'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/light-court-v12.blend')
bpy.ops.export_scene.gltf(filepath=OUT+'/light-court.glb',export_format='GLB',export_yup=True,export_apply=True)
raw=open(OUT+'/light-court.glb','rb').read();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n])
report={'status':'STAGED_NOT_ACCEPTED','source':SOURCE,'sourceSha256':hashlib.sha256(open(SOURCE,'rb').read()).hexdigest(),'all38OriginalSourceMeshesUnchanged':True,'sample':{'floors':[1,2],'deskCentersX':[-13,-7.8,-2.6],'realDesks':6,'newEnvelopeGeometry':False,'blenderZUp':True},'addedGeometry':counts,'floorAO':{'realRoomGeometry':True,'maxDistanceMetres':.8,'resolution':[256,256],'cyclesSamples':20,'aoSamples':32,'images':[img.name for obj,img in floors]},'glb':{'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'meshes':len(doc['meshes']),'materials':len(doc['materials']),'images':len(doc.get('images',[]))},'limits':['Only one original facade sample, not whole-building interior fit-out','AO is static ambient occlusion, not baked direct light or real-time GI','No full scores assigned']}
with open(OUT+'/sample-proof.json','w',encoding='utf-8')as f:json.dump(report,f,indent=2)
print('WINDOW_SAMPLE '+json.dumps(report))
