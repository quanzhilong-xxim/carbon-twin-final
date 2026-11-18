"""Close the measured neck/shoulder gaps in independent, editable sources.
Retains all prior masters, facial expressions, animated arm pivots and props.
"""
import bpy,bmesh,math,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];OUT=R/'public/models/characters-v10'
exec(compile((R/'scripts/finalize-character-v10.py').read_text().split('summary={}')[0],__file__,'exec'))

def shell(name,rows,mat,p,opening=0):
 n=96;verts=[];faces=[]
 for z,rx,ry,cy,drop in rows:
  for k in range(n+1):
   a=-math.pi/2+opening+(math.tau-2*opening)*k/n
   verts.append((rx*math.cos(a),cy+ry*math.sin(a),z-drop*abs(math.cos(a))**2))
 for j in range(len(rows)-1):
  for k in range(n):
   i=j*(n+1)+k;faces.append((i,i+1,i+n+2,i+n+1))
 o=mesh(name,verts,faces,mat,p)
 uv=o.data.uv_layers.new()
 for f in o.data.polygons:
  for li in f.loop_indices:
   i=o.data.loops[li].vertex_index;uv.data[li].uv=((i%(n+1))/n*3,(i//(n+1))/(len(rows)-1))
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 bpy.context.view_layer.objects.active=o
 sub=o.modifiers.new('Continuous garment curvature','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
 s=o.modifiers.new('Closed cloth edge','SOLIDIFY');s.thickness=.003;bpy.ops.object.modifier_apply(modifier=s.name)
 return o

for who in ['Business','City']:
 stem=f'CT_{who}_Explore_v108c'
 if (OUT/(stem+'.blend')).exists():raise RuntimeError('Refusing to overwrite '+stem)
 bpy.ops.wm.open_mainfile(filepath=str(OUT/f'CT_{who}_Explore_v108.blend'),load_ui=False,use_scripts=False)
 root=bpy.data.objects[f'CT_{who}_Explore_v108'];root.name=stem
 body=bpy.data.objects['Breath']
 for o in root.children_recursive:
  if any(s in o.name for s in ['V104g continuous shirt shoulder yoke','V104g tailored shoulder and back yoke','V108 civic continuous shoulder']):o.hide_render=True
 if who=='Business':
  shell('V108c fitted continuous shirt',[(1.437,.058,.048,-.003,0),(1.417,.069,.058,-.003,0),(1.39,.130,.103,.002,.004),(1.35,.215,.130,.001,0),(1.28,.210,.135,.001,0)],bpy.data.materials['Cream cotton poplin'],body)
  shell('V108c closed suit shoulder',[(1.43,.069,.059,.004,0),(1.414,.112,.085,.006,.003),(1.394,.176,.116,.006,.008),(1.36,.232,.137,.006,.008),(1.29,.218,.139,.004,0)],bpy.data.materials['Fine midnight pinstripe wool'],body,.57)
 else:
  shell('V108c dark continuous neckline',[(1.445,.050,.047,-.012,0),(1.425,.062,.057,-.012,0),(1.402,.108,.089,-.003,0),(1.37,.176,.115,.002,0),(1.29,.173,.117,.002,0)],bpy.data.materials['V10 forest charcoal silk'],body)
  shell('V108c closed civic shoulder',[(1.435,.065,.057,-.006,0),(1.42,.122,.091,.003,.003),(1.407,.191,.112,.006,.008),(1.38,.222,.131,.008,.012),(1.30,.209,.134,.009,0)],bpy.data.materials['Ivory tailored wool'],body,.66)
 root['v108c_tailoring']='continuous inner neckline and fully connected curved shoulder shell; retained face, sleeves and props'
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
 combine_static(root);export(root,stem)
 saved={o:o.data.copy() for o in root.children_recursive if o.type=='MESH' and not o.hide_render}
 for o in saved:
  if o.data.shape_keys and o.name.endswith('_head'):subdivide_morph(o)
 export(root,stem+'-portrait')
 for o,d in saved.items():o.data=d
 for o in saved:
  if o.data.shape_keys or o.name.startswith('V3 rounded sleeve shoulder') or len(o.data.polygons)<400:continue
  bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Distance LOD','DECIMATE');dec.ratio=.45;bpy.ops.object.modifier_apply(modifier=dec.name)
 export(root,stem+'-lite')
 record=json.loads((OUT/f'CT_{who}_Explore_v108.sources.json').read_text())
 record.update(version='v108c',parent_version='v108',status='browser art review required')
 record['refinements'].append(root['v108c_tailoring'])
 record['exports']=[dict(file=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in OUT.glob(stem+'*.glb')]
 (OUT/(stem+'.sources.json')).write_text(json.dumps(record,indent=2))
 print('CLOSED_SHOULDER_EXPORTED',who,flush=True)
