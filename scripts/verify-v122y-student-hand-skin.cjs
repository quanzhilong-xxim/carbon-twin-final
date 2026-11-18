// Re-import shipped skins and measure their real deformed vertices, without WebGL.
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
(async()=>{
 const THREE=await import('three'),{GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const source=ts.transpileModule(fs.readFileSync('lib/visuals/studentPerformance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,mod={exports:{}};new Function('require','module','exports',source)(require,mod,mod.exports);
 const reports=[];let reference;const revision=process.env.CT_STUDENT_ART_REV||'v122y';
 for(const tier of ['','-portrait','-lite']){
  const b=fs.readFileSync(`public/models/characters-v12-candidate/CT_Student_Explore_${revision}${tier}.glb`),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  const paintedSkin=g.materials.find(m=>m.name.includes('softly lit Face_00_SKIN'));assert(paintedSkin&&!paintedSkin.extensions?.KHR_materials_unlit,'Face must respond to the scene lights');
  g.images=[];g.textures=[];g.materials=[];for(const m of g.meshes)for(const p of m.primitives)delete p.material;
  const j=Buffer.from(JSON.stringify(g)),pad=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]),tail=b.subarray(20+b.readUInt32LE(12)),h=Buffer.alloc(20);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+pad.length+tail.length,8);h.writeUInt32LE(pad.length,12);h.write('JSON',16);const buf=Buffer.concat([h,pad,tail]);
  const {scene:model}=await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.length),'');
  const hands=[];model.traverse(o=>{if(o.isSkinnedMesh&&/anatomical_student_hand/.test(o.name))hands.push(o)});assert.equal(hands.length,2);
  const samples=[];
  for(const hand of hands){
   const indices=hand.geometry.getAttribute('skinIndex'),weights=hand.geometry.getAttribute('skinWeight');
   for(let i=0;i<weights.count;i++){const sum=[0,1,2,3].reduce((n,k)=>n+weights.getComponent(i,k),0);assert(Math.abs(sum-1)<.001,'Every hand vertex needs normalized real skin weights');}
   for(const finger of ['Thumb','Index','Middle','Ring','Little'])for(const joint of [1,2,3]){
    const side=hand.name.endsWith('_L')?'L':'R',name=`J_Bip_${side}_${finger}${joint}`,index=hand.skeleton.bones.findIndex(b=>b.name===name);assert(index>=0);
    let best=-1,weight=0;for(let i=0;i<weights.count;i++)for(let k=0;k<4;k++)if(indices.getComponent(i,k)===index&&weights.getComponent(i,k)>weight){best=i;weight=weights.getComponent(i,k);}
    assert(weight>.45,`${name} must deform an actual surface`);samples.push({name,hand,index:best,rest:hand.skeleton.bones[index].quaternion.clone()});
   }
  }
  const positions=()=>{model.updateMatrixWorld(true);for(const hand of hands)hand.skeleton.update();return samples.map(s=>s.hand.localToWorld(s.hand.applyBoneTransform(s.index,new THREE.Vector3().fromBufferAttribute(s.hand.geometry.getAttribute('position'),s.index))).toArray());};
  const player=mod.exports.studentPerformance(model);const before=positions();for(let i=0;i<180;i++)player.update(1/60,'recording',1,false,false,new THREE.Vector2(),false);
  const held=positions();assert(held.some((p,i)=>p.some((v,k)=>Math.abs(v-before[i][k])>.01)),'Retargeted skin must actually move');
  for(const sample of samples.filter(s=>/Index3|Middle3/.test(s.name))){const bone=model.getObjectByName(sample.name);assert(bone.quaternion.angleTo(sample.rest)<.98,'Distal finger joint must stay inside its flex limit');}
  for(let i=0;i<60;i++)player.update(1/60,'recording',1,false,true,new THREE.Vector2(),false);assert.deepEqual(positions(),held,'Paused hand surfaces must remain frozen');
  if(reference)for(let i=0;i<held.length;i++)assert(Math.hypot(...held[i].map((v,k)=>v-reference[i][k]))<.003,'The same native hand topology and held pose must survive the LOD change');else reference=held;
  reports.push({tier:tier||'standard',hands:hands.length,weightedFingerJoints:samples.length,paused:true,physicallyLitFace:true,weightedVertexSamples:held});
 }
 const result={at:new Date().toISOString(),revision,passed:true,reports};fs.writeFileSync(`outputs/v122/${revision}-student-hand-skin.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,tiers:reports.length,weightedFingerJoints:reports[0].weightedFingerJoints}));
})().catch(e=>{console.error(e);process.exitCode=1});
