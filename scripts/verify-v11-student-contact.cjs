/* Run production IK on the exported GLB node hierarchy, including sanitized
 * names. This verifies the real bone lengths and prop offsets, not a toy rig. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const THREE = require('three');
const root = path.resolve(__dirname, '..');
const implementation = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/visuals/studentPerformance.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const value = { exports: {} };
new Function('require', 'module', 'exports', implementation)(name => name.includes('SkeletonUtils') ? { clone: model => model.clone(true) } : require(name), value, value.exports);

function exportedHierarchy(file) {
  const buffer = fs.readFileSync(file);
  const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
  const objects = gltf.nodes.map(node => {
    const object = new THREE.Object3D();
    object.name = THREE.PropertyBinding.sanitizeNodeName(node.name || '');
    object.userData = node.extras || {};
    if (node.matrix) object.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix));
    else {
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
    }
    return object;
  });
  gltf.nodes.forEach((node, index) => (node.children || []).forEach(child => objects[index].add(objects[child])));
  const model = new THREE.Group();
  gltf.scenes[gltf.scene || 0].nodes.forEach(index => model.add(objects[index]));
  return { model, objects };
}

const results = [];
for (const tier of ['', '-portrait', '-lite']) {
  const file = path.join(root, `public/models/characters-v10/CT_Student_Explore_${process.env.CT_STUDENT_REVISION || 'v11d'}${tier}.glb`);
  const { model, objects } = exportedHierarchy(file);
  const controller = value.exports.studentPerformance(model);
  const props = objects.filter(object => /^V11_(notebook|field_notebook)/.test(object.name));
  assert.equal(props.length, 13, 'actual export must include all notebook parts and pen');
  assert(props.every(prop => !prop.visible), 'recording meshes start hidden after GLTFLoader sanitizes names');
  const pointer = new THREE.Vector2();
  for (let frame = 0; frame < 180; frame++) controller.update(1 / 60, 'recording', 1, false, false, pointer, false);
  assert(props.every(prop => prop.visible), 'all source props appear in the recording pose');
  const contact = { ...model.userData.studentContact };
  if (process.env.CT_STUDENT_HAND_DIAG === '1' && !tier) {
    for (const side of ['L','R']) {
      const hand = model.getObjectByName(`J_Bip_${side}_Hand`);
      console.log(side, objects.filter(object => new RegExp(`J_Bip_${side}_(Index|Thumb)[123]$`).test(object.name)).map(object => ({ name:object.name, handLocal:hand.worldToLocal(object.getWorldPosition(new THREE.Vector3())).toArray() })));
    }
  }
  assert(contact.notebookGrip < .001, `notebook IK contact must be within 1mm: ${JSON.stringify(contact)}`);
  assert(contact.writingTip < .001, `pen tip must reach the source page within 1mm: ${JSON.stringify(contact)}`);
  const before = controller.snapshot();
  controller.update(1 / 60, 'recording', 1, false, true, pointer, false);
  assert.deepEqual(controller.snapshot(), before, 'pause retains exact writing pose');
  assert.deepEqual(model.userData.studentContact, contact, 'pause retains hand contact');
  for (let frame = 0; frame < 180; frame++) controller.update(1 / 60, 'idle', 2, false, false, pointer, false);
  assert(props.every(prop => !prop.visible), 'notebook and pen disappear after returning to idle');
  assert.equal(model.userData.studentContact,undefined,'idle clears contact measurements once the recording meshes hide');
  results.push({ tier: tier || 'standard', props: props.length, contactMetres: contact });
}
console.log(JSON.stringify({ passed: true, tests: results }, null, 2));
