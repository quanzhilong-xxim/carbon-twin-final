import bpy,bmesh,sys,math
import numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BUSINESS=ROLE=='Business';STEM=f'CT_{ROLE}_Explore_v122p'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve P')
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122o.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122o'];rig=bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
eye=1.204 if BUSINESS else 1.588;head=bpy.data.objects['V12e native head'];nose=eye-(.055 if BUSINESS else .058);mouth=eye-(.105 if BUSINESS else .095)
for key in head.data.shape_keys.key_blocks:
    for v in key.data:
        p=v.co;front=max(0,min(1,(-p.y-.075)/.05))
        nasal=math.exp(-(p.x/.040)**4-((p.z-nose)/.029)**4)*front
        p.x*=1-(.19 if BUSINESS else .22)*nasal
        p.y+=.0045*nasal
        lip=math.exp(-(p.x/.049)**4-((p.z-mouth)/.021)**4)*front
        p.z=mouth+(p.z-mouth)*(1-.17*lip)
        p.x*=1-.045*lip
        p.y+=.0017*lip
for v,k in zip(head.data.vertices,head.data.shape_keys.key_blocks[0].data):v.co=k.co
for obj in root.children_recursive:
    if obj.type=='MESH' and obj.name.startswith('V122o retained artist'):
        bpy.context.view_layer.objects.active=obj
        modifier=obj.modifiers.new('Retained sculpt smooth silhouette','SUBSURF');modifier.levels=1;modifier.render_levels=1
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        for poly in obj.data.polygons:poly.use_smooth=True
material=bpy.data.materials['V122o artist sculpted chestnut hair'];p=material.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=.51;p.inputs['Specular IOR Level'].default_value=.22
changes=['Narrower softer nasal tip and restrained lip volume across every native expression target','Subdivision of artist-sculpted curved hair topology keeps real head weights and a smoother silhouette']
if BUSINESS:
    for obj in root.children_recursive:
        if obj.type=='MESH' and obj.name.startswith('V122n folded visible collar'):obj.hide_render=True
    cotton=bpy.data.materials['V122n warm ivory cotton']
    for sign in [-1,1]:
        a=Vector((sign*.004,-.108,1.072));b=Vector((sign*.066,-.100,1.074));c=Vector((sign*.050,-.172,1.005));d=Vector((sign*.018,-.166,1.032))
        N=24;vs=[];fs=[];uv=[]
        for j in range(N+1):
            t=j/N
            for i in range(N+1):
                u=i/N;point=a.lerp(b,u).lerp(d.lerp(c,u),t);point.y-=.006*math.sin(u*math.pi)*math.sin(t*math.pi);vs.append(point);uv.append((u,t))
        for j in range(N):
            for i in range(N):k=j*(N+1)+i;fs.append((k,k+1,k+N+2,k+N+1))
        make('V122p raised folded cotton collar',vs,fs,cotton,'CT_Chest',uv)
    changes+=['Raised traditional collar leaves sit visibly above the continuous shirt bib and behind the tie knot']
export_candidate(root,rig,OUT,STEM,f'CT_{ROLE}_Explore_v122o','v122p',changes)
