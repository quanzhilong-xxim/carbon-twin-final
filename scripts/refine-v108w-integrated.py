"""Versioned local tailoring, rooted braids and adult-specific facial sculpt.
Never opens the user's live scene or replaces an earlier model.
"""
import bpy,bmesh,math,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
exec(compile((R/'scripts/tailor-v108u-delivery.py').read_text().split("for who,base in [(")[0],__file__,'exec'))
REV='v108w'
def fabric(mat,colour,name):
 p=mat.node_tree.nodes.get('Principled BSDF')
 if not p:return
 n=512;y,x=np.mgrid[0:n,0:n];u=x/n;v=y/n
 # Original fine, tileable fibre albedo. It is not baked lighting.
 weave=.025*np.sin(u*math.tau*112)*np.cos(v*math.tau*112)+.014*np.sin((u+v)*math.tau*56)
 rgba=np.ones((n,n,4),dtype=np.float32)
 for k,c in enumerate(colour):rgba[:,:,k]=np.clip(c*(1+weave),0,1)
 im=image(name+' original woven albedo',rgba);im.colorspace_settings.name='Non-Color'
 for l in list(p.inputs['Base Color'].links):mat.node_tree.links.remove(l)
 t=mat.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;t.extension='REPEAT';mat.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 p.inputs['Base Color'].default_value=(*colour,1);mat.diffuse_color=(*colour,1);p.inputs['Roughness'].default_value=.76
 p.inputs['Sheen Weight'].default_value=.06
def ribbon(name,pts,width,mat,root):
 vs=[];faces=[]
 for x,y,z in pts:vs.extend([(x-width/2,y,z),(x+width/2,y,z)])
 for j in range(len(pts)-1):q=j*2;faces.append((q,q+1,q+3,q+2))
 o=mesh(name,vs,faces,mat,root);s=o.modifiers.new('Woven strap thickness','SOLIDIFY');s.thickness=.0012
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=s.name)
 weight(o,root,['J_Bip_C_Chest','J_Bip_C_UpperChest']);return o
for who,base in [('Student','v108v'),('Business','v108u'),('City','v108u')]:
 stem=f'CT_{who}_Explore_{REV}'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Preserve existing '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_{base}.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_{base}'];root.name=stem;changes=[]
 if who=='Student':
  old=bpy.data.objects['V10 merged Breath / V10 forest charcoal silk'];old.hide_render=True
  dark=old.data.materials[0]
  # Camera straps lie along the front of the garment and hang to both lugs.
  for side in [-1,1]:
   pts=[]
   for j in range(40):
    t=j/39;pts.append((side*(.052*(1-t)+.043*t+.012*math.sin(t*math.pi)),-.057*(1-t)-.151*t-.018*math.sin(t*math.pi),1.292*(1-t)+1.044*t))
   ribbon('V108w fitted camera neck strap',pts,.009,dark,root)
  for o in root.children_recursive:
   if o.name.startswith(('V108v woven rose braid','V108v fine hair sheen')):o.hide_render=True
  pink=bpy.data.materials['V108d rose silk braided hair'];fine=bpy.data.materials['V108d rose hair highlights']
  for side in [-1,1]:
   for strand in range(3):
    pts=[]
    for j in range(170):
     t=j/169;rooting=min(1,t/.23);rooting=rooting*rooting*(3-2*rooting)
     cx=side*(.102+.035*rooting+.014*math.sin(t*math.pi));cy=.008-.079*rooting+.020*math.sin(t*math.pi)
     a=t*math.pi*17+strand*math.tau/3;radius=.008*(1-.67*t)
     pts.append((cx+radius*math.cos(a),cy+radius*math.sin(a),1.515-.428*t))
    o=curve('V108w rooted rose braid',pts,.0095,pink,root);weight(o,root,['J_Bip_C_Head'])
    for off in [-1,1]:
     o=curve('V108w tapered hair filament',[(x+off*.002,y-.007,z)for x,y,z in pts],.00019,fine,root);weight(o,root,['J_Bip_C_Head'])
  fabric(bpy.data.materials['Original plum woven jacket.001'],(.35,.19,.49),'Lavender bomber')
  fabric(bpy.data.materials['V10 warm recycled cotton.003'],(.48,.40,.29),'Sand cargo')
  changes+=['Replaced the entire crossing neck loop with two fitted camera straps; horizontal chest band removed.','Braids now emerge from behind the ears and curve onto the shoulders; tapered original filaments retain head weights.','Original tileable woven albedo, normal and roughness maps on lavender jacket and sewn cargo.']
 else:
  face=bpy.data.objects[f'V108l distinct {who} anime face'];eye=1.20 if who=='Business' else 1.588
  def adult(p):
   p=p.copy();side=1 if p.x>=0 else -1;center=side*(.054 if who=='Business' else .053)
   w=math.exp(-((p.x-center)/.042)**4-((p.z-eye)/.033)**4)
   p.z=eye+(p.z-eye)*(1-(.18 if who=='Business' else .07)*w)
   p.x=center+(p.x-center)*(1-(.12 if who=='Business' else .035)*w)
   front=max(0,min(1,(-p.y-.07)/.04))
   p.y-=(.0045 if who=='Business' else .002)*math.exp(-(p.x/.024)**2-((p.z-(eye-.052))/.035)**2)*front
   chin=math.exp(-((p.z-(eye-.108))/.033)**2)
   p.x*=1+(.065 if who=='Business' else -.015)*chin
   p.z-=(.005 if who=='Business' else .002)*chin
   return p
  deform(face,adult)
  for m in face.data.materials:
   if 'Face_00_SKIN' in m.name: m['ct_finish_colour']=[.84,.67,.56,1]if who=='Business'else[.88,.72,.63,1]
  if who=='Business':
   for m in bpy.data.materials:
    if 'wool' in m.name.lower():fabric(m,(.026,.035,.039),'Charcoal fine wool')
  changes+=['Adult-specific lower eyelid, eye width, nose and chin sculpt applied to Basis and every facial expression.','Retained original eyewear, facial maps, articulated sleeves, props and neutral pose.']
 root['v108w_refinements']=json.dumps(changes)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 export(root,stem);export(root,stem+'-portrait')
 for o in root.children_recursive:
  if o.type!='MESH' or o.hide_render or o.data.shape_keys or len(o.data.polygons)<1000:continue
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.65
  try:bpy.ops.object.modifier_apply(modifier=mod.name)
  except RuntimeError:o.modifiers.remove(mod)
 export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_{base}.sources.json').read_text());record.update(version=REV,parent_version=base,paid_calls=0,status='integrated visual review pending')
 record.setdefault('refinements',[]).extend(changes);record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in OUT.glob(stem+'*.glb')]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2));print('V108W_EXPORTED',who,flush=True)
