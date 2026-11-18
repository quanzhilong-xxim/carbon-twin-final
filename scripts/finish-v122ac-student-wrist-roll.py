"""Add exported intermediate wrist bones to preserve the curved skin transition."""
import bpy,sys,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122ac'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve AC')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122ab.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122ab'];rig=root
bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for side in ['L','R']:
 source=rig.data.edit_bones['J_Bip_'+side+'_Hand'];bone=rig.data.edit_bones.new('J_Roll_'+side+'_WristSkin')
 bone.head=source.head;bone.tail=source.tail;bone.roll=source.roll;bone.parent=rig.data.edit_bones['J_Bip_'+side+'_LowerArm'];bone.use_deform=True
bpy.ops.object.mode_set(mode='OBJECT')
for side in ['L','R']:
 o=bpy.data.objects['V122ab anatomical student hand '+side]
 hand=o.vertex_groups['J_Bip_'+side+'_Hand'];forearm=o.vertex_groups['J_Bip_'+side+'_LowerArm'];middle=o.vertex_groups.new(name='J_Roll_'+side+'_WristSkin')
 for v in o.data.vertices:
  if v.index<1353:continue
  t=((v.index-1353)//18+1)/6
  hand.add([v.index],max(0,1-2*t),'REPLACE');forearm.add([v.index],max(0,2*t-1),'REPLACE');middle.add([v.index],1-abs(2*t-1),'REPLACE')
 o.name='V122ac anatomical student hand '+side
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122ab','v122ac',[
 'Export two actual intermediate wrist-skin bones and blend the transition through hand, half-roll and forearm influences; preserve all original finger bones and topology'
],student=True)
file=OUT/(STEM+'.sources.json');record=json.loads(file.read_text());record['additional_sources']=json.loads((OUT/'CT_Student_Explore_v122ab.sources.json').read_text())['additional_sources'];file.write_text(json.dumps(record,indent=2),encoding='utf8')
