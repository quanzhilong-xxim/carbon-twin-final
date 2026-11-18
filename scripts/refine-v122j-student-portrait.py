"""Local reference-based sculpt and cloth correction; never replaces a source."""
import bpy, hashlib, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
OUT=R/'public/models/characters-v12-candidate'
STEM='CT_Student_Explore_v122j'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve existing '+STEM)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122i.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122i'];root.name=STEM
objects=[root,*root.children_recursive]
face=bpy.data.objects['Face']

# Apply one continuous anatomical field to every expression, including the
# eyelids and iris geometry. Source identity and neutral rest state are kept.
def sculpt(p):
    x,y,z=p
    front=max(0,min(1,(-y+.01)/.055))
    jaw=math.exp(-((z-1.384)/.041)**2)*front
    p.x=x*(1+.095*jaw)
    p.z=z+.0065*math.exp(-((z-1.356)/.020)**2)*front
    p.y=y-.0018*math.exp(-((abs(x)-.057)/.028)**2-((z-1.409)/.022)**2)*front
    # Slightly larger eye aperture, with a smooth falloff across its socket.
    for sign in [-1,1]:
        cx=sign*.043;cz=1.444
        w=math.exp(-((x-cx)/.035)**4-((z-cz)/.027)**4)*front
        p.x+=(x-cx)*.045*w
        p.z+=(z-cz)*.075*w
    return p
for key in face.data.shape_keys.key_blocks:
    for v in key.data:v.co=sculpt(v.co.copy())
for v,k in zip(face.data.vertices,face.data.shape_keys.key_blocks[0].data):v.co=k.co

# Preserve the licensed painted skin and rasterize a restrained anatomical
# cheek tint into the actual UV atlas, instead of adding floating cheek discs.
slot=next(i for i,m in enumerate(face.data.materials) if m.name=='Face_00_SKIN')
old=face.data.materials[slot]
source=next(n.image for n in old.node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
w,h=source.size;pixels=np.array(source.pixels[:],np.float32).reshape(h,w,4).copy()
weights=np.zeros((h,w),np.float32);uv=face.data.uv_layers.active
coords=np.array([v.co[:] for v in face.data.vertices])
brush=np.exp(-((np.abs(coords[:,0])-.058)/.025)**2-((coords[:,2]-1.411)/.016)**2)*np.clip((-coords[:,1]-.025)/.030,0,1)
face.data.calc_loop_triangles()
for tri in face.data.loop_triangles:
    if face.data.polygons[tri.polygon_index].material_index!=slot:continue
    ws=brush[list(tri.vertices)]
    if ws.max()<.01:continue
    points=np.array([uv.data[i].uv[:] for i in tri.loops])%1
    if np.ptp(points[:,0])>.5 or np.ptp(points[:,1])>.5:continue
    pts=points*np.array([w-1,h-1]);xmin,ymin=np.floor(pts.min(0)).astype(int);xmax,ymax=np.ceil(pts.max(0)).astype(int)
    if xmin<0 or ymin<0 or xmax>=w or ymax>=h:continue
    yy,xx=np.mgrid[ymin:ymax+1,xmin:xmax+1];a,b,c=pts
    den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
    if abs(den)<1e-8:continue
    q=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
    s=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;t=1-q-s
    mask=(q>=-.001)&(s>=-.001)&(t>=-.001)
    region=weights[ymin:ymax+1,xmin:xmax+1]
    np.maximum(region,(q*ws[0]+s*ws[1]+t*ws[2])*mask,out=region)
pixels[:,:,1]*=1-.085*weights;pixels[:,:,2]*=1-.055*weights
image=bpy.data.images.new('V122j original skin with anatomy cheek tint',width=w,height=h,alpha=True)
image.pixels.foreach_set(pixels.ravel());image.pack()
skin=bpy.data.materials.new('V122j student painted physical skin');skin.use_nodes=True
p=skin.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=.58;p.inputs['Specular IOR Level'].default_value=.23
texture=skin.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image;skin.node_tree.links.new(texture.outputs['Color'],p.inputs['Base Color'])
face.data.materials[slot]=skin

# Polygon order can change during normal repair. Assign cuffs by the retained
# longitudinal vertex ring, never the incidental polygon index. This removes
# the dark triangular cuff patches which incorrectly reached the shoulder.
for side in ['L','R']:
    sleeve=bpy.data.objects['V122b continuous bomber sleeve '+side]
    assert len(sleeve.data.vertices)==81*48
    for poly in sleeve.data.polygons:
        row=sum(i//48 for i in poly.vertices)/len(poly.vertices)
        poly.material_index=1 if row>=73 else 0
    for poly in sleeve.data.polygons:poly.use_smooth=True

# Exportable woven albedo with restrained fibre-scale variation. Retire the
# accumulated coarse normal maps responsible for the plastic, streaked cloth.
cloth=bpy.data.materials['Original plum woven jacket.001']
p=cloth.node_tree.nodes['Principled BSDF']
for socket in ['Base Color','Normal','Roughness']:
    for link in list(p.inputs[socket].links):cloth.node_tree.links.remove(link)
p.inputs['Base Color'].default_value=(.43,.275,.56,1)
p.inputs['Roughness'].default_value=.81;p.inputs['Specular IOR Level'].default_value=.19
n=512;yy,xx=np.mgrid[:n,:n]
variation=.985+.008*np.sin(xx*2.31)+.007*np.sin(yy*2.69)+.004*np.sin((xx+yy)*1.59)
rgba=np.ones((n,n,4),np.float32);rgba[:,:,:3]=np.array([.43,.275,.56])[None,None,:]*variation[:,:,None]
tex=bpy.data.images.new('V122j lavender fine canvas albedo',width=n,height=n,alpha=True);tex.pixels.foreach_set(rgba.ravel());tex.pack()
node=cloth.node_tree.nodes.new('ShaderNodeTexImage');node.image=tex;cloth.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])

# Relax the over-regular braid silhouette without changing any hair weights.
for obj in objects:
    if obj.type!='MESH' or obj.hide_render:continue
    if obj.name.startswith(('V122b interlaced rose plait','V122c soft plait underbody')):
        for v in obj.data.vertices:
            t=max(0,min(1,(1.515-v.co.z)/.414));sign=1 if v.co.x>0 else -1
            v.co.x+=sign*.0055*math.sin(t*math.pi*1.1)
            v.co.y+=.008*math.sin(t*math.pi*.85)
    if obj.name=='Hair':
        for v in obj.data.vertices:
            p=v.co;zone=max(0,min(1,(1.447-p.z)/.05))*max(0,min(1,(abs(p.x)-.079)/.023))*max(0,min(1,-p.y/.035))
            p.x+=(1 if p.x>0 else -1)*.005*zone*zone
            p.z+=.007*zone*zone

changes=['Softer shortened chin and fuller lower cheeks across all expression targets','Slightly larger continuous eye aperture with matching iris and eyelid geometry','Original UV-painted skin with restrained cheek tint and physical light response','Cuff assignment repaired using real longitudinal rings; no shoulder cuff patches','Fine lavender canvas replaces coarse accumulated normal maps','Relaxed braid silhouette and gently swept side-hair ends']
def neutral():
    for obj in objects:
        if obj.type=='MESH' and obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:key.value=0
neutral();root['v122j_changes']=json.dumps(changes)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')))
keep={'Basis','Fcl_EYE_Close','Fcl_MTH_Joy','Fcl_BRW_Joy','Fcl_EYE_Joy','Fcl_BRW_Fun','Fcl_EYE_Surprised'}
for obj in objects:
    if obj.type=='MESH' and obj.data.shape_keys:
        for key in list(obj.data.shape_keys.key_blocks)[::-1]:
            if key.name.rsplit('.',1)[-1] not in keep:obj.shape_key_remove(key)
for obj in bpy.context.scene.objects:
    if obj.name in bpy.context.view_layer.objects:obj.select_set(obj in objects and not obj.hide_render)
exports=[]
for tier in ['','-portrait','-lite']:
    neutral()
    if tier=='-lite':
        for obj in objects:
            if obj.type!='MESH' or obj.hide_render or obj.data.shape_keys or 'anatomical hand' in obj.name or obj.name=='Body' or len(obj.data.polygons)<800:continue
            bpy.context.view_layer.objects.active=obj
            modifier=obj.modifiers.new('Mobile silhouette budget','DECIMATE');modifier.ratio=.55;bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.context.view_layer.objects.active=root
    path=OUT/(STEM+tier+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=False,export_animations=False,export_morph=True,export_skins=True,export_def_bones=True,export_image_format='WEBP',export_image_quality=74 if tier=='-lite' else 86,export_image_webp_fallback=False)
    exports.append({'file':path.name,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
record=json.loads((OUT/'CT_Student_Explore_v122i.sources.json').read_text(encoding='utf8'))
record.update(revision='v122j',version='v122j',status='CANDIDATE_NOT_ACCEPTED',editable_source=STEM+'.blend',parent_revision='v122i',refinements=record.get('refinements',[])+changes,exports=exports,paid_calls=0)
(OUT/(STEM+'.sources.json')).write_text(json.dumps(record,indent=2),encoding='utf8')
print('V122J_EXPORTED',flush=True)
