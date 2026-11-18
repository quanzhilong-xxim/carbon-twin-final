"""A separate E candidate from the measured D masters; no remote generation.
Keep all expression topology, arm pivots, materials' source images and D files.
"""
import bpy, math, json, numpy as np
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/characters-v10'
report={}

def deform(o,fn):
    inv=o.matrix_world.inverted()
    arrays=[k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
    for arr in arrays:
        for v in arr:v.co=inv@fn(o.matrix_world@v.co)
    if o.data.shape_keys:
        for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks['Basis'].data):v.co=k.co

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

for who in ['Student','Business','City']:
    stem=f'CT_{who}_Explore_v104e';dest=OUT/(stem+'.blend')
    if dest.exists():raise RuntimeError('Existing E master; refuse compounded edits: '+str(dest))
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v104d.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_v104d'];root.name=stem
    mouth={'Student':1.386,'Business':1.464,'City':1.503}[who]
    nose=mouth+(.043 if who!='Business' else .047)
    head=next(o for o in root.children_recursive if o.type=='MESH' and o.name.endswith('_head'))
    def face(p):
        p=p.copy();front=smooth(.060,.105,-p.y)
        n=math.exp(-(p.x/.039)**4-((p.z-nose)/.023)**4)*front
        p.x*=1-(.30 if who!='Business' else .22)*n
        p.y+=(.009 if who!='Business' else .006)*n
        p.z=nose+(p.z-nose)*(1-.10*n)
        # Measured lip centre comes from the actual retained Smile deltas.
        # Taper the lower-lip volume without cutting a separate mouth seam.
        l=math.exp(-(p.x/.039)**6-((p.z-mouth)/.019)**4)*front
        p.z=mouth+(p.z-mouth)*(1-.27*l)
        p.y+=.003*l
        corner=math.exp(-((abs(p.x)-.026)/.011)**2-((p.z-mouth)/.011)**2)*front
        p.z+=(.0015 if who=='Business' else .0022)*corner
        return p
    deform(head,face)
    skin=head.data.materials[0].copy();skin.name=f'V104e {who} restrained complexion';head.data.materials[0]=skin
    p=skin.node_tree.nodes['Principled BSDF']
    original_nodes=[]
    for link in list(p.inputs['Normal'].links):
        original_nodes.append(link.from_node.name);skin.node_tree.links.remove(link)
    p.inputs['Roughness'].default_value=.64;p.inputs['Specular IOR Level'].default_value=.24
    p.inputs['Coat Weight'].default_value=0
    # Attenuate UV-scale mottling, preserving the original low-frequency
    # complexion/lip colour. Source pixels remain packed in D and in this file.
    color_node=next((n for n in skin.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and any(l.to_socket==p.inputs['Base Color'] for l in n.outputs['Color'].links)),None)
    if color_node:
        src=color_node.image;w,h=src.size;px=np.asarray(src.pixels[:],dtype=np.float32).reshape(h,w,4)
        low=px.copy()
        for axis in [0,1]:
            low=sum(np.roll(low,i,axis=axis) for i in range(-4,5))/9
        rgb=.30*px[:,:,:3]+.70*low[:,:,:3]
        # Small warm-neutral correction; do not paint flat blush patches.
        rgb[:,:,0]*=1.005;rgb[:,:,1]*=.983;rgb[:,:,2]*=1.015
        px[:,:,:3]=np.clip(rgb,0,1)
        im=bpy.data.images.new('CT_'+who+'_Complexion_v104e',width=w,height=h,alpha=True,float_buffer=False)
        im.pixels.foreach_set(px.ravel());im.file_format='PNG';im.filepath_raw=str(OUT/(im.name+'.png'));im.save();im.pack();color_node.image=im
    brows=[]
    for o in root.children_recursive:
        if o.hide_render or o.type!='MESH':continue
        if o.name.endswith('_eyebrows'):
            pts=[o.matrix_world@v.co for v in o.data.vertices];mid=(min(p.z for p in pts)+max(p.z for p in pts))/2
            extent=max(abs(p.x) for p in pts)
            def brow(p):
                p=p.copy();u=min(1,abs(p.x)/extent)
                p.z=mid+(p.z-mid)*.62+.0032*math.sin(math.pi*u)-.001*u
                return p
            deform(o,brow);brows.append(o.name)
        for m in o.data.materials:
            if not m or not m.use_nodes:continue
            q=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if not q:continue
            if o.name.endswith('_eyes'):
                q.inputs['Roughness'].default_value=.27;q.inputs['Specular IOR Level'].default_value=.42
                q.inputs['Coat Weight'].default_value=.40;q.inputs['Coat Roughness'].default_value=.14
            if who=='Student' and ('hair' in m.name.lower() or 'silk-fibre' in m.name.lower()):
                for n in m.node_tree.nodes:
                    if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.035
                q.inputs['Roughness'].default_value=.54
    cargo=None
    if who=='Student':
        jeans=bpy.data.objects['Study / GEO-rain_jeans']
        points=np.array([jeans.matrix_world@v.co for v in jeans.data.vertices]);levels=np.linspace(.13,.88,48);centres={}
        for sign in [-1,1]:
            side=points[points[:,0]*sign>.014];rings=[]
            for z in levels:
                ring=side[np.argsort(abs(side[:,2]-z))[:28]]
                rings.append((np.median(ring[:,0]),np.median(ring[:,1])))
            centres[sign]=np.array(rings)
        def pant(p):
            x,y,z=p;sign=1 if x>=0 else -1;cx=np.interp(z,levels,centres[sign][:,0]);cy=np.interp(z,levels,centres[sign][:,1])
            env=smooth(.14,.25,z)*(1-smooth(.72,.86,z));dx=x-cx;dy=y-cy;a=math.atan2(dy,dx)
            # Relaxed cargo silhouette with gathered ankles and knee folds.
            ridge=(.0035*math.sin((z-.27)*58+a*1.8)*math.exp(-((z-.38)/.13)**2)+.0025*math.sin(z*83-a)*math.exp(-((z-.23)/.08)**2))*env
            nx=cx+dx*(1+.32*env)+math.cos(a)*ridge
            # Keep the retained inner-leg clearance, not a merged bag.
            if abs(nx)<.018:nx=sign*.018
            return Vector((nx,cy+dy*(1+.23*env)+math.sin(a)*ridge,z))
        deform(jeans,pant)
        for o in root.children_recursive:
            if o.type=='MESH' and not o.hide_render and any(t in o.name.lower() for t in ['cargo pocket','cargo side seam']):deform(o,pant)
        cargo={'extra_radial_ease':.32,'gathered_ankle':True,'topology_preserved':True}
    for o in root.children_recursive:
        if o.type=='MESH' and o.data.shape_keys:
            for k in o.data.shape_keys.key_blocks:k.value=0
    changes={'measured_mouth_z':mouth,'nose_width_reduction':.30 if who!='Business' else .22,'nose_depth_reduction_metres':.009 if who!='Business' else .006,'lip_volume_reduction':.27,'brows':brows,'disconnected_skin_normals':original_nodes,'source_uv_texture_retained':True,'cargo':cargo,'paid_calls':0}
    root['v104e_face_revision']=True;bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    info=json.loads((OUT/f'CT_{who}_Explore_v104d.sources.json').read_text());info.update(version='v104e',parent_version='v104d',status='candidate: art acceptance pending',face_and_cargo_revision=changes)
    (OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2));report[who]=changes
    print('V104E_EDITED',who,flush=True)
(ROOT/'docs/recovery/v10.4/face-and-cargo-e.json').write_text(json.dumps(report,indent=2))
