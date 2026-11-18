"""Small, original surface corrections to the retained V10 masters.
No remote calls; prior masters are protected by the outside-project checkpoint.
"""
import bpy, math, json, numpy as np
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/characters-v10'
report={}

def image(name,px,color=False):
 h,w=px.shape[:2]
 im=bpy.data.images.new(name,width=w,height=h,alpha=True,float_buffer=True)
 if not color:im.colorspace_settings.name='Non-Color'
 im.pixels.foreach_set(np.asarray(px,dtype=np.float32).ravel())
 im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();im.pack()
 return im

def texture(mat,im,socket,strength=None):
 p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 for link in list(p.inputs[socket].links):mat.node_tree.links.remove(link)
 t=mat.node_tree.nodes.new('ShaderNodeTexImage');t.image=im
 if strength is None:mat.node_tree.links.new(t.outputs['Color'],p.inputs[socket])
 else:
  n=mat.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=strength
  mat.node_tree.links.new(t.outputs['Color'],n.inputs['Color']);mat.node_tree.links.new(n.outputs['Normal'],p.inputs[socket])

def lock_curve(name,points,radius,mat,parent):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=4;c.bevel_depth=radius;c.bevel_resolution=2
 s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for i,(v,p) in enumerate(zip(s.bezier_points,points)):
  v.co=p;v.handle_left_type='AUTO';v.handle_right_type='AUTO';v.radius=.2+.8*math.sin(math.pi*(i+.5)/len(points))
 o=bpy.data.objects.new(name,c);bpy.context.scene.collection.objects.link(o);c.materials.append(mat)
 bpy.context.view_layer.update();matrix=o.matrix_world.copy();o.parent=parent;o.matrix_world=matrix
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
 return o

for who in ['Student','Business','City']:
 stem=f'CT_{who}_Explore_v10'
 bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')),load_ui=False,use_scripts=False)
 root=bpy.data.objects[stem]
 if root.get('v10_portable_fabric_finish'):raise RuntimeError('Surface finish already applied: '+who)
 members=[root,*root.children_recursive]
 repaired=[]
 for o in members:
  if o.type!='MESH' or o.hide_render:continue
  if o.data.shape_keys:
   for key in o.data.shape_keys.key_blocks:key.value=0
  if not o.data.uv_layers:
   uv=o.data.uv_layers.new(name='UVMap')
   for loop in o.data.loops:
    p=o.data.vertices[loop.vertex_index].co
    uv.data[loop.index].uv=(math.atan2(p.y,p.x)/math.tau+.5,p.z*3)
   repaired.append(o.name)

 n=512;yy,xx=np.mgrid[:n,:n];u=xx/n;v=yy/n
 # Seamless original twill: broad yarn shading plus fine fibres, without
 # painted folds or high-contrast screen-space noise.
 warp=np.sin(u*math.tau*32);weft=np.sin(v*math.tau*32)
 twill=np.sin((u+v)*math.tau*16)
 weave=.43*warp+.33*weft+.24*twill
 dx=.43*np.cos(u*math.tau*32)+.12*np.cos((u+v)*math.tau*16)
 dy=.33*np.cos(v*math.tau*32)+.12*np.cos((u+v)*math.tau*16)
 normal=np.ones((n,n,4));normal[:,:,0]=.5-dx*.09;normal[:,:,1]=.5-dy*.09;normal[:,:,2]=np.sqrt(np.maximum(0,1-(normal[:,:,0]*2-1)**2-(normal[:,:,1]*2-1)**2))*.5+.5
 normalmap=image('CT_'+who+'_Twill_Normal_v10',normal)
 rough=np.ones((n,n,4));rough[:,:,:3]=(.73+weave*.055)[:,:,None]
 roughmap=image('CT_'+who+'_Twill_Roughness_v10',rough)
 edited=[]
 active_materials={m for o in members if o.type=='MESH' and not o.hide_render for m in o.data.materials if m}
 for mat in active_materials:
  if not mat.use_nodes:continue
  p=next((nd for nd in mat.node_tree.nodes if nd.type=='BSDF_PRINCIPLED'),None)
  if not p:continue
  name=mat.name.lower()
  if any(k in name for k in ['wool','woven jacket','recycled cotton','cotton poplin','canvas']):
   # Preserve the existing suit pinstripe atlas; add subtle yarn variation
   # to previously flat-colour garments only.
   if not p.inputs['Base Color'].is_linked:
    base=np.array(p.inputs['Base Color'].default_value[:3])
    color=np.ones((n,n,4));color[:,:,:3]=base[None,None,:]*(1+weave[:,:,None]*.035)
    texture(mat,image('CT_'+who+'_'+mat.name.replace(' ','_')+'_Twill_v10',color,True),'Base Color')
   texture(mat,normalmap,'Normal',.32);texture(mat,roughmap,'Roughness')
   p.inputs['Sheen Weight'].default_value=.06;p.inputs['Sheen Tint'].default_value=(.025,.027,.022,1)
   edited.append(mat.name)
  if 'mapped eyes' in name:
   p.inputs['Roughness'].default_value=.18;p.inputs['Specular IOR Level'].default_value=.42

 if who=='City':
  # Relax the broad cape and long coat with millimetre-scale radial drape;
  # preserve cuffs, articulated sleeves, original pivots and garment edges.
  for name in ['V10 layered civic shoulder cape','V10 open long ivory coat']:
   o=bpy.data.objects.get(name)
   if not o:continue
   inv=o.matrix_world.inverted()
   for vert in o.data.vertices:
    p=o.matrix_world@vert.co;a=math.atan2(p.y,p.x)
    envelope=max(0,min(1,(1.40-p.z)/.12))*max(0,min(1,(p.z-.50)/.10))
    p.y+=.0028*math.sin(a*9+p.z*5)*envelope
    vert.co=inv@p
  bun=bpy.data.objects['Low chestnut bun'];head=bpy.data.objects['Head']
  lo=Vector(tuple(min(v.co[k] for v in bun.data.vertices) for k in range(3)))
  hi=Vector(tuple(max(v.co[k] for v in bun.data.vertices) for k in range(3)))
  center=(lo+hi)*.5;r=(hi-lo)*.5
  hair=bpy.data.materials['Chestnut individual hair locks']
  bpy.ops.object.select_all(action='DESELECT')
  for j in range(15):
   theta=-1.45+j/14*2.9;points=[]
   for k in range(17):
    t=-1.35+k/16*2.7;a=theta+.30*math.sin(t)
    q=center+Vector((r.x*math.cos(t)*math.sin(a)*1.025,r.y*math.cos(t)*math.cos(a)*1.025,r.z*math.sin(t)*1.025))
    points.append(bun.matrix_world@q)
   lock_curve('V10 combed bun strand',points,.0016,hair,head)
 root['v10_portable_fabric_finish']=True
 bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 report[who]={'textured_materials':edited,'missing_uvs_repaired':repaired,'neutral_expression':True,'paid_calls':0}
 print('FABRIC_SURFACE_FINISHED',who,flush=True)
(ROOT/'outputs/v10-explore/characters-v10/portable-fabric-finish.json').write_text(json.dumps(report,indent=2))
