// Refine only City V123b Wave. Meshes, skins, morphs and other clips are retained.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),THREE=require('three');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'public/models/characters-v12-candidate'),out=path.join(root,'work/v123e-city-wave');
fs.mkdirSync(out,{recursive:true});
const names=['CT_UpperArm_R','CT_Forearm_R','CT_Hand_R'];
const quintic=x=>x*x*x*(x*(x*6-15)+10);
function read(file){const raw=fs.readFileSync(file),n=raw.readUInt32LE(12);assert.equal(raw.toString('ascii',0,4),'glTF');return{raw,g:JSON.parse(raw.subarray(20,20+n)),bin:Buffer.from(raw.subarray(28+n))};}
function acc(a,index){const x=a.g.accessors[index],v=a.g.bufferViews[x.bufferView],width={SCALAR:1,VEC3:3,VEC4:4}[x.type];assert.equal(x.componentType,5126);const out=[];for(let i=0;i<x.count;i++)for(let k=0;k<width;k++)out.push(a.bin.readFloatLE((v.byteOffset||0)+(x.byteOffset||0)+i*(v.byteStride||4*width)+k*4));return out;}
function add(a,values,count,type){const padding=(4-a.bin.length%4)%4,offset=a.bin.length+padding,b=Buffer.alloc(values.length*4);values.forEach((v,i)=>b.writeFloatLE(v,i*4));a.bin=Buffer.concat([a.bin,Buffer.alloc(padding),b]);const vi=a.g.bufferViews.length;a.g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});const ai=a.g.accessors.length;a.g.accessors.push({bufferView:vi,componentType:5126,count,type});return ai;}
function write(a,file){a.g.buffers[0].byteLength=a.bin.length;let j=Buffer.from(JSON.stringify(a.g));j=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,0x20)]);const h=Buffer.alloc(20),bh=Buffer.alloc(8);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(28+j.length+a.bin.length,8);h.writeUInt32LE(j.length,12);h.write('JSON',16);bh.writeUInt32LE(a.bin.length);bh.write('BIN\0',4);fs.writeFileSync(file,Buffer.concat([h,j,bh,a.bin]));}
const reports=[];
for(const tier of ['','-portrait','-lite']){
 const original=path.join(dir,`CT_City_Explore_v123b${tier}.glb`),file=path.join(dir,`CT_City_Explore_v123e${tier}.glb`);assert(!fs.existsSync(file),'Preserve existing '+file);const a=read(original),wave=a.g.animations.find(x=>x.name==='Wave'),changes=[];
 for(const name of names){const channel=wave.channels.find(c=>a.g.nodes[c.target.node].name===name&&c.target.path==='rotation');assert(channel);const sampler=wave.samplers[channel.sampler],values=acc(a,sampler.output),q=Array.from({length:values.length/4},(_,i)=>new THREE.Quaternion().fromArray(values,i*4).normalize()),fixed=q.map(x=>x.clone()),last=q.length-1,lift=36,lower=last-36;
  for(let i=0;i<=lift;i++)fixed[i]=q[0].clone().slerp(q[lift],quintic(i/lift));
  for(let i=lower;i<=last;i++)fixed[i]=q[lower].clone().slerp(q[last],quintic((i-lower)/(last-lower)));
  // Make the quaternion hemisphere continuous; q and -q describe the same pose.
  for(let i=1;i<fixed.length;i++)if(fixed[i].dot(fixed[i-1])<0)fixed[i].set(-fixed[i].x,-fixed[i].y,-fixed[i].z,-fixed[i].w);
  let before=0,after=0;for(let i=1;i<q.length;i++){before=Math.max(before,q[i].angleTo(q[i-1]));after=Math.max(after,fixed[i].angleTo(fixed[i-1]));}assert(after<.115,'Unexpected angular jump');
  const data=fixed.flatMap(q=>q.toArray());sampler.output=add(a,data,fixed.length,'VEC4');sampler.interpolation='LINEAR';changes.push({bone:name,beforeMaxDegrees:before*180/Math.PI,afterMaxDegrees:after*180/Math.PI,endpointErrorRadians:Math.max(q[0].angleTo(fixed[0]),q[last].angleTo(fixed[last])),samples:fixed.length});
 }
 const r=a.g.nodes.find(n=>n.name==='CT_City_Explore_v123b');if(r)r.name='CT_City_Explore_v123e';wave.extras={...wave.extras,refinement:'V123e: right arm lift/return shortest quaternion path with quintic ease; original hold gesture, all morph tracks and feet retained'};
 write(a,file);reports.push({tier:tier||'standard',file,bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),changes});
}
fs.writeFileSync(path.join(out,'quaternion-edit.json'),JSON.stringify({at:new Date().toISOString(),parent:'v123b',revision:'v123e',reports},null,2));console.log(JSON.stringify(reports));
