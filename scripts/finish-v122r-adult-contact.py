"""Correct the Q review's thin brows, over-visible fibre lines and collar gap."""
import bpy,bmesh,sys,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BUSINESS=ROLE=='Business';STEM=f'CT_{ROLE}_Explore_v122r'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve R')
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122p.blend'),load_ui=False,use_scripts=False)
source=bpy.data.objects['V12e native eyebrows']
brows={k.name:[v.co.copy()for v in k.data]for k in source.data.shape_keys.key_blocks}
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122q.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122q'];rig=bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
obj=bpy.data.objects['V12e native eyebrows'];eye=1.204 if BUSINESS else 1.588
for key in obj.data.shape_keys.key_blocks:
    for dst,src in zip(key.data,brows[key.name]):
        dst.co=src
        t=max(0,min(1,(abs(src.x)-.014)/(.052 if BUSINESS else .072)))
        # Shift each cross-section together, retaining its real thickness.
        dst.co.z+=.0006*math.sin(t*math.pi)-(.0003 if BUSINESS else .0015)*t
for v,k in zip(obj.data.vertices,obj.data.shape_keys.key_blocks[0].data):v.co=k.co
for obj in list(root.children_recursive):
    if obj.type!='MESH'or not obj.name.startswith('V122q topology-following fine hair'):continue
    # Q tubes have six vertices per longitudinal ring. Narrow the tube around
    # each ring centre so the added geometry reads as fine strands.
    for start in range(0,len(obj.data.vertices),6):
        points=list(obj.data.vertices[start:start+6]);center=sum((v.co for v in points),Vector())/len(points)
        for v in points:v.co=center+(v.co-center)*.44
material=bpy.data.materials['V122q restrained chestnut hair fibre'];p=material.node_tree.nodes['Principled BSDF']
p.inputs['Base Color'].default_value=(.064,.030,.017,1)if BUSINESS else(.055,.025,.015,1)
p.inputs['Roughness'].default_value=.56;p.inputs['Specular IOR Level'].default_value=.18
changes=['Restore expression-aware brow volume and natural taper after the Q visual review','Narrow real hair fibre radii to 0.10 mm, reducing broad dark contour lines']
if BUSINESS:
    cotton=bpy.data.materials['V122n warm ivory cotton'];N=72;M=10;vs=[];fs=[];uv=[]
    # A continuous turned stand joins the neck to the open cutaway leaves.
    for j in range(M+1):
        t=j/M;rx=.049-.007*t;ry=.075-.010*t;cy=-.022
        for i in range(N+1):
            a=i/N*math.tau;front=max(0,-math.sin(a));z=1.045+.030*t-.004*front
            vs.append(Vector((rx*math.cos(a),cy+ry*math.sin(a),z)));uv.append((i/N,t))
    for j in range(M):
        for i in range(N):a=j*(N+1)+i;fs.append((a,a+1,a+N+2,a+N+1))
    o=make('V122r continuous turned cotton neckband',vs,fs,cotton,None,uv)
    for name in ['CT_Chest','CT_Neck']:o.vertex_groups.new(name=name)
    for v in o.data.vertices:
        t=(v.index//(N+1))/M;w=.5*t
        o.vertex_groups['CT_Chest'].add([v.index],1-w,'REPLACE');o.vertex_groups['CT_Neck'].add([v.index],w,'REPLACE')
    modifier=o.modifiers.new('Actual neckband skin','ARMATURE');modifier.object=rig
    # Cover the unlit triangle above the tie with the actual shirt fabric.
    vs=[Vector((-.025,-.116,1.056)),Vector((.025,-.116,1.056)),Vector((.022,-.176,1.018)),Vector((-.022,-.176,1.018))]
    make('V122r shaped shirt behind the tie knot',vs,[(0,1,2,3)],cotton,'CT_Chest',[(0,1),(1,1),(1,0),(0,0)])
    changes+=['Continuous turned collar stand joins the measured native neck; actual cotton covers the gap above the tie']
export_candidate(root,rig,OUT,STEM,f'CT_{ROLE}_Explore_v122q','v122r',changes)
