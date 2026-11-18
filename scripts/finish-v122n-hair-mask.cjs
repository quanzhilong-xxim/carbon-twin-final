const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'public/models/characters-v12-candidate');
for(const role of ['Business','City']){
 const rows=[];
 for(const tier of ['','-portrait','-lite']){
  const file=path.join(dir,`CT_${role}_Explore_v122n${tier}.glb`),b=fs.readFileSync(file),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  for(const m of g.materials)if(m.name==='V122m layered physical hair strands'){
   m.alphaMode='MASK';m.alphaCutoff=.36;m.doubleSided=true;
   m.pbrMetallicRoughness.roughnessFactor=.64;
  }
  const data=Buffer.from(JSON.stringify(g)),json=Buffer.concat([data,Buffer.alloc((4-data.length%4)%4,32)]),tail=b.subarray(20+b.readUInt32LE(12)),header=Buffer.alloc(20);
  header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+tail.length,8);header.writeUInt32LE(json.length,12);header.write('JSON',16);
  const result=Buffer.concat([header,json,tail]);fs.writeFileSync(file,result);
  rows.push({file:path.basename(file),bytes:result.length,sha256:crypto.createHash('sha256').update(result).digest('hex')});
 }
 const record=path.join(dir,`CT_${role}_Explore_v122n.sources.json`),source=JSON.parse(fs.readFileSync(record));source.exports=rows;source.export_finish='scripts/finish-v122n-hair-mask.cjs';fs.writeFileSync(record,JSON.stringify(source,null,2));
}
console.log('N hair alpha mask exported');
