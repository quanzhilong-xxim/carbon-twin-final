"""Adapt the exact CC0 bookshelf to one compact, reusable web asset."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
source=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/library-shelf-v104/wooden_bookshelf_worn_1k.blend')
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
scene=bpy.context.scene;meshes=[o for o in scene.objects if o.type=='MESH' and not o.hide_render]
if not meshes:raise RuntimeError('No visible source geometry')
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.hide_set(False);o.select_set(True)
pts=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];lo=Vector(tuple(min(v[i] for v in pts) for i in range(3)));hi=Vector(tuple(max(v[i] for v in pts) for i in range(3)))
root=bpy.data.objects.new('CC0 wooden bookshelf / CarbonTwin web adaptation',None);scene.collection.objects.link(root)
for o in meshes:w=o.matrix_world.copy();o.parent=root;o.matrix_world=w
for im in bpy.data.images:
    if im.source=='FILE':
        try:im.filepath=str(source.parent/Path(bpy.path.abspath(im.filepath)).name) if not Path(bpy.path.abspath(im.filepath)).exists() else im.filepath;im.reload()
        except RuntimeError:pass
        if max(im.size)>1024:im.scale(1024,1024)
        im.pack()
root.select_set(True);bpy.context.view_layer.objects.active=root
out=ROOT/'public/models/research/CT_LibraryShelf_v104.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_image_format='JPEG',export_image_quality=82)
editable=out.with_suffix('.blend');bpy.ops.wm.save_as_mainfile(filepath=str(editable))
report={'source':'https://polyhaven.com/a/wooden_bookshelf_worn','license':'CC0-1.0','source_world_bounds_z_up':{'low':list(lo),'high':list(hi)},'bytes':out.stat().st_size,'mesh_count':len(meshes),'max_texture_dimension':1024,'paid_calls':0}
(ROOT/'docs/recovery/v10.4/bookshelf-export.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
