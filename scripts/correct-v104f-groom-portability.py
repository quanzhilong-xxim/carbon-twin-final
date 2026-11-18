"""Fix the actually rejected F browser groom: tangent-dependent anisotropy
was exported on unwrapped meshes; restore inadvertently grouped eyebrows.
Preserve the failed F file and screenshots for diagnosis, then verify again.
"""
import bpy,json,hashlib,shutil,datetime,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];file=ROOT/'public/models/characters-v10/CT_City_Explore_v104f.blend'
backup=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild')/('V104F-GROOM-PREEDIT-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir()
target=backup/file.name;shutil.copy2(file,target)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(file)==sha(target)
(backup/'manifest.json').write_text(json.dumps({'source':str(file),'sha256':sha(file),'verified':True},indent=2))
bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False);root=bpy.data.objects['CT_City_Explore_v104f']
if root.get('f_groom_portable'):raise RuntimeError('Already repaired')
mat=bpy.data.materials['V104f civic chestnut low-bun groom'];q=mat.node_tree.nodes['Principled BSDF']
q.inputs['Anisotropic'].default_value=0;q.inputs['Roughness'].default_value=.68;q.inputs['Specular IOR Level'].default_value=.18;q.inputs['Base Color'].default_value=(.045,.022,.015,1)
restored=[]
for o in root.children_recursive:
    if o.name.endswith('_eyebrows'):o.hide_render=False;restored.append(o.name)
    if o.type!='MESH' or o.hide_render or mat not in list(o.data.materials):continue
    if not o.data.uv_layers:
        uv=o.data.uv_layers.new()
        for l in o.data.loops:
            p=o.matrix_world@o.data.vertices[l.vertex_index].co
            uv.data[l.index].uv=(math.atan2(p.y,p.x)/math.tau,p.z*3)
root['f_groom_portable']=True;bpy.ops.wm.save_as_mainfile(filepath=str(file))
(ROOT/'docs/recovery/v10.4/groom-portability-f.json').write_text(json.dumps({'preedit_backup':str(backup),'portable_isotropic_pbr':True,'uvs_created':True,'eyebrows_restored':restored,'browser_review_pending':True},indent=2))
