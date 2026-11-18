"""Retained-source props and tailored contact, versioned for browser review."""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finish-v11-role-assets.py').read_text().split("\nfor who,base in [(")[0],__file__,'exec'))

for who in ['Student','Business','City']:
    stem=f'CT_{who}_Explore_v11d'
    if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve '+stem)
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v11c.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_v11c'];root.name=stem;changes=[]
    if who=='Student':
        cover=bpy.data.materials.new('V11 recycled forest notebook cover');cover.use_nodes=True
        bs=cover.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.035,.105,.065,1);bs.inputs['Roughness'].default_value=.8
        paper=bpy.data.materials.new('V11 warm notebook paper');paper.use_nodes=True
        bs=paper.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.78,.73,.59,1);bs.inputs['Roughness'].default_value=.9
        gold=bpy.data.materials['Brushed brass.001']
        props=[]
        for name,center,scale,mat in [
            ('V11 notebook pages',(.318,-.060,.85),(.091,.011,.133),paper),
            ('V11 notebook front cover',(.318,-.068,.85),(.097,.004,.139),cover),
            ('V11 notebook back cover',(.318,-.052,.85),(.097,.004,.139),cover),
            ('V11 notebook spine',(.272,-.060,.85),(.004,.020,.139),cover),
        ]:props.append(panel(name,center,scale,mat,root,.0015))
        for j in range(8):
            props.append(panel('V11 notebook ruling',(.321,-.067,.812+j*.011),(.068,.0008,.0005),gold,root,.0001))
        # Rigid bone parenting keeps the notebook attached to the real palm.
        bpy.context.view_layer.update()
        for o in props:
            world=o.matrix_world.copy();o.parent=root;o.parent_type='BONE';o.parent_bone='J_Bip_L_Hand';o.matrix_world=world
            o['ct_action_prop']='recording'
        # The pen remains a source mesh and follows the opposite hand.
        bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.0025,depth=.095,location=(-.302,-.035,.84))
        pen=bpy.context.object;pen.name='V11 field notebook pen';pen.data.materials.append(gold)
        world=pen.matrix_world.copy();pen.parent=root;pen.parent_type='BONE';pen.parent_bone='J_Bip_R_Hand';pen.matrix_world=world;pen['ct_action_prop']='recording'
        changes+=['Original notebook with separate covers, spine, page block, ruling and metal pen; rigidly attached to actual left/right hand bones.','Notebook and pen are source meshes, displayed by the recording action in the webpage.']
    elif who=='Business':
        collar=bpy.data.objects.get('V11 fitted businessman poplin collar')
        if collar:collar.hide_render=True
        shirt=bpy.data.objects['Shirt front'];shirt.hide_render=False
        def fit(p):
            p=p.copy();t=max(0,min(1,(p.z-1.00)/.056));p.x*=1-.33*t
            return p
        deform(shirt,fit)
        # A small rolled neckline retains shirt visibility without the old shelf.
        shell('V11 close rolled poplin neck',[(1.014,.056,.042,-.012),(1.054,.048,.038,-.010),(1.077,.044,.036,-.009)],bpy.data.materials['Cream cotton poplin'],bpy.data.objects['Breath'])
        changes+=['Restored visible white shirt with tapered upper edge and a close rolled neck; retained silk tie and suit occlusion.']
    # A swept quiff adds volume above the flat strip-like fringe of the adult.
    if who=='Business':
        head=bpy.data.objects['Head'];mat=bpy.data.materials['V108k Business chestnut hair']
        for index in range(8):
            pts=[];a=index/7
            for j in range(60):
                t=j/59
                pts.append((.043*(1-t)+(-.108+.075*a)*t+.016*math.sin(t*math.pi),.015*(1-t)+(-.137+.035*a)*t,1.323*(1-t)+(1.239+.030*a)*t+.033*math.sin(t*math.pi)))
            curve('V11 swept businessman quiff',pts,.008-.003*a,mat,head)
        changes+=['Eight swept tapered quiff locks add a defined side part and forehead volume over the retained anatomical hairline.']
    root['v11d_refinements']=json.dumps(changes)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
    export(root,stem);export(root,stem+'-portrait')
    for o in root.children_recursive:
        if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<1000:continue
        bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
        try:bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:o.modifiers.remove(mod)
    export(root,stem+'-lite')
    record=json.loads((OUT/f'CT_{who}_Explore_v11c.sources.json').read_text());record.update(version='v11d',parent_version='v11c',paid_calls=0,status='browser review pending')
    record.setdefault('refinements',[]).extend(changes)
    record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in sorted(OUT.glob(stem+'*.glb'))]
    (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf-8')
    print('V11D_EXPORTED',who,flush=True)
