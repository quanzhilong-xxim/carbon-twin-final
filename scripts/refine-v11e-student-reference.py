"""Student V11e: reference-matched knit cap, loose plaits and bomber volume.
Preserves V11d and all existing face topology, humanoid weights and props.
Reference: user concept board 074_a3ba842c39b243196a3b5b1eadb4bc43.png.
"""
import bpy,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finish-v11-role-assets.py').read_text().split("\nfor who,base in [(")[0],__file__,'exec'))
stem='CT_Student_Explore_v11e'
if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve '+stem)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v11d.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v11d'];root.name=stem
cream=bpy.data.materials.new('V11e warm cream rib knit');cream.use_nodes=True;p=cream.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.79,.68,.51,1);p.inputs['Roughness'].default_value=.85
orange=bpy.data.materials.new('V11e soft apricot knit cuff');orange.use_nodes=True;p=orange.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.80,.40,.17,1);p.inputs['Roughness'].default_value=.85
for name in ['Explorer soft cap','Cap binding']:bpy.data.objects[name].hide_render=True
def knit(name,rings,mat):
    n=192;vs=[];fs=[]
    for z,rx,ry in rings:
        for i in range(n):
            a=i/n*math.tau;rib=.0012*math.cos(a*64);vs.append(((rx+rib)*math.cos(a),.018+(ry+rib)*math.sin(a),z))
    for j in range(len(rings)-1):
        for i in range(n):q=j*n+i;qn=j*n+(i+1)%n;fs.append((q,qn,qn+n,q+n))
    o=mesh(name,vs,fs,mat,root);weight(o,root,['J_Bip_C_Head']);return o
rings=[]
for j in range(28):
    phi=j/27*math.pi/2;rings.append((1.558+.108*math.sin(phi),max(.0005,.133*math.cos(phi)),max(.0005,.115*math.cos(phi))))
knit('V11e fitted rib knit beanie crown',rings,cream)
knit('V11e turned apricot knit cuff',[(1.550,.133,.115),(1.554,.137,.119),(1.577,.137,.119),(1.584,.133,.115)],orange)
pink=bpy.data.materials['V108d rose silk braided hair'];fine=bpy.data.materials['V108d rose hair highlights']
for o in list(root.children_recursive):
    if o.name.startswith(('V11 rose three-strand plait','V11 fine rose braid strand')):o.hide_render=True
for side in [-1,1]:
    for strand in range(3):
        pts=[]
        for j in range(150):
            t=j/149;settle=min(1,t/.24);settle=settle*settle*(3-2*settle)
            a=t*math.tau*3.6+strand*math.tau/3;r=(.014+.007*math.sin(math.pi*t))*(1-.38*t)
            pts.append((side*(.106+.058*settle+.010*math.sin(t*math.pi*1.3))+r*math.cos(a),-.004-.081*settle+r*math.sin(a),1.515-.414*t))
        o=curve('V11e loose rose plait section',pts,.0145,pink,root);weight(o,root,['J_Bip_C_Head'])
        # Fine fibres follow the same plait surface, with real taper.
        for offset in [-1,1]:
            o=curve('V11e rose plait surface fibre',[(x+offset*.004,y-.011,z)for x,y,z in pts],.00028,fine,root);weight(o,root,['J_Bip_C_Head'])
    pts=[]
    for j in range(55):
        t=j/54;pts.append((side*(.102+.033*math.sin(t*math.pi*.85)),-.07-.060*math.sin(t*math.pi*.78),1.514-.125*t))
    o=curve('V11e soft face framing rose lock',pts,.006,pink,root);weight(o,root,['J_Bip_C_Head'])
    tie=bpy.data.objects['V11 lavender braid tie'+(''if side==-1 else'.001')]
    world=tie.matrix_world.copy();world.translation.x=side*.166;world.translation.y=-.081;tie.matrix_world=world
for o in root.children_recursive:
    if o.type!='MESH' or o.hide_render:continue
    if o.name.startswith('V3 rounded sleeve shoulder'):
        side=-1 if o.name=='V3 rounded sleeve shoulder'else 1
        a=Vector((side*.109,.018,1.274));b=Vector((side*.294,.018,.881));axis=b-a
        def full_sleeve(p):
            t=max(0,min(1,(p-a).dot(axis)/axis.length_squared));center=a+axis*t;radial=p-center
            amount=1+.22*math.sin(math.pi*t)**.65+.025*math.sin(t*math.pi*9)*math.sin(math.pi*t)**2
            return center+radial*amount
        deform(o,full_sleeve)
root['v11e_reference']='074_a3ba842c39b243196a3b5b1eadb4bc43.png'
changes=['Replaced flattened cap with fitted warm cream rib-knit dome and soft apricot turned cuff, following the reference silhouette; retained fitted goggles.','Replaced tight rope-like braids with broader, slower three-strand loose plaits and two soft face-framing locks.','Fuller bomber sleeve cross-sections with bounded compression folds; retained original humanoid cloth weights and wrist contact.']
root['v11e_refinements']=json.dumps(changes)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
export(root,stem);export(root,stem+'-portrait')
for o in root.children_recursive:
    if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<1000:continue
    bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
    try:bpy.ops.object.modifier_apply(modifier=mod.name)
    except RuntimeError:o.modifiers.remove(mod)
export(root,stem+'-lite')
record=json.loads((OUT/'CT_Student_Explore_v11d.sources.json').read_text());record.update(version='v11e',parent_version='v11d',paid_calls=0,status='browser review pending');record.setdefault('refinements',[]).extend(changes)
record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in sorted(OUT.glob(stem+'*.glb'))]
(OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf-8');print('V11E_STUDENT_EXPORTED',flush=True)
