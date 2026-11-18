"""Reference-driven head proportions and garment contact; retain every B source."""
import bpy,bmesh,math,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/tailor-v108u-delivery.py').read_text().split("for who,base in [(")[0],__file__,'exec'))

for who in ['Student','Business','City']:
    stem=f'CT_{who}_Explore_v11c'
    if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve '+stem)
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v11b.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_v11b'];root.name=stem
    changes=[]
    if who=='Student':
        body=bpy.data.objects['Body'];bm=bmesh.new();bm.from_mesh(body.data)
        covered=[]
        for face in bm.faces:
            p=body.matrix_world@face.calc_center_median()
            if face.material_index==0 and abs(p.x)>.115 and .925<p.z<1.29:covered.append(face)
        count=len(covered);bmesh.ops.delete(bm,geom=covered,context='FACES');bm.to_mesh(body.data);bm.free()
        jersey=bpy.data.materials['CarbonTwin ivory ribbed inner jersey']
        collar=shell('V11 soft standing knit collar',[(1.253,.096,.068,.008),(1.27,.084,.059,.008),(1.289,.052,.044,.010),(1.300,.048,.041,.010)],jersey,root,.55)
        weight(collar,root,['J_Bip_C_Chest','J_Bip_C_UpperChest'])
        # Keep the face and head distinct from adults; skin warmth is stored
        # in the source material and carried to GLB in the finishing step.
        changes+=[f'Removed {count} skin faces completely covered by the long sleeves; wrists and fingers retained.','Rounded standing knit collar with garment thickness and humanoid weights.']
    else:
        eye=1.20 if who=='Business' else 1.588
        head=bpy.data.objects['Head']
        def proportions(p):
            p=p.copy();above=max(0,p.z-eye)
            # Current imported forehead is too tall relative to the face.
            p.z-=above*.23
            if p.z<eye-.06:
                p.x*=1-(.055 if who=='Business'else .025)*math.exp(-((p.z-(eye-.098))/.04)**2)
            front=max(0,min(1,(-p.y-.07)/.06))
            nose=math.exp(-(p.x/.020)**2-((p.z-(eye-.058))/.026)**2)*front
            p.y-=.006*nose
            return p
        for o in head.children_recursive:
            if o.type=='MESH' and not o.hide_render:deform(o,proportions)
        # A close, softly rolled collar replaces the old horizontal shirt shelf.
        if who=='Business':
            for name in ['Shirt front','V108n fitted shirt neck']:
                old=bpy.data.objects.get(name)
                if old:old.hide_render=True
            mat=bpy.data.materials['Cream cotton poplin'];breath=bpy.data.objects['Breath']
            shell('V11 fitted businessman poplin collar',[(.84,.069,.045,-.088),(1.014,.061,.045,-.079),(1.054,.050,.040,-.012),(1.077,.044,.038,-.009)],mat,breath)
        changes+=['Upper forehead, skull and every fitted hair layer shortened together from measured eye height.','Nose projection and lower-face width refined consistently in every facial shape key.','Retained distinct adult face geometry, licensed texture maps, optical frames and expression targets.']
    root['v11c_refinements']=json.dumps(changes)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
    export(root,stem);export(root,stem+'-portrait')
    for o in root.children_recursive:
        if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<1000:continue
        bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
        try:bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:o.modifiers.remove(mod)
    export(root,stem+'-lite')
    record=json.loads((OUT/f'CT_{who}_Explore_v11b.sources.json').read_text());record.update(version='v11c',parent_version='v11b',paid_calls=0,status='browser review pending')
    record.setdefault('refinements',[]).extend(changes)
    record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in sorted(OUT.glob(stem+'*.glb'))]
    (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf-8')
    print('V11C_EXPORTED',who,flush=True)
