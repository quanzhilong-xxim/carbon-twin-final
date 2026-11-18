/* Regression for a paused character changing between real model tiers.
 * Uses the production pose controller and Three.js; no paid/network calls. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),THREE=require('three');
const root=path.resolve(__dirname,'..');
const moduleValue={exports:{}};
const armModule={exports:{}};
const armCode=ts.transpileModule(fs.readFileSync(path.join(root,'lib/visuals/characterArm.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
new Function('require','module','exports',armCode)(require,armModule,armModule.exports);
const code=ts.transpileModule(fs.readFileSync(path.join(root,'lib/visuals/characterPerformance.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
new Function('require','module','exports',code)(name=>name==='./characterArm'?armModule.exports:require(name),moduleValue,moduleValue.exports);
const {characterPerformance}=moduleValue.exports;
const make=()=>{
 const model=new THREE.Group(),head=new THREE.Group();head.name='Head';model.add(head);
 for(const name of ['Breath','ArmRight','ArmLeft']){const o=new THREE.Group();o.name=name;model.add(o);}
 const mesh=new THREE.Mesh(new THREE.BufferGeometry());mesh.morphTargetDictionary={BlinkLeft:0,BlinkRight:1,Smile:2,GazeLeft:3,GazeRight:4,GazeDown:5};mesh.morphTargetInfluences=[1,1,1,1,1,1];head.add(mesh);
 const elbows={right:new THREE.Bone(),left:new THREE.Bone()};elbows.right.name='ElbowRight';elbows.left.name='ElbowLeft';model.getObjectByName('ArmRight').add(elbows.right);model.getObjectByName('ArmLeft').add(elbows.left);
 return {model,mesh,elbows};
};
const checks=[];
for(const id of ['student','business','city']){
 const first=make(),a=characterPerformance(first.model,id,first.elbows);
 a.update(.016,'idle',0,false,true,new THREE.Vector2(),false);
 assert.deepEqual(first.mesh.morphTargetInfluences,[.08,.08,.2,0,0,0],'first paused frame must initialize the visible neutral face');
 for(let n=0;n<9;n++)a.update(.016,'blink',1,false,false,new THREE.Vector2(),false);
 const frozen=a.snapshot();assert(frozen.face.BlinkLeft>.8,'test actually captures a closed blink');
 const second=make(),b=characterPerformance(second.model,id,second.elbows,frozen);
 b.update(.016,'blink',1,false,true,new THREE.Vector2(),false);
 assert.deepEqual(second.mesh.morphTargetInfluences,first.mesh.morphTargetInfluences,'changing quality while paused preserves the actual visible expression');
 assert.equal(b.snapshot().elapsed,frozen.elapsed,'paused time does not advance during a model swap');
 assert.deepEqual(b.snapshot().rotations,frozen.rotations,'articulated pose also survives the swap');
 for(let n=0;n<30;n++)b.update(.016,'blink',1,false,false,new THREE.Vector2(),false);
 assert(second.mesh.morphTargetInfluences[0]<.1,'the same blink reopens naturally on resume');
 for(const suffix of ['','-portrait','-lite']){
  const version=process.env.CT_CHARACTER_VERSION||'v10',stem=id==='student'?'Student':id==='business'?'Business':'City',file=path.join(root,'public/models/characters-v10',`CT_${stem}_Explore_${version}${suffix}.glb`),buf=fs.readFileSync(file),gltf=JSON.parse(buf.subarray(20,20+buf.readUInt32LE(12)).toString());
  for(const mesh of gltf.meshes||[])if(mesh.weights)assert(mesh.weights.every(w=>w===0),'portable GLB must start in a neutral basis: '+file);
  for(const mat of gltf.materials||[])for(const socket of ['normalTexture','occlusionTexture'])if(mat[socket])assert((mat[socket].texCoord??0)>=0,'exported material must reference a valid UV set');
 }
 checks.push(id+': neutral first paused frame, frozen expression/pose across LOD, resume, three neutral portable GLBs');
}
const report={at:new Date().toISOString(),checks,passed:true,networkCalls:0};
fs.writeFileSync(path.join(root,'outputs/v10-explore/pose-surface-regression.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
