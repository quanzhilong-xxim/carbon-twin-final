"""Layered, alpha-edged 3D hair ribbons on a retained closed weighted scalp."""
import bpy,bmesh,sys,math,random
import numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BUSINESS=ROLE=='Business';STEM=f'CT_{ROLE}_Explore_v122m'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve M')
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122l.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122l'];rig=bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
for o in root.children_recursive:
    if o.type=='MESH' and o.name.startswith(('V122l sculpted swept','V122l tapered temple')):o.hide_render=True
eye=1.204 if BUSINESS else 1.588;center=Vector((0,-.026,eye+(.020 if BUSINESS else .034)))
rx,ry,rz=(.124,.123,.113) if BUSINESS else (.135,.146,.136)
def surface(phi,theta,lift=0):
    d=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)));n=Vector((d.x/rx,d.y/ry,d.z/rz)).normalized()
    volume=.004*math.sin(phi*2.5+theta*3)*math.sin(theta)**2+.008*max(0,math.cos(theta))
    return center+Vector((d.x*rx,d.y*ry,d.z*rz))+n*(lift+volume),n
# Each actual ribbon has strand-shaped cutouts and varied tips. Geometry
# supplies depth; the texture supplies fibre-scale edges and colour only.
n=1024;yy,xx=np.mgrid[:n,:n];u=xx/(n-1);v=yy/(n-1);alpha=np.zeros((n,n),np.float32);signal=np.zeros_like(alpha)
rng=random.Random(412 if BUSINESS else 813)
for i in range(36):
    centre_u=(i+.5)/36+.005*np.sin(v*(3+i%5)+i)
    width=(.008+rng.random()*.005)*(1-.58*v**5)
    line=np.clip(1-np.abs(u-centre_u)/width,0,1)
    end=.79+rng.random()*.21
    line*=np.clip((end-v)/.055,0,1)
    np.maximum(alpha,line,out=alpha)
    signal+=line*(.74+rng.random()*.32)
signal=np.clip(signal,.35,1.25)
pixels=np.ones((n,n,4),np.float32)
pixels[:,:,:3]=signal[:,:,None]*np.array([.235,.125,.076] if BUSINESS else [.205,.102,.065])[None,None,:]
pixels[:,:,3]=np.clip(alpha*2.2,0,1)
image=bpy.data.images.new('V122m chestnut strand ribbon atlas',width=n,height=n,alpha=True);image.pixels.foreach_set(pixels.ravel());image.pack()
material=mat('V122m layered physical hair strands',(.18,.09,.05),.43,.27)
material.surface_render_method='DITHERED'
p=material.node_tree.nodes['Principled BSDF'];p.inputs['Anisotropic'].default_value=.65
texture=material.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image
material.node_tree.links.new(texture.outputs['Color'],p.inputs['Base Color']);material.node_tree.links.new(texture.outputs['Alpha'],p.inputs['Alpha'])
designs=[
 ([(-.70,.62),(-1.12,.94),(-2.10,1.34),(-3.02,1.87)],.025),
 ([(-.43,.50),(-1.00,.71),(-1.92,1.14),(-2.79,1.66)],.023),
 ([(-.12,.46),(-.66,.53),(-1.64,1.00),(-2.50,1.49)],.022),
 ([(.18,.56),(-.23,.43),(-1.20,.85),(-2.11,1.36)],.021),
 ([(.40,.67),(.05,.47),(-.82,.70),(-1.62,1.25)],.020),
 ([(-.45,.64),(-.07,.85),(.22,1.35),(.10,1.95)],.021),
 ([(-.10,.58),(.28,.77),(.79,1.29),(.63,2.06)],.020),
 ([(.29,.65),(.65,.91),(1.06,1.43),(1.18,2.15)],.018)]
for index,(controls,spread) in enumerate(designs):
    controls=[Vector(v) for v in controls];rng=random.Random(index+20)
    vs=[];fs=[];uv=[];N=64;C=6
    for strand in range(7):
        offset=(strand-3)*spread*.31
        root_shift=rng.uniform(-.045,.045);tip_shift=rng.uniform(-.07,.07);tip_len=rng.uniform(-.07,.06)
        def at(t):
            a,b,c,d=controls;q=a*(1-t)**3+b*3*(1-t)**2*t+c*3*(1-t)*t*t+d*t**3
            q.x+=root_shift*(1-t)+tip_shift*t*t;q.y+=tip_len*t*t
            return surface(q.x,q.y,.004+.013*math.sin(math.pi*t)**.7)
        start=len(vs)
        for j in range(N+1):
            t=j/N;p,n=at(t);a,_=at(max(0,t-.001));b,_=at(min(1,t+.001));side=(b-a).normalized().cross(n).normalized()
            taper=.25+.75*(1-t**5)**.5
            width=spread*.27*(.72+.28*math.sin(math.pi*t))*taper
            p+=side*offset*(.35+.65*math.sin(math.pi*t)**.7)
            p+=n*(.001+strand*.00038+(.002 if BUSINESS else .004)*math.sin(t*math.pi*1.5+strand*.5))
            for k in range(C+1):
                s=k/C*2-1
                vs.append(p+side*s*width+n*(1-s*s)*.0018);uv.append((k/C,t))
        for j in range(N):
            for k in range(C):a=start+j*(C+1)+k;fs.append((a,a+1,a+C+2,a+C+1))
    make('V122m layered strand sweep '+str(index),vs,fs,material,'CT_Head',uv)
changes=['True head-weighted layered three-dimensional strand ribbons with varied roots, lengths and translucent fibre edges','Preserved closed scalp, distinct native faces, low bun, real humanoid skin and facial morphs']
export_candidate(root,rig,OUT,STEM,f'CT_{ROLE}_Explore_v122l','v122m',changes)
