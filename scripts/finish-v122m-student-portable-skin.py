import bpy,sys,math
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate'
if any(OUT.glob('CT_Student_Explore_v122m*')):raise RuntimeError('Preserve M')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122k.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122k'];face=bpy.data.objects['Face']
slot=next(i for i,m in enumerate(face.data.materials) if m.name=='V122j student painted physical skin')
painted=bpy.data.materials['V122j student painted physical skin']
image=next(n.image for n in painted.node_tree.nodes if n.type=='TEX_IMAGE')
with bpy.data.libraries.load(str(OUT/'CT_Student_Explore_v122g.blend'),link=False) as (available,requested):
    assert 'Face_00_SKIN' in available.materials
    requested.materials=['Face_00_SKIN']
original=bpy.data.materials['Face_00_SKIN']
for node in original.node_tree.nodes:
    if node.type=='TEX_IMAGE' and node.image:node.image=image
face.data.materials[slot]=original
# Pull the solid braid core inside the interlaced surface. Their previous
# nearly coincident surfaces produced dark speckles at grazing angles.
for obj in root.children_recursive:
    if obj.type!='MESH' or not obj.name.startswith('V122c soft plait underbody'):continue
    sign=1 if sum(v.co.x for v in obj.data.vertices)>0 else -1
    for v in obj.data.vertices:
        t=max(0,min(1,(1.515-v.co.z)/.414));ease=min(1,t/.22);ease=ease*ease*(3-2*ease)
        cx=sign*(.106+.057*ease+.009*math.sin(t*math.pi))
        cx+=sign*.0055*math.sin(t*math.pi*1.1)
        cy=-.004-.081*ease+.008*math.sin(t*math.pi*.85)
        v.co.x=cx+(v.co.x-cx)*.68;v.co.y=cy+(v.co.y-cy)*.68
export_candidate(root,root,OUT,'CT_Student_Explore_v122m','CT_Student_Explore_v122k','v122m',['Reuse the original licensed portable skin graph and physical export factors with the UV cheek tint','Reduce the inner plait core to eliminate nearly coincident surfaces'],student=True)
