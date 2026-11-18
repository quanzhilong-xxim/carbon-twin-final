const fs = require('node:fs/promises'), path = require('node:path'), sharp = require('sharp');
const dir=path.resolve(__dirname,'../public/models/characters-v10');
const linear=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
async function inspect(who,revision,tier=''){
 const file=`CT_${who}_Explore_${revision}${tier}.glb`,buffer=await fs.readFile(path.join(dir,file)),length=buffer.readUInt32LE(12),gltf=JSON.parse(buffer.subarray(20,20+length));
 const faces=gltf.meshes.filter(mesh=>mesh.primitives.some(primitive=>primitive.targets?.length));
 const result={file,bytes:buffer.length,nodes:gltf.nodes.length,meshes:gltf.meshes.length,skinCount:(gltf.skins||[]).length,exportedSkinJoints:[...new Set((gltf.skins||[]).flatMap(skin=>skin.joints))].length,morphMeshes:faces.length,morphTargets:faces.map(mesh=>({name:mesh.name,targets:Math.max(...mesh.primitives.map(p=>p.targets?.length||0))})),scalpFibres:gltf.nodes.filter(n=>/^V11e scalp/.test(n.name)).length};
 const material=gltf.materials.find(m=>/Face_00_SKIN|textured face skin/.test(m.name));
 if(material?.pbrMetallicRoughness?.baseColorTexture){
  const pbr=material.pbrMetallicRoughness,t=gltf.textures[pbr.baseColorTexture.index],im=gltf.images[t.extensions?.EXT_texture_webp?.source??t.source],view=gltf.bufferViews[im.bufferView],data=buffer.subarray(28+length+(view.byteOffset||0),28+length+(view.byteOffset||0)+view.byteLength),stats=await sharp(data).stats(),factor=pbr.baseColorFactor||[1,1,1,1];
  result.faceSkin={material:material.name,factor,textureSrgbByteRange:stats.channels.slice(0,3).map(c=>({min:c.min,max:c.max,mean:c.mean})),linearReflectanceRange:stats.channels.slice(0,3).map((c,i)=>[linear(c.min/255)*factor[i],linear(c.max/255)*factor[i]])};
 }
 const shared=gltf.materials.find(m=>/matched face neck ears/.test(m.name));if(shared)result.matchedSkin=shared.pbrMetallicRoughness;
 return result;
}
(async()=>{
 const rows=[];for(const who of ['Student','Business','City'])for(const revision of ['v11d','v11e'])for(const tier of ['','-portrait','-lite']){
  try{rows.push(await inspect(who,revision,tier));}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 const out=path.resolve(process.env.CT_CHARACTER_ASSET_AUDIT_OUT||'outputs/v108/internal/v11-character-asset-audit.json');await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify({at:new Date().toISOString(),rows,limits:'Node/mesh/skin/morph counts and texture reflectance are asset facts; they do not establish visual equivalence to the reference.'},null,2));console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
