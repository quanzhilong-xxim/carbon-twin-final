const fs=require('node:fs'),ts=require('typescript');
(async()=>{
 const THREE=await import('three'),{GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const source=fs.readFileSync('lib/visuals/studentPerformance.ts','utf8').replace(/import \{ clone \} from 'three\/examples\/jsm\/utils\/SkeletonUtils.js';/,'const clone = source => source.clone(true);');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};new Function('require','module','exports',compiled)(require,mod,mod.exports);
 const b=fs.readFileSync('public/models/characters-v12-candidate/CT_Student_Explore_v122q.glb');
 // Hide embedded texture sources during the numeric, CPU-only inspection.
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));g.images=[];g.textures=[];g.materials=[];for(const m of g.meshes)for(const p of m.primitives)delete p.material;
 const json=Buffer.from(JSON.stringify(g)),pad=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),tail=b.subarray(20+b.readUInt32LE(12)),h=Buffer.alloc(20);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+pad.length+tail.length,8);h.writeUInt32LE(pad.length,12);h.write('JSON',16);const bytes=Buffer.concat([h,pad,tail]);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');const model=gltf.scene;
 const player=mod.exports.studentPerformance(model);for(let i=0;i<120;i++)player.update(1/60,'recording',1,false,false,new THREE.Vector2(),false);
 const book=model.getObjectByName('Student open field notebook');const info={contact:model.userData.studentContact,book:{position:book.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:book.getWorldQuaternion(new THREE.Quaternion()).toArray(),parts:book.children.map(o=>({name:o.name,position:o.position.toArray(),bounds:new THREE.Box3().setFromObject(o).applyMatrix4(book.matrixWorld.clone().invert())}))},hands:[]};
 for(const side of ['L','R']){
  const hand=model.getObjectByName('J_Bip_'+side+'_Hand');info.hands.push({side,position:hand.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:hand.getWorldQuaternion(new THREE.Quaternion()).toArray(),joints:['Thumb3','Index3','Middle3','Little3'].map(n=>{const o=model.getObjectByName('J_Bip_'+side+'_'+n),p=o.getWorldPosition(new THREE.Vector3());return{name:n,world:p.toArray(),book:book.worldToLocal(p.clone()).toArray(),palm:hand.worldToLocal(p.clone()).toArray()}})});
 }
 model.traverse(o=>{if(/V11_field_notebook_pen/.test(o.name)&&o.geometry){o.geometry.computeBoundingBox();info.pen={name:o.name,bounds:o.geometry.boundingBox,position:o.position.toArray(),scale:o.getWorldScale(new THREE.Vector3()).toArray()}}});
 console.log(JSON.stringify(info,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
