"""Finish two retained chapter scenes without rebuilding their geometry.
Local Blender/Cycles only. V1-V5 files remain unchanged outside the web root.
"""
import bpy, math, json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/chapter-scenes-v5')
OUT=BASE.parent/'chapter-scenes-v6'; OUT.mkdir(exist_ok=True)
names=['culture','waterfront','innovation','valley','mobility','symbiosis']
idx=int(sys.argv[-1]) if '--' in sys.argv else 5
assert idx in (3,5), 'This increment only finishes the valley and evening lake.'
name=names[idx]
bpy.ops.wm.open_mainfile(filepath=str(BASE/(name+'-v5.blend')),load_ui=False,use_scripts=False)
scene=bpy.context.scene
changes=[]
if idx==5:
    # Retain photographed cloud structure, but match its illumination to blue hour.
    nodes=scene.world.node_tree.nodes; links=scene.world.node_tree.links
    background=nodes.get('Background'); original=background.inputs['Color'].links[0].from_socket
    tint=nodes.new('ShaderNodeMixRGB'); tint.name='V6 blue-hour captured clouds'; tint.blend_type='MULTIPLY'
    tint.inputs[0].default_value=1; tint.inputs[2].default_value=(.15,.25,.49,1)
    links.new(original,tint.inputs[1]); links.new(tint.outputs[0],background.inputs['Color'])
    background.inputs['Strength'].default_value=.14
    for o in scene.objects:
        if o.type=='LIGHT':
            if o.data.type=='SUN': o.data.energy=.28; o.data.color=(.48,.62,1)
            elif o.data.type=='POINT': o.data.energy=95; o.data.color=(1,.56,.23); o.data.shadow_soft_size=.45
    for m in bpy.data.materials:
        if m.use_nodes and ('Interior lamps' in m.name or 'Window' in m.name or 'window' in m.name):
            p=m.node_tree.nodes.get('Principled BSDF')
            if p: p.inputs['Emission Color'].default_value=(1,.53,.19,1); p.inputs['Emission Strength'].default_value=2.5
    # Visible light sources on the path, paired with the existing point lights.
    lampmat=bpy.data.materials.new('V6 warm path diffuser'); lampmat.use_nodes=True
    p=lampmat.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(1,.62,.28,1)
    p.inputs['Emission Color'].default_value=(1,.43,.12,1); p.inputs['Emission Strength'].default_value=4
    for x in [-36,-12,14,38]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.11,location=(x+1.25,2,4.16))
        bpy.context.object.name='V6 visible lakeside light'; bpy.context.object.data.materials.append(lampmat)
    scene.view_settings.exposure=.55
    changes=['Captured clouds graded to blue hour','Matched cool environment and warm path fixtures','Existing geometry, landmarks, people and trees retained']
else:
    for o in scene.objects:
        if o.type=='MESH' and o.name.startswith(('Distant forest ridge','Forested hillside')):
            sub=o.modifiers.new('V6 continuous terrain normals','SUBSURF'); sub.levels=1; sub.render_levels=1
            for poly in o.data.polygons: poly.use_smooth=True
    m=bpy.data.materials.get('Fine park soil and grass')
    if m and m.use_nodes:
        nodes=m.node_tree.nodes; links=m.node_tree.links; p=nodes.get('Principled BSDF')
        tex=nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=1.8; tex.inputs['Detail'].default_value=4
        ramp=nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color=(.035,.085,.025,1); ramp.color_ramp.elements[1].color=(.21,.29,.10,1)
        links.new(tex.outputs['Fac'],ramp.inputs[0]); links.new(ramp.outputs[0],p.inputs['Base Color'])
    scene.view_settings.exposure=.45
    changes=['Continuous terrain silhouettes','Broad ecological colour variation','Existing terrain-rooted trees, bridge and community retained']
scene.render.engine='CYCLES'; scene.cycles.samples=48; scene.cycles.use_denoising=True
scene.render.resolution_x=1600; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(ROOT/'public/media/explore-v10'/(name+'-v6.png'))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(name+'-v6.blend')))
bpy.ops.render.render(write_still=True)
(OUT/(name+'-v6.json')).write_text(json.dumps({'retained_source':str(BASE/(name+'-v5.blend')),'changes':changes,'paid_calls':0,'status':'pending visual inspection'},indent=2))
print('V6_ATMOSPHERE_READY',name,flush=True)
