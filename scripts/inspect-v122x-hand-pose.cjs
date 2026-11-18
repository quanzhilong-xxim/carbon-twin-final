const fs=require('node:fs'),ts=require('typescript');
(async()=>{
 const THREE=await import('three'),{GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const b=fs.readFileSync('public/models/characters-v12-candidate/CT_Student_Explore_v122w.glb'),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 g.images=[];g.textures=[];g.materials=[];for(const m of g.meshes)for(const p of m.primitives)delete p.material;
 const j=Buffer.from(JSON.stringify(g)),pad=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]),tail=b.subarray(20+b.readUInt32LE(12)),h=Buffer.alloc(20);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+pad.length+tail.length,8);h.writeUInt32LE(pad.length,12);h.write('JSON',16);const buf=Buffer.concat([h,pad,tail]);
 const {scene:model}=await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.length),'');
 const src=ts.transpileModule(fs.readFileSync('lib/visuals/studentPerformance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',src)(require,m,m.exports);
 const rows=[];
 function read(pose){model.updateMatrixWorld(true);for(const side of ['L','R']){const hand=model.getObjectByName(`J_Bip_${side}_Hand`);rows.push({pose,side,pen:model.getObjectByName('V11_field_notebook_pen')?.position.toArray(),joints:['Thumb','Index','Middle','Ring','Little'].flatMap(finger=>[1,2,3].map(n=>{const o=model.getObjectByName(`J_Bip_${side}_${finger}${n}`);return {finger,n,position:hand.worldToLocal(o.getWorldPosition(new THREE.Vector3())).toArray(),quaternion:o.quaternion.toArray()};}))});}}
 read('rest');const player=m.exports.studentPerformance(model);for(let i=0;i<180;i++)player.update(1/60,'recording',1,false,false,new THREE.Vector2(),false);read('recording');fs.writeFileSync('outputs/v122/x-hand-pose.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.filter(r=>r.side==='R').map(r=>({...r,joints:r.joints.filter(j=>j.n!==2)}))));
})().catch(e=>{console.error(e);process.exitCode=1});
