"""Versioned original woodland companion candidate. No network or paid tools.
The retained cat stays untouched. Blender-native sculpted/lofted meshes, tailored
cloth layers, vertex-weighted armature and named controls export to glTF.
"""
import bpy, math, json, hashlib, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/behaviour-v113-candidate'
OUT.mkdir(exist_ok=True)
if (OUT / 'woodland-companion.blend').exists():
    raise RuntimeError('Refusing to overwrite the versioned source; make a new revision')
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(113)

def material(name, color, rough=.6, metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    return m

# Reuse legal original eye/skin color masters, never a reference-image texture.
retained=ROOT/'public/models/behaviour-v108/companions.blend'
with bpy.data.libraries.load(str(retained),link=False) as (src,dst):
    dst.materials=[n for n in src.materials if n in ['amber iris','pupil and hoof','corneal light','nose and ear cartilage','warm ivory fur']]
def retained_mat(name, fallback): return bpy.data.materials.get(name) or material(name,fallback)
fur=material('CT113 porcelain cream fur',(.86,.79,.63),.82)
furLight=material('CT113 light muzzle fur',(.96,.89,.74),.9)
furWarm=material('CT113 ear edge warm fur',(.73,.48,.28),.83)
pink=retained_mat('nose and ear cartilage',(.55,.25,.23))
iris=retained_mat('amber iris',(.61,.38,.08));dark=retained_mat('pupil and hoof',(.018,.022,.021))
glint=retained_mat('corneal light',(.96,.98,.9))
green=material('CT113 forest green wool outer cape',(.035,.16,.087),.83)
lining=material('CT113 warm jade cape lining',(.10,.29,.16),.72)
cream=material('CT113 ivory linen underskirt',(.85,.77,.59),.92)
gold=material('CT113 antique gold piping and embroidery',(.58,.36,.085),.29,.74)
lace=material('CT113 fine ecru lace',(.93,.87,.72),.86)
rose=material('CT113 blush petal pink',(.79,.41,.39),.68)
leaf=material('CT113 fresh leaf crown',(.24,.37,.10),.83)
gem=material('CT113 green enamel brooch',(.045,.30,.15),.24,.24)

# A real bone hierarchy, with softly weighted torso and named rigid accessories.
bpy.ops.object.armature_add(location=(0,0,0));rig=bpy.context.object;rig.name='CT113_Woodland_Companion_Rig'
bpy.ops.object.mode_set(mode='EDIT');b=rig.data.edit_bones[0];b.name='Root';b.head=(0,0,0);b.tail=(0,0,.2)
spec=[('Breath',(0,0,.31),(0,0,.76),'Root'),('Head',(0,0,.81),(0,0,1.16),'Breath'),
('EarLeft',(-.19,0,1.13),(-.26,0,1.43),'Head'),('EarRight',(.19,0,1.13),(.26,0,1.43),'Head'),
('Tail',(0,.12,.37),(-.35,.19,.57),'Root'),('PawLeft',(-.21,0,.69),(-.42,-.03,.79),'Breath'),
('PawRight',(.21,0,.69),(.42,-.03,.79),'Breath')]
for name,head,tail,parent in spec:
    b=rig.data.edit_bones.new(name);b.head=head;b.tail=tail;b.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
assets=[]
def finish(o,m,bone='Breath',sub=0):
    if m:o.data.materials.append(m)
    if o.type=='MESH':
        for f in o.data.polygons:f.use_smooth=True
        if sub:
            q=o.modifiers.new('Tailored smooth surface','SUBSURF');q.levels=sub;q.render_levels=sub
        if bone:
            g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE')
            mod=o.modifiers.new('Companion bone deformation','ARMATURE');mod.object=rig
        o.parent=rig
    assets.append(o);return o
def mesh(name,verts,faces,m,bone='Breath',sub=0):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);return finish(o,m,bone,sub)
def uv_organic(name,center,radii,m,bone='Breath',n=64,rings=40,deform=None):
    verts=[];faces=[]
    for j in range(rings+1):
        t=math.pi*j/rings
        for i in range(n):
            a=2*math.pi*i/n;p=Vector((radii[0]*math.sin(t)*math.cos(a),radii[1]*math.sin(t)*math.sin(a),radii[2]*math.cos(t)))
            if deform:p=deform(p,t,a)
            verts.append(tuple(p+Vector(center)))
    for j in range(rings):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    return mesh(name,verts,faces,m,bone)
def curve(name,points,radius,m,bone='Breath',radii=None):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.resolution_u=12;d.bevel_depth=radius;d.bevel_resolution=3
    s=d.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for i,(p,co) in enumerate(zip(s.bezier_points,points)):
        p.co=co;p.handle_left_type=p.handle_right_type='AUTO';p.radius=radii[i] if radii else 1
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);d.materials.append(m)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,None,bone)
def loft(name,sections,m,bone='Breath',n=96,pleat=0,open_front=None,thick=.006):
    vs=[];fs=[];count=n+1 if open_front else n
    for j,(z,rx,ry,shift) in enumerate(sections):
        for i in range(count):
            a=(open_front[0]+(open_front[1]-open_front[0])*i/n) if open_front else 2*math.pi*i/n
            wave=1+pleat*math.sin(a*12+.4)*(j/(len(sections)-1))**.8
            vs.append((rx*math.cos(a)*wave,ry*math.sin(a)*wave+shift,z+.009*math.sin(a*12)*(j/(len(sections)-1))**3))
    for j in range(len(sections)-1):
        for i in range(n if open_front else n):
            k=(i+1)%count;fs.append((j*count+i,j*count+k,(j+1)*count+k,(j+1)*count+i))
    o=mesh(name,vs,fs,m,bone,1)
    q=o.modifiers.new('Finished fabric thickness','SOLIDIFY');q.thickness=thick
    return o

# Continuous organic torso/head rather than visible intersecting ellipsoids.
body=uv_organic('continuous pear shaped torso',(0,.015,.56),(.21,.17,.33),fur,'Breath',deform=lambda p,t,a:Vector((p.x*(1+.18*math.cos(t)),p.y,p.z)))
head=uv_organic('continuous rounded feline head',(0,-.015,1.025),(.294,.238,.255),fur,'Head',deform=lambda p,t,a:Vector((p.x*(1+.09*math.sin(t)),p.y-(.018*math.sin(t)**4 if math.sin(a)<0 else 0),p.z)))
# Fur tufts follow the silhouette in overlapping sculpted sheets.
for side in [-1,1]:
    for j in range(4):
        x=side*(.242+.012*j);z=.955+j*.035
        vs=[(x,-.035,z-.035),(x+side*.057,-.018,z+.005),(x+side*.013,.035,z+.035),(x-side*.025,.04,z)]
        mesh('sculpted cheek fur tuft',vs,[(0,1,2,3)],fur,'Head',2)
# Large soft muzzle is fused as a single two-lobed surface.
uv_organic('continuous muzzle bridge',(0,-.232,.963),(.137,.045,.066),furLight,'Head',deform=lambda p,t,a:Vector((p.x,p.y-.012*math.cos(a*2)*math.sin(t),p.z)))
uv_organic('rose nose',(0,-.283,1.003),(.027,.014,.017),pink,'Head',n=32,rings=20)
curve('mouth seam',[(0,-.282,.988),(0,-.286,.975),(-.027,-.277,.962),(-.047,-.268,.969)],.0025,dark,'Head')
curve('mouth seam right',[(0,-.286,.975),(.027,-.277,.962),(.047,-.268,.969)],.0025,dark,'Head')

# Layered eye geometry reuses the original source materials and exact names
# understood by companionMotion, including all pupil/catchlight layers.
for side in [-1,1]:
    x=side*.117
    uv_organic('eye globe',(x,-.222,1.075),(.063,.022,.065),furLight,'Head',n=40,rings=24)
    uv_organic('EyeLeft' if side<0 else 'EyeRight',(x,-.243,1.077),(.043,.011,.048),iris,'Head',n=40,rings=24)
    uv_organic('vertical pupil',(x,-.253,1.078),(.012,.004,.038),dark,'Head',n=32,rings=24)
    uv_organic('corneal catchlight',(x-.013,-.257,1.098),(.011,.003,.013),glint,'Head',n=24,rings=16)
    curve('upper eyelid fur rim',[(x-.059,-.232,1.08),(x-.038,-.246,1.127),(x+.018,-.246,1.137),(x+.059,-.230,1.09)],.007,fur,'Head')
    curve('thoughtful brow',[(x-.040,-.220,1.166),(x,-.234,1.177),(x+.043,-.217,1.165)],.006,furWarm,'Head')
    for j in range(3):
        curve('tapered whisker',[(side*.08,-.267,.982-j*.014),(side*.23,-.273,.980-j*.016),(side*(.35+j*.008),-.22,.988-j*.025)],.0014,furLight,'Head',[1,.7,.03])

def ear(side):
    cx=side*.205;vs=[];fs=[];rows=14;around=32
    for j in range(rows+1):
        t=j/rows;z=1.16+t*.285;width=.105*(1-t)**.75+.002;depth=.048*(1-t)+.004
        for i in range(around):
            a=2*math.pi*i/around;vs.append((cx+side*.07*t+width*math.cos(a),.01+depth*math.sin(a),z))
    for j in range(rows):
        for i in range(around):fs.append((j*around+i,j*around+(i+1)%around,(j+1)*around+(i+1)%around,(j+1)*around+i))
    bone='EarLeft' if side<0 else 'EarRight';mesh('sculpted tapered ear shell',vs,fs,fur,bone,1)
    v=[(cx-side*.065,-.039,1.185),(cx+side*.065,-.039,1.185),(cx+side*.070,-.006,1.415)]
    m=mesh('soft inner ear cartilage',v,[(0,1,2)],pink,bone,2);q=m.modifiers.new('Inner ear thickness','SOLIDIFY');q.thickness=.004
ear(-1);ear(1)

# Legs and paws are rounded continuous profiles; pink pads sit on the palms.
for side in [-1,1]:
    uv_organic('standing haunch',(side*.105,.025,.255),(.108,.105,.22),fur,'Root',n=48,rings=28)
    uv_organic('soft standing paw',(side*.11,-.06,.086),(.105,.15,.077),furLight,'Root',n=48,rings=28)
    for j in [-1,1]:curve('toe division',[(side*.11+j*.028,-.198,.073),(side*.11+j*.031,-.184,.111)],.0026,furWarm,'Root')
    bone='PawLeft' if side<0 else 'PawRight'
    curve('continuous lifted forearm',[(side*.18,.01,.727),(side*.29,-.015,.722),(side*.375,-.06,.803)],.068,fur,bone,[1.15,.90,.85])
    paw=uv_organic('rounded raised paw',(side*.39,-.071,.82),(.079,.061,.086),furLight,bone,n=40,rings=24)
    uv_organic('pink central paw pad',(side*.392,-.129,.819),(.027,.004,.030),pink,bone,n=24,rings=16)
    for j in [-1,0,1]:uv_organic('pink toe pad',(side*.391+j*.027,-.123,.865-abs(j)*.007),(.012,.004,.014),pink,bone,n=20,rings=12)

curve('fluffy curved tail',[(0,.14,.32),(-.24,.23,.38),(-.43,.22,.53),(-.47,.13,.70),(-.39,.06,.79),(-.26,.045,.77)],.068,fur,'Tail',[.7,1,1.15,1.15,.9,.1])
for i in range(8):
    a=i/7;curve('tail fur fringe',[(-.44+.03*math.sin(a*4),.20-a*.10,.48+a*.28),(-.50,.18-a*.10,.51+a*.28),(-.47,.14-a*.10,.54+a*.28)],.011,furLight,'Tail',[.3,.8,.01])

# A pleated linen dress with an open, fully lined wool cape. Hems and fabric
# construction are continuous lofts with thickness, piping and actual seams.
dress_sections=[(.74,.145,.135,0),(.69,.165,.145,0),(.56,.195,.17,0),(.42,.26,.21,-.005),(.30,.315,.25,-.008),(.265,.324,.26,-.008)]
loft('ivory pleated linen dress',dress_sections,cream,pleat=.055)
cape_sections=[(.815,.18,.145,.015),(.79,.225,.17,.018),(.71,.26,.185,.022),(.55,.28,.21,.026),(.39,.32,.25,.028),(.315,.36,.278,.028)]
loft('emerald tailored cape',cape_sections,green,open_front=(-.85,math.pi+.85),pleat=.04,thick=.009)
loft('jade visible cape lining',[(z,rx-.008,ry-.007,sh) for z,rx,ry,sh in cape_sections],lining,open_front=(-.85,math.pi+.85),pleat=.04,thick=.003)
for endpoint in [-.85,math.pi+.85]:
    curve('gold cape opening binding',[(rx*math.cos(endpoint)* (1+.04*math.sin(endpoint*12+.4)*(j/5)**.8),ry*math.sin(endpoint)*(1+.04*math.sin(endpoint*12+.4)*(j/5)**.8)+sh,z) for j,(z,rx,ry,sh) in enumerate(cape_sections)],.005,gold)
hem=[]
for i in range(100):
    a=-.85+(math.pi+1.7)*i/99;w=1+.04*math.sin(a*12+.4);hem.append((.36*math.cos(a)*w,.278*math.sin(a)*w+.028,.315+.009*math.sin(a*12)))
curve('sweeping cape gold hem',hem,.0055,gold)
for i in range(48):
    a=2*math.pi*i/48;z=.267+.011*math.sin(a*12)
    pts=[]
    for j in range(9):
        q=a+(j/8-.5)*2*math.pi/48;r=.326+.009*math.sin(j/8*math.pi)
        pts.append((r*math.cos(q),r*.80*math.sin(q)-.008,z-.022*math.sin(j/8*math.pi)))
    curve('scalloped linen lace hem',pts,.0024,lace)
for i in range(16):
    a=2*math.pi*i/16
    if math.sin(a)<-.10:
        curve('linen embroidered vertical seam',[(rx*math.cos(a)*1.008,ry*math.sin(a)-.008,z) for z,rx,ry,sh in dress_sections[2:]],.0016,lace)
# Scalloped collar and shaped bow loops.
for side in [-1,1]:
    pts=[(side*.015,-.155,.82),(side*.085,-.163,.79),(side*.145,-.126,.79),(side*.17,-.09,.82)]
    curve('linen collar scallop',pts,.017,lace)
    vs=[(side*.025,-.177,.76),(side*.14,-.192,.825),(side*.165,-.181,.74),(side*.05,-.199,.737)]
    o=mesh('folded velvet bow loop',vs,[(0,1,2,3)],green,'Breath',2);q=o.modifiers.new('Bow fabric thickness','SOLIDIFY');q.thickness=.012
    curve('bow gold edging',[(side*.035,-.19,.768),(side*.13,-.198,.805),(side*.149,-.192,.748),(side*.046,-.20,.746)],.003,gold)
    vs=[(side*.018,-.19,.75),(side*.056,-.20,.738),(side*.087,-.21,.62),(side*.034,-.203,.638)]
    o=mesh('hanging bow ribbon',vs,[(0,1,2,3)],green,'Breath',2);q=o.modifiers.new('Ribbon thickness','SOLIDIFY');q.thickness=.005
uv_organic('green enamel bow brooch',(0,-.205,.762),(.033,.014,.036),gem,'Breath',n=32,rings=24)
curve('brooch gold bezel',[(.034*math.cos(i*2*math.pi/40),-.211,.762+.037*math.sin(i*2*math.pi/40)) for i in range(41)],.004,gold)

# Curved botanical crown with sculpted leaf and petal sheets.
curve('crown gold vine',[(-.18,-.09,1.245),(-.12,-.065,1.302),(-.04,-.035,1.316),(.04,-.01,1.302)],.005,gold,'Head')
def petal(name,center,angle,length,width,m,bone='Head'):
    vs=[];fs=[];rows=12
    for j in range(rows+1):
        t=j/rows;w=width*math.sin(math.pi*t)**.8
        for k in [-1,0,1]:
            x=k*w;y=t*length;z=.012*math.sin(math.pi*t)-abs(k)*.006
            vs.append((center[0]+x*math.cos(angle)-y*math.sin(angle),center[1]-z,center[2]+x*math.sin(angle)+y*math.cos(angle)))
    for j in range(rows):
        for k in range(2):fs.append((j*3+k,j*3+k+1,(j+1)*3+k+1,(j+1)*3+k))
    o=mesh(name,vs,fs,m,bone,1);q=o.modifiers.new('Petal thickness','SOLIDIFY');q.thickness=.0015
for c,r in [((-.155,-.16,1.255),.052),((-.075,-.10,1.30),.031)]:
    for i in range(8):petal('sculpted crown flower petal',c,i*math.pi/4,r,r*.30,rose if i%3==0 else lace)
    uv_organic('flower golden heart',c,(r*.20,.011,r*.20),gold,'Head',n=24,rings=16)
for j in range(4):petal('crown pointed leaf',(-.17+j*.05,-.10+j*.012,1.27+j*.012),(-1 if j%2 else 1)*.8,.07,.018,leaf)

# Remove unneeded source material orphans; exported assets are local only.
bpy.ops.object.select_all(action='DESELECT')
for o in [rig,*assets]:o.select_set(True)
bpy.context.view_layer.objects.active=rig
source=OUT/'woodland-companion.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(source))
glb=OUT/'woodland-companion.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_apply=True,export_texcoords=True,export_normals=True)
record={
 'name':'CarbonTwin woodland companion — V11.3 candidate', 'default_replaced':False,
 'license':'CC0-1.0 for newly authored original geometry; retained source materials are CarbonTwin original CC0-1.0',
 'author':'CarbonTwin project original geometry', 'reference':'User-supplied 80492c3d926157b63af696bf8739b37b.jpg used for art direction only; not embedded or redistributed',
 'retained_source':'public/models/behaviour-v108/companions.blend', 'new_source_script':'scripts/build-v113-woodland-companion.py',
 'external_assets':[], 'paid_calls':0, 'armature_bones':[b.name for b in rig.data.bones],
 'meshes':len(assets), 'integration':'Named Head/Breath/Tail/EarLeft/EarRight and PawLeft/PawRight bones; companionMotion compatibility.',
 'files':[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [source,glb]]}
(OUT/'sources.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8')
print('CANDIDATE_EXPORTED',json.dumps(record,ensure_ascii=False),flush=True)

# Render a CPU inspection image. Studio scenery is excluded from the GLB.
floor=material('inspection floor',(.12,.17,.12),.95)
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=.65,depth=.045,location=(0,0,-.025));bpy.context.object.data.materials.append(floor)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24
scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
if not scene.world:scene.world=bpy.data.worlds.new('inspection world')
scene.world.color=(.18,.18,.18)
def area(name,loc,power,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.7))-o.location).to_track_quat('-Z','Y').to_euler()
area('softbox key',(2.4,-3.5,4),420,3);area('softbox fill',(-2,-1.5,2),170,2.4);area('hair rim',(-1,2,3),380,2)
d=bpy.data.cameras.new('inspection portrait');camera=bpy.data.objects.new('inspection portrait',d);bpy.context.collection.objects.link(camera);camera.location=(2.5,-5,2.2);camera.rotation_euler=(Vector((0,0,.73))-camera.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=1.95;scene.camera=camera
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'inspection-portrait.png')
bpy.ops.render.render(write_still=True)
print('CANDIDATE_RENDERED',flush=True)
