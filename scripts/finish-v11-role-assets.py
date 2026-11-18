"""Original cloth, tailoring and groom detail on three retained licensed masters.
Creates new editable assets; never touches previous models or the live Blender UI.
"""
import bpy, math, json, hashlib, numpy as np
from pathlib import Path
from mathutils import Vector

R=Path(__file__).resolve().parents[1]
OUT=R/'public/models/characters-v10'
TEXTURES=R/'public/textures/characters-v11'
TEXTURES.mkdir(parents=True,exist_ok=True)
exec(compile((R/'scripts/tailor-v108u-delivery.py').read_text().split("for who,base in [(")[0],__file__,'exec'))

def albedo(material, colour, kind, label):
    p=material.node_tree.nodes.get('Principled BSDF')
    if not p:return
    n=512;y,x=np.mgrid[0:n,0:n];u=x/n;v=y/n
    weave=.012*np.sin(u*math.tau*96)*np.cos(v*math.tau*96)
    if kind=='stripe':
        stripe=np.exp(-(np.sin(u*math.pi*16)/.065)**2)*.026
        weave+=stripe
    if kind=='brocade':
        weave+=.045*(np.exp(-(np.sin((u+v)*math.pi*8)/.11)**2)+np.exp(-(np.sin((u-v)*math.pi*8)/.11)**2))
    rgba=np.ones((n,n,4),dtype=np.float32)
    for k,c in enumerate(colour):rgba[:,:,k]=np.clip(c+weave,0,1)
    im=image(label+' original albedo',rgba)
    im.filepath_raw=str(TEXTURES/(label+'.png'));im.file_format='PNG';im.save();im.pack()
    for link in list(p.inputs['Base Color'].links):material.node_tree.links.remove(link)
    tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='REPEAT'
    material.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    p.inputs['Roughness'].default_value=.74 if kind!='brocade' else .53
    p.inputs['Metallic'].default_value=0
    return im

def panel(name,center,scale,mat,p,rounding=.003):
    bpy.ops.mesh.primitive_cube_add(size=1,location=center)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    bevel=o.modifiers.new('Tailored rounded edge','BEVEL');bevel.width=rounding;bevel.segments=3
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
    for f in o.data.polygons:f.use_smooth=True
    parent(o,p);return o

def sleeve_folds(o):
    points=[o.matrix_world@v.co for v in o.data.vertices]
    if not points:return
    zlo=min(p.z for p in points);zhi=max(p.z for p in points)
    side=-1 if sum(p.x for p in points)<0 else 1
    def fn(p):
        p=p.copy();t=max(0,min(1,(p.z-zlo)/max(.01,zhi-zlo)))
        # Fuller upper sleeve and small compression folds around the elbow.
        envelope=math.sin(t*math.pi)**2
        p.x+=side*(.005*envelope+.0018*math.sin(t*math.pi*9)*envelope)
        p.y+=.0023*math.sin(t*math.pi*10+p.x*17)*envelope
        return p
    deform(o,fn)

for who,base in [('Student','v11a'),('Business','v108w'),('City','v108w')]:
    stem=f'CT_{who}_Explore_v11b'
    if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve existing '+stem)
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_{base}.blend'),load_ui=False,use_scripts=False)
    root=bpy.data.objects[f'CT_{who}_Explore_{base}'];root.name=stem
    changes=[]
    active=[o for o in root.children_recursive if o.type=='MESH' and not o.hide_render]
    for o in active:
        if o.name.startswith('V3 rounded sleeve'):sleeve_folds(o)
    if who=='Student':
        violet=bpy.data.materials['Original plum woven jacket.001']
        canvas=bpy.data.materials['V10 warm recycled cotton.003']
        albedo(violet,(.57,.405,.69),'weave','student-lavender-canvas')
        albedo(canvas,(.73,.645,.51),'weave','student-sand-cargo')
        trim=bpy.data.materials['Brushed brass.001']
        # Real raised pockets, flaps and bound openings follow the retained rig.
        for side in [-1,1]:
            o=panel('V11 bomber welt pocket',(side*.105,-.088,1.005),(.054,.012,.073),violet,root)
            weight(o,root,['J_Bip_C_Spine','J_Bip_C_Chest'])
            pts=[(side*(.081+t*.044),-.097,1.027-t*.020)for t in np.linspace(0,1,24)]
            o=curve('V11 bound pocket lip',pts,.0016,trim,root)
            weight(o,root,['J_Bip_C_Spine','J_Bip_C_Chest'])
            o=panel('V11 cargo bellows pocket',(side*.152,-.017,.577),(.019,.102,.133),canvas,root,.005)
            weight(o,root,[f'J_Bip_{"L" if side>0 else "R"}_UpperLeg'])
            o=panel('V11 cargo folded flap',(side*.163,-.017,.638),(.009,.108,.030),violet,root,.002)
            weight(o,root,[f'J_Bip_{"L" if side>0 else "R"}_UpperLeg'])
        # Replace the rope-like braids with wider tapered three-strand plaits.
        for o in active:
            if o.name.startswith(('V108w rooted rose braid','V108w tapered hair filament')):o.hide_render=True
        pink=bpy.data.materials['V108d rose silk braided hair']
        fine=bpy.data.materials['V108d rose hair highlights']
        for side in [-1,1]:
            for strand in range(3):
                pts=[]
                for j in range(145):
                    t=j/144;rooting=min(1,t/.22);rooting=rooting*rooting*(3-2*rooting)
                    a=t*math.pi*14+strand*math.tau/3;r=.012*(1-.57*t)
                    pts.append((side*(.105+.035*rooting+.009*math.sin(t*math.pi))+r*math.cos(a),.006-.083*rooting+r*math.sin(a),1.515-.418*t))
                o=curve('V11 rose three-strand plait',pts,.012,pink,root);weight(o,root,['J_Bip_C_Head'])
                for offset in [-1,1]:
                    o=curve('V11 fine rose braid strand',[(x+offset*.003,y-.010,z)for x,y,z in pts],.00023,fine,root);weight(o,root,['J_Bip_C_Head'])
            o=panel('V11 lavender braid tie',(side*.142,-.078,1.115),(.030,.025,.018),violet,root,.004);weight(o,root,['J_Bip_C_Head'])
        changes+=['Original lavender woven albedo and sand canvas maps exported as editable PNGs.','Raised bomber welt pockets, bound openings, cargo bellows pockets and folded violet flaps.','Fuller articulated sleeves with compression folds; wider three-strand tapered plaits and braid ties.','Covered torso correction retained from v11a; face, hands, complete skateboard and camera retained.']
    elif who=='Business':
        for m in bpy.data.materials:
            if m.name=='Fine midnight pinstripe wool':albedo(m,(.145,.163,.187),'stripe','business-midnight-pinstripe')
            if m.name=='Botanical silk':albedo(m,(.16,.31,.23),'brocade','business-emerald-brocade')
        face=bpy.data.objects['V108l distinct Business anime face']
        def mature(p):
            p=p.copy();front=max(0,min(1,(-p.y-.055)/.065))
            jaw=math.exp(-((p.z-1.104)/.030)**2)*front
            p.x*=1+.16*jaw
            nose=math.exp(-(p.x/.022)**2-((p.z-1.159)/.030)**2)*front
            p.y-=.004*nose
            return p
        deform(face,mature)
        changes+=['Woven midnight pinstripe and original emerald diamond brocade textures follow garment UVs.','Wider adult lower jaw and refined nose projection applied consistently to all facial morphs.','Retained original optical frame, chair upholstery, watch, articulated hands and props.']
    else:
        for m in bpy.data.materials:
            if m.name=='Ivory tailored wool':albedo(m,(.79,.752,.661),'weave','city-ivory-wool')
        coat=bpy.data.objects.get('V10 open tailored coat torso')
        if coat:
            def drape(p):
                p=p.copy();w=max(0,min(1,(1.22-p.z)/.23))
                p.y+=.0035*math.sin(p.x*55+p.z*9)*w
                return p
            deform(coat,drape)
        changes+=['Original ivory wool albedo and low-amplitude hem drape with retained double-layer coat structure.','Articulated sleeve folds retain contact with the source hands and tablet.','Distinct civic face, low bun, metal accessories and tablet preserved.']
    for o in root.children_recursive:
        if o.type!='MESH' or o.hide_render:continue
        for m in o.data.materials:
            if m and ('SKIN' in m.name or 'skin' in m.name.lower() or 'complexion' in m.name.lower() or 'softly lit civic neck' in m.name):
                m['ct_v11_skin_colour']=[.75,.52,.40,1]if who=='Student'else[.67,.435,.31,1]if who=='Business'else[.78,.565,.445,1]
    root['v11b_refinements']=json.dumps(changes)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
    export(root,stem);export(root,stem+'-portrait')
    for o in root.children_recursive:
        if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<1000:continue
        bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
        try:bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:o.modifiers.remove(mod)
    export(root,stem+'-lite')
    record=json.loads((OUT/f'CT_{who}_Explore_{base}.sources.json').read_text())
    record.update(version='v11b',parent_version=base,paid_calls=0,status='browser visual review pending')
    record.setdefault('refinements',[]).extend(changes)
    record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in sorted(OUT.glob(stem+'*.glb'))]
    (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf-8')
    print('V11B_EXPORTED',who,flush=True)
