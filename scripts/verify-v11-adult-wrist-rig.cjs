/* Load actual adult GLB POSITION/index buffers and exercise the runtime rig. */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),T=require('three'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),moduleValue={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'lib/visuals/characterArm.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(require,moduleValue,moduleValue.exports);
function load(file){
 const b=fs.readFileSync(file),length=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+length)),bin=28+length;
 const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
 const attribute=i=>{const a=g.accessors[i],v=g.bufferViews[a.bufferView],ArrayType=types[a.componentType],array=new ArrayType(b.buffer,b.byteOffset+bin+(v.byteOffset||0)+(a.byteOffset||0),a.count*sizes[a.type]);return new T.BufferAttribute(array.slice(),sizes[a.type],a.normalized||false);};
 const nodes=g.nodes.map(n=>{let object=new T.Group();if(n.mesh!==undefined){const parts=g.meshes[n.mesh].primitives.map(p=>{const geometry=new T.BufferGeometry();geometry.setAttribute('position',attribute(p.attributes.POSITION));if(p.indices!==undefined)geometry.setIndex(attribute(p.indices));return new T.Mesh(geometry,new T.MeshStandardMaterial());});if(parts.length===1)object=parts[0];else parts.forEach(p=>object.add(p));}object.name=T.PropertyBinding.sanitizeNodeName(n.name||'');if(n.matrix)object.applyMatrix4(new T.Matrix4().fromArray(n.matrix));else{if(n.translation)object.position.fromArray(n.translation);if(n.rotation)object.quaternion.fromArray(n.rotation);if(n.scale)object.scale.fromArray(n.scale);}return object;});
 g.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>nodes[i].add(nodes[c])));const model=new T.Group();g.scenes[g.scene||0].nodes.forEach(i=>model.add(nodes[i]));return model;
}
const results=[];
for(const [who,id]of[['Business','business'],['City','city']])for(const tier of['','-lite']){
 const revision=id==='business'?(process.env.CT_ADULT_REVISION||'v11i'):(process.env.CT_CITY_REVISION||'v11g');
 const file=path.join(root,`public/models/characters-v10/CT_${who}_Explore_${revision}${tier}.glb`),source=load(file),rig=moduleValue.exports.articulatedCharacter(source,id);
 for(const side of['right','left']){
  const wrist=rig.wrists[side];assert(wrist?.isBone,'real wrist bone exists');
  const arm=rig.model.getObjectByName(side==='right'?'ArmRight':'ArmLeft');let hand;arm.traverse(o=>{if(o.isSkinnedMesh&&o.name.startsWith('Source_skin'))hand=o;});assert(hand,'actual hand geometry was bound');
  assert.equal(hand.skeleton.bones.length,3);assert.equal(hand.geometry.getAttribute('skinIndex').getX(0),2);assert.equal(hand.geometry.getAttribute('skinWeight').getX(0),1);
  const rest=hand.getVertexPosition(0,new T.Vector3());wrist.rotation.x=.35;rig.model.updateMatrixWorld(true);hand.skeleton.update();const posed=hand.getVertexPosition(0,new T.Vector3());assert(rest.distanceTo(posed)>.001,'wrist rotates real source skin vertices');wrist.rotation.x=0;
 }
 if(id==='city')assert.equal(rig.model.getObjectByName('HeldTablet').parent.name,'WristLeft','tablet moves with the actual holding wrist');
 results.push({who,tier:tier||'standard',runtimeBones:6,handVerticesActuallyDeformed:true,exportedHumanoidSkin:false});rig.dispose();
}
console.log(JSON.stringify({passed:true,results},null,2));
