'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {buildingPosition} from '@/lib/experience/CameraDirector';
import {useTwinStore} from '@/lib/experience/store';
import {useUIStore} from '@/lib/stores/UIStore';
import {CITY_BUILDING_COUNT} from '@/lib/experience/cityDistrict';
import {useStoryAtmosphere} from '@/lib/stores/StoryAtmosphere';

export function buildingSize(id:number):[number,number,number]{
 if(id===0)return [8,18,7.8];
 // Keep the three room entrances at their existing dimensions. Surrounding
 // blocks step down towards the waterfront, with a few distinct taller forms.
 const heights=[18,11.5,8.4,6.2,24,4.8,7.5,9.4,6.5,18,7.8,11.2,6.8,9.4,5.3,8.6,12,7.2,10.5,8.2,6.4,16,9.8,7.4,11.5];
 return [7+(id%3)*.9,heights[id]??8,6.2+(id%2)*.8];
}
interface Instance {id:number;position:[number,number,number];scale:[number,number,number];rotation:number;color:string}
export default function CityLife({paused=false}:{paused?:boolean}){
 const windows=useRef<THREE.InstancedMesh>(null),frames=useRef<THREE.InstancedMesh>(null),equipment=useRef<THREE.InstancedMesh>(null),beacons=useRef<THREE.InstancedMesh>(null),traffic=useRef<THREE.InstancedMesh>(null),beaconMaterial=useRef<THREE.MeshStandardMaterial>(null);
 const experience=useTwinStore(s=>s.experience),reducedMotion=useUIStore(s=>s.reduced),quality=useTwinStore(s=>s.quality),night=useStoryAtmosphere(s=>s.time==='night'),reduced=reducedMotion||paused;
 const dummy=useMemo(()=>new THREE.Object3D(),[]),color=useMemo(()=>new THREE.Color(),[]),elapsed=useRef(0);
 const data=useMemo(()=>{
  const panes:Instance[]=[],rails:Instance[]=[],roofs:Instance[]=[];
  for(let id=0;id<CITY_BUILDING_COUNT;id++){
   const [x,,z]=buildingPosition(id),[w,h,d]=buildingSize(id),floors=Math.floor(h/1.2);
   // The retained city kit already has distinct windows, masonry and rooflines.
   // Add curtain glazing only on the demonstration tower's unoccluded side;
   // a generic facade over every building erased all nineteen source types.
   if(id!==0)continue;
   for(let floor=0;floor<floors;floor++){
    const y=.9+floor*1.2;
    rails.push({id,position:[x+w/2+.03,y-.4,z],scale:[.07,.055,d],rotation:0,color:'#34434b'});
    for(let col=0;col<5;col++){
     const seed=(id*131+floor*17+col*7)%101,palette=['#d6b176','#e6d7ac','#9fb9c2','#708d9d'];
     panes.push({id,position:[x+w/2+.055,y,z-d/2+(col+.5)*d/5],scale:[d/5-.2,.72,1],rotation:Math.PI/2,color:seed%3?palette[(seed+1)%4]:'#1e3039'});
    }
   }
   for(let col=0;col<6;col++)rails.push({id,position:[x+w/2+.08,h/2,z-d/2+col*d/5],scale:[.07,h,.055],rotation:0,color:'#3c4c55'});
   roofs.push({id,position:[x+.7,h+.3,z-.5],scale:[1.3,.6,1.1],rotation:0,color:'#697575'});
  }
  return {panes,rails,roofs};
 },[]);
 useEffect(()=>{const fill=(mesh:THREE.InstancedMesh|null,items:Instance[],fade=false)=>{if(!mesh)return;items.forEach((item,i)=>{dummy.position.set(...item.position);dummy.rotation.set(0,item.rotation,0);dummy.scale.set(...item.scale);if(fade&&item.id===experience.building&&['entering','scrolling'].includes(experience.state))dummy.scale.setScalar(0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(item.color));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();};fill(windows.current,data.panes,true);fill(frames.current,data.rails,true);fill(equipment.current,data.roofs);if(beacons.current){for(let i=0;i<CITY_BUILDING_COUNT;i++){const [x,,z]=buildingPosition(i),[,h]=buildingSize(i);dummy.position.set(x,h+.85,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();beacons.current.setMatrixAt(i,dummy.matrix);}beacons.current.instanceMatrix.needsUpdate=true;beacons.current.computeBoundingSphere();}},[data,dummy,color,experience.building,experience.state]);
 useFrame((_,dt)=>{if(!reduced)elapsed.current+=Math.min(dt,.05);const t=elapsed.current;if(beaconMaterial.current)beaconMaterial.current.emissiveIntensity=.2+Math.pow(Math.max(0,Math.sin(t*1.5)),8)*2;if(!traffic.current)return;const n=quality==='low'?24:48;traffic.current.count=n;for(let i=0;i<n;i++){const row=i%3,speed=3+i%4,lane=i%2?1:-1;dummy.position.set(((t*speed+i*7)%125-62.5)*lane,.06,-10-row*13+(i%2)*1.1);dummy.rotation.set(0,0,0);dummy.scale.set(.9+i%3*.4,.025,.045);dummy.updateMatrix();traffic.current.setMatrixAt(i,dummy.matrix);traffic.current.setColorAt(i,color.set(i%2?'#bd563d':'#d9d7bb'));}traffic.current.instanceMatrix.needsUpdate=true;if(traffic.current.instanceColor)traffic.current.instanceColor.needsUpdate=true;});
 return <>
  <instancedMesh ref={windows} args={[undefined,undefined,data.panes.length]}><planeGeometry/><meshPhysicalMaterial color="#a5c0bc" emissive="#f3d2a3" emissiveIntensity={night?.55:.015} roughness={.12} metalness={.42} clearcoat={.65} clearcoatRoughness={.07} envMapIntensity={1.1} side={THREE.DoubleSide}/></instancedMesh>
  <instancedMesh ref={frames} args={[undefined,undefined,data.rails.length]}><boxGeometry/><meshStandardMaterial color="#ffffff" metalness={.8} roughness={.3}/></instancedMesh>
  <instancedMesh ref={equipment} args={[undefined,undefined,data.roofs.length]}><boxGeometry/><meshStandardMaterial color="#ffffff" metalness={.6} roughness={.5}/></instancedMesh>
  <instancedMesh ref={beacons} args={[undefined,undefined,CITY_BUILDING_COUNT]}><sphereGeometry args={[.055,8,8]}/><meshStandardMaterial ref={beaconMaterial} color="#9e3a30" emissive="#d94332"/></instancedMesh>
  <instancedMesh ref={traffic} args={[undefined,undefined,48]} frustumCulled={false}><boxGeometry/><meshBasicMaterial color="#ffffff" toneMapped={false}/></instancedMesh>
 </>;
}
