'use client';
import {useEffect} from 'react';
import {RectAreaLightUniformsLib} from 'three-stdlib';
import RoomEnvelope from './RoomEnvelope';
import {Html} from '@react-three/drei';
export default function StudioShell({cafe=false}:{cafe?:boolean}){
 useEffect(()=>{RectAreaLightUniformsLib.init();},[]);
 return <>
  <ambientLight intensity={.45} color={cafe?'#e9d3bb':'#c7d6e0'}/>
  <rectAreaLight position={[0,3.5,0]} rotation={[-Math.PI/2,0,0]} width={6} height={4} intensity={cafe?5:6} color={cafe?'#ffe0b4':'#d4e5f2'}/>
  <rectAreaLight position={[-3.9,2,0]} rotation={[0,-Math.PI/2,0]} width={4} height={2} intensity={6} color="#99bdce"/>
  <spotLight position={[1.5,3.4,2.2]} target-position={[0,0,-1.5]} intensity={35} angle={1} penumbra={1} castShadow shadow-mapSize={[512,512]} shadow-bias={-.0005} color={cafe?'#ffce97':'#dae3eb'}/>
  <mesh position={[0,-.06,0]} receiveShadow><boxGeometry args={[8,.12,7]}/><meshStandardMaterial color={cafe?'#756956':'#657279'} roughness={cafe?.55:.8} metalness={.05}/></mesh>
  <RoomEnvelope cool={!cafe}/>
  {[-3,-1,1,3].map(z=><mesh position={[-3.96,2,z]} key={z}><boxGeometry args={[.07,3.2,.06]}/><meshStandardMaterial color="#283c44" metalness={.8} roughness={.3}/></mesh>)}
  <mesh position={[-3.98,2,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[7,3]}/><meshPhysicalMaterial color="#a5c0cc" metalness={.1} roughness={.1} clearcoat={1} transparent opacity={.12}/></mesh>
  <mesh position={[-1.5,2.55,-3.35]}><planeGeometry args={[2.5,.9]}/><meshStandardMaterial color={cafe?'#233d34':'#193039'} roughness={.8}/></mesh>
  <Html position={[-1.5,2.55,-3.25]} transform distanceFactor={2.6} style={{pointerEvents:'none'}}><div className="studio-sign">{cafe?'SLOW / COFFEE':'AFTER HOURS.'}<small>{cafe?'FROM FARM TO YOUR CUP':'WHAT STAYS ON WHEN WE LEAVE?'}</small></div></Html>
 </>;
}
