"""Reference-led V10.4 geometry revision. Reads V10, writes separate V104 masters.
Rain/Snow topology and expressions remain CC BY 4.0, Blender Foundation.
Original groom meshes, tailoring, skateboard and textures: CarbonTwin.
No source master is overwritten; reruns refuse an existing V104 destination.
"""
import bpy,math,json,sys,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10';E=ROOT/'docs/recovery/v10.4'

def parent(o,p):
 bpy.context.view_layer.update();m=o.matrix_world.copy();o.parent=p;o.matrix_world=m
def pbr(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
def mesh(name,verts,faces,mat,p,uvs=None):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.materials.append(mat);o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o)
 uv=d.uv_layers.new(name='UVMap')
 for f in d.polygons:
  f.use_smooth=True
  for li in f.loop_indices:
   i=d.loops[li].vertex_index;v=d.vertices[i].co;uv.data[li].uv=uvs[i] if uvs else (v.x*8,v.z*8)
 parent(o,p);return o
def curve(name,points,r,mat,p,radii=None):
 d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.resolution_u=8;d.bevel_depth=r;d.bevel_resolution=2;s=d.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for i,(b,pt) in enumerate(zip(s.bezier_points,points)):b.co=pt;b.handle_left_type=b.handle_right_type='AUTO';b.radius=radii[i] if radii else 1
 o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);d.materials.append(mat);parent(o,p);return o
def cube(name,pos,size,mat,p,bevel=.003):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 b=o.modifiers.new('Soft manufactured edge','BEVEL');b.width=bevel;b.segments=3;o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL');parent(o,p);return o
def cyl(name,pos,r,depth,mat,p,axis='Y'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=depth,location=pos);o=bpy.context.object;o.name=name
 if axis=='Y':o.rotation_euler.x=math.pi/2
 if axis=='X':o.rotation_euler.y=math.pi/2
 o.data.materials.append(mat);b=o.modifiers.new('Rounded machined rim','BEVEL');b.width=.0015;b.segments=3
 for f in o.data.polygons:f.use_smooth=True
 parent(o,p);return o
def image(name,px,color=False):
 h,w=px.shape[:2];im=bpy.data.images.new(name,width=w,height=h,alpha=True,float_buffer=not color)
 if not color:im.colorspace_settings.name='Non-Color'
 im.pixels.foreach_set(np.asarray(px,dtype=np.float32).ravel());im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
def tex(mat,im,socket,strength=None):
 p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 for l in list(p.inputs[socket].links):mat.node_tree.links.remove(l)
 t=mat.node_tree.nodes.new('ShaderNodeTexImage');t.image=im
 if strength is None:mat.node_tree.links.new(t.outputs['Color'],p.inputs[socket])
 else:
  n=mat.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=strength;mat.node_tree.links.new(t.outputs['Color'],n.inputs['Color']);mat.node_tree.links.new(n.outputs['Normal'],p.inputs[socket])
def catmull(points,t):
 n=len(points)-1;x=min(t*n,n-1e-7);i=int(x);u=x-i;a,b,c,d=[Vector(points[max(0,min(n,j))]) for j in (i-1,i,i+1,i+2)]
 return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
def lock(name,points,width,depth,mat,p,phase=0):
 # Closed, tapered lenticular hair ribbon: broad silhouette, narrow edge,
 # three longitudinal ridges. Opaque PBR avoids mobile alpha sorting.
 verts=[];faces=[];uvs=[];R=34;N=12
 for j in range(R):
  t=j/(R-1);c=catmull(points,t);tangent=(catmull(points,min(1,t+.003))-catmull(points,max(0,t-.003))).normalized()
  normal=Vector((c.x*.65,-1,.18 if t<.4 else .03)).normalized();side=tangent.cross(normal).normalized();normal=side.cross(tangent).normalized()
  taper=max(.008,(.60+.50*math.sin(t*math.pi))*(1-t**3.6))
  for k in range(N):
   a=k/N*math.tau;ridge=1+.045*math.sin(a*3+t*5+phase)
   verts.append(tuple(c+side*(width*taper*math.cos(a))+normal*(depth*taper*math.sin(a)*ridge)))
   uvs.append((k/N,t))
 for j in range(R-1):
  for k in range(N):a=j*N+k;b=j*N+(k+1)%N;faces.append((a,b,b+N,a+N))
 faces += [tuple(reversed(range(N))),tuple((R-1)*N+k for k in range(N))]
 return mesh(name,verts,faces,mat,p,uvs)
def groom_material(who):
 base=np.array([.49,.155,.225] if who=='Student' else [.060,.025,.014] if who=='Business' else [.075,.032,.018]);n=512;yy,xx=np.mgrid[:n,:n];u=xx/n;v=yy/n
 fibres=.6*np.sin(u*math.tau*91+.30*np.sin(v*math.tau*2))+.24*np.sin(u*math.tau*211+v*3)+.16*np.sin(u*math.tau*43)
 color=np.ones((n,n,4));color[:,:,:3]=base[None,None,:]*(1+fibres[:,:,None]*.12)*( .90+.10*np.sin(v*math.pi))[...,None]
 norm=np.ones((n,n,4));norm[:,:,0]=.5+fibres*.08;norm[:,:,1]=.5+.006*np.sin(v*math.tau*2);norm[:,:,2]=.99
 m=pbr('V104 '+who+' layered silk-fibre hair',base,.43);p=next(nd for nd in m.node_tree.nodes if nd.type=='BSDF_PRINCIPLED');p.inputs['Specular IOR Level'].default_value=.34;p.inputs['Anisotropic'].default_value=.25
 tex(m,image('CT_'+who+'_Groom_Color_v104',color,True),'Base Color');tex(m,image('CT_'+who+'_Groom_Normal_v104',norm),'Normal',.28);return m
def face_sculpt(o,who):
 eye=1.47 if who=='Student' else 1.55 if who=='Business' else 1.59;mouth=eye-(.104 if who!='Business' else .095);nose=eye-.064
 inv=o.matrix_world.inverted()
 def sculpt(p):
  p=p.copy();front=max(0,min(1,(-p.y-.055)/.045))
  n=math.exp(-(p.x/.043)**4-((p.z-nose)/.031)**4)*front
  # Reduce the bulbous nose and its width, keeping the bridge continuous.
  p.x*=1-n*.15;p.y+=n*(.011 if who=='Business' else .014)
  lip=math.exp(-(p.x/.052)**4-((p.z-mouth)/.029)**4)*front
  p.x*=1-lip*(.16 if who=='Business' else .12);p.z=mouth+(p.z-mouth)*(1-lip*.24);p.y+=lip*.003
  # Lift mouth corners into the neutral expression, retain smile deltas.
  p.z+=.0038*math.exp(-((abs(p.x)-.032)/.015)**2-((p.z-mouth)/.020)**2)*front
  jaw=math.exp(-((p.z-(eye-.157))/.054)**2);p.x*=1-jaw*(.09 if who=='Business' else .075)
  cheek=math.exp(-((abs(p.x)-.068)/.035)**2-((p.z-(eye-.055))/.046)**2)*front;p.y-=cheek*.002
  return p
 sets=[k.data for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [o.data.vertices]
 for values in sets:
  for v in values:v.co=inv@sculpt(o.matrix_world@v.co)
 if o.data.shape_keys:
  for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks['Basis'].data):v.co=k.co
 # Paint natural restrained cheek/lip variation in the original UV space.
 mat=o.data.materials[0].copy();o.data.materials[0]=mat;p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Roughness'].default_value=.57;p.inputs['Specular IOR Level'].default_value=.25
 color_node=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and any(l.to_socket.name=='Base Color' for l in n.outputs['Color'].links));src=color_node.image;w,h=src.size;px=np.array(src.pixels[:],dtype=np.float32).reshape(h,w,4);overlay=np.zeros((h,w,4),dtype=np.float32);uv=o.data.uv_layers.active.data
 for f in o.data.polygons:
  for li in f.loop_indices:
   v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;u=uv[li].uv
   if v.y>-.06:continue
   cheek=math.exp(-((abs(v.x)-.068)/.035)**2-((v.z-(eye-.055))/.025)**2)*.075
   lip=math.exp(-(v.x/.037)**6-((v.z-mouth)/.012)**4)*.10
   x=int(u.x*w)%w;y=int(u.y*h)%h
   for dy in range(-4,5):
    for dx in range(-4,5):
     if 0<=x+dx<w and 0<=y+dy<h:overlay[y+dy,x+dx,:]=max(overlay[y+dy,x+dx,0],cheek+lip)
 amt=overlay[:,:,0];px[:,:,:3]=px[:,:,:3]*(1-amt[:,:,None])+np.array([.68,.25,.22])*amt[:,:,None]
 color_node.image=image('CT_'+who+'_Complexion_v104',px,True)

def new_groom(root,who):
 head=bpy.data.objects['Head'];mat=groom_material(who)
 # Archive coarse foreground locks inside the NEW master only.
 for o in root.children_recursive:
  if o.type!='MESH':continue
  if any(s in o.name for s in ['_hair_main','_hair_strand','hair_base','V10 fine hair silhouettes','V10 swept explorer fringe','V10 swept civic part','V10 civic cheek tendril','Fine hair highlight']):o.hide_render=True
  if o.name.startswith('Rose layered lock'):
   o.data.materials.clear();o.data.materials.append(mat)
 # Back/scalp follows an ellipsoid and remains under the outer layered locks.
 cx=0;cz=1.52 if who=='Student' else 1.642 if who=='Business' else 1.647;rx=.123 if who!='City' else .134;ry=.108 if who!='City' else .116;rz=.131
 verts=[];faces=[];uvs=[];N=64;R=16
 for j in range(R):
  t=j/(R-1)
  for k in range(N):
   a=k/N*math.tau;end=1.55+(.30 if math.sin(a)>-.25 else -.20);phi=.05+t*end
   verts.append((rx*math.sin(phi)*math.cos(a),.004+ry*math.sin(phi)*math.sin(a),cz+rz*math.cos(phi)));uvs.append((k/N,t))
 for j in range(R-1):
  for k in range(N):a=j*N+k;b=j*N+(k+1)%N;faces.append((a,b,b+N,a+N))
 mesh('V104 fitted scalp foundation',verts,faces,mat,head,uvs)
 locks=[]
 if who=='Student':
  # Flowing asymmetric fringe spans the large bare forehead without hiding eyes.
  for i in range(9):
   x=-.095+i*.023
   points=[(x*.35-.020,-.082,1.645),(x*.8,-.121,1.594),(x+.011,-.143,1.555),(x+.030,-.148,1.513+.013*math.sin(i*.85))]
   locks.append((points,.018+.002*math.sin(i),.0045))
  for s in [-1,1]:
   for i in range(6):
    x=s*(.105+i*.004);points=[(s*.055,.010+i*.005,1.650),(x,-.025,1.578),(s*(.140+i*.006),-.047,1.486),(s*(.132+i*.008),-.015,1.376+i*.007)]
    locks.append((points,.013,.004))
 else:
  top=1.754 if who=='Business' else 1.777;bottom=1.61 if who=='Business' else 1.65
  for i in range(12):
   offset=i*.011
   pts=[(.045+offset*.25,.015,top-i*.0015),(.018-offset*.40,-.088,top+.005-i*.002),(-.057-offset*.35,-.127,top-.055-i*.003),(-.119-offset*.10,-.074,bottom-i*.004)]
   locks.append((pts,.0135,.0045))
  for i in range(6):
   pts=[(.044+i*.009,.02,top-i*.002),(.089+i*.005,-.052,top-.030),(.119+i*.003,-.052,top-.075),(.125+i*.001,-.025,bottom-.04)]
   locks.append((pts,.012,.004))
  for s in [-1,1]:
   for i in range(6):
    pts=[(s*.09,.025+i*.01,top-.06),(s*.13,.06+i*.008,top-.09),(s*.12,.097+i*.007,top-.16),(s*.08,.11+i*.006,top-.22)]
    locks.append((pts,.014,.004))
 for i,(pts,w,d) in enumerate(locks):
  lock('V104 sculpted flowing lock '+str(i),pts,w,d,mat,head,i*.91)
  # Fine interleaved ridges create intermediate strand structure, not flyaway noise.
  for k in [-1,1]:
   strand=[(p[0]+k*w*.30,p[1]-.003,p[2]+.0006) for p in pts]
   curve('V104 tapered groom filament',strand,.00038,mat,head,[.1,.7,.6,.015])
 return len(locks)

def tailoring(root,who):
 body=bpy.data.objects['Breath'];gold=bpy.data.materials.get('V10 satin brass') or pbr('V104 satin metal',(.46,.30,.10),.3,.7)
 if who=='Student':
  cloth=bpy.data.materials['Original plum woven jacket'];trim=pbr('V104 lavender topstitch',(.39,.22,.49),.83)
  o=bpy.data.objects['Tailored exploration jacket'];inv=o.matrix_world.inverted()
  for v in o.data.vertices:
   p=o.matrix_world@v.co;a=math.atan2(p.y,p.x);env=math.sin(max(0,min(1,(p.z-.89)/.40))*math.pi)
   fold=.004*math.sin(a*11+p.z*34)*env+.002*math.sin(a*19-p.z*52)*env
   p.x+=math.cos(a)*fold;p.y+=math.sin(a)*fold;v.co=inv@p
  for s in [-1,1]:
   curve('V104 jacket princess seam',[(s*.075,-.098,1.27),(s*.11,-.122,1.18),(s*.13,-.126,1.05),(s*.14,-.11,.92)],.0009,trim,body)
   flap=cube('V104 shaped pocket flap',(s*.105,-.132,1.009),(.09,.008,.024),cloth,body,.004)
   cyl('V104 pocket snap',(s*.105,-.138,1.009),.0035,.003,gold,body)
  for j in range(45):
   z=.925+j*.0076;y=-.139+(z-.925)*.09
   for s in [-1,1]:cube('V104 zipper interlocking tooth',(s*.0035,y-.001,z),(.004,.003,.0024),gold,body,.0005)
  # Collar is fabric with stitched edging and articulated sleeves stay intact.
  for o in root.children_recursive:
   if o.type=='MESH' and o.name.startswith('Fitted sleeve'):
    inv=o.matrix_world.inverted()
    for v in o.data.vertices:
     p=o.matrix_world@v.co;env=math.exp(-((p.z-1.01)/.10)**2);p.y+=.0038*math.sin(p.z*115+p.x*25)*env;v.co=inv@p
 else:
  cloth=bpy.data.materials['Fine midnight pinstripe wool' if who=='Business' else 'Ivory tailored wool'];trim=pbr('V104 '+who+' tailored edge',(.035,.045,.055) if who=='Business' else (.53,.47,.35),.8)
  # Replace eight-vertex collars and razor-flat lapels with curved fabric panels.
  if who=='Business':
   for n in ['Folded poplin collar','Folded poplin collar.001','Left notched lapel','Right notched lapel']:
    if bpy.data.objects.get(n):bpy.data.objects[n].hide_render=True
   shirt=bpy.data.materials['Cream cotton poplin.001']
   for s in [-1,1]:
    pts=[(s*.008,-.080,1.425),(s*.048,-.072,1.425),(s*.077,-.106,1.390),(s*.045,-.164,1.355),(s*.012,-.152,1.391)]
    o=mesh('V104 rolled poplin collar',pts,[(0,1,2,3,4)],shirt,body);sol=o.modifiers.new('Poplin folded thickness','SOLIDIFY');sol.thickness=.002;bev=o.modifiers.new('Folded collar edge','BEVEL');bev.width=.003;bev.segments=3
    pts=[(s*.049,-.095,1.413),(s*.128,-.104,1.380),(s*.150,-.129,1.320),(s*.114,-.150,1.315),(s*.139,-.149,1.290),(s*.021,-.151,1.112),(s*.060,-.160,1.295)]
    o=mesh('V104 sculpted notched lapel',pts,[(0,1,2,3,4,5,6)],cloth,body);sol=o.modifiers.new('Layered lapel thickness','SOLIDIFY');sol.thickness=.004;bev=o.modifiers.new('Rolled lapel','BEVEL');bev.width=.0025;bev.segments=3
    curve('V104 lapel pick stitching',[pts[0],pts[-1],pts[5]],.00055,trim,body)
   # Tailoring folds concentrate around the waist and elbow rather than noise.
   o=bpy.data.objects['Fitted tailored jacket'];inv=o.matrix_world.inverted()
   for v in o.data.vertices:
    p=o.matrix_world@v.co;a=math.atan2(p.y,p.x);env=math.exp(-((p.z-1.04)/.10)**2);p.y+=.003*math.sin(a*12+p.z*30)*env;v.co=inv@p
  else:
   for s in [-1,1]:
    curve('V104 cape shoulder tailoring',[(s*.061,-.047,1.420),(s*.17,-.065,1.379),(s*.24,-.040,1.294),(s*.29,-.006,1.215)],.0008,trim,body)
    curve('V104 long coat dart',[(s*.125,-.120,1.32),(s*.17,-.119,1.13),(s*.15,-.127,.98),(s*.20,-.122,.65),(s*.22,-.112,.46)],.0008,trim,body)
   # Accurate hand contact: curl the retained continuous five-finger mesh
   # around the measured lower tablet edge, maintaining the wrist ring.
   hand=bpy.data.objects['Source skin left'];inv=hand.matrix_world.inverted()
   for v in hand.data.vertices:
    p=hand.matrix_world@v.co;t=max(0,min(1,(p.x-.300)/.125));angle=t*1.55;dx=max(0,p.x-.300)
    p.x=.300+dx*math.cos(angle) if p.x>.300 else p.x
    p.z+=dx*math.sin(angle)*.60;p.y+=.025*t
    v.co=inv@p
   held=bpy.data.objects['HeldTablet'];m=held.matrix_world.copy();m.translation+=Vector((-.045,-.020,-.026));held.matrix_world=m
   # Screen geometry: inset edge, camera aperture and original civic chart.
   graphite=pbr('V104 tablet edge aluminium',(.038,.050,.052),.28,.6)
   # Existing screen transform/pieces remain attached to the same forearm.
   cyl('V104 tablet camera',(.315,-.056,1.162),.0024,.0015,graphite,held)

def skateboard(root):
 for o in root.children_recursive:
  if o.name.startswith(('Curved skateboard','Skateboard axle','Skateboard wheel')):o.hide_render=True
 group=bpy.data.objects.new('V104 complete skateboard',None);bpy.context.scene.collection.objects.link(group);parent(group,root)
 wood=pbr('V104 laminated maple deck',(.40,.24,.105),.6);grip=pbr('V104 charcoal grip with fine mineral',(.030,.035,.031),.94);purple=pbr('V104 purple urethane',(.31,.15,.45),.64);metal=pbr('V104 cast aluminium trucks',(.31,.34,.35),.28,.85);rubber=pbr('V104 lime wheel urethane',(.47,.60,.17),.64)
 N=64;verts=[];faces=[];uvs=[]
 # Capsule outline, length 0.68 m. Both nose and tail kick away from the
 # undercarriage. Real 7-ply edge thickness; the top stays convex across width.
 outline=[]
 for i in range(N):
  a=i/N*math.tau;x=.087*math.cos(a);z=.34+.34*math.sin(a);y=.105-.020*(abs(z-.34)/.34)**5+.004*(x/.087)**2;outline.append((x,y,z))
 for depth in [0,.010]:
  for x,y,z in outline:verts.append((.38+x,y+depth,z));uvs.append((x/.174+.5,z/.68))
 faces.append(tuple(reversed(range(N))));faces.append(tuple(N+i for i in range(N)))
 for i in range(N):faces.append((i,(i+1)%N,(i+1)%N+N,i+N))
 deck=mesh('V104 concave maple deck',verts,faces,wood,group,uvs)
 # Fan surfaces subdivided longitudinally so the kick is actual curved mesh.
 top=[];tf=[];tu=[];R=48;C=12
 for j in range(R):
  z=.006+j/(R-1)*.668;width=.087*math.sqrt(max(.001,1-((z-.34)/.34)**2))
  for k in range(C):
   x=(k/(C-1)*2-1)*width;y=.1045-.020*(abs(z-.34)/.34)**5+.004*(x/.087)**2
   top.append((.38+x,y,z));tu.append((k/(C-1),j/(R-1)))
 for j in range(R-1):
  for k in range(C-1):a=j*C+k;tf.append((a,a+1,a+C+1,a+C))
 mesh('V104 fine mineral griptape',top,tf,grip,group,tu)
 for z in [.14,.54]:
  cube('V104 truck baseplate',(.38,.122,z),(.052,.012,.061),metal,group,.002)
  cyl('V104 truck kingpin',(.38,.139,z),.006,.025,metal,group)
  curve('V104 sculpted truck hanger',[(.29,.153,z),(.34,.157,z+.009),(.38,.149,z+.010),(.42,.157,z+.009),(.47,.153,z)],.006,metal,group)
  cyl('V104 continuous wheel axle',(.38,.153,z),.0035,.204,metal,group,'X')
  for s in [-1,1]:
   cyl('V104 wheel',(.38+s*.105,.153,z),.031,.025,rubber,group,'X');cyl('V104 bearing',(.38+s*.119,.153,z),.010,.0025,metal,group,'X');cyl('V104 axle nut',(.38+s*.121,.153,z),.0055,.003,metal,group,'X')
  for dx in [-.017,.017]:
   for dz in [-.020,.020]:cyl('V104 recessed grip bolt',(.38+dx,.102,z+dz),.0027,.002,metal,group)
 # Purple rail and an original leaf inlay make the explorer's board legible.
 curve('V104 purple laminated rail',[(.38+x,y+.006,z) for x,y,z in outline]+[(.38+outline[0][0],outline[0][1]+.006,outline[0][2])],.0018,purple,group)
 leaf=[(.355,.102,.28),(.34,.102,.34),(.38,.102,.40),(.414,.102,.35),(.392,.102,.29)]
 mesh('V104 leaf deck inlay',leaf,[(0,1,2,3,4)],rubber,group)
 # Rest on its rounded tail, with a slight physical lean clear of the leg.
 group.rotation_euler.y=-.15;bpy.context.view_layer.update()
 return {'length_m':.68,'deck_thickness_m':.010,'wheels':4,'bearing_hubs':4,'truck_assemblies':2}

report={}
for who in (sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Student','Business','City']):
 target=OUT/f'CT_{who}_Explore_v104.blend'
 if target.exists():raise RuntimeError('Destination exists; refusing to compound sculpt: '+str(target))
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v10.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v10'];root.name=f'CT_{who}_Explore_v104'
 head=next(o for o in root.children_recursive if o.type=='MESH' and o.name.endswith('_head'));face_sculpt(head,who)
 locks=new_groom(root,who);tailoring(root,who);board=skateboard(root) if who=='Student' else None
 # Bake portable edge modifiers only, preserve all facial morphs and parent pivots.
 for o in list(root.children_recursive):
  if o.hide_render or o.type not in ['MESH','CURVE']:continue
  if o.type=='CURVE':
   bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
  if o.data.shape_keys:
   for k in o.data.shape_keys.key_blocks:k.value=0
   continue
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):
   if mod.type in ['BEVEL','WEIGHTED_NORMAL','SOLIDIFY','SUBSURF']:
    try:bpy.ops.object.modifier_apply(modifier=mod.name)
    except RuntimeError:pass
 root['v104_reference_sculpt']=True;bpy.ops.wm.save_as_mainfile(filepath=str(target))
 source=json.loads((OUT/f'CT_{who}_Explore_v10.sources.json').read_text());source.update(version='v104',parent_version='v10',status='candidate: browser visual verification pending',changes=['morph-preserving nose, lip, jaw and neutral expression sculpt','original layered opaque groom with fine fibres','tailored fabric geometry and contact corrections'],paid_calls=0)
 (OUT/f'CT_{who}_Explore_v104.sources.json').write_text(json.dumps(source,indent=2));report[who]={'groom_locks':locks,'board':board,'master':str(target),'old_v10_unchanged':True}
 (E/'sculpt-result.json').write_text(json.dumps(report,indent=2));print('V104_SCULPT_SAVED',who,flush=True)
