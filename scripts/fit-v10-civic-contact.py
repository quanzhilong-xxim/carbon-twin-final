"""Local fit correction measured from the current master and browser views.
Keep source garments and prop hierarchy; never touch identity/voice/state.
"""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
file=OUT/'CT_City_Explore_v10.blend'
bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_City_Explore_v10']
if root.get('civic_contact_fit'):raise RuntimeError('Already fitted; use export only')
inner=bpy.data.objects['V10 continuous dark inner dress'];inverse=inner.matrix_world.inverted()
for v in inner.data.vertices:
 p=inner.matrix_world@v.co;p.y=(p.y+.022)*.72-.012;v.co=inverse@p
held=bpy.data.objects['HeldTablet'];before=list(held.matrix_world.translation)
m=held.matrix_world.copy();m.translation+=Vector((.10,.015,.10));held.matrix_world=m
root['civic_contact_fit']=True
bpy.ops.wm.save_as_mainfile(filepath=str(file))
(ROOT/'outputs/v10-explore/characters-v10/civic-contact-fit.json').write_text(json.dumps({'inner_front_before':-.132,'inner_front_after':-.0912,'tablet_before':before,'tablet_after':list(held.matrix_world.translation),'source_retained':True,'paid_calls':0},indent=2))
print('CIVIC_CONTACT_FIT_SAVED',flush=True)
