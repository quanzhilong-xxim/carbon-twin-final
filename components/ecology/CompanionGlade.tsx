'use client';
import { useGLTF } from '@/lib/three/scene-assets';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

import * as THREE from 'three';

/** Reuse the retained CC0 park-tree LOD. The companion remains the foreground. */
export default function CompanionGlade({ paused }: { paused: boolean }) {
  const { scene } = useGLTF('/models/urban-vegetation/CT_ParkTree_StreetLite_v3.glb');
  const trees = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene), c = box.getCenter(new THREE.Vector3()), h = box.getSize(new THREE.Vector3()).y;
    return { origin: [-c.x, -box.min.y, -c.z] as [number, number, number], scale: 3.7 / h, copies: Array.from({ length: 4 }, () => scene.clone(true)) };
  }, [scene]);
  const grass = useRef<THREE.InstancedMesh>(null), time = useMemo(() => ({ value: 0 }), []);
  const blade = useMemo(() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-.022,0,0,.022,0,0,-.016,.06,.009,.016,.06,.009,0,.15,.025],3));g.setIndex([0,1,2,1,3,2,2,3,4]);g.computeVertexNormals();return g;
  }, []);
  useEffect(() => () => blade.dispose(), [blade]);
  useEffect(() => {
    const o = new THREE.Object3D(), color = new THREE.Color(); let seed = 11307;
    const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296; };
    for (let i=0;i<1600;i++) { const a=random()*Math.PI*2,r=.39+Math.sqrt(random())*2.7;o.position.set(Math.cos(a)*r,-.012,Math.sin(a)*r);o.rotation.y=random()*Math.PI*2;o.scale.setScalar(.45+random()*.8);o.updateMatrix();grass.current?.setMatrixAt(i,o.matrix);color.setHSL(.22+random()*.055,.22+random()*.18,.27+random()*.16);grass.current?.setColorAt(i,color); }
    if(grass.current){grass.current.instanceMatrix.needsUpdate=true;if(grass.current.instanceColor)grass.current.instanceColor.needsUpdate=true;}
  }, []);
  useFrame((_, dt) => { if(!paused) time.value += Math.min(dt,.05); });
  return <group>
    <mesh position={[0,-.025,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[30,30]}/><meshStandardMaterial color="#91a172" roughness={1}/></mesh>
    {trees.copies.map((tree,i)=><group key={i} position={([[-2.5,-.02,-2.8],[2.6,-.02,-3.2],[-.5,-.02,-4.8],[4.3,-.02,-4.8]] as [number,number,number][])[i]} scale={trees.scale*(i===2?1.25:1)} rotation={[0,i*1.3,0]}><primitive object={tree} position={trees.origin} dispose={null}/></group>)}
    <instancedMesh ref={grass} args={[blade,undefined,1600]}><meshStandardMaterial side={THREE.DoubleSide} roughness={1} onBeforeCompile={shader=>{shader.uniforms.uGladeTime=time;shader.vertexShader='uniform float uGladeTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=position.y*position.y*sin(uGladeTime*1.2+instanceMatrix[3].x*3.+instanceMatrix[3].z)*.8;');}}/></instancedMesh>
    {Array.from({length:14},(_,i)=>{const a=i*2.3999,r=.65+(i%4)*.27;return <group key={i} position={[Math.cos(a)*r,.015,Math.sin(a)*r]}><mesh position={[0,.075,0]}><cylinderGeometry args={[.004,.006,.15,5]}/><meshStandardMaterial color="#668651" roughness={1}/></mesh>{[0,1,2,3,4].map(p=><mesh key={p} position={[Math.cos(p*1.256)*.025,.16,Math.sin(p*1.256)*.025]} scale={[.024,.010,.032]} rotation={[0,p*1.256,0]}><sphereGeometry args={[1,8,5]}/><meshStandardMaterial color={i%3?'#f0e0bb':'#d8bdc5'} roughness={.8}/></mesh>)}<mesh position={[0,.165,0]}><sphereGeometry args={[.012,8,6]}/><meshStandardMaterial color="#d5b65e" roughness={.8}/></mesh></group>;})}
  </group>;
}
