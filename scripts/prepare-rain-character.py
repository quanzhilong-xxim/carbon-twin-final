"""Versioned CC-BY student study and crowd source, using no embedded scripts."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/rain-v2/extracted')
OUT=ROOT/'public/models/characters-v10'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'rain_rig.blend'),load_ui=False,use_scripts=False)
scene=bpy.context.scene
rig=bpy.data.objects['RIG-rain']
info={'rig_properties':{},'pose_properties':{},'bones':len(rig.data.bones),'source':'https://studio.blender.org/characters/rain/v2/','license':'CC-BY-4.0','credit':'Rain Rig © Blender Foundation | cloud.blender.org','adaptation':'CarbonTwin pink hair, purple top, web materials and optimisation','paid_calls':0}
for b in rig.pose.bones:
    if b.name.startswith('Properties'):info['pose_properties'][b.name]={k:str(v) for k,v in b.items()}
for k,v in rig.items():info['rig_properties'][k]=str(v)
(OUT/'rig-properties.json').write_text(json.dumps(info,indent=2),encoding='utf8')

def image(name):
    file=SOURCE/'maps'/name
    if not file.exists():return None
    img=bpy.data.images.load(str(file),check_existing=True)
    if max(img.size)>1024:img.scale(1024,1024)
    img.pack();return img

def material(name,color,rough=.5,texture=None,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if texture:
        t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=image(texture)
        if t.image:m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
    return m

mats={
 'skin':material('CT skin / original painted skin',(.6,.35,.23),.48,'TEX-rain_body_diffuse.png'),
 'head':material('CT face / original painted face',(.64,.39,.29),.48,'TEX-rain_head_diffuse.png'),
 'hands':material('CT hands',(.64,.39,.29),.5,'TEX-rain_hands_diffuse.png'),
 'hair':material('CT rose hair',(.34,.075,.14),.4),
 'brow':material('CT brows',(.095,.018,.025),.65),
 'top':material('CT plum textile',(.18,.10,.31),.84),
 'jeans':material('CT indigo denim',(.035,.055,.12),.91),
 'scarf':material('CT botanical scarf',(.15,.27,.15),.8),
 'shoes':material('CT canvas sneakers',(.73,.69,.57),.8,'TEX-rain_shoes_diffuse.png'),
 'socks':material('CT socks',(.6,.57,.46),.9),
 'laces':material('CT laces',(.79,.78,.69),.9),
 'metal':material('CT equipment trim',(.48,.32,.10),.3,metal=.75),
 'eye':material('CT painted eyes',(.42,.65,.7),.28,'TEX-rain_eyes_diffuse.png'),
 'white':material('CT dental enamel',(.85,.8,.7),.3),
 'mouth':material('CT mouth',(.2,.026,.03),.48),
}
cornea=material('CT clear eye surface',(.9,.96,1),.08)
cp=cornea.node_tree.nodes.get('Principled BSDF');cp.inputs['Transmission Weight'].default_value=1;cp.inputs['IOR'].default_value=1.38
keep=[]
for o in list(bpy.data.objects):
    if o.type=='MESH' and o.name.startswith('GEO-') and not o.hide_render:
        o.hide_set(False);keep.append(o)
        for mod in o.modifiers:
            if mod.type=='SUBSURF':mod.levels=1;mod.render_levels=1
        name=o.name
        kind='head' if name.endswith('_head') else 'hair' if '_hair' in name and 'band' not in name else 'eye' if name.endswith('_eyes') else 'brow' if 'eyebrow' in name or 'eyelash' in name else 'jeans' if 'jeans' in name else 'top' if name.endswith('_top') else 'scarf' if 'scarf' in name else 'shoes' if 'shoes' in name else 'mouth' if 'gums' in name or 'tongue' in name else 'skin'
        if 'cornea' in name:target=cornea
        else:target=mats[kind]
        # Retain shoe lace / sole regions by mapping their original material slots.
        old=list(o.data.materials);o.data.materials.clear()
        for m in old:
            key='laces' if m and ('laces' in m.name or 'teeth' in m.name) else 'metal' if m and 'metal' in m.name else 'socks' if m and 'socks' in m.name else None
            o.data.materials.append(mats[key] if key else target)
        if not old:o.data.materials.append(target)
        if o.data.uv_layers.active:
            for uv in o.data.uv_layers.active.data:uv.uv.x=uv.uv.x%1
        for p in o.data.polygons:p.use_smooth=True

for o in scene.objects:o.select_set(False)
rig.hide_set(False);rig.select_set(True)
for o in keep:o.select_set(True)
scene.frame_set(1)
bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'CT_Student_Rain_v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'CT_Student_Rain_v1.glb'),export_format='GLB',use_selection=True,export_apply=False,export_animations=False,export_def_bones=True,export_image_format='WEBP',export_image_quality=86,export_image_webp_fallback=False)

# A real front preview of the source, not an image-generation substitute.
for o in scene.objects:
    if o.type=='MESH' and o not in keep:o.hide_render=True
    if o.type in {'CAMERA','LIGHT'}:o.hide_render=True
world=bpy.data.worlds.new('CT neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.17,.16,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6;scene.world=world
camdata=bpy.data.cameras.new('CT inspection camera');cam=bpy.data.objects.new('CT inspection camera',camdata);scene.collection.objects.link(cam);cam.location=(2,-4,1.8);cam.rotation_euler=(Vector((0,0,.95))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=60;scene.camera=cam
for name,location,power,size in [('key',(-3,-4,4),450,4),('rim',(2,2,3),650,3)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;light=bpy.data.objects.new(name,data);scene.collection.objects.link(light);light.location=location;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_x=450;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/'outputs/v10-explore/rain-source-front.png');scene.render.image_settings.file_format='PNG'
bpy.ops.render.render(write_still=True)
info['web_bytes']=(OUT/'CT_Student_Rain_v1.glb').stat().st_size
(OUT/'SOURCES.json').write_text(json.dumps(info,indent=2),encoding='utf8')
print('CT_STUDENT_EXPORTED',info['web_bytes'])
