'use client';
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Identity } from '@/lib/store';

class AvatarBoundary extends Component<{children:React.ReactNode;id:Identity},{failed:boolean}> {
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){console.error('Avatar rendering failed:',error);}
  render(){return this.state.failed?<div className="avatar-poster" style={{backgroundImage:`url(/media/avatars/${this.props.id}.png)`}}><span>静态人物 · 仍可选择身份</span></div>:this.props.children;}
}
function Person({id,engaged,reduced,onReady}:{id:Identity;engaged:boolean;reduced:boolean;onReady:()=>void}){
 const {scene}=useGLTF(`/models/avatars/${id}.glb`);
 const model=useMemo(()=>scene.clone(true),[scene]);
 useEffect(()=>onReady(),[onReady]);
 const parts=useMemo(()=>({head:model.getObjectByName('Head'),eyes:model.getObjectByName('Eyes'),arm:model.getObjectByName('ArmRight'),body:model.getObjectByName('Breath')}),[model]);
 const elapsed=useRef(0);
 useFrame((_,dt)=>{if(reduced)return;elapsed.current+=Math.min(dt,.05);const t=elapsed.current;
  if(parts.body)parts.body.scale.y=1+Math.sin(t*1.7)*.009;
  if(parts.head){parts.head.rotation.y=THREE.MathUtils.damp(parts.head.rotation.y,engaged?-.12:Math.sin(t*.6)*.045,5,dt);parts.head.rotation.z=THREE.MathUtils.damp(parts.head.rotation.z,engaged?.06:0,5,dt);}
  if(parts.eyes){const blink=t%4.8;parts.eyes.scale.y=blink>4.58?Math.max(.06,Math.abs(blink-4.69)/.11):1;}
  if(parts.arm){const target=engaged?(id==='student'?1.95+Math.sin(t*7)*.13:id==='business'?1.05:1.35+Math.sin(t*2)*.06):-.16;parts.arm.rotation.z=THREE.MathUtils.damp(parts.arm.rotation.z,target,7,dt);parts.arm.rotation.x=THREE.MathUtils.damp(parts.arm.rotation.x,engaged?-.38:0,5,dt);}
 });
 return <primitive object={model} rotation={[0,-.12,0]} dispose={null}/>;
}
export default function IdentityAvatar({id,engaged,reduced,visible}:{id:Identity;engaged:boolean;reduced:boolean;visible:boolean}){
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 const readyCallback=useMemo(()=>()=>setReady(true),[]);
 const accent=id==='student'?'#abc899':id==='business'?'#b7c9dc':'#e4c08a';
 useEffect(()=>{if(!visible)return;const timer=setTimeout(()=>{if(!ready)setFailed(true);},18000);return()=>clearTimeout(timer);},[visible,ready]);
 return <div className="avatar-stage" aria-hidden="true" data-avatar={id} data-ready={ready}>
  {!ready&&<div className="avatar-loading">{failed?'静态人物预览':'为你点亮另一种视角'}<div className="avatar-poster" style={{backgroundImage:`url(/media/avatars/${id}.png)`}}/></div>}
  {visible&&!failed&&<AvatarBoundary id={id}><Canvas dpr={[1,1.25]} camera={{position:[0,.94,3.05],fov:38}} frameloop={reduced?'demand':'always'} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} onCreated={({gl,camera})=>{camera.lookAt(0,.85,0);gl.toneMapping=THREE.ACESFilmicToneMapping;gl.domElement.addEventListener('webglcontextlost',()=>setFailed(true),{once:true});}}>
   <Suspense fallback={null}><Environment resolution={64}><Lightformer intensity={2} position={[0,3,2]} scale={[3,3,1]}/><Lightformer intensity={2.5} position={[-3,1,1]} rotation={[0,Math.PI/2,0]} scale={[2,4,1]}/><Lightformer color={accent} intensity={3} position={[2,2,-2]} scale={[2,3,1]}/></Environment>
    <spotLight position={[-2,4,3]} intensity={32} angle={.55} penumbra={1}/><directionalLight position={[2,2,-2]} intensity={2.2} color={accent}/>
    <Person id={id} engaged={engaged} reduced={reduced} onReady={readyCallback}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.005,0]}><circleGeometry args={[.45,64]}/><meshStandardMaterial color="#17191c" roughness={.55}/></mesh>
    <mesh position={[0,.89,-.4]}><torusGeometry args={[.65,.006,8,96]}/><meshBasicMaterial color={accent} toneMapped={false}/></mesh>
   </Suspense>
   {!reduced&&<EffectComposer multisampling={0}><Bloom intensity={.42} luminanceThreshold={.92} mipmapBlur/></EffectComposer>}
  </Canvas></AvatarBoundary>}
 </div>;
}
