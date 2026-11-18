// Measure the real left finger surfaces against the actual notebook pages.
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
(async()=>{
 const T=await import('three'),{GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 let b=fs.readFileSync('public/models/characters-v12-candidate/CT_Student_Explore_v122ae.glb'),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 g.images=[];g.textures=[];g.materials=[];for(const m of g.meshes)for(const p of m.primitives)delete p.material;
 const j=Buffer.from(JSON.stringify(g)),pad=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]),tail=b.subarray(20+b.readUInt32LE(12)),h=Buffer.alloc(20);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+pad.length+tail.length,8);h.writeUInt32LE(pad.length,12);h.write('JSON',16);b=Buffer.concat([h,pad,tail]);
 const {scene:m}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');
 const code=ts.transpileModule(fs.readFileSync('lib/visuals/studentPerformance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,mod={exports:{}};new Function('require','module','exports',code)(require,mod,mod.exports);
 const player=mod.exports.studentPerformance(m);for(let i=0;i<180;i++)player.update(1/60,'recording',1,false,false,new T.Vector2(),false);m.updateMatrixWorld(true);
 const pages=m.getObjectByName('V11_notebook_pages');pages.geometry.computeBoundingBox();const box=pages.geometry.boundingBox;
 const size=box.getSize(new T.Vector3()),thin=[size.x,size.y,size.z].indexOf(Math.min(size.x,size.y,size.z)),axes=[0,1,2].filter(a=>a!==thin);
 const result={at:new Date().toISOString(),bounds:{min:box.min.toArray(),max:box.max.toArray()},fingers:[]};
 const hand=m.getObjectByName('V122ad_anatomical_student_hand_L');hand.skeleton.update();const pos=hand.geometry.getAttribute('position'),indices=hand.geometry.getAttribute('skinIndex'),weights=hand.geometry.getAttribute('skinWeight');
 for(const finger of ['Thumb','Index','Middle','Ring','Little']){
  const bones=hand.skeleton.bones.map((b,i)=>b.name.startsWith('J_Bip_L_'+finger)?i:-1).filter(i=>i>=0),samples=[],inside=[];
  for(let i=0;i<pos.count;i++){
   let w=0;for(let k=0;k<4;k++)if(bones.includes(indices.getComponent(i,k)))w+=weights.getComponent(i,k);if(w<.65)continue;
   const p=pages.worldToLocal(hand.localToWorld(hand.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(pos,i))));
   if(axes.every(a=>p.getComponent(a)>=box.min.getComponent(a)&&p.getComponent(a)<=box.max.getComponent(a))){samples.push(p.getComponent(thin));if(p.getComponent(thin)>box.min.getComponent(thin)+.0005&&p.getComponent(thin)<box.max.getComponent(thin)-.0005)inside.push(p.toArray());}
  }
  result.fingers.push({finger,overPage:samples.length,range:samples.length?[Math.min(...samples),Math.max(...samples)]:null,insidePaper:inside.length,intersectionBounds:inside.length?[0,1,2].map(a=>[Math.min(...inside.map(p=>p[a])),Math.max(...inside.map(p=>p[a]))]):null});
 }
 assert(result.fingers.every(f=>f.overPage>100&&f.insidePaper===0),'Actual weighted supporting fingers must stay out of the actual paper volume');
 const underside=Math.max(...result.fingers.filter(f=>f.finger!=='Thumb').map(f=>f.range[1]));
 assert(Math.abs(underside-box.min.getComponent(thin))<.003,'An actual supporting finger must reach the underside within 3mm');
 const thumb=result.fingers.find(f=>f.finger==='Thumb');assert(thumb.range[0]>=box.max.getComponent(thin)-.0005&&thumb.range[0]-box.max.getComponent(thin)<.006,'Thumb wraps above the actual edge within 6mm');
 result.passed=true;result.minimumUndersideGapMetres=box.min.getComponent(thin)-underside;
 fs.writeFileSync('outputs/v122/v122ae-support-surface.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1});
