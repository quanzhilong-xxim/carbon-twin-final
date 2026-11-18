'use client';
import { useGLTF } from '@/lib/three/scene-assets';
import { useEffect, useMemo, useRef } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { StoryWater } from '../ecology/NaturalSurfaces';
import { useStoryAtmosphere } from '@/lib/stores/StoryAtmosphere';
import { useUIStore } from '@/lib/stores/UIStore';
import ExploreStaticBatch from './ExploreStaticBatch';
import WaterfrontLandscape from './WaterfrontLandscape';
import {storyLighting} from '@/lib/visuals/storyLighting';

function CourtyardTreeRows({ paused }: { paused: boolean }) {
  const { scene } = useGLTF('/models/behaviour-v123/courtyard-tree.glb'), refs = useRef<THREE.InstancedMesh[]>([]);
  const parts = useMemo(() => { const result: {geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]}[] = []; scene.updateMatrixWorld(true); scene.traverse(o => { if (o instanceof THREE.Mesh) result.push({geometry:o.geometry.clone().applyMatrix4(o.matrixWorld),material:o.material}); }); return result; }, [scene]);
  const rows = useMemo(() => [...Array.from({length:24}, (_,i) => ({x:(i%8)*13-45.5,z:-8-Math.floor(i/8)*13,rotation:i*2.4})), ...[-38,-24,-9,9,24,38].map((x,i)=>({x,z:3.5,rotation:i*2.1}))], []);
  const dummy = useMemo(() => new THREE.Object3D(), []), time = useRef(0), initialized=useRef(false);
  useEffect(() => () => parts.forEach(p => p.geometry.dispose()), [parts]);
  useFrame((_,dt) => { if(paused&&initialized.current)return;if (!paused) time.current += Math.min(dt,.05); rows.forEach((p,i) => { dummy.position.set(p.x,0,p.z);dummy.scale.setScalar(.64+(i%3)*.035);dummy.rotation.set(Math.sin(time.current*.5+i)*.005,p.rotation,Math.cos(time.current*.6+i)*.004);dummy.updateMatrix();refs.current.forEach(m=>m?.setMatrixAt(i,dummy.matrix)); });refs.current.forEach(m=>{if(m){m.instanceMatrix.needsUpdate=true;if(!initialized.current){m.computeBoundingSphere();if(m.boundingSphere)m.boundingSphere.radius*=1.03;}}});initialized.current=true; });
  return <>{parts.map((p,i)=><instancedMesh key={i} ref={m=>{if(m)refs.current[i]=m;}} args={[p.geometry,p.material,rows.length]} dispose={null} castShadow receiveShadow />)}</>;
}
function StreetVehicle({ name, offset, road, paused }: { name: 'sedan' | 'taxi' | 'bus'; offset: number; road: number; paused: boolean }) {
  const {scene}=useGLTF(`/models/city-studies/vehicle-${name}.glb`), clone=useMemo(()=>scene.clone(true),[scene]),root=useRef<THREE.Group>(null),time=useRef(0);
  useFrame((_,dt)=>{if(!paused)time.current+=Math.min(dt,.05);if(root.current){root.current.position.x=((time.current*2+offset)%104)-52;root.current.position.z=-11.5-road*13;}});
  return <group ref={root} position={[offset-52,.08,-11.5-road*13]} rotation={[0,Math.PI/2,0]}><primitive object={clone} dispose={null}/></group>;
}
function Block({p,s,color}:{p:[number,number,number];s:[number,number,number];color:string}) {return <mesh position={p} castShadow receiveShadow><boxGeometry args={s}/><meshStandardMaterial color={color} roughness={.78}/></mesh>;}
export default function LivingCityStreets({paused=false}:{paused?:boolean}) {
  const reducedMotion=useUIStore(s=>s.reduced),time=useStoryAtmosphere(s=>s.time),night=time==='night'||time==='bluehour',{gl}=useThree(),reduced=reducedMotion||paused;
  useEffect(()=>{gl.domElement.dataset.districtBuildings='25';gl.domElement.dataset.courtyardTrees='30';gl.domElement.dataset.districtRevision='v123-waterfront';gl.domElement.dataset.streetRevision='v123-depth';},[gl]);
  return <group>
    <ExploreStaticBatch revision={time}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.06,-22.25]} receiveShadow><planeGeometry args={[116,63.5]}/><meshStandardMaterial color="#748376" roughness={.96}/></mesh>
    <Block p={[0,-.02,9.6]} s={[116,.18,.32]} color="#8e978a"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.005,1.6]} receiveShadow><planeGeometry args={[22,11.3]}/><meshStandardMaterial color="#aeb2a1" roughness={.88}/></mesh>
    {[-38,-24,-9,9,24,38].map(x=><group key={x}><Block p={[x,.15,3.5]} s={[3.2,.3,2.5]} color="#a09c87"/><Block p={[x,.31,3.5]} s={[2.94,.035,2.25]} color="#5c7454"/></group>)}
    {[0,1,2].map(row=><group key={row} position={[0,0,-11.5-row*13]}>
      <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[110,4.6]}/><meshStandardMaterial color="#435151" roughness={.92}/></mesh>
      {[-1,1].map(side=><group key={side}><Block p={[0,.06,side*2.7]} s={[110,.12,.55]} color="#c3c8b6"/>{Array.from({length:11},(_,i)=><Block key={i} p={[-49+i*9.8,.035,side*.85]} s={[2,.025,.08]} color="#e0d7b9"/>)}</group>)}
      {Array.from({length:7},(_,i)=><Block key={i} p={[-2.2+i*.72,.04,0]} s={[.4,.025,4.3]} color="#ddd7c2"/>)}
    </group>)}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.03,7.5]} receiveShadow><planeGeometry args={[110,4]}/><meshStandardMaterial color="#a3aa99" roughness={.83}/></mesh>
    {[-53,53].map(x=><group key={x}><Block p={[x,.01,-21]} s={[4.6,.025,60]} color="#435151"/>{[-1,1].map(side=><Block key={side} p={[x+side*2.65,.06,-21]} s={[.55,.12,60]} color="#c3c8b6"/>)}</group>)}
    {Array.from({length:37},(_,i)=><Block key={i} p={[-54+i*3,.041,7.5]} s={[.025,.018,3.95]} color="#8e9889"/>)}
    {[-40,-20,0,20,40].map(x=><group key={x} position={[x,0,4.6]}><Block p={[0,1.6,0]} s={[.075,3.2,.075]} color="#455e5a"/><Block p={[.35,3.16,0]} s={[.8,.1,.22]} color="#a6afa1"/><mesh position={[.35,3.1,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[.65,.18]}/><meshStandardMaterial color="#e3d7bc" emissive="#ffd39a" emissiveIntensity={night?1.4:.04}/></mesh></group>)}
    {Array.from({length:18},(_,i)=><Block key={i} p={[-51+i*6, .7,9.2]} s={[.07,1.4,.07]} color="#607874"/>)}
    <Block p={[0,1.35,9.2]} s={[110,.055,.07]} color="#6e8a86"/>
    <mesh position={[0,.21,9.67]}><boxGeometry args={[110,.035,.025]}/><meshStandardMaterial color="#cab993" emissive="#ffcf8d" emissiveIntensity={storyLighting(time).windows*1.3} toneMapped={false}/></mesh>
    {[-33,-18,18,33].map(x=><group key={x} position={[x,0,7.2]}><Block p={[0,.5,0]} s={[2.4,.14,.65]} color="#9a8968"/><Block p={[0,.95,-.33]} s={[2.4,.7,.12]} color="#9a8968"/><Block p={[-.8,.24,0]} s={[.14,.48,.6]} color="#465f5b"/><Block p={[.8,.24,0]} s={[.14,.48,.6]} color="#465f5b"/></group>)}
    </ExploreStaticBatch>
    <WaterfrontLandscape/>
    <CourtyardTreeRows paused={reduced}/>
    <StoryWater position={[0,-.1,355]} size={[1800,690]} paused={reduced} night={night} reflectionIntervalMs={100}/>
    <StreetVehicle name="sedan" offset={12} road={0} paused={reduced}/><StreetVehicle name="taxi" offset={58} road={1} paused={reduced}/><StreetVehicle name="bus" offset={83} road={2} paused={reduced}/>
  </group>;
}
