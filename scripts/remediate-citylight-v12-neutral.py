"""Stage only the neutral optical base, preserving every geometry/UV attribute.

The runtime trial uses the same neutral facade value. Thickness-dependent
absorption remains in KHR_materials_volume; this is not a calibrated product.
"""
import bpy,os,json,hashlib,struct
ROOT='C:/Users/23242/Desktop/CarbonTwin_App'
OUT=ROOT+'/work/v5-neutral-r20-staged';os.makedirs(OUT,exist_ok=True)
BASE=ROOT+'/docs/citylight/master/rollback/v5-r20-before-neutral-source'
items=[('light-court','65675e8a7b93508ec5a51cdeb080bfee222491de05c257c8f50b0609122f22ab'),('light-court-lod','281ff40f508a41f553f6f70e38194d142ac89250ddec93a8aa56ac7ea6375dee')]
reports=[]
for tag,expected in items:
    source=BASE+'/work/'+tag+'-v12.blend';source_hash=hashlib.sha256(open(source,'rb').read()).hexdigest()
    assert source_hash==expected,'Unexpected protected source change'
    bpy.ops.wm.open_mainfile(filepath=source)
    mat=bpy.data.materials['v12-glass'];p=mat.node_tree.nodes.get('Principled BSDF')
    before=list(p.inputs['Base Color'].default_value)
    assert all(abs(v-e)<1e-6 for v,e in zip(before,[.77582222,.86315721,.85499263,1]))
    p.inputs['Base Color'].default_value=(1,1,1,1);mat.diffuse_color=(1,1,1,1)
    bpy.ops.wm.save_as_mainfile(filepath=OUT+'/'+tag+'-v12.blend')
    bpy.ops.export_scene.gltf(filepath=OUT+'/'+tag+'.glb',export_format='GLB',export_yup=True,export_apply=True)
    raw=open(OUT+'/'+tag+'.glb','rb').read();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n])
    materials=[m for m in j['materials']if m['name']=='v12-glass'];assert len(materials)==1
    assert materials[0]['pbrMetallicRoughness'].get('baseColorFactor',[1,1,1,1])==[1,1,1,1]
    reports.append({'tag':tag,'source':source,'sourceSha256':source_hash,'beforeBaseColor':before,'afterBaseColor':[1,1,1,1],'outputSha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'material':materials[0]})
with open(OUT+'/neutral-proof.json','w',encoding='utf-8')as f:json.dump({'status':'STAGED_NOT_PROMOTED_NOT_ACCEPTED','change':'v12-glass base color only; runtime camera, sky, absorption and all geometry retained','assets':reports},f,indent=2)
print('NEUTRAL_STAGE '+json.dumps(reports))
