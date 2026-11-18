'use client';
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

function Box({ at, size, color, metal=0 }: { at:[number,number,number];size:[number,number,number];color:string;metal?:number }) {
  return <RoundedBox position={at} args={size} radius={Math.min(...size)*.12} smoothness={3} castShadow receiveShadow><meshStandardMaterial color={color} metalness={metal} roughness={metal?.32:.73}/></RoundedBox>;
}
function Carton({ at, scale=1 }: { at:[number,number,number];scale?:number }) {
  return <group position={at} scale={scale}><Box at={[0,.19,0]} size={[.16,.32,.14]} color="#e5e6d3"/><Box at={[0,.18,-.072]} size={[.162,.13,.008]} color="#628777"/><mesh position={[0,.385,0]} rotation={[0,0,Math.PI/4]}><cylinderGeometry args={[.11,.11,.15,4]}/><meshStandardMaterial color="#a4b8a2" roughness={.8}/></mesh><mesh position={[.04,.42,-.04]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.022,.022,.015,16]}/><meshStandardMaterial color="#e7e9da"/></mesh></group>;
}
function Processing() {
  return <group position={[-1.85,0,-.2]} scale={.8}>
    <Box at={[0,.035,0]} size={[2,.07,1.45]} color="#bebbac"/>
    {[-.52,.12].map(x=><group key={x} position={[x,0,.10]}>
      <mesh position={[0,.78,0]} castShadow><cylinderGeometry args={[.23,.23,1.05,32]}/><meshStandardMaterial color="#b7c9c3" metalness={.82} roughness={.27}/></mesh>
      <mesh position={[0,1.32,0]} scale={[1,.48,1]}><sphereGeometry args={[.23,24,12]}/><meshStandardMaterial color="#cbd9cf" metalness={.8} roughness={.3}/></mesh>
      <mesh position={[0,1.46,0]}><cylinderGeometry args={[.07,.07,.08,20]}/><meshStandardMaterial color="#6f9385" metalness={.7}/></mesh>
      {[-1,1].map(s=><Box key={s} at={[s*.17,.19,0]} size={[.035,.35,.035]} color="#a4b8ae" metal={.7}/>)}
      <mesh position={[.25,.71,-.05]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.09,.012,8,24]}/><meshStandardMaterial color="#795f49" metalness={.3}/></mesh>
    </group>)}
    <Box at={[.42,.65,-.4]} size={[.7,.035,.035]} color="#9eb4ab" metal={.8}/><Box at={[.75,.43,-.4]} size={[.035,.47,.035]} color="#9eb4ab" metal={.8}/>
    <Box at={[.63,.29,.32]} size={[.62,.06,.45]} color="#547469" metal={.2}/>
    {[0,1,2].map(i=><Carton key={i} at={[.39+i*.2,.32,.32]} scale={.65}/>)}
    <Box at={[.65,.63,-.40]} size={[.29,.22,.05]} color="#2c4a40"/><Box at={[.65,.65,-.435]} size={[.21,.09,.008]} color="#a3cfc0"/>
  </group>;
}
function ColdTruck({ paused }: { paused:boolean }) {
  const wheels=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null),time=useRef(0);
  useFrame((_,dt)=>{if(paused)return;time.current+=Math.min(dt,.05);if(wheels.current)wheels.current.children.forEach(w=>w.rotation.x=-time.current*.7);if(body.current)body.current.position.y=Math.sin(time.current*2)*.003;});
  return <group position={[-1.7,0,.1]} rotation={[0,-.45,0]} scale={.85}>
    <group ref={body}><Box at={[0,.69,0]} size={[.83,.85,1.7]} color="#d4dfd4"/><Box at={[0,.43,-1.15]} size={[.86,.55,.64]} color="#608b7d"/><Box at={[0,.79,-1.12]} size={[.84,.42,.55]} color="#608b7d"/>
      <Box at={[0,.82,-1.405]} size={[.69,.29,.015]} color="#a7c6be" metal={.35}/><Box at={[0,.29,-1.48]} size={[.82,.10,.08]} color="#71877d" metal={.7}/>
      {[-1,1].map(s=><group key={s}><Box at={[s*.30,.45,-1.475]} size={[.15,.075,.018]} color="#efdcaa"/><Box at={[s*.29,.70,.86]} size={[.012,.70,.018]} color="#6d8c7e" metal={.65}/><Box at={[s*.45,.69,-.96]} size={[.025,.16,.32]} color="#b5d4ce" metal={.35}/></group>)}
      <Box at={[0,1.17,-.62]} size={[.64,.17,.24]} color="#c4d6ca"/>{Array.from({length:7},(_,i)=><Box key={i} at={[-.23+i*.077,1.17,-.748]} size={[.025,.10,.005]} color="#527067"/>)}
      <Box at={[0,.46,0]} size={[.86,.035,1.7]} color="#88b8a1"/>
    </group>
    <group ref={wheels}>{[-1,1].flatMap(s=>[-.98,.56].map(z=><group key={`${s}-${z}`} position={[s*.45,.22,z]} rotation={[0,0,Math.PI/2]}><mesh castShadow><cylinderGeometry args={[.22,.22,.13,24]}/><meshStandardMaterial color="#303a32" roughness={.93}/></mesh><mesh><cylinderGeometry args={[.11,.11,.138,20]}/><meshStandardMaterial color="#a1b5ab" metalness={.75} roughness={.35}/></mesh></group>))}</group>
  </group>;
}
function Kitchen() {
  return <group position={[-1.8,0,0]} scale={.82}>
    <Box at={[-.48,.81,0]} size={[.69,1.62,.64]} color="#d4ddd0"/><Box at={[-.48,1.15,-.335]} size={[.65,.66,.045]} color="#dfe6d8"/><Box at={[-.48,.40,-.335]} size={[.65,.74,.045]} color="#e0e6d9"/>
    <Box at={[-.22,1.03,-.38]} size={[.025,.23,.025]} color="#789284" metal={.8}/><Box at={[-.22,.61,-.38]} size={[.025,.23,.025]} color="#789284" metal={.8}/>
    <Box at={[.42,.39,.05]} size={[.98,.74,.64]} color="#998e70"/><Box at={[.42,.80,.03]} size={[1.05,.06,.72]} color="#d9d4bb"/><Carton at={[.19,.83,0]}/>
    <mesh position={[.57,.94,-.12]}><cylinderGeometry args={[.065,.055,.22,24,1,true]}/><meshPhysicalMaterial color="#dde9df" transmission={.4} transparent opacity={.55} roughness={.1} thickness={.01} side={THREE.DoubleSide}/></mesh>
    <mesh position={[.57,.91,-.12]}><cylinderGeometry args={[.058,.05,.14,24]}/><meshStandardMaterial color="#eee7d3" roughness={.6}/></mesh>
  </group>;
}
/** Original educational geometry. Each supply-chain node has a distinct object. */
export default function MilkJourneyAssets({stage,paused}:{stage:number;paused:boolean}) {
  return stage===1?<Processing/>:stage===2?<ColdTruck paused={paused}/>:stage===3?<Kitchen/>:null;
}
