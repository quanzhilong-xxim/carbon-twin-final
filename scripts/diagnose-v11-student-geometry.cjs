const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
(async()=>{
 const T=await import('three'),{GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const root=path.resolve(__dirname,'..'),b=fs.readFileSync(path.join(root,`public/models/characters-v10/CT_Student_Explore_${process.env.CT_STUDENT_REVISION||'v11e'}.glb`)),len=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+len));
 g.materials=g.materials.map(m=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1]}}));delete g.images;delete g.textures;delete g.extensionsRequired;delete g.extensionsUsed;
 const json=Buffer.from(JSON.stringify(g)),padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),tail=b.subarray(20+len),header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);header.write('JSON',16);const binary=Buffer.concat([header,padded,tail]);
 const asset=await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),'');
 const value={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'lib/visuals/studentPerformance.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(n=>n==='three'?T:n.includes('SkeletonUtils')?{clone:s=>s}:require(n),value,value.exports);
 const model=asset.scene,controller=value.exports.studentPerformance(model),rows=[];
 for(const action of['idle','listening','recording']){
  for(let i=0;i<180;i++)controller.update(1/60,action,1,false,false,new T.Vector2(),false);
  model.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});const cuffs=[];
  model.traverse(o=>{if(!o.name.startsWith('V3_fitted_cuff'))return;const center=new T.Vector3(),count=o.geometry.getAttribute('position').count;for(let i=0;i<count;i++)center.add(o.localToWorld(o.getVertexPosition(i,new T.Vector3())));center.multiplyScalar(1/count);const side=o.name.endsWith('001')?'L':'R',wrist=model.getObjectByName(`J_Bip_${side}_Hand`).getWorldPosition(new T.Vector3());cuffs.push({name:o.name,center:center.toArray(),wrist:wrist.toArray(),distance:center.distanceTo(wrist)});});
  rows.push({action,camera:model.userData.studentCamera,cuffs});
 }
 console.log(JSON.stringify(rows,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
