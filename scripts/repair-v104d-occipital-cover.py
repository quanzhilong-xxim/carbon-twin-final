"""Repair the D back-view rejection with the retained C occipital groom.
The source remains in the same editable master, hidden; only a copy is cropped.
"""
import bpy,bmesh,json,shutil,hashlib,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';file=OUT/'CT_Business_Explore_v104d.blend'
backup=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild')/('V104D-BACK-PREEDIT-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir();shutil.copy2(file,backup/file.name)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(file)==sha(backup/file.name)
(backup/'manifest.json').write_text(json.dumps({'source':str(file),'sha256':sha(file),'verified':True},indent=2))
bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False);bpy.context.view_layer.update()
root=bpy.data.objects['CT_Business_Explore_v104d']
if root.get('occipital_groom_restored'):raise RuntimeError('Already repaired')
src=next(o for o in root.children_recursive if o.name.endswith('_hair_base'))
o=src.copy();o.data=src.data.copy();bpy.context.scene.collection.objects.link(o);o.name='V104d retained fitted occipital and temple groom';o.hide_render=False;o.hide_set(False)
bm=bmesh.new();bm.from_mesh(o.data)
# Keep the validated back and temple coverage; omit the rejected front rolls.
reject=[f for f in bm.faces if sum((o.matrix_world@v.co).y for v in f.verts)/len(f.verts)<-.022 and sum((o.matrix_world@v.co).z for v in f.verts)/len(f.verts)>1.632]
bmesh.ops.delete(bm,geom=reject,context='FACES');bm.to_mesh(o.data);bm.free()
root['occipital_groom_restored']=True;bpy.ops.wm.save_as_mainfile(filepath=str(file))
(ROOT/'docs/recovery/v10.4/occipital-repair-d.json').write_text(json.dumps({'observed_failure':'D browser back view exposed retained eyeball backs and bald occiput','source':src.name,'new_mesh':o.name,'kept_polygons':len(o.data.polygons),'backup':str(backup),'paid_calls':0},indent=2))
