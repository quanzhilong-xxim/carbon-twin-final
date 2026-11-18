"""Replace the rejected piecewise sleeve loft with one smooth closed surface.
The cap object/pivot is retained for the existing browser elbow skinning.
"""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';report={}
def cat(points,t):
    u=min(t*(len(points)-1),len(points)-1.000001);i=int(u);u-=i
    a,b,c,d=[points[max(0,min(len(points)-1,j))] for j in [i-1,i,i+1,i+2]]
    return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
for who in ['Student','Business','City']:
    file=OUT/f'CT_{who}_Explore_v104c.blend';bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_v104c']
    if root.get('continuous_sleeve_loft'):raise RuntimeError('Already fitted: '+who)
    anchors=[(.15,0,1.27),(.19,.01,1.12),(.215,0,.98),(.249,-.017,.835)] if who=='Student' else [(.18,0,1.36),(.24,.008,1.18),(.255,.012,1.00),(.293,.009,.90)] if who=='Business' else [(.175,0,1.36),(.217,.01,1.18),(.233,-.004,1.0),(.254,-.02,.90)]
    for sign,side in [(-1,'ArmRight'),(1,'ArmLeft')]:
        arm=bpy.data.objects[side];cap=next(o for o in arm.children if o.type=='MESH' and o.name.startswith('V3 rounded sleeve shoulder'))
        points=[Vector((sign*x,y,z)) for x,y,z in anchors]
        # Extra shoulder dome transitions directly into the same sleeve rings.
        top=points[0]+Vector((-sign*.014,0,.044));points=[top]+points
        verts=[];faces=[];R=64;N=40;inv=cap.matrix_world.inverted()
        for j in range(R):
            t=j/(R-1);c=cat(points,t)
            tangent=(cat(points,min(1,t+.001))-cat(points,max(0,t-.001))).normalized()
            x=tangent.cross(Vector((0,1,0))).normalized();y=tangent.cross(x).normalized()
            if t<.25:r=.062*math.sin((t/.25)*math.pi/2)
            else:r=.062+(.035-.062)*(t-.25)/.75
            r=max(.0005,r)
            elbow=math.exp(-((t-.62)/.13)**2)
            for k in range(N):
                a=k/N*math.tau
                fold=.0018*math.sin(t*78+a*2)*elbow*(.4+.6*math.sin(a)**2)
                p=c+(x*math.cos(a)+y*math.sin(a))*(r+fold)
                verts.append(inv@p)
        for j in range(R-1):
            for k in range(N):a=j*N+k;b=j*N+(k+1)%N;faces.append((a,b,b+N,a+N))
        faces.extend([tuple(reversed(range(N))),tuple((R-1)*N+k for k in range(N))])
        d=bpy.data.meshes.new('V104c continuous tailored sleeve');d.from_pydata(verts,[],faces);d.materials.append(cap.data.materials[0]);uv=d.uv_layers.new()
        for f in d.polygons:
            f.use_smooth=True
            for li in f.loop_indices:
                vi=d.loops[li].vertex_index;uv.data[li].uv=((vi%N)/N*6,(vi//N)/(R-1)*8)
        bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free();cap.data=d
    root['continuous_sleeve_loft']=True;bpy.ops.wm.save_as_mainfile(filepath=str(file));report[who]={'continuous_mesh_per_arm':True,'closed_surface':True,'original_shoulder_pivot':True,'paid_calls':0}
(ROOT/'docs/recovery/v10.4/continuous-sleeves-v104c.json').write_text(json.dumps(report,indent=2))
