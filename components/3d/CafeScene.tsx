'use client';
import {useFrame} from '@react-three/fiber';
import {RoundedBox,Html} from '@react-three/drei';
import {useRef,type ReactNode} from 'react';
import * as THREE from 'three';
import {ExternalModel} from './TwinAssets';
import {ObjectTarget,ObjectHologram,SpaceGuide,SpaceReady} from './SpaceInteraction';
import StudioShell from './StudioShell';
import {Steam} from './LivingDetails';
import {useTwinStore} from '@/lib/experience/store';
import {useUIStore} from '@/lib/stores/UIStore';
import WarmCafeDetails from './WarmCafeDetails';
import {OBJECTS,type SpaceObject} from '@/lib/experience/spaces';

function PreviewTarget({id,children,position,rotation}:{id:SpaceObject;children:ReactNode;position?:[number,number,number];rotation?:[number,number,number]}){
 return <group position={position} rotation={rotation} onClick={e=>{e.stopPropagation();if(OBJECTS[id].watts>0)useTwinStore.setState(s=>({devices:{...s.devices,[id]:!s.devices[id]}}));}}>{children}</group>;
}
export default function CafeScene({standalone=false,paused=false}:{standalone?:boolean;paused?:boolean}){
 const Target=standalone?PreviewTarget:ObjectTarget;
 const devices=useTwinStore(s=>s.devices),sign=useRef<THREE.MeshStandardMaterial>(null),fridge=useRef<THREE.Group>(null),reduced=useUIStore(s=>s.reduced),elapsed=useRef(0);
 useFrame(({gl},dt)=>{if(!paused&&!reduced)elapsed.current+=Math.min(dt,.05);const t=elapsed.current;if(sign.current)sign.current.emissiveIntensity=devices.cafeLight?1.2+(reduced?0:Math.sin(t*31)*.025):0;if(fridge.current)fridge.current.position.x=devices.fridge&&!reduced?2.6+Math.sin(t*48)*.0008:2.6;if(standalone){gl.domElement.dataset.cafeMotionTime=t.toFixed(4);gl.domElement.dataset.cafePaused=String(paused||reduced);}});
 return <><StudioShell cafe/>{!standalone&&<SpaceReady/>}
  <Target id="counter"><RoundedBox args={[4.8,1,.9]} radius={.045} position={[-.6,.5,-1.9]} castShadow><meshPhysicalMaterial color="#4e4b40" metalness={.2} roughness={.65}/></RoundedBox><RoundedBox args={[5, .055,1.05]} radius={.02} position={[-.6,1.04,-1.9]} castShadow><meshPhysicalMaterial color="#a5aaa5" metalness={.92} roughness={.23} clearcoat={.5}/></RoundedBox></Target>
  <Target id="coffeeMachine" position={[.3,1.08,-1.9]}><RoundedBox args={[1.15,.65,.6]} radius={.065} position={[0,.33,0]} castShadow><meshPhysicalMaterial color="#c3c7bd" metalness={.9} roughness={.22} clearcoat={.5}/></RoundedBox><mesh position={[0,.31,.32]}><planeGeometry args={[1,.35]}/><meshStandardMaterial color="#23312d" roughness={.4}/></mesh>{[-.28,.28].map(x=><group key={x} position={[x,.32,.4]}><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.09,.09,.14,24]}/><meshPhysicalMaterial color="#babdb5" metalness={.95} roughness={.18}/></mesh><mesh position={[0,-.15,.06]}><cylinderGeometry args={[.065,.045,.12,24]}/><meshStandardMaterial color="#e0d5bd" roughness={.25}/></mesh></group>)}<mesh position={[.48,.57,.32]}><sphereGeometry args={[.022,12,12]}/><meshStandardMaterial color="#a4c6a0" emissive="#85bc9b" emissiveIntensity={devices.coffeeMachine?1.5:0}/></mesh><Html position={[0,.82,0]} center style={{pointerEvents:'none'}}><span className="machine-label">ESPRESSO / {devices.coffeeMachine?'ON':'OFF'}<small>牛奶 · 咖啡豆 · 电力</small></span></Html></Target>
  <Steam position={[.6,1.6,-1.7]} on={!!devices.coffeeMachine} paused={paused}/>
  <Target id="grinder" position={[-1.4,1.08,-1.9]}><mesh position={[0,.2,0]} castShadow><cylinderGeometry args={[.12,.17,.4,32]}/><meshPhysicalMaterial color="#363c37" metalness={.65} roughness={.3}/></mesh><mesh position={[0,.52,0]}><cylinderGeometry args={[.18,.11,.24,32]}/><meshPhysicalMaterial color="#6c5040" roughness={.3} transparent opacity={.8} clearcoat={1}/></mesh><mesh position={[0,.65,0]}><cylinderGeometry args={[.19,.19,.025,32]}/><meshStandardMaterial color="#252d2c" roughness={.35}/></mesh></Target>
  <Target id="fridge"><group ref={fridge} position={[2.6,0,-2.35]}><RoundedBox args={[1.05,2.2,.85]} radius={.055} position={[0,1.1,0]} castShadow><meshPhysicalMaterial color="#b5c0b9" metalness={.85} roughness={.25}/></RoundedBox><mesh position={[0,1.15,.44]}><planeGeometry args={[.88,1.85]}/><meshPhysicalMaterial color="#253d40" metalness={.12} roughness={.1} transparent opacity={.72} clearcoat={1}/></mesh>{[.45,.95,1.45].map(y=><group key={y}>{[-.25,0,.25].map(x=><mesh key={x} position={[x,y,.465]}><cylinderGeometry args={[.05,.05,.24,16]}/><meshPhysicalMaterial color="#b2bca0" metalness={.1} roughness={.15} transparent opacity={.75}/></mesh>)}</group>)}<mesh position={[.34,1.2,.49]}><cylinderGeometry args={[.018,.018,.6,12]}/><meshStandardMaterial color="#b0b6af" metalness={.9} roughness={.15}/></mesh><mesh position={[0,2.02,.46]}><boxGeometry args={[.78,.018,.018]}/><meshStandardMaterial color="#c4e6ea" emissive="#acd8ea" emissiveIntensity={devices.fridge?1.8:0}/></mesh></group></Target>
  <ExternalModel name="coffeeCart" position={[-2.4,0,1.45]} scale={.7} rotation={[0,.2,0]}/>
  {[[-1.7,-.55],[-.3,-.55],[1.1,-.55]].map(([x,z],i)=><ExternalModel key={i} name="barChair" position={[x,0,z]} scale={1.05}/>)
  }
  <Target id="cafeLight">{[-1.9,-.5,1].map(x=><group key={x} position={[x,3.3,0]}><mesh rotation={[Math.PI/2-.4,0,0]}><cylinderGeometry args={[.08,.08,.2,16]}/><meshStandardMaterial color="#253832" metalness={.8} roughness={.3}/></mesh><spotLight position={[0,-.15,.1]} target-position={[x,0,-1.5]} angle={.6} penumbra={1} intensity={devices.cafeLight?8:0} color="#ffe0b2"/></group>)}<mesh position={[-1.5,2.55,-3.27]}><planeGeometry args={[2.6,.035]}/><meshStandardMaterial ref={sign} color="#d7bf97" emissive="#d7bf97" emissiveIntensity={1.2}/></mesh></Target>
  <WarmCafeDetails/>{!standalone&&<><ObjectHologram/><SpaceGuide/></>}
 </>;
}
