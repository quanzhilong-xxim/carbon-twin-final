"""Continue Q: smooth retained weighted hands and rebuild fitted sleeve caps.
No source is replaced. All facial expressions, props and humanoid bones survive.
"""
import bpy,bmesh,math,sys
import numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';STEM='CT_Student_Explore_v122s'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve S')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'CT_Student_Explore_v122q.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Student_Explore_v122q'];rig=root
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()

# Apply subdivision before the armature: original finger groups interpolate,
# keeping the actual finger topology instead of adding rigid proxy digits.
body=bpy.data.objects['Body'];assert not body.data.shape_keys
sub=body.modifiers.new('S hand and wrist surface continuity','SUBSURF');sub.levels=1;sub.render_levels=1
bpy.context.view_layer.objects.active=body
bpy.ops.object.modifier_move_up(modifier=sub.name)
bpy.ops.object.modifier_apply(modifier=sub.name)
for face in body.data.polygons:face.use_smooth=True

cloth=mat('V122s lilac recycled twill',(.37,.24,.48),.76,.25)
N=256;y,x=np.mgrid[:N,:N];noise=np.random.default_rng(86).normal(0,.006,(N,N))
weave=.975+.013*np.cos(x*math.tau/4)+.010*np.cos(y*math.tau/4)+noise
rgba=np.ones((N,N,4),np.float32);rgba[:,:,:3]=np.array([.37,.24,.48])[None,None,:]*weave[:,:,None]
image=bpy.data.images.new('S lilac twill colour',width=N,height=N,alpha=True);image.pixels.foreach_set(rgba.ravel());image.pack()
tex=cloth.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
principled=next(n for n in cloth.node_tree.nodes if n.type=='BSDF_PRINCIPLED');cloth.node_tree.links.new(tex.outputs['Color'],principled.inputs['Base Color'])
normal=np.ones((N,N,4),np.float32);normal[:,:,0]=.5+.035*np.sin(x*math.tau/4);normal[:,:,1]=.5+.035*np.sin(y*math.tau/4);normal[:,:,2]=1
im=bpy.data.images.new('S twill fine normal',width=N,height=N,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(normal.ravel());im.pack()
nt=cloth.node_tree.nodes.new('ShaderNodeTexImage');nt.image=im;nm=cloth.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.28
cloth.node_tree.links.new(nt.outputs['Color'],nm.inputs['Color']);cloth.node_tree.links.new(nm.outputs['Normal'],principled.inputs['Normal'])
old=bpy.data.materials['Original plum woven jacket.001']
for obj in root.children_recursive:
 if obj.type=='MESH':
  for index,m in enumerate(obj.data.materials):
   if m==old:obj.data.materials[index]=cloth

cuff=bpy.data.materials['V122b soft plum rib knit'];chest='J_Bip_C_UpperChest'
for side,sign in [('L',1),('R',-1)]:
 old=bpy.data.objects['V122b continuous bomber sleeve '+side];old.hide_render=True
 a=rig.data.bones[f'J_Bip_{side}_UpperArm'].head_local.copy();b=rig.data.bones[f'J_Bip_{side}_LowerArm'].head_local.copy();c=rig.data.bones[f'J_Bip_{side}_Hand'].head_local.copy()
 cap=a+Vector((sign*.037,0,-.015));start=cap+Vector((-sign*.014,0,.007));finish=c+(c-b).normalized()*.010
 vs=[];faces=[];uv=[];N=48;M=96
 for j in range(M+1):
  t=j/M
  if t<.16:
   u=t/.16;center=start.lerp(cap,u);radius=.026+.035*math.sin(u*math.pi/2)
  elif t<.58:
   u=(t-.16)/.42;center=cap.lerp(b,u);radius=.061-.006*u
  else:
   u=(t-.58)/.42;center=b.lerp(finish,u);radius=.055-.025*u
  tangent=(b-cap if t<.58 else finish-b).normalized();front=Vector((0,-1,0));lateral=tangent.cross(front).normalized()
  cuff_zone=t>.91
  if cuff_zone:radius=.030+.0004*math.sin(t*math.pi*40)
  fold=(.0016*math.sin(t*math.pi*19)+.0008*math.sin(t*math.pi*29))*math.exp(-((t-.64)/.19)**2)
  for k in range(N):
   ang=k/N*math.tau;r=radius+fold*(.5+.5*math.sin(ang)**2)+(.0004*math.cos(ang*24)if cuff_zone else 0)
   vs.append(center+(front*math.cos(ang)+lateral*math.sin(ang))*r);uv.append((k/N*1.5,t*4))
 for j in range(M):
  for k in range(N):p=j*N+k;q=j*N+(k+1)%N;faces.append((p,q,q+N,p+N))
 faces.append(tuple(reversed(range(N))))
 o=make('V122s inset raglan bomber sleeve '+side,vs,faces,cloth,None,uv);o.data.materials.append(cuff)
 for f in o.data.polygons:f.material_index=1 if f.index//N>=87 else 0
 groups={name:o.vertex_groups.new(name=name)for name in [chest,f'J_Bip_{side}_UpperArm',f'J_Bip_{side}_LowerArm']}
 for v in o.data.vertices:
  t=(v.index//N)/M;fore=max(0,min(1,(t-.45)/.24));fore=fore*fore*(3-2*fore)
  chest_weight=.82*max(0,1-t/.32)**2
  weights=[chest_weight,(1-fore)*(1-chest_weight),fore*(1-chest_weight)]
  for g,w in zip(groups.values(),weights):
   if w:g.add([v.index],w,'REPLACE')
 skin=o.modifiers.new('Actual chest elbow sleeve skin','ARMATURE');skin.object=rig
export_candidate(root,rig,OUT,STEM,'CT_Student_Explore_v122q','v122s',[
 'Subdivide original hand and wrist topology before skinning, retaining all finger weights',
 'Rebuild inset raglan sleeve caps outside the neckline; blend chest/upper-arm/forearm weights',
 'Export independent lilac twill colour and fine normal maps with the real garment UVs'
],student=True)
