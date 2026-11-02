'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {buildingPosition} from '@/lib/experience/CameraDirector';
import {useTwinStore} from '@/lib/experience/store';
import {useUIStore} from '@/lib/stores/UIStore';

export function buildingSize(id:number):[number,number,number]{return [id===0?8:7+(id%3)*1.2,id===0?18:9+(id*7%22),id===0?7.8:7];}
interface Instance {id:number;position:[number,number,number];scale:[number,number,number];rotation:number;color:string}
export default function CityLife(){
 const windows=useRef<THREE.InstancedMesh>(null),frames=useRef<THREE.InstancedMesh>(null),equipment=useRef<THREE.InstancedMesh>(null),beacons=useRef<THREE.InstancedMesh>(null),traffic=useRef<THREE.InstancedMesh>(null),beaconMaterial=useRef<THREE.MeshStandardMaterial>(null);
 const experience=useTwinStore(s=>s.experience),reduced=useUIStore(s=>s.reduced),quality=useTwinStore(s=>s.quality);
 const dummy=useMemo(()=>new THREE.Object3D(),[]),color=useMemo(()=>new THREE.Color(),[]);
 const data=useMemo(()=>{
  const panes:Instance[]=[],rails:Instance[]=[],roofs:Instance[]=[];
  for(let id=0;id<57;id++){
   const [x,,z]=buildingPosition(id),[w,h,d]=buildingSize(id),floors=Math.floor(h/1.2);
   for(let floor=0;floor<floors;floor++){
    const y=.9+floor*1.2;rails.push({id,position:[x,y-.4,z+d/2+.04],scale:[w,.055,.07],rotation:0,color:'#34434b'});
    rails.push({id,position:[x+w/2+.03,y-.4,z],scale:[.07,.055,d],rotation:0,color:'#34434b'});
    for(let col=0;col<5;col++){
     const seed=(id*131+floor*17+col*7)%101,lit=seed>33,palette=['#d6b176','#e6d7ac','#9fb9c2','#708d9d'];
     panes.push({id,position:[x-w/2+(col+.5)*w/5,y,z+d/2+.055],scale:[w/5-.2,.72,1],rotation:0,color:lit?palette[seed%4]:'#20343e'});
     panes.push({id,position:[x+w/2+.055,y,z-d/2+(col+.5)*d/5],scale:[d/5-.2,.72,1],rotation:Math.PI/2,color:seed%3?palette[(seed+1)%4]:'#1e3039'});
    }
   }
   for(let col=0;col<6;col++)rails.push({id,position:[x-w/2+col*w/5,h/2,z+d/2+.08],scale:[.055,h,.07],rotation:0,color:'#3c4c55'});
   roofs.push({id,position:[x+.7,h+.3,z-.5],scale:[1.3,.6,1.1],rotation:0,color:'#697575'});
  }
  return {panes,rails,roofs};
 },[]);
 useEffect(()=>{const fill=(mesh:THREE.InstancedMesh|null,items:Instance[],fade=false)=>{if(!mesh)return;items.forEach((item,i)=>{dummy.position.set(...item.position);dummy.rotation.set(0,item.rotation,0);dummy.scale.set(...item.scale);if(fade&&item.id===experience.building&&['entering','scrolling'].includes(experience.state))dummy.scale.setScalar(0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(item.color));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();};fill(windows.current,data.panes,true);fill(frames.current,data.rails,true);fill(equipment.current,data.roofs);if(beacons.current){for(let i=0;i<57;i++){const [x,,z]=buildingPosition(i),[,h]=buildingSize(i);dummy.position.set(x,h+.85,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();beacons.current.setMatrixAt(i,dummy.matrix);}beacons.current.instanceMatrix.needsUpdate=true;beacons.current.computeBoundingSphere();}},[data,dummy,color,experience.building,experience.state]);
 useFrame(({clock})=>{const t=reduced?0:clock.elapsedTime;if(beaconMaterial.current)beaconMaterial.current.emissiveIntensity=.2+Math.pow(Math.max(0,Math.sin(t*1.5)),8)*2;if(!traffic.current)return;const n=quality==='low'?24:48;traffic.current.count=n;for(let i=0;i<n;i++){const row=i%7,speed=3+i%4,lane=i%2?1:-1;dummy.position.set(((t*speed+i*7)%125-62.5)*lane,.06,-10-row*13+(i%2)*1.1);dummy.rotation.set(0,0,0);dummy.scale.set(.9+i%3*.4,.025,.045);dummy.updateMatrix();traffic.current.setMatrixAt(i,dummy.matrix);traffic.current.setColorAt(i,color.set(i%2?'#bd563d':'#d9d7bb'));}traffic.current.instanceMatrix.needsUpdate=true;if(traffic.current.instanceColor)traffic.current.instanceColor.needsUpdate=true;});
 return <>
  <instancedMesh ref={windows} args={[undefined,undefined,data.panes.length]}><planeGeometry/><meshBasicMaterial color="#ffffff" toneMapped={false} side={THREE.DoubleSide}/></instancedMesh>
  <instancedMesh ref={frames} args={[undefined,undefined,data.rails.length]}><boxGeometry/><meshStandardMaterial color="#ffffff" metalness={.8} roughness={.3}/></instancedMesh>
  <instancedMesh ref={equipment} args={[undefined,undefined,57]}><boxGeometry/><meshStandardMaterial color="#ffffff" metalness={.6} roughness={.5}/></instancedMesh>
  <instancedMesh ref={beacons} args={[undefined,undefined,57]}><sphereGeometry args={[.055,8,8]}/><meshStandardMaterial ref={beaconMaterial} color="#9e3a30" emissive="#d94332"/></instancedMesh>
  <instancedMesh ref={traffic} args={[undefined,undefined,48]} frustumCulled={false}><boxGeometry/><meshBasicMaterial color="#ffffff" toneMapped={false}/></instancedMesh>
 </>;
}
