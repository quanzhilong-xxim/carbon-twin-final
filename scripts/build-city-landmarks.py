"""Original architectural studies. Run with portable Blender, no network or AI calls.
Geometry is batched by material before exporting each independent GLB.
Not accurate replicas of the referenced real buildings.
"""
import bpy, math, os, json, random, struct
from mathutils import Vector
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'models', 'city-studies')
os.makedirs(OUT, exist_ok=True)
PARTS = defaultdict(lambda: [[], []])
MATS = {}
LOW = False

def material(name, color, metal=0, rough=.5, glow=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if glow:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = glow
    MATS[name] = m

material('blue-glass', (.12,.27,.32), .62,.22)
material('sky-glass', (.24,.43,.48), .6,.2)
material('dark-glass', (.055,.105,.14), .6,.24)
material('bronze', (.48,.37,.22), .74,.28)
material('silver', (.48,.57,.59), .72,.29)
material('limestone', (.63,.55,.43), .06,.74)
material('sandstone', (.43,.35,.26), .06,.79)
material('window-light', (1,.66,.3), .1,.4,.4)
material('night-window', (1,.65,.32), .1,.4,.8)
material('roof', (.13,.17,.18), .3,.6)
material('leaf', (.16,.29,.19),0,.9)
material('bark', (.22,.17,.12),0,.92)
material('rubber', (.022,.026,.029),0,.83)
material('red-paint', (.48,.12,.08),.35,.26)
material('taxi', (.78,.48,.09),.28,.3)
material('white-paint', (.71,.76,.72),.3,.3)
material('skin', (.56,.36,.24),0,.9)
material('cloth', (.12,.24,.3),0,.95)
material('glass-lod',(.12,.27,.32),.62,.22)
# Original curtain-wall tile: the low-detail envelope remains curved 3D geometry.
tile=bpy.data.images.new('CarbonTwin authored curtain tile',width=128,height=128)
tile_pixels=[]
for y in range(128):
    for x in range(128):
        frame=x<4 or y<3
        value=.21 if frame else .78+.18*y/128
        tile_pixels.extend((value,value,value,1))
tile.pixels=tile_pixels;tile.pack()
nodes=MATS['glass-lod'].node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=tile
MATS['glass-lod'].node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])

# Original mineral surface, embedded in the GLB. No downloaded texture licenses.
random.seed(20261104)
stone=bpy.data.images.new('CarbonTwin authored limestone grain',width=256,height=256)
pixels=[]
for y in range(256):
    for x in range(256):
        grain=.83+random.random()*.15+.025*math.sin(y*.4+math.sin(x*.13))
        joint=.87 if y%128<2 else 1
        pixels.extend((grain*joint,grain*joint,grain*joint,1))
stone.pixels=pixels
stone.pack()
for name in ['limestone','sandstone']:
    mat=MATS[name];nodes=mat.node_tree.nodes;links=mat.node_tree.links
    tex=nodes.new('ShaderNodeTexImage');tex.image=stone
    mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[1].default_value=mat.diffuse_color
    links.new(tex.outputs['Color'],mix.inputs[2]);links.new(mix.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])

def poly(mat, verts, faces):
    vs, fs = PARTS[mat]
    offset = len(vs)
    vs.extend(verts)
    fs.extend([tuple(offset+i for i in f) for f in faces])

def box(mat, pos, size, angle=0):
    x,y,z=pos; w,d,h=[n*.5 for n in size]
    verts=[]
    for dz in [-h,h]:
        for dx,dy in [(-w,-d),(w,-d),(w,d),(-w,d)]:
            verts.append((x+dx*math.cos(angle)-dy*math.sin(angle),y+dx*math.sin(angle)+dy*math.cos(angle),z+dz))
    poly(mat,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])

def beam(mat, start, end, radius=.055, sides=5):
    a,b=Vector(start),Vector(end); direction=(b-a).normalized()
    u=direction.cross(Vector((0,0,1)))
    if u.length<.001:u=Vector((1,0,0))
    u.normalize();v=direction.cross(u).normalized()
    verts=[tuple(p+(u*math.cos(i*math.tau/sides)+v*math.sin(i*math.tau/sides))*radius) for p in [a,b] for i in range(sides)]
    poly(mat,verts,[(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)])

def rings(mat, profile, levels, segments=48):
    verts=[profile(j/levels,i/segments) for j in range(levels+1) for i in range(segments)]
    faces=[]
    for j in range(levels):
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    faces.extend([tuple(reversed(range(segments))),tuple(levels*segments+i for i in range(segments))])
    poly(mat,verts,faces)

def entrance(radius, z=0, width=6):
    box('dark-glass',(0,-radius-.1,z+2.3),(width,.3,4.6))
    for x in [-width/2,0,width/2]:box('bronze',(x,-radius-.3,z+2.3),(.12,.25,4.6))
    box('bronze',(0,-radius-1.5,z+4.7),(width+2,3.2,.2))
    for x in [-.35,.35]:box('silver',(x,-radius-.32,z+2),(.05,.15,.65))

def podium(w,d):
    # A transparent occupied ground floor, not a solid blank plinth.
    box('limestone',(0,0,.17),(w+1,d+1,.34))
    box('roof',(0,0,4.55),(w+.8,d+.8,.34))
    box('bronze',(0,0,4.76),(w+1,d+1,.09))
    for side in range(4):
        angle=side*math.pi/2;span=w/2 if side%2==0 else d/2;offset=d/2 if side%2==0 else w/2
        cols=max(4,int(span/1.7))
        for c in range(cols):
            lateral=-span+(c+.5)*2*span/cols
            x=lateral*math.cos(angle)+offset*math.sin(angle);y=lateral*math.sin(angle)-offset*math.cos(angle)
            box('dark-glass',(x,y,2.4),(2*span/cols-.18,.12,3.9),angle)
            # Slim columns, transoms and deep metallic reveal frame each pane.
            x0=lateral-span/cols
            xx=x0*math.cos(angle)+offset*math.sin(angle);yy=x0*math.sin(angle)-offset*math.cos(angle)
            box('limestone',(xx,yy,2.4),(.22,.45,4.1),angle)
            box('silver',(x,y,3.35),(2*span/cols,.18,.09),angle)
    entrance(d/2,0,8)

def export(name):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    counts={}
    for key,(verts,faces) in PARTS.items():
        if not faces:continue
        mesh=bpy.data.meshes.new(name+'-'+key);mesh.from_pydata(verts,[],faces);mesh.update()
        uv=mesh.uv_layers.new(name='Architectural scale UV')
        for polygon in mesh.polygons:
            axis=max(range(3),key=lambda n:abs(polygon.normal[n]))
            if key=='glass-lod':polygon.use_smooth=True
            angles=[]
            if key=='glass-lod':
                for vi in polygon.vertices:
                    co=mesh.vertices[vi].co;t=max(0,(co.z-4)/106)
                    angles.append((math.atan2(co.y,co.x)-(t*math.pi*.57 if name.startswith('b02') else 0))/math.tau%1)
            for loop_index in polygon.loop_indices:
                co=mesh.vertices[mesh.loops[loop_index].vertex_index].co
                uv.data[loop_index].uv=(co[1]/4,co[2]/4) if axis==0 else (co[0]/4,co[2]/4) if axis==1 else (co[0]/4,co[1]/4)
                if key=='glass-lod':
                    t=max(0,(co.z-4)/106);u=(math.atan2(co.y,co.x)-(t*math.pi*.57 if name.startswith('b02') else 0))/math.tau%1
                    if max(angles)-min(angles)>.5 and u<.5:u+=1
                    uv.data[loop_index].uv=(u*48,(co.z-4)/1.85)
        obj=bpy.data.objects.new(key,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(MATS[key])
        counts[key]={'vertices':len(verts),'triangles':sum(len(f)-2 for f in faces)}
    dest=os.path.join(OUT,name+'.glb')
    bpy.ops.export_scene.gltf(filepath=dest,export_format='GLB',export_yup=True,export_apply=True)
    # Blender's glTF shader gatherer drops the multiplier of a MixRGB/image graph.
    # Explicit standard glTF baseColorFactor preserves the authored mineral tint.
    with open(dest,'rb') as f:raw=f.read()
    old_length=struct.unpack_from('<I',raw,12)[0]
    document=json.loads(raw[20:20+old_length])
    for mat in document.get('materials',[]):
        if mat['name'] in ['limestone','sandstone','glass-lod']:
            mat['pbrMetallicRoughness']['baseColorFactor']=list(MATS[mat['name']].diffuse_color)
    encoded=json.dumps(document,separators=(',',':')).encode('utf-8')
    encoded+=b' '*((-len(encoded))%4)
    rest=raw[20+old_length:]
    with open(dest,'wb') as f:f.write(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(rest))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+rest)
    stats={'file':name+'.glb','bytes':os.path.getsize(dest),'triangles':sum(c['triangles'] for c in counts.values()),'materials':counts}
    PARTS.clear()
    return stats

def spring():
    h=92
    def point(t,u,extra=0):
        # Broad occupied tower, narrowing into an open-lattice crown.
        r=(10.1*(1-.16*t-.80*t**8)+extra)
        theta=u*math.tau
        return (r*math.cos(theta),r*math.sin(theta),t*h+4)
    rings('glass-lod' if LOW else 'blue-glass',lambda t,u:point(t*.94,u),24 if LOW else 56,36 if LOW else 48)
    # Individual curtain panes use alternating reflectance; mullions follow the surface.
    for floor in range(52):
        t0=floor/56;t1=(floor+.86)/56
        for c in range(48):
            if LOW and (floor*7+c*3)%19>=3:continue
            a=(c+.09)/48;b=(c+.88)/48
            pane='night-window' if (floor*7+c*3)%19<3 else 'sky-glass' if (floor*7+c*3)%13<4 else 'blue-glass'
            poly(pane,[point(t0,a,.025),point(t0,b,.025),point(t1,b,.025),point(t1,a,.025)],[(0,1,2,3)])
        if not LOW:
            for c in range(48):beam('silver',point((floor+.97)/56,c/48,.08),point((floor+.97)/56,(c+1)/48,.08),.035,4)
    for c in range(12 if LOW else 24):
        for j in range(7 if LOW else 14):beam('silver',point(j/(7 if LOW else 14),c/(12 if LOW else 24),.1),point((j+1)/(7 if LOW else 14),c/(12 if LOW else 24),.1),.055,4 if LOW else 5)
    for band in range(7):
        for col in range(12):
            for direction in [-1,1]:
                steps=2 if LOW else 4
                for step in range(steps):
                    t0=(band+step/steps)/7;t1=(band+(step+1)/steps)/7
                    u0=col/12+direction*(band+step/steps)/12;u1=col/12+direction*(band+(step+1)/steps)/12
                    beam('bronze',point(t0,u0,.18),point(t1,u1,.18),.11,4 if LOW else 6)
    podium(26,25)

def spiral():
    h=106
    def point(t,u,extra=0):
        theta=u*math.tau+t*math.pi*.57
        # Rounded triangular cross-section, not rotated solid floor plates.
        radius=(12.8*(1-.25*t))*(1+.205*math.cos(u*math.tau*3))+extra
        return(radius*math.cos(theta),radius*math.sin(theta),t*h+4)
    rings('glass-lod' if LOW else 'dark-glass',point,32 if LOW else 64,36 if LOW else 60)
    for floor in range(64):
        for c in range(60):
            if LOW and (floor+c*5)%23>=3:continue
            pane='night-window' if (floor+c*5)%23<3 else 'sky-glass' if (floor+c*5)%17<4 else 'blue-glass'
            poly(pane,[point(floor/64,(c+.06)/60,.045),point(floor/64,(c+.94)/60,.045),point((floor+.88)/64,(c+.94)/60,.045),point((floor+.88)/64,(c+.06)/60,.045)],[(0,1,2,3)])
        if not LOW:
            for c in range(60):beam('silver',point((floor+.95)/64,c/60,.07),point((floor+.95)/64,(c+1)/60,.07),.027,4)
    for col in range(0 if LOW else 30):
        for j in range(32):beam('silver',point(j/32,col/30,.11),point((j+1)/32,col/30,.11),.055,4)
    # Three continuous helical seams make the twisting envelope legible at distance.
    for col in range(3):
        for j in range(64):beam('silver',point(j/64,col/3,.17),point((j+1)/64,col/3,.17),.16,6)
    for tier in [0,.25,.5,.75,1]:
        for col in range(60):beam('bronze',point(tier,col/60,.17),point(tier,(col+1)/60,.17),.10,5)
    # Rooftop equipment deck, perimeter rail and narrow service screens.
    for col in range(30):
        a=point(1,col/30,.02);b=point(1,(col+1)/30,.02)
        beam('silver',(a[0],a[1],a[2]+1),(b[0],b[1],b[2]+1),.045,4)
        beam('silver',a,(a[0],a[1],a[2]+1),.04,4)
    for i in range(3):
        box('roof',(-3+i*3.1,0,110.55),(2.4,3.7,1.1),.3)
        for j in range(6):box('silver',(-3+i*3.1,-1.5+j*.57,111.12),(2.1,.12,.07),.3)
    podium(33,32)

def deco():
    tiers=[(0,18,11,9),(18,32,9.5,8),(32,44,8,6.8),(44,54,6.6,5.5),(54,63,5,4.3),(63,68,3.5,3.2)]
    for base,top,w,d in tiers:
        box('sandstone',(0,0,(base+top)/2),(w*2,d*2,top-base))
        # Facade bays: genuinely recessed glazing surrounded by stone ribs.
        cols=max(3,int(w*2/2.1));floors=max(1,int((top-base)/3.2))
        for side in range(4):
            angle=side*math.pi/2;span=w if side%2==0 else d;offset=d if side%2==0 else w
            for c in range(cols):
                lateral=-span+(c+.5)*(2*span/cols)
                for floor in range(floors):
                    y=base+1.6+floor*(top-base)/floors
                    x0,y0=lateral,-offset-.025
                    x=x0*math.cos(angle)-y0*math.sin(angle);ypos=x0*math.sin(angle)+y0*math.cos(angle)
                    if LOW:
                        corners=[]
                        for dx,dz in [(-span/cols*.64,-1.075),(span/cols*.64,-1.075),(span/cols*.64,1.075),(-span/cols*.64,1.075)]:
                            corners.append((x+dx*math.cos(angle)+.05*math.sin(angle),ypos+dx*math.sin(angle)-.05*math.cos(angle),y+dz))
                        poly('night-window' if (floor*3+c*7+side)%11<2 else 'dark-glass',corners,[(0,1,2,3)])
                    else:
                        box('night-window' if (floor*3+c*7+side)%11<2 else 'dark-glass',(x,ypos,y),(2*span/cols*.64,.07,2.15),angle)
                        box('bronze',(x,ypos-.018*math.cos(angle),y-1.16),(2*span/cols*.69,.24,.12),angle)
                        box('limestone',(x,ypos,y+1.18),(2*span/cols*.7,.25,.18),angle)
                x0,y0=lateral+span/cols*.42,-offset-.11
                x=x0*math.cos(angle)-y0*math.sin(angle);ypos=x0*math.sin(angle)+y0*math.cos(angle)
                box('limestone',(x,ypos,(base+top)/2),(.22,.26,top-base),angle)
        box('limestone',(0,0,top-.16),(w*2+.55,d*2+.55,.32))
        box('bronze',(0,0,top+.08),(w*2+.25,d*2+.25,.12))
    def crown(t,u):
        radius=3.6*(1-.72*t)
        return (radius*math.cos(u*math.tau+math.pi/8),radius*.88*math.sin(u*math.tau+math.pi/8),68+9*t)
    rings('silver',crown,4,8)
    for i in range(8):beam('bronze',crown(0,i/8),crown(1,i/8),.09,5)
    beam('bronze',(0,0,77),(0,0,84),.14,8)
    # Multi-storey entry portal and stepped bronze canopy.
    for side in [-1,1]:
        box('limestone',(side*3.5,-9.3,4),(.6,.8,8))
        for n in range(3):box('bronze',(side*(4+n*.34),-9.15,4.2),(.12,.34,8.3-n*.6))
    box('bronze',(0,-9.4,8.1),(7.5,.9,.3));entrance(9,0,6)

def car(kind):
    long=kind=='bus';van=kind=='delivery'
    length=9 if long else 5.2 if van else 4.5;width=2.3 if long else 1.9
    paint='taxi' if kind=='taxi' else 'white-paint' if kind in ['electric','delivery'] else 'red-paint'
    box(paint,(0,0,.95),(width,length,.7))
    box('roof',(0,0,.47),(width*.86,length*.94,.2))
    if long or van:
        box(paint,(0,-.2,1.8),(width*.97,length*.83,1.2 if long else 1.8))
        box('dark-glass',(0,-length*.405,1.95),(width*.84,.035,.7))
        if long:
            for side in [-1,1]:
                for i in range(7):box('dark-glass',(side*width*.492,-length*.3+i*length*.105,1.98),(.035,.78,.6))
    else:
        # Sloped cabin including windshield, roof and rear window.
        poly('dark-glass',[(-.83,-1.3,1.2),(.83,-1.3,1.2),(.7,-.65,1.9),(-.7,-.65,1.9),(-.74,.9,1.85),(.74,.9,1.85),(-.85,1.35,1.2),(.85,1.35,1.2)],[(0,1,2,3),(3,2,5,4),(4,5,7,6),(0,3,4,6),(1,7,5,2)])
        box(paint,(0,.1,1.9),(1.43,1.4,.08))
    for side in [-1,1]:
        for end in [-1,1]:
            center=(side*width*.5,end*length*.32,.48)
            beam('rubber',(center[0]-.13,center[1],center[2]),(center[0]+.13,center[1],center[2]),.42,12)
            beam('silver',(center[0]-.145,center[1],center[2]),(center[0]+.145,center[1],center[2]),.23,10)
        box('window-light',(side*.62,-length/2-.012,.95),(.32,.035,.17))
        box('red-paint',(side*.62,length/2+.012,.95),(.3,.035,.16))
    if kind=='taxi':box('window-light',(0,0,2.02),(.65,.38,.18))

def human():
    # Faceted tailored silhouette: shoulders, torso, bent elbows, trousers, hands.
    box('cloth',(0,0,1.2),(.46,.25,.58))
    box('skin',(0,0,1.66),(.22,.21,.26))
    box('roof',(0,.015,1.8),(.24,.22,.08))
    for side in [-1,1]:
        beam('cloth',(side*.25,0,1.44),(side*.32,.04,1.06),.085,6)
        beam('cloth',(side*.32,.04,1.06),(side*.28,-.12,.89),.063,6)
        box('skin',(side*.28,-.12,.87),(.11,.12,.15))
        beam('roof',(side*.13,0,.94),(side*.15,side*.07,.46),.10,6)
        beam('roof',(side*.15,side*.07,.46),(side*.17,side*.12,.13),.075,6)
        box('rubber',(side*.17,side*.12-.06,.075),(.17,.3,.15))

if __name__ == '__main__':
    stats=[]
    for name,fn in [('b01-diagrid',spring),('b02-spiral',spiral),('b03-deco',deco)]:fn();stats.append(export(name))
    LOW=True
    for name,fn in [('b01-diagrid',spring),('b02-spiral',spiral),('b03-deco',deco)]:fn();stats.append(export(name+'-lod'))
    LOW=False
    for name in ['sedan','taxi','bus','delivery','electric']:car(name);stats.append(export('vehicle-'+name))
    human();stats.append(export('pedestrian'))
    with open(os.path.join(OUT,'manifest.json'),'w',encoding='utf-8') as f:json.dump({'generator':'Blender 4.5 LTS / scripts/build-city-landmarks.py','license':'Original project-authored geometry; references inform shape only, not exact landmark twins.','assets':stats},f,ensure_ascii=False,indent=2)
    print('CARBONTWIN_ASSETS '+json.dumps(stats))
