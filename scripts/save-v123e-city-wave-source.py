"""Retain original V123b Wave and add matching editable V123e arm curves."""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Quaternion
R=Path(__file__).resolve().parents[1];O=R/'public/models/characters-v12-candidate';W=R/'work/v123e-city-wave'
stem='CT_City_Explore_v123e';parent='CT_City_Explore_v123b';dest=O/(stem+'.blend')
if dest.exists():raise RuntimeError('Preserve existing '+str(dest))
bpy.ops.wm.open_mainfile(filepath=str(O/(parent+'.blend')),load_ui=False,use_scripts=False)
root=bpy.data.objects[parent];root.name=stem;rig=bpy.data.objects['CT_Humanoid']
track=next(t for t in rig.animation_data.nla_tracks if t.name=='Wave');strip=track.strips[0]
original=strip.action;original.use_fake_user=True
action=original.copy();action.name='V123e_City_Continuous_Wave';action.use_fake_user=True
old_slot=strip.action_slot.identifier;strip.action=action;strip.action_slot=next(s for s in action.slots if s.identifier==old_slot)
curves=[fc for l in action.layers for s in l.strips for b in s.channelbags for fc in b.fcurves]
report=[]
def ease(x):return x*x*x*(x*(x*6-15)+10)
for name in ['CT_UpperArm_R','CT_Forearm_R','CT_Hand_R']:
 path=f'pose.bones["{name}"].rotation_quaternion';channels=sorted([c for c in curves if c.data_path==path],key=lambda c:c.array_index)
 if len(channels)!=4:raise RuntimeError('Missing 4 quaternion FCurves '+name)
 frames=sorted(set(float(k.co.x)for c in channels for k in c.keyframe_points));qs=[Quaternion(tuple(c.evaluate(f)for c in channels)).normalized()for f in frames];fixed=[q.copy()for q in qs]
 last=len(qs)-1;lift=36;lower=last-36
 for i in range(lift+1):fixed[i]=qs[0].slerp(qs[lift],ease(i/lift))
 for i in range(lower,last+1):fixed[i]=qs[lower].slerp(qs[last],ease((i-lower)/(last-lower)))
 for i in range(1,len(fixed)):
  if fixed[i].dot(fixed[i-1])<0:fixed[i].negate()
 for channel in channels:
  points={round(k.co.x,5):k for k in channel.keyframe_points}
  for f,q in zip(frames,fixed):points[round(f,5)].co.y=q[channel.array_index]
  for k in channel.keyframe_points:k.interpolation='LINEAR'
  channel.update()
 report.append(dict(bone=name,samples=len(fixed),maximum_step_degrees=max(q.rotation_difference(p).angle for p,q in zip(fixed,fixed[1:]))*180/math.pi))
root['v123e_refinement']='Only Wave right arm transitions; shortest-path quaternion quintic ease, original V123b Wave action retained'
bpy.ops.wm.save_as_mainfile(filepath=str(dest))
j=json.loads((O/(parent+'.sources.json')).read_text(encoding='utf8'));edits=json.loads((W/'quaternion-edit.json').read_text())
j.update(revision='v123e',version='v123e',parent_revision='v123b',editable_source=dest.name,status='CANDIDATE_NOT_ACCEPTED',paid_calls=0,exports=[dict(file=Path(e['file']).name,bytes=e['bytes'],sha256=e['sha256'])for e in edits['reports']],wave_refinement=dict(method='1.2s lift/return with quintic ease on shortest quaternion path',bones=report,preserved='Original V123b mesh/material/skin/morph and all Idle/Turn channels; original Wave action kept as fake_user',source_action=action.name,retained_action=original.name),refinements=j.get('refinements',[])+['City Wave only: remove early IK pole twist by shortest-quaternion lift/return, retain held wave and original clips'])
(O/(stem+'.sources.json')).write_text(json.dumps(j,indent=2),encoding='utf8')
print('V123E_EDITABLE_SOURCE_SAVED',report,flush=True)
