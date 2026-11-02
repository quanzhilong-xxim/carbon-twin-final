'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import {Html,RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {useTwinStore} from '@/lib/experience/store';
import {useUIStore} from '@/lib/stores/UIStore';
import {calculateRoom,type RoomEnergy} from '@/lib/experience/room';
import {SpaceGuide} from './SpaceInteraction';

const vertex=`uniform float uTime;uniform float uOn;uniform float uHeat;uniform vec2 uMouse;attribute float aSeed;varying float vAlpha;void main(){float age=fract(aSeed+uTime*.16);float spread=.16+age*.8;vec3 p=position;p.x+=(sin(aSeed*98.+age*6.)*.2+sin(age*3.14)*uMouse.x*.5)*spread;p.y-=age*1.5;p.z+=age*2.4;p.x+=sin(aSeed*61.+uTime+age*7.)*.055*age;p.z+=sin(age*9.+aSeed*12.)*.08*age;p.y+=cos(aSeed*52.+uTime)*.03;vAlpha=sin(age*3.14159)*.24*uOn;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=min(80.,(18.+age*42.)/-mv.z);gl_Position=projectionMatrix*mv;}`;
const fragment=`uniform float uHeat;varying float vAlpha;void main(){vec2 p=gl_PointCoord-.5;float wisps=.78+.22*sin(p.x*26.+p.y*18.);float a=exp(-dot(p,p)*15.)*vAlpha*wisps;vec3 c=mix(vec3(.61,.86,.92),vec3(.75,.38,.21),uHeat);gl_FragColor=vec4(c,a);}`;
function Airflow({energy}:{energy:RoomEnergy}){
 const budget=useTwinStore(s=>s.particles),quality=useTwinStore(s=>s.quality),reduced=useUIStore(s=>s.reduced);
 const geometry=useMemo(()=>{const n=quality==='high'?budget*4:budget*2,g=new THREE.BufferGeometry(),p=new Float32Array(n*3),seed=new Float32Array(n);for(let i=0;i<n;i++){seed[i]=(i*.61803398875)%1;p[i*3]=((i*31%97)/97-.5)*1.55;p[i*3+1]=((i*13%43)/43-.5)*.08;}g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));return g;},[budget,quality]);
 const material=useMemo(()=>new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uOn:{value:0},uHeat:{value:0},uMouse:{value:new THREE.Vector2()}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,blending:THREE.NormalBlending}),[]);
 useEffect(()=>()=>{geometry.dispose();},[geometry]);useEffect(()=>()=>material.dispose(),[material]);
 useFrame(({clock,pointer},dt)=>{material.uniforms.uTime.value=clock.elapsedTime;material.uniforms.uOn.value=THREE.MathUtils.damp(material.uniforms.uOn.value,energy.enabled&&energy.hours>0&&!reduced?1:0,4,dt);material.uniforms.uHeat.value=energy.grade===3&&energy.temperature<24?.8:.0;material.uniforms.uMouse.value.lerp(pointer,.12);});
 return <points position={[.65,2.48,-3.08]} geometry={geometry} material={material} frustumCulled={false} dispose={null}/>;
}
/** Custom indoor assembly; the licensed photogrammetric outdoor unit remains on the balcony. */
export default function MicroClimate(){
 const energy=useTwinStore(s=>s.energy),wind=useTwinStore(s=>s.wind),ghost=useTwinStore(s=>s.ghost),audio=useTwinStore(s=>s.audio),dispatch=useTwinStore(s=>s.dispatch);
 const busy=useUIStore(s=>s.networkBusy),reduced=useUIStore(s=>s.reduced);
 const [settled,setSettled]=useState(energy),fan=useRef<THREE.Group>(null),flap=useRef<THREE.Group>(null),led=useRef<THREE.MeshStandardMaterial>(null);
 const blade=useRef<THREE.InstancedMesh>(null),speed=useRef(0),flapSpeed=useRef(0),running=energy.enabled&&energy.hours>0;
 useEffect(()=>{const timer=setTimeout(()=>setSettled(energy),100);return()=>clearTimeout(timer);},[energy]);
 useEffect(()=>{if(!blade.current)return;const t=new THREE.Object3D();for(let i=0;i<24;i++){const a=i/24*Math.PI*2;t.position.set(0,Math.sin(a)*.07,Math.cos(a)*.07);t.rotation.x=-a;t.updateMatrix();blade.current.setMatrixAt(i,t.matrix);}blade.current.instanceMatrix.needsUpdate=true;},[]);

 useEffect(()=>{if(!audio)return;let disposed=false,cleanup:(()=>void)|undefined;void import('howler').then(({Howl})=>{if(disposed)return;const sound=new Howl({src:['/audio/aircon-loop.wav'],volume:.08,rate:2}),timers=new Set<ReturnType<typeof setTimeout>>();let last=0;const play=()=>{if(Date.now()-last<250)return;last=Date.now();const id=sound.play(),t=setTimeout(()=>{sound.stop(id);timers.delete(t);},70);timers.add(t);};window.addEventListener('twin-foley',play);window.addEventListener('twin-impact',play);cleanup=()=>{window.removeEventListener('twin-foley',play);window.removeEventListener('twin-impact',play);timers.forEach(clearTimeout);sound.unload();};});return()=>{disposed=true;cleanup?.();};},[audio]);
 useFrame(({clock},dt)=>{
  speed.current=THREE.MathUtils.damp(speed.current,running&&!reduced?38:0,3,dt);if(fan.current)fan.current.rotation.x+=speed.current*Math.min(dt,.05);
  if(flap.current){const step=Math.min(dt,.033),target=running?-.32+(reduced?0:Math.sin(clock.elapsedTime*.3)*.06):.24;flapSpeed.current+=((target-flap.current.rotation.x)*45-flapSpeed.current*12)*step;flap.current.rotation.x+=flapSpeed.current*step;}
  if(led.current){led.current.emissive.set(!running?'#203026':energy.grade===3&&energy.temperature<24?'#f06645':'#9ed6ad');led.current.color.copy(led.current.emissive);led.current.emissiveIntensity=running?(energy.grade===3&&energy.temperature<24?1+Math.sin(clock.elapsedTime*7)*.7:1.2):.05;}

 });
 const pick=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();if(!busy)dispatch({type:'SELECT',object:'aircon'});};
 const result=calculateRoom(energy),ideal=calculateRoom({...energy,temperature:26,grade:1});
 return <>
  <group position={[.65,2.8,-3.26]} onClick={pick} name="inspect-aircon" onPointerOver={()=>window.dispatchEvent(new Event('twin-foley'))}>
   <RoundedBox args={[2.05,.59,.36]} radius={.09} smoothness={4} castShadow><meshPhysicalMaterial color="#e4e3de" roughness={.25} metalness={.12} clearcoat={.6}/></RoundedBox>
   <mesh position={[0,-.16,.187]}><planeGeometry args={[1.72,.19]}/><meshStandardMaterial color="#1e292a" roughness={.6}/></mesh>
   <group ref={fan} position={[0,-.14,.184]}><mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.03,.03,1.62,10]}/><meshStandardMaterial color="#3e5050" metalness={.5} roughness={.4}/></mesh><instancedMesh ref={blade} args={[undefined,undefined,24]}><boxGeometry args={[1.62,.035,.014]}/><meshStandardMaterial color="#71817c" metalness={.5} roughness={.3}/></instancedMesh></group>
   <group ref={flap} position={[0,-.235,.2]}><mesh><boxGeometry args={[1.8,.045,.16]}/><meshPhysicalMaterial color="#dddeda" roughness={.25} clearcoat={.8}/></mesh></group>
   <mesh position={[.82,.055,.185]}><circleGeometry args={[.022,12]}/><meshStandardMaterial ref={led} color="#99dbad" emissive="#99dbad"/></mesh>
   <Html position={[.58,.11,.2]} transform distanceFactor={2.5} zIndexRange={[6,0]}><span className="ac-display">{running?`${energy.temperature}°`:'OFF'}</span></Html>
   <Html position={[-.57,.11,.2]} transform distanceFactor={3} zIndexRange={[6,0]}><button className="ac-label" onClick={()=>dispatch({type:'SELECT',object:'aircon'})}>CARBON / AIR<br/><small>教学能效 {energy.grade} 档 ↗</small></button></Html>
  </group>
  {wind&&<Airflow energy={settled}/>}
  {ghost&&<group position={[-2.1,2.9,-2.4]}><RoundedBox args={[2.1,.68,.4]} radius={.1}><meshPhysicalMaterial color="#97d9bb" transparent opacity={.14} depthWrite={false} roughness={.2} metalness={.2}/></RoundedBox><Html center position={[0,.6,0]} distanceFactor={5} zIndexRange={[10,0]}><div className="ghost-label">26°C / 1 档 对比情景<br/><b>每日相差 {(result.acDaily-ideal.acDaily).toFixed(3)} kg CO₂</b><small>相同时长 · 简化功率情景，非认证能效预测</small></div></Html></group>}
  <SpaceGuide/>
 </>;
}
