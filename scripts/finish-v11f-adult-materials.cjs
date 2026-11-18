const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../public/models/characters-v10');
const revision=process.env.CT_CANDIDATE_REVISION||'v11f';if(!['v11f','v11g','v11h','v11i'].includes(revision))throw Error('Unknown candidate revision');
function read(file){const buffer=fs.readFileSync(path.join(dir,file)),length=buffer.readUInt32LE(12);return{buffer,length,gltf:JSON.parse(buffer.subarray(20,20+length))};}
for(const who of(process.env.CT_CANDIDATE_ROLES||'Business,City').split(',')){
 const prior=read(`CT_${who}_Explore_v11e.glb`).gltf,exports=[];
 for(const tier of['','-portrait','-lite']){
  const file=`CT_${who}_Explore_${revision}${tier}.glb`,{buffer,length,gltf}=read(file);
  for(const material of gltf.materials){
   const source=prior.materials.find(m=>m.name===material.name);
   if(source){
    for(const property of['baseColorFactor','metallicFactor','roughnessFactor'])if(source.pbrMetallicRoughness?.[property]!==undefined)material.pbrMetallicRoughness[property]=source.pbrMetallicRoughness[property];
    if(!source.extensions?.KHR_materials_unlit&&material.extensions)delete material.extensions.KHR_materials_unlit;
   }
   if(/^V11[fgh] /.test(material.name)){
    if(material.extensions)delete material.extensions.KHR_materials_unlit;
    material.pbrMetallicRoughness.metallicFactor=0;
   }
  }
  gltf.asset.extras={...gltf.asset.extras,ctV11FNativeAdultHeads:true};
  const json=Buffer.from(JSON.stringify(gltf)),padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),tail=buffer.subarray(20+length),header=Buffer.alloc(20);
  header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);header.write('JSON',16);
  const result=Buffer.concat([header,padded,tail]);fs.writeFileSync(path.join(dir,file),result);exports.push({file,bytes:result.length,sha256:crypto.createHash('sha256').update(result).digest('hex')});
 }
 const meta=path.join(dir,`CT_${who}_Explore_${revision}.sources.json`),record=JSON.parse(fs.readFileSync(meta));record.exports=exports;record.export_finish='scripts/finish-v11f-adult-materials.cjs';fs.writeFileSync(meta,JSON.stringify(record,null,2));console.log(JSON.stringify({who,exports}));
}
