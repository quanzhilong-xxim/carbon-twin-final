"""Repair a candidate-only finding: interior mouth must follow facial sculpt.
Also preserve encoded sRGB pixels in byte color images and ground the board.
The V10 source files and running stable preview remain unchanged.
"""
import bpy,math,json,numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';report={}
def sculpt(p,who):
 p=p.copy();eye=1.47 if who=='Student' else 1.55 if who=='Business' else 1.59;mouth=eye-(.104 if who!='Business' else .095);nose=eye-.064;front=max(0,min(1,(-p.y-.055)/.045))
 n=math.exp(-(p.x/.043)**4-((p.z-nose)/.031)**4)*front;p.x*=1-n*.15;p.y+=n*(.011 if who=='Business' else .014)
 lip=math.exp(-(p.x/.052)**4-((p.z-mouth)/.029)**4)*front;p.x*=1-lip*(.16 if who=='Business' else .12);p.z=mouth+(p.z-mouth)*(1-lip*.24);p.y+=lip*.003
 p.z+=.0038*math.exp(-((abs(p.x)-.032)/.015)**2-((p.z-mouth)/.020)**2)*front
 jaw=math.exp(-((p.z-(eye-.157))/.054)**2);p.x*=1-jaw*(.09 if who=='Business' else .075)
 cheek=math.exp(-((abs(p.x)-.068)/.035)**2-((p.z-(eye-.055))/.046)**2)*front;p.y-=cheek*.002;return p
for who in ['Student','Business','City']:
 file=OUT/f'CT_{who}_Explore_v104.blend';bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False);root=bpy.data.objects[f'CT_{who}_Explore_v104']
 if root.get('v104_mouth_contact_repaired'):raise RuntimeError('Already repaired')
 interior=[o for o in root.children_recursive if o.type=='MESH' and not o.hide_render and any(s in o.name for s in ['_gums_','_teeth_','_tongue'])]
 for o in interior:
  inv=o.matrix_world.inverted();sets=[k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
  for values in sets:
   for v in values:v.co=inv@sculpt(o.matrix_world@v.co,who)
  if o.data.shape_keys:
   for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks['Basis'].data):v.co=k.co
 colors=[]
 for mat in {m for o in root.children_recursive if o.type=='MESH' and not o.hide_render for m in o.data.materials if m}:
  if not mat.use_nodes:continue
  for nd in mat.node_tree.nodes:
   if nd.type!='TEX_IMAGE' or not nd.image or not nd.image.is_float or nd.image.colorspace_settings.name!='sRGB':continue
   old=nd.image;im=bpy.data.images.get(old.name+' byte sRGB')
   if not im:
    im=bpy.data.images.new(old.name+' byte sRGB',width=old.size[0],height=old.size[1],alpha=True,float_buffer=False);im.pixels.foreach_set(old.pixels[:]);im.filepath_raw=str(OUT/(im.name.replace(' ','_')+'.png'));im.file_format='PNG';im.save();im.pack()
   nd.image=im;colors.append(im.name)
 if who=='Student':
  board=bpy.data.objects['V104 complete skateboard'];bpy.context.view_layer.update();points=[o.matrix_world@v.co for o in board.children_recursive if o.type=='MESH' for v in o.data.vertices];lowest=min(p.z for p in points);board.location.z-=lowest
 root['v104_mouth_contact_repaired']=True;bpy.ops.wm.save_as_mainfile(filepath=str(file));report[who]={'interior_mouth_meshes':[o.name for o in interior],'byte_srgb_images':colors,'board_grounded':who=='Student'};print('V104_CONTACT_REPAIRED',who,flush=True)
(ROOT/'docs/recovery/v10.4/mouth-contact-repair.json').write_text(json.dumps(report,indent=2))
