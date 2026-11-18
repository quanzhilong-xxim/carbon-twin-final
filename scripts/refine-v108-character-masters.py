"""Independent editable masters. Keep all prior assets and the live Blender scene.
Rebuild the explorer's collar/yoke, replace the civic cape with a tailored
shoulder, and retain the earlier measured face/hand corrections for both adults.
"""
import bpy, bmesh, math, json, hashlib, os, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/characters-v10'
helper=(ROOT/'scripts/finalize-character-v10.py').read_text()
exec(compile(helper.split('summary={}')[0],str(__file__),'exec'))

def surface(name,rings,material,parent,opening=0):
    n=64; vertices=[]; faces=[]
    for j,(z,rx,ry,cy) in enumerate(rings):
        for k in range(n):
            a=-math.pi/2+opening+k/(n-1)*(math.tau-2*opening)
            vertices.append((rx*math.cos(a),cy+ry*math.sin(a),z-.004*math.cos(a)**2))
    for j in range(len(rings)-1):
        for k in range(n-1):
            a=j*n+k;faces.append((a,a+1,a+n+1,a+n))
    o=mesh(name,vertices,faces,material,parent)
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    uv=o.data.uv_layers.new()
    for p in o.data.polygons:
        for li in p.loop_indices:
            index=o.data.loops[li].vertex_index
            uv.data[li].uv=((index%n)/(n-1)*2,(index//n)/max(1,len(rings)-1))
    bpy.context.view_layer.objects.active=o
    sub=o.modifiers.new('Tailored rounded fabric','SUBSURF');sub.levels=2
    bpy.ops.object.modifier_apply(modifier=sub.name)
    solid=o.modifiers.new('Woven edge thickness','SOLIDIFY');solid.thickness=.002
    bpy.ops.object.modifier_apply(modifier=solid.name)
    return o

report={}
for who,version in [('Student','v107b'),('Business','v104g'),('City','v104g')]:
    selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Student','Business','City']
    if who not in selected:continue
    revision=os.environ.get('CT_OUTPUT_REVISION','v108')
    stem=f'CT_{who}_Explore_{revision}'
    if (OUT/(stem+'.blend')).exists():raise RuntimeError('Refusing to compound or overwrite '+stem)
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_{version}.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects.get('Root' if who=='Student' else f'CT_{who}_Explore_{version}')
    changes=[]
    if who=='Student':
        # The retained collar was built around the larger previous head. It
        # crossed the replacement neckline; remove those collar faces only.
        collar=bpy.data.objects.get('V10 merged Breath / Warm canvas')
        if collar:
            bm=bmesh.new();bm.from_mesh(collar.data)
            cut=[f for f in bm.faces if (collar.matrix_world@f.calc_center_median()).z>1.24]
            bmesh.ops.delete(bm,geom=cut,context='FACES');bm.to_mesh(collar.data);bm.free()
        body=bpy.data.objects['Body']
        jersey=bpy.data.materials['CarbonTwin ivory ribbed inner jersey']
        jersey_index=body.data.materials.find(jersey.name)
        bm=bmesh.new();bm.from_mesh(body.data)
        cut=[f for f in bm.faces if f.material_index==jersey_index]
        bmesh.ops.delete(bm,geom=cut,context='FACES');bm.to_mesh(body.data);bm.free()
        bsdf=jersey.node_tree.nodes.get('Principled BSDF')
        if bsdf:bsdf.inputs['Sheen Weight'].default_value=.045
        wool=bpy.data.materials['Original plum woven jacket.001']
        inner=surface('V108 continuous knit neckline',[(.87,.132,.105,0),(1.17,.143,.10,0),(1.25,.164,.073,.008),(1.29,.102,.056,.006),(1.325,.043,.037,.009)],jersey,root)
        yoke=surface('V108 explorer shoulder yoke',[(1.225,.172,.09,.012),(1.26,.196,.085,.015),(1.30,.139,.067,.014),(1.325,.060,.044,.012)],wool,root,.63)
        for o in [inner,yoke]:
            vg=o.vertex_groups.new(name='J_Bip_C_Chest');vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
            arm=o.modifiers.new('Retained humanoid chest weights','ARMATURE');arm.object=root
        changes=['replaced intersecting scarf collar with continuous woven yoke and knit neckline','retained weighted face, fingers, expression shapes, camera, backpack and skateboard']
    elif who=='City':
        # The old rigid cape read as two detached shoulder plates. Keep its
        # original geometry in this source, hidden, and bridge the sleeves
        # with a softly subdivided cut matching the cream tailored jacket.
        for o in root.children_recursive:
            if any(s in o.name for s in ['layered civic shoulder cape','cape gold hem','cape shoulder tailoring']):o.hide_render=True
        surface('V108 civic continuous shoulder',[(1.32,.194,.112,.014),(1.37,.177,.093,.014),(1.405,.104,.063,.012),(1.425,.057,.046,.010)],bpy.data.materials['Ivory tailored wool'],bpy.data.objects['Breath'],.6)
        changes=['replaced rigid cape plates with a continuous tailored shoulder yoke','retained distinct civic face, fitted groom, tablet and hand contact']
    else:
        # The measured G surface fixes the V10 neckline, groom and shoulder.
        # Use its real source rather than dropping those corrections on load.
        changes=['retained measured continuous shirt and suit shoulder yokes','retained fitted groom, continuous iris and expression meshes']
    root['v108_refinement']=json.dumps(changes)
    if who!='Student':root.name=stem
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
    if who=='Student':
        bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=root
        bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_skins=True,export_morph=True)
    else:
        combine_static(root);export(root,stem)
        saved={o:o.data.copy() for o in root.children_recursive if o.type=='MESH' and not o.hide_render}
        for o in saved:
            if o.data.shape_keys and o.name.endswith('_head'):subdivide_morph(o)
        export(root,stem+'-portrait')
        for o,d in saved.items():o.data=d
        for o in saved:
            if o.data.shape_keys or o.name.startswith('V3 rounded sleeve shoulder') or len(o.data.polygons)<400:continue
            bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Web distance LOD','DECIMATE');mod.ratio=.45;bpy.ops.object.modifier_apply(modifier=mod.name)
        export(root,stem+'-lite')
    info=json.loads((OUT/f'CT_{who}_Explore_{version}.sources.json').read_text(encoding='utf-8'))
    info.update(version=revision,parent_version=version,status='browser visual review required',refinements=changes,paid_calls=0)
    info['exports']=[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in OUT.glob(stem+'*.glb')]
    (OUT/(stem+'.sources.json')).write_text(json.dumps(info,indent=2),encoding='utf-8')
    report[who]=info['exports'];print('V108_EXPORTED',who,flush=True)
(ROOT/'outputs/v108/internal/model-inspections/refinement.json').write_text(json.dumps(report,indent=2))
