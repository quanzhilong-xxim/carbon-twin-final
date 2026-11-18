"""Continuous layered scalp surfaces measured from the original head mesh.
Directional fibre texture and shaped hairline replace the flat cap silhouette.
"""
import bpy,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))

def texture():
 n=512;y,x=np.mgrid[:n,:n];u=x/n;v=y/n
 streak=.9+.05*np.sin(u*math.tau*155+np.sin(v*5)*.3)+.025*np.sin(u*math.tau*401)
 rgb=streak[:,:,None]*np.array([.061,.026,.017])[None,None,:]
 rgba=np.concatenate((rgb,np.ones((n,n,1))),axis=2).astype(np.float32)
 im=bpy.data.images.new('V108f original directional chestnut fibres',width=n,height=n,alpha=True);im.pixels.foreach_set(rgba.ravel());im.pack()
 m=bpy.data.materials.new('V108f directional chestnut silk');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.57;p.inputs['Specular IOR Level'].default_value=.27
 t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 return m

for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v108f'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserving existing '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v108e.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v108e'];root.name=stem;head=bpy.data.objects['Head'];source=bpy.data.objects['Source / GEO-snow_head' if who=='Business' else 'Source / GEO-rain_head']
 ps=[source.matrix_world@v.co for v in source.data.vertices];tree=BVHTree.FromPolygons(ps,[tuple(p.vertices) for p in source.data.polygons],all_triangles=False)
 center=Vector((0,.005,1.24 if who=='Business' else 1.64));top=max(p.z for p in ps)
 for o in root.children_recursive:
  if o.type!='MESH':continue
  if o.name.startswith(('V104d fitted complete scalp','V104f civic fitted hair foundation','V108d swept tapered hair lock','V108d fine groom filament')):o.hide_render=True
 mat=texture();count=96;rows=24;verts=[];faces=[]
 def point(phi,t,offset=0):
  front=max(0,-math.sin(phi));side=abs(math.cos(phi));back=max(0,math.sin(phi))
  # An asymmetrical curved forehead line and softened temples, not a bowl cut.
  max_theta=1.58 + back*.52 - front*.50 + .08*math.sin(phi*2+.4)
  theta=.025+(max_theta-.025)*t
  d=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)))
  hit,normal,_,_=tree.ray_cast(center,d,1)
  if hit is None:hit=center+Vector((d.x*.125,d.y*.135,d.z*(top-center.z)))
  volume=.009+.007*math.sin(t*math.pi)+.006*math.sin(phi*3+t*2)**2*math.sin(t*math.pi)
  return hit+d*(volume+offset)
 for j in range(rows+1):
  t=j/rows
  for i in range(count+1):verts.append(point(i/count*math.tau,t))
 for j in range(rows):
  for i in range(count):k=j*(count+1)+i;faces.append((k,k+1,k+count+2,k+count+1))
 cap=mesh('V108f continuous sculpted side-part scalp',verts,faces,mat,head)
 uv=cap.data.uv_layers.new()
 for p in cap.data.polygons:
  for li in p.loop_indices:
   n=cap.data.loops[li].vertex_index;uv.data[li].uv=(n%(count+1)/count,n//(count+1)/rows)
 # Individual tapered ribbons rest on the head-derived cap with a soft ridge.
 for k in range(14):
  phi0=-math.pi*.96+k/13*math.pi*.93;vv=[];ff=[];nr=18;nc=6
  for j in range(nr+1):
   t=.12+j/nr*.87;sweep=.30*math.sin(t*math.pi)
   width=(.055+.018*math.sin(k))*math.sin(math.pi*(j+.7)/(nr+1))**.5
   for i in range(nc+1):
    q=i/nc*2-1;vv.append(point(phi0+sweep+q*width,t,.001+math.sin(i/nc*math.pi)*.004))
  for j in range(nr):
   for i in range(nc):n=j*(nc+1)+i;ff.append((n,n+1,n+nc+2,n+nc+1))
  ob=mesh('V108f swept fitted medium lock',vv,ff,mat,head);uv=ob.data.uv_layers.new()
  for p in ob.data.polygons:
   for li in p.loop_indices:
    n=ob.data.loops[li].vertex_index;uv.data[li].uv=((n%(nc+1)/nc+k)/14,n//(nc+1)/nr)
 root['v108f_hair']='Head-surface raycast scalp, asymmetrical forehead, 14 fitted tapered layers, original packed fibre texture; previous surfaces retained hidden'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 combine_static(root);export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Web distance LOD','DECIMATE');mod.ratio=.55;bpy.ops.object.modifier_apply(modifier=mod.name)
 export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_v108e.sources.json').read_text());record.update(version='v108f',parent_version='v108e',paid_calls=0,status='browser visual review pending');record['refinements']+=[root['v108f_hair']]
 record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in OUT.glob(stem+'*.glb')]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('LAYERED_HAIR_EXPORTED',who,flush=True)
