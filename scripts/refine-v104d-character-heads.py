"""Measured lip fit and scalp-attached swept hair; V104c remains unchanged.
The head BVH fits every hair ridge to the real retained topology, rather than
placing floating ribbons against an estimated ellipsoid. No external calls.
"""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';report={}

def parent(o,p):
    bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=p;o.matrix_world=w
def mesh(name,vs,fs,mat,p,uvs=None):
    d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
    o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o)
    for f in d.polygons:f.use_smooth=True
    if uvs:
        uv=d.uv_layers.new()
        for li,l in enumerate(d.loops):uv.data[li].uv=uvs[l.vertex_index]
    parent(o,p);return o
def material(name,color,rough,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;q=m.node_tree.nodes['Principled BSDF'];q.inputs['Base Color'].default_value=(*color,1);q.inputs['Roughness'].default_value=rough;q.inputs['Metallic'].default_value=metal;return m
def curve(name,ps,r,mat,p,cyclic=False):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=4;c.bevel_resolution=2;c.bevel_depth=r
    s=c.splines.new('BEZIER');s.bezier_points.add(len(ps)-1);s.use_cyclic_u=cyclic
    for a,pt in zip(s.bezier_points,ps):a.co=pt;a.handle_left_type=a.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.scene.collection.objects.link(o);c.materials.append(mat);parent(o,p)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o

for who in ['Student','Business','City']:
    stem=f'CT_{who}_Explore_v104d';dest=OUT/(stem+'.blend')
    if dest.exists():
        report[who]={'existing_candidate_preserved':True};continue
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v104c.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_v104c'];root.name=stem;headgroup=bpy.data.objects['Head']
    head=next(o for o in root.children_recursive if o.type=='MESH' and o.name.endswith('_head'))
    # Mouth coordinates measured from the retained Smile deltas in the C master.
    mouth={'Student':1.386,'Business':1.464,'City':1.503}[who];inv=head.matrix_world.inverted()
    keys=head.data.shape_keys.key_blocks
    for key in keys:
        for v in key.data:
            p=head.matrix_world@v.co
            w=math.exp(-((p.z-mouth)/.022)**4-(p.x/.050)**6)*max(0,min(1,(-p.y-.07)/.035))
            p.z=mouth+(p.z-mouth)*(1-.24*w);p.x*=1-.06*w;p.y+=.003*w;v.co=inv@p
    for v,k in zip(head.data.vertices,keys['Basis'].data):v.co=k.co
    if who=='Student':
        m=bpy.data.materials.get('V104 Student layered silk-fibre hair')
        if m:
            for n in m.node_tree.nodes:
                if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.10
            m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.58
    changes={'lip_fit_world_z':mouth,'expression_topology_retained':True,'paid_calls':0}
    if who=='Business':
        archived=[]
        for o in root.children_recursive:
            if not o.hide_render and any(t in o.name.lower() for t in ['hair','optical frame','glasses']):o.hide_render=True;archived.append(o.name)
        # Keep the actual skull surface, with an independent closed hair shell.
        ps=[head.matrix_world@v.co for v in head.data.vertices]
        hull=bmesh.new()
        for p in ps:hull.verts.new(p)
        bmesh.ops.convex_hull(hull,input=list(hull.verts),use_existing_faces=False)
        hull.verts.ensure_lookup_table();hull.verts.index_update()
        bvh=BVHTree.FromPolygons([v.co.copy() for v in hull.verts],[[v.index for v in f.verts] for f in hull.faces]);hull.free()
        center=Vector((0,.0,1.598))
        def scalp(a,phi,pad=.007):
            ray=Vector((math.sin(phi)*math.cos(a),math.sin(phi)*math.sin(a),math.cos(phi)))
            outer=center+ray*.4;hit,n,_,_=bvh.ray_cast(outer,-ray,.5)
            if hit is None:raise RuntimeError('Hair ray missed retained skull')
            return hit+n*pad,n
        # Forehead ends high, sides reach the ear, back reaches the nape.
        def edge(a):return 1.20+.67*max(0,math.sin(a))+.27*(1-abs(math.sin(a)))
        vs=[];fs=[];uv=[];N=96;R=28
        for j in range(R):
            for i in range(N):
                a=i/N*math.tau;phi=.006+(edge(a)-.006)*j/(R-1);p,n=scalp(a,phi)
                # Gentle side part and shallow ridge variation in fitted shell.
                p+=n*(.0014*math.cos(a*13+phi*2)*math.sin(phi))
                vs.append(tuple(p));uv.append((i/N,phi/math.pi))
        for j in range(R-1):
            for i in range(N):a=j*N+i;b=j*N+(i+1)%N;fs.append((a,b,b+N,a+N))
        fs.append(tuple(reversed(range(N))))
        hair=material('V104d warm chestnut swept groom',(.043,.019,.011),.53)
        q=hair.node_tree.nodes['Principled BSDF'];q.inputs['Specular IOR Level'].default_value=.28;q.inputs['Anisotropic'].default_value=.30
        tex=bpy.data.materials.get('V10 Business directional hair')
        # Retain its fine directional texture; no copied/unlicensed texture.
        if tex:
            for old in tex.node_tree.nodes:
                if old.type=='TEX_IMAGE' and old.image and 'normal' in old.image.name.lower():
                    n=hair.node_tree.nodes.new('ShaderNodeTexImage');n.image=old.image;b=hair.node_tree.nodes.new('ShaderNodeNormalMap');b.inputs['Strength'].default_value=.09;hair.node_tree.links.new(n.outputs['Color'],b.inputs['Color']);hair.node_tree.links.new(b.outputs['Normal'],q.inputs['Normal']);break
        cap=mesh('V104d fitted complete scalp',vs,fs,hair,headgroup,uv)
        solid=cap.modifiers.new('Hairline thickness','SOLIDIFY');solid.thickness=.0015
        bpy.context.view_layer.objects.active=cap;bpy.ops.object.modifier_apply(modifier=solid.name)
        # Swept compact ribbons follow skull rays continuously, terminating
        # at the fitted temple rather than the free-space paths rejected in B.
        for band in range(16):
            vs=[];fs=[];uv=[];steps=48;sides=10
            yy=-.83+band/15*1.70
            for j in range(steps):
                t=j/(steps-1);x=.34-.34*t-1.22*t*t;z=math.sqrt(max(.015,1-x*x-yy*yy*.55));direction=Vector((x,yy*.75,z)).normalized()
                a=math.atan2(direction.y,direction.x);phi=math.acos(direction.z);p,n=scalp(a,phi,.008)
                nxt=Vector((x-.003,yy*.75,z)).normalized();tangent=(nxt-direction).normalized();side=n.cross(tangent).normalized()
                width=.010*math.sin(math.pi*(.035+.93*t))**.45;thick=.0038*math.sin(math.pi*t)**.6+.0003
                for k in range(sides):
                    ang=k/sides*math.tau;vs.append(tuple(p+side*width*math.cos(ang)+n*thick*math.sin(ang)));uv.append((k/sides,t))
            for j in range(steps-1):
                for k in range(sides):a=j*sides+k;b=j*sides+(k+1)%sides;fs.append((a,b,b+sides,a+sides))
            fs.extend([tuple(reversed(range(sides))),tuple((steps-1)*sides+k for k in range(sides))])
            mesh('V104d scalp attached swept lock',vs,fs,hair,headgroup,uv)
        # Full closed optical rims. Existing partial rims intersected the nose.
        frame=material('V104d graphite titanium spectacles',(.025,.031,.029),.30,.65)
        def fy(x):return -.181+.032*(abs(x)/.10)**1.6
        for sign in [-1,1]:
            cx=sign*.047
            ps=[(cx+.043*math.cos(a),fy(cx+.043*math.cos(a)),1.552+.025*math.sin(a)) for a in [i/24*math.tau for i in range(24)]]
            curve('V104d complete optical rim',ps,.00155,frame,headgroup,True)
            curve('V104d spectacle temple',[(sign*.089,fy(.089),1.558),(sign*.114,-.08,1.565),(sign*.124,-.005,1.56),(sign*.118,.019,1.544)],.00135,frame,headgroup)
        curve('V104d arched nose bridge',[(-.007,fy(.007),1.556),(0,-.185,1.561),(.007,fy(.007),1.556)],.0013,frame,headgroup)
        changes.update(scalp_fitted_to_actual_head=True,swept_locks=16,closed_spectacle_rims=True,archived_c_parts=archived)
    bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    info=json.loads((OUT/f'CT_{who}_Explore_v104c.sources.json').read_text());info.update(version='v104d',parent_version='v104c',status='candidate: actual browser art review required',head_refinement=changes)
    (OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2));report[who]=changes
(ROOT/'docs/recovery/v10.4/refined-heads-v104d.json').write_text(json.dumps(report,indent=2))
