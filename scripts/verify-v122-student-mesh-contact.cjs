// Independent CPU measurement of the actual exported pencil and paper meshes.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
(async()=>{
 const THREE=await import('three'),{GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const implementation=ts.transpileModule(fs.readFileSync('lib/visuals/studentPerformance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};new Function('require','module','exports',implementation)(require,mod,mod.exports);const results=[];
 for(const tier of ['','-portrait','-lite']){
  const file=`public/models/characters-v12-candidate/CT_Student_Explore_${process.env.CT_STUDENT_ART_REV||'v122w'}${tier}.glb`,b=fs.readFileSync(file),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  // This test runs no renderer and needs no textures or network.
  g.images=[];g.textures=[];g.materials=[];for(const mesh of g.meshes)for(const p of mesh.primitives)delete p.material;
  const json=Buffer.from(JSON.stringify(g)),pad=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),tail=b.subarray(20+b.readUInt32LE(12)),h=Buffer.alloc(20);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+pad.length+tail.length,8);h.writeUInt32LE(pad.length,12);h.write('JSON',16);const bytes=Buffer.concat([h,pad,tail]);
  const {scene:model}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
  const player=mod.exports.studentPerformance(model),pen=model.getObjectByName('V11_field_notebook_pen'),pages=model.getObjectByName('V11_notebook_pages');assert(pen?.isMesh&&pages?.isMesh);
  pen.geometry.computeBoundingBox();pages.geometry.computeBoundingBox();
  const size=pages.geometry.boundingBox.getSize(new THREE.Vector3()),thin=[size.x,size.y,size.z].indexOf(Math.min(size.x,size.y,size.z));
  const penSize=pen.geometry.boundingBox.getSize(new THREE.Vector3()),long=[penSize.x,penSize.y,penSize.z].indexOf(Math.max(penSize.x,penSize.y,penSize.z));
  const point=pen.geometry.boundingBox.getCenter(new THREE.Vector3());point.setComponent(long,pen.geometry.boundingBox.min.getComponent(long));
  const row={tier:tier||'standard',file,samples:[]};results.push(row);
  for(const reduced of [false,true]){
   for(let i=0;i<150;i++)player.update(1/60,'recording',reduced?2:1,reduced,false,new THREE.Vector2(),false);
   model.updateMatrixWorld(true);const endpoint=pages.worldToLocal(pen.localToWorld(point.clone()));
   const gap=endpoint.getComponent(thin)-pages.geometry.boundingBox.max.getComponent(thin);
   assert(gap>=0&&gap<.001,'Actual pencil endpoint must touch the actual page surface within 1mm');
   for(let axis=0;axis<3;axis++)if(axis!==thin){assert(endpoint.getComponent(axis)>pages.geometry.boundingBox.min.getComponent(axis));assert(endpoint.getComponent(axis)<pages.geometry.boundingBox.max.getComponent(axis));}
   const before=pen.matrixWorld.clone();player.update(1/60,'recording',reduced?2:1,reduced,true,new THREE.Vector2(),false);model.updateMatrixWorld(true);assert.deepEqual(pen.matrixWorld.elements,before.elements);
   row.samples.push({reduced,actualPenEndpointInPage:endpoint.toArray(),gapMetres:gap,paused:true});
  }
 }
 const out=path.resolve(process.env.CT_CONTACT_OUT||'outputs/v122/v122w-student-mesh-contact.json');fs.writeFileSync(out,JSON.stringify({at:new Date().toISOString(),passed:true,results},null,2));console.log(JSON.stringify({out,passed:true,tiers:results.length}));
})().catch(e=>{console.error(e);process.exitCode=1});
