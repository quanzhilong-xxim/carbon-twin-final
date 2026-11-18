// Retain the reviewed M face finish on Q's newly tailored, otherwise unchanged rig.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const dir = path.resolve(__dirname, '../public/models/characters-v10');
const revision = process.env.CT_CIVIC_FINISH_REVISION || 'v108q';
const read = file => { const b = fs.readFileSync(file); return { b, n: b.readUInt32LE(12), g: JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12))) }; };
const source = read(path.join(dir, 'CT_City_Explore_v108m.glb')).g.materials.find(m => m.name === 'V108l anime City Face_00_SKIN.001');
const exportsList = [];
for (const file of fs.readdirSync(dir).filter(n => n.startsWith('CT_City_Explore_' + revision) && n.endsWith('.glb'))) {
  const target = path.join(dir, file), { b, n, g } = read(target);
  if (g.asset.extras?.civicFinish === revision) throw Error('Already finished: ' + file);
  const face = g.materials.find(m => m.name === source.name);
  if (!face) throw Error('Expected civic face missing');
  if (face.extensions) { delete face.extensions.KHR_materials_unlit; if (!Object.keys(face.extensions).length) delete face.extensions; }
  Object.assign(face.pbrMetallicRoughness, { baseColorFactor: source.pbrMetallicRoughness.baseColorFactor, metallicFactor: 0, roughnessFactor: source.pbrMetallicRoughness.roughnessFactor });
  g.asset.extras = { ...g.asset.extras, civicFinish: revision };
  const json = Buffer.from(JSON.stringify(g)), padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]), tail = b.subarray(20 + n), h = Buffer.alloc(20);
  h.write('glTF'); h.writeUInt32LE(2, 4); h.writeUInt32LE(20 + padded.length + tail.length, 8); h.writeUInt32LE(padded.length, 12); h.write('JSON', 16);
  const result = Buffer.concat([h, padded, tail]); fs.writeFileSync(target, result);
  exportsList.push({ file, bytes: result.length, sha256: crypto.createHash('sha256').update(result).digest('hex') });
}
const meta = path.join(dir, 'CT_City_Explore_' + revision + '.sources.json'), record = JSON.parse(fs.readFileSync(meta));
record.export_finish = 'scripts/finish-v108q-civic.cjs'; record.exports = exportsList; fs.writeFileSync(meta, JSON.stringify(record, null, 2)); console.log(JSON.stringify(exportsList));
