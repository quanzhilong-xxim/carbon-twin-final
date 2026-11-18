"""Distinct short male sweep and low-bun female sweep, with retained real rigs."""
import bpy,bmesh,math,sys,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BUSINESS=ROLE=='Business'
STEM=f'CT_{ROLE}_Explore_v122k'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve K')
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122h.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122h'];rig=bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
for obj in root.children_recursive:
    if obj.type=='MESH' and obj.name.startswith(('V122h curved forelock','V122h forelock fine strand','V122h tapered soft temple')):obj.hide_render=True
eye=1.204 if BUSINESS else 1.588
center=Vector((0,-.026,eye+(.020 if BUSINESS else .034)))
rx,ry,rz=(.124,.123,.113) if BUSINESS else (.135,.146,.136)
hair=bpy.data.materials['V122b chestnut flowing hair']
shader=hair.node_tree.nodes['Principled BSDF'];shader.inputs['Roughness'].default_value=.52;shader.inputs['Specular IOR Level'].default_value=.24
def edge(phi):
    return (1.64 if BUSINESS else 1.70)+(.53 if BUSINESS else .61)*max(0,math.sin(phi))-(.50 if BUSINESS else .40)*max(0,-math.sin(phi))-.06*math.cos(phi)+.022*math.sin(phi*3+.6)
def surface(phi,theta,lift=0):
    d=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)))
    n=Vector((d.x/rx,d.y/ry,d.z/rz)).normalized()
    flow=phi+.26*math.sin(theta)*math.sin(phi+1.1)
    volume=.003*math.sin(phi*2+theta*2)*math.sin(theta)**2+.005*max(0,math.cos(theta))
    volume+=(.00042*math.sin(flow*93+theta*13)+.00016*math.sin(flow*181+theta*24))*math.sin(theta)**.8
    return center+Vector((d.x*rx,d.y*ry,d.z*rz))+n*(lift+volume),n
shell=bpy.data.objects['V122e closed measured groom shell'];C=192;M=64
for j in range(M+1):
    for i in range(C+1):
        phi=i/C*math.tau;shell.data.vertices[j*(C+1)+i].co=surface(phi,.001+(edge(phi)-.001)*j/M,.001)[0]

def lock(name,controls,width,depth):
    controls=[Vector(p) for p in controls];N=72;C=20;vs=[];fs=[];uv=[]
    def at(t):
        a,b,c,d=controls;q=a*(1-t)**3+b*3*(1-t)**2*t+c*3*(1-t)*t*t+d*t**3
        return surface(q.x,q.y,.003+.005*math.sin(math.pi*t))
    for j in range(N+1):
        t=j/N;p,n=at(t);a,_=at(max(0,t-.001));b,_=at(min(1,t+.001));side=(b-a).normalized().cross(n).normalized()
        width_t=width*(.38+.62*math.sin(math.pi*t)**.60)*(.06+.94*(1-t**5)**.65)
        depth_t=depth*(.32+.68*math.sin(math.pi*t))*(1-.92*t**5)
        for k in range(C):
            angle=k/C*math.tau;ridge=.00020*math.cos(angle*7+t*3)*math.sin(math.pi*t)
            vs.append(p+side*math.cos(angle)*width_t+n*math.sin(angle)*(depth_t+ridge));uv.append((k/C,t))
    for j in range(N):
        for k in range(C):a=j*C+k;b=j*C+(k+1)%C;fs.append((a,b,b+C,a+C))
    fs.extend([tuple(reversed(range(C))),tuple(N*C+k for k in range(C))])
    make(name,vs,fs,hair,'CT_Head',uv)
if BUSINESS:
    designs=[
      ([(-.70,.61),(-1.00,.62),(-2.00,.91),(-2.91,1.50)],.015,.0034),
      ([(-.43,.50),(-.90,.56),(-1.90,.89),(-2.74,1.39)],.017,.0035),
      ([(-.15,.45),(-.65,.48),(-1.55,.78),(-2.43,1.24)],.017,.0038),
      ([(.14,.48),(-.25,.41),(-1.24,.69),(-2.06,1.12)],.016,.0035),
      ([(.37,.63),(.09,.43),(-.76,.57),(-1.58,1.07)],.015,.0030),
      ([(-.42,.64),(-.02,.75),(.39,1.17),(.28,1.67)],.012,.0028),
      ([(-.09,.57),(.34,.75),(.91,1.21),(.80,1.75)],.013,.0030)]
else:
    designs=[
      ([(-.64,.57),(-1.02,.72),(-2.09,1.04),(-3.00,1.64)],.019,.0042),
      ([(-.33,.46),(-.84,.54),(-1.88,.94),(-2.79,1.48)],.021,.0043),
      ([(-.02,.46),(-.54,.43),(-1.53,.80),(-2.43,1.33)],.019,.0040),
      ([(.24,.56),(-.16,.43),(-1.18,.70),(-2.02,1.24)],.018,.0038),
      ([(-.38,.65),(.07,.83),(.27,1.32),(.13,1.83)],.015,.0034),
      ([(-.03,.55),(.42,.79),(.88,1.31),(.66,1.93)],.017,.0035),
      ([(.35,.63),(.76,.86),(1.08,1.48),(1.20,2.05)],.015,.0030)]
for i,(controls,width,depth) in enumerate(designs):lock('V122k measured swept lock '+str(i),controls,width,depth)
# Few tapered silhouette wisps replace the dense aliased dotted fibre lines.
for sign in [-1,1]:
    for k in range(3):
        def point(t):
            phi=(-3.08 if sign<0 else .11)+k*.035
            p,n=surface(phi,1.28+(.42 if BUSINESS else .60)*t,.002)
            return p+n*(.0015*math.sin(t*math.pi))
        swept('V122k temple silhouette wisp',point,lambda t:.0010*(1-.94*t),lambda t:.0008*(1-.94*t),hair,'CT_Head',40,8)
changes=['Shorter measured male sweep with exposed forehead; distinct softer low-bun sweep for the city role','Narrower curved locks and continuous combed scalp replace the broad diagonal hair sheet','Fine geometric comb texture and sparse tapered silhouette wisps reduce aliased dotted fibre lines']
if BUSINESS:
    shirt=bpy.data.objects['Shirt front']
    for v in shirt.data.vertices:
        t=max(0,min(1,(v.co.z-.98)/.0763));t=t*t*(3-2*t)
        v.co.y+=.059*t
    for poly in shirt.data.polygons:poly.use_smooth=True
    changes+=['Shirt front follows the real neck-to-chest slope, revealing the folded collar instead of burying its upper half']
for material in bpy.data.materials:
    if not material.use_nodes or not any(term in material.name.lower() for term in ['pinstripe','poplin','oyster','woven','wool']):continue
    for node in material.node_tree.nodes:
        if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=min(.14,node.inputs['Strength'].default_value)
        if node.type=='BUMP':node.inputs['Strength'].default_value=min(.12,node.inputs['Strength'].default_value)
changes+=['Restrained clothing normal strength retains fabric detail without coarse embossed streaks']
export_candidate(root,rig,OUT,STEM,f'CT_{ROLE}_Explore_v122h','v122k',changes)
