"""Reference-led eye aperture and a fitted low-bun City groom.
Reads E, writes F. Uses retained head topology as the actual scalp surface.
"""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';report={}

def parent(o,p):
    bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=p;o.matrix_world=w
def mesh(name,vs,fs,mat,p):
    d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
    o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o)
    for f in d.polygons:f.use_smooth=True
    parent(o,p);return o
def deform(o,fn):
    inv=o.matrix_world.inverted();arrays=[k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
    for a in arrays:
        for v in a:v.co=inv@fn(o.matrix_world@v.co)
    if o.data.shape_keys:
        for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks['Basis'].data):v.co=k.co

for who in ['Student','Business','City']:
    stem=f'CT_{who}_Explore_v104f';dest=OUT/(stem+'.blend')
    if dest.exists():raise RuntimeError('F candidate exists; no compounded edit')
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v104e.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_v104e'];root.name=stem
    eye={'Student':1.475,'Business':1.553,'City':1.592}[who];cx={'Student':.047,'Business':.043,'City':.051}[who]
    amount={'Student':.10,'Business':.05,'City':.12}[who]
    def aperture(p):
        p=p.copy();w=math.exp(-((abs(p.x)-cx)/.042)**6-((p.z-eye)/.048)**6)*max(0,min(1,(-p.y-.045)/.05))
        p.z=eye+(p.z-eye)*(1-amount*w)
        p.z+=.0017*((abs(p.x)-cx)/.042)*w
        return p
    edited=[]
    for o in root.children_recursive:
        if o.type=='MESH' and not o.hide_render and o.name.endswith(('_head','_eyes','_eyelashes')):
            deform(o,aperture);edited.append(o.name)
    changes={'eye_aperture_reduction':amount,'same_deformation_applied_to_eye_lids_and_lashes':edited,'all_expression_keys_preserved':True,'paid_calls':0}
    if who=='City':
        head=next(o for o in root.children_recursive if o.type=='MESH' and o.name.endswith('_head'));group=bpy.data.objects['Head']
        archived=[]
        for o in root.children_recursive:
            if o.type not in {'MESH','CURVE'} or o.hide_render:continue
            text=(o.name+' '+' '.join(m.name for m in o.data.materials if m)).lower()
            if any(t in text for t in ['hair','groom','lock','scalp','bun','tendril']):o.hide_render=True;archived.append(o.name)
        hull=bmesh.new()
        for v in head.data.vertices:hull.verts.new(head.matrix_world@v.co)
        bmesh.ops.convex_hull(hull,input=list(hull.verts),use_existing_faces=False);hull.verts.ensure_lookup_table();hull.verts.index_update()
        bvh=BVHTree.FromPolygons([v.co.copy() for v in hull.verts],[[v.index for v in f.verts] for f in hull.faces]);hull.free()
        center=Vector((0,0,1.637))
        def surface(a,phi,pad=.005):
            direction=Vector((math.sin(phi)*math.cos(a),math.sin(phi)*math.sin(a),math.cos(phi)))
            p,n,_,_=bvh.ray_cast(center+direction*.45,-direction,.8)
            if p is None:raise RuntimeError('Fitted civic scalp ray missed head')
            return p+n*pad,n
        mat=bpy.data.materials.new('V104f civic chestnut low-bun groom');mat.use_nodes=True;q=mat.node_tree.nodes['Principled BSDF']
        q.inputs['Base Color'].default_value=(.033,.016,.011,1);q.inputs['Roughness'].default_value=.49;q.inputs['Specular IOR Level'].default_value=.29;q.inputs['Anisotropic'].default_value=.3
        def edge(a):return 1.32+.66*max(0,math.sin(a))+.26*(1-abs(math.sin(a)))
        N=112;R=36;vs=[];fs=[]
        for j in range(R):
            for i in range(N):
                a=i/N*math.tau;phi=.004+(edge(a)-.004)*j/(R-1);p,n=surface(a,phi)
                p+=n*.0008*math.sin(a*27+phi*6)*math.sin(phi);vs.append(tuple(p))
        for j in range(R-1):
            for i in range(N):a=j*N+i;b=j*N+(i+1)%N;fs.append((a,b,b+N,a+N))
        fs.append(tuple(reversed(range(N))));mesh('V104f civic fitted hair foundation',vs,fs,mat,group)
        # Broad shallow scalp-attached strands, rather than raised free curls.
        for band in range(22):
            vs=[];fs=[];L=52;S=8
            for j in range(L):
                t=j/(L-1);a=-.66-2.22*t;phi=.14+band*.024+.92*t;p,n=surface(a,phi,.006)
                p2,_=surface(a-.003,phi+.001,.006);side=(p2-p).normalized().cross(n).normalized();taper=max(.01,math.sin(math.pi*(.03+.94*t))**.7)
                for k in range(S):
                    ang=k/S*math.tau;vs.append(tuple(p+side*.005*taper*math.cos(ang)+n*(.0016*math.sin(ang)+.0013)*taper))
            for j in range(L-1):
                for k in range(S):a=j*S+k;b=j*S+(k+1)%S;fs.append((a,b,b+S,a+S))
            fs.extend([tuple(reversed(range(S))),tuple((L-1)*S+k for k in range(S))]);mesh('V104f shallow side-part strand',vs,fs,mat,group)
        # Low nape bun intersects the validated fitted back cap continuously.
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=(0,.105,1.575));bun=bpy.context.object;bun.name='V104f compact low nape bun';bun.scale=(.055,.033,.044);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bun.data.materials.append(mat)
        for v in bun.data.vertices:
            p=v.co;a=math.atan2(p.z/.044,p.x/.055);p.y+=.0013*math.cos(a*14)
        for f in bun.data.polygons:f.use_smooth=True
        parent(bun,group)
        changes.update(archived_e_groom=archived,scalp_fitted_to_actual_head=True,shallow_fitted_strands=22,low_bun=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    info=json.loads((OUT/f'CT_{who}_Explore_v104e.sources.json').read_text());info.update(version='v104f',parent_version='v104e',status='candidate: browser art acceptance pending',eye_and_groom_revision=changes)
    (OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2));report[who]=changes;print('V104F_REFINED',who,flush=True)
(ROOT/'docs/recovery/v10.4/eyes-and-civic-groom-f.json').write_text(json.dumps(report,indent=2))
