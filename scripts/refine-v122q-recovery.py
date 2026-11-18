"""Continue the saved P/M candidates. No remote requests or source replacement.
Every facial edit is applied consistently to all expressions. Added hair fibres
follow the retained artist UV topology and are skinned to the actual head.
"""
import bpy,bmesh,sys,math,json
import numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate'
ROLE=sys.argv[-1];STUDENT=ROLE=='Student';BUSINESS=ROLE=='Business'
PARENT='v122m'if STUDENT else'v122p';REV='v122q';STEM=f'CT_{ROLE}_Explore_{REV}'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve existing '+STEM)
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_{PARENT}.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_{PARENT}'];rig=root if STUDENT else bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text()
exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
changes=[]

def morph_sculpt(obj,fn):
    for key in obj.data.shape_keys.key_blocks:
        for v in key.data:v.co=fn(v.co.copy())
    for v,k in zip(obj.data.vertices,obj.data.shape_keys.key_blocks[0].data):v.co=k.co

def tube_paths(name,paths,material,bone,radius=.00024):
    vs=[];fs=[];uv=[];C=6
    for points,normals in paths:
        if len(points)<4:continue
        start=len(vs)
        for j,(p,n) in enumerate(zip(points,normals)):
            t=j/(len(points)-1);tangent=points[min(j+1,len(points)-1)]-points[max(0,j-1)]
            if tangent.length<1e-7:tangent=Vector((0,0,1))
            tangent.normalize();side=tangent.cross(n).normalized();normal=side.cross(tangent).normalized()
            rr=radius*(.12+.88*math.sin(math.pi*t)**.32)
            for k in range(C):
                a=k/C*math.tau;vs.append(p+(side*math.cos(a)+normal*math.sin(a))*rr);uv.append((k/C,t))
        for j in range(len(points)-1):
            for k in range(C):a=start+j*C+k;b=start+j*C+(k+1)%C;fs.append((a,b,b+C,a+C))
    return make(name,vs,fs,material,bone,uv)if vs else None

def combed_paths(obj,axis,levels):
    mesh=obj.data;mesh.calc_loop_triangles();uv=mesh.uv_layers.active
    xyz=np.array([v.co[:]for v in mesh.vertices]);normal=np.array([v.normal[:]for v in mesh.vertices])
    triangles=list(mesh.loop_triangles)
    tex=np.array([[uv.data[i].uv[:]for i in t.loops]for t in triangles])
    ids=np.array([t.vertices[:]for t in triangles]);low=tex[:,:,axis].min(1);high=tex[:,:,axis].max(1)
    result=[]
    for level in levels:
        edges=[];positions={};normals={};neighbors={}
        for ti in np.where((low<level)&(high>level)&((high-low)<.3))[0]:
            points=[]
            for a,b in [(0,1),(1,2),(2,0)]:
                va,vb=tex[ti,a,axis],tex[ti,b,axis]
                if(va<=level<vb)or(vb<=level<va):
                    t=(level-va)/(vb-va);ia,ib=ids[ti,a],ids[ti,b]
                    p=xyz[ia]*(1-t)+xyz[ib]*t;n=normal[ia]*(1-t)+normal[ib]*t
                    key=tuple(np.round(p*100000).astype(int));positions[key]=Vector(p);normals[key]=Vector(n).normalized();points.append(key)
            if len(points)==2 and points[0]!=points[1]:
                a,b=points;neighbors.setdefault(a,set()).add(b);neighbors.setdefault(b,set()).add(a)
        used=set()
        for start in sorted(neighbors,key=lambda k:len(neighbors[k])):
            for second in list(neighbors[start]):
                if frozenset((start,second))in used:continue
                keys=[start];prev=start;cur=second
                for _ in range(3000):
                    used.add(frozenset((prev,cur)));keys.append(cur)
                    nxt=[x for x in neighbors[cur]if x!=prev and frozenset((cur,x))not in used]
                    if not nxt:break
                    prev,cur=cur,nxt[0]
                if len(keys)<5:continue
                pts=[positions[k]for k in keys];length=sum((b-a).length for a,b in zip(pts,pts[1:]))
                if length<.045 or length>.7:continue
                # Do not decorate short transverse polygons or UV seams.
                if max(p.z for p in pts)-min(p.z for p in pts)<.025:continue
                ns=[normals[k]for k in keys]
                result.append(([p+n*.00032 for p,n in zip(pts,ns)],ns))
    return result

if STUDENT:
    face=bpy.data.objects['Face']
    def soften(p):
        front=max(0,min(1,(-p.y+.006)/.045))
        p.z+=.0035*math.exp(-((p.z-1.388)/.038)**2)*front
        p.x*=1+.018*math.exp(-((p.z-1.393)/.030)**2)*front
        return p
    morph_sculpt(face,soften)
    chest=next(n for n in ['J_Bip_C_UpperChest','J_Bip_C_Chest']if n in rig.data.bones)
    for side,sign in [('L',1),('R',-1)]:
        sleeve=bpy.data.objects['V122b continuous bomber sleeve '+side]
        upper=sleeve.vertex_groups['J_Bip_'+side+'_UpperArm'];ch=sleeve.vertex_groups.get(chest)or sleeve.vertex_groups.new(name=chest)
        for v in sleeve.data.vertices:
            t=(v.index//48)/80;fall=max(0,1-t/.30);fall=fall*fall*(3-2*fall)
            v.co.z+=.023*fall;v.co.x-=sign*.009*fall;v.co.y-=.004*fall
            if t<.27:
                w=.85*max(0,1-t/.27)**2;ch.add([v.index],w,'REPLACE');upper.add([v.index],1-w,'REPLACE')
        for poly in sleeve.data.polygons:poly.use_smooth=True
    # Original bangs retain licensed topology; soften the uniform ruler-cut
    # ends with a small deterministic per-lock silhouette variation.
    hair=bpy.data.objects['Hair']
    for v in hair.data.vertices:
        p=v.co;end=max(0,min(1,(1.445-p.z)/.035))*max(0,min(1,(abs(p.x)-.075)/.028))*max(0,min(1,-p.y/.040))
        p.z+=.002*math.sin(abs(p.x)*710)*end
    changes=['Gentler lower-face proportion consistently applied to every original expression','Raise and fit both sleeve caps; chest-to-arm weights close the shoulder seam during articulated actions','Break the straight side-fringe cut with restrained per-lock variation; original hair and hands retained']
else:
    eye=1.204 if BUSINESS else 1.588;head=bpy.data.objects['V12e native head']
    def sculpt(p):
        front=max(0,min(1,(-p.y-.073)/.05))
        if BUSINESS:
            w=math.exp(-((abs(p.x)-.037)/.034)**4-((p.z-eye)/.030)**4)*front
            p.z=eye+(p.z-eye)*(1-.085*w)
        nose=eye-(.055 if BUSINESS else .058)
        w=math.exp(-(p.x/.035)**4-((p.z-nose)/.027)**4)*front
        p.x*=1-(.09 if BUSINESS else .08)*w;p.y+=.004*w;p.z+=.002*w
        mouth=eye-(.105 if BUSINESS else .095)
        w=math.exp(-(p.x/.048)**4-((p.z-mouth)/.020)**4)*front
        p.z=mouth+(p.z-mouth)*(1-.14*w);p.y+=.0013*w
        return p
    morph_sculpt(head,sculpt)
    if BUSINESS:
        def eye_sculpt(p):
            w=math.exp(-((abs(p.x)-.037)/.034)**4-((p.z-eye)/.030)**4)*max(0,min(1,(-p.y-.073)/.05))
            p.z=eye+(p.z-eye)*(1-.085*w);return p
        morph_sculpt(bpy.data.objects['V12e native eyes'],eye_sculpt)
    brows=bpy.data.objects['V12e native eyebrows'];basis=brows.data.shape_keys.key_blocks[0]
    offsets=[]
    for v in basis.data:
        t=max(0,min(1,(abs(v.co.x)-.012)/(.053 if BUSINESS else .075)))
        wanted=eye+(.027 if BUSINESS else .030)+.0035*math.sin(t*math.pi)-.001*t
        offsets.append((wanted-v.co.z)*.68)
    for key in brows.data.shape_keys.key_blocks:
        for i,v in enumerate(key.data):v.co.z+=offsets[i]
    for v,k in zip(brows.data.vertices,basis.data):v.co=k.co
    # Native sculpt UVs provide continuous surface-following fibres; compare
    # both directions and choose the one with more long crown-to-temple paths.
    fibre=mat('V122q restrained chestnut hair fibre',(.053,.025,.014)if BUSINESS else(.047,.021,.012),.55,.24)
    hairmat=bpy.data.materials['V122o artist sculpted chestnut hair'];p=hairmat.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=(.060,.028,.015,1)if BUSINESS else(.051,.022,.013,1)
    p.inputs['Roughness'].default_value=.49;p.inputs['Specular IOR Level'].default_value=.26
    fibres=0
    for obj in list(root.children_recursive):
        if obj.type!='MESH' or not obj.name.startswith('V122o retained artist'):continue
        candidates=[combed_paths(obj,axis,np.linspace(.007,.993,102))for axis in [0,1]]
        paths=max(candidates,key=lambda group:sum(max(p.z for p in pts)-min(p.z for p in pts)for pts,_ in group))
        tube_paths('V122q topology-following fine hair '+obj.name,paths,fibre,'CT_Head',.00023 if BUSINESS else .00025)
        fibres+=len(paths)
    print('REAL_HAIR_PATHS',ROLE,fibres,flush=True)
    changes=['Soften nasal tip and lip volume across every facial expression, with restrained adult eye aperture','Relax the expression-compatible brow arch','Fit real fine hair fibres to the retained artist-sculpted curved topology and head weights']
    if BUSINESS:
        for obj in root.children_recursive:
            if obj.type=='MESH'and obj.name.startswith(('V122n continuous fitted cotton bib','V122p raised folded cotton collar')):obj.hide_render=True
        cotton=bpy.data.materials['V122n warm ivory cotton']
        # A shaped neckline replaces the tall rectangular bib. Collar leaves
        # lie over it at the same depth as the existing, correctly placed tie.
        N=40;M=40;vs=[];fs=[];uv=[]
        for j in range(M+1):
            t=j/M
            for i in range(N+1):
                u=i/N;x=(2*u-1)*(.061-.012*t)
                top=1.046-.020*math.exp(-(x/.024)**4);z=.83+(top-.83)*t
                y=-.157+.052*t*t-.003*(1-(2*u-1)**2)
                vs.append(Vector((x,y,z)));uv.append((u,t))
        for j in range(M):
            for i in range(N):a=j*(N+1)+i;fs.append((a,a+1,a+N+2,a+N+1))
        make('V122q shaped cotton shirt neckline',vs,fs,cotton,'CT_Chest',uv)
        for sign in [-1,1]:
            a=Vector((sign*.015,-.116,1.058));b=Vector((sign*.052,-.111,1.053));c=Vector((sign*.048,-.168,1.004));d=Vector((sign*.023,-.174,1.030))
            vs=[];fs=[];uv=[];N=24
            for j in range(N+1):
                t=j/N
                for i in range(N+1):
                    u=i/N;p=a.lerp(b,u).lerp(d.lerp(c,u),t);p.y-=.004*math.sin(u*math.pi)*math.sin(t*math.pi)
                    vs.append(p);uv.append((u,t))
            for j in range(N):
                for i in range(N):a0=j*(N+1)+i;fs.append((a0,a0+1,a0+N+2,a0+N+1))
            o=make('V122q cutaway folded shirt collar',vs,fs,cotton,'CT_Chest',uv)
            modifier=o.modifiers.new('Thin turned cotton edge','SOLIDIFY');modifier.thickness=.0008
            bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=modifier.name)
        changes+=['Shaped neckline and turned cutaway cotton collar replace the tall rectangular shirt front; existing tie and lapels retained']
export_candidate(root,rig,OUT,STEM,f'CT_{ROLE}_Explore_{PARENT}',REV,changes,student=STUDENT)
