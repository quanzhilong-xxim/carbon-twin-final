"""Offline versioned adult skin continuity and scalp-attached fibre detail.
Keeps every V11d source and the live Blender scene untouched. No paid calls.
"""
import bpy,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finish-v11-role-assets.py').read_text().split("\nfor who,base in [(")[0],__file__,'exec'))

def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4

for who in ['Business','City']:
    stem=f'CT_{who}_Explore_v11e'
    if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve '+stem)
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v11d.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_v11d'];root.name=stem
    face=bpy.data.objects[f'V108l distinct {who} anime face']
    old=next(m for m in face.data.materials if 'Face_00_SKIN' in m.name)
    source=next(n.image for n in old.node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
    pixels=np.array(source.pixels[:],dtype=np.float32).reshape(source.size[1],source.size[0],4)
    # Sample actual cheek/jaw UVs, avoiding transparent atlas background.
    uv=face.data.uv_layers.active; samples=[]
    eye=1.20 if who=='Business'else 1.588
    for polygon in face.data.polygons:
        if face.data.materials[polygon.material_index]!=old:continue
        for li in polygon.loop_indices:
            point=face.matrix_world@face.data.vertices[face.data.loops[li].vertex_index].co
            if abs(point.x)>.075 or not eye-.105<point.z<eye-.025 or point.y>-.10:continue
            u,v=uv.data[li].uv;pixel=pixels[min(source.size[1]-1,max(0,int(v*source.size[1]))),min(source.size[0]-1,max(0,int(u*source.size[0]))) ]
            if pixel[3]>.9 and min(pixel[:3])>.3:samples.append(pixel[:3])
    if not samples:raise RuntimeError('No source cheek samples')
    cheek=np.median(samples,axis=0)
    factor=(.72,.55,.44)if who=='Business'else(.85,.69,.60)
    colour=tuple(linear(float(c))*f for c,f in zip(cheek,factor))
    shared=bpy.data.materials.new('V11e '+who+' matched face neck ears and hands');shared.use_nodes=True
    p=shared.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*colour,1);p.inputs['Roughness'].default_value=.61;p.inputs['Specular IOR Level'].default_value=.28
    # The face retains its real source albedo and expression geometry, with a
    # single lit PBR shader. Ears/neck use the measured cheek reflectance.
    skin=bpy.data.materials.new('V11e '+who+' textured face skin');skin.use_nodes=True
    p=skin.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=.61;p.inputs['Specular IOR Level'].default_value=.28
    tex=skin.node_tree.nodes.new('ShaderNodeTexImage');tex.image=source
    multiply=skin.node_tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=(*factor,1)
    skin.node_tree.links.new(tex.outputs['Color'],multiply.inputs[1]);skin.node_tree.links.new(multiply.outputs['Color'],p.inputs['Base Color'])
    for i,m in enumerate(face.data.materials):
        if m==old:face.data.materials[i]=skin
    replaced=[]
    for o in root.children_recursive:
        if o.type!='MESH' or o.hide_render or o==face:continue
        for i,m in enumerate(o.data.materials):
            if m and any(s in m.name for s in ['hand and neck skin','restrained complexion','softly lit civic neck']):
                o.data.materials[i]=shared;replaced.append(o.name)
    # Defined adult eye proportions; every expression key receives the same
    # spatial warp, retaining eyelid contact and all original morph topology.
    def mature(p):
        p=p.copy();front=max(0,min(1,(-p.y-.09)/.055));cx=math.copysign(.045,p.x)
        w=math.exp(-((p.x-cx)/.039)**4-((p.z-eye)/.030)**4)*front
        shrink=.12 if who=='Business'else .06
        p.x=cx+(p.x-cx)*(1-shrink*w);p.z=eye+(p.z-eye)*(1-shrink*w)
        if who=='Business':
            nose=math.exp(-(p.x/.023)**2-((p.z-(eye-.05))/.026)**2)*front;p.y-=.004*nose
        return p
    deform(face,mature)
    scalp=bpy.data.objects['V108k anatomical open hairline'];ps=[scalp.matrix_world@v.co for v in scalp.data.vertices]
    bvh=BVHTree.FromPolygons(ps,[[v for v in f.vertices]for f in scalp.data.polygons])
    center=Vector((0,0,1.22 if who=='Business'else 1.63))
    fibre=bpy.data.materials.new('V11e '+who+' fine warm hair fibres');fibre.use_nodes=True
    p=fibre.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.095,.045,.026,1)if who=='Business'else(.078,.036,.024,1);p.inputs['Roughness'].default_value=.48;p.inputs['Anisotropic'].default_value=.32
    count=0
    for band in range(38):
        a=band/38*math.tau;end=.9+.6*max(0,math.sin(a));pts=[]
        for j in range(58):
            t=j/57;phi=.055+(end-.055)*t;az=a+.38*(1-t)
            ray=Vector((math.cos(az)*math.sin(phi),math.sin(az)*math.sin(phi),math.cos(phi)))
            hit,n,_,_=bvh.ray_cast(center+ray*.45,-ray,.65)
            if hit is not None:pts.append(tuple(hit+n*.00065))
        if len(pts)>20:curve('V11e scalp attached individual fibre',pts,.00032,fibre,bpy.data.objects['Head']);count+=1
    changes=['Matched ears, neck and hands to median sampled cheek reflectance from retained licensed face albedo; one lit PBR skin response.',f'Added {count} fine scalp-attached swept fibre meshes using actual scalp BVH ray intersections.','Subtle adult eye-region proportions applied to basis and every expression target; all morphs and props retained.']
    root['v11e_refinements']=json.dumps(changes);root['v11e_cheek_srgb']=list(map(float,cheek));root['v11e_skin_linear']=list(colour)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
    export(root,stem);export(root,stem+'-portrait')
    for o in root.children_recursive:
        if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<1000:continue
        bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
        try:bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:o.modifiers.remove(mod)
    export(root,stem+'-lite')
    record=json.loads((OUT/f'CT_{who}_Explore_v11d.sources.json').read_text());record.update(version='v11e',parent_version='v11d',paid_calls=0,status='browser review pending',skin_continuity={'cheek_srgb':list(map(float,cheek)),'skin_linear':list(colour),'matched_meshes':replaced})
    record.setdefault('refinements',[]).extend(changes)
    record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in sorted(OUT.glob(stem+'*.glb'))]
    (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf-8')
    print('V11E_EXPORTED',who,json.dumps(record['skin_continuity']),flush=True)
