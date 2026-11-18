"""Two bounded corrections from nine-view inspection, no geometry regeneration.
An open, continuous civic coat replaces the cut closed torso; the retained
Snow UV eye receives a smaller hazel iris without touching eye geometry.
"""
import bpy,math,json,numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';report={}
def parent(o,p):
 bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=p;o.matrix_world=w
def mesh(name,points,faces,mat,p):
 data=bpy.data.meshes.new(name);data.from_pydata(points,[],faces);data.materials.append(mat);uv=data.uv_layers.new()
 for f in data.polygons:
  f.use_smooth=True
  for li in f.loop_indices:
   v=data.vertices[data.loops[li].vertex_index].co;uv.data[li].uv=(math.atan2(v.y,v.x)/math.tau+.5,v.z*3)
 o=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(o);parent(o,p);return o
for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v10';bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')),load_ui=False,use_scripts=False);root=bpy.data.objects[stem]
 if root.get('coat_iris_inspected_fit'):raise RuntimeError('Already applied')
 if who=='City':
  body=bpy.data.objects['Breath'];bpy.data.objects['Fitted tailored jacket'].hide_render=True
  old=bpy.data.objects['V10 fitted high-neck underlayer'];old.hide_render=True
  N=64;rings=[(.975,.13,.10),(1.10,.135,.105),(1.28,.13,.11),(1.36,.07,.052),(1.41,.053,.045),(1.44,.053,.045)]
  points=[(rx*math.cos(k/N*math.tau),ry*math.sin(k/N*math.tau)-.022,z) for z,rx,ry in rings for k in range(N)]
  faces=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k) for j in range(len(rings)-1) for k in range(N)]
  mesh('V10 continuous dark inner dress',points,faces,bpy.data.materials['V10 forest charcoal silk'],body)
  rings=[(.995,.177,.122,.12),(1.10,.179,.124,.20),(1.22,.195,.13,.28),(1.34,.209,.13,.38),(1.40,.15,.09,.55)]
  points=[]
  for j,(z,rx,ry,opening) in enumerate(rings):
   for k in range(N):
    a=-math.pi/2+opening+k/(N-1)*(math.tau-2*opening);fold=1+.008*math.sin(a*14+j*.5)
    points.append((rx*math.cos(a)*fold,ry*math.sin(a)*fold,z))
  faces=[(j*N+k,j*N+k+1,(j+1)*N+k+1,(j+1)*N+k) for j in range(len(rings)-1) for k in range(N-1)]
  o=mesh('V10 open tailored coat torso',points,faces,bpy.data.materials['Ivory tailored wool'],body)
  sub=o.modifiers.new('Soft tailored seams','SUBSURF');sub.levels=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sub.name)
  sol=o.modifiers.new('Tailored cloth thickness','SOLIDIFY');sol.thickness=.006;bpy.ops.object.modifier_apply(modifier=sol.name)
  report[who]={'continuous_open_coat':True,'source_closed_torso_retained_hidden':True}
 else:
  eye=next(o for o in root.children_recursive if o.type=='MESH' and not o.hide_render and o.name.endswith('_eyes'))
  mat=eye.data.materials[0].copy();eye.data.materials[0]=mat
  for nd in mat.node_tree.nodes:
   if nd.type!='TEX_IMAGE' or not nd.image:continue
   im=nd.image.copy();im.name='CT Business refined hazel iris v10';w,h=im.size;px=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4);rgb=px[:,:,:3];high=rgb.max(axis=2);low=rgb.min(axis=2)
   mask=(high-low>.025)&(rgb[:,:,0]>rgb[:,:,2]*1.18)&(high<.5)&(rgb[:,:,1]>.025)
   ys,xs=np.where(mask)
   if len(xs)<100:raise RuntimeError('Source iris region not found')
   cx=float(np.median(xs)/w);cy=float(np.median(ys)/h);yy,xx=np.mgrid[:h,:w];dx=xx/w-cx;dy=yy/h-cy;r=np.sqrt(dx*dx+dy*dy);angle=np.arctan2(dy,dx)
   # Original UV atlas stays unchanged outside the existing painted iris.
   region=r<.122;iris=(r<.096)&(r>.031);pupil=r<=.031
   rgb[region]=[.83,.81,.74]
   fibres=.75+.15*np.sin(angle*133+np.sin(r*700)*.7)+.1*np.sin(angle*257+r*180)
   edge=np.clip((.096-r)/.012,0,1);inner=np.clip((r-.031)/.014,0,1);light=(.32+.68*edge*inner)*fibres
   for c,col in enumerate([.39,.25,.12]):rgb[:,:,c][iris]=light[iris]*col
   rgb[pupil]=[.006,.008,.006];px[:,:,3][region]=1;im.pixels.foreach_set(px.ravel());im.pack();nd.image=im
   report[who]={'iris_uv_center':[cx,cy],'iris_region_pixels':int(region.sum()),'eye_geometry_retained':True}
 root['coat_iris_inspected_fit']=True;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')));print('COAT_IRIS_UPDATED',who,flush=True)
(ROOT/'outputs/v10-explore/characters-v10/coat-iris-fit.json').write_text(json.dumps(report,indent=2))
