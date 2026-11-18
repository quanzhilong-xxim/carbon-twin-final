"""Reuse the retained artist-sculpted Rain groom (Blender Foundation CC BY 4.0)."""
import bpy,bmesh,sys,math,json
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BUSINESS=ROLE=='Business';STEM=f'CT_{ROLE}_Explore_v122o'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve O')
source='D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/rain-v2/extracted/rain_rig.blend'
bpy.ops.wm.open_mainfile(filepath=source,load_ui=False,use_scripts=False)
parts=[]
for name in ['GEO-rain_hair_main','GEO-rain_hair_strand']:
    obj=bpy.data.objects[name]
    bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
    data=bpy.data.meshes.new_from_object(obj.evaluated_get(dg),depsgraph=dg);data.transform(obj.matrix_world)
    parts.append(dict(name=name,vertices=[v.co.copy()for v in data.vertices],faces=[tuple(p.vertices)for p in data.polygons],uv=[tuple(x.uv)for x in data.uv_layers.active.data] if data.uv_layers.active else None))
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122n.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122n'];rig=bpy.data.objects['CT_Humanoid']
for obj in root.children_recursive:
    if obj.type!='MESH' or obj.hide_render:continue
    if any(term in obj.name.lower() for term in ['groom','scalp','swept','temple curl','strand sweep','organic lock']):obj.hide_render=True
# The native Rain groom was authored for the same face used by the city
# character. The male donor is fitted with a slightly wider/shorter transform.
eye=1.204 if BUSINESS else 1.588
scale=(.90,.86,.84) if BUSINESS else (.96,.96,.96)
matrix=Matrix.Translation((0,-.014 if BUSINESS else -.009,eye))@Matrix.Diagonal((*scale,1))@Matrix.Translation((0,0,-1.4733431))
material=bpy.data.materials.new('V122o artist sculpted chestnut hair');material.use_nodes=True
p=material.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.085,.036,.020,1) if BUSINESS else (.075,.030,.018,1);p.inputs['Roughness'].default_value=.42;p.inputs['Specular IOR Level'].default_value=.28
for part in parts:
    points=[matrix@v for v in part['vertices']]
    if BUSINESS and part['name'].endswith('strand'):
        # Retain the swept temple curl, shortening only its distal tip.
        for v in points:
            if v.z<eye-.015:v.z=eye-.015+(v.z-eye+.015)*.62
    data=bpy.data.meshes.new('V122o native Rain sculpted hair');data.from_pydata(points,[],part['faces']);data.materials.append(material)
    obj=bpy.data.objects.new('V122o retained artist '+part['name'],data);bpy.context.scene.collection.objects.link(obj);obj.parent=rig
    if part['uv'] and len(part['uv'])==len(data.loops):
        uv=data.uv_layers.new(name='Native sculpt UV')
        for dst,src in zip(uv.data,part['uv']):dst.uv=src
    for poly in data.polygons:poly.use_smooth=True
    group=obj.vertex_groups.new(name='CT_Head');group.add(list(range(len(points))),1,'REPLACE')
    modifier=obj.modifiers.new('Retained real head skin','ARMATURE');modifier.object=rig
changes=['Use the retained artist-sculpted Rain hair topology and curved temple lock, Blender Foundation CC BY 4.0','Fit the original sculpt to the existing native face and real head bone; preserve the city low bun and gold pin','Retire procedural diagonal hair sheet and alpha layers from this candidate']
export_candidate(root,rig,OUT,STEM,f'CT_{ROLE}_Explore_v122n','v122o',changes)
