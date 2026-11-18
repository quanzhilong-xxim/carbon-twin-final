'use client';
import { useTexture } from '@/lib/three/scene-assets';
import {Suspense,lazy,useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import { Html, Line, TransformControls, Grid } from '@react-three/drei';
import {RectAreaLightUniformsLib} from 'three-stdlib';
import * as THREE from 'three';
import {ExternalModel,MODEL_BASE} from './TwinAssets';
import {useTwinStore} from '@/lib/experience/store';
import {calculateRoom,constrainFurniture,type FurnitureId} from '@/lib/experience/room';
import type {RoomObject} from '@/lib/experience/ExperienceMachine';
import {useUIStore} from '@/lib/stores/UIStore';
import {FACTORS} from '@/lib/emissions';
import MicroClimate from './MicroClimate';
import RoomEnvelope from './RoomEnvelope';
import RainWindow from './RainWindow';
import {ResidentialLife} from './LivingDetails';
import {ObjectHologram,SpaceReady} from './SpaceInteraction';

const PhysicsDetails=lazy(()=>import('./PhysicsDetails'));
export default function RoomScene({rotationMode=false}:{rotationMode?:boolean}){
 const experience=useTwinStore(s=>s.experience),energy=useTwinStore(s=>s.energy),layout=useTwinStore(s=>s.layout),dispatch=useTwinStore(s=>s.dispatch);
 const locked=useUIStore(s=>s.networkBusy),revision=useUIStore(s=>s.ecoRevision),actionRevision=useUIStore(s=>s.actionRevision),highlighted=useUIStore(s=>s.highlighted),rain=useTwinStore(s=>s.rain);
 const result=calculateRoom(energy),stress=Math.min(1,Math.max(0,(result.daily-6)/26)),editing=experience.state==='layout',selected=experience.selected;
 const [hover,setHover]=useState<RoomObject|null>(null);
 const sofa=useRef<THREE.Group>(null),table=useRef<THREE.Group>(null),ac=useRef<THREE.Group>(null),plant=useRef<THREE.Group>(null),light=useRef<THREE.RectAreaLight>(null),indicator=useRef<THREE.MeshStandardMaterial>(null),ring=useRef<THREE.Mesh>(null);
 const textures=useTexture([`${MODEL_BASE}wood-color.jpg`,`${MODEL_BASE}wood-normal.jpg`,`${MODEL_BASE}wood-rough.jpg`]);
 const wood=useMemo(()=>textures.map((t,i)=>{const c=t.clone();c.wrapS=c.wrapT=THREE.RepeatWrapping;c.repeat.set(3,3);if(i===0)c.colorSpace=THREE.SRGBColorSpace;c.needsUpdate=true;return c;}),[textures]);
 useEffect(()=>()=>wood.forEach(t=>t.dispose()),[wood]);
 useEffect(()=>{RectAreaLightUniformsLib.init();},[]);
 useEffect(()=>{for(const [id,ref] of [['sofa',sofa],['table',table]] as const){ref.current?.traverse(o=>{if(o instanceof THREE.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){m.emissive.set(selected===id||hover===id?'#9dcbb4':'#000000');m.emissiveIntensity=.12;}}});}},[selected,hover]);
 const green=useMemo(()=>new THREE.Color('#ffe2ba'),[]),red=useMemo(()=>new THREE.Color('#a93f33'),[]),tone=useMemo(()=>new THREE.Color(),[]);
 useFrame(({clock,pointer},dt)=>{
  if(light.current){tone.copy(green).lerp(red,stress*.8);light.current.color.lerp(tone,1-Math.exp(-dt*3));}
  if(indicator.current)indicator.current.emissiveIntensity=THREE.MathUtils.damp(indicator.current.emissiveIntensity,energy.hours/24*2,5,dt);
  if(plant.current){const target=.68+(1-stress)*.4+(revision>0?.08:0);plant.current.scale.y=THREE.MathUtils.damp(plant.current.scale.y,target,3,dt);plant.current.rotation.z=Math.sin(clock.elapsedTime*.6)*(.012+Math.max(0,-pointer.x)*.016);}
  if(ring.current)ring.current.rotation.z=clock.elapsedTime*.18;
  ac.current?.traverse(o=>{if(o instanceof THREE.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m instanceof THREE.MeshStandardMaterial){m.emissive.set(stress>.65?'#ff331c':selected==='aircon'||hover==='aircon'?'#9bdcca':'#000000');m.emissiveIntensity=stress>.65?.12+Math.sin(clock.elapsedTime*5)*.04:selected==='aircon'||hover==='aircon'?.15:0;}}}});
 });
 const select=(id:RoomObject)=>(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();if(!locked)dispatch({type:'SELECT',object:id});};
 const hoverProps=(id:RoomObject)=>({onPointerOver:(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();setHover(id);useTwinStore.setState({hovered:id});document.body.style.cursor='pointer';window.dispatchEvent(new Event('twin-foley'));},onPointerOut:()=>{setHover(null);useTwinStore.setState({hovered:null});document.body.style.cursor='';}});
 const picked=selected==='sofa'?sofa:selected==='table'?table:null;
 const move=()=>{if(!picked?.current||!selected||!(selected==='sofa'||selected==='table'))return;const id:FurnitureId=selected,obj=picked.current,old=useTwinStore.getState().layout;const p=constrainFurniture(id,{x:obj.position.x,z:obj.position.z,rotation:obj.rotation.y},old);obj.position.set(p.x,0,p.z);obj.rotation.set(0,p.rotation,0);if(p.x!==old[id].x||p.z!==old[id].z||p.rotation!==old[id].rotation)useTwinStore.setState({layout:{...old,[id]:p}});};
 return <>
  <ambientLight intensity={.12} color="#efdbc5"/>
  <rectAreaLight ref={light} position={[0,3.4,1.2]} rotation={[-Math.PI/2,0,0]} width={5} height={4} intensity={6} color="#ffe2ba"/>
  <rectAreaLight position={[-3.8,2,-.8]} rotation={[0,-Math.PI/2,0]} width={3} height={2.4} intensity={9} color="#b9d8ed"/>
  <spotLight position={[2.9,3.4,2]} target-position={[-1,0,-1]} intensity={36} angle={.9} penumbra={1} castShadow shadow-mapSize={[512,512]} shadow-bias={-.0004} color="#ffc98e"/>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow position={[0,-.025,0]}><planeGeometry args={[8,7]}/><meshStandardMaterial map={wood[0]} normalMap={wood[1]} roughnessMap={wood[2]} roughness={.85} normalScale={new THREE.Vector2(.4,.4)}/></mesh>
  <RoomEnvelope/>
  {rain&&<RainWindow/>}
  {[-2.9,-.7,1.5,3.2].map(z=><mesh key={z} position={[-3.9,2.05,z]}><boxGeometry args={[.08,2.5,.06]}/><meshStandardMaterial color="#333e3f" metalness={.8} roughness={.25}/></mesh>)}
  <mesh position={[0,.07,-3.37]}><boxGeometry args={[8,.14,.06]}/><meshStandardMaterial color="#4b4940" roughness={.65}/></mesh>
  <mesh position={[-1.35,.012,.05]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[4.2,3.3]}/><meshStandardMaterial color="#aaa391" roughness={1}/></mesh>
  <ExternalModel nameOverride="inspect-sofa" name="sofaModern" objectRef={sofa} position={[layout.sofa.x,0,layout.sofa.z]} rotation={[0,layout.sofa.rotation,0]} scale={.88} onClick={select('sofa')} {...hoverProps('sofa')}/>
  <ExternalModel nameOverride="inspect-table" name="table" objectRef={table} position={[layout.table.x,0,layout.table.z]} rotation={[0,layout.table.rotation,0]} scale={1.5} onClick={select('table')} {...hoverProps('table')}/>
  <group position={[layout.table.x,.6,layout.table.z]} rotation={[0,layout.table.rotation,0]}><mesh position={[-.2,.075,0]} castShadow><cylinderGeometry args={[.085,.065,.15,24]}/><meshPhysicalMaterial color="#ded5bb" roughness={.15} clearcoat={1}/></mesh><mesh position={[.12,.045,.08]} castShadow><cylinderGeometry args={[.11,.11,.09,32]}/><meshPhysicalMaterial color="#607b70" roughness={.15} metalness={.5} clearcoat={1}/></mesh></group>
  <mesh position={[4.65,-.12,-2.4]} receiveShadow><boxGeometry args={[1.1,.24,1.9]}/><meshStandardMaterial color="#8d938c" roughness={.9}/></mesh>
  <ExternalModel nameOverride="inspect-aircon" name="aircon" objectRef={ac} position={[4.65,0,-2.65]} rotation={[0,-Math.PI/2,0]} scale={1.3} onClick={select('aircon')} {...hoverProps('aircon')}/>
  <ExternalModel nameOverride="inspect-television" name="television" position={[-1.5,.44,2.95]} rotation={[0,Math.PI,0]} scale={2.15} onClick={select('television')} {...hoverProps('television')}/>
  <mesh position={[-1.5,.2,2.95]} castShadow receiveShadow><boxGeometry args={[2.7,.4,.65]}/><meshStandardMaterial map={wood[0]} roughness={.65}/></mesh>
  <group ref={plant} position={[-3.1,0,-.4]}><ExternalModel nameOverride="inspect-plant" name="plant" scale={.9} onClick={select('plant')} {...hoverProps('plant')}/></group>
  <MicroClimate/><ResidentialLife/><Suspense fallback={null}><PhysicsDetails/></Suspense><ObjectHologram/><SpaceReady/>
  <mesh position={[4.45,1.15,-2.36]}><sphereGeometry args={[.028,8,8]}/><meshStandardMaterial ref={indicator} color="#7dfa9b" emissive="#7dfa9b" emissiveIntensity={energy.hours/24*2}/></mesh>
  <mesh position={[-1.7,2.35,-3.37]}><planeGeometry args={[1.3,1.35]}/><meshStandardMaterial color="#252e28" roughness={.9}/></mesh>
  <Html position={[-1.7,2.35,-3.28]} transform distanceFactor={2.2} zIndexRange={[8,0]}><div className="room-art">EVERY<br/><i>WATT.</i><small>HAS A STORY.</small></div></Html>
  {editing&&<Grid position={[0,.02,0]} args={[8,7]} cellSize={.25} cellThickness={.4} cellColor="#a7c9b6" sectionSize={1} sectionColor="#bdddc8" sectionThickness={.7} fadeDistance={14}/>}
  {editing&&picked?.current&&!locked&&<TransformControls object={picked.current} mode={rotationMode?'rotate':'translate'} showX={!rotationMode} showY={rotationMode} showZ={!rotationMode} translationSnap={.25} rotationSnap={Math.PI/12} onObjectChange={move} size={.7}/>}
  {selected==='aircon'&&<>
   <Line points={[[.65,2.5,-3.05],[.65,2.1,-2.8],[-.4,2.1,-2.8]]} color="#bce0cc" lineWidth={1}/>
   <group position={[1.3,2.8,-2.6]}><mesh ref={ring}><torusGeometry args={[.18,.02,8,48,Math.PI*1.6]}/><meshStandardMaterial color="#c1f7c7" emissive="#9eeab4" emissiveIntensity={1.5}/></mesh></group>
   <Html position={[1.8,1.7,-2.65]} transform distanceFactor={2.2} zIndexRange={[12,0]}><div className="holo-meter"><small>01 / COOLING SYSTEM</small><b>{result.acDaily.toFixed(3)}<em> kg CO₂ / 日</em></b><span>{result.watts.toFixed(0)} W × {energy.hours} h ÷ 1000 × {FACTORS.electricity.value}</span><span>S1 · 待核验冷媒泄漏 / S3 · {energy.embodied===null?'待提供产品 EPD':`${energy.embodied} kg CO₂e`}</span><small>输入功率为教学假设{actionRevision>0&&highlighted==='energy'?' · AI 已定位':''}</small></div></Html>
  </>}
 </>;
}
