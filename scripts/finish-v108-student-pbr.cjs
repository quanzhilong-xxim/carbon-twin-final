// Deterministic glTF material finish after Blender export; no remote calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../public/models/characters-v10');
const revision=process.env.CT_OUTPUT_REVISION||'v108';
const file=path.join(dir,`CT_Student_Explore_${revision}.glb`);
const b=fs.readFileSync(file),length=b.readUInt32LE(12);
const g=JSON.parse(b.subarray(20,20+length));
if(g.asset.extras?.ctFinish==='v108')throw Error('Finish already applied');
for(const m of g.materials){
 if(/^(Body_00_SKIN|Face_00_SKIN|Hair_00_HAIR|HairBack_00_HAIR)$/.test(m.name)){
  if(m.extensions){delete m.extensions.KHR_materials_unlit;if(!Object.keys(m.extensions).length)delete m.extensions;}
  m.pbrMetallicRoughness.metallicFactor=0;
  m.pbrMetallicRoughness.roughnessFactor=m.name.includes('HAIR')?.63:.7;
  if(m.name.includes('SKIN'))m.pbrMetallicRoughness.baseColorFactor=[.88,.70,.61,1];
 }
 if(m.name==='CarbonTwin ivory ribbed inner jersey'&&m.extensions?.KHR_materials_sheen)m.extensions.KHR_materials_sheen.sheenColorFactor=[.035,.033,.028];
}
g.asset.extras={...g.asset.extras,ctFinish:'v108'};
const json=Buffer.from(JSON.stringify(g)),padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),rest=b.subarray(20+length),h=Buffer.alloc(20);
h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+padded.length+rest.length,8);h.writeUInt32LE(padded.length,12);h.write('JSON',16);
const result=Buffer.concat([h,padded,rest]);fs.writeFileSync(file,result);
const meta=path.join(dir,`CT_Student_Explore_${revision}.sources.json`),record=JSON.parse(fs.readFileSync(meta));
record.refinements.push('export finish: lit PBR skin and hair, warm skin reflectance, restrained knit sheen');
record.export_finish='scripts/finish-v108-student-pbr.cjs';
record.exports=[{file:path.basename(file),bytes:result.length,sha256:crypto.createHash('sha256').update(result).digest('hex')}];
fs.writeFileSync(meta,JSON.stringify(record,null,2));console.log(JSON.stringify(record.exports));
