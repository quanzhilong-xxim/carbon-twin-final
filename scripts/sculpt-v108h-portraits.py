"""Non-destructive portrait geometry finish, preserving every expression delta.
The editable G masters remain untouched; no remote services or live Blender.
"""
import bpy,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))

for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v108h'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Existing source retained: '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v108g.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v108g'];root.name=stem
 head=bpy.data.objects['Source / GEO-snow_head' if who=='Business' else 'Source / GEO-rain_head']
 eye_z=1.2 if who=='Business' else 1.588
 def sculpt(p):
  p=p.copy()
  if p.y<-.065:
   # Soften nose volume and widen the pinched lower chin without flattening
   # eyelids, nostrils or lips. Apply to Basis and all facial expressions.
   nose=math.exp(-(p.x/.032)**4-((p.z-(eye_z-.058))/.041)**4)
   p.x*=1-.13*nose;p.y+=.009*nose
   jaw=math.exp(-((p.z-(eye_z-.178))/.043)**2)
   p.x*=1+.16*jaw;p.z+=.006*jaw
  return p
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render:continue
  if o==head:
   inv=o.matrix_world.inverted()
   if o.data.shape_keys:
    for key in o.data.shape_keys.key_blocks:
     for v in key.data:v.co=inv@sculpt(o.matrix_world@v.co)
    for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks[0].data):v.co=k.co
   else:
    for v in o.data.vertices:v.co=inv@sculpt(o.matrix_world@v.co)
  if who=='Business' and o.name.endswith(('_head','_eyes','_eyelashes')):
   inv=o.matrix_world.inverted();sets=[o.data.vertices]+([k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [])
   for values in sets:
    for v in values:
     p=o.matrix_world@v.co;cx=math.copysign(.050,p.x);w=math.exp(-((p.x-cx)/.043)**4-((p.z-eye_z)/.04)**4) if p.y<-.07 else 0
     p.z=eye_z+(p.z-eye_z)*(1-.13*w);v.co=inv@p
  if o.name.startswith(('V108f continuous sculpted','V108f swept fitted')):o.hide_render=True
 # Raycast a continuous side-part crown and overlapping fine-edged locks.
 ps=[head.matrix_world@v.co for v in head.data.vertices]
 tree=BVHTree.FromPolygons(ps,[tuple(p.vertices) for p in head.data.polygons])
 center=Vector((0,.005,1.24 if who=='Business' else 1.64));pivot=bpy.data.objects['Head']
 m=bpy.data.materials.new('V108h chestnut directional hair');m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.105,.046,.024,1);p.inputs['Roughness'].default_value=.51;p.inputs['Specular IOR Level'].default_value=.25
 n=256;y,x=np.mgrid[:n,:n];value=.5+.20*np.sin(x/n*math.tau*93+np.sin(y/n*5)*.5)
 # Tangent fibre normal rather than a painted band of highlights.
 dx=np.roll(value,1,axis=1)-np.roll(value,-1,axis=1)
 px=np.stack((.5+dx*.16,np.full_like(dx,.5),np.full_like(dx,1),np.full_like(dx,1)),axis=2).astype(np.float32)
 im=bpy.data.images.new('V108h original fine hair normal',width=n,height=n,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(px.ravel());im.pack()
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.24;m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],p.inputs['Normal'])
 def point(phi,t,lift=0):
  front=max(0,-math.sin(phi));back=max(0,math.sin(phi))
  theta=.025+(1.58+back*.50-front*.16+.055*math.sin(phi*2+.4)-.025)*t
  d=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)))
  hit,_,_,_=tree.ray_cast(center,d,1)
  if hit is None:hit=center+Vector((d.x*.125,d.y*.135,d.z*.115))
  return hit+d*(.009+.008*math.sin(t*math.pi)+lift)
 def surface(name,v,f,cols,rows):
  # Winding is outward for this spherical parameterization.
  ob=mesh(name,v,[tuple(reversed(q))for q in f],m,pivot);uv=ob.data.uv_layers.new()
  for poly in ob.data.polygons:
   for li in poly.loop_indices:
    i=ob.data.loops[li].vertex_index;uv.data[li].uv=(i%(cols+1)/cols,i//(cols+1)/rows)
  return ob
 cols=112;rows=28;v=[point(i/cols*math.tau,j/rows)for j in range(rows+1)for i in range(cols+1)];f=[]
 for j in range(rows):
  for i in range(cols):k=j*(cols+1)+i;f.append((k,k+1,k+cols+2,k+cols+1))
 surface('V108h continuous shaped hairline',v,f,cols,rows)
 for k in range(24):
  nr=24;nc=6;v=[];f=[];phi0=-math.pi*1.02+k/23*math.pi*1.07
  for j in range(nr+1):
   t=.06+j/nr*.94;sweep=.34*math.sin(t*math.pi);width=.07*math.sin(math.pi*(j+.45)/(nr+1))**.38
   for i in range(nc+1):v.append(point(phi0+sweep+(i/nc*2-1)*width,t,.0008+math.sin(i/nc*math.pi)*.0022))
  for j in range(nr):
   for i in range(nc):q=j*(nc+1)+i;f.append((q,q+1,q+nc+2,q+nc+1))
  surface('V108h overlapping swept hair ribbon',v,f,nc,nr)
 for mskin in [m for m in head.data.materials if m and m.use_nodes]:
  bs=mskin.node_tree.nodes.get('Principled BSDF')
  if bs:bs.inputs['Roughness'].default_value=.75;bs.inputs['Specular IOR Level'].default_value=.20
 root['v108h_sculpt']='Softer nose/chin, coordinated male eye aperture, lower asymmetrical forehead line, 24 fitted fine-edged hair layers and original tangent fibre map'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 combine_static(root);export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<400:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.55;bpy.ops.object.modifier_apply(modifier=mod.name)
 export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_v108g.sources.json').read_text());record.update(version='v108h',parent_version='v108g',paid_calls=0,status='browser visual inspection pending');record['refinements']+=[root['v108h_sculpt']]
 record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('PORTRAIT_SCULPT_EXPORTED',who,flush=True)
