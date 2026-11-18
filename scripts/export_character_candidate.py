"""Shared local export for review candidates, keeping full editable sources."""
import bpy, hashlib, json

def export_candidate(root, rig, out, stem, parent_stem, revision, changes, student=False):
    if any(out.glob(stem+'*')):raise RuntimeError('Preserve existing candidate '+stem)
    root.name=stem
    objects=[root,*root.children_recursive]
    def neutral():
        for obj in objects:
            if obj.type=='MESH' and obj.data.shape_keys:
                for key in obj.data.shape_keys.key_blocks:key.value=0
    neutral();root[revision+'_changes']=json.dumps(changes)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/(stem+'.blend')))
    if student:
        keep={'Basis','Fcl_EYE_Close','Fcl_MTH_Joy','Fcl_BRW_Joy','Fcl_EYE_Joy','Fcl_BRW_Fun','Fcl_EYE_Surprised'}
        for obj in objects:
            if obj.type=='MESH' and obj.data.shape_keys:
                for key in list(obj.data.shape_keys.key_blocks)[::-1]:
                    if key.name.rsplit('.',1)[-1] not in keep:obj.shape_key_remove(key)
    native=bpy.data.actions.get('CT_BreathAndHands')
    if not student:
        for action in list(bpy.data.actions):
            if action!=native:bpy.data.actions.remove(action)
    for obj in bpy.context.scene.objects:
        if obj.name in bpy.context.view_layer.objects:obj.select_set(obj in objects and not obj.hide_render)
    exports=[]
    for tier in ['','-portrait','-lite']:
        neutral()
        if tier=='-lite':
            for obj in objects:
                if obj.type!='MESH' or obj.hide_render or obj.data.shape_keys or ('anatomical' in obj.name and 'hand' in obj.name) or obj.name=='Body' or len(obj.data.polygons)<800:continue
                bpy.context.view_layer.objects.active=obj
                modifier=obj.modifiers.new('Mobile silhouette budget','DECIMATE');modifier.ratio=.55;bpy.ops.object.modifier_apply(modifier=modifier.name)
        bpy.context.view_layer.objects.active=rig
        if not student and native:rig.animation_data.action=native
        path=out/(stem+tier+'.glb')
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=False,export_animations=not student,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=True,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=74 if tier=='-lite' else 86,export_image_webp_fallback=False)
        exports.append({'file':path.name,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    record=json.loads((out/(parent_stem+'.sources.json')).read_text(encoding='utf8'))
    record.update(revision=revision,version=revision,status='CANDIDATE_NOT_ACCEPTED',editable_source=stem+'.blend',parent_revision=parent_stem.rsplit('_',1)[-1],refinements=record.get('refinements',[])+changes,exports=exports,paid_calls=0)
    (out/(stem+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
    print('CANDIDATE_EXPORTED',stem,flush=True)
