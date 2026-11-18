'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Original waterfront landscape. Static elements are merged by ExploreStaticBatch. */
export default function CoastalLandscape() {
  const water = useRef<THREE.Mesh>(null);
  const ripples = useMemo(() => {
    const size = 256, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
      const height = 128 + 30 * Math.sin(v * 12 + Math.sin(u * 3)) + 18 * Math.sin(u * 7 - v * 5) + 9 * Math.cos(v * 23 + u * 9);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = height; data[i + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(48, 22);
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
    return texture;
  }, []);
  useEffect(() => () => ripples.dispose(), [ripples]);
  useFrame(({ clock }) => { ripples.offset.set(clock.elapsedTime * .0018, clock.elapsedTime * .0011); });
  return <group>
    <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, -.35, 120]}>
      <planeGeometry args={[620, 224, 1, 1]} />
      <meshStandardMaterial color="#355c52" roughness={.23} metalness={.55} bumpMap={ripples} bumpScale={.12} envMapIntensity={1.15} />
    </mesh>
    <mesh position={[0, -.27, 6.8]} receiveShadow><boxGeometry args={[130, .45, 2]} /><meshStandardMaterial color="#9c967f" roughness={.84} /></mesh>
    <mesh position={[0, .02, 5.5]} receiveShadow><boxGeometry args={[130, .15, 3.2]} /><meshStandardMaterial color="#b8aa8b" roughness={.9} /></mesh>
    {Array.from({ length: 36 }, (_, i) => <mesh key={i} position={[-64 + i * 3.65, .13, 5.5]}><boxGeometry args={[.035, .02, 3.15]} /><meshStandardMaterial color="#746c56" roughness={1} /></mesh>)}
    {Array.from({ length: 17 }, (_, i) => <group key={i} position={[-61 + i * 7.5, .1, 7.6]}>
      <mesh position={[0, .52, 0]}><cylinderGeometry args={[.035, .04, 1.05, 6]} /><meshStandardMaterial color="#506054" metalness={.8} roughness={.35} /></mesh>
      <mesh position={[3.7, .95, 0]}><boxGeometry args={[7.4, .045, .045]} /><meshStandardMaterial color="#7c8c75" metalness={.8} roughness={.3} /></mesh>
    </group>)}
    {[-48, -25, 10, 36].map((x, i) => <group key={x} position={[x, .1, 2.8]}>
      <mesh position={[0, .3, 0]}><boxGeometry args={[3, .18, .8]} /><meshStandardMaterial color="#8b6845" roughness={.8} /></mesh>
      <mesh position={[0, .85, -.4]} rotation={[-.13, 0, 0]}><boxGeometry args={[3, .8, .12]} /><meshStandardMaterial color="#8b6845" roughness={.8} /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side, .1, 0]}><boxGeometry args={[.1, .5, .7]} /><meshStandardMaterial color="#394840" metalness={.6} roughness={.4} /></mesh>)}
      <mesh position={[4, .15, 0]}><cylinderGeometry args={[1.1, 1.3, .3, 20]} /><meshStandardMaterial color={i % 2 ? '#9c9474' : '#81725c'} roughness={.95} /></mesh>
      <mesh position={[4, .35, 0]}><cylinderGeometry args={[1, 1, .12, 20]} /><meshStandardMaterial color="#3d512f" roughness={1} /></mesh>
    </group>)}
    {/* A small working waterfront cafe: shaded terrace, glazing and seating. */}
    <group position={[15,0,-.5]}>
      <mesh position={[0,1.8,-1.8]}><boxGeometry args={[12,3.6,4.4]}/><meshStandardMaterial color="#6c6653" roughness={.84}/></mesh>
      <mesh position={[0,1.7,.43]}><boxGeometry args={[11.3,2.9,.08]}/><meshStandardMaterial color="#5d8580" metalness={.55} roughness={.19}/></mesh>
      <mesh position={[0,3.7,.4]}><boxGeometry args={[13.4,.22,9]}/><meshStandardMaterial color="#a18b60" roughness={.8}/></mesh>
      {[-5.5,-2.8,0,2.8,5.5].map(x=><group key={x}><mesh position={[x,1.7,.55]}><boxGeometry args={[.09,3,.12]}/><meshStandardMaterial color="#373f32" roughness={.5} metalness={.6}/></mesh><mesh position={[x,1.8,4.5]}><cylinderGeometry args={[.065,.075,3.6,8]}/><meshStandardMaterial color="#8c7550" roughness={.8}/></mesh></group>)}
      {[-3.4,0,3.4].map(x=><group key={x} position={[x,0,2.4]}>
        <mesh position={[0,.76,0]}><cylinderGeometry args={[.57,.57,.08,24]}/><meshStandardMaterial color="#a08b66" roughness={.75}/></mesh>
        <mesh position={[0,.38,0]}><cylinderGeometry args={[.055,.12,.76,8]}/><meshStandardMaterial color="#364537" metalness={.65} roughness={.5}/></mesh>
        {[-1,1].map(side=><group key={side} position={[side*.88,0,0]}><mesh position={[0,.44,0]}><boxGeometry args={[.55,.07,.55]}/><meshStandardMaterial color="#765c40" roughness={.8}/></mesh><mesh position={[side*.25,.73,0]}><boxGeometry args={[.06,.65,.55]}/><meshStandardMaterial color="#765c40" roughness={.8}/></mesh>{[-.2,.2].flatMap(dx=>[-.2,.2].map(dz=><mesh key={dx+','+dz} position={[dx,.22,dz]}><cylinderGeometry args={[.022,.028,.44,6]}/><meshStandardMaterial color="#354539" metalness={.6} roughness={.5}/></mesh>))}</group>)}
      </group>)}
    </group>
    {/* A sheltered public pier, distinct from the street grid. */}
    <group position={[32, -.1, 16]}>
      <mesh><boxGeometry args={[5, .4, 18]} /><meshStandardMaterial color="#987952" roughness={.87} /></mesh>
      <mesh position={[0, .25, 5]}><boxGeometry args={[15, .15, 4]} /><meshStandardMaterial color="#a1865d" roughness={.85} /></mesh>
      {[-5.8, -3.5, 3.5, 5.8].map(x => <mesh key={x} position={[x, .55, 5]}><cylinderGeometry args={[.09, .1, 1.3, 8]} /><meshStandardMaterial color="#4b5244" roughness={.8} /></mesh>)}
    </group>
  </group>;
}
