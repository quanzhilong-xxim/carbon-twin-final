'use client';
import { Environment, useGLTF } from '@/lib/three/scene-assets';
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame,useThree } from '@react-three/fiber';
import { Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import type { Identity } from '@/lib/store';
export type AvatarAction='idle'|'greeting'|'blink'|'nod'|'listening'|'guide'|'observing'|'recording'|'turning'|'thinking'|'standing'|'walking';

class AvatarBoundary extends Component<{children:React.ReactNode;id:Identity},{failed:boolean}> {
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){console.error('Avatar rendering failed:',error);}
  render(){return this.state.failed?<div className="avatar-poster" style={{backgroundImage:`url(/media/avatars/${this.props.id}.png)`}}><span>静态人物 · 仍可选择身份</span></div>:this.props.children;}
}
function Person({id,engaged,reduced,animate,onReady,action,sequence}:{id:Identity;engaged:boolean;reduced:boolean;animate:boolean;onReady:()=>void;action:AvatarAction;sequence:number}){
 const {scene}=useGLTF(`/models/avatars/${id}.glb`);
 const {gl,invalidate}=useThree();
 const {model,ownedMaterials}=useMemo(()=>{
  const model=scene.clone(true),ownedMaterials:THREE.Material[]=[];
  model.traverse(object=>{if(!(object instanceof THREE.Mesh))return;
   const color=id==='student'&&/^Hair/.test(object.name)?'#dc8ba6':id==='student'&&/^(TailoredBody|Hood|Sleeve)(_|$)/.test(object.name)?'#7e729f':id==='city'&&/^(TailoredBody|Sleeve)(_|$)/.test(object.name)?'#e8eddf':null;
   if(!color)return;const materials=Array.isArray(object.material)?object.material:[object.material];
   const replacements=materials.map(source=>{const material=source.clone() as THREE.MeshStandardMaterial;material.color.set(color);ownedMaterials.push(material);return material;});
   object.material=Array.isArray(object.material)?replacements:replacements[0];
  });return {model,ownedMaterials};
 },[scene,id]);
 useEffect(()=>()=>ownedMaterials.forEach(m=>m.dispose()),[ownedMaterials]);
 useEffect(()=>onReady(),[onReady]);
 const parts=useMemo(()=>({head:model.getObjectByName('Head'),eyes:model.getObjectByName('Eyes'),arm:model.getObjectByName('ArmRight'),body:model.getObjectByName('Breath')}),[model]);
 const elapsed=useRef(0);
 const gestureTime=useRef(0);
 useEffect(()=>{gestureTime.current=0;},[action,sequence]);
 useEffect(()=>{
  const owned:THREE.Mesh[]=[];const head=parts.head,body=parts.body;
  const add=(parent:THREE.Object3D,g:THREE.BufferGeometry,color:string,p:[number,number,number])=>{const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.55}));m.position.set(...p);parent.add(m);owned.push(m);return m;};
  if(head&&id!=='business'){
   if(id==='city')for(const side of [-1,1])add(head,new THREE.TorusGeometry(.058,.005,6,24),'#475c60',[side*.085,.015,.222]);
   const pony=add(head,new THREE.SphereGeometry(1,16,12),id==='city'?'#453635':'#dc8ba6',[.19,.05,-.18]);pony.scale.set(.085,.24,.08);pony.rotation.z=-.35;
   if(id==='student'){
    const cap=add(head,new THREE.SphereGeometry(1,24,16),'#b67e81',[0,.18,-.018]);cap.scale.set(.25,.105,.2);
    for(const side of [-1,1]){
     const lens=add(head,new THREE.SphereGeometry(1,16,12),'#9bc5bf',[side*.088,.015,.211]);lens.scale.set(.045,.043,.012);
     const rim=add(head,new THREE.TorusGeometry(.051,.009,8,24),'#c7a568',[side*.088,.015,.218]);rim.rotation.z=side*.04;
     const points=Array.from({length:8},(_,i)=>new THREE.Vector3(side*(.18+Math.sin(i*1.8)*.024),.035-i*.07,-.07+Math.cos(i*1.8)*.025));
     add(head,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.027,7,false),'#cf7da0',[0,0,0]);
    }
   }
  }
  if(body){if(id==='city'){const tablet=add(body,new THREE.BoxGeometry(.26,.32,.025),'#283d4a',[-.18,-.07,.21]);tablet.rotation.z=-.16;const screen=add(body,new THREE.BoxGeometry(.22,.24,.005),'#9ab9ad',[-.18,-.06,.226]);screen.rotation.z=-.16;}
   if(id==='city'){add(body,new THREE.TorusGeometry(.125,.028,8,24),'#477d79',[0,.2,.1]).rotation.x=Math.PI/2;add(body,new THREE.BoxGeometry(.06,.26,.025),'#548c82',[.06,.06,.18]).rotation.z=.1;}
   if(id==='student'){
    add(body,new THREE.CylinderGeometry(.075,.085,.06,20),'#293d49',[-.16,.035,.226]).rotation.x=Math.PI/2;
    add(body,new THREE.TorusGeometry(.033,.012,8,20),'#b9cebf',[-.16,.035,.263]);
    add(body,new THREE.BoxGeometry(.25,.28,.1),'#4c526f',[0,-.02,-.18]);
    for(const s of [-1,1])add(body,new THREE.BoxGeometry(.032,.36,.026),'#b5a8c4',[s*.16,.02,.15]);
   }
   if(id==='business'){
    const pocket=new THREE.BufferGeometry();
    pocket.setAttribute('position',new THREE.Float32BufferAttribute([-.055,.08,.151,.055,.08,.151,0,.17,.151],3));
    pocket.computeVertexNormals();
    add(body,pocket,'#d1c7a3',[.16,.16,.145]);
    const pin=add(body,new THREE.SphereGeometry(.024,12,8),'#b89958',[-.16,.2,.158]);pin.scale.set(1,.8,.5);
   }
  }
  if(id==='business'){
   const arm=model.getObjectByName('ArmLeft');
   if(arm){const cuff=add(arm,new THREE.TorusGeometry(.045,.014,8,24),'#b99f68',[0,-.31,.02]);cuff.rotation.x=Math.PI/2;}
  }
  if(id==='student'){
   const board=add(model,new THREE.BoxGeometry(.22,.055,.66),'#6c6c8d',[.48,.11,-.04]);board.rotation.y=-.18;
   for(const x of [.4,.56])for(const z of [-.25,.18])add(model,new THREE.CylinderGeometry(.045,.045,.035,12),'#d0c4a3',[x,.07,z]).rotation.x=Math.PI/2;
  }
  return()=>{owned.forEach(m=>{m.removeFromParent();m.geometry.dispose();(m.material as THREE.Material).dispose();});};
 },[model,parts,id]);
 useEffect(()=>{if(!reduced)return;if(parts.head)parts.head.rotation.set(action==='listening'?.16:0,0,0);if(parts.arm)parts.arm.rotation.z=action==='greeting'?1.9:action==='guide'?1.1:-.16;},[parts,reduced,action]);
 useEffect(()=>{if(animate)return;if(parts.body)parts.body.scale.y=1;if(parts.eyes)parts.eyes.scale.y=1;if(parts.head)parts.head.rotation.set(action==='listening'?.16:0,0,0);if(parts.arm){parts.arm.rotation.x=action==='listening'?-.8:0;parts.arm.rotation.z=action==='greeting'?1.9:action==='guide'?1.1:-.16;}invalidate();},[parts,action,animate,invalidate]);
 useEffect(()=>{gl.domElement.dataset.action=action;gl.domElement.dataset.avatarIdentity=id;gl.domElement.dataset.palette=id==='student'?'pink-hair':id==='city'?'ivory-jacket':'dark-business';},[gl,action,id]);
 useFrame((_,dt)=>{if(reduced||!animate)return;elapsed.current+=Math.min(dt,.05);const t=elapsed.current;
  gestureTime.current+=Math.min(dt,.05);const a=gestureTime.current;
  if(parts.body)parts.body.scale.y=1+Math.sin(t*1.7)*.009;
  if(parts.head){parts.head.rotation.y=THREE.MathUtils.damp(parts.head.rotation.y,engaged?-.12:Math.sin(t*.6)*.045,5,dt);parts.head.rotation.z=THREE.MathUtils.damp(parts.head.rotation.z,engaged?.06:0,5,dt);parts.head.rotation.x=THREE.MathUtils.damp(parts.head.rotation.x,action==='nod'?Math.sin(a*8)*.14:action==='listening'?.2:0,8,dt);}
  if(parts.eyes){const blink=action==='blink'?a%1.1:t%4.8;const close=action==='blink'?.25:4.58;parts.eyes.scale.y=blink>close&&blink<close+.22?Math.max(.06,Math.abs(blink-close-.11)/.11):1;}
  if(parts.arm){const target=action==='greeting'?1.95+Math.sin(a*9)*.16:action==='guide'?1.12:action==='listening'?.35:engaged?.16:-.16;parts.arm.rotation.z=THREE.MathUtils.damp(parts.arm.rotation.z,target,7,dt);parts.arm.rotation.x=THREE.MathUtils.damp(parts.arm.rotation.x,action==='listening'?-.8:action==='guide'?-.42:0,5,dt);}
  gl.domElement.dataset.action=action;gl.domElement.dataset.arm=parts.arm?.rotation.z.toFixed(3);gl.domElement.dataset.nod=parts.head?.rotation.x.toFixed(3);gl.domElement.dataset.eyes=parts.eyes?.scale.y.toFixed(3);
 });
 return <primitive object={model} rotation={[0,-.12,0]} dispose={null}/>;
}
function ContextLifecycle({onLost}:{onLost:()=>void}){
 const {gl}=useThree();
 useEffect(()=>{const canvas=gl.domElement;const lost=(event:Event)=>{event.preventDefault();onLost();};canvas.addEventListener('webglcontextlost',lost);return()=>canvas.removeEventListener('webglcontextlost',lost);},[gl,onLost]);
 return null;
}
export function LegacyIdentityAvatar({id,engaged,reduced,visible,active=false,action='idle',sequence=0,posterVisible=true}:{id:Identity;engaged:boolean;reduced:boolean;visible:boolean;active?:boolean;action?:AvatarAction;sequence?:number;posterVisible?:boolean}){
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[pageVisible,setPageVisible]=useState(true);
 const readyCallback=useMemo(()=>()=>setReady(true),[]);
 const accent=id==='student'?'#abc899':id==='business'?'#b7c9dc':'#e4c08a';
 useEffect(()=>{const update=()=>setPageVisible(!document.hidden);update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 const animate=visible&&pageVisible&&!reduced&&(active||engaged||action!=='idle');
 useEffect(()=>{if(!visible)return;const timer=setTimeout(()=>{if(!ready)setFailed(true);},18000);return()=>clearTimeout(timer);},[visible,ready]);
 return <div className="avatar-stage" aria-hidden="true" data-avatar={id} data-ready={ready}>
  {posterVisible&&(!visible||!ready||failed)&&<div className="avatar-loading">{failed?'三维人物已暂停 · 静态人物预览':visible?'为你点亮另一种视角':''}<div className="avatar-poster" style={{backgroundImage:`url(/media/avatars/${id}.png)`}}/></div>}
  {visible&&!failed&&<AvatarBoundary id={id}><Canvas dpr={[1,1.25]} camera={{position:[0,.94,3.05],fov:38}} frameloop={!pageVisible?'never':animate?'always':'demand'} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} onCreated={({gl,camera})=>{camera.lookAt(0,.85,0);gl.toneMapping=THREE.ACESFilmicToneMapping;}}>
   <ContextLifecycle onLost={()=>setFailed(true)}/>
   <Suspense fallback={null}><Environment resolution={64}><Lightformer intensity={2} position={[0,3,2]} scale={[3,3,1]}/><Lightformer intensity={2.5} position={[-3,1,1]} rotation={[0,Math.PI/2,0]} scale={[2,4,1]}/><Lightformer color={accent} intensity={3} position={[2,2,-2]} scale={[2,3,1]}/></Environment>
    <spotLight position={[-2,4,3]} intensity={32} angle={.55} penumbra={1}/><directionalLight position={[2,2,-2]} intensity={2.2} color={accent}/>
    <Person id={id} engaged={engaged} reduced={reduced} animate={animate} onReady={readyCallback} action={action} sequence={sequence}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.005,0]}><circleGeometry args={[.45,64]}/><meshStandardMaterial color="#17191c" roughness={.55}/></mesh>
    <mesh position={[0,.89,-.4]}><torusGeometry args={[.65,.006,8,96]}/><meshBasicMaterial color={accent} toneMapped={false}/></mesh>
   </Suspense>
  </Canvas></AvatarBoundary>}
 </div>;
}
export { default } from './ExploreCharacter';
