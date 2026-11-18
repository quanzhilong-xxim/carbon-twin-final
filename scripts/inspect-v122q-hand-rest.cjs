const fs=require('node:fs'),THREE=require('three');
const b=fs.readFileSync('public/models/characters-v12-candidate/CT_Student_Explore_v122q.glb');const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
const objects=g.nodes.map(n=>{const o=new THREE.Object3D();o.name=THREE.PropertyBinding.sanitizeNodeName(n.name||'');if(n.matrix)o.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale)}return o});
g.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>objects[i].add(objects[c])));const root=new THREE.Group();g.scenes[g.scene||0].nodes.forEach(i=>root.add(objects[i]));root.updateMatrixWorld(true);
for(const side of ['R','L']){
 const hand=root.getObjectByName('J_Bip_'+side+'_Hand');
 console.log(JSON.stringify({side,joints:objects.filter(o=>new RegExp('J_Bip_'+side+'_(Thumb|Index|Middle|Ring|Little)[123]$').test(o.name)).map(o=>({name:o.name,local:hand.worldToLocal(o.getWorldPosition(new THREE.Vector3())).toArray(),length:o.children[0]?o.position.distanceTo(o.children[0].position):null}))}));
}
