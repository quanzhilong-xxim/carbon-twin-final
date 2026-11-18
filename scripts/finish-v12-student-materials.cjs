// Keep the raw Blender export; recover the reviewed lit material semantics.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'public/models/characters-v12-candidate'),rows=[];
function read(file){const b=fs.readFileSync(file);return{b,g:JSON.parse(b.subarray(20,20+b.readUInt32LE(12)))}};
for(const tier of ['','-portrait','-lite']){
 const source=path.join(dir,`CT_Student_Explore_v12a${tier}.glb`),dest=path.join(dir,`CT_Student_Explore_v12b${tier}.glb`);if(fs.existsSync(dest))throw Error('Preserve '+dest);
 const{b,g}=read(source),old=read(path.join(root,`public/models/characters-v10/CT_Student_Explore_v11e${tier}.glb`)).g;
 for(const m of g.materials){
  const previous=old.materials.find(x=>x.name===m.name);if(!previous)continue;
  if(!previous.extensions?.KHR_materials_unlit&&m.extensions){delete m.extensions.KHR_materials_unlit;if(!Object.keys(m.extensions).length)delete m.extensions;}
  if(/SKIN|HAIR/.test(m.name)){for(const k of ['baseColorFactor','metallicFactor','roughnessFactor'])if(previous.pbrMetallicRoughness[k]!==undefined)m.pbrMetallicRoughness[k]=previous.pbrMetallicRoughness[k];}
  if(/SKIN/.test(m.name)){m.pbrMetallicRoughness.roughnessFactor=.56;m.extensions={...m.extensions,KHR_materials_specular:{specularFactor:.26}};}
  if(/HAIR/.test(m.name))m.pbrMetallicRoughness.roughnessFactor=.62;
 }
 g.asset.extras={...g.asset.extras,ctV12StudentFinish:'v12b-lit-materials'};g.extensionsUsed=[...new Set([...(g.extensionsUsed||[]),'KHR_materials_specular'])];
 const j=Buffer.from(JSON.stringify(g)),p=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]),tail=b.subarray(20+b.readUInt32LE(12)),h=Buffer.alloc(20);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+p.length+tail.length,8);h.writeUInt32LE(p.length,12);h.write('JSON',16);const bytes=Buffer.concat([h,p,tail]);fs.writeFileSync(dest,bytes);rows.push({file:path.basename(dest),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
const record=JSON.parse(fs.readFileSync(path.join(dir,'CT_Student_Explore_v12a.sources.json')));Object.assign(record,{version:'v12b',parent_version:'v12a',editable_source:'CT_Student_Explore_v12a.blend',export_finish:'scripts/finish-v12-student-materials.cjs',exports:rows,status:'CANDIDATE_NOT_ACCEPTED'});fs.writeFileSync(path.join(dir,'CT_Student_Explore_v12b.sources.json'),JSON.stringify(record,null,2));console.log(JSON.stringify(rows));
