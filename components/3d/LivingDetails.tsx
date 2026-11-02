'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {ExternalModel} from './TwinAssets';
import {ObjectTarget} from './SpaceInteraction';
import {useTwinStore} from '@/lib/experience/store';
import {useUIStore} from '@/lib/stores/UIStore';

/** Bounded GPU billboards: motion is a visual metaphor, not a CFD solver. */
export function Steam({position,on,tint='#e8e4d9',strength=1}:{position:[number,number,number];on:boolean;tint?:string;strength?:number}){
 const budget=useTwinStore(s=>s.particles),reduced=useUIStore(s=>s.reduced);
 const geometry=useMemo(()=>{const g=new THREE.BufferGeometry(),n=Math.max(0,Math.min(64,budget)),p=new Float32Array(n*3),seeds=new Float32Array(n);for(let i=0;i<n;i++)seeds[i]=i*.6180339887%1;g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('seed',new THREE.BufferAttribute(seeds,1));return g;},[budget]);
 const material=useMemo(()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uOn:{value:0},uColor:{value:new THREE.Color(tint)}},vertexShader:`attribute float seed;uniform float uTime;uniform float uOn;varying float alpha;void main(){float age=fract(seed+uTime*.16);vec3 p=position;p.x=sin(seed*60.+age*5.)*(.025+age*.12);p.z=cos(seed*32.+age*3.)*age*.13;p.y=age*.95;alpha=sin(age*3.14159)*.17*uOn;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=min(48.,(14.+age*30.)/-mv.z);gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform vec3 uColor;varying float alpha;void main(){vec2 q=gl_PointCoord-.5;float wisps=.72+.28*sin(q.x*26.+q.y*13.);gl_FragColor=vec4(uColor,exp(-dot(q,q)*14.)*alpha*wisps);}`}),[tint]);
 useFrame(({clock},dt)=>{material.uniforms.uTime.value=clock.elapsedTime;material.uniforms.uOn.value=THREE.MathUtils.damp(material.uniforms.uOn.value,on&&!reduced?strength:0,3,dt);});
 useEffect(()=>()=>geometry.dispose(),[geometry]);useEffect(()=>()=>material.dispose(),[material]);
 return <points geometry={geometry} material={material} position={position} frustumCulled={false} dispose={null}/>;
}
export function Curtains(){
 const rain=useTwinStore(s=>s.rain),energy=useTwinStore(s=>s.energy),reduced=useUIStore(s=>s.reduced),mat=useRef<THREE.ShaderMaterial>(null);
 const uniforms=useMemo(()=>({uTime:{value:0},uMouse:{value:new THREE.Vector2()},uWind:{value:.3}}),[]);
 useFrame(({clock,pointer},dt)=>{if(!mat.current)return;mat.current.uniforms.uTime.value=reduced?0:clock.elapsedTime;mat.current.uniforms.uMouse.value.lerp(pointer,.08);mat.current.uniforms.uWind.value=THREE.MathUtils.damp(mat.current.uniforms.uWind.value,(energy.enabled?.22:.08)+(rain?.06:0),3,dt);});
 return <ObjectTarget id="curtain"><mesh position={[-3.77,2,1.8]} rotation={[0,Math.PI/2,0]} castShadow>
  <planeGeometry args={[2,2.7,32,36]}/><shaderMaterial ref={mat} uniforms={uniforms} side={THREE.DoubleSide}
   vertexShader={`uniform float uTime;uniform vec2 uMouse;uniform float uWind;varying vec2 vUv;varying float vFold;void main(){vUv=uv;vec3 p=position;float loose=1.-uv.y;float fold=sin(uv.x*48.)*.045;float hand=exp(-pow(uv.x-(uMouse.x*.5+.5),2.)*28.);p.z+=fold+sin(uTime*.7+uv.y*2.7+uv.x*5.)*loose*uWind+hand*sin(uTime*2.+uv.y*6.)*loose*.12;p.x+=sin(uTime*.45+uv.y*2.)*loose*.045;vFold=fold;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`}
   fragmentShader={`varying vec2 vUv;varying float vFold;void main(){float weave=sin(vUv.x*850.)*sin(vUv.y*1000.)*.016;vec3 color=vec3(.72,.69,.59)*( .87+vFold*2.+weave);gl_FragColor=vec4(color,1.);}`}/>
 </mesh><mesh position={[-3.7,3.4,1.8]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.025,.025,2.3,12]}/><meshStandardMaterial color="#9c8f6f" metalness={.8} roughness={.3}/></mesh></ObjectTarget>;
}
export function ResidentialLife(){
 const devices=useTwinStore(s=>s.devices),layout=useTwinStore(s=>s.layout),energy=useTwinStore(s=>s.energy),kettle=useRef<THREE.Group>(null),light=useRef<THREE.RectAreaLight>(null),bed=useRef<THREE.Group>(null),velocity=useRef(0),press=useRef(0),reduced=useUIStore(s=>s.reduced);
 useFrame(({clock},dt)=>{if(light.current)light.current.intensity=devices.television?2.5+(reduced?0:Math.sin(clock.elapsedTime*1.7)*.35):0;if(kettle.current)kettle.current.rotation.z=devices.kettle&&!reduced?Math.sin(clock.elapsedTime*49)*.0012:0;if(bed.current&&!reduced){const step=Math.min(dt,.04);velocity.current+=(-100*press.current-13*velocity.current)*step;press.current+=velocity.current*step;bed.current.scale.y=1+press.current;}});
 return <>
  <Curtains/>
  <group ref={kettle} position={[layout.table.x,.61,layout.table.z]}><ObjectTarget id="kettle"><ExternalModel name="kettle" scale={.7} position={[.1,0,.12]}/></ObjectTarget><Steam position={[.17,.27,.1]} on={!!devices.kettle}/></group>
  <rectAreaLight ref={light} position={[-1.5,1,2.65]} rotation={[0,0,0]} width={.51} height={.38} color="#a9c5f4" intensity={0}/>
  <mesh position={[-1.5,1.03,2.7]} rotation={[0,Math.PI,0]}><planeGeometry args={[.51,.38]}/><meshStandardMaterial color={devices.television?'#b4c2cf':'#20262a'} emissive={devices.television?'#8ba7c7':'#000000'} emissiveIntensity={.4} roughness={.28}/></mesh>
  <group ref={bed} position={[1.9,.06,1.7]} onClick={()=>{velocity.current=-.7;}} name="spring-seat">
   <RoundedBox args={[1.3,.26,1.4]} radius={.12} position={[0,.23,0]} castShadow><meshStandardMaterial color="#cdc6b1" roughness={.98}/></RoundedBox><RoundedBox args={[.9,.12,.35]} radius={.08} position={[0,.41,-.4]} castShadow><meshStandardMaterial color="#a1a496" roughness={1}/></RoundedBox>
  </group>
  {energy.temperature>=26&&energy.grade===1&&[-3.18,-2.98,-3.07].map((x,i)=><group key={x} position={[x,.87+i*.09,-.35]}><mesh><sphereGeometry args={[.026,8,8]}/><meshStandardMaterial color="#ddc1a2" roughness={.8}/></mesh>{[0,1,2,3,4].map(j=><mesh key={j} position={[Math.cos(j*1.256)*.03,Math.sin(j*1.256)*.03,0]}><sphereGeometry args={[.02,6,6]}/><meshStandardMaterial color="#e7d8bd"/></mesh>)}</group>)}
 </>;
}
