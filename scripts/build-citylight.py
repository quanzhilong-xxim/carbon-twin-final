"""G2 original Light Tower. No external service; Blender 4.5.9 LTS.
One metre/unit. Export does not overwrite previous architectural studies.
"""
import importlib.util, os, math, json, hashlib, bpy

spec=importlib.util.spec_from_file_location('geometry',os.path.join(os.path.dirname(__file__),'build-city-landmarks.py'))
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
g.OUT=os.path.join(g.ROOT,'public','models','citylight');os.makedirs(g.OUT,exist_ok=True)
g.material('curtain-glass',(.095,.18,.23),.5,.2)
g.material('curtain-warm',(.095,.18,.23),.5,.2)
g.material('curtain-silver',(.18,.27,.30),.55,.23)
g.material('spandrel',(.045,.073,.09),.5,.34)
g.material('anodized',(.41,.43,.41),.76,.3)
g.material('copper',(.39,.25,.13),.73,.32)
g.material('interior-wall',(.51,.43,.31),0,.78)
g.material('interior-floor',(.29,.27,.23),.08,.35)
g.material('light-strip',(1,.65,.28),0,.45,2)
g.material('clear-glass',(.79,.88,.91),0,.14)
p=g.MATS['clear-glass'].node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.82;p.inputs['IOR'].default_value=1.5
g.material('office-glass',(.79,.88,.91),0,.06)
p=g.MATS['office-glass'].node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.94;p.inputs['IOR'].default_value=1.45
box,beam,poly=g.box,g.beam,g.poly

def outline(t,u,offset=0):
    # Soft rectangular tower with genuine upper-floor setbacks and an offset
    # centre of mass; not a stack of opaque floor plates.
    tier=0 if t<.52 else 1 if t<.83 else 2
    w=12-tier*1.15;d=9.7-tier*.5
    w+=offset;d+=offset;r=2.5
    # Equal arc-length sampling: front panes remain near 1.6m wide instead of
    # the 5m-wide centre panes of a uniformly sampled superellipse.
    lengths=[2*(w-r),math.pi*r/2,2*(d-r),math.pi*r/2]*2
    s=(u%1)*sum(lengths)
    for part,length in enumerate(lengths):
        if s<=length:break
        s-=length
    q=s/length
    if part==0:x,y=-w+r+q*2*(w-r),-d
    elif part==1:a=-math.pi/2+q*math.pi/2;x,y=w-r+r*math.cos(a),-d+r+r*math.sin(a)
    elif part==2:x,y=w,-d+r+q*2*(d-r)
    elif part==3:a=q*math.pi/2;x,y=w-r+r*math.cos(a),d-r+r*math.sin(a)
    elif part==4:x,y=w-r-q*2*(w-r),d
    elif part==5:a=math.pi/2+q*math.pi/2;x,y=-w+r+r*math.cos(a),d-r+r*math.sin(a)
    elif part==6:x,y=-w,d-r-q*2*(d-r)
    else:a=math.pi+q*math.pi/2;x,y=-w+r+r*math.cos(a),-d+r+r*math.sin(a)
    x+=tier*.42
    return x,y,11+t*110.4

def make_tower():
    segments=48;floors=32
    for f in range(floors):
        t0=f/floors;t1=(f+.81)/floors
        for c in range(segments):
            u0=(c+.025)/segments;u1=(c+.975)/segments
            mat='curtain-warm' if (f*17+c*11)%31<6 else 'curtain-silver' if (f*7+c)%19<3 else 'curtain-glass'
            mid=outline(t0,(c+.5)/segments)
            if f in [2,3] and mid[1]<-9 and abs(mid[0])<8:mat='office-glass'
            poly(mat,[outline(t0,u0),outline(t0,u1),outline(t1,u1),outline(t1,u0)],[(0,1,2,3)])
            # Recessed floor edge and tangible aluminium mullions.
            poly('spandrel',[outline(t1,c/segments,-.07),outline(t1,(c+1)/segments,-.07),outline((f+1)/floors,(c+1)/segments,-.07),outline((f+1)/floors,c/segments,-.07)],[(0,1,2,3)])
            beam('anodized',outline(t0,c/segments,.09),outline((f+1)/floors,c/segments,.09),.045,4)
            beam('anodized',outline(t1,c/segments,.06),outline(t1,(c+1)/segments,.06),.035,4)
        if f in [16,26,31]:
            z=11+(f+1)*110.4/floors
            box('roof',(.9 if f>16 else 0,0,z+.08),(24 if f==16 else 21.4,20,.16))
            for x in [-9,-4,3,8]:
                box('limestone',(x,-9.2,z+.4),(2.3,.9,.6));box('leaf',(x,-9.2,z+.88),(2.1,.75,.5))
            for x in [-10,10]:beam('anodized',(x,-8.8,z+.8),(x,8.8,z+.8),.035,5)
    # Two structural fins turn the lantern crown into a distinctive silhouette.
    for x,height in [(-9,133.8),(10,129.7)]:
        box('copper',(x,0,(11+height)/2),(.25,6,height-11))
        box('anodized',(x-.17,-2.9,(11+height)/2),(.12,.16,height-11))
    box('roof',(.7,0,121.6),(19.5,17,.35))
    for x in [-7,-3.4,.2,3.8,7.4]:
        box('clear-glass',(x,-5.8,124.7),(3.3,.07,5.9))
        box('light-strip',(x,-4.5,126.9),(2.7,.15,.08))
        box('anodized',(x-1.7,-5.9,124.8),(.13,.3,6.4))
    box('interior-wall',(.2,2.7,124.7),(17,.2,5.9))
    for z in [122,123,124,125,126,127.6]:
        for c in range(3):box('copper',(.6,6+c*.65,z),(19,.12,.12))
    box('roof',(.5,0,128),(20,15,.35))
    for x in [-4,1,5]:
        box('roof',(x,2,129),(2.7,3,1.5))
        for j in range(7):box('anodized',(x,.7+j*.38,129.8),(2.4,.1,.07))
    # Distinct service spine on the rear, including fins and technical vents.
    for f in range(3,30):
        z=12+f*3.45
        box('anodized',(0,9.7,z),(3,.26,.25))
        for j in range(3):box('spandrel',(-.8+j*.8,9.85,z+.8),(.5,.1,1.1))
    # Two inspectable office floors: physical ceilings, desks, partitions and
    # back walls behind selected transparent curtain panels.
    for f in [2,3]:
        z=11+f*3.45
        box('interior-floor',(0,-6,z+.08),(16,6,.16))
        box('interior-floor',(0,-6,z+3.3),(16,6,.18))
        box('interior-wall',(0,-3,z+1.7),(16,.15,3.1))
        for x in [-6,-2,2,6]:
            box('limestone',(x,-6.6,z+.85),(1.8,.9,.1))
            for dx in [-.7,.7]:box('anodized',(x+dx,-6.6,z+.43),(.07,.7,.82))
            box('roof',(x,-6.5,z+1.25),(.65,.08,.4))
            box('cloth',(x,-5.4,z+.7),(.65,.65,.1));box('cloth',(x,-5.1,z+1.05),(.65,.12,.7))
            box('light-strip',(x,-6,z+3.16),(2.8,.13,.06))

def lobby():
    # Physical occupied two-storey podium. Faces are separate from its interior.
    for z,w,d in [(.12,46,37),(.3,45,36),(.48,44,35)]:box('limestone',(0,0,z),(w,d,.18))
    for z in [.64,5.6,10.6]:box('interior-floor',(0,0,z),(41,31,.24))
    for x in [-19.5,-12,-5.6,5.6,12,19.5]:
        for y in [-14.6,13.9]:box('limestone',(x,y,5.6),(.65,.75,9.9))
    for x in [-18,-14,-10,-6,6,10,14,18]:
        for z in [2.9,7.9]:
            box('clear-glass',(x,-15.7,z),(3.8,.075,4.35))
            box('anodized',(x-1.94,-15.8,z),(.12,.22,4.6))
    for side in [-1,1]:
        for y in [-12,-8,-4,0,4,8,12]:
            for z in [2.9,7.9]:
                box('clear-glass',(side*20.4,y,z),(.075,3.8,4.35))
                box('anodized',(side*20.5,y-1.94,z),(.22,.12,4.6))
    box('interior-wall',(0,12.9,3),(38,.4,4.6))
    for x in [-15,-8,8,15]:
        box('interior-wall',(x,6,2.9),(.18,9,4.4))
        for y in [-9,-3,3]:
            box('limestone',(x,y,1.1),(2.6,.85,.7))
            box('cloth',(x,y+.3,1.7),(2.6,.25,.6))
        box('copper',(x,-12,1),(1.5,1.5,.8));box('leaf',(x,-12,2),(1.6,1.5,1.3))
    # Open central vestibule has floor, side walls, reception and ceiling lights.
    box('interior-wall',(0,5.5,2.5),(7,.35,3.6));box('copper',(0,1.3,1.25),(5.5,1.2,1.1))
    for x in [-2.1,2.1]:
        box('clear-glass',(x,-15.9,2.7),(3.9,.08,4))
        box('anodized',(x-.1,-16.02,2.7),(.055,.16,.7))
    for z in [5.3,10.3]:
        for x in [-15,-8,0,8,15]:box('light-strip',(x,-1,z),(.12,23,.06))
    box('copper',(0,-18.3,5.3),(15,7.2,.26))
    for x in [-6.8,6.8]:box('anodized',(x,-20.8,2.7),(.22,.22,5.1))
    # Louvered rooftop edge and a usable service entrance at the back.
    for i in range(50):box('anodized',(-20+i*.82,-16.1,10.35),(.13,.3,.7))
    box('roof',(0,15.25,2.4),(5,.3,3.7))
    for x in [-2.5,0,2.5]:box('anodized',(x,15.5,2.4),(.15,.2,3.9))

make_tower();lobby()
stats=g.export('light-tower-v2')
dest=os.path.join(g.OUT,'light-tower-v2.glb');stats['sha256']=hashlib.sha256(open(dest,'rb').read()).hexdigest()
stats.update(id='CL-T01',name='光之塔',status='candidate-unapproved',unit='metre',dimensions=[46,133.8,37],source='scripts/build-citylight.py',license='Original project-authored geometry and embedded textures; no reference image pixels')
with open(os.path.join(g.OUT,'manifest-v2.json'),'w',encoding='utf8')as f:json.dump(stats,f,ensure_ascii=False,indent=2)
old=os.path.join(g.OUT,'manifest.json')
if os.path.exists(old) and not os.path.exists(os.path.join(g.OUT,'manifest-v1.json')):
    import shutil;shutil.copy2(old,os.path.join(g.OUT,'manifest-v1.json'))
with open(old,'w',encoding='utf8')as f:json.dump(stats,f,ensure_ascii=False,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(g.ROOT,'work','citylight-light-tower-v2.blend'))
print('CITYLIGHT_HERO '+json.dumps(stats,ensure_ascii=False))
