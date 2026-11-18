import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** A new public-space composition using Light Court's retained surface recipes.
 * Source GLTF geometry, transforms and materials stay untouched. */
export function makeWaterfrontLandscape(kit: THREE.Group) {
  const source=new Map<string,THREE.MeshStandardMaterial>();
  kit.traverse(object=>{if(object instanceof THREE.Mesh)for(const m of Array.isArray(object.material)?object.material:[object.material])if(m instanceof THREE.MeshStandardMaterial)source.set(m.name,m);});
  const surface=(name:string,color:string,roughness=.7)=>{const m=source.get(name)?.clone()??new THREE.MeshStandardMaterial();m.color.set(color);m.roughness=roughness;return m;};
  const wood=surface('v12-wood','#a18d70'),stone=surface('v12-stone','#c0b9a5'),bronze=surface('v12-bronze','#64716b',.35);
  const soil=surface('v12-soil','#4a4737'),leaf=surface('v12-leaf-a','#6f8257',.88),flower=surface('v12-cloth','#d4c5a1');
  leaf.side=THREE.DoubleSide;
  const glass=new THREE.MeshPhysicalMaterial({color:'#c6dbd6',metalness:.12,roughness:.1,transparent:true,opacity:.32,depthWrite:false,clearcoat:1,envMapIntensity:1.2,side:THREE.DoubleSide});
  const light=new THREE.MeshStandardMaterial({color:'#f2dcb6',emissive:'#f5c986',emissiveIntensity:.1,roughness:.4});
  const materials=[wood,stone,bronze,soil,leaf,flower,glass,light],buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();
  const q=new THREE.Quaternion(),matrix=new THREE.Matrix4(),v=new THREE.Vector3(),unit=new THREE.Vector3(1,1,1);
  const add=(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,angle=0)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),angle);matrix.compose(v.set(x,y,z),q,unit);g.applyMatrix4(matrix);const list=buckets.get(m)??[];list.push(g);buckets.set(m,list);};
  const box=(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
  const cylinder=(m:THREE.Material,x:number,y:number,z:number,r:number,h:number)=>add(new THREE.CylinderGeometry(r,r,h,16),m,x,y,z);
  function chair(x:number,z:number,angle:number) {
    const forward=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
    cylinder(wood,x,.53,z,.28,.09);
    for(const sign of [-1,1])for(const edge of [-1,1])box(bronze,x+sign*.19,.27,z+edge*.19,.035,.5,.035);
    const back=new THREE.TorusGeometry(.28,.024,5,16,Math.PI);back.rotateX(Math.PI/2);back.rotateZ(Math.PI/2);
    add(back,bronze,x-forward.x*.22,.78,z-forward.z*.22,angle);
    for(const side of [-1,1])box(bronze,x+Math.cos(angle)*side*.24-forward.x*.22,.72,z-Math.sin(angle)*side*.24-forward.z*.22,.025,.44,.025);
  }
  for(const x of [-42,42]) {
    // A flush paved terrace, four slender columns, glass and timber shade layers.
    box(stone,x,.095,6.4,7.6,.15,4.1);
    for(let joint=0;joint<15;joint++)box(bronze,x-3.5+joint*.5,.174,6.4,.012,.008,4);
    for(const dx of [-3.2,3.2])for(const dz of [-1.55,1.55])box(bronze,x+dx,1.58,6.4+dz,.095,2.8,.095);
    for(const dz of [-1.65,1.65])box(bronze,x,3.03,6.4+dz,7.25,.14,.12);
    box(glass,x,3.08,6.4,7.2,.035,3.4);
    for(let slat=0;slat<25;slat++)box(wood,x-3.48+slat*.29,3.15,6.4,.075,.13,3.55);
    box(light,x,2.96,6.4,5.6,.035,.07);
    for(const dx of [-1.65,1.65]) {
      cylinder(wood,x+dx,.88,6.4,.58,.07);cylinder(bronze,x+dx,.5,6.4,.045,.73);cylinder(bronze,x+dx,.21,6.4,.28,.035);
      for(let i=0;i<3;i++){const angle=i*Math.PI*2/3;chair(x+dx+Math.sin(angle)*.95,6.4+Math.cos(angle)*.95,angle+Math.PI);}
    }
  }
  // Recessed rain gardens leave the existing trees, benches and path clear.
  for(const x of [-28.7,28.7]) {
    box(stone,x,.22,6,4,.35,1.65);box(soil,x,.405,6,3.75,.025,1.4);
    for(let tuft=0;tuft<28;tuft++) {
      const px=x-1.68+(tuft%7)*.56,pz=5.48+Math.floor(tuft/7)*.34;
      for(let blade=0;blade<7;blade++) {
        const a=blade*2.39996+tuft, h=.28+(tuft*13+blade*7)%11*.025,lean=.12+(blade%3)*.035;
        const positions:number[]=[],uv:number[]=[];
        for(let step=0;step<=4;step++) {
          const t=step/4,width=.025*(1-t)+.002;
          for(const side of [-1,1]){positions.push(Math.sin(a)*lean*t*t+Math.cos(a)*width*side,h*t,Math.cos(a)*lean*t*t-Math.sin(a)*width*side);uv.push(side===-1?0:1,t);}
        }
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
        const indices:number[]=[];for(let step=0;step<4;step++){const i=step*2;indices.push(i,i+1,i+2,i+1,i+3,i+2);}g.setIndex(indices);g.computeVertexNormals();add(g,leaf,px,.42,pz);
      }
      if(tuft%4===0){cylinder(leaf,px,.68,pz,.008,.5);add(new THREE.SphereGeometry(.045,6,4),flower,px,.94,pz);}
    }
  }
  const group=new THREE.Group();group.name='Light-Court-surface-waterfront-pavilions';
  for(const[m,parts]of buckets) {
    const flat=parts.map(g=>{if(!g.index)return g;const f=g.toNonIndexed();g.dispose();return f;});
    const merged=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());
    if(merged){const mesh=new THREE.Mesh(merged,m);mesh.castShadow=m!==glass;mesh.receiveShadow=true;group.add(mesh);}
  }
  return {group,light,dispose:()=>{group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());}};
}
