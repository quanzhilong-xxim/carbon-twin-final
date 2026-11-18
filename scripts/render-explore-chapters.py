"""Six original, separate 3D compositions. Existing assets + local Blender only.
Editable sources remain outside the web root; no paid generation or source overwrite.
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'public/media/explore-v10'
SOURCES=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/chapter-scenes-v1')
WEB.mkdir(parents=True,exist_ok=True);SOURCES.mkdir(parents=True,exist_ok=True)
NAMES=['culture','waterfront','innovation','valley','mobility','symbiosis']
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
indices=[int(args[0])] if args else range(6)

def mat(name,color,rough=.7,metal=0,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m
def cube(name,p,s,m,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
    if bevel:
        mod=o.modifiers.new('Edge catches','BEVEL');mod.width=bevel;mod.segments=2
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def cylinder(name,p,r,h,m,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=p);o=bpy.context.object;o.name=name;o.data.materials.append(m)
    for poly in o.data.polygons:poly.use_smooth=True
    return o
def curve(name,points,r,m):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16;c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for bp,p in zip(s.bezier_points,points):bp.co=p;bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.scene.collection.objects.link(o);o.data.materials.append(m);return o
def load(file,height):
    old=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public'/file));items=[o for o in bpy.data.objects if o not in old and o.type=='MESH']
    points=[o.matrix_world@Vector(c) for o in items for c in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));ratio=height/(hi.z-lo.z)
    transform=Matrix.Scale(ratio,4)@Matrix.Translation((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z))
    prefab=[]
    for o in items:prefab.append((o,transform@o.matrix_world.copy()));o.hide_render=True;o.hide_set(True)
    return prefab
def place(prefab,p=(0,0,0),scale=1,angle=0,name='Instance'):
    transform=Matrix.Translation(p)@Matrix.Rotation(angle,4,'Z')@Matrix.Scale(scale,4)
    created=[]
    for source,local in prefab:
        o=source.copy();o.name=name+' / '+source.name;o.data=source.data;o.parent=None;bpy.context.scene.collection.objects.link(o);o.matrix_world=transform@local;o.hide_render=False;o.hide_set(False);created.append(o)
    return created
def camera(p,target,lens=46):
    d=bpy.data.cameras.new('Chapter camera');o=bpy.data.objects.new('Chapter camera',d);bpy.context.scene.collection.objects.link(o);o.location=p;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;bpy.context.scene.camera=o
def hill(name,p,scale,seed,m):
    random.seed(seed);verts=[];faces=[];n=32
    for y in range(n+1):
        for x in range(n+1):
            u=(x/n-.5)*2;v=(y/n-.5)*2;z=max(0,1-u*u-v*v)**1.4
            z*=.85+.12*math.sin(x*.7+seed)+.08*math.sin(y*.8+x*.25)
            verts.append((u*scale[0]+p[0],v*scale[1]+p[1],z*scale[2]+p[2]))
    for y in range(n):
        for x in range(n):a=y*(n+1)+x;faces.append((a,a+1,a+n+2,a+n+1))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(m);o=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(o)
    for poly in mesh.polygons:poly.use_smooth=True
def terrain_material():
    m=mat('Fine park soil and grass',(.15,.23,.1),.95);nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF')
    n=nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=55;n.inputs['Detail'].default_value=3
    ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.055,.10,.027,1);ramp.color_ramp.elements[1].color=(.23,.30,.10,1);links.new(n.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],p.inputs['Base Color'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.1;links.new(n.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs[0],p.inputs['Normal']);return m

for index in indices:
    bpy.ops.wm.read_factory_settings(use_empty=True);random.seed(200+index);scene=bpy.context.scene
    stone=mat('Warm limestone',(.61,.57,.44));wood=mat('Waterfront oak',(.28,.16,.075));dark=mat('Anodized bronze',(.055,.07,.05),.32,.65)
    glass=mat('Reflective architectural glass',(.11,.26,.27),.17,.65);gold=mat('Warm brass',(.48,.34,.13),.28,.75);roof=mat('Patinated roof',(.065,.105,.08),.5,.45)
    warm=mat('Interior lamps',(.95,.56,.18),.25,0,3);white=mat('Linen canopy',(.79,.75,.6),.8);grass=terrain_material()
    water=mat('Lake reflection',(.035,.11,.12),.13,.5);wn=water.node_tree.nodes;wl=water.node_tree.links;noise=wn.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=80;noise.inputs['Roughness'].default_value=.6;bump=wn.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.08;wl.new(noise.outputs['Fac'],bump.inputs['Height']);wl.new(bump.outputs[0],wn.get('Principled BSDF').inputs['Normal'])
    tree=load('models/urban-vegetation/CT_ParkTree_Street_v3.glb',10)
    people=load('models/characters-v10/CT_Citizen_Rain_LOD_v1.glb',1.72)
    a=load('models/city-studies/b01-diagrid-lod.glb',30)
    b=load('models/citylight/v12/light-court-lod.glb',28)
    c=load('models/citylight/v11/tide-gate-a-lod.glb',20)
    def tree_at(x,y,s=1):return place(tree,(x,y,.05),s,random.random()*6.28,'CC0 park tree')
    def person(x,y,angle=0):place(people,(x,y,.08),1,angle,'Attributed citizen')
    def bench(x,y,angle=0):
        cube('Bench seat',(x,y,.5),(2,.58,.12),wood,.04);cube('Bench back',(x,y+.28,.9),(2,.1,.7),wood,.04)
        for side in [-1,1]:cube('Bench frame',(x+side*.75,y,.24),(.07,.52,.5),dark,.015)
    def table(x,y):
        cylinder('Cafe table',(x,y,.8),.7,.08,wood);cylinder('Table leg',(x,y,.4),.06,.8,dark)
        for dx in [-1,1]:cube('Chair seat',(x+dx,y,.44),(.55,.55,.08),wood,.03);cube('Chair back',(x+dx*1.25,y,.7),(.06,.55,.6),wood,.025)
    def hall(x,y,w=12,d=8,h=6):
        cube('Glazed public room',(x,y,h/2),(w,d,h),glass,.1);cube('Roof plate',(x,y,h+.25),(w+2,d+2,.5),stone,.12)
        for j in range(9):cube('Facade mullion',(x-w/2+j*w/8,y-d/2-.05,h/2),(.085,.1,h),gold,.015)
        for j in range(4):cube('Floor edge',(x,y-d/2-.11,1+j*h/4),(w,.16,.12),stone,.02)
    def waterfront():cube('Water',(0,-28,-.35),(230,95,.5),water);cube('Quay',(0,-1,-.22),(100,6,.55),stone,.1)
    if index==0:
        waterfront();cube('Cultural gardens',(0,18,-.4),(110,38,.8),grass)
        # Original layered public pavilion, with a curved, ribbed roof.
        for tier,(w,d,z) in enumerate([(20,12,5),(15,9,8),(9,6,10.5)]):
            for j in range(25):
                x=-w/2+j*w/24;rise=.65*(abs(x)/(w/2))**3
                cube('Roof tile rib',(x,10,z+rise),(.74,d,.22),roof,.06)
            for side in [-1,1]:curve('Swept eave',[(-w/2,10+side*d/2,z+.7),(0,10+side*d/2,z),(w/2,10+side*d/2,z+.7)],.16,gold)
        for x in [-8,-4,0,4,8]:cylinder('Pavilion column',(x,7,2.6),.18,5.2,wood)
        cube('Museum ground floor',(0,10,2.55),(17,9,4.5),glass,.12)
        cube('Museum upper floor',(0,10,6.35),(11.5,6,2.6),wood,.08)
        cube('Museum lantern',(0,10,9),(6,4,2),glass,.06)
        for x in range(-8,9):cube('Fine timber screen',(x,5.42,2.6),(.11,.14,4.4),wood,.025)
        for x in [-5,-3,-1,1,3,5]:cube('Upper lattice',(x,6.9,6.35),(.1,.16,2.6),gold,.02)
        for step in range(4):cube('Waterfront museum step',(0,3.3-step*.65,.12-step*.045),(9,.65,.22),stone,.04)
        cube('Pavilion deck',(0,10,.3),(22,14,.6),stone,.15)
        for x,y in [(-21,5),(-29,16),(23,7),(29,20),(-13,26),(16,29)]:
            objects=tree_at(x,y,.9)
            for o in objects:
                for j,m in enumerate(o.data.materials):
                    if m and 'leaves' in m.name:
                        pink=m.copy();pink.name='Original artistic blossom tint';p=pink.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.62,.27,.36,1)
                        for link in list(p.inputs['Base Color'].links):pink.node_tree.links.remove(link)
                        o.data=o.data.copy();o.data.materials[j]=pink
        place(a,(25,34,0),.7);place(c,(-30,38,0),.65);person(-3,1);person(-5,1,2.3);bench(12,0);tree_at(-17,-5,1.2)
        for x in [-16,16]:cylinder('Planter pot',(x,2,.5),.75,1,stone);tree_at(x,2,.35)
        camera((32,-38,16),(0,9,4),47)
    elif index==1:
        waterfront();cube('Urban land',(0,24,-.5),(120,50,1),grass)
        for j in range(28):cube('Boardwalk plank',(-38+j*2.8,-4,.08),(2.75,8,.17),wood,.02)
        for x,h in [(-22,9),(-7,12),(12,16),(30,10)]:
            hall(x,15,12,9,h)
            for k in range(3):cube('Garden terrace',(x,12-k, h*.34*k+.4),(14-k*2,11,.23),stone,.1)
        for x in [-29,-15,0,16,32]:tree_at(x,5,.8);table(x,-1);person(x+2,-2,1.2)
        for x in [-7,12]:
            cylinder('Parasol mast',(x,-1,1.6),.045,3.2,dark);bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=2,radius2=.14,depth=.6,location=(x,-1,3.3));bpy.context.object.data.materials.append(white)
        hull=cube('Small electric boat',(8,-15,.05),(3,7,.9),white,.8);cube('Boat cabin',(8,-14,1),(2.3,2.7,1.2),glass,.3)
        place(b,(26,36,0),.7);camera((42,-37,19),(2,8,4),49)
    elif index==2:
        cube('Research park',(0,13,-.4),(140,95,.8),grass);cube('Civic plaza',(0,0,-.01),(52,38,.14),stone,.08)
        place(b,(-17,19,0),1);place(a,(27,31,0),1.15);place(c,(-38,35,0),1)
        hall(12,10,21,11,7)
        for x in range(-24,29,4):cube('Plaza joint',(x,-1,.07),(.035,34,.02),dark)
        for x,y in [(-28,-5),(29,-6),(-12,-16),(13,-18),(-40,7),(38,12)]:tree_at(x,y,1)
        for j in range(7):person(-10+j*4,-3+(j%2)*4,j*.7)
        curve('Research canopy',[(-5,0,6),(5,4,9),(20,6,8),(32,4,5)],.18,gold)
        camera((45,-49,25),(0,13,8),46)
    elif index==3:
        cube('Valley river',(0,-8,-.6),(230,32,.8),water)
        for j in range(5):hill('Distant forest ridge',(-90+j*42,70+j%2*18,0),(66,54,30+j%3*16),j,grass)
        for j in range(7):hill('Forested hillside',(-55+j*18,24+(j%2)*10,0),(28,28,11+j%3*5),30+j,grass)
        for j in range(27):tree_at(-62+(j%9)*15,9+(j//9)*13,.65+(j%4)*.08)
        for x,y,h in [(-26,15,4),(-8,19,6),(13,24,7),(35,23,5)]:hall(x,y,11,7,h)
        for x,y in [(-38,49),(4,68),(43,56)]:
            cylinder('Wind energy tower',(x,y,18),.3,36,white)
            for angle in [0,2.094,4.189]:
                blade=cube('Turbine blade',(x+math.sin(angle)*4.8,y,36+math.cos(angle)*4.8),(.55,.22,10),white,.2);blade.rotation_euler.y=angle
        curve('River footbridge',[(-18,-10,1),(0,-7,4),(18,-4,1)],.45,wood);camera((61,-54,28),(0,24,5),43)
    elif index==4:
        cube('Transport campus',(0,0,-.4),(170,120,.8),grass);cube('Pedestrian forecourt',(0,-4,0),(90,43,.18),stone)
        for y in [10,16]:
            cube('Rail ballast',(0,y,.14),(120,3,.3),dark)
            for side in [-1,1]:cube('Rail',(0,y+side*.7,.38),(120,.09,.13),gold)
        for x in [-24,-8,8,24]:
            cube('Train carriage',(x,10,2),(14,2.6,3.1),white,.65);cube('Continuous carriage glazing',(x,8.65,2.35),(12,.06,1.1),glass,.18)
            for wheelx in [-5,5]:cylinder('Train wheel',(x+wheelx,10,.6),.45,.35,dark)
        # A spatial roof with separate longitudinal ribs and a glazed concourse.
        for x in range(-38,39,4):curve('Station roof rib',[(x,-6,7),(x,7,13),(x,23,8)],.22,white)
        for y in [-6,4,14,23]:curve('Station roof beam',[(-39,y,7 if y in [-6,23] else 11.6),(0,y,7 if y in [-6,23] else 11.6),(39,y,7 if y in [-6,23] else 11.6)],.16,gold)
        hall(0,27,67,10,6)
        for x in [-43,-28,28,43]:tree_at(x,-12,.85)
        for j in range(12):person(-28+j*5,-8+(j%3)*1.4,j*.4)
        place(c,(38,44,0),1);camera((48,-55,27),(0,8,5),44)
    else:
        waterfront();cube('Lakeside park',(0,19,-.4),(140,44,.8),grass)
        for j in range(10):
            prefab=[a,b,c][j%3];place(prefab,(-50+j*12,36+(j%2)*11,0),.65+(j%4)*.18,j*.12)
        for j in range(12):tree_at(-56+j*10,7+(j%2)*6,.9)
        curve('Illuminated lake walk',[(-55,0,.1),(-20,-1,.1),(12,1,.1),(50,-1,.1)],.8,stone)
        for x in range(-45,46,10):
            cylinder('Lakeside lamp',(x,-.5,1.6),.045,3.2,dark);cylinder('Lamp glow',(x,-.5,3.2),.14,.2,warm)
            d=bpy.data.lights.new('Warm lake lamp','POINT');d.energy=35;d.color=(1,.53,.2);o=bpy.data.objects.new('Warm lake lamp',d);scene.collection.objects.link(o);o.location=(x,-.5,3)
        for j in range(8):person(-28+j*8,-1,j*.7)
        camera((40,-58,20),(0,18,7),48)
    # Original geometry and licensed sources are preserved per composition.
    world=bpy.data.worlds.new('Captured CC0 sky');world.use_nodes=True;scene.world=world;n=world.node_tree.nodes;l=world.node_tree.links
    env=n.new('ShaderNodeTexSky');env.sky_type='MULTIPLE_SCATTERING';env.sun_elevation=math.radians(12 if index!=5 else 2);env.sun_rotation=math.radians(-115);env.altitude=.1;env.air_density=1.3;env.aerosol_density=1.5;env.ozone_density=1.0;l.new(env.outputs['Color'],n['Background'].inputs[0]);n['Background'].inputs[1].default_value=.2 if index!=5 else .055
    sun=bpy.data.lights.new('Late afternoon sun','SUN');sun.energy=2.2 if index!=5 else .45;sun.angle=math.radians(5);sun.color=(1,.79,.53) if index!=5 else (.42,.58,.9);s=bpy.data.objects.new('Late afternoon sun',sun);scene.collection.objects.link(s);s.rotation_euler=(math.radians(54),math.radians(-10),math.radians(-35))
    scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.cycles.max_bounces=5
    scene.render.resolution_x=1000;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(WEB/(NAMES[index]+'.png'))
    scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
    for image in bpy.data.images:
        if image.source=='FILE':
            try:image.pack()
            except Exception:pass
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCES/(NAMES[index]+'.blend')))
    bpy.ops.render.render(write_still=True)
    (SOURCES/(NAMES[index]+'.json')).write_text(json.dumps({'scene':NAMES[index],'original_geometry':'CarbonTwin original chapter composition','tree':'Poly Haven Island Tree 02, CC0','sky':'Blender 5.2 multiple scattering atmosphere, original solar composition','citizen':'Rain Rig © Blender Foundation | cloud.blender.org, CC-BY-4.0; CarbonTwin adaptation','buildings':'Existing CarbonTwin original building assets, source versions retained','paid_calls':0},indent=2),encoding='utf8')
    print('CHAPTER_RENDERED',NAMES[index])
