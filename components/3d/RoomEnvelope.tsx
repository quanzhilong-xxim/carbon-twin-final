'use client';
import {useRef,useMemo,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useTwinStore} from '@/lib/experience/store';

/** One metre = one scene unit. Ceiling lifts away in the dollhouse view. */
export default function RoomEnvelope({cool=false}:{cool?:boolean}){
 const view=useTwinStore(s=>s.experience.view),walls=useMemo(()=>new THREE.MeshStandardMaterial({color:cool?'#b9c5c5':'#c8bdab',transparent:true,opacity:.3,depthWrite:false,roughness:.93}),[cool]),ceiling=useRef<THREE.MeshStandardMaterial>(null),roof=useRef<THREE.Mesh>(null);
 useFrame((_,dt)=>{
  const walk=view==='walk';
  walls.opacity=THREE.MathUtils.damp(walls.opacity,walk?1:.3,5,dt);walls.depthWrite=walk;
  if(ceiling.current)ceiling.current.opacity=THREE.MathUtils.damp(ceiling.current.opacity,walk?1:0,5,dt);
  if(roof.current)roof.current.visible=walk||(ceiling.current?.opacity??0)>.015;
 });
 useEffect(()=>()=>walls.dispose(),[walls]);
 return <group name="room-envelope">
  <Wall position={[0,1.9,-3.5]} size={[8.1,3.8,.16]} material={walls}/>
  <Wall position={[4,1.9,0]} size={[.16,3.8,7]} material={walls}/>
  <Wall position={[-4,.42,0]} size={[.16,.84,7]} material={walls}/>
  <Wall position={[-4,3.55,0]} size={[.16,.5,7]} material={walls}/>
  {[-3.42,3.42].map(z=><Wall key={z} position={[-4,2,z]} size={[.16,2.4,.16]} material={walls}/>)}
  <Wall position={[-1.25,1.9,3.5]} size={[5.5,3.8,.16]} material={walls}/>
  <Wall position={[3.5,1.9,3.5]} size={[1,3.8,.16]} material={walls}/>
  <Wall position={[2.25,3.12,3.5]} size={[1.5,1.36,.16]} material={walls}/>
  <mesh ref={roof} position={[0,3.85,0]} visible={false}><boxGeometry args={[8.1,.12,7.1]}/><meshStandardMaterial ref={ceiling} color={cool?'#b7c4c7':'#d8cfbf'} transparent opacity={0} roughness={.95}/></mesh>
  {[-3.36,3.36].map(z=><mesh key={z} position={[0,.09,z]}><boxGeometry args={[7.85,.18,.045]}/><meshStandardMaterial color={cool?'#43525a':'#6e6252'} roughness={.65}/></mesh>)}
  {[-3.87,3.87].map(x=><mesh key={x} position={[x,.09,0]}><boxGeometry args={[.045,.18,6.75]}/><meshStandardMaterial color={cool?'#43525a':'#6e6252'} roughness={.65}/></mesh>)}
  <mesh position={[-3.99,2.06,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[6.7,2.48]}/><meshPhysicalMaterial color="#c2d8dd" metalness={.1} roughness={.12} transparent opacity={.11} depthWrite={false} clearcoat={1}/></mesh>
  {/* A real doorway, rather than a camera-sized hole in an otherwise closed room. */}
  {[1.52,2.98].map(x=><mesh key={x} position={[x,1.23,3.43]}><boxGeometry args={[.07,2.46,.21]}/><meshStandardMaterial color="#665b4d" roughness={.6}/></mesh>)}
 </group>;
}

function Wall({position,size,material}:{position:[number,number,number];size:[number,number,number];material:THREE.MeshStandardMaterial}){
 return <mesh position={position} receiveShadow material={material}><boxGeometry args={size}/></mesh>;
}
