// Recover retained VRM/PBR semantics without touching the source or old tiers.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'public/models/characters-v12-candidate'),rev=process.env.CT_ART_REV||'v122b';
const raw=path.join(root,'outputs/v122/raw-student-'+rev);fs.mkdirSync(raw,{recursive:true});
const read=file=>{const b=fs.readFileSync(file);return{b,g:JSON.parse(b.subarray(20,20+b.readUInt32LE(12)))};};
const rows=[];
for(const tier of ['','-portrait','-lite']){
 const file=path.join(dir,`CT_Student_Explore_${rev}${tier}.glb`),backup=path.join(raw,path.basename(file));
 if(fs.existsSync(backup))throw Error('Preserve raw export '+backup);
 const{b,g}=read(file),old=read(path.join(dir,`CT_Student_Explore_v12b${tier}.glb`)).g;
 for(const mesh of g.meshes)for(const weight of mesh.weights||[])assert.equal(weight,0,'All initial morphs must be neutral');
 for(const node of g.nodes)for(const weight of node.weights||[])assert.equal(weight,0,'All initial node morphs must be neutral');
 const face=g.meshes.find(m=>m.extras?.targetNames?.some(n=>n.endsWith('Fcl_EYE_Close')));
 assert(face,'Must retain blink and expression morphs');assert.equal(face.extras.targetNames.length,6);
 for(const m of g.materials){
  const prev=old.materials.find(x=>x.name===m.name);if(!prev)continue;
  if(!prev.extensions?.KHR_materials_unlit&&m.extensions){delete m.extensions.KHR_materials_unlit;if(!Object.keys(m.extensions).length)delete m.extensions;}
  if(/00_(SKIN|HAIR)/.test(m.name))for(const k of ['baseColorFactor','metallicFactor','roughnessFactor'])if(prev.pbrMetallicRoughness[k]!==undefined)m.pbrMetallicRoughness[k]=prev.pbrMetallicRoughness[k];
  if(/00_SKIN/.test(m.name)){m.pbrMetallicRoughness.roughnessFactor=.55;m.extensions={...m.extensions,KHR_materials_specular:{specularFactor:.25}};}
 }
 fs.copyFileSync(file,backup);g.extensionsUsed=[...new Set([...(g.extensionsUsed||[]),'KHR_materials_specular'])];
 g.asset.extras={...g.asset.extras,ctFinish:rev+'-physical-materials-neutral-morphs'};
 const json=Buffer.from(JSON.stringify(g)),p=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),tail=b.subarray(20+b.readUInt32LE(12)),h=Buffer.alloc(20);
 h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+p.length+tail.length,8);h.writeUInt32LE(p.length,12);h.write('JSON',16);
 const result=Buffer.concat([h,p,tail]);fs.writeFileSync(file,result);
 rows.push({file:path.basename(file),bytes:result.length,previousBytes:read(path.join(dir,`CT_Student_Explore_v12b${tier}.glb`)).b.length,morphs:face.extras.targetNames,neutral:true,sha256:crypto.createHash('sha256').update(result).digest('hex')});
}
const file=path.join(dir,`CT_Student_Explore_${rev}.sources.json`),record=JSON.parse(fs.readFileSync(file));record.exports=rows;record.export_finish='scripts/finish-v122b-student-export.cjs';fs.writeFileSync(file,JSON.stringify(record,null,2));console.log(JSON.stringify(rows,null,2));
