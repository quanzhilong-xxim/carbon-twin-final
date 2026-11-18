// Preserve the reviewed W material settings on the new geometry-only export.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dir = path.resolve(__dirname, '../public/models/characters-v10');
function read(file) {
  const buffer = fs.readFileSync(path.join(dir, file));
  const length = buffer.readUInt32LE(12);
  return { buffer, length, gltf: JSON.parse(buffer.subarray(20, 20 + length)) };
}
const rows = [];
for (const tier of ['', '-portrait', '-lite']) {
  const old = read(`CT_Student_Explore_v108w${tier}.glb`).gltf;
  const file = `CT_Student_Explore_v11a${tier}.glb`;
  const { buffer, length, gltf } = read(file);
  if (gltf.asset.extras?.ctV11Finish) throw Error('Already finished: ' + file);
  for (const material of gltf.materials) {
    const previous = old.materials.find(m => m.name === material.name);
    if (!previous) continue;
    if (!previous.extensions?.KHR_materials_unlit && material.extensions) {
      delete material.extensions.KHR_materials_unlit;
      if (!Object.keys(material.extensions).length) delete material.extensions;
    }
    if (/SKIN|anime.*(EYE|FACE)|Eye/.test(material.name)) {
      for (const key of ['baseColorFactor', 'metallicFactor', 'roughnessFactor']) {
        if (previous.pbrMetallicRoughness?.[key] !== undefined) material.pbrMetallicRoughness[key] = previous.pbrMetallicRoughness[key];
      }
    }
  }
  gltf.asset.extras = { ...gltf.asset.extras, ctV11Finish: true };
  const json = Buffer.from(JSON.stringify(gltf));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const tail = buffer.subarray(20 + length);
  const header = Buffer.alloc(20);
  header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(20 + padded.length + tail.length, 8);
  header.writeUInt32LE(padded.length, 12); header.write('JSON', 16);
  const result = Buffer.concat([header, padded, tail]);
  fs.writeFileSync(path.join(dir, file), result);
  rows.push({ file, bytes: result.length, sha256: crypto.createHash('sha256').update(result).digest('hex') });
}
const meta = path.join(dir, 'CT_Student_Explore_v11a.sources.json');
const record = JSON.parse(fs.readFileSync(meta));
record.exports = rows;
record.export_finish = 'scripts/finish-v11-student.cjs';
fs.writeFileSync(meta, JSON.stringify(record, null, 2));
console.log(JSON.stringify(rows));
