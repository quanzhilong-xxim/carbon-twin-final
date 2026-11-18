// Evaluate exported skin/morph animation in Three.js without changing any asset.
const fs = require('node:fs');
const path = require('node:path');
const THREE = require('three');

async function loadGeometry(file) {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const raw = fs.readFileSync(file), length = raw.readUInt32LE(12);
  const json = JSON.parse(raw.subarray(20, 20 + length));
  // Textures are irrelevant to skin deformation; remove them from an in-memory
  // copy so the same exported vertex/skin/morph buffers can run without a DOM.
  for (const mesh of json.meshes) for (const p of mesh.primitives) delete p.material;
  delete json.materials; delete json.images; delete json.textures; delete json.samplers;
  const encoded = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(padded);
  const binary = raw.subarray(20 + length);
  const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length + binary.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const copy = Buffer.concat([header, padded, binary]);
  return new GLTFLoader().parseAsync(copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength), '');
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const file = process.env.CT_ATTACHMENT_ASSET || path.join(root, 'public/models/characters-v12-candidate/CT_Business_Explore_v123f.glb');
  const gltf = await loadGeometry(file), scene = gltf.scene;
  const head = scene.getObjectByName('CT_Head');
  const meshes = [];
  scene.traverse(o => { if (o.isSkinnedMesh && /native_head|native_eyes|optical|nose_bridge/.test(o.name)) meshes.push(o); });
  const report = { file, at: new Date().toISOString(), objects: meshes.map(o => o.name), clips: [] };
  const pos = new THREE.Vector3(), inv = new THREE.Matrix4();
  for (const clip of gltf.animations) {
    const mixer = new THREE.AnimationMixer(scene), action = mixer.clipAction(clip); action.play();
    const baselines = new Map(), row = { clip: clip.name, samples: [], maximumHeadLocalDisplacementM: {} };
    for (const time of [0, .6, 1.2, 1.833, 2.4, 3.2, clip.duration - .001]) {
      mixer.setTime(time); scene.updateMatrixWorld(true); inv.copy(head.matrixWorld).invert();
      const objects = [];
      for (const mesh of meshes) {
        mesh.skeleton.update();
        const count = mesh.geometry.attributes.position.count, points = [], center = new THREE.Vector3();
        let delta = 0;
        for (let v = 0; v < count; v++) {
          mesh.getVertexPosition(v, pos); pos.applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);
          points.push(pos.clone()); center.add(pos);
          if (baselines.has(mesh.name)) delta = Math.max(delta, pos.distanceTo(baselines.get(mesh.name)[v]));
        }
        if (!baselines.has(mesh.name)) baselines.set(mesh.name, points);
        row.maximumHeadLocalDisplacementM[mesh.name] = Math.max(row.maximumHeadLocalDisplacementM[mesh.name] || 0, delta);
        center.divideScalar(count);
        objects.push({ name: mesh.name, centerInHead: center.toArray(), maximumHeadLocalDisplacementM: delta, morphs: mesh.morphTargetInfluences });
      }
      row.samples.push({ time, objects });
    }
    mixer.stopAllAction(); mixer.uncacheRoot(scene); report.clips.push(row);
  }
  const out = process.env.CT_ATTACHMENT_EVIDENCE || path.join(root, 'work/v123-attachment-audit/head-local-deformation.json');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out, objects: report.objects, clips: report.clips.map(c => ({ clip: c.clip, maximumHeadLocalDisplacementM: c.maximumHeadLocalDisplacementM })) }));
})().catch(e => { console.error(e); process.exitCode = 1; });
