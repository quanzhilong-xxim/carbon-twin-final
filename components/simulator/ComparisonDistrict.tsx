'use client';
import { useGLTF, useTexture } from '@/lib/three/scene-assets';
import { useEffect, useMemo } from 'react';

import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useStoryAtmosphere } from '@/lib/stores/StoryAtmosphere';
import CourtyardTree from '../3d/CourtyardTree';
import ComparisonNeighborhood, { ComparisonCafeTerrace } from './ComparisonNeighborhood';

function Block({ position, size, color = '#d8c8ab', roughness = .75, metalness = 0 }: { position: [number, number, number]; size: [number, number, number]; color?: string; roughness?: number; metalness?: number }) {
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={roughness} metalness={metalness} /></mesh>;
}
function SourceAsset({ name, position, width, rotation = 0 }: { name: string; position: [number, number, number]; width: number; rotation?: number }) {
  const { scene } = useGLTF(`/models/twin/${name}.glb`);
  const { clone, scale, origin } = useMemo(() => {
    const clone = scene.clone(true), box = new THREE.Box3().setFromObject(clone), center = box.getCenter(new THREE.Vector3());
    clone.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { clone, scale: width / box.getSize(new THREE.Vector3()).x, origin: [-center.x, -box.min.y, -center.z] as [number, number, number] };
  }, [scene, width]);
  return <group position={position} rotation={[0, rotation, 0]} scale={scale}><primitive object={clone} position={origin} dispose={null} /></group>;
}
function Glass({ position, size, night }: { position: [number, number, number]; size: [number, number, number]; night: boolean }) {
  // Thin facade glass keeps the actual interiors visible, with environment
  // reflections and a clear coat. It needs no per-frame scene refraction pass.
  return <mesh position={position}><boxGeometry args={size} /><meshPhysicalMaterial color={night ? '#9bbbbb' : '#bed6cf'} roughness={.09} metalness={.16} clearcoat={1} clearcoatRoughness={.06} transparent opacity={.27} depthWrite={false} envMapIntensity={1.15} /></mesh>;
}
function Lamp({ x, z, night }: { x: number; z: number; night: boolean }) {
  return <group position={[x, 0, z]}><mesh position={[0, .43, 0]}><cylinderGeometry args={[.012, .018, .86, 8]} /><meshStandardMaterial color="#43595b" metalness={.7} roughness={.4} /></mesh><mesh position={[0, .89, 0]}><sphereGeometry args={[.06, 12, 8]} /><meshStandardMaterial color="#efdfb7" emissive="#ffd493" emissiveIntensity={night ? 2 : .15} /></mesh></group>;
}
function Planting({ x, z }: { x: number; z: number }) {
  return <SourceAsset name="plant" width={.4} position={[x, 0, z]} />;
}
function Home({ intensity, night }: { intensity: number; night: boolean }) {
  const source = useTexture('/models/twin/wood-color.jpg');
  const wood = useMemo(() => { const t = source.clone(); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); return t; }, [source]);
  useEffect(() => () => wood.dispose(), [wood]);
  return <>
    <Block position={[0, .1, 0]} size={[2.25, .2, 1.94]} color="#c1b8a2" />
    {[0, 1].map(floor => <group key={floor} position={[0, .22 + floor * .86, 0]}>
      <mesh position={[0, 0, 0]} receiveShadow><boxGeometry args={[2.06, .07, 1.7]} /><meshStandardMaterial map={wood} roughness={.8} /></mesh>
      <Block position={[0, .4, -.78]} size={[2.06, .8, .1]} color="#dcd1b8" />
      <Block position={[-1, .4, 0]} size={[.1, .8, 1.6]} color="#c7b99d" />
      <Block position={[1, .4, 0]} size={[.1, .8, 1.6]} color="#b2ac99" />
      <Block position={[.28, .4, -.15]} size={[.06, .8, 1.12]} color="#ddd5bd" />
      <Glass position={[-.35, .43, .79]} size={[1.18, .65, .018]} night={night} />
      {[-.94, -.35, .25, .95].map(x => <Block key={x} position={[x, .43, .8]} size={[.035, .73, .04]} color="#3c5351" metalness={.5} />)}
      <Block position={[.6, .35, .8]} size={[.57, .7, .06]} color="#756f5c" />
      {floor === 0 ? <><SourceAsset name="sofaModern" width={.86} position={[-.52, .05, -.4]} /><SourceAsset name="table" width={.46} position={[-.5, .05, .26]} />
        <Block position={[.66, .17, -.44]} size={[.45, .34, .4]} color="#9a8c72" /></> : <><Block position={[-.5, .17, -.35]} size={[.8, .28, .78]} color="#f0e2cb" /><Block position={[-.5, .32, -.35]} size={[.78, .07, .74]} color="#a6b99a" />
        <Block position={[-.5, .38, -.55]} size={[.6, .09, .2]} color="#ddd5c2" /></>}
      <mesh position={[-.45, .77, .02]}><cylinderGeometry args={[.08, .14, .08, 20]} /><meshStandardMaterial color="#f8dca0" emissive="#ffc67b" emissiveIntensity={(night ? .65 : .13) + intensity / 500} /></mesh>
    </group>)}
    <Block position={[0, 1.96, -.06]} size={[2.27, .12, 1.96]} color="#756b59" />
    <group position={[0, 1.16, 1.04]}><Block position={[-.35, 0, 0]} size={[1.45, .08, .52]} color="#c0bca8" /><Glass position={[-.35, .23, .24]} size={[1.44, .4, .022]} night={night} /><Block position={[-.35, .44, .25]} size={[1.48, .027, .035]} color="#596e6b" metalness={.7} /><Planting x={-.87} z={0} /></group>
    <SourceAsset name="aircon" width={.36} position={[1.08, .28, -.45]} rotation={Math.PI / 2} />
    <Planting x={-.9} z={1.38} /><Planting x={.91} z={1.35} />
    <Block position={[0, .035, 1.53]} size={[.82, .07, .8]} color="#b9b6a3" />
  </>;
}
function Office({ intensity, night }: { intensity: number; night: boolean }) {
  return <>
    <Block position={[0, .1, 0]} size={[2.3, .2, 2.03]} color="#aab3ae" />
    {[0, 1, 2].map(floor => <group key={floor} position={[0, .25 + floor * .8, 0]}>
      <Block position={[0, 0, 0]} size={[2.14, .08, 1.8]} color="#bfc6bd" />
      <Block position={[0, .36, -.86]} size={[2.14, .72, .07]} color="#657c7a" />
      <Glass position={[0, .39, .86]} size={[2.06, .7, .025]} night={night} />
      <Glass position={[-1.04, .39, 0]} size={[.025, .7, 1.68]} night={night} /><Glass position={[1.04, .39, 0]} size={[.025, .7, 1.68]} night={night} />
      {[-1.05, -.52, 0, .52, 1.05].map(x => <Block key={x} position={[x, .38, .88]} size={[.027, .76, .035]} color="#4b6464" metalness={.65} />)}
      {[-.55, .52].map(x => <group key={x}><Block position={[x, .3, -.15]} size={[.65, .055, .43]} color="#c2bda9" /><Block position={[x, .13, -.15]} size={[.035, .3, .3]} color="#626e6c" metalness={.55} />
        <Block position={[x, .43, -.24]} size={[.25, .16, .022]} color="#293c3f" /><Block position={[x, .33, -.05]} size={[.26, .014, .1]} color="#596d6c" />
        <Block position={[x, .18, .27]} size={[.24, .055, .23]} color="#61796b" /><Block position={[x, .3, .38]} size={[.24, .26, .045]} color="#61796b" /></group>)}
      <mesh position={[0, .72, .05]}><boxGeometry args={[1.55, .025, .08]} /><meshStandardMaterial color="#dfedda" emissive="#e3efd0" emissiveIntensity={(night ? .9 : .25) + intensity / 500} /></mesh>
    </group>)}
    <Block position={[0, 2.68, 0]} size={[2.27, .12, 1.96]} color="#5c7471" />
    {[-.54, .38].map(x => <group key={x} position={[x, 2.88, -.22]}><Block position={[0, 0, 0]} size={[.55, .28, .5]} color="#bec9c3" />{[-.12, .12].map(z => <mesh key={z} position={[0, .15, z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.1, 16]} /><meshStandardMaterial color="#546764" metalness={.7} /></mesh>)}</group>)}
    <group position={[0, .24, 1.12]}><Glass position={[0, .35, 0]} size={[.54, .7, .02]} night={night} /><Block position={[0, .76, 0]} size={[1.12, .065, .58]} color="#789492" metalness={.45} /></group>
    <Planting x={-1.2} z={1.2} /><Planting x={1.15} z={1.2} />
  </>;
}
export default function ComparisonDistrict({ homeIntensity, officeIntensity, selected, onSelect, paused = false }: { homeIntensity: number; officeIntensity: number; selected: 'both' | 'home' | 'office'; onSelect?: (v: 'home' | 'office') => void; paused?: boolean }) {
  const night = useStoryAtmosphere(s => s.time === 'night');
  const select = (event: ThreeEvent<MouseEvent>, variant: 'home' | 'office') => { event.stopPropagation(); onSelect?.(variant); };
  return <group>
    <ComparisonNeighborhood />
    <ComparisonCafeTerrace />
    <Block position={[0, -.12, 0]} size={[8.2, .2, 6.3]} color="#8c9b85" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.23, 0]} receiveShadow><planeGeometry args={[180, 180]} /><meshStandardMaterial color="#677c70" roughness={.9} /></mesh>
    {Array.from({length:15},(_,i)=><Block key={i} position={[-3.9+i*.55,.002,1.5]} size={[.53,.026,.5]} color={i%3===0?'#a7b1a2':'#c2c7b4'}/>)}
    {[[-3.35,-1.5],[-3.1,1],[-.1,-2.2],[3.15,-1.7],[3.45,1]].map(([x,z],i)=><CourtyardTree key={i} position={[x,0,z]} scale={.24+i%2*.025} rotation={i*2.4} paused={paused}/>)}
    {[[-3.3,-1.1],[3.3,-1.4],[0,-2.3]].map(([x,z],i)=><group key={i}><Block position={[x,.035,z]} size={[.8,.07,1.3]} color="#566e4a"/>{Array.from({length:7},(_,j)=><mesh key={j} position={[x+(j%2-.5)*.35,.15,z+(j/7-.5)]}><sphereGeometry args={[.1,8,6]}/><meshStandardMaterial color={j%3?'#7a9255':'#c4b48a'} roughness={.9}/></mesh>)}</group>)}
    <group position={[0,.12,1.1]}><Block position={[0,.09,0]} size={[.62,.07,.22]} color="#8d8167"/><Block position={[0,.25,-.13]} size={[.62,.22,.045]} color="#8d8167"/><Block position={[-.22,0,0]} size={[.04,.22,.18]} color="#435c57"/><Block position={[.22,0,0]} size={[.04,.22,.18]} color="#435c57"/></group>
    <Block position={[0, .005, 2.15]} size={[7.2, .025, .9]} color="#566765" />
    {[-2.8, -1.9, -1, -.1, .8, 1.7, 2.6].map(x => <Block key={x} position={[x, .024, 2.18]} size={[.42, .012, .025]} color="#d0ccb4" />)}
    <Block position={[0, -.005, 1.53]} size={[7.2, .03, .38]} color="#c3c6b1" />
    <group name="Residential-cutaway" position={[-1.8, 0, -.25]} onClick={e => select(e, 'home')}><Home intensity={homeIntensity} night={night} /></group>
    <group name="Office-curtain-wall" position={[1.45, 0, -.25]} onClick={e => select(e, 'office')}><Office intensity={officeIntensity} night={night} /></group>
    <Lamp x={-3.05} z={1.52} night={night} /><Lamp x={.0} z={1.52} night={night} /><Lamp x={3.08} z={1.52} night={night} />
    <Planting x={0} z={-.3} /><Planting x={-3.15} z={-.65} /><Planting x={3} z={-1.5} />
    <group position={[-2.7, .12, 2.04]}><Block position={[0, .1, 0]} size={[.46, .17, .2]} color="#809b8d" /><Block position={[0, .2, 0]} size={[.27, .15, .19]} color="#789499" />{[-.14, .14].map(x => <mesh key={x} position={[x, 0, .12]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.065, .065, .26, 12]} /><meshStandardMaterial color="#334542" /></mesh>)}</group>
    <mesh position={[selected === 'office' ? 1.45 : -1.8, .015, -.25]} rotation={[-Math.PI / 2, 0, 0]} visible={selected !== 'both'}><ringGeometry args={[1.5, 1.53, 64]} /><meshBasicMaterial color="#d6e7a8" /></mesh>
  </group>;
}
