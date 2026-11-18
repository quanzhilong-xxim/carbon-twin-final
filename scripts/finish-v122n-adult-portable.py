import bpy,bmesh,sys,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BUSINESS=ROLE=='Business';STEM=f'CT_{ROLE}_Explore_v122n'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve N')
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122m.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122m'];rig=bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
hair=bpy.data.materials['V122m layered physical hair strands'];p=hair.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=.64;p.inputs['Specular IOR Level'].default_value=.16
changes=['Lower hair specular highlights while preserving actual layered strand geometry']
if BUSINESS:
    # Replace all accumulated collar/front panels with one measured shirt
    # bib and two folded leaves. Each surface is explicitly in front of the
    # jacket opening, instead of intersecting the broad old chest plane.
    for o in root.children_recursive:
        if o.type=='MESH' and o.name.startswith(('V12g continuous poplin','V122h curved cotton','V12f fitted stand collar','V11 close rolled poplin')):o.hide_render=True
    cotton=mat('V122n warm ivory cotton',(.74,.70,.61),.83,.18)
    N=48;M=36;vs=[];fs=[];uv=[]
    for j in range(M+1):
        t=j/M;z=.83+.233*t;half=.061-.009*t
        for i in range(N+1):
            u=i/N;x=(u*2-1)*half
            y=-.153+.066*t**2-.004*(1-(x/half)**2)
            vs.append(Vector((x,y,z)));uv.append((u,t))
    for j in range(M):
        for i in range(N):k=j*(N+1)+i;fs.append((k,k+1,k+N+2,k+N+1))
    make('V122n continuous fitted cotton bib',vs,fs,cotton,'CT_Chest',uv)
    for sign in [-1,1]:
        a=Vector((sign*.013,-.089,1.062));b=Vector((sign*.066,-.087,1.052));c=Vector((sign*.069,-.156,.991));d=Vector((sign*.018,-.158,1.015))
        vs=[];fs=[];uv=[];N=24
        for j in range(N+1):
            t=j/N
            for i in range(N+1):
                u=i/N;p=a.lerp(b,u).lerp(d.lerp(c,u),t)
                p.y-=.009*math.sin(u*math.pi)*math.sin(t*math.pi)
                vs.append(p);uv.append((u,t))
        for j in range(N):
            for i in range(N):k=j*(N+1)+i;fs.append((k,k+1,k+N+2,k+N+1))
        make('V122n folded visible collar leaf',vs,fs,cotton,'CT_Chest',uv)
    changes+=['Rebuilt shirt bib and rounded collar leaves use measured non-intersecting surfaces and real chest skin']
export_candidate(root,rig,OUT,STEM,f'CT_{ROLE}_Explore_v122m','v122n',changes)
