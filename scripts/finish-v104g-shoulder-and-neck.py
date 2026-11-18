"""One measured repair of F's visible back-groom and open shoulder defects.
Writes independent G masters. No face resculpt, remote request or F overwrite.
"""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';report={}

def deform(o,fn):
    inv=o.matrix_world.inverted()
    for v in o.data.vertices:v.co=inv@fn(o.matrix_world@v.co)

def patch(name,rings,material,parent,opening=.0):
    n=96;verts=[];faces=[];uvs=[]
    for j,(z,rx,ry,cy) in enumerate(rings):
        for k in range(n):
            a=-math.pi/2+opening+k/(n-1)*(math.tau-2*opening)
            verts.append((rx*math.cos(a),cy+ry*math.sin(a),z-.005*abs(math.cos(a))))
            uvs.append((k/(n-1)*3,j/max(1,len(rings)-1)))
    for j in range(len(rings)-1):
        for k in range(n-1):a=j*n+k;faces.append((a,a+1,a+n+1,a+n))
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.materials.append(material)
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
    uv=d.uv_layers.new()
    for f in d.polygons:
        f.use_smooth=True
        for li in f.loop_indices:uv.data[li].uv=uvs[d.loops[li].vertex_index]
    o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
    solid=o.modifiers.new('Real cloth edge thickness','SOLIDIFY');solid.thickness=.002
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=solid.name)
    return o

for who in ['Student','Business','City']:
    stem=f'CT_{who}_Explore_v104g';dest=OUT/(stem+'.blend')
    if dest.exists():raise RuntimeError('G exists; refusing compounded fit')
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v104f.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_v104f'];root.name=stem;changes={'paid_calls':0,'face_and_expression_geometry':'unchanged from F'}
    if who=='Business':
        groom=bpy.data.objects['V104d retained fitted occipital and temple groom']
        before=max((groom.matrix_world@v.co).z for v in groom.data.vertices)
        def flatten(p):
            p=p.copy();t=max(0,min(1,(p.z-1.625)/.04));t=t*t*(3-2*t)
            if p.z>1.645:p.z=1.645+(p.z-1.645)*.26
            if p.y>.045:p.y=.045+(p.y-.045)*(1-.48*t)
            return p
        deform(groom,flatten)
        body=bpy.data.objects['Breath']
        wool=bpy.data.materials['Fine midnight pinstripe wool'];cotton=bpy.data.materials['Cream cotton poplin']
        patch('V104g continuous shirt shoulder yoke',[(1.415,.047,.039,.004),(1.403,.065,.050,.004),(1.384,.119,.081,.004),(1.356,.184,.103,.004)],cotton,body)
        patch('V104g tailored shoulder and back yoke',[(1.408,.061,.049,.006),(1.396,.092,.066,.006),(1.378,.147,.098,.006),(1.354,.205,.121,.006)],wool,body,.62)
        for o in root.children_recursive:
            if o.type=='MESH' and o.name.startswith('V3 rounded sleeve shoulder'):
                def shoulder(p):
                    p=p.copy();w=max(0,min(1,(p.z-1.20)/.17));w=w*w*(3-2*w)
                    p.x=math.copysign(.175+(abs(p.x)-.175)*(1-.16*w),p.x);p.y*=1-.12*w;p.z-=.015*w;return p
                deform(o,shoulder)
        changes.update(removed_high_occipital_knot={'before_max_z':before,'after_max_z':max((groom.matrix_world@v.co).z for v in groom.data.vertices)},shoulder_yokes='closed continuous fabric under retained lapels',sleeve_upper_cap='15mm lower, narrower ellipse; animation pivot retained')
    elif who=='City':
        # The prior high collar's upper ring intersected the retained neck.
        # Lower its top to a continuous mock-neck beneath the jaw; preserve
        # the original dress below the collar and all five-finger geometry.
        inner=bpy.data.objects['V10 continuous dark inner dress']
        def neck(p):
            p=p.copy()
            if p.z>1.385:
                t=max(0,min(1,(p.z-1.385)/.045));p.z-=.022*t
                p.x*=1+.10*t;p.y=.006+(p.y-.006)*(1+.12*t)
            return p
        deform(inner,neck)
        changes['inner_collar']='lowered 22mm below jaw, wider smooth opening; dark material and cape retained'
    else:changes['student']='F geometry retained; no repeated sculpt'
    root['v104g_measured_fit']=True;bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    info=json.loads((OUT/f'CT_{who}_Explore_v104f.sources.json').read_text());info.update(version='v104g',parent_version='v104f',status='candidate: art acceptance pending',measured_fit=changes)
    (OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2));report[who]=changes;print('V104G_FITTED',who,flush=True)
(ROOT/'docs/recovery/v10.4/shoulder-neck-fit-g.json').write_text(json.dumps(report,indent=2))
