import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {makeFacadeSurfaces} from './facadeSurfaces';

export const FINANCIAL_SKYLINE_COUNT = 38;

/** Reuse Light Court's material recipes on independently composed buildings.
 * No source buffers or cached GLTF materials are modified. */
export function makeFinancialSkyline(kit: THREE.Group) {
  const retained = new Map<string, THREE.MeshStandardMaterial>();
  kit.traverse(object => {
    if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial) retained.set(material.name, material);
    }
  });
  const surfaces=makeFacadeSurfaces();
  const glass = (retained.get('v12-glass')?.clone() ?? new THREE.MeshPhysicalMaterial()) as THREE.MeshPhysicalMaterial;
  // District glass reflects the real environment. Transmission is reserved
  // for the close-up studio, where room depth is visible and worth its pass.
  glass.transmission = 0; glass.thickness = 0; glass.color.set('#416573');
  glass.metalness = .35; glass.roughness = .18; glass.envMapIntensity = 1.35;
  glass.clearcoat = .55; glass.clearcoatRoughness = .09;
  glass.map=surfaces.map;glass.roughnessMap=surfaces.roughnessMap;
  const silver = glass.clone(); silver.color.set('#658591'); silver.roughness = .20;
  const teal = glass.clone(); teal.color.set('#284c56');
  const frame = retained.get('v12-frame')?.clone() ?? new THREE.MeshStandardMaterial();
  frame.color.set('#263d49'); frame.metalness = .65; frame.roughness = .31;
  const stone = retained.get('v12-stone')?.clone() ?? new THREE.MeshStandardMaterial();
  stone.color.set('#a7aaa2'); stone.roughness = .76;
  const interior = new THREE.MeshStandardMaterial({color:'#f5dcb4',emissive:'#ffd3a0',emissiveIntensity:0,roughness:.65});
  const crown = new THREE.MeshStandardMaterial({color:'#7f989a',emissive:'#c7e8dd',emissiveIntensity:0,roughness:.3,metalness:.5});
  const materials = [glass,silver,teal,frame,stone,interior,crown];
  const buckets = new Map<THREE.Material,THREE.BufferGeometry[]>();
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0,1,0);
  let originX = 0, originZ = 0, angle = 0;
  function add(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
    rotation.setFromAxisAngle(yAxis,angle);
    position.set(x,y,z).applyQuaternion(rotation); position.x += originX; position.z += originZ;
    matrix.compose(position,rotation,new THREE.Vector3(1,1,1)); geometry.applyMatrix4(matrix);
    const parts = buckets.get(material) ?? []; parts.push(geometry); buckets.set(material,parts);
  }
  const box = (material:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) => add(new THREE.BoxGeometry(w,h,d),material,x,y,z);
  function prism(material:THREE.Material,x:number,bottom:number,z:number,w:number,h:number,d:number,bevel:number) {
    const shape = new THREE.Shape();
    const points = [[-w/2+bevel,-d/2],[w/2-bevel,-d/2],[w/2,-d/2+bevel],[w/2,d/2-bevel],[w/2-bevel,d/2],[-w/2+bevel,d/2],[-w/2,d/2-bevel],[-w/2,-d/2+bevel]];
    shape.moveTo(...points[0] as [number,number]); points.slice(1).forEach(([a,b])=>shape.lineTo(a,b)); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1});
    geometry.rotateX(-Math.PI/2); add(geometry,material,x,bottom,z);
  }
  function tower(material:THREE.Material,x:number,z:number,bottom:number,w:number,h:number,d:number,bevel=.55) {
    prism(material,x,bottom,z,w,h,d,bevel);
    // Actual floor edges, vertical aluminium mullions and recessed occupied
    // bays give depth without a stretched checkerboard facade texture.
    for(let floor=bottom+2.9;floor<bottom+h-.3;floor+=3.1) {
      // Slim floor edges keep glazing continuous instead of black horizontal bands.
      prism(frame,x,floor,z,w+.075,.12,d+.075,bevel);
      for(let face=0;face<4;face++) {
        const horizontal=face<2,extent=horizontal?w:d,bays=Math.max(2,Math.floor(extent/1.55));
        for(let bay=0;bay<bays;bay++) {
          if((Math.round(originX*3)+Math.round(floor)*7+bay*13+face*19)%11!==0)continue;
          const offset=(bay+.5)/bays*extent-extent/2;
          box(interior,x+(horizontal?offset:(face===2?1:-1)*(w/2+.006)),floor-1.35,z+(horizontal?(face===0?1:-1)*(d/2+.006):offset),horizontal?extent/bays*.76:.015,1.8,horizontal?.015:extent/bays*.76);
        }
      }
    }
    for(const sign of [-1,1]) {
      for(let bay=1;bay<Math.ceil(w/1.55);bay++)box(frame,x-w/2+bay*w/Math.ceil(w/1.55),bottom+h/2,z+sign*(d/2+.025),.045,h,.07);
      for(let bay=1;bay<Math.ceil(d/1.55);bay++)box(frame,x+sign*(w/2+.025),bottom+h/2,z-d/2+bay*d/Math.ceil(d/1.55),.07,h,.045);
    }
    prism(frame,x,bottom+h,z,w+.1,.3,d+.1,bevel);
  }
  for(let i=0;i<FINANCIAL_SKYLINE_COUNT;i++) {
    const row=i<15?0:i<28?1:2,col=i-(row===0?0:row===1?15:28),count=row===0?15:row===1?13:10;
    originX=(col-(count-1)/2)*(row===0?15.5:row===1?20.5:28)+(i*7%5)-22;
    originZ=-77-row*38-(i*13%11); angle=((i*7%5)-2)*Math.PI/60;
    const w=8+(i*3%5)+row*1.7,d=8.5+(i*7%4)+row*1.4,h=14+(i*17%22)+row*8;
    const mat=[glass,silver,teal,silver][i%4],form=i%5;
    box(stone,0,1.4,0,w+2.2,2.8,d+2);
    box(teal,0,1.4,d/2+1.015,w*.75,2.3,.04);
    box(frame,0,2.85,d/2+1.6,w*.82,.15,2.2);
    if(form===0) {
      // Paired blades and an inhabited sky bridge.
      tower(mat,-w*.275,0,2.8,w*.44,h,d,.6);
      tower(silver,w*.275,0,2.8,w*.44,h*.79,d*.86,.6);
      box(teal,0,h*.58,0,w*.9,2.2,d*.55);
    } else if(form===1) {
      tower(mat,0,0,2.8,w,h*.58,d,.9);
      tower(mat,-w*.08,-d*.04,2.8+h*.58,w*.76,h*.30,d*.78,.8);
      tower(silver,-w*.13,-d*.08,2.8+h*.88,w*.52,h*.12,d*.57,.7);
    } else if(form===2) {
      // Chamfered tower with a real sloping crown, not a flat box roof.
      tower(mat,0,0,2.8,w,h,d,1.4);
      const roof=new THREE.BoxGeometry(w*.94,2.6,d*.94);
      const vertices=roof.getAttribute('position');
      for(let v=0;v<vertices.count;v++)if(vertices.getY(v)>0)vertices.setY(v,1.3+(vertices.getX(v)/w+.5)*3.4);
      roof.computeVertexNormals();add(roof,frame,0,h+3.5,0);
    } else if(form===3) {
      tower(teal,-w*.16,0,2.8,w*.68,h,d,.7);
      tower(mat,w*.30,d*.13,2.8,w*.38,h*.64,d*.78,.4);
      // Perforated fins articulate the west-facing stone service core.
      for(let fin=0;fin<6;fin++)box(stone,-w*.51,2.8+h/2,-d*.38+fin*d*.15,.20,h,.14);
    } else {
      tower(mat,0,0,2.8,w,h,d,1.1);
      for(const sign of [-1,1])box(silver,sign*w*.34,2.8+h/2,d/2+.11,.22,h,.26);
      box(frame,0,h+3.5,0,w*.73,1.4,d*.7);
    }
    box(crown,0,h+3.05,0,w*.52,.08,d*.55);
    // Recessed mechanical decks and roof screens give each silhouette a finish.
    for(const side of [-1,1]) {
      box(frame,side*w*.17,h+3.45,-d*.13,w*.19,.65,d*.24);
      for(let fin=0;fin<4;fin++)box(stone,side*w*.17,h+3.78,-d*.23+fin*d*.065,w*.21,.035,.045);
    }
  }
  const group=new THREE.Group(); group.name='Light-Court-derived-financial-skyline';
  for(const[material,parts]of buckets) {
    const flat=parts.map(part=>{if(!part.index)return part;const expanded=part.toNonIndexed();part.dispose();return expanded;});
    const geometry=mergeGeometries(flat,false); flat.forEach(part=>part.dispose());
    if(geometry){const mesh=new THREE.Mesh(geometry,material);group.add(mesh);}
  }
  return {group,materials,interior,crown,disposeSurfaces:surfaces.dispose};
}
