"""Copy real Blender morph FCurve samples into exported glTF animations.

Blender 5.2 NLA export can cache morph values from another muted track. This
keeps the exporter mesh, skin, transform clips and textures, replacing only
weight samplers with the corresponding editable action's evaluated curves.
"""
import json,struct

def repair_morph_channels(file,objects,fps=30):
 raw=file.read_bytes();size=struct.unpack_from('<I',raw,12)[0]
 g=json.loads(raw[20:20+size]);bin_start=28+size
 bin_size=struct.unpack_from('<I',raw,20+size)[0]
 binary=bytearray(raw[bin_start:bin_start+bin_size])
 by_name={o.name:o.data.shape_keys for o in objects if o.type=='MESH'and o.data.shape_keys}
 def add(values,count,kind,minimum=None,maximum=None):
  while len(binary)%4:binary.append(0)
  offset=len(binary);binary.extend(struct.pack('<'+'f'*len(values),*values))
  vi=len(g['bufferViews']);g['bufferViews'].append(dict(buffer=0,byteOffset=offset,byteLength=len(values)*4))
  a=dict(bufferView=vi,componentType=5126,count=count,type=kind)
  if minimum is not None:a['min']=minimum
  if maximum is not None:a['max']=maximum
  ai=len(g['accessors']);g['accessors'].append(a);return ai
 for anim in g.get('animations',[]):
  for channel in anim['channels']:
   if channel['target']['path']!='weights':continue
   node=g['nodes'][channel['target']['node']];owner=by_name.get(node['name'])
   if owner is None:raise RuntimeError('Missing morph owner '+node['name'])
   track=next(t for t in owner.animation_data.nla_tracks if t.name==anim['name'])
   strip=track.strips[0];action=strip.action
   curves={fc.data_path:fc for layer in action.layers for st in layer.strips for bag in st.channelbags if bag.slot_handle==strip.action_slot_handle for fc in bag.fcurves}
   names=g['meshes'][node['mesh']]['extras']['targetNames']
   start=strip.action_frame_start;end=strip.action_frame_end;count=round(end-start)+1
   times=[i/fps for i in range(count)];values=[]
   for i in range(count):
    for name in names:
     # Use the actual Blender key's escaped RNA path, preserving names exactly.
     key=owner.key_blocks.get(name)
     if key is None:raise RuntimeError('Missing exported morph '+name)
     fc=curves.get(key.path_from_id('value'))
     values.append(float(fc.evaluate(start+i))if fc else 0.0)
   sampler=anim['samplers'][channel['sampler']]
   sampler['input']=add(times,len(times),'SCALAR',[times[0]],[times[-1]])
   sampler['output']=add(values,len(values),'SCALAR')
   sampler['interpolation']='LINEAR'
   anim.setdefault('extras',{})['morph_bake']='30fps samples from retained Blender action FCurves'
 while len(binary)%4:binary.append(0)
 g['buffers'][0]['byteLength']=len(binary)
 body=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode('utf8')
 body+=b' '*((-len(body))%4)
 total=12+8+len(body)+8+len(binary)
 file.write_bytes(struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(body),b'JSON')+body+struct.pack('<I4s',len(binary),b'BIN\x00')+binary)
