'use client';
import {useEffect,useRef,useState} from 'react';
import {Physics,RigidBody,CuboidCollider,useRapier,type RapierRigidBody} from '@react-three/rapier';
import {Html,RoundedBox} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useTwinStore} from '@/lib/experience/store';

/** Small rigid props only. The sofa spring is a separate visual deformation. */
function Book(){
 const body=useRef<RapierRigidBody>(null),{camera,gl,controls}=useThree(),[held,setHeld]=useState(false),target=useRef(new THREE.Vector3()),last=useRef(0);
 const {rapier}=useRapier();
 // Changing the JSX type also reapplies the initial transform in Rapier 1.x.
 // Switch the body in place so a release preserves the actual dragged position.
 useEffect(()=>{body.current?.setBodyType(held?rapier.RigidBodyType.KinematicPositionBased:rapier.RigidBodyType.Dynamic,true);body.current?.wakeUp();},[held,rapier]);
 useEffect(()=>{const inspect=(event:Event)=>{if(!body.current)return;const position=body.current.translation(),screen=new THREE.Vector3(position.x,position.y,position.z).project(camera),rect=gl.domElement.getBoundingClientRect();(event as CustomEvent<(value:unknown)=>void>).detail({position,held,sleeping:body.current.isSleeping(),screen:{x:rect.left+(screen.x+1)*rect.width/2,y:rect.top+(1-screen.y)*rect.height/2}});};window.addEventListener('twin-physics-query',inspect);return()=>window.removeEventListener('twin-physics-query',inspect);},[camera,gl,held]);
 useEffect(()=>{if(!held||!controls)return;const orbit=controls as unknown as {enabled:boolean},previous=orbit.enabled;orbit.enabled=false;return()=>{orbit.enabled=previous;};},[held,controls]);
 useEffect(()=>{if(!held)return;const up=()=>setHeld(false);window.addEventListener('pointerup',up);window.addEventListener('blur',up);return()=>{window.removeEventListener('pointerup',up);window.removeEventListener('blur',up);};},[held]);
 useEffect(()=>{if(!held)return;const move=(e:PointerEvent)=>{if(!body.current)return;const rect=gl.domElement.getBoundingClientRect(),p=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(p,camera);const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-6.05);if(ray.ray.intersectPlane(plane,target.current))body.current.setNextKinematicTranslation({x:THREE.MathUtils.clamp(target.current.x,-3.5,3.5),y:6.05,z:THREE.MathUtils.clamp(target.current.z,-3,3)});};gl.domElement.addEventListener('pointermove',move);return()=>gl.domElement.removeEventListener('pointermove',move);},[held,camera,gl]);
 return <RigidBody ref={body} type="dynamic" position={[0,.92,-.2]} colliders="cuboid" restitution={.12} friction={.8} linearDamping={.8} angularDamping={1} onCollisionEnter={()=>{if(Date.now()-last.current>300){last.current=Date.now();window.dispatchEvent(new Event('twin-impact'));}}}>
  <group onPointerDown={e=>{if(useTwinStore.getState().experience.view==='walk')return;e.stopPropagation();setHeld(true);}} onPointerUp={()=>setHeld(false)}>
   <RoundedBox args={[.24,.04,.17]} radius={.008} castShadow><meshStandardMaterial color="#59776a" roughness={.92}/></RoundedBox><mesh position={[0,.003,.087]}><boxGeometry args={[.22,.025,.003]}/><meshStandardMaterial color="#e5dccb" roughness={1}/></mesh>
  </group>
 </RigidBody>;
}
export default function PhysicsDetails(){
 const layout=useTwinStore(s=>s.layout),editing=useTwinStore(s=>s.experience.state==='layout');
 return <Physics gravity={[0,-9.81,0]} timeStep={1/60} paused={editing} interpolate>
  <RigidBody type="fixed" colliders={false}><CuboidCollider args={[4,.05,3.5]} position={[0,-.05,0]}/><CuboidCollider args={[.43,.04,.84]} position={[layout.table.x,.58,layout.table.z]} rotation={[0,layout.table.rotation,0]}/></RigidBody>
  <group key={`${layout.table.x}:${layout.table.z}:${layout.table.rotation}`} position={[layout.table.x,0,layout.table.z]}><Book/></group>
  <Html position={[layout.table.x,.9,layout.table.z-.25]} center zIndexRange={[4,0]} style={{pointerEvents:'none'}}><span className="physics-note">拖动书本 · 松手落下</span></Html>
 </Physics>;
}
