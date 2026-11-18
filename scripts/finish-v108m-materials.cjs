// Apply the established lit finish to every delivery tier, keeping source versions.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const dir = path.resolve(__dirname, '../public/models/characters-v10');
const revision = process.env.CT_OUTPUT_REVISION || 'v108m';
const rows = [];
for (const file of fs.readdirSync(dir).filter(name => name.startsWith(`CT_Student_Explore_${revision}`) && name.endsWith('.glb'))) {
  const target = path.join(dir, file), b = fs.readFileSync(target), size = b.readUInt32LE(12);
  const g = JSON.parse(b.subarray(20, 20 + size));
  if (g.asset.extras?.ctLitFinish === revision) throw Error('Already finished: ' + file);
  const changed = [];
  for (const m of g.materials) {
    if (/^(Body_00_SKIN|Face_00_SKIN|Hair_00_HAIR|HairBack_00_HAIR)$/.test(m.name)) {
      if (m.extensions) { delete m.extensions.KHR_materials_unlit; if (!Object.keys(m.extensions).length) delete m.extensions; }
      Object.assign(m.pbrMetallicRoughness, { metallicFactor: 0, roughnessFactor: m.name.includes('HAIR') ? .63 : .7 });
      if (m.name.includes('SKIN')) m.pbrMetallicRoughness.baseColorFactor = [.88, .70, .61, 1];
      changed.push(m.name);
    }
    if (m.name === 'CarbonTwin ivory ribbed inner jersey' && m.extensions?.KHR_materials_sheen) m.extensions.KHR_materials_sheen.sheenColorFactor = [.035, .033, .028];
  }
  if (!changed.length) throw Error('No expected materials: ' + file);
  g.asset.extras = { ...g.asset.extras, ctLitFinish: revision };
  const json = Buffer.from(JSON.stringify(g)), padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]), tail = b.subarray(20 + size), h = Buffer.alloc(20);
  h.write('glTF'); h.writeUInt32LE(2, 4); h.writeUInt32LE(20 + padded.length + tail.length, 8); h.writeUInt32LE(padded.length, 12); h.write('JSON', 16);
  const result = Buffer.concat([h, padded, tail]); fs.writeFileSync(target, result);
  rows.push({ file, changed, bytes: result.length, sha256: crypto.createHash('sha256').update(result).digest('hex') });
}
const meta = path.join(dir, `CT_Student_Explore_${revision}.sources.json`), record = JSON.parse(fs.readFileSync(meta));
record.export_finish = 'scripts/finish-v108m-materials.cjs';
record.refinements.push('All three tiers retain lit skin/hair PBR; warm reflectance and restrained knit sheen.');
record.exports = rows; fs.writeFileSync(meta, JSON.stringify(record, null, 2)); console.log(JSON.stringify(rows));
