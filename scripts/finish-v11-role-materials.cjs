const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const dir = path.resolve(__dirname, '../public/models/characters-v10');
const revision = process.argv[2] || 'v11b';
if (!['v11b', 'v11c', 'v11d'].includes(revision)) throw Error('Unknown revision');
function read(file) {
  const b = fs.readFileSync(path.join(dir, file)), n = b.readUInt32LE(12);
  return { b, n, g: JSON.parse(b.subarray(20, 20 + n)) };
}
for (const who of ['Student', 'Business', 'City']) {
  const source = read(`CT_${who}_Explore_v108w.glb`).g;
  const rows = [];
  for (const tier of ['', '-portrait', '-lite']) {
    const file = `CT_${who}_Explore_${revision}${tier}.glb`, { b, n, g } = read(file);
    if (g.asset.extras?.ctRoleFinish === revision || revision === 'v11b' && g.asset.extras?.ctV11BFinish) throw Error('Already finished ' + file);
    for (const material of g.materials) {
      const old = source.materials.find(m => m.name === material.name);
      if (old && !old.extensions?.KHR_materials_unlit && material.extensions) {
        delete material.extensions.KHR_materials_unlit;
        if (!Object.keys(material.extensions).length) delete material.extensions;
      }
      if (/SKIN|skin|complexion|softly lit civic neck/.test(material.name)) {
        material.pbrMetallicRoughness = { ...material.pbrMetallicRoughness,
          baseColorFactor: who === 'Student' ? [.75,.52,.40,1] : who === 'Business' ? [.67,.435,.31,1] : [.78,.565,.445,1],
          metallicFactor: 0, roughnessFactor: .62 };
      } else if (old && /anime.*(EYE|FACE)|Eye/.test(material.name)) {
        for (const key of ['baseColorFactor', 'metallicFactor', 'roughnessFactor'])
          if (old.pbrMetallicRoughness?.[key] !== undefined) material.pbrMetallicRoughness[key] = old.pbrMetallicRoughness[key];
      }
    }
    g.asset.extras = { ...g.asset.extras, ctRoleFinish: revision };
    const json = Buffer.from(JSON.stringify(g)), padded = Buffer.concat([json, Buffer.alloc((4-json.length%4)%4,32)]), tail = b.subarray(20+n), header = Buffer.alloc(20);
    header.write('glTF'); header.writeUInt32LE(2,4); header.writeUInt32LE(20+padded.length+tail.length,8); header.writeUInt32LE(padded.length,12); header.write('JSON',16);
    const result = Buffer.concat([header,padded,tail]); fs.writeFileSync(path.join(dir,file),result);
    rows.push({ file, bytes: result.length, sha256: crypto.createHash('sha256').update(result).digest('hex') });
  }
  const meta = path.join(dir,`CT_${who}_Explore_${revision}.sources.json`), record = JSON.parse(fs.readFileSync(meta));
  record.exports = rows; record.export_finish = 'scripts/finish-v11-role-materials.cjs';
  fs.writeFileSync(meta,JSON.stringify(record,null,2)); console.log(JSON.stringify({who,exports:rows}));
}
