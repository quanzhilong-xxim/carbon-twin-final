import bpy,bmesh,sys,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BUSINESS=ROLE=='Business';STEM=f'CT_{ROLE}_Explore_v122l'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve L')
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122h.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122h'];rig=bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
for o in root.children_recursive:
    if o.type=='MESH' and o.name.startswith(('V122h curved forelock','V122h forelock fine strand','V122h tapered soft temple')):o.hide_render=True
eye=1.204 if BUSINESS else 1.588;center=Vector((0,-.026,eye+(.020 if BUSINESS else .034)))
rx,ry,rz=(.124,.123,.113) if BUSINESS else (.135,.146,.136)
hair=bpy.data.materials['V122b chestnut flowing hair'];hair.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.42
def edge(phi):
    front=max(0,-math.sin(phi));return 1.72+.57*max(0,math.sin(phi))-.48*front-.07*math.cos(phi)+.05*math.sin(phi*5+.6)*front
def surface(phi,theta,lift=0):
    d=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)));n=Vector((d.x/rx,d.y/ry,d.z/rz)).normalized()
    vol=.004*math.sin(phi*2.5+theta*3)*math.sin(theta)**2+.008*max(0,math.cos(theta))
    vol+=.00025*math.sin(phi*93+theta*12+math.sin(phi*3))*math.sin(theta)**.8
    return center+Vector((d.x*rx,d.y*ry,d.z*rz))+n*(lift+vol),n
shell=bpy.data.objects['V122e closed measured groom shell'];C=192;M=64
for j in range(M+1):
    for i in range(C+1):phi=i/C*math.tau;shell.data.vertices[j*(C+1)+i].co=surface(phi,.001+(edge(phi)-.001)*j/M,.001)[0]
def lock(controls,width,depth,index):
    controls=[Vector(v) for v in controls];N=84;C=24;vs=[];fs=[];uv=[]
    def at(t):
        a,b,c,d=controls;q=a*(1-t)**3+b*3*(1-t)**2*t+c*3*(1-t)*t*t+d*t**3
        return surface(q.x,q.y,.004+.013*math.sin(math.pi*t)**.7)
    for j in range(N+1):
        t=j/N;p,n=at(t);a,_=at(max(0,t-.001));b,_=at(min(1,t+.001));side=(b-a).normalized().cross(n).normalized()
        wt=width*(.42+.58*math.sin(math.pi*t)**.6)*(.06+.94*(1-t**4)**.65)
        dt=depth*(.3+.7*math.sin(math.pi*t))*(1-.93*t**5)
        for k in range(C):
            angle=k/C*math.tau;ridge=.00032*math.cos(angle*9+t*4)*math.sin(math.pi*t)
            vs.append(p+side*math.cos(angle)*wt+n*math.sin(angle)*(dt+ridge));uv.append((k/C,t))
    for j in range(N):
        for k in range(C):a=j*C+k;b=j*C+(k+1)%C;fs.append((a,b,b+C,a+C))
    fs.extend([tuple(reversed(range(C))),tuple(N*C+k for k in range(C))])
    m=hair.copy();m.name='V122l chestnut dimensional lock '+str(index)
    make('V122l sculpted swept lock '+str(index),vs,fs,m,'CT_Head',uv)
if BUSINESS:
    designs=[
      ([(-.72,.62),(-1.18,.90),(-2.15,1.28),(-3.04,1.82)],.023,.009),
      ([(-.45,.48),(-1.08,.72),(-2.02,1.18),(-2.85,1.66)],.022,.011),
      ([(-.15,.43),(-.71,.55),(-1.65,1.03),(-2.56,1.44)],.021,.011),
      ([(.15,.52),(-.28,.43),(-1.22,.88),(-2.15,1.39)],.020,.010),
      ([(.38,.64),(.02,.46),(-.87,.72),(-1.63,1.27)],.019,.009),
      ([(-.42,.64),(-.10,.81),(.22,1.33),(.10,1.91)],.018,.007),
      ([(-.08,.56),(.22,.72),(.73,1.26),(.61,1.98)],.017,.006),
      ([(.31,.65),(.66,.90),(1.08,1.40),(1.18,2.08)],.016,.005)]
else:
    designs=[
      ([(-.70,.60),(-1.17,.98),(-2.11,1.36),(-3.02,1.89)],.024,.008),
      ([(-.41,.48),(-1.00,.70),(-1.96,1.12),(-2.83,1.71)],.023,.010),
      ([(-.10,.47),(-.69,.54),(-1.67,1.00),(-2.55,1.52)],.022,.011),
      ([(.20,.56),(-.25,.43),(-1.23,.86),(-2.12,1.39)],.021,.010),
      ([(.43,.69),(.08,.48),(-.87,.68),(-1.61,1.29)],.020,.008),
      ([(-.43,.65),(-.05,.87),(.22,1.38),(.08,2.00)],.020,.007),
      ([(-.06,.59),(.31,.78),(.83,1.31),(.65,2.11)],.020,.007),
      ([(.31,.68),(.69,.94),(1.08,1.47),(1.19,2.18)],.018,.006)]
for i,(controls,w,d) in enumerate(designs):lock(controls,w,d,i)
for sign in [-1,1]:
    for k in range(2):
        def point(t):
            p,n=surface((-3.06 if sign<0 else .12)+k*.045,1.27+(.49 if BUSINESS else .73)*t,.004)
            return p+n*.002*math.sin(t*math.pi)
        swept('V122l tapered temple curl',point,lambda t:.0023*(1-.95*t),lambda t:.0016*(1-.95*t),hair,'CT_Head',48,10)
changes=['Rounder separate swept hair volumes and an irregular true hairline','Removed dense detached hair tracks; preserved continuous head skin, real face morphs and head weights']
if BUSINESS:
    shirt=bpy.data.objects['V12g continuous poplin front']
    for v in shirt.data.vertices:
        t=max(0,min(1,(v.co.z-.99)/.084));t=t*t*(3-2*t)
        v.co.y+=.041*t;v.co.z-=.012*t
    changes+=['Correct the visible continuous poplin front, revealing folded collar leaves at the neck']
    # Slightly softer lips remain one continuous expressive face mesh.
    head=bpy.data.objects['V12e native head'];mouth=eye-.105
    for key in head.data.shape_keys.key_blocks:
        for v in key.data:
            p=v.co;w=math.exp(-(p.x/.05)**4-((p.z-mouth)/.025)**4)*max(0,min(1,(-p.y-.08)/.04))
            p.z=mouth+(p.z-mouth)*(1-.10*w);p.y+=.0012*w
    for v,k in zip(head.data.vertices,head.data.shape_keys.key_blocks[0].data):v.co=k.co
for material in bpy.data.materials:
    if not material.use_nodes or not any(term in material.name.lower() for term in ['pinstripe','poplin','oyster','woven','wool']):continue
    for node in material.node_tree.nodes:
        if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=min(.14,node.inputs['Strength'].default_value)
        if node.type=='BUMP':node.inputs['Strength'].default_value=min(.12,node.inputs['Strength'].default_value)
export_candidate(root,rig,OUT,STEM,f'CT_{ROLE}_Explore_v122h','v122l',changes)
