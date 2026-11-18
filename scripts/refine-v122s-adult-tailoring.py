"""Continue R: shaped collar and directional groom, retaining all weighted anatomy."""
import bpy,bmesh,sys,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from export_character_candidate import export_candidate
OUT=R/'public/models/characters-v12-candidate';ROLE=sys.argv[-1];BUSINESS=ROLE=='Business';STEM=f'CT_{ROLE}_Explore_v122s'
if any(OUT.glob(STEM+'*')):raise RuntimeError('Preserve S')
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{ROLE}_Explore_v122r.blend'),load_ui=False,use_scripts=False)
root=bpy.data.objects[f'CT_{ROLE}_Explore_v122r'];rig=bpy.data.objects['CT_Humanoid']
helper=(R/'scripts/refine-v122b-character-art.py').read_text();exec(compile(helper[helper.index('def neutral():'):helper.index('changes=[]')],__file__,'exec'),globals());neutral()
changes=[]
if BUSINESS:
 for o in root.children_recursive:
  if o.type=='MESH'and o.name.startswith(('V122q shaped cotton','V122q cutaway folded','V122r shaped shirt')):o.hide_render=True
 cotton=bpy.data.materials['V122n warm ivory cotton'];N=64;M=48;vs=[];faces=[];uv=[]
 # A shaped shirt front extends under the actual lapels, then narrows to
 # the measured neck. Its top edge follows a curved neckline.
 for j in range(M+1):
  t=j/M;rx=.104-.053*t**2
  for i in range(N+1):
   u=i/N;x=(2*u-1)*rx
   z=.82+.247*t-.006*math.exp(-(x/.026)**4)*t**8
   y=-.146+.043*t*t-.010*(1-(2*u-1)**2)
   vs.append(Vector((x,y,z)));uv.append((u,t))
 for j in range(M):
  for i in range(N):a=j*(N+1)+i;faces.append((a,a+1,a+N+2,a+N+1))
 make('V122s shirt front curved to the neck',vs,faces,cotton,'CT_Chest',uv)
 for sign in [-1,1]:
  a=Vector((sign*.008,-.102,1.074));b=Vector((sign*.049,-.088,1.065));c=Vector((sign*.064,-.153,1.017));d=Vector((sign*.023,-.166,1.036))
  N=32;vs=[];faces=[];uv=[]
  for j in range(N+1):
   t=j/N
   for i in range(N+1):
    u=i/N;p=a.lerp(b,u).lerp(d.lerp(c,u),t);p.y-=.007*math.sin(u*math.pi)*math.sin(t*math.pi);vs.append(p);uv.append((u,t))
  for j in range(N):
   for i in range(N):a0=j*(N+1)+i;faces.append((a0,a0+1,a0+N+2,a0+N+1))
  o=make('V122s turned spread collar leaf',vs,faces,cotton,'CT_Chest',uv)
  m=o.modifiers.new('Turned cotton edge','SOLIDIFY');m.thickness=.001;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
 knot=bpy.data.objects['Tie knot'];knot.hide_render=True;silk=knot.data.materials[0]
 vs=[];faces=[];uv=[];N=40;M=24
 for j in range(M+1):
  t=j/M;rx=.006+.011*math.sin(t*math.pi*.65);ry=.004+.006*math.sin(t*math.pi*.70)
  for i in range(N):
   a=i/N*math.tau;vs.append(Vector((rx*math.cos(a),-.168+ry*math.sin(a),1.018+.043*t)));uv.append((i/N,t))
 for j in range(M):
  for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
 faces.extend([tuple(reversed(range(N))),tuple(M*N+i for i in range(N))])
 make('V122s curved silk Windsor knot',vs,faces,silk,'CT_Chest',uv)
 changes+=['Curved full shirt front under the lapels replaces the rectangular insert','Turned spread collar meets the measured neckband; shaped silk tie knot joins the actual tie']

# Restrained sculpted flyaways at the temple follow the existing UV groom.
# The silhouette remains the licensed artist mesh; every fibre is real and
# follows CT_Head during the runtime expressions and head turns.
hair=bpy.data.materials['V122o artist sculpted chestnut hair'];p=next(n for n in hair.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Roughness'].default_value=.59;p.inputs['Specular IOR Level'].default_value=.18
eye=1.204 if BUSINESS else 1.588
head=bpy.data.objects['V12e native head']
for key in head.data.shape_keys.key_blocks:
 for v in key.data:
  pos=v.co;front=max(0,min(1,(-pos.y-.08)/.05));mouth=eye-(.105 if BUSINESS else .095)
  corner=math.exp(-((abs(pos.x)-(.029 if BUSINESS else .035))/.012)**4-((pos.z-mouth)/.013)**4)*front
  pos.z+=.0015*corner
for v,k in zip(head.data.vertices,head.data.shape_keys.key_blocks[0].data):v.co=k.co
changes+=['Softer hair specular and a restrained lip-corner lift applied consistently to every native expression']
export_candidate(root,rig,OUT,STEM,f'CT_{ROLE}_Explore_v122r','v122s',changes)
