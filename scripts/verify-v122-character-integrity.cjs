// Structural checks on actual shipped GLBs, independent of browser readiness.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),rev=process.env.CT_ART_REV||'v122f',results=[];
for(const role of ['Student','Business','City'])for(const tier of ['','-portrait','-lite']){
 const roleRevisions=JSON.parse(process.env.CT_ROLE_REVISIONS||'{}');
 const assetRevision=roleRevisions[role.toLowerCase()]||(role==='Student'&&process.env.CT_STUDENT_ART_REV?process.env.CT_STUDENT_ART_REV:rev);
 const file=path.join(root,`public/models/characters-v12-candidate/CT_${role}_Explore_${assetRevision}${tier}.glb`),b=fs.readFileSync(file);
 assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert(g.skins?.length>0);assert(g.meshes?.length>0);
 for(const node of g.nodes||[])for(const w of node.weights||[])assert.equal(w,0,role+' node starts with a non-neutral morph');
 for(const mesh of g.meshes){
  for(const w of mesh.weights||[])assert.equal(w,0,role+' mesh starts with a non-neutral morph');
  for(const p of mesh.primitives){assert(p.attributes.POSITION!==undefined);if(p.attributes.JOINTS_0!==undefined)assert(p.attributes.WEIGHTS_0!==undefined);}
 }
 for(const m of g.materials||[]){
  for(const value of Object.values(m))if(value&&typeof value==='object'&&Number.isInteger(value.texCoord))assert(value.texCoord>=0,'Invalid UV set');
  for(const value of Object.values(m.pbrMetallicRoughness||{}))if(value&&typeof value==='object'&&Number.isInteger(value.texCoord))assert(value.texCoord>=0,'Invalid PBR UV set');
 }
 for(const view of g.bufferViews||[])assert((view.byteOffset||0)+view.byteLength<=g.buffers[view.buffer].byteLength,'Out-of-bounds buffer');
 const morphs=g.meshes.flatMap(m=>m.extras?.targetNames||[]),nodes=new Set(g.nodes.map(n=>n.name));
 const required=role==='Student'?['Fcl_EYE_Close','Fcl_MTH_Joy','Fcl_BRW_Joy','Fcl_EYE_Joy','Fcl_BRW_Fun','Fcl_EYE_Surprised']:['BlinkLeft','BlinkRight','Smile','GazeLeft','GazeRight','GazeDown'];
 for(const name of required)assert(morphs.some(n=>n.endsWith(name)),'Missing runtime expression '+name);
 const minJoints=role==='Student'?100:52,joints=Math.max(...g.skins.map(s=>s.joints.length));assert(joints>=minJoints);
 const names=role==='Student'?['J_Bip_L_Hand','J_Bip_R_Index3','J_Bip_R_Thumb3']:['CT_Hand_R','CT_Index2_R','CT_Thigh_R','CT_Calf_R'];for(const n of names)assert(nodes.has(n),'Missing actual joint '+n);
 results.push({role,tier:tier||'standard',file,bytes:b.length,joints,neutralDefaults:true,requiredMorphs:required,sha256:crypto.createHash('sha256').update(b).digest('hex')});
}
const out=path.resolve(process.env.CT_INTEGRITY_OUT||`outputs/v122/${rev}-integrity.json`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({at:new Date().toISOString(),revision:rev,passed:true,results},null,2));console.log(JSON.stringify({out,passed:true,tiers:results.length}));
