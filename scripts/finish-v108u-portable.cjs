const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../public/models/characters-v10');
function read(file){const b=fs.readFileSync(path.join(dir,file)),n=b.readUInt32LE(12);return{b,n,g:JSON.parse(b.subarray(20,20+n))};}
for(const [who,rev]of[['Student','v108p'],['Business','v108n'],['City','v108t']]){
 const source=read(`CT_${who}_Explore_${rev}.glb`).g;const rows=[];
 for(const tier of['','-portrait','-lite']){
  const file=`CT_${who}_Explore_v108u${tier}.glb`,{b,n,g}=read(file);if(g.asset.extras?.ctFinishU)throw Error('Already finished '+file);
  for(const m of g.materials){const old=source.materials.find(s=>s.name===m.name);if(!old)continue;
   if(!old.extensions?.KHR_materials_unlit&&m.extensions){delete m.extensions.KHR_materials_unlit;if(!Object.keys(m.extensions).length)delete m.extensions;}
   if(/SKIN|anime.*(EYE|FACE)|Eye/.test(m.name)){for(const k of['baseColorFactor','metallicFactor','roughnessFactor'])if(old.pbrMetallicRoughness?.[k]!==undefined)m.pbrMetallicRoughness[k]=old.pbrMetallicRoughness[k];}
  }
  g.asset.extras={...g.asset.extras,ctFinishU:true};const j=Buffer.from(JSON.stringify(g)),p=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]),tail=b.subarray(20+n),h=Buffer.alloc(20);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+p.length+tail.length,8);h.writeUInt32LE(p.length,12);h.write('JSON',16);const result=Buffer.concat([h,p,tail]);fs.writeFileSync(path.join(dir,file),result);rows.push({file,bytes:result.length,sha256:crypto.createHash('sha256').update(result).digest('hex')});
 }
 const meta=path.join(dir,`CT_${who}_Explore_v108u.sources.json`),record=JSON.parse(fs.readFileSync(meta));record.exports=rows;record.export_finish='scripts/finish-v108u-portable.cjs';fs.writeFileSync(meta,JSON.stringify(record,null,2));console.log(JSON.stringify({who,exports:rows}));
}
