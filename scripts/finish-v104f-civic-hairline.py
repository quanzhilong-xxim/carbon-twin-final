"""Scalp-attached tapered fringe, soft hairline and fine directional pigment.
Edits the F candidate only after preserving its prior version externally.
"""
import bpy,bmesh,math,json,shutil,hashlib,datetime,numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';file=OUT/'CT_City_Explore_v104f.blend'
backup=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild')/('V104F-HAIRLINE-PREEDIT-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir();shutil.copy2(file,backup/file.name)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();assert sha(file)==sha(backup/file.name)
(backup/'manifest.json').write_text(json.dumps({'source':str(file),'sha256':sha(file),'verified':True},indent=2))
bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False);root=bpy.data.objects['CT_City_Explore_v104f'];group=bpy.data.objects['Head'];head=next(o for o in root.children_recursive if o.type=='MESH' and o.name.endswith('_head'))
if root.get('f_hairline_finished'):raise RuntimeError('Already finished')
hull=bmesh.new()
for v in head.data.vertices:hull.verts.new(head.matrix_world@v.co)
bmesh.ops.convex_hull(hull,input=list(hull.verts),use_existing_faces=False);hull.verts.ensure_lookup_table();hull.verts.index_update();bvh=BVHTree.FromPolygons([v.co.copy() for v in hull.verts],[[v.index for v in f.verts] for f in hull.faces]);hull.free();center=Vector((0,0,1.637))
def surface(a,phi,pad=.008):
 d=Vector((math.sin(phi)*math.cos(a),math.sin(phi)*math.sin(a),math.cos(phi)));p,n,_,_=bvh.ray_cast(center+d*.45,-d,.8)
 if p is None:raise RuntimeError('Head surface missed')
 return p+n*pad,n
mat=bpy.data.materials['V104f civic chestnut low-bun groom'];q=mat.node_tree.nodes['Principled BSDF'];q.inputs['Roughness'].default_value=.60
size=512;y,x=np.mgrid[:size,:size];streak=.5+.5*np.sin(x/size*math.tau*83+.22*np.sin(y/size*math.tau*2));px=np.ones((size,size,4),dtype=np.float32);px[:,:,:3]=np.array([.245,.147,.108])[None,None,:]*(.86+.14*streak[:,:,None])
im=bpy.data.images.new('CT_City_FittedGroom_Color_v104f',width=size,height=size,alpha=True,float_buffer=False);im.pixels.foreach_set(px.ravel());im.filepath_raw=str(OUT/(im.name+'.png'));im.file_format='PNG';im.save();im.pack();tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;mat.node_tree.links.new(tex.outputs['Color'],q.inputs['Base Color'])
for band in range(15):
 vs=[];fs=[];uvs=[];R=54;S=10
 for j in range(R):
  t=j/(R-1);a=-.60-2.22*t;phi=.28+band*.031+(1.12+band*.006)*t;p,n=surface(a,phi)
  p2,_=surface(a-.003,phi+.002);side=(p2-p).normalized().cross(n).normalized();taper=max(.006,math.sin(math.pi*(.025+.97*t))**.65)
  p+=n*(.0015+.004*math.sin(math.pi*t))
  for k in range(S):
   ang=k/S*math.tau;vs.append(tuple(p+side*.011*taper*math.cos(ang)+n*.003*taper*math.sin(ang)));uvs.append((k/S,t))
 for j in range(R-1):
  for k in range(S):a=j*S+k;b=j*S+(k+1)%S;fs.append((a,b,b+S,a+S))
 fs.extend([tuple(reversed(range(S))),tuple((R-1)*S+k for k in range(S))]);d=bpy.data.meshes.new('V104f fitted tapered civic fringe');d.from_pydata(vs,[],fs);d.materials.append(mat)
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free();uv=d.uv_layers.new()
 for f in d.polygons:
  f.use_smooth=True
  for li in f.loop_indices:uv.data[li].uv=uvs[d.loops[li].vertex_index]
 o=bpy.data.objects.new(d.name,d);bpy.context.scene.collection.objects.link(o);bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=group;o.matrix_world=w
root['f_hairline_finished']=True;bpy.ops.wm.save_as_mainfile(filepath=str(file))
(ROOT/'docs/recovery/v10.4/civic-hairline-f.json').write_text(json.dumps({'preedit_backup':str(backup),'tapered_head_fitted_locks':15,'original_directional_texture':str(im.filepath_raw),'isotropic_portable_pbr':True,'paid_calls':0},indent=2))
