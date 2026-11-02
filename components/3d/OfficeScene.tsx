'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html,RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {ExternalModel} from './TwinAssets';
import {ObjectTarget,ObjectHologram,SpaceGuide,SpaceReady} from './SpaceInteraction';
import StudioShell from './StudioShell';
import {Steam} from './LivingDetails';
import {useTwinStore} from '@/lib/experience/store';
import {useUIStore} from '@/lib/stores/UIStore';

function ServerRack(){
 const devices=useTwinStore(s=>s.devices),selected=useTwinStore(s=>s.experience.selected),reduced=useUIStore(s=>s.reduced),fan=useRef<THREE.Group>(null),rack=useRef<THREE.Group>(null),blades=useRef<THREE.InstancedMesh>(null),leds=useRef<THREE.InstancedMesh>(null);
 const dummy=useMemo(()=>new THREE.Object3D(),[]),mat=useRef<THREE.MeshStandardMaterial>(null);
 useEffect(()=>{if(!blades.current||!leds.current)return;for(let i=0;i<18;i++){const a=i/18*Math.PI*2;dummy.position.set(Math.sin(a)*.16,Math.cos(a)*.16,0);dummy.rotation.set(0,0,-a);dummy.scale.set(1,1,1);dummy.updateMatrix();blades.current.setMatrixAt(i,dummy.matrix);}blades.current.instanceMatrix.needsUpdate=true;for(let i=0;i<30;i++){dummy.position.set(-.3+(i%3)*.05,.15+Math.floor(i/3)*.14,.43);dummy.scale.set(1,1,1);dummy.updateMatrix();leds.current.setMatrixAt(i,dummy.matrix);}leds.current.instanceMatrix.needsUpdate=true;},[dummy]);
 useFrame(({clock},dt)=>{if(fan.current&&!reduced&&devices.server)fan.current.rotation.z+=Math.min(dt,.05)*24;if(rack.current)rack.current.position.x=devices.server&&!reduced?Math.sin(clock.elapsedTime*57)*.0008:0;if(mat.current){mat.current.emissiveIntensity=devices.server?1.1+Math.sin(clock.elapsedTime*3.2)*.2:0;mat.current.emissive.set(selected==='server'?'#efad76':'#a3d0ae');}});
 return <ObjectTarget id="server" position={[2.6,0,-2.2]}><group ref={rack}>
  <RoundedBox args={[1,2.35,.9]} position={[0,1.18,0]} radius={.045} castShadow><meshPhysicalMaterial color="#202d33" metalness={.75} roughness={.28} clearcoat={.4}/></RoundedBox>
  {Array.from({length:10},(_,i)=><group key={i} position={[0,.27+i*.185,.465]}><mesh><boxGeometry args={[.85,.15,.03]}/><meshStandardMaterial color="#45545a" metalness={.85} roughness={.35}/></mesh>{[-.32,.32].map(x=><mesh key={x} position={[x,0,.03]}><torusGeometry args={[.038,.007,6,16]}/><meshStandardMaterial color="#14232b" metalness={.7}/></mesh>)}</group>)}
  <group ref={fan} position={[0,2.02,.51]}><instancedMesh ref={blades} args={[undefined,undefined,18]}><boxGeometry args={[.06,.16,.014]}/><meshStandardMaterial color="#667c80" metalness={.8} roughness={.27}/></instancedMesh></group>
  <instancedMesh ref={leds} args={[undefined,undefined,30]}><sphereGeometry args={[.012,6,6]}/><meshStandardMaterial ref={mat} color="#b6dec0" emissive="#a3d0ae" emissiveIntensity={1.2}/></instancedMesh>
  <Html position={[0,2.53,0]} center style={{pointerEvents:'none'}}><span className="machine-label">SERVER / {devices.server?'1,500 W':'OFF'}<small>教学输入 · 非实测</small></span></Html>
 </group></ObjectTarget>;
}
function Monitor({position}:{position:[number,number,number]}){
 const on=useTwinStore(s=>!!s.devices.computer),screen=useRef<THREE.ShaderMaterial>(null),reduced=useUIStore(s=>s.reduced);
 const uniforms=useMemo(()=>({uTime:{value:0},uOn:{value:1}}),[]);
 useFrame(({clock})=>{if(screen.current){screen.current.uniforms.uTime.value=reduced?0:clock.elapsedTime;screen.current.uniforms.uOn.value=on?1:0;}});
 return <group position={position}><RoundedBox args={[.65,.42,.045]} radius={.018} position={[0,.2,0]} castShadow><meshStandardMaterial color="#202d35" roughness={.4} metalness={.45}/></RoundedBox><mesh position={[0,.2,.027]}><planeGeometry args={[.6,.36]}/><shaderMaterial ref={screen} uniforms={uniforms} vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`varying vec2 vUv;uniform float uTime;uniform float uOn;void main(){float row=floor(vUv.y*12.);float line=step(.2,fract(vUv.y*12.))*step(vUv.x,.22+fract(sin(row*15.)*32.)*.65);float pulse=.8+.2*sin(uTime*.8+row);vec3 c=mix(vec3(.04,.08,.11),vec3(.39,.65,.62),line*.65*pulse);gl_FragColor=vec4(c*uOn,1.);}`}/></mesh><mesh position={[0,-.07,0]}><cylinderGeometry args={[.025,.04,.25,12]}/><meshStandardMaterial color="#657779" metalness={.8} roughness={.25}/></mesh><mesh position={[0,-.18,.03]}><cylinderGeometry args={[.18,.18,.025,24]}/><meshStandardMaterial color="#48595d" metalness={.8} roughness={.3}/></mesh></group>;
}
export default function OfficeScene(){
 const devices=useTwinStore(s=>s.devices);
 return <><StudioShell/><SpaceReady/>
  <ObjectTarget id="desk"><ExternalModel name="desk" scale={.88} position={[-1.5,0,-1.2]}/></ObjectTarget>
  <ExternalModel name="desk" scale={.88} position={[-1.5,0,1.05]}/>
  {[-1.2,1.05].map(z=><group key={z}>
   <mesh position={[-1.5,.92,z-.08]} castShadow><boxGeometry args={[1.72,.44,.035]}/><meshStandardMaterial color="#687e7d" roughness={.97}/></mesh>
   {[-2.1,-.9].map(x=><mesh key={x} position={[x,.92,z+.16]}><boxGeometry args={[.025,.44,.47]}/><meshStandardMaterial color="#839491" roughness={1}/></mesh>)}
   <group position={[-1.5,0,z+.98]}>
    <RoundedBox args={[.58,.09,.55]} position={[0,.47,0]} radius={.04} castShadow><meshStandardMaterial color="#344849" roughness={.95}/></RoundedBox>
    <RoundedBox args={[.58,.57,.07]} position={[0,.79,.24]} radius={.035} castShadow><meshStandardMaterial color="#344849" roughness={.95}/></RoundedBox>
    <mesh position={[0,.24,0]}><cylinderGeometry args={[.035,.055,.43,12]}/><meshStandardMaterial color="#8d9b9b" metalness={.8} roughness={.3}/></mesh>
    <mesh position={[0,.05,0]}><cylinderGeometry args={[.3,.3,.035,24]}/><meshStandardMaterial color="#526767" metalness={.6} roughness={.4}/></mesh>
   </group>
  </group>)}
  <ObjectTarget id="computer">{[-2.25,-1.5,-.75].flatMap(x=>[-1.2,1.05].map(z=><Monitor key={`${x}-${z}`} position={[x,.88,z]}/>))}</ObjectTarget>
  <ServerRack/>
  <ObjectTarget id="officeHVAC" position={[.4,3.05,-3.15]}><RoundedBox args={[2.2,.32,.35]} radius={.02}><meshStandardMaterial color="#d2d6d1" metalness={.45} roughness={.4}/></RoundedBox>{Array.from({length:14},(_,i)=><mesh key={i} position={[-.95+i*.145,0,.2]}><boxGeometry args={[.035,.22,.05]}/><meshStandardMaterial color="#3b5058" metalness={.7} roughness={.4}/></mesh>)}</ObjectTarget>
  <group position={[.4,1.55,-3]} rotation={[Math.PI,0,0]}><Steam position={[0,0,0]} on={!!devices.officeHVAC} tint="#b7d6e0" strength={.7}/></group>
  <ObjectTarget id="officeLight">{[-1.8,1.3].map(x=><mesh key={x} position={[x,3.45,0]}><boxGeometry args={[.08,.035,5]}/><meshStandardMaterial color="#dce3dc" emissive="#c8d8e2" emissiveIntensity={devices.officeLight?1.7:0}/></mesh>)}</ObjectTarget>
  <rectAreaLight position={[0,3.4,0]} rotation={[-Math.PI/2,0,0]} width={4} height={5} intensity={devices.officeLight?2:0} color="#c3d9e7"/>
  <mesh position={[.55,1.5,-.5]}><boxGeometry args={[.035,3,4.6]}/><meshPhysicalMaterial color="#aac3c8" metalness={.12} roughness={.13} transparent opacity={.13} clearcoat={1}/></mesh>
  {[-2.8,1.8].map(z=><mesh key={z} position={[.55,1.5,z]}><boxGeometry args={[.05,3,.05]}/><meshStandardMaterial color="#43585c" metalness={.7} roughness={.3}/></mesh>)}
  <ObjectHologram/><SpaceGuide/>
 </>;
}
