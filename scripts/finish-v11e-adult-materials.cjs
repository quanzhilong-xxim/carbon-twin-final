/* Carry reviewed unchanged V11d material lighting into new Blender exports.
 * Newly authored continuity materials retain their own PBR response. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const dir = path.resolve(__dirname, '../public/models/characters-v10');
function read(file) { const buffer = fs.readFileSync(path.join(dir,file)), length = buffer.readUInt32LE(12); return { buffer, length, gltf: JSON.parse(buffer.subarray(20,20+length)) }; }
for (const who of ['Student','Business','City']) {
  const prior = read(`CT_${who}_Explore_v11d.glb`).gltf;
  const exports = [];
  for (const tier of ['', '-portrait', '-lite']) {
    const file = `CT_${who}_Explore_v11e${tier}.glb`, { buffer, length, gltf } = read(file);
    for (const material of gltf.materials) {
      if (material.name === `V11e ${who} textured face skin`) {
        // Blender's exporter retained the image but omitted the Multiply
        // factor. State the source shader factor explicitly in portable PBR.
        material.pbrMetallicRoughness.baseColorFactor = who === 'Business' ? [.72,.55,.44,1] : [.85,.69,.60,1];
      }
      const source = prior.materials.find(candidate => candidate.name === material.name);
      if (!source || material.name.startsWith('V11e ')) continue;
      if (!source.extensions?.KHR_materials_unlit && material.extensions) delete material.extensions.KHR_materials_unlit;
      for (const property of ['baseColorFactor','metallicFactor','roughnessFactor']) {
        if (source.pbrMetallicRoughness?.[property] !== undefined) material.pbrMetallicRoughness[property] = source.pbrMetallicRoughness[property];
      }
    }
    gltf.asset.extras = { ...gltf.asset.extras, ctV11EFinish: true };
    const json=Buffer.from(JSON.stringify(gltf)), padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]), tail=buffer.subarray(20+length), header=Buffer.alloc(20);
    header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);header.write('JSON',16);
    const result=Buffer.concat([header,padded,tail]);fs.writeFileSync(path.join(dir,file),result);
    exports.push({ file, bytes:result.length, sha256:crypto.createHash('sha256').update(result).digest('hex') });
  }
  const meta=path.join(dir,`CT_${who}_Explore_v11e.sources.json`),record=JSON.parse(fs.readFileSync(meta));
  record.exports=exports;record.export_finish='scripts/finish-v11e-adult-materials.cjs';if(record.skin_continuity)record.skin_continuity.face_factor=who==='Business'?[.72,.55,.44]:[.85,.69,.60];fs.writeFileSync(meta,JSON.stringify(record,null,2));
  console.log(JSON.stringify({who,exports}));
}
