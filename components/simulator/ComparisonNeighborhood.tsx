'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import { useEffect, useMemo } from 'react';

import * as THREE from 'three';
import ExploreStaticBatch from '../3d/ExploreStaticBatch';

const blocks = [
  { name: 'building-g', x: -7.4, z: -6.9, width: 3.1, height: 2.8 },
  { name: 'building-l', x: -3.3, z: -8.5, width: 2.8, height: 2.4 },
  { name: 'building-skyscraper-b', x: .6, z: -13.2, width: 2.5, height: 4.4 },
  { name: 'building-d', x: 4.8, z: -8.4, width: 3.2, height: 3 },
  { name: 'building-n', x: 8.7, z: -6.9, width: 2.8, height: 2.3 },
  { name: 'building-skyscraper-d', x: -7.8, z: -15.1, width: 2.4, height: 5.2 },
  { name: 'building-i', x: 6.2, z: -15.2, width: 3.5, height: 2.7 },
];

function StreetBlock({ position, size, color }: { position: [number,number,number]; size: [number,number,number]; color: string }) {
  return <mesh position={position} receiveShadow castShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.88}/></mesh>;
}

function PavedGround() {
  const texture = useMemo(() => {
    const pixels = new Uint8Array(128 * 128 * 4);
    for (let y=0;y<128;y++) for(let x=0;x<128;x++) {
      const index=(y*128+x)*4, joint=x%64<1||y%32<1;
      const value=joint?166:220+(x*13+y*37)%11;
      pixels[index]=value;pixels[index+1]=value;pixels[index+2]=value-7;pixels[index+3]=255;
    }
    const result=new THREE.DataTexture(pixels,128,128);result.colorSpace=THREE.SRGBColorSpace;
    result.wrapS=result.wrapT=THREE.RepeatWrapping;result.repeat.set(24,22);
    result.minFilter=THREE.LinearMipmapLinearFilter;result.magFilter=THREE.LinearFilter;result.generateMipmaps=true;result.needsUpdate=true;
    return result;
  },[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={[0,-.032,-7]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[32,29]}/><meshStandardMaterial map={texture} color="#a9afa3" roughness={.96}/></mesh>;
}

function NeighborhoodPeople() {
  const { scene } = useGLTF('/models/city-studies/pedestrian.glb');
  const people = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(scene), center = bounds.getCenter(new THREE.Vector3());
    const scale = .48 / bounds.getSize(new THREE.Vector3()).y;
    return { scale, origin: [-center.x,-bounds.min.y,-center.z] as [number,number,number], objects: Array.from({length:6},()=>scene.clone(true)) };
  }, [scene]);
  const positions = [[-4.4,.8,.5],[-4.8,.7,-.6],[-.4,1.45,2.6],[3.3,.9,-.8],[5.1,-4.9,1.7],[-6,-3.7,.9]];
  return <group name="Context-only-street-life">{positions.map(([x,z,angle],i)=><group key={i} position={[x,.03,z]} rotation={[0,angle,0]} scale={people.scale}><primitive object={people.objects[i]} position={people.origin} dispose={null}/></group>)}</group>;
}

/** Context uses the retained CC0 city kit. It is outside the A/B accounting boundary. */
export default function ComparisonNeighborhood() {
  const { scene } = useGLTF('/models/twin/city.glb');
  const owned = useMemo(() => {
    const materials: THREE.Material[] = [];
    const objects = blocks.map(block => {
      const source = scene.getObjectByName(block.name);
      if (!source) throw new Error(`Missing retained city building: ${block.name}`);
      const object = source.clone(true), bounds = new THREE.Box3().setFromObject(object);
      const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
      const scale = Math.min(block.width / size.x, block.height / size.y);
      object.position.add(new THREE.Vector3(-center.x, -bounds.min.y, -center.z));
      object.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = true; child.receiveShadow = true;
        const clone = (sourceMaterial: THREE.Material) => {
          const material = sourceMaterial.clone() as THREE.MeshStandardMaterial;
          if (material.isMeshStandardMaterial) { material.roughness = .75; material.metalness = .06; }
          materials.push(material); return material;
        };
        child.material = Array.isArray(child.material) ? child.material.map(clone) : clone(child.material);
      });
      return { object, scale, block };
    });
    return { objects, materials };
  }, [scene]);
  useEffect(() => () => owned.materials.forEach(material => material.dispose()), [owned]);
  return <group name="Context-neighborhood-outside-comparison">
    <PavedGround/>
    <ExploreStaticBatch>
    <StreetBlock position={[0,-.01,-6.7]} size={[25,.035,2.15]} color="#b4b5a3"/>
    {[-4.4, -11.4].map(z => <group key={z} position={[0, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[26, 1.25]} /><meshStandardMaterial color="#4d605d" roughness={.9} /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[0, .012, side * .85]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[26, .4]} /><meshStandardMaterial color="#c4c3ae" roughness={.9} /></mesh>)}
      {Array.from({length:20},(_,i)=><StreetBlock key={i} position={[-12+i*1.25,.012,0]} size={[.52,.016,.025]} color="#d3cfba"/>)}
    </group>)}
    <StreetBlock position={[0,.004,2.15]} size={[26,.025,.9]} color="#566765"/>
    {[-1,1].map(side=><StreetBlock key={side} position={[side*6.1,.004,-1.2]} size={[.95,.025,7.6]} color="#566765"/>)}
    <StreetBlock position={[0,.001,1.4]} size={[26,.04,.55]} color="#c7c6b4"/>
    {[-8.4,8.4].map(x=><group key={x}>
      <StreetBlock position={[x,.03,-.55]} size={[2.6,.06,2.7]} color="#a29d83"/>
      <StreetBlock position={[x,.067,-.55]} size={[2.44,.025,2.54]} color="#6c8157"/>
      {Array.from({length:14},(_,i)=><mesh key={i} position={[x+Math.sin(i*2.4)*.94,.14+(i%3)*.035,-.55+Math.cos(i*2.4)*.92]}><sphereGeometry args={[.15,8,6]}/><meshStandardMaterial color={i%4?'#7f945d':'#b9ac79'} roughness={1}/></mesh>)}
    </group>)}
    {[-10,-8,-6,-4,0,2,4,6,8,10].map(x=><StreetBlock key={x} position={[x,.025,2.15]} size={[.65,.012,.025]} color="#d0ccb4"/>)}
    {[-6.1,6.1].map(x=><group key={x}>{Array.from({length:5},(_,i)=><StreetBlock key={i} position={[x-.37+i*.19,.03,2.15]} size={[.09,.016,.78]} color="#ddd7c4"/>)}</group>)}
    {[-6.1,6.1].map(x=><StreetBlock key={x} position={[x,.024,-.6]} size={[.012,.016,4.4]} color="#cdc8b1"/>)}
    </ExploreStaticBatch>
    {owned.objects.map(({ object, scale, block }) => <group key={block.name} position={[block.x, 0, block.z]} scale={scale}><primitive object={object} dispose={null} /></group>)}
    <NeighborhoodPeople/>
  </group>;
}

/** The small terrace gives the comparison a street edge without adding loads to either scenario. */
export function ComparisonCafeTerrace() {
  return <group name="Street-cafe-outside-comparison" position={[-5.2, 0, -1.6]}>
    <mesh position={[0, .64, -.25]} castShadow receiveShadow><boxGeometry args={[2.1, 1.28, 1.65]} /><meshStandardMaterial color="#b1a187" roughness={.85} /></mesh>
    <mesh position={[0, .66, .585]}><planeGeometry args={[1.72, .91]} /><meshPhysicalMaterial color="#9cbbb3" metalness={.18} roughness={.12} clearcoat={1} envMapIntensity={1} /></mesh>
    <mesh position={[0, 1.2, .84]} rotation={[.16, 0, 0]} castShadow><boxGeometry args={[2.35, .07, .82]} /><meshStandardMaterial color="#486c62" roughness={.8} /></mesh>
    {[-.6, .6].map(x => <group key={x} position={[x, 0, 1.3]}>
      <mesh position={[0, .32, 0]} castShadow><cylinderGeometry args={[.23, .23, .04, 20]} /><meshStandardMaterial color="#b39c75" roughness={.75} /></mesh>
      <mesh position={[0, .16, 0]}><cylinderGeometry args={[.025, .04, .3, 8]} /><meshStandardMaterial color="#47605a" metalness={.5} roughness={.5} /></mesh>
      {[-1, 1].map(side => <group key={side} position={[side * .36, 0, .04]}>
        <mesh position={[0, .19, 0]}><boxGeometry args={[.22, .035, .22]} /><meshStandardMaterial color="#8c856b" roughness={.8} /></mesh>
        <mesh position={[side * .08, .31, 0]}><boxGeometry args={[.035, .25, .22]} /><meshStandardMaterial color="#8c856b" roughness={.8} /></mesh>
        <mesh position={[0, .09, 0]}><boxGeometry args={[.035, .18, .16]} /><meshStandardMaterial color="#47605a" /></mesh>
      </group>)}
    </group>)}
  </group>;
}
