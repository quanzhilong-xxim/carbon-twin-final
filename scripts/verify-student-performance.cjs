/* Exercise the actual student controller without loading a browser or calling APIs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const THREE = require('three');
const source = fs.readFileSync(path.join(__dirname, '../lib/visuals/studentPerformance.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleValue = { exports: {} };
new Function('require', 'module', 'exports', compiled)(name => name.includes('SkeletonUtils') ? { clone: scene => scene.clone(true) } : require(name), moduleValue, moduleValue.exports);
const { studentPerformance } = moduleValue.exports;

function createModel() {
  const model = new THREE.Group();
  for (const name of ['J_Bip_L_UpperArm', 'J_Bip_R_UpperArm', 'J_Bip_L_LowerArm', 'J_Bip_R_LowerArm', 'J_Bip_C_Head', ...['L', 'R'].flatMap(side => ['Index', 'Middle', 'Ring', 'Little'].flatMap(finger => [1, 2, 3].map(joint => `J_Bip_${side}_${finger}${joint}`)))]) {
    const bone = new THREE.Bone(); bone.name = name; model.add(bone);
  }
  const face = new THREE.Mesh(new THREE.BufferGeometry());
  face.morphTargetDictionary = { Fcl_EYE_Close: 0, Fcl_MTH_Joy: 1 };
  face.morphTargetInfluences = [0, 0]; model.add(face);
  return { model, face };
}
const pointer = new THREE.Vector2();
const first = createModel(), controller = studentPerformance(first.model);
for (let i = 0; i < 30; i++) controller.update(.016, 'greeting', 1, false, false, pointer, false);
const snapshot = controller.snapshot(), arm = first.model.getObjectByName('J_Bip_R_UpperArm').quaternion.clone();
assert(snapshot.studentGesture.wave > .8, 'wave reaches its pose smoothly');
const second = createModel(), resumed = studentPerformance(second.model, snapshot);
assert(arm.angleTo(second.model.getObjectByName('J_Bip_R_UpperArm').quaternion) < 1e-6, 'recreated model restores the gesture');
resumed.update(.016, 'greeting', 1, false, true, pointer, false);
assert.deepEqual(resumed.snapshot(), snapshot, 'pause freezes gesture and elapsed time');
resumed.update(.016, 'blink', 2, true, false, pointer, false);
assert.equal(second.face.morphTargetInfluences[0], .85, 'reduced motion still shows the requested blink');
console.log('Student gesture continuity, pause, and reduced-motion blink passed.');
