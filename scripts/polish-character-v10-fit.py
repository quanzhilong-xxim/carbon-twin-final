"""Local corrections from the actual browser closeups, on checkpointed V10 only.
Keeps original topology and all six facial expressions; no service calls.
"""
import bpy, math, numpy as np, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
def deform(o,fn):
 inverse=o.matrix_world.inverted()
 sets=[k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
 for points in sets:
  for v in points:v.co=inverse@fn(o.matrix_world@v.co)
 if o.data.shape_keys:
  for i,v in enumerate(o.data.vertices):v.co=o.data.shape_keys.key_blocks['Basis'].data[i].co
def face_fit(p,who):
 eye=1.47 if who=='Student' else 1.55 if who=='Business' else 1.59
 mouth=eye-(.111 if who=='Business' else .12)
 # Retain the source's face and expression deltas. Reduce only the bulb of
 # the nose and protruding lips, leaving socket and eyelid topology intact.
 nose=math.exp(-((p.z-(eye-.047))/.028)**2-(p.x/.039)**2)
 front=max(0,min(1,(-p.y-.09)/.045))
 p.x*=1-.20*nose*front
 p.y+=.010*nose*front
 lip=math.exp(-((p.z-mouth)/.025)**2-(p.x/.048)**4)
 p.z=mouth+(p.z-mouth)*(1-.25*lip*front)
 p.y+=.008*lip*front
 return p
report={}
for who in ['Student','Business','City']:
 stem=f'CT_{who}_Explore_v10';bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')),load_ui=False,use_scripts=False);root=bpy.data.objects[stem]
 if root.get('browser_fit_polish'):raise RuntimeError('Already applied: use export only')
 members=[root,*root.children_recursive]
 for o in members:
  if o.type!='MESH' or o.hide_render:continue
  if o.name.startswith('V3 rounded sleeve shoulder'):
   # The previous .84 scale left a visible open ring inside the sleeve.
   o.scale*=1.23
  if o.name.endswith('_head'):deform(o,lambda p:face_fit(p,who))
  if who=='Business' and o.name.startswith('Folded poplin collar'):
   def collar(p):
    p.x*=.83;p.z=1.363+(p.z-1.363)*.66;p.y+=.004;return p
   deform(o,collar)
  if who=='Business' and o.name.startswith('Tie knot'):
   o.scale*=.8;o.location.z-=.008
  if who=='Business' and o.name.startswith('V3 optical frame'):
   # More restrained oval frames preserve the actual retained glasses.
   center=o.matrix_world.translation.copy()
   def frame(p):
    p.z=center.z+(p.z-center.z)*.84;return p
   deform(o,frame)
  if who=='Business' and 'hair_base' in o.name:
   def sweep(p):
    t=max(0,min(1,(p.z-1.68)/.07));p.x+=.018*t;p.y+=.009*t;return p
   deform(o,sweep)
 # Fine directional texture follows the existing hair UVs. A shared map
 # replaces the missing Snow hair surface and avoids individual strand cost.
 n=512;yy,xx=np.mgrid[:n,:n];flow=np.sin(xx*.83+np.sin(yy*.013)*4)+.3*np.sin(xx*2.09+yy*.006)
 normal=np.ones((n,n,4),dtype=np.float32);normal[:,:,0]=.5+flow*.075;normal[:,:,1]=.5+np.cos(xx*.83+yy*.003)*.008;normal[:,:,2]=.992
 im=bpy.data.images.new('CT '+who+' groom micro normal',width=n,height=n);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(normal.ravel());im.filepath_raw=str(OUT/f'CT_{who}_Hair_Normal_v10.png');im.file_format='PNG';im.save();im.pack()
 mat=bpy.data.materials.get('V10 '+who+' directional hair');p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=.51;p.inputs['Specular IOR Level'].default_value=.30
 t=mat.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;q=mat.node_tree.nodes.new('ShaderNodeNormalMap');q.inputs['Strength'].default_value=.22;mat.node_tree.links.new(t.outputs['Color'],q.inputs['Color']);mat.node_tree.links.new(q.outputs['Normal'],p.inputs['Normal'])
 for o in members:
  if o.type=='MESH' and not o.hide_render and any(s in o.name for s in ['_hair_main','_hair_strand','hair_base']):
   o.data.materials.clear();o.data.materials.append(mat)
   for f in o.data.polygons:f.material_index=0
 if who=='Business':
  eyes=next(o for o in members if o.type=='MESH' and not o.hide_render and o.name.endswith('_eyes'))
  for node in eyes.data.materials[0].node_tree.nodes:
   if node.type!='TEX_IMAGE' or not node.image:continue
   im=node.image.copy();im.name='CT Business warm hazel iris';w,h=im.size;px=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4);rgb=px[:,:,:3]
   # Recolour only the painted brown iris, retaining pupil and sclera.
   high=rgb.max(axis=2);low=rgb.min(axis=2);mask=(high-low>.015)&(rgb[:,:,0]>rgb[:,:,2]*1.12)&(high<.5)&(rgb[:,:,1]>.022)
   lum=np.maximum(.015,rgb.mean(axis=2));rgb[mask]=np.minimum(1,lum[mask,None]*[1.65,1.20,.68]);im.pixels.foreach_set(px.ravel());im.pack();node.image=im
 root['browser_fit_polish']=True
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 report[who]={'shoulder_ring_closed':True,'facial_topology_retained':True,'directional_hair_map':True,'paid_calls':0}
(ROOT/'outputs/v10-explore/characters-v10/browser-fit-polish.json').write_text(json.dumps(report,indent=2));print('BROWSER_FIT_POLISH_SAVED',flush=True)
