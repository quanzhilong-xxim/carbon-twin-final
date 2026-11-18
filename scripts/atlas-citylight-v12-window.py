"""Pack the six real contact AO bakes; preserve sample and original geometry."""
import bpy,os,json,hashlib,numpy as np,struct
ROOT='C:/Users/23242/Desktop/CarbonTwin_App';SOURCE=ROOT+'/work/v5-window-staged/light-court-v12.blend'
OUT=ROOT+'/work/v5-window-atlas-staged';os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=SOURCE)
floors=sorted([o for o in bpy.context.scene.objects if o.type=='MESH'and o.name.startswith('v12-study-floor-')],key=lambda o:o.name)
assert len(floors)==6
atlas_pixels=np.ones((512,768,4),dtype=np.float32);vertices=[];faces=[];uvs=[];tile_proof=[]
for i,obj in enumerate(floors):
    assert obj.matrix_world.is_identity
    image=next(n.image for n in obj.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
    assert tuple(image.size)==(256,256)
    src=np.array(image.pixels[:],dtype=np.float32).reshape((256,256,4))
    # Bilinear resampling into a 248px tile leaves a four-pixel edge gutter.
    # UV endpoints still map to the original image endpoints, not a cropped AO.
    coords=np.linspace(0,255,248);a=np.floor(coords).astype(int);b=np.minimum(a+1,255);t=(coords-a).astype(np.float32)
    h=src[:,a,:]*(1-t[None,:,None])+src[:,b,:]*t[None,:,None]
    inner=h[a,:,:]*(1-t[:,None,None])+h[b,:,:]*t[:,None,None]
    padded=np.pad(inner,((4,4),(4,4),(0,0)),mode='edge');tx=i%3;ty=i//3
    atlas_pixels[ty*256:(ty+1)*256,tx*256:(tx+1)*256]=padded
    offset=len(vertices);vertices.extend(tuple(v.co)for v in obj.data.vertices)
    for p in obj.data.polygons:
        faces.append(tuple(offset+v for v in p.vertices))
        for loop_index in p.loop_indices:
            u,v=obj.data.uv_layers.active.data[loop_index].uv
            uvs.append(((tx*256+4.5+u*247)/768,(ty*256+4.5+v*247)/512))
    tile_proof.append({'source':obj.name,'sourceImage':image.name,'sourceSize':[256,256],'atlasTile':[tx,ty],'fourPixelGutter':True,'crop':False})
atlas=bpy.data.images.new('v12-study-contact-AO-atlas',width=768,height=512,alpha=False);atlas.colorspace_settings.name='Non-Color';atlas.pixels.foreach_set(atlas_pixels.ravel())
atlas.filepath_raw=OUT+'/contact-AO-atlas.png';atlas.file_format='PNG';atlas.save();atlas.pack()
material=floors[0].data.materials[0].copy();material.name='v12-study-floor-ao'
tex=next(n for n in material.node_tree.nodes if n.type=='TEX_IMAGE');tex.image=atlas
mesh=bpy.data.meshes.new('v12-study-floor-ao');mesh.from_pydata(vertices,[],faces);mesh.update();uv=mesh.uv_layers.new(name='Packed contact AO')
assert len(uv.data)==len(uvs)
for i,co in enumerate(uvs):uv.data[i].uv=co
joined=bpy.data.objects.new('v12-study-floor-ao',mesh);bpy.context.collection.objects.link(joined);joined.data.materials.append(material)
for obj in floors:bpy.data.objects.remove(obj,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/light-court-v12.blend')
bpy.ops.export_scene.gltf(filepath=OUT+'/light-court.glb',export_format='GLB',export_yup=True,export_apply=True)
raw=open(OUT+'/light-court.glb','rb').read();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n])
report={'status':'STAGED_NOT_ACCEPTED','source':SOURCE,'sourceSha256':hashlib.sha256(open(SOURCE,'rb').read()).hexdigest(),'glb':{'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'meshes':len(doc['meshes']),'materials':len(doc['materials']),'images':len(doc.get('images',[]))},'atlas':{'size':[768,512],'sourceImages':6,'resultImages':1,'resampling':'Bilinear to 248px + 4px edge gutter per tile; no room-image crop','geometryChange':False,'triangleCount':sum(len(f)-2 for f in faces),'tiles':tile_proof},'fixes':['Inset cabinet plinths close the independently measured floor gap without moving cabinet top or plants','Key caps contact the original keyboard bodies','Monitor foot lowered 3.5mm onto original desk','Closed 3mm chair upholstery shell outside original back with >=2.5mm gap','All current sample AO rebaked from actual geometry after contact corrections'],'limits':['Local facade sample only; whole building not accepted','LOD intentionally omits these sample details','No automatic 98 score']}
with open(OUT+'/atlas-proof.json','w',encoding='utf-8')as f:json.dump(report,f,indent=2)
print('ATLAS_PROOF '+json.dumps(report))
