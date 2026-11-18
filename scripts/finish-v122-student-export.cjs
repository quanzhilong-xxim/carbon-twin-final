// Match retained VRM material semantics while keeping the new cloth/hair art.
// Keep every untouched Blender export as a recoverable raw file.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'public/models/characters-v12-candidate'),raw=path.join(root,'outputs/v122/raw-student-exports');
fs.mkdirSync(raw,{recursive:true});
const read=file=>{const bytes=fs.readFileSync(file);return{bytes,g:JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)))};};
const exportsList=[];
for(const tier of ['','-portrait','-lite']){
 const file=path.join(dir,`CT_Student_Explore_v122a${tier}.glb`),backup=path.join(raw,path.basename(file));
 if(fs.existsSync(backup))throw Error('Already finished; preserve '+backup);
 fs.copyFileSync(file,backup);
 const{bytes,g}=read(file),old=read(path.join(dir,`CT_Student_Explore_v12b${tier}.glb`)).g;
 for(const m of g.materials){
  const previous=old.materials.find(x=>x.name===m.name);
  if(previous&&!previous.extensions?.KHR_materials_unlit&&m.extensions){delete m.extensions.KHR_materials_unlit;if(!Object.keys(m.extensions).length)delete m.extensions;}
  if(previous&&/00_(SKIN|HAIR)/.test(m.name))for(const k of ['baseColorFactor','metallicFactor','roughnessFactor'])if(previous.pbrMetallicRoughness[k]!==undefined)m.pbrMetallicRoughness[k]=previous.pbrMetallicRoughness[k];
  if(/00_SKIN/.test(m.name)){m.pbrMetallicRoughness.roughnessFactor=.55;m.extensions={...m.extensions,KHR_materials_specular:{specularFactor:.25}};}
 }
 g.extensionsUsed=[...new Set([...(g.extensionsUsed||[]),'KHR_materials_specular'])];
 g.asset.extras={...g.asset.extras,ctFinish:'v122a-physical-material-semantics'};
 const json=Buffer.from(JSON.stringify(g)),padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),tail=bytes.subarray(20+bytes.readUInt32LE(12)),h=Buffer.alloc(20);
 h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+padded.length+tail.length,8);h.writeUInt32LE(padded.length,12);h.write('JSON',16);
 const result=Buffer.concat([h,padded,tail]);fs.writeFileSync(file,result);
 exportsList.push({file:path.basename(file),bytes:result.length,sha256:crypto.createHash('sha256').update(result).digest('hex')});
}
const recordFile=path.join(dir,'CT_Student_Explore_v122a.sources.json'),record=JSON.parse(fs.readFileSync(recordFile));record.exports=exportsList;record.export_finish='scripts/finish-v122-student-export.cjs';fs.writeFileSync(recordFile,JSON.stringify(record,null,2));console.log(JSON.stringify(exportsList));
