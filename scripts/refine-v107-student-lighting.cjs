/* Create a reversible candidate with physically lit skin and hair materials. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const assets = path.join(__dirname, '../public/models/characters-v10');
const input = path.join(assets, 'CT_Student_Explore_v107b.glb');
const output = path.join(assets, 'CT_Student_Explore_v107c.glb');
const record = path.join(assets, 'CT_Student_Explore_v107c.sources.json');
if (fs.existsSync(output) || fs.existsSync(record)) throw new Error('Candidate already exists');

const source = fs.readFileSync(input);
if (source.toString('ascii', 0, 4) !== 'glTF' || source.readUInt32LE(4) !== 2) throw new Error('Expected GLB 2');
const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.subarray(20, 20 + jsonLength).toString('utf8'));
const changed = [];
for (const material of gltf.materials) {
  if (!/^(Body_00_SKIN|Face_00_SKIN|Hair_00_HAIR|HairBack_00_HAIR)$/.test(material.name)) continue;
  if (!material.extensions?.KHR_materials_unlit) throw new Error(`Expected unlit material: ${material.name}`);
  delete material.extensions.KHR_materials_unlit;
  if (!Object.keys(material.extensions).length) delete material.extensions;
  material.pbrMetallicRoughness.metallicFactor = 0;
  material.pbrMetallicRoughness.roughnessFactor = material.name.includes('HAIR') ? 0.62 : 0.72;
  changed.push(material.name);
}
if (changed.length !== 4) throw new Error(`Unexpected material count: ${changed.length}`);
const json = Buffer.from(JSON.stringify(gltf));
const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const rest = source.subarray(20 + jsonLength);
const header = Buffer.alloc(20);
header.write('glTF', 0, 'ascii');
header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + padded.length + rest.length, 8);
header.writeUInt32LE(padded.length, 12);
header.write('JSON', 16, 'ascii');
const result = Buffer.concat([header, padded, rest]);
fs.writeFileSync(output, result, { flag: 'wx' });
const previous = JSON.parse(fs.readFileSync(path.join(assets, 'CT_Student_Explore_v107b.sources.json'), 'utf8'));
previous.status = 'CANDIDATE_PENDING_VISUAL_REVIEW';
previous.parent_candidate = 'v107b';
previous.adaptations.push('converted skin and hair from unlit to lit PBR materials for isolated review');
previous.exports = [{ file: path.basename(output), bytes: result.length, sha256: crypto.createHash('sha256').update(result).digest('hex') }];
fs.writeFileSync(record, JSON.stringify(previous, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, changed, sha256: previous.exports[0].sha256 }));
